from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Cookie, Header, Response, Body
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import razorpay
import socketio
import uuid

# Import local modules
from models import *
from auth_utils import hash_password, verify_password, create_jwt_token, get_current_user, generate_token_number
from ai_service import ai_service
from recommendation_apriori import get_apriori_recommendations, get_frequent_combos

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Razorpay client - Use test mode
RAZORPAY_ENABLED = False  # Set to True when you have real keys
if RAZORPAY_ENABLED:
    razorpay_client = razorpay.Client(auth=(
        os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_key'),
        os.environ.get('RAZORPAY_KEY_SECRET', 'razorpay_secret')
    ))
else:
    razorpay_client = None

# Socket.IO setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Create the main app
app = FastAPI()

# Include the custom nested operation tables assignment routes
try:
    from assignment_routes import get_assignment_router
    app.include_router(get_assignment_router(db))
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"Failed to load assignment routes: {e}")

# Mount static folder for local images
if os.path.isdir(os.path.join(ROOT_DIR, "static")):
    app.mount("/static", StaticFiles(directory=os.path.join(ROOT_DIR, "static")), name="static")

@app.on_event("startup")
async def startup_db_client():
    # Create TTL index for automatic deletion after 30 days (2592000 seconds)
    try:
        await db.orders.create_index("created_at", expireAfterSeconds=2592000)
        logging.info("Created TTL index on orders.created_at for 30 days retention")
    except Exception as e:
        logging.error(f"Failed to create TTL index: {e}")

    # ── Keep-Alive: self-ping every 4 minutes to prevent Render free tier sleep ──
    import asyncio, httpx as _httpx

    async def _keep_alive():
        # Wait 10s after startup before first ping (let server fully initialize)
        await asyncio.sleep(10)
        PING_INTERVAL = 10  # 10 seconds as requested
        SELF_URL = os.environ.get("RENDER_EXTERNAL_URL", "")
        if not SELF_URL:
            logging.info("Keep-alive: RENDER_EXTERNAL_URL not set — skipping (local dev)")
            return
        health_url = f"{SELF_URL}/api/health"
        logging.info(f"Keep-alive started — pinging {health_url} every {PING_INTERVAL}s")
        while True:
            try:
                async with _httpx.AsyncClient(timeout=10) as c:
                    r = await c.get(health_url)
                    logging.info(f"Keep-alive ping → {r.status_code}")
            except Exception as e:
                logging.warning(f"Keep-alive ping failed: {e}")
            await asyncio.sleep(PING_INTERVAL)

    asyncio.create_task(_keep_alive())

# Socket.IO app
socket_app = socketio.ASGIApp(sio, app)

# Create API router
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# CORS middleware - Robust configuration for Render deployment
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",  # Allows all origins safely with credentials
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request, call_next):
    import time
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logging.info(f"REQUEST: {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.4f}s")
    return response

# ── Health check endpoint (used by Render + keep-alive pinger) ──────────────
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Campus Bites backend is running 🚀"}

# Cache Control Middleware
@app.middleware("http")
async def add_cache_control_header(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# ============================================
# AUTH ENDPOINTS
# ============================================
import random

otp_store = {}

@api_router.post("/auth/student/send-otp")
async def send_otp(request: SendOtpRequest):
    """Send OTP to student terminal"""
    existing = await db.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    otp = str(random.randint(100000, 999999))
    otp_store[request.email] = otp
    
    print("\n" + "="*50)
    print(f"  🚨 OTP for {request.email} is: {otp} 🚨  ")
    print("="*50 + "\n")
    
    return {"message": "OTP sent successfully to terminal"}

@api_router.post("/auth/student/register")
async def student_register(data: StudentRegister):
    """Register a new student"""
    # Verify OTP
    stored_otp = otp_store.get(data.email)
    if not stored_otp or stored_otp != data.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    # Check if roll number already exists
    existing = await db.users.find_one({"roll_number": data.roll_number}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Roll number already registered")
    
    # Create user
    user = User(
        roll_number=data.roll_number,
        password_hash=hash_password(data.password),
        name=data.name,
        email=data.email,
        role="student"
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Clear the used OTP
    otp_store.pop(data.email, None)
    
    # Create JWT token
    token = create_jwt_token(user.user_id, user.role)
    
    return {
        "user": {
            "user_id": user.user_id,
            "name": user.name,
            "roll_number": user.roll_number,
            "role": user.role
        },
        "token": token
    }

@api_router.post("/auth/student/login")
async def student_login(data: StudentLogin, response: Response):
    """Student login"""
    user_doc = await db.users.find_one({"roll_number": data.roll_number, "role": "student"}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create JWT token
    token = create_jwt_token(user_doc['user_id'], user_doc['role'])
    
    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    
    return {
        "user": {
            "user_id": user_doc['user_id'],
            "name": user_doc['name'],
            "roll_number": user_doc['roll_number'],
            "role": user_doc['role']
        },
        "token": token
    }

@api_router.get("/auth/google/callback")
async def google_auth_callback(session_id: str):
    """Handle Google OAuth callback for crew/management"""
    import httpx
    
    # Get session data from Emergent auth service
    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        session_data = response.json()
    
    email = session_data['email']
    name = session_data['name']
    picture = session_data.get('picture')
    
    # Check if user exists
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user_doc:
        # Create new crew/management user
        role = "management" if "@amrita.edu" in email else "crew"
        user = User(
            email=email,
            name=name,
            role=role,
            picture=picture
        )
        user_dict = user.model_dump()
        user_dict['created_at'] = user_dict['created_at'].isoformat()
        await db.users.insert_one(user_dict)
        user_id = user.user_id
    else:
        user_id = user_doc['user_id']
        role = user_doc['role']
    
    # Create JWT token
    token = create_jwt_token(user_id, role)
    
    # Create session
    session = UserSession(
        user_id=user_id,
        session_token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    session_dict = session.model_dump()
    session_dict['created_at'] = session_dict['created_at'].isoformat()
    session_dict['expires_at'] = session_dict['expires_at'].isoformat()
    await db.user_sessions.insert_one(session_dict)
    
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "role": role,
        "session_token": token
    }

@api_router.post("/auth/crew/login")
async def crew_login(data: CrewLogin, response: Response):
    """Crew login with email and password"""
    user_doc = await db.users.find_one({"email": data.email, "role": "crew"}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user_doc['user_id'], user_doc['role'], user_doc.get('canteen_id'))
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    
    return {
        "user": {
            "user_id": user_doc['user_id'],
            "name": user_doc['name'],
            "email": user_doc['email'],
            "role": user_doc['role'],
            "canteen_id": user_doc.get('canteen_id')
        },
        "token": token
    }

@api_router.post("/auth/management/login")
async def management_login(data: ManagementLogin, response: Response):
    """Management login with email and password"""
    user_doc = await db.users.find_one({"email": data.email, "role": "management"}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user_doc['user_id'], user_doc['role'])
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    
    return {
        "user": {
            "user_id": user_doc['user_id'],
            "name": user_doc['name'],
            "email": user_doc['email'],
            "role": user_doc['role'],
            "canteen_id": user_doc.get('canteen_id')
        },
        "token": token
    }

# Crew Signup
@api_router.post("/auth/crew/signup")
async def crew_signup(email: str = Body(...), password: str = Body(...), name: str = Body(...), canteen_id: str = Body(...)):
    """Crew signup endpoint"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new crew user
    user = User(
        email=email,
        name=name,
        role="crew",
        canteen_id=canteen_id
    )
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['password_hash'] = hash_password(password)
    
    await db.users.insert_one(user_dict)
    
    # Generate token with canteen_id
    token = create_jwt_token(user.user_id, "crew", canteen_id)
    
    return {
        "user": {
            "user_id": user.user_id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "canteen_id": user.canteen_id
        },
        "token": token
    }

# Management Signup
@api_router.post("/auth/management/signup")
async def management_signup(email: str = Body(...), password: str = Body(...), name: str = Body(...)):
    """Management signup endpoint"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new management user
    user = User(
        email=email,
        name=name,
        role="management"
    )
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['password_hash'] = hash_password(password)
    
    await db.users.insert_one(user_dict)
    
    # Generate token
    token = create_jwt_token(user.user_id, "management")
    
    return {
        "user": {
            "user_id": user.user_id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        },
        "token": token
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user info"""
    user_doc = await db.users.find_one({"user_id": user['user_id']}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return user_doc

@api_router.post("/auth/logout")
async def logout(response: Response):
    """Logout user"""
    response.delete_cookie("session_token")
    return {"message": "Logged out successfully"}

# ============================================
# CANTEEN ENDPOINTS
# ============================================

@api_router.get("/canteens", response_model=List[Canteen])
async def get_canteens():
    """Get all canteens"""
    canteens = await db.canteens.find({}, {"_id": 0}).to_list(10)
    return canteens

# ============================================
# MENU ENDPOINTS
# ============================================

@api_router.get("/menu/{canteen_id}", response_model=List[MenuItem])
async def get_menu(canteen_id: str):
    """Get menu for a specific canteen"""
    items = await db.menu_items.find({"canteen_id": canteen_id}, {"_id": 0}).to_list(100)
    return items

@api_router.get("/menu/item/{item_id}", response_model=MenuItem)
async def get_menu_item(item_id: str):
    """Get specific menu item details"""
    item = await db.menu_items.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

import httpx
import tempfile
import re

def find_local_image_for_food(food_name: str) -> Optional[str]:
    """Search the static/food_images directory for an exact matching image."""
    base_dir = os.path.join(ROOT_DIR, "static", "food_images")
    if not os.path.exists(base_dir):
        return None
        
    # Example item: "Masala Dosa" -> check for "masala dosa.jpg" or "masaladosa.jpg"
    term = food_name.lower().strip()
    
    # Check for direct match
    direct_match = os.path.join(base_dir, f"{term}.jpg")
    if os.path.exists(direct_match):
        return f"http://localhost:8001/static/food_images/{term}.jpg"
        
    # Check for match in all listed files
    try:
        files = [f for f in os.listdir(base_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
        for f in files:
            # removing extension for comparison
            file_base = os.path.splitext(f)[0].lower()
            if term == file_base or term in file_base or file_base in term:
                return f"http://localhost:8001/static/food_images/{f}"
    except Exception as e:
        logging.error(f"Error reading local static images: {e}")
        
    return None

@api_router.post("/menu", response_model=MenuItem)
async def create_menu_item(item: MenuItemCreate, user: dict = Depends(get_current_user)):
    """Create new menu item (Management only)"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # 🔥 Fetch image dynamically from Local Dataset if not provided
    if not item.image_url or item.image_url == "":
        local_img = find_local_image_for_food(item.name)
        if local_img:
            item.image_url = local_img
        else:
            # Fallback to a placeholder silhouette color if not found
            fallback_color = random.choice(["FF5733", "33FF57", "3357FF", "F333FF", "FF33A1", "33FFF0"])
            item.image_url = f"https://ui-avatars.com/api/?name={item.name}&background={fallback_color}&color=fff&size=500"
    
    menu_item = MenuItem(**item.model_dump())
    item_dict = menu_item.model_dump()
    item_dict['created_at'] = item_dict['created_at'].isoformat()
    await db.menu_items.insert_one(item_dict)
    return menu_item

@api_router.patch("/menu/{item_id}")
async def update_menu_item(item_id: str, update: MenuItemUpdate, user: dict = Depends(get_current_user)):
    """Update menu item (Management/Crew)"""
    if user['role'] not in ['management', 'crew']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.menu_items.update_one({"item_id": item_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item updated successfully"}

@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str, user: dict = Depends(get_current_user)):
    """Delete menu item (Management/Crew)"""
    if user['role'] not in ['management', 'crew']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    result = await db.menu_items.delete_one({"item_id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item deleted successfully"}

# ============================================
# MANAGEMENT ANALYTICS ENDPOINTS
# ============================================

@api_router.get("/management/analytics/revenue")
async def get_revenue_analytics(canteen_id: str = None, user: dict = Depends(get_current_user)):
    """Get revenue analytics"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        match_filter = {"status": "COMPLETED"}
        if canteen_id:
            match_filter["canteen_id"] = canteen_id
        
        # Get total revenue
        pipeline = [
            {"$match": match_filter},
            {"$group": {
                "_id": None,
                "total_revenue": {"$sum": "$total_amount"},
                "total_orders": {"$sum": 1},
                "avg_order_value": {"$avg": "$total_amount"}
            }}
        ]
        
        result = await db.orders.aggregate(pipeline).to_list(1)
        
        if result:
            return {
                "total_revenue": result[0]["total_revenue"],
                "total_orders": result[0]["total_orders"],
                "avg_order_value": result[0]["avg_order_value"]
            }
        else:
            return {
                "total_revenue": 0,
                "total_orders": 0,
                "avg_order_value": 0
            }
    except Exception as e:
        logging.error(f"Revenue analytics error: {e}")
        return {
            "total_revenue": 0,
            "total_orders": 0,
            "avg_order_value": 0
        }

@api_router.get("/management/analytics/top-items")
async def get_top_items(canteen_id: str = None, user: dict = Depends(get_current_user)):
    """Get top selling items"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        match_filter = {"status": "COMPLETED"}
        if canteen_id:
            match_filter["canteen_id"] = canteen_id
        
        pipeline = [
            {"$match": match_filter},
            {"$unwind": "$items"},
            {"$group": {
                "_id": "$items.item_id",
                "name": {"$first": "$items.name"},
                "quantity": {"$sum": "$items.quantity"},
                "revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}
            }},
            {"$sort": {"quantity": -1}},
            {"$limit": 10}
        ]
        
        items = await db.orders.aggregate(pipeline).to_list(10)
        return items
    except Exception as e:
        logging.error(f"Top items error: {e}")
        return []

@api_router.get("/management/analytics/daily-summary")
async def get_daily_summary(canteen_id: str = None, user: dict = Depends(get_current_user)):
    """Get daily summary"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        # Get today's date range
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        match_filter = {
            "created_at": {"$gte": today_start.isoformat()},
            "status": "COMPLETED"
        }
        if canteen_id:
            match_filter["canteen_id"] = canteen_id
        
        pipeline = [
            {"$match": match_filter},
            {"$group": {
                "_id": None,
                "total_orders": {"$sum": 1},
                "total_revenue": {"$sum": "$total_amount"}
            }}
        ]
        
        result = await db.orders.aggregate(pipeline).to_list(1)
        
        if result:
            return {
                "total_orders": result[0]["total_orders"],
                "total_revenue": result[0]["total_revenue"]
            }
        else:
            return {
                "total_orders": 0,
                "total_revenue": 0
            }
    except Exception as e:
        logging.error(f"Daily summary error: {e}")
        return {
            "total_orders": 0,
            "total_revenue": 0
        }

@api_router.get("/management/analytics/peak-hours")
async def get_peak_hours(canteen_id: str = None, user: dict = Depends(get_current_user)):
    """Get peak hours analysis"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        match_filter = {"status": "COMPLETED"}
        if canteen_id:
            match_filter["canteen_id"] = canteen_id
        
        # Group by hour
        pipeline = [
            {"$match": match_filter},
            {"$group": {
                "_id": {"$hour": {"$toDate": "$created_at"}},
                "order_count": {"$sum": 1}
            }},
            {"$sort": {"order_count": -1}},
            {"$limit": 5}
        ]
        
        hours = await db.orders.aggregate(pipeline).to_list(5)
        
        if hours:
            peak_hour = hours[0]["_id"]
            # Convert to dictionary for frontend: "12:00": 5
            peak_hours_dict = {f"{h['_id']}:00": h['order_count'] for h in hours}
            
            return {
                "peak_hour": f"{peak_hour}:00 - {peak_hour + 1}:00",
                "peak_hour_orders": hours[0]["order_count"],
                "busiest_hour": f"{peak_hour}:00",
                "busiest_hour_orders": hours[0]["order_count"],
                "peak_hours": peak_hours_dict,
                "hours_data": hours
            }
        else:
            return {
                "peak_hour": "12:00 - 13:00",
                "peak_hour_orders": 0,
                "busiest_hour": "12:00",
                "busiest_hour_orders": 0,
                "peak_hours": {},
                "hours_data": []
            }
    except Exception as e:
        logging.error(f"Peak hours error: {e}")
        return {
            "peak_hour": "12:00 - 13:00",
            "peak_hour_orders": 0, 
            "peak_hours": {},
            "hours_data": []
        }

@api_router.get("/management/analytics/combos")
async def management_frequent_combos(canteen_id: str = None, user: dict = Depends(get_current_user)):
    """Get frequent item combinations using Apriori algorithm"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        # Fetch all COMPLETED orders
        match_filter = {"status": "COMPLETED"}
        if canteen_id:
            match_filter["canteen_id"] = canteen_id

        all_orders = await db.orders.find(match_filter, {"_id": 0, "items": 1}).to_list(length=2000)

        # Build transaction list of item name lists
        transactions = []
        for order in all_orders:
            names = [item.get("item_name") or item.get("name") for item in order.get("items", [])]
            names = [n for n in names if n]  # filter None
            if len(names) >= 2:
                transactions.append(names)

        combos = get_frequent_combos(transactions, min_support=0.03, min_confidence=0.25, top_n=10)

        # Fallback message when not enough data
        if not combos:
            combos = [
                {"item1": "Masala Dosa", "item2": "Filter Coffee", "frequency_pct": 0, "confidence": 0, "lift": 0,
                 "note": "Insufficient order history — seed more COMPLETED orders to activate Apriori"}
            ]

        return {"combos": combos, "algorithm": "apriori", "orders_analysed": len(transactions)}
    except Exception as e:
        logging.error(f"Combos (Apriori) error: {e}")
        return {"combos": [], "algorithm": "apriori", "orders_analysed": 0}

@api_router.get("/canteens")
async def get_canteens():
    """Get all canteens"""
    try:
        canteens = await db.canteens.find({}, {"_id": 0}).to_list(100)
        return canteens
    except Exception as e:
        logging.error(f"Error fetching canteens: {e}")
        return []

@api_router.post("/management/ai-insights")
async def get_ai_insights(user: dict = Depends(get_current_user)):
    """Get AI-powered insights (Mocked for now)"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    return {
        "insights": [
             {"title": "Revenue Growth", "message": "Revenue is up 15% compared to last week."},
             {"title": "Popular Item", "message": "Chicken Biryani is trending this week."}
        ],
        "recommendations": [
            {"title": "Stock Up", "suggestion": "Increase inventory for Chicken", "priority": "high", "category": "Inventory"},
            {"title": "Promotion", "suggestion": "Run a discount on Veg Meals", "priority": "medium", "category": "Marketing"}
        ],
        "predictions": {
            "stock_alerts": ["Low stock warning: Milk", "Low stock warning: Coffee Powder"]
        }
    }



# ─── Weekly Revenue (last 7 days) ──────────────────────────────────────────
@api_router.get("/management/analytics/weekly-revenue")
async def get_weekly_revenue(canteen_id: str = None, user: dict = Depends(get_current_user)):
    """Return daily revenue for the last 7 days (for area chart)."""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    try:
        from datetime import timedelta
        now = datetime.now(timezone.utc)
        days = []
        for i in range(6, -1, -1):
            day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end   = day_start + timedelta(days=1)
            match = {"status": "COMPLETED",
                     "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}}
            if canteen_id:
                match["canteen_id"] = canteen_id
            pipeline = [{"$match": match},
                        {"$group": {"_id": None, "revenue": {"$sum": "$total_amount"}, "orders": {"$sum": 1}}}]
            result = await db.orders.aggregate(pipeline).to_list(1)
            days.append({
                "day": day_start.strftime("%a"),
                "date": day_start.strftime("%d %b"),
                "revenue": round(result[0]["revenue"], 2) if result else 0,
                "orders":  result[0]["orders"] if result else 0
            })
        return days
    except Exception as e:
        logging.error(f"Weekly revenue error: {e}")
        return []

# ─── Student Spending by Category ──────────────────────────────────────────
@api_router.get("/spending/category-breakdown")
async def get_category_breakdown(user: dict = Depends(get_current_user)):
    """Return user's spending grouped by food category (Meals, Beverages, Snacks, etc.)."""
    try:
        orders = await db.orders.find(
            {"user_id": user["user_id"], "status": "COMPLETED"}, {"_id": 0, "items": 1}
        ).to_list(500)

        category_totals: dict = {}
        for order in orders:
            for item in order.get("items", []):
                cat = item.get("category", "Other")
                spent = item.get("price_at_order", 0) * item.get("quantity", 1)
                category_totals[cat] = round(category_totals.get(cat, 0) + spent, 2)

        if not category_totals:
            # Return placeholder buckets
            return [
                {"category": "Meals", "amount": 0},
                {"category": "Beverages", "amount": 0},
                {"category": "Snacks", "amount": 0},
            ]
        return [{"category": k, "amount": v} for k, v in category_totals.items()]
    except Exception as e:
        logging.error(f"Category breakdown error: {e}")
        return []


# ============================================
# WELLNESS AI ENDPOINTS  (Gemini-powered)
# ============================================

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

async def _ask_gemini(prompt: str) -> str:
    """Call Gemini via the google.generativeai SDK (async-friendly via run_in_executor)."""
    if not GEMINI_API_KEY:
        return ""
    try:
        import google.generativeai as genai
        import asyncio
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash')
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: model.generate_content(prompt))
        return response.text.strip()
    except Exception as e:
        logging.error(f"Gemini SDK error: {e}")
        # Try fallback model
        try:
            import google.generativeai as genai
            import asyncio
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-pro')
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: model.generate_content(prompt))
            return response.text.strip()
        except Exception as e2:
            logging.error(f"Gemini fallback model error: {e2}")
            return ""

@api_router.post("/ai/recommendations/symptom")
async def wellness_ai_symptom(
    data: SymptomInput,
    user: dict = Depends(get_current_user)
):
    """
    Wellness AI — Gemini-powered with smart rule-based fallback.
    Accepts free-form symptom/feeling descriptions and recommends real canteen items.
    """
    symptom_text = data.symptom.strip()
    canteen_id = data.canteen_id

    # Fetch available menu items from DB
    query = {"available": True}
    if canteen_id:
        query["canteen_id"] = canteen_id
    available_items = await db.menu_items.find(query, {"_id": 0}).to_list(200)

    if not available_items:
        return {
            "recommended_items": [],
            "explanation": "No menu items found. Please try again later.",
            "avoid": []
        }

    item_names_list = ", ".join(
        [f"{i['name']} (category: {i.get('category','')}, type: {i.get('veg_type','')})"
         for i in available_items]
    )

    # ── Gemini path ──────────────────────────────────────────────────────────
    if GEMINI_API_KEY:
        prompt = f"""You are a warm, caring campus canteen nutritionist AI.

A student says: "{symptom_text}"

Available canteen items:
{item_names_list}

Instructions:
1. If the student is just greeting you or chatting casually (e.g. "hi", "how are you"), reply with a friendly greeting and ask them how they are feeling (e.g., if they are stressed, tired, hungry, or have a cold). Leave "recommended" empty.
2. If they describe symptoms, goals, or cravings, choose 2-4 appropriate items from the list above.
3. Write a friendly 1-3 sentence conversational response in "explanation".
4. Optionally mention items to avoid if relevant.

Reply ONLY in this exact strict JSON format (no markdown code blocks, just raw JSON):
{{
  "recommended": ["Exact Item Name 1", "Exact Item Name 2"],
  "explanation": "Friendly conversational response here.",
  "avoid": []
}}"""

        gemini_response = await _ask_gemini(prompt)

        if gemini_response:
            try:
                import json as _json, re as _re
                # Extract JSON even if Gemini adds extra text / code fences
                json_match = _re.search(r'\{[\s\S]*\}', gemini_response)
                if json_match:
                    parsed = _json.loads(json_match.group())
                    rec_names = parsed.get("recommended", [])
                    explanation = parsed.get("explanation", "I'm here to help you feel better!")
                    avoid = parsed.get("avoid", [])

                    recommended_items = []
                    if rec_names:
                        for name in rec_names:
                            match = next(
                                (i for i in available_items
                                 if name.lower() in i["name"].lower() or i["name"].lower() in name.lower()),
                                None
                            )
                            if match:
                                recommended_items.append({
                                    "item_id": match["item_id"],
                                    "item_name": match["name"],
                                    "canteen_id": match["canteen_id"],
                                    "price": match.get("price"),
                                    "image_url": match.get("image_url"),
                                    "reason": "Recommended by Wellness AI"
                                })

                    return {
                        "recommended_items": recommended_items,
                        "explanation": explanation,
                        "avoid": avoid,
                        "powered_by": "gemini"
                    }
            except Exception as parse_err:
                logging.warning(f"Gemini JSON parse failed: {parse_err}")

    # ── Smart fallback: enhanced rule-based with real DB item matching ────────
    symptom_lower = symptom_text.lower()

    WELLNESS_RULES = [

        # ── HEALTH / PHYSICAL ILLNESS ─────────────────────────────────────────
        {
            "keywords": ["fever", "high temperature", "chills", "feverish", "hot body", "body heat", "burning up", "temperature"],
            "prefer_categories": ["Beverages", "Main Course"],
            "prefer_keywords": ["curd", "rice", "coconut", "lime", "rasam", "buttermilk", "plain"],
            "avoid_keywords": ["spicy", "fried", "chilli", "masala", "pepper"],
            "explanation": "🌡️ When you have a fever, your body needs light, easy-to-digest foods and plenty of fluids. Stay hydrated and avoid heavy or spicy meals. Rest well!",
            "avoid_msg": "Spicy, fried, or heavy foods that are hard to digest"
        },
        {
            "keywords": ["sick", "unwell", "not feeling well", "feeling sick", "recovering", "ill", "under the weather", "cold", "flu", "cough", "sneezing", "runny nose", "blocked nose", "sore throat", "congestion"],
            "prefer_categories": ["Beverages", "Soups"],
            "prefer_keywords": ["tea", "coffee", "rasam", "lime", "ginger", "pepper", "buttermilk", "soup"],
            "avoid_keywords": ["spicy", "fried", "chilli"],
            "explanation": "🤧 Sorry you're unwell! Warm beverages and light foods will soothe your throat and help you recover faster. Stay hydrated and rest!",
            "avoid_msg": "Spicy or fried foods that may irritate your throat"
        },
        {
            "keywords": ["headache", "migraine", "head hurts", "pounding", "head pain", "head ache"],
            "prefer_categories": ["Beverages"],
            "prefer_keywords": ["coffee", "tea", "lime", "juice", "water"],
            "avoid_keywords": [],
            "explanation": "☕ Headaches are often linked to dehydration or fatigue. A warm coffee or refreshing drink can help — stay hydrated!",
            "avoid_msg": ""
        },
        {
            "keywords": ["nausea", "vomit", "indigestion", "acidity", "bloating", "gas", "throwing up", "stomach pain", "stomach ache", "tummy ache", "body pain", "back pain", "cramps", "period pain", "period cramps", "upset stomach"],
            "prefer_categories": ["Main Course", "Beverages"],
            "prefer_keywords": ["curd", "buttermilk", "lime", "rice", "badam", "plain"],
            "avoid_keywords": ["spicy", "fried", "chilli", "pepper"],
            "explanation": "🫶 For stomach troubles, light and easy-to-digest foods are your best friend. These options are gentle and soothing.",
            "avoid_msg": "Spicy, fried, or heavy foods"
        },

        # ── HUNGER & THIRST ───────────────────────────────────────────────────
        {
            "keywords": ["very hungry", "super hungry", "extremely hungry", "starving", "famished", "havent eaten", "haven't eaten", "dying of hunger", "stomach growling"],
            "prefer_categories": ["Main Course", "Biryani"],
            "prefer_keywords": ["biryani", "meals", "curry", "chicken", "mutton", "rice", "paratha", "naan"],
            "avoid_keywords": [],
            "explanation": "🍽️ You're very hungry! Here are the most filling and satisfying options from the canteen to fuel you up fast!",
            "avoid_msg": ""
        },
        {
            "keywords": ["hungry", "need food", "appetite", "need to eat", "stomach empty", "want to eat", "feeling hungry", "bit hungry"],
            "prefer_categories": ["Main Course", "Breakfast", "Snacks"],
            "prefer_keywords": ["biryani", "meals", "rice", "dosa", "paratha", "curry", "sandwich", "wrap"],
            "avoid_keywords": [],
            "explanation": "🍽️ You need a good meal! Here are some hearty options from the canteen that will satisfy your hunger.",
            "avoid_msg": ""
        },
        {
            "keywords": ["dehydrated", "thirsty", "parched", "dry mouth", "need water", "very thirsty", "dehydration", "need fluids", "need to hydrate"],
            "prefer_categories": ["Beverages"],
            "prefer_keywords": ["lime", "juice", "coconut", "buttermilk", "water", "lemon", "soda", "fresh"],
            "avoid_keywords": [],
            "explanation": "💧 Staying hydrated is super important! Here are some refreshing drinks from the canteen to replenish your fluids!",
            "avoid_msg": ""
        },

        # ── ENERGY & FITNESS ──────────────────────────────────────────────────
        {
            "keywords": ["gym", "workout", "exercise", "lifting", "post workout", "pre workout", "body building", "bulking", "cutting", "muscle", "fitness", "gains", "training", "need protein", "want protein"],
            "prefer_categories": ["Main Course", "Snacks"],
            "prefer_keywords": ["chicken", "egg", "paneer", "grilled", "protein", "boiled", "tikka"],
            "avoid_keywords": [],
            "explanation": "💪 Great work! These high-protein options will fuel your muscles, support recovery, and help you reach your fitness goals.",
            "avoid_msg": ""
        },
        {
            "keywords": ["energetic", "full of energy", "pumped", "active", "feeling great", "on fire", "energised", "energized"],
            "prefer_categories": ["Main Course", "Snacks", "Beverages"],
            "prefer_keywords": ["juice", "fruit", "salad", "chicken", "wrap", "biryani"],
            "avoid_keywords": [],
            "explanation": "🔥 You're full of energy today! Keep the momentum going with these power-packed options from the canteen!",
            "avoid_msg": ""
        },
        {
            "keywords": ["tired", "fatigue", "exhausted", "drained", "low energy", "no energy", "lethargic", "feeling weak", "weak"],
            "prefer_categories": ["Beverages", "Snacks", "Breakfast"],
            "prefer_keywords": ["coffee", "tea", "juice", "energy", "snack", "oatmeal", "smoothie"],
            "avoid_keywords": [],
            "explanation": "⚡ Feeling low on energy? These energizing options will give you the boost you need to get back on track!",
            "avoid_msg": ""
        },
        {
            "keywords": ["sleepy", "drowsy", "cant keep eyes open", "falling asleep", "sluggish", "groggy", "need coffee"],
            "prefer_categories": ["Beverages"],
            "prefer_keywords": ["coffee", "espresso", "latte", "cold coffee", "cappuccino", "tea"],
            "avoid_keywords": [],
            "explanation": "☕ Feeling sleepy? A good cup of coffee or tea will wake you right up! Caffeine is your best friend right now.",
            "avoid_msg": ""
        },

        # ── STRESS & ANXIETY ──────────────────────────────────────────────────
        {
            "keywords": ["stressed", "stress", "pressure", "burnout", "overwhelmed", "too much work", "overloaded", "cant handle", "mental pressure", "breaking down"],
            "prefer_categories": ["Beverages", "Desserts", "Snacks"],
            "prefer_keywords": ["badam", "milk", "chocolate", "tea", "coffee", "green tea"],
            "avoid_keywords": [],
            "explanation": "🧘 Stress is tough — but the right food can help calm your mind. Treat yourself and remember: you've got this!",
            "avoid_msg": ""
        },
        {
            "keywords": ["anxious", "anxiety", "nervous", "jittery", "uneasy", "on edge", "panic", "worried", "restless", "unsettled"],
            "prefer_categories": ["Beverages", "Snacks"],
            "prefer_keywords": ["green tea", "badam", "milk", "warm", "light", "juice", "smoothie"],
            "avoid_keywords": [],
            "explanation": "🌿 When you're anxious or nervous, calming and light foods work best. Try something warm and soothing — it really helps!",
            "avoid_msg": ""
        },
        {
            "keywords": ["angry", "furious", "irritated", "irritable", "mad", "rage", "frustrated", "annoyed", "pissed", "aggravated"],
            "prefer_categories": ["Desserts", "Beverages", "Snacks"],
            "prefer_keywords": ["chocolate", "ice cream", "juice", "sweet", "cool", "cold"],
            "avoid_keywords": ["spicy"],
            "explanation": "😤 Cool down with something sweet and refreshing! A treat can do wonders for your mood right now.",
            "avoid_msg": "Spicy foods that may increase irritation"
        },

        # ── NEGATIVE EMOTIONS ─────────────────────────────────────────────────
        {
            "keywords": ["sad", "unhappy", "heartbroken", "miserable", "down", "gloomy", "low", "feeling sad", "crying", "blue", "tearful"],
            "prefer_categories": ["Desserts", "Snacks", "Beverages"],
            "prefer_keywords": ["chocolate", "ice cream", "cake", "brownie", "milkshake", "sweet", "donut"],
            "avoid_keywords": [],
            "explanation": "🫂 Sending you a virtual hug! Comfort food is exactly what you need right now. Sweet treats have a way of lifting the spirit 💛",
            "avoid_msg": ""
        },
        {
            "keywords": ["depressed", "depression", "hopeless", "empty feeling", "numb", "worthless", "no motivation", "lost"],
            "prefer_categories": ["Desserts", "Beverages", "Main Course"],
            "prefer_keywords": ["chocolate", "warm", "badam", "milk", "soup", "rasam", "comfort"],
            "avoid_keywords": [],
            "explanation": "💛 You matter, and it's okay to not be okay. Nourish yourself with something warm and comforting today. One step at a time 🌻",
            "avoid_msg": ""
        },
        {
            "keywords": ["lonely", "alone", "isolated", "missing someone", "homesick", "by myself", "no one around"],
            "prefer_categories": ["Desserts", "Beverages", "Snacks"],
            "prefer_keywords": ["chocolate", "warm", "milkshake", "coffee", "cake", "comfort"],
            "avoid_keywords": [],
            "explanation": "🤗 Even solo meals can be special! Treat yourself to something you love — great food is great company 💛",
            "avoid_msg": ""
        },
        {
            "keywords": ["guilty", "regret", "embarrassed", "ashamed", "jealous", "envy", "feel bad about myself"],
            "prefer_categories": ["Desserts", "Beverages"],
            "prefer_keywords": ["chocolate", "ice cream", "tea", "coffee", "sweet"],
            "avoid_keywords": [],
            "explanation": "🍫 We all have those moments! Treat yourself to something sweet — food has a magical way of making things feel a little better.",
            "avoid_msg": ""
        },
        {
            "keywords": ["bored", "boring day", "nothing to do", "uninterested", "dull", "monotonous", "no stimulation"],
            "prefer_categories": ["Snacks", "Beverages", "Desserts"],
            "prefer_keywords": ["popcorn", "fries", "chips", "nachos", "ice cream", "milkshake", "momos"],
            "avoid_keywords": [],
            "explanation": "😴 Bored? Let food be your entertainment! Here are some fun, indulgent snacks to make your day more interesting.",
            "avoid_msg": ""
        },

        # ── POSITIVE EMOTIONS ─────────────────────────────────────────────────
        {
            "keywords": ["happy", "joyful", "cheerful", "great mood", "feeling amazing", "wonderful", "delighted", "ecstatic", "feeling good", "on top of the world"],
            "prefer_categories": ["Main Course", "Desserts", "Snacks"],
            "prefer_keywords": ["biryani", "pizza", "burger", "ice cream", "cake", "shake"],
            "avoid_keywords": [],
            "explanation": "😄 You're in a great mood — celebrate it with something delicious! Here are some crowd-favourite treats to keep those good vibes going!",
            "avoid_msg": ""
        },
        {
            "keywords": ["excited", "thrilled", "pumped up", "super excited", "hyped", "over the moon", "cant wait"],
            "prefer_categories": ["Snacks", "Desserts", "Main Course"],
            "prefer_keywords": ["burger", "pizza", "fries", "shake", "ice cream", "wrap"],
            "avoid_keywords": [],
            "explanation": "🎉 That excitement is contagious! Celebrate the moment with these fun and delicious picks from the canteen!",
            "avoid_msg": ""
        },
        {
            "keywords": ["celebratory", "celebration", "birthday", "won", "victory", "success", "special day", "special occasion", "achieved", "treat myself", "reward myself", "proud", "nailed it", "accomplished"],
            "prefer_categories": ["Desserts", "Main Course", "Beverages"],
            "prefer_keywords": ["cake", "ice cream", "biryani", "pizza", "shake", "special", "chicken"],
            "avoid_keywords": [],
            "explanation": "🏆 Celebration time! You deserve something special! Here are some festive and indulgent picks to make the moment unforgettable!",
            "avoid_msg": ""
        },
        {
            "keywords": ["romantic", "date", "in love", "crush", "valentines", "anniversary", "affectionate", "loved", "loved up"],
            "prefer_categories": ["Desserts", "Beverages"],
            "prefer_keywords": ["chocolate", "cake", "coffee", "latte", "shake", "sweet", "red velvet"],
            "avoid_keywords": [],
            "explanation": "💕 Feeling romantic? Sweet treats and cozy drinks set the perfect mood! Here are some lovely options for you.",
            "avoid_msg": ""
        },
        {
            "keywords": ["social", "with friends", "group eating", "hangout", "friends gathering", "eating together", "party food"],
            "prefer_categories": ["Snacks", "Main Course"],
            "prefer_keywords": ["pizza", "burger", "biryani", "fries", "momos", "wrap", "noodles"],
            "avoid_keywords": [],
            "explanation": "👫 Eating with your crew? Here are the best shareable and crowd-pleasing options from the canteen!",
            "avoid_msg": ""
        },
        {
            "keywords": ["grateful", "thankful", "blessed", "content", "satisfied", "peaceful", "at peace", "calm", "relaxed", "serene", "zen", "tranquil", "hopeful", "optimistic", "positive vibes", "good vibes"],
            "prefer_categories": ["Beverages", "Snacks", "Healthy Options"],
            "prefer_keywords": ["green tea", "juice", "fruit", "salad", "light", "healthy", "smoothie"],
            "avoid_keywords": [],
            "explanation": "🌸 In a peaceful state of mind? Enjoy something light and wholesome to match your calm, positive energy!",
            "avoid_msg": ""
        },
        {
            "keywords": ["motivated", "driven", "inspired", "creative", "determined", "focused", "goal mode", "productive", "study mode", "working hard", "concentrated", "on track", "ambitious", "brain food"],
            "prefer_categories": ["Beverages", "Healthy Options", "Snacks"],
            "prefer_keywords": ["coffee", "juice", "smoothie", "salad", "protein", "oatmeal", "nuts", "energy bar"],
            "avoid_keywords": [],
            "explanation": "🚀 You're in goal-getter mode! Fuel your focus with these energizing and nutritious picks to keep your momentum going!",
            "avoid_msg": ""
        },
        {
            "keywords": ["confident", "bold", "fearless", "unstoppable", "powerful", "strong feeling", "playful", "fun", "lighthearted", "carefree", "curious", "adventurous", "try something new"],
            "prefer_categories": ["Main Course", "Snacks"],
            "prefer_keywords": ["chicken", "biryani", "burger", "grilled", "special", "new", "fusion"],
            "avoid_keywords": [],
            "explanation": "😎 Feeling bold and adventurous? Go for something bold and satisfying — maybe even try something new from the canteen today!",
            "avoid_msg": ""
        },
        {
            "keywords": ["lazy", "cant be bothered", "rest day", "couch mode", "just chilling", "dont want to move"],
            "prefer_categories": ["Snacks", "Beverages"],
            "prefer_keywords": ["chips", "fries", "popcorn", "juice", "tea", "coffee"],
            "avoid_keywords": [],
            "explanation": "🛋️ Lazy mode activated! Here are some easy and satisfying options you can enjoy without any fuss.",
            "avoid_msg": ""
        },

        # ── CRAVINGS ──────────────────────────────────────────────────────────
        {
            "keywords": ["craving sweet", "sweet tooth", "want something sweet", "sugar craving", "want dessert", "need sugar", "something sweet"],
            "prefer_categories": ["Desserts"],
            "prefer_keywords": ["cake", "ice cream", "chocolate", "brownie", "donut", "sweet", "shake", "pastry", "pudding"],
            "avoid_keywords": [],
            "explanation": "🍰 Sweet tooth alert! Here are the most delicious sweet treats the canteen has to offer — go ahead, you deserve it!",
            "avoid_msg": ""
        },
        {
            "keywords": ["craving spicy", "want spicy", "something hot and spicy", "spicy mood", "chilli craving", "fire food"],
            "prefer_categories": ["Main Course", "Snacks"],
            "prefer_keywords": ["spicy", "chilli", "masala", "pepper", "tikka", "tandoori", "hot"],
            "avoid_keywords": [],
            "explanation": "🌶️ Spicy food craving! Here are some fiery and flavourful options that'll satisfy your craving for heat!",
            "avoid_msg": ""
        },
        {
            "keywords": ["craving junk", "junk food", "fast food", "cheat meal", "cheat day", "unhealthy cravings", "want junk food"],
            "prefer_categories": ["Snacks", "Main Course"],
            "prefer_keywords": ["burger", "fries", "pizza", "wrap", "hot dog", "nachos", "chips"],
            "avoid_keywords": [],
            "explanation": "🍟 Cheat day? No judgement! Here are the ultimate junk food picks from the canteen to satisfy those cravings!",
            "avoid_msg": ""
        },
        {
            "keywords": ["craving comfort food", "comfort food", "soul food", "home food", "nostalgic food", "want something warm and filling", "homesick food"],
            "prefer_categories": ["Main Course", "Beverages"],
            "prefer_keywords": ["rice", "dal", "rasam", "curd", "meals", "dosa", "sambar", "soup"],
            "avoid_keywords": [],
            "explanation": "🏠 Nothing beats comfort food! Here are some warm, homely options that will make you feel right at home.",
            "avoid_msg": ""
        },
        {
            "keywords": ["craving refreshment", "want cold drink", "something refreshing", "chilled drink", "iced drink", "something light and fresh"],
            "prefer_categories": ["Beverages"],
            "prefer_keywords": ["juice", "cold", "iced", "lime", "coconut", "soda", "lemon", "cool", "fresh", "smoothie"],
            "avoid_keywords": [],
            "explanation": "🧊 Ready for something cool and refreshing? These chilled beverages will hit the spot perfectly!",
            "avoid_msg": ""
        },

        # ── TEMPERATURE ───────────────────────────────────────────────────────
        {
            "keywords": ["feeling hot", "overheated", "too hot", "sweating a lot", "hot weather", "summer heat", "heat"],
            "prefer_categories": ["Beverages", "Desserts"],
            "prefer_keywords": ["juice", "cold", "iced", "ice cream", "coconut", "lime", "cool", "soda", "lemon"],
            "avoid_keywords": ["hot", "warm", "spicy"],
            "explanation": "🌡️ Beat the heat with these cool and refreshing picks! Ice creams, cold drinks, and fresh juices to cool you down.",
            "avoid_msg": "Hot, spicy or heavy foods that will make you feel warmer"
        },
        {
            "keywords": ["feeling cold", "chilly", "shivering", "its cold", "cold outside", "winter", "need something warm"],
            "prefer_categories": ["Beverages", "Main Course"],
            "prefer_keywords": ["tea", "coffee", "soup", "warm", "hot", "rasam", "masala"],
            "avoid_keywords": [],
            "explanation": "🧣 Warm up from the inside out! Here are the cosiest warm drinks and hot meals to beat the cold.",
            "avoid_msg": ""
        },
    ]

    matched_rule = None

    # ── Greeting Detection ─────────────────────────────────────────────────
    GREETING_WORDS = ["hello", "hi", "hey", "heyy", "helloo", "helo", "hai", "hii", "howdy", "good morning", "good afternoon", "good evening", "sup", "what's up", "whats up"]
    if any(symptom_lower.strip() == g or symptom_lower.strip().startswith(g + " ") for g in GREETING_WORDS) or symptom_lower.strip() in GREETING_WORDS:
        return {
            "recommended_items": [],
            "explanation": "👋 Hello! I'm Campus Bites AI — your personal canteen assistant! 🍽️\n\nTell me how you're feeling right now and I'll suggest the best meals for you.\n\nFor example, try saying:\n• 'I have a headache'\n• 'I feel stressed'\n• 'I have a cold'\n• 'I just did gym'\n• 'I'm very hungry'",
            "avoid": [],
            "powered_by": "greeting"
        }

    # ── Acknowledgement / Thank You Detection ──────────────────────────────
    ACK_WORDS = ["ok", "okay", "thanks", "thank you", "thankyou", "thank u", "thx", "ty", "great", "got it", "noted", "nice", "cool", "awesome", "perfect", "bye", "goodbye", "see you", "cya", "alright", "sure", "fine", "done"]
    if any(symptom_lower.strip() == a or symptom_lower.strip().startswith(a + " ") or symptom_lower.strip().endswith(" " + a) for a in ACK_WORDS) or symptom_lower.strip() in ACK_WORDS:
        return {
            "recommended_items": [],
            "explanation": "😊 Glad I could help! Is there anything else I can assist you with?\n\nFeel free to tell me how you're feeling — whether it's a headache, stress, fatigue, or hunger — and I'll find the best canteen options for you! 🍽️",
            "avoid": [],
            "powered_by": "acknowledgement"
        }

    # ── Off-Topic Detection ────────────────────────────────────────────────
    OFF_TOPIC_WORDS = ["maths", "math", "science", "physics", "chemistry", "biology", "history", "geography", "english", "coding", "programming", "homework", "assignment", "exam help", "study", "calculus", "algebra", "solve", "equation", "formula", "weather", "news", "sports", "cricket", "football", "movie", "song", "music", "politics", "stock", "finance", "investment", "joke", "story", "poem", "essay", "translate", "language"]
    if any(w in symptom_lower for w in OFF_TOPIC_WORDS):
        return {
            "recommended_items": [],
            "explanation": "🙏 Sorry, I can't help with that! I'm Campus Bites AI and I only assist with canteen-related queries.\n\nTell me how you're feeling physically or mentally (e.g., 'tired', 'stressed', 'have a cold') and I'll suggest the best food options for you from our canteen! 🍽️",
            "avoid": [],
            "powered_by": "off-topic"
        }

    for rule in WELLNESS_RULES:
        if any(kw in symptom_lower for kw in rule["keywords"]):
            matched_rule = rule
            break


    if matched_rule:
        # Score items: category match + keyword match in name
        def score_item(item):
            score = 0
            name_lower = item["name"].lower()
            cat = item.get("category", "")
            if cat in matched_rule["prefer_categories"]:
                score += 3
            for kw in matched_rule["prefer_keywords"]:
                if kw in name_lower:
                    score += 2
            for bad_kw in matched_rule.get("avoid_keywords", []):
                if bad_kw in name_lower:
                    score -= 5
            return score

        scored = sorted(available_items, key=score_item, reverse=True)
        top_items = scored[:4]

        recommended_items = [{
            "item_id": i["item_id"],
            "item_name": i["name"],
            "canteen_id": i["canteen_id"],
            "price": i.get("price"),
            "image_url": i.get("image_url"),
            "reason": matched_rule["explanation"].split("!")[0]
        } for i in top_items]

        return {
            "recommended_items": recommended_items,
            "explanation": matched_rule["explanation"],
            "avoid": [matched_rule["avoid_msg"]] if matched_rule.get("avoid_msg") else [],
            "powered_by": "smart-rules"
        }

    # Generic fallback
    import random as _random
    popular = [i for i in available_items if i.get("category") in ["Main Course", "Beverages", "Snacks"]]
    _random.shuffle(popular)
    recommended_items = [{
        "item_id": i["item_id"],
        "item_name": i["name"],
        "canteen_id": i["canteen_id"],
        "price": i.get("price"),
        "image_url": i.get("image_url"),
        "reason": "Popular item"
    } for i in popular[:3]]

    return {
        "recommended_items": recommended_items,
        "explanation": "😊 Here are some popular items from the canteen! Try describing how you're feeling (e.g. 'I have a headache', 'I feel stressed', 'I have a cold') for personalized suggestions.",
        "avoid": [],
        "powered_by": "popular"
    }


# ============================================
# AI CART RECOMMENDATIONS (Order-History-Aware)
# ============================================

@api_router.post("/ai/recommendations/cart")
async def ai_cart_recommendations(
    data: RecommendationInput,
    user: dict = Depends(get_current_user)
):
    """
    Smart cart recommendations powered by Gemini.
    Reads the user's personal order history + current cart, suggests what to add.
    Falls back to smart category-based suggestions if Gemini is unavailable.
    """
    current_items = data.current_items  # names of items currently in cart
    canteen_id = data.canteen_id

    # 1. Fetch available menu items from this canteen
    query = {"available": True}
    if canteen_id:
        query["canteen_id"] = canteen_id
    available_items = await db.menu_items.find(query, {"_id": 0}).to_list(200)
    if not available_items:
        return {"recommendations": [], "source": "none"}

    # 2. Fetch user's last 15 completed orders
    user_orders = await db.orders.find(
        {"user_id": user["user_id"], "status": "COMPLETED"},
        {"_id": 0, "items": 1}
    ).sort("created_at", -1).limit(15).to_list(15)

    past_items = []
    for order in user_orders:
        for it in order.get("items", []):
            name = it.get("item_name") or it.get("name")
            if name and name not in past_items:
                past_items.append(name)

    # Don't recommend what's already in cart
    cart_set = set(i.lower() for i in current_items)
    exclude = set(i.lower() for i in current_items)

    # Build menu summary (exclude items already in cart)
    available_names = [
        f"{i['name']} ({i.get('category','')})"
        for i in available_items
        if i["name"].lower() not in exclude
    ]
    menu_str = ", ".join(available_names[:80])  # cap for prompt size

    cart_str = ", ".join(current_items) if current_items else "nothing yet"
    history_str = ", ".join(past_items[:20]) if past_items else "no history available"

    # ── Gemini path ──────────────────────────────────────────────────────────
    if GEMINI_API_KEY:
        prompt = f"""You are a smart canteen recommendation AI.

A student has these items in their cart: {cart_str}
Their past orders include: {history_str}
Available menu items (not in cart): {menu_str}

Suggest exactly 3 items from the available list that pair well with their cart items.
Consider what drinks/sides/desserts complement their main dish.
For example: biryani → lime juice / coke / raita; dosa → filter coffee / vada.

Reply ONLY in this JSON format (no markdown):
{{
  "recommendations": ["Item Name 1", "Item Name 2", "Item Name 3"],
  "reason": "One short sentence on why these pair well."
}}"""

        gemini_text = await _ask_gemini(prompt)
        if gemini_text:
            try:
                import json as _json, re as _re
                m = _re.search(r'\{[\s\S]*\}', gemini_text)
                if m:
                    parsed = _json.loads(m.group())
                    rec_names = parsed.get("recommendations", [])
                    reason = parsed.get("reason", "")
                    recs = []
                    for name in rec_names:
                        match = next(
                            (i for i in available_items
                             if name.lower() in i["name"].lower() or i["name"].lower() in name.lower()),
                            None
                        )
                        if match:
                            recs.append({
                                "item_id": match["item_id"],
                                "item_name": match["name"],
                                "name": match["name"],
                                "price": match.get("price"),
                                "image_url": match.get("image_url"),
                                "canteen_id": match["canteen_id"],
                                "nutrition": match.get("nutrition", {}),
                                "reason": reason
                            })
                    if recs:
                        return {"recommendations": recs, "source": "gemini"}
            except Exception as e:
                logging.warning(f"AI cart rec parse error: {e}")

    # ── Smart fallback: category-based pairing ────────────────────────────────
    # If cart has main course → prefer beverages; if beverages → prefer snacks/mains
    cart_categories = set()
    for name in current_items:
        match = next((i for i in available_items if i["name"].lower() == name.lower()), None)
        if match:
            cart_categories.add(match.get("category", ""))

    if "Main Course" in cart_categories or "Breakfast" in cart_categories:
        prefer_cats = ["Beverages", "Snacks", "Desserts"]
    elif "Beverages" in cart_categories:
        prefer_cats = ["Snacks", "Main Course", "Breakfast"]
    else:
        prefer_cats = ["Beverages", "Snacks", "Main Course"]

    candidates = [
        i for i in available_items
        if i["name"].lower() not in exclude and i.get("category") in prefer_cats
    ]
    import random as _rand
    _rand.shuffle(candidates)
    top = candidates[:3]

    return {
        "recommendations": [{
            "item_id": i["item_id"],
            "item_name": i["name"],
            "name": i["name"],
            "price": i.get("price"),
            "image_url": i.get("image_url"),
            "canteen_id": i["canteen_id"],
            "nutrition": i.get("nutrition", {}),
            "reason": "Goes great with your order"
        } for i in top],
        "source": "smart-fallback"
    }


# ============================================
# ORDER ENDPOINTS
# ============================================

@api_router.get("/config/payment")
async def get_payment_config():
    """Get payment configuration"""
    return {
        "razorpay_key_id": os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_demo'),
        "test_mode": not RAZORPAY_ENABLED
    }

@api_router.post("/orders")
async def create_order(order_data: OrderCreate, user: dict = Depends(get_current_user)):
    """Create new order"""
    if user['role'] != 'student':
        raise HTTPException(status_code=403, detail="Only students can place orders")
    
    # Generate token number
    token_number = generate_token_number()
    
    # Create Razorpay order (test mode)
    if RAZORPAY_ENABLED and razorpay_client:
        razorpay_order = razorpay_client.order.create({
            "amount": int(order_data.total_amount * 100),
            "currency": "INR",
            "payment_capture": 1
        })
        razorpay_order_id = razorpay_order['id']
    else:
        # Test mode - simulate order ID
        razorpay_order_id = f"order_test_{uuid.uuid4().hex[:12]}"
    
    # Create order
    order = Order(
        student_id=user['user_id'],
        items=order_data.items,
        canteen_id=order_data.canteen_id,
        token_number=token_number,
        status="PENDING_PAYMENT",
        razorpay_order_id=razorpay_order_id,
        total_amount=order_data.total_amount,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    
    order_dict = order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    order_dict['updated_at'] = order_dict['updated_at'].isoformat()
    order_dict['expires_at'] = order_dict['expires_at'].isoformat()
    
    await db.orders.insert_one(order_dict)
    
    return {
        "order_id": order.order_id,
        "token_number": token_number,
        "razorpay_order_id": razorpay_order_id,
        "razorpay_key_id": os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_demo'),
        "amount": order_data.total_amount,
        "test_mode": not RAZORPAY_ENABLED
    }

@api_router.post("/orders/{order_id}/verify-payment")
async def verify_payment(order_id: str, verification: PaymentVerification, user: dict = Depends(get_current_user)):
    """Verify Razorpay payment"""
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    payment_id = verification.payment_id
    signature = verification.signature
    
    # Verify signature (skip in test mode)
    if RAZORPAY_ENABLED and razorpay_client:
        try:
            razorpay_client.utility.verify_payment_signature({
                'razorpay_order_id': order['razorpay_order_id'],
                'razorpay_payment_id': payment_id,
                'razorpay_signature': signature
            })
        except:
            raise HTTPException(status_code=400, detail="Payment verification failed")
    # In test mode, always pass verification
    
    # Update order status to REQUESTED (crew needs to accept it first)
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "status": "REQUESTED",
            "razorpay_payment_id": payment_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create bill
    bill = Bill(
        student_id=user['user_id'],
        order_id=order_id,
        amount=order['total_amount'],
        items=order['items']
    )
    bill_dict = bill.model_dump()
    bill_dict['timestamp'] = bill_dict['timestamp'].isoformat()
    await db.bills.insert_one(bill_dict)
    
    # Update spending analytics
    await update_spending_analytics(user['user_id'], order['total_amount'])
    
    # Emit socket event
    await sio.emit('order_update', {
        'order_id': order_id,
        'status': 'REQUESTED',
        'canteen_id': order['canteen_id']
    }, room=order['canteen_id'])
    
    return {"message": "Payment verified", "status": "REQUESTED"}

@api_router.get("/orders/pending/{canteen_id}")
async def get_pending_orders(canteen_id: str, user: dict = Depends(get_current_user)):
    """Get pending orders for crew dashboard - only PAID orders"""
    if user['role'] != 'crew':
        raise HTTPException(status_code=403, detail="Unauthorized - Crew only")
    
    try:
        # Fetch orders that are PAID but not yet completed
        # Statuses: REQUESTED, PREPARING, READY (exclude PENDING_PAYMENT, COMPLETED, CANCELLED)
        orders = await db.orders.find({
            "canteen_id": canteen_id,
            "status": {"$in": ["REQUESTED", "PREPARING", "READY"]}
        }, {"_id": 0}).sort("created_at", 1).to_list(100)
        
        return orders
    except Exception as e:
        logging.error(f"Error fetching pending orders: {e}")
        return []

@api_router.get("/orders/recent/{canteen_id}")
async def get_recent_orders(canteen_id: str, user: dict = Depends(get_current_user)):
    """Get recent orders including history for crew dashboard"""
    logging.info(f"Fetching recent orders for canteen: '{canteen_id}' Requesting User: {user.get('email')}")
    if user['role'] != 'crew':
        raise HTTPException(status_code=403, detail="Unauthorized - Crew only")
    
    try:
        # 1. Fetch active orders (REQUESTED, PREPARING, READY)
        active_orders = await db.orders.find({
            "canteen_id": canteen_id,
            "status": {"$in": ["REQUESTED", "PREPARING", "READY"]}
        }, {"_id": 0}).sort("created_at", 1).to_list(100)
        logging.info(f"Found {len(active_orders)} active orders for {canteen_id}")

        # 2. Fetch recent COMPLETED/CANCELLED orders (Limit 50)
        history_orders = await db.orders.find({
            "canteen_id": canteen_id,
            "status": {"$in": ["COMPLETED", "CANCELLED"]}
        }, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)

        results = active_orders + history_orders
        logging.info(f"Returning total {len(results)} orders for {canteen_id}")
        return results
    except Exception as e:
        logging.error(f"Error fetching recent orders: {e}")
        return []

@api_router.get("/orders/alerts/{canteen_id}")
async def get_priority_orders(canteen_id: str, user: dict = Depends(get_current_user)):
    """Get priority/delayed orders (waiting > 15 minutes)"""
    if user['role'] != 'crew':
        raise HTTPException(status_code=403, detail="Unauthorized - Crew only")
    
    try:
        # Calculate timestamp for 15 minutes ago
        fifteen_mins_ago = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
        
        priority_orders = await db.orders.find({
            "canteen_id": canteen_id,
            "status": {"$in": ["REQUESTED", "PREPARING"]},
            "created_at": {"$lt": fifteen_mins_ago}
        }, {"_id": 0}).to_list(50)
        
        return {"priority_orders": priority_orders}
    except Exception as e:
        logging.error(f"Error fetching priority orders: {e}")
        return {"priority_orders": []}

@api_router.get("/orders/stats/{canteen_id}")
async def get_order_stats(canteen_id: str, user: dict = Depends(get_current_user)):
    """Get statistics for crew dashboard (Completed Today, Avg Prep Time)"""
    if user['role'] != 'crew':
        raise HTTPException(status_code=403, detail="Unauthorized - Crew only")
    
    try:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        logging.info(f"Stats Debug: Fetching stats for {canteen_id} since {today_start.isoformat()}")
        
        # 1. Count Completed Today
        completed_count = await db.orders.count_documents({
            "canteen_id": canteen_id,
            "status": "COMPLETED",
            "updated_at": {"$gte": today_start.isoformat()}
        })
        logging.info(f"Stats Debug: Found {completed_count} completed orders")
        
        # 2. Calculate Avg Prep Time (Mock or Simple Calculation)
        # For now, let's return a static or random value if real data is hard to compute without 'prep_start' timestamp
        # Or just aggregate based on created_at vs updated_at for COMPLETED orders
        
        pipeline = [
            {
                "$match": {
                    "canteen_id": canteen_id,
                    "status": "COMPLETED",
                    "updated_at": {"$gte": today_start.isoformat()}
                }
            },
            {
                "$project": {
                    "duration": {
                        "$subtract": [
                            {"$toDate": "$updated_at"},
                            {"$toDate": "$created_at"}
                        ]
                    }
                }
            },
            {
                "$group": {
                    "_id": None,
                    "avg_duration": {"$avg": "$duration"}
                }
            }
        ]
        
        avg_prep_min = 15 # Default
        try:
            agg_res = await db.orders.aggregate(pipeline).to_list(1)
            if agg_res:
                avg_ms = agg_res[0]['avg_duration']
                avg_prep_min = int(avg_ms / 1000 / 60)
        except Exception:
            pass

        return {
            "completed_today": completed_count,
            "avg_prep_time": avg_prep_min
        }
    except Exception as e:
        logging.error(f"Error fetching stats: {e}")
        return {"completed_today": 0, "avg_prep_time": 0}


@api_router.post("/orders/verify-token")
async def verify_token(token_data: dict, user: dict = Depends(get_current_user)):
    """Verify token number and return order details"""
    logging.info(f"Verification Request: {token_data} User: {user.get('email')}")
    if user['role'] != 'crew':
        raise HTTPException(status_code=403, detail="Unauthorized - Crew only")
    
    token_str = token_data.get('token', '')
    if not token_str:
        raise HTTPException(status_code=400, detail="Token number required")
    
    try:
        token = int(token_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Token must be numeric")
    
    # Try finding exact match
    order = await db.orders.find_one({"token_number": token}, {"_id": 0})
    
    # If not found, try case-insensitive search (just in case)
    if not order:
        order = await db.orders.find_one({"token_number": {"$regex":f"^{token}$", "$options": "i"}}, {"_id": 0})

    if not order:
        logging.warning(f"Token NOT found: '{token}'")
        raise HTTPException(status_code=404, detail="Invalid token or order not found")
    
    logging.info(f"Token verified: {token} -> {order['order_id']}")
    return order

@api_router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, status_data: dict, user: dict = Depends(get_current_user)):
    """Update order status (crew only)"""
    if user['role'] != 'crew':
        raise HTTPException(status_code=403, detail="Unauthorized - Crew only")
    
    new_status = status_data.get('status')
    if not new_status:
        raise HTTPException(status_code=400, detail="Status required")
    
    # Validate status
    valid_statuses = ["REQUESTED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Emit socket event for real-time updates - broadcast to BOTH rooms
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if order:
        event_payload = {
            'order_id': order_id,
            'status': new_status,
            'canteen_id': order['canteen_id'],
            'student_id': order['student_id'],
            'token_number': order.get('token_number', ''),
        }
        # 1. Notify crew room → so all crew dashboards refresh their list
        await sio.emit('order_update', event_payload, room=order['canteen_id'])
        # 2. Notify student's personal room → so OrderTracking updates live
        await sio.emit('order_update', event_payload, room=order['student_id'])
    
    return {"message": "Order status updated successfully", "status": new_status}


@api_router.get("/orders/my")
async def get_my_orders(user: dict = Depends(get_current_user)):
    """Get current user's orders (Last 30 days)"""
    # Calculate 30 days ago
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    orders = await db.orders.find(
        {
            "student_id": user['user_id'],
            "created_at": {"$gte": thirty_days_ago}
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(500) # Increased limit to ensure full month history
    return orders

@api_router.delete("/orders/my")
async def clear_order_history(user: dict = Depends(get_current_user)):
    """Clear all order history for current user"""
    result = await db.orders.delete_many({"student_id": user['user_id']})
    return {"message": f"Deleted {result.deleted_count} orders"}

@api_router.post("/orders/batch-delete")
async def delete_orders_batch(batch: OrderBatchDelete, user: dict = Depends(get_current_user)):
    """Delete specific orders"""
    result = await db.orders.delete_many({
        "student_id": user['user_id'],
        "order_id": {"$in": batch.order_ids}
    })
    return {"message": f"Deleted {result.deleted_count} orders"}

    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": status_update.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Emit socket event
    await sio.emit('order_update', {
        'order_id': order_id,
        'status': status_update.status,
        'student_id': order['student_id']
    }, room=order['student_id'])
    
    return {"message": "Status updated"}

# ============================================
# RATING ENDPOINTS
# ============================================

@api_router.post("/orders/{order_id}/rate")
async def rate_order(order_id: str, payload: dict = Body(...), user: dict = Depends(get_current_user)):
    """Rate an order that is COMPLETED"""
    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order['student_id'] != user['user_id']:
        raise HTTPException(status_code=403, detail="Not authorized to rate this order")
        
    if order['status'] != "COMPLETED":
        raise HTTPException(status_code=400, detail="Only COMPLETED orders can be rated")
        
    if order.get('is_rated'):
        raise HTTPException(status_code=400, detail="Order has already been rated")
        
    # Extract data
    delivery_time_rating = payload.get("delivery_time_rating")
    items_ratings = payload.get("items", []) # List of {item_id, rating}
    
    # 1. Save Rating Document
    new_rating = OrderRating(
        order_id=order_id,
        student_id=user['user_id'],
        canteen_id=order['canteen_id'],
        delivery_time_rating=delivery_time_rating,
        items=[OrderItemRating(**item) for item in items_ratings]
    )
    
    rating_dict = new_rating.model_dump()
    rating_dict['created_at'] = rating_dict['created_at'].isoformat()
    await db.ratings.insert_one(rating_dict)
    
    # 2. Mark order as rated
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"is_rated": True}}
    )
    
    # 3. Update MenuItem average ratings
    for item_rating in items_ratings:
        item_id = item_rating['item_id']
        rating_val = item_rating['rating']
        
        menu_item = await db.menu_items.find_one({"item_id": item_id})
        if menu_item:
            current_avg = menu_item.get('rating_average', 0.0)
            current_count = menu_item.get('rating_count', 0)
            
            # Calculate new average: ((old_avg * old_count) + new_rating) / (old_count + 1)
            new_count = current_count + 1
            new_avg = ((current_avg * current_count) + rating_val) / new_count
            
            await db.menu_items.update_one(
                {"item_id": item_id},
                {"$set": {
                    "rating_average": round(new_avg, 1),
                    "rating_count": new_count
                }}
            )
            
    return {"message": "Rating submitted successfully"}


# ============================================
# AI RECOMMENDATION ENDPOINTS
# ============================================

@api_router.post("/ai/recommendations/collaborative")
async def get_collaborative_recommendations(data: Optional[RecommendationInput] = None, user: dict = Depends(get_current_user)):
    """Get AI collaborative filtering recommendations"""
    
    order_history = []
    
    # If current items provided, prioritize them
    if data and data.current_items:
        for item_name in data.current_items:
            order_history.append({"item_name": item_name})
            
    # Also fetch past history for better context
    orders = await db.orders.find(
        {"student_id": user['user_id']},
        {"_id": 0, "items": 1}
    ).sort("created_at", -1).to_list(20)
    
    for order in orders:
        order_history.extend(order['items'])
    
    # Get all available items
    query = {"available": True}
    if data and data.canteen_id:
        query["canteen_id"] = data.canteen_id
        
    items = await db.menu_items.find(query, {"_id": 0}).to_list(100)
    
    recommendations = await ai_service.get_collaborative_recommendations(order_history, items)
    
    # Filter out items already in current cart/input
    if data and data.current_items:
        recommendations = [r for r in recommendations if r['name'] not in data.current_items]
    
    return {"recommendations": recommendations}

class SymptomInput(BaseModel):
    symptom: str
    canteen_id: Optional[str] = None
    history: List[dict] = [] # List of previous messages {"role": "user"|"assistant", "content": "..."}

@api_router.post("/ai/recommendations/symptom")
async def get_symptom_recommendations(symptom_input: SymptomInput):
    """Get meal recommendations based on symptoms"""
    # Get available items from canteen
    query = {"available": True}
    if symptom_input.canteen_id:
        query["canteen_id"] = symptom_input.canteen_id
    
    items = await db.menu_items.find(query, {"_id": 0}).to_list(100)
    
    result = await ai_service.get_symptom_recommendations(symptom_input.symptom, items)
    
    return result

@api_router.post("/ai/diet-plan")
async def generate_diet_plan(gym_input: GymGoalInput, user: dict = Depends(get_current_user)):
    """Generate weekly diet plan for gym goals"""
    # Get all available items
    items = await db.menu_items.find({"available": True}, {"_id": 0}).to_list(100)
    
    plan = await ai_service.generate_weekly_diet_plan(
        gym_input.goal,
        gym_input.current_weight or 70,
        gym_input.target_weight or 65,
        items,
        protein_goal=gym_input.protein_goal
    )
    
    return plan

# ============================================
# SPENDING ANALYTICS ENDPOINTS
# ============================================

async def update_spending_analytics(student_id: str, amount: float):
    """Update spending analytics for student"""
    now = datetime.now(timezone.utc)
    
    analytics = await db.spending_analytics.find_one({"student_id": student_id}, {"_id": 0})
    
    if not analytics:
        analytics = SpendingAnalytics(student_id=student_id)
        analytics_dict = analytics.model_dump()
        analytics_dict['last_updated'] = analytics_dict['last_updated'].isoformat()
        await db.spending_analytics.insert_one(analytics_dict)
    
    # Update totals
    await db.spending_analytics.update_one(
        {"student_id": student_id},
        {
            "$inc": {
                "daily_total": amount,
                "weekly_total": amount,
                "monthly_total": amount
            },
            "$set": {"last_updated": now.isoformat()}
        }
    )

@api_router.get("/spending/analytics")
async def get_spending_analytics(user: dict = Depends(get_current_user)):
    """Get spending analytics for current user dynamically calculated from bills"""
    from datetime import datetime, timezone, timedelta
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = today_start.replace(day=1)
    
    # Get all bills for the user
    bills = await db.bills.find({"student_id": user['user_id']}).to_list(10000)
    
    daily_total = 0.0
    weekly_total = 0.0
    monthly_total = 0.0
    
    for bill in bills:
        try:
            # Parse timestamp and explicitly make it UTC-aware
            bill_time_str = bill['timestamp']
            
            # Fast fix for JS `.toISOString()` format ending in 'Z'
            if bill_time_str.endswith('Z'):
                bill_time_str = bill_time_str[:-1] + '+00:00'
                
            bill_date = datetime.fromisoformat(bill_time_str)
            
            # If still naive (some legacy data), force it to UTC
            if bill_date.tzinfo is None:
                bill_date = bill_date.replace(tzinfo=timezone.utc)
            
            amount = float(bill.get('amount', 0))
            
            if bill_date >= today_start:
                daily_total += amount
            if bill_date >= week_start:
                weekly_total += amount
            if bill_date >= month_start:
                monthly_total += amount
        except Exception as e:
            logging.error(f"Error parsing bill date for analytics: {e}")
            continue

    return {
        "student_id": user['user_id'],
        "daily_total": daily_total,
        "weekly_total": weekly_total,
        "monthly_total": monthly_total,
        "last_updated": now.isoformat()
    }

@api_router.get("/spending/bills")
async def get_all_bills(user: dict = Depends(get_current_user)):
    """Get all bills for current user"""
    bills = await db.bills.find(
        {"student_id": user['user_id']},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    return bills


@api_router.get("/spending/category-breakdown")
async def get_category_breakdown(user: dict = Depends(get_current_user)):
    """Break down spending into Meals, Beverages, and Snacks from completed orders"""
    orders = await db.orders.find(
        {"student_id": user['user_id'], "status": "COMPLETED"},
        {"_id": 0, "items": 1}
    ).to_list(10000)

    totals = {"Meals": 0.0, "Beverages": 0.0, "Snacks": 0.0}

    beverage_kw = ["tea", "coffee", "juice", "lime", "lassi", "milk", "water", "soda",
                   "drink", "shake", "smoothie", "lemonade", "buttermilk", "chai",
                   "cola", "sherbet", "cooler", "squash", "filter"]
    snack_kw    = ["cutlet", "samosa", "vada", "pakora", "sandwich", "roll", "wrap",
                   "fries", "chips", "momos", "puff", "bun", "toast", "bread",
                   "popcorn", "nachos", "cake", "brownie", "pastry", "donut", "cookie",
                   "ice cream", "gulab", "halwa", "kheer", "pudding", "sweet", "ladoo",
                   "barfi", "jalebi", "snack", "dessert"]

    for order in orders:
        for item in order.get("items", []):
            name  = (item.get("item_name") or "").lower()
            price = float(item.get("price_at_order", 0)) * int(item.get("quantity", 1))
            cat   = (item.get("category") or "").lower()

            if "beverage" in cat or "drink" in cat or any(k in name for k in beverage_kw):
                totals["Beverages"] += price
            elif "snack" in cat or "dessert" in cat or any(k in name for k in snack_kw):
                totals["Snacks"] += price
            else:
                totals["Meals"] += price

    return [{"category": k, "amount": round(v, 2)} for k, v in totals.items()]


@api_router.get("/spending/flavor-profile")
async def get_flavor_profile(user: dict = Depends(get_current_user)):
    """Return flavor profile percentages (Spicy/Sweet/Savory/Sour/Rich) from ordered items"""
    orders = await db.orders.find(
        {"student_id": user['user_id'], "status": "COMPLETED"},
        {"_id": 0, "items": 1}
    ).to_list(10000)

    flavor_counts = {"Spicy": 0, "Sweet": 0, "Savory": 0, "Sour": 0, "Rich": 0}
    kw_map = {
        "Spicy":  ["spicy", "chilli", "chili", "pepper", "masala", "tikka", "tandoori", "hot", "schezwan", "peri"],
        "Sweet":  ["sweet", "cake", "dessert", "ice cream", "chocolate", "gulab", "halwa", "kheer",
                   "jalebi", "brownie", "pastry", "donut", "cookie", "honey", "mango", "sugar"],
        "Savory": ["biryani", "pulao", "rice", "naan", "roti", "curry", "dal", "paneer",
                   "chicken", "mutton", "fish", "egg", "fried", "gravy", "sabzi", "sambar", "dosa"],
        "Sour":   ["lime", "lemon", "tamarind", "curd", "yogurt", "lassi", "pickle",
                   "raita", "buttermilk", "sour", "tomato"],
        "Rich":   ["cream", "ghee", "cheese", "malai", "cashew", "almond",
                   "special", "premium", "rich", "butter"],
    }

    for order in orders:
        for item in order.get("items", []):
            name = (item.get("item_name") or "").lower()
            qty  = int(item.get("quantity", 1))
            scores = {f: sum(1 for k in kws if k in name) for f, kws in kw_map.items()}
            best_flavor = max(scores, key=scores.get)
            if scores[best_flavor] == 0:
                best_flavor = "Savory"
            flavor_counts[best_flavor] += qty

    total = max(sum(flavor_counts.values()), 1)
    return [
        {"subject": k, "value": round((v / total) * 100, 1)}
        for k, v in flavor_counts.items()
    ]


# ============================================
# MANAGEMENT ANALYTICS ENDPOINTS
# ============================================

@api_router.get("/management/analytics/revenue")
async def get_revenue_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    canteen_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get revenue analytics (Management only)"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    query = {"status": "COMPLETED"}
    if canteen_id:
        query["canteen_id"] = canteen_id
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)
    
    total_revenue = sum(order['total_amount'] for order in orders)
    total_orders = len(orders)
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
    
    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "average_order_value": avg_order_value
    }

@api_router.get("/management/analytics/top-items")
async def get_top_items(canteen_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get top selling items"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    query = {"status": "COMPLETED"}
    if canteen_id:
        query["canteen_id"] = canteen_id
    
    orders = await db.orders.find(query, {"_id": 0, "items": 1}).to_list(10000)
    
    item_sales = {}
    for order in orders:
        for item in order['items']:
            item_id = item['item_id']
            if item_id not in item_sales:
                item_sales[item_id] = {
                    "item_name": item['item_name'],
                    "quantity": 0,
                    "revenue": 0
                }
            item_sales[item_id]["quantity"] += item['quantity']
            item_sales[item_id]["revenue"] += item['quantity'] * item['price_at_order']
    
    top_items = sorted(item_sales.items(), key=lambda x: x[1]['revenue'], reverse=True)[:10]
    
    return [{" item_id": k, **v} for k, v in top_items]

# ============================================
# CREW ENDPOINTS
# ============================================

class CrewAIQuery(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None

@api_router.post("/crew/ai-helper")
async def crew_ai_helper(data: CrewAIQuery, user: dict = Depends(get_current_user)):
    """AI assistant for crew operational guidance"""
    if user['role'] not in ['crew', 'management']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    response = await ai_service.get_crew_assistance(data.query, data.context)
    return response

@api_router.get("/orders/{order_id}/verify-token")
async def verify_order_token(order_id: str, user: dict = Depends(get_current_user)):
    """Verify order token for crew"""
    if user['role'] not in ['crew', 'management']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if crew belongs to this canteen
    if user['role'] == 'crew' and user.get('canteen_id') != order['canteen_id']:
        raise HTTPException(status_code=403, detail="Unauthorized for this canteen")
    
    return {
        "verified": True,
        "order_id": order['order_id'],
        "token_number": order['token_number'],
        "items": order['items'],
        "total_amount": order['total_amount'],
        "status": order['status'],
        "created_at": order['created_at']
    }

@api_router.get("/orders/alerts/{canteen_id}")
async def get_order_alerts(canteen_id: str, user: dict = Depends(get_current_user)):
    """Get priority/delayed orders for crew"""
    if user['role'] not in ['crew', 'management']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Check if crew belongs to this canteen
    if user['role'] == 'crew' and user.get('canteen_id') != canteen_id:
        raise HTTPException(status_code=403, detail="Unauthorized for this canteen")
    
    # Get orders older than 15 minutes that are still preparing
    from datetime import datetime, timezone, timedelta
    threshold = datetime.now(timezone.utc) - timedelta(minutes=15)
    
    orders = await db.orders.find({
        "canteen_id": canteen_id,
        "status": {"$in": ["PREPARING", "READY"]}
    }, {"_id": 0}).to_list(100)
    
    priority_orders = []
    for order in orders:
        created_at = datetime.fromisoformat(order['created_at'].replace('Z', '+00:00'))
        if created_at < threshold:
            priority_orders.append({
                **order,
                "delay_minutes": int((datetime.now(timezone.utc) - created_at).total_seconds() / 60)
            })
    
    return {
        "priority_orders": priority_orders,
        "count": len(priority_orders)
    }

# ============================================
# ENHANCED MANAGEMENT ANALYTICS ENDPOINTS
# ============================================

@api_router.get("/management/analytics/peak-hours")
async def get_peak_hours_analytics(
    canteen_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get peak hours analysis"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    query = {"status": "COMPLETED"}
    if canteen_id:
        query["canteen_id"] = canteen_id
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)
    peak_data = await ai_service.predict_peak_hours(orders)
    
    return peak_data

@api_router.get("/management/analytics/combos")
async def get_frequent_combos(
    canteen_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get frequent item combinations (AI-driven)"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    query = {"status": "COMPLETED"}
    if canteen_id:
        query["canteen_id"] = canteen_id
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)
    combos = await ai_service.analyze_order_combos(orders)
    
    return {"combos": combos}

@api_router.get("/management/analytics/daily-summary")
async def get_daily_summary(
    canteen_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get today's summary"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    from datetime import datetime, timezone
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    query = {
        "status": "COMPLETED",
        "created_at": {"$gte": today_start.isoformat()}
    }
    if canteen_id:
        query["canteen_id"] = canteen_id
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)
    
    total_orders = len(orders)
    total_revenue = sum(order['total_amount'] for order in orders)
    
    # Find peak time
    peak_data = await ai_service.predict_peak_hours(orders)
    
    # Find most ordered item
    item_counts = {}
    for order in orders:
        for item in order['items']:
            name = item['item_name']
            item_counts[name] = item_counts.get(name, 0) + item['quantity']
    
    most_ordered = max(item_counts.items(), key=lambda x: x[1])[0] if item_counts else "N/A"
    
    return {
        "total_orders": total_orders,
        "revenue": total_revenue,
        "peak_time": peak_data.get('busiest_hour', 'N/A'),
        "most_ordered_item": most_ordered
    }

@api_router.post("/management/ai-insights")
async def get_ai_insights(user: dict = Depends(get_current_user)):
    """Get AI-driven business insights"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Gather analytics data
    query = {"status": "COMPLETED"}
    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)
    
    total_revenue = sum(order['total_amount'] for order in orders)
    total_orders = len(orders)
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
    
    # Get top items
    item_sales = {}
    for order in orders:
        for item in order['items']:
            item_id = item['item_id']
            if item_id not in item_sales:
                item_sales[item_id] = {
                    "item_name": item['item_name'],
                    "quantity": 0,
                    "revenue": 0
                }
            item_sales[item_id]["quantity"] += item['quantity']
            item_sales[item_id]["revenue"] += item['quantity'] * item['price_at_order']
    
    top_items = sorted(item_sales.items(), key=lambda x: x[1]['revenue'], reverse=True)[:5]
    top_items_list = [{"item_name": v['item_name'], "quantity": v['quantity'], "revenue": v['revenue']} for k, v in top_items]
    
    # Get peak hours
    peak_data = await ai_service.predict_peak_hours(orders)
    
    analytics_data = {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "average_order_value": avg_order_value,
        "top_items": top_items_list,
        "peak_hours": peak_data.get('peak_hours', {})
    }
    
    insights = await ai_service.generate_management_insights(analytics_data)
    return insights

@api_router.get("/management/analytics/trends")
async def get_analytics_trends(
    days: int = 7,
    canteen_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get historical trends"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    from datetime import datetime, timezone, timedelta
    from collections import defaultdict
    
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    query = {
        "status": "COMPLETED",
        "created_at": {"$gte": start_date.isoformat()}
    }
    if canteen_id:
        query["canteen_id"] = canteen_id
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)
    
    # Group by date
    daily_stats = defaultdict(lambda: {"orders": 0, "revenue": 0})
    
    for order in orders:
        created_at = datetime.fromisoformat(order['created_at'].replace('Z', '+00:00'))
        date_key = created_at.strftime('%Y-%m-%d')
        daily_stats[date_key]["orders"] += 1
        daily_stats[date_key]["revenue"] += order['total_amount']
    
    # Format for chart
    trends = []
    for date_key in sorted(daily_stats.keys()):
        trends.append({
            "date": date_key,
            "orders": daily_stats[date_key]["orders"],
            "revenue": daily_stats[date_key]["revenue"]
        })
    
    return {"trends": trends}


# Include the router in the main app
app.include_router(api_router)

# Socket.IO events
@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def join_room(sid, data):
    room = data.get('room')
    await sio.enter_room(sid, room)
    logger.info(f"Client {sid} joined room {room}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=8001)

# ============================================
# FITNESS: 0/1 KNAPSACK PROTEIN PLANNER
# ============================================

class ProteinKnapsackInput(BaseModel):
    proteinGoal: float
    excludedItems: Optional[List[str]] = []

@api_router.post("/crew/chat")
async def crew_ai_chat(message_data: dict = Body(...)):
    message = message_data.get('message', '')
    canteen_id = message_data.get('canteen_id', '')
    
    if not message:
        raise HTTPException(status_code=400, detail="Message required")
        
    response = await ai_service.get_crew_assistance(message, {"canteen_id": canteen_id})
    return response

@api_router.post("/recommendations/protein-knapsack")
async def protein_knapsack(data: ProteinKnapsackInput):
    """
    Gym Freak Mode: Uses 0/1 Knapsack to find best protein combo.
    Goal: Maximize protein <= proteinGoal.
    """
    target = int(data.proteinGoal)
    excluded = set(data.excludedItems) if data.excludedItems else set()
    
    # 1. Fetch all available menu items
    cursor = db.menu_items.find({"available": True})
    items_db = await cursor.to_list(length=1000)
    
    # 2. Filter valid items and prepare for Knapsack
    # We convert protein to integer (grams) for the algorithm
    items = []
    for i in items_db:
        # Skip excluded items
        if i['item_id'] in excluded:
            continue
            
        try:
            p = int(round(i['nutrition']['protein']))
            if p > 0:
                items.append({
                    "name": i['name'],
                    "protein": p,
                    "id": i['item_id'],
                    "canteen_id": i['canteen_id'],
                    "price": i['price'],
                    "image_url": i['image_url']
                })
        except (KeyError, TypeError):
            continue
            
    n = len(items)
    # limit target to avoid memory explosion if user enters huge number
    target = min(target, 2000) # Cap at 2000g protein to be safe
    
    # 3. 0/1 Knapsack Algorithm
    # dp[w] = max protein value achievable with capacity w
    # since value = weight (protein), dp[w] will track *if* protein w is possible?
    # Actually, we want to maximize sum(protein) <= Target.
    # Since weight matches value, we can just use a 1D DP array where dp[w] stores the actual max protein <= w.
    # But strictly, if weight=value, then dp[w] = w if achievable.
    # We need to reconstruct the solution, so we need a 2D table or keep track of items.
    
    # Let's use 2D table K[i][w] to be safe and standard for reconstruction
    # K[i][w] = max protein using first i items with limit w
    
    K = [[0 for w in range(target + 1)] for i in range(n + 1)]
    
    for i in range(n + 1):
        for w in range(target + 1):
            if i == 0 or w == 0:
                K[i][w] = 0
            elif items[i-1]['protein'] <= w:
                val = items[i-1]['protein']
                # Maximize protein
                K[i][w] = max(val + K[i-1][w-val], K[i-1][w])
            else:
                K[i][w] = K[i-1][w]
                
    result_protein = K[n][target]
    
    # 4. Traceback to find selected items
    selected_items = []
    w = target
    for i in range(n, 0, -1):
        if result_protein <= 0:
            break
        if result_protein == K[i-1][w]:
            continue
        else:
            # Item was included
            item = items[i-1]
            selected_items.append(item)
            result_protein -= item['protein']
            w -= item['protein']
            
    # Calculate totals
    total_protein = sum(item['protein'] for item in selected_items)
    
    status = "Exact Match" if total_protein == target else "Nearest Possible"
    
    return {
        "selectedItems": [item['name'] for item in selected_items], # Just names as per prompt sample
        "selectedItemsDetails": selected_items, # Full details for UI
        "totalProtein": total_protein,
        "status": status,
        "target": target
    }

@api_router.get("/orders/pending/{canteen_id}")
async def get_pending_orders(canteen_id: str, user: dict = Depends(get_current_user)):
    """Get pending orders for crew dashboard"""
    if user['role'] not in ['crew', 'management']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Verify crew belongs to this canteen
    if user['role'] == 'crew' and user.get('canteen_id') and user['canteen_id'] != canteen_id:
         raise HTTPException(status_code=403, detail="Unauthorized for this canteen")

    # Fetch orders with status PREPARING or READY
    orders = await db.orders.find({
        "canteen_id": canteen_id,
        "status": {"$in": ["PREPARING", "READY"]}
    }, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return orders

@api_router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, status_update: OrderStatusUpdate, user: dict = Depends(get_current_user)):
    """Update order status"""
    if user['role'] not in ['crew', 'management']:
        raise HTTPException(status_code=403, detail="Unauthorized")

    result = await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": status_update.status, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Emit socket event for real-time updates
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if order:
        # Emit to specific canteen room or general update
        await sio.emit("order_update", {
             "order_id": order_id,
             "status": status_update.status,
             "canteen_id": order['canteen_id'],
             "token_number": order['token_number']
        })
        
    return {"message": "Status updated successfully"}

@api_router.post("/crew/chat")
async def crew_chat_endpoint(chat_data: dict, user: dict = Depends(get_current_user)):
    """AI Assistant Chat Endpoint for Crew"""
    if user['role'] != 'crew':
        raise HTTPException(status_code=403, detail="Unauthorized")

    message = chat_data.get('message', '')
    canteen_id = chat_data.get('canteen_id') or user.get('canteen_id')
    
    # 1. Get Intent & Action from AI Service (Rule-based NLP)
    ai_result = await ai_service.get_crew_assistance(message)
    action = ai_result.get('action')
    
    # 2. Execute Action (Database Query) if needed
    final_response = ai_result['response']
    
    if action == "show_orders":
        # Fetch actual pending orders count/details
        pending_orders = await db.orders.find({
            "canteen_id": canteen_id,
            "status": {"$in": ["REQUESTED", "PREPARING"]}
        }).to_list(5)
        
        if pending_orders:
            order_list = "\n".join([
                f"• #{o['token_number']} ({len(o['items'])} items) - {o['status']}" 
                for o in pending_orders
            ])
            final_response = f"You have {len(pending_orders)} pending orders:\n{order_list}\n\nCheck dashboard for full list."
        else:
            final_response = "You have no pending orders right now! Great job keeping up! 🎉"
            
    elif action == "verify_token":
        token = ai_result.get('entity')
        # Check DB
        order = await db.orders.find_one({"token_number": token})
        if order:
            items_desc = ", ".join([f"{i['name']} x{i['quantity']}" for i in order['items']])
            status_icon = "✅" if order['status'] == 'READY' else "⚠️"
            final_response = f"{status_icon} **Token {token} Verified**\n\nItems: {items_desc}\nStatus: **{order['status']}**\n\nAction: Hand over items and mark COMPLETED."
        else:
            final_response = f"❌ **Token {token} NOT Found**\nPlease check the number and try again."
            
    elif action == "show_priority":
        # Check for delayed orders
        fifteen_mins_ago = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
        delayed_count = await db.orders.count_documents({
            "canteen_id": canteen_id,
            "status": {"$in": ["REQUESTED", "PREPARING"]},
            "created_at": {"$lt": fifteen_mins_ago}
        })
        
        if delayed_count > 0:
            final_response = f"⚠️ Alert: You have **{delayed_count} delayed orders** (older than 15 mins).\nPlease prioritize them immediately!"
        else:
            final_response = "✅ No priority alerts. All orders are within time limits."

    return {
        "response": final_response,
        "action": action,
        "entity": ai_result.get('entity')
    }

# ============================================
# APRIORI FOOD RECOMMENDATION ENDPOINT
# ============================================

@api_router.post("/recommendations/apriori")
async def apriori_food_recommendations(
    input_data: RecommendationInput,
    user: dict = Depends(get_current_user)
):
    """
    Returns Apriori-based food recommendations based on the student's current cart items.

    Request body (RecommendationInput):
      - current_items: list of item names currently in the cart
      - canteen_id: (optional) restrict recommendations to this canteen

    Response:
      - recommendations: list of {item_name, confidence, support, lift}
      - algorithm: "apriori"
      - orders_analysed: number of COMPLETED orders used for training
    """
    try:
        # Fetch completed orders (optionally filtered by canteen)
        match_filter = {"status": "COMPLETED"}
        if input_data.canteen_id:
            match_filter["canteen_id"] = input_data.canteen_id

        all_orders = await db.orders.find(match_filter, {"_id": 0, "items": 1}).to_list(length=2000)

        # Build transaction list — list[list[str]] of item names per order
        transactions = []
        for order in all_orders:
            names = [item.get("item_name") or item.get("name") for item in order.get("items", [])]
            names = [n for n in names if n]
            if names:
                transactions.append(names)

        recommendations = get_apriori_recommendations(
            orders=transactions,
            current_items=input_data.current_items,
            min_support=0.03,
            min_confidence=0.25,
            top_n=5,
        )

        return {
            "recommendations": recommendations,
            "algorithm": "apriori",
            "orders_analysed": len(transactions),
            "cart_items": input_data.current_items,
        }
    except Exception as e:
        logging.error(f"Apriori recommendation error: {e}")
        return {"recommendations": [], "algorithm": "apriori", "orders_analysed": 0}



# Include the router
app.include_router(api_router)



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:socket_app", host="0.0.0.0", port=8001, reload=True)
    # trigger reload
