from fastapi import FastAPI, APIRouter, HTTPException, Depends, Cookie, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import razorpay
import socketio
import uuid

# Import local modules
from models import *
from auth_utils import hash_password, verify_password, create_jwt_token, get_current_user, generate_token_number
from ai_service import ai_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
# ORDER ENDPOINTS
# ============================================

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
async def verify_payment(order_id: str, payment_id: str, signature: str, user: dict = Depends(get_current_user)):
    """Verify Razorpay payment"""
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verify signature
    try:
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': order['razorpay_order_id'],
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        })
    except:
        raise HTTPException(status_code=400, detail="Payment verification failed")
    
    # Update order status
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "status": "PREPARING",
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
        'status': 'PREPARING',
        'canteen_id': order['canteen_id']
    }, room=order['canteen_id'])
    
    return {"message": "Payment verified", "status": "PREPARING"}

@api_router.get("/orders/my")
async def get_my_orders(user: dict = Depends(get_current_user)):
    """Get current user's orders"""
    orders = await db.orders.find(
        {"student_id": user['user_id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/orders/pending/{canteen_id}")
async def get_pending_orders(canteen_id: str, user: dict = Depends(get_current_user)):
    """Get pending orders for crew"""
    if user['role'] not in ['crew', 'management']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    orders = await db.orders.find(
        {"canteen_id": canteen_id, "status": {"$in": ["PREPARING", "READY"]}},
        {"_id": 0}
    ).to_list(100)
    return orders

@api_router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, status_update: OrderStatusUpdate, user: dict = Depends(get_current_user)):
    """Update order status (Crew/Management)"""
    if user['role'] not in ['crew', 'management']:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
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

@api_router.get("/ai/recommendations/collaborative")
async def get_collaborative_recommendations(user: dict = Depends(get_current_user)):
    """Get AI collaborative filtering recommendations"""
    # Get user's order history
    orders = await db.orders.find(
        {"student_id": user['user_id'], "status": "COMPLETED"},
        {"_id": 0, "items": 1}
    ).to_list(50)
    
    order_history = []
    for order in orders:
        order_history.extend(order['items'])
    
    # Get all available items
    items = await db.menu_items.find({"available": True}, {"_id": 0}).to_list(100)
    
    recommendations = await ai_service.get_collaborative_recommendations(order_history, items)
    
    return {"recommendations": recommendations}

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
        items
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
    
    return [{"item_id": k, **v} for k, v in top_items]

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
