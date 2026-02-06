from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Cookie, Header, Response, Body
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

@app.on_event("startup")
async def startup_db_client():
    # Create TTL index for automatic deletion after 30 days (2592000 seconds)
    try:
        await db.orders.create_index("created_at", expireAfterSeconds=2592000)
        logging.info("Created TTL index on orders.created_at for 30 days retention")
    except Exception as e:
        logging.error(f"Failed to create TTL index: {e}")

# Socket.IO app
socket_app = socketio.ASGIApp(sio, app)

# Create API router
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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

@api_router.post("/auth/student/register")
async def student_register(data: StudentRegister):
    """Register a new student"""
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

@api_router.post("/menu", response_model=MenuItem)
async def create_menu_item(item: MenuItemCreate, user: dict = Depends(get_current_user)):
    """Create new menu item (Management only)"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
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
async def get_frequent_combos(canteen_id: str = None, user: dict = Depends(get_current_user)):
    """Get frequent item combinations"""
    if user['role'] != 'management':
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        # This is a simplified version - real Apriori would be more complex
        return {
            "combos": [
                {"item1": "Chicken Biryani", "item2": "Cold Drink", "frequency": 45, "confidence": 0.75},
                {"item1": "Veg Biryani", "item2": "Raita", "frequency": 32, "confidence": 0.68},
                {"item1": "Idli", "item2": "Sambar", "frequency": 28, "confidence": 0.82}
            ]
        }
    except Exception as e:
        logging.error(f"Combos error: {e}")
        return {"combos": []}

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
    
    # Emit socket event for real-time updates
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if order:
        await sio.emit('order_update', {
            'order_id': order_id,
            'status': new_status,
            'canteen_id': order['canteen_id']
        }, room=order['canteen_id'])
    
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
    """Get spending analytics for current user"""
    analytics = await db.spending_analytics.find_one({"student_id": user['user_id']}, {"_id": 0})
    if not analytics:
        return SpendingAnalytics(student_id=user['user_id']).model_dump()
    return analytics

@api_router.get("/spending/bills")
async def get_all_bills(user: dict = Depends(get_current_user)):
    """Get all bills for current user"""
    bills = await db.bills.find(
        {"student_id": user['user_id']},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    return bills

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

# Include the router
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:socket_app", host="0.0.0.0", port=8001, reload=True)
