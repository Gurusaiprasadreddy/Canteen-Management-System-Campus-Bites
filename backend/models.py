from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

# User Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    roll_number: Optional[str] = None
    email: Optional[EmailStr] = None
    password_hash: Optional[str] = None
    name: str
    role: str  # "student", "crew", "management"
    canteen_id: Optional[str] = None  # For crew members
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class StudentRegister(BaseModel):
    roll_number: str
    password: str
    name: str
    email: Optional[EmailStr] = None

class StudentLogin(BaseModel):
    roll_number: str
    password: str

class CrewLogin(BaseModel):
    email: EmailStr
    password: str

class ManagementLogin(BaseModel):
    email: EmailStr
    password: str

# Session Model
class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_token: str = Field(default_factory=lambda: f"session_{uuid.uuid4().hex}")
    user_id: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Canteen Model
class Canteen(BaseModel):
    model_config = ConfigDict(extra="ignore")
    canteen_id: str
    name: str
    description: str
    operating_hours: str
    image_url: str

# Menu Item Models
class Nutrition(BaseModel):
    calories: int
    carbs: float
    protein: float
    fat: float
    fiber: float
    vitamins: str
    sodium: float

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_id: str = Field(default_factory=lambda: f"item_{uuid.uuid4().hex[:12]}")
    name: str
    canteen_id: str
    price: float
    nutrition: Nutrition
    ingredients: str
    allergens: str
    stock_qty: int
    category: str
    image_url: str
    veg_type: str  # "veg", "non-veg"
    prep_time: int  # in minutes
    available: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MenuItemCreate(BaseModel):
    name: str
    canteen_id: str
    price: float
    nutrition: Nutrition
    ingredients: str
    allergens: str
    stock_qty: int
    category: str
    image_url: str
    veg_type: str
    prep_time: int

class MenuItemUpdate(BaseModel):
    price: Optional[float] = None
    stock_qty: Optional[int] = None
    available: Optional[bool] = None

# Order Models
class OrderItem(BaseModel):
    item_id: str
    item_name: str
    quantity: int
    price_at_order: float

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    order_id: str = Field(default_factory=lambda: f"order_{uuid.uuid4().hex[:12]}")
    student_id: str
    items: List[OrderItem]
    canteen_id: str
    token_number: int
    status: str  # "PENDING_PAYMENT", "PREPARING", "READY", "COMPLETED", "CANCELLED"
    payment_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    total_amount: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime

class OrderCreate(BaseModel):
    items: List[OrderItem]
    canteen_id: str
    total_amount: float

class OrderBatchDelete(BaseModel):
    order_ids: List[str]

class OrderStatusUpdate(BaseModel):
    status: str

class PaymentVerification(BaseModel):
    payment_id: str
    signature: str

# AI Recommendation Models
class AIRecommendation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    recommendation_id: str = Field(default_factory=lambda: f"rec_{uuid.uuid4().hex[:12]}")
    student_id: str
    recommendation_type: str  # "collaborative", "symptom", "gym"
    recommendations: List[Dict[str, Any]]
    input_data: Optional[Dict[str, Any]] = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)

class SymptomInput(BaseModel):
    symptom: str  # "stress", "headache", "fever", "cold", "tired"
    canteen_id: Optional[str] = None

class GymGoalInput(BaseModel):
    goal: str  # "weight_loss", "muscle_gain", "maintenance"
    current_weight: Optional[float] = None
    target_weight: Optional[float] = None
    protein_goal: Optional[float] = None
    dietary_preference: Optional[str] = None
    
class RecommendationInput(BaseModel):
    current_items: List[str] = [] # List of item names
    canteen_id: Optional[str] = None

# Spending Analytics Model
class SpendingAnalytics(BaseModel):
    model_config = ConfigDict(extra="ignore")
    student_id: str
    daily_total: float = 0.0
    weekly_total: float = 0.0
    monthly_total: float = 0.0
    last_updated: datetime = Field(default_factory=datetime.utcnow)

# Bill Model
class Bill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    bill_id: str = Field(default_factory=lambda: f"bill_{uuid.uuid4().hex[:12]}")
    student_id: str
    order_id: str
    amount: float
    items: List[OrderItem]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
