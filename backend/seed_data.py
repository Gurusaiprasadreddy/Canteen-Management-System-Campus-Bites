import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime
from auth_utils import hash_password

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def seed_database():
    print("🌱 Seeding database...")
    
    # Clear existing data
    await db.canteens.delete_many({})
    await db.menu_items.delete_many({})
    await db.users.delete_many({"role": "management"})
    
    # Seed Canteens
    canteens = [
        {
            "canteen_id": "sopanam",
            "name": "Sopanam Canteen",
            "description": "South Indian breakfast & snacks specialist",
            "operating_hours": "7:00 AM - 10:00 PM",
            "image_url": "https://images.unsplash.com/photo-1663086195364-fd8eca0f2c78"
        },
        {
            "canteen_id": "mba",
            "name": "MBA Canteen",
            "description": "North Indian meals & premium dining",
            "operating_hours": "8:00 AM - 9:00 PM",
            "image_url": "https://images.unsplash.com/photo-1516709315038-c53bf87e8f48"
        },
        {
            "canteen_id": "samudra",
            "name": "Samudra Canteen",
            "description": "Traditional meals & health options",
            "operating_hours": "7:30 AM - 9:30 PM",
            "image_url": "https://images.unsplash.com/photo-1613478223719-2ab802602423"
        }
    ]
    await db.canteens.insert_many(canteens)
    print("✅ Canteens seeded")
    
    # Seed Menu Items - Sopanam (South Indian)
    sopanam_items = [
        {
            "item_id": "item_sopanam_001",
            "name": "Idli (2 pcs)",
            "canteen_id": "sopanam",
            "price": 20.0,
            "nutrition": {
                "calories": 58,
                "carbs": 12.0,
                "protein": 2.0,
                "fat": 0.5,
                "fiber": 1.0,
                "vitamins": "B1, B2, B3",
                "sodium": 10.0
            },
            "ingredients": "Fermented rice and urad dal batter, steamed",
            "allergens": "None",
            "stock_qty": 100,
            "category": "Breakfast",
            "image_url": "https://images.unsplash.com/photo-1630383249896-424e482df921",
            "veg_type": "veg",
            "prep_time": 5,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_sopanam_002",
            "name": "Masala Dosa",
            "canteen_id": "sopanam",
            "price": 45.0,
            "nutrition": {
                "calories": 220,
                "carbs": 38.0,
                "protein": 6.0,
                "fat": 5.0,
                "fiber": 3.0,
                "vitamins": "B6, C, E",
                "sodium": 280.0
            },
            "ingredients": "Rice-lentil crepe with spiced potato filling",
            "allergens": "None",
            "stock_qty": 80,
            "category": "Breakfast",
            "image_url": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976",
            "veg_type": "veg",
            "prep_time": 10,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_sopanam_003",
            "name": "Vada (2 pcs)",
            "canteen_id": "sopanam",
            "price": 25.0,
            "nutrition": {
                "calories": 160,
                "carbs": 18.0,
                "protein": 5.0,
                "fat": 8.0,
                "fiber": 2.0,
                "vitamins": "B9, K",
                "sodium": 220.0
            },
            "ingredients": "Fried urad dal fritters with spices",
            "allergens": "Deep fried",
            "stock_qty": 90,
            "category": "Snacks",
            "image_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950",
            "veg_type": "veg",
            "prep_time": 8,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_sopanam_004",
            "name": "Pongal",
            "canteen_id": "sopanam",
            "price": 35.0,
            "nutrition": {
                "calories": 280,
                "carbs": 42.0,
                "protein": 8.0,
                "fat": 9.0,
                "fiber": 3.5,
                "vitamins": "B1, B3, E",
                "sodium": 320.0
            },
            "ingredients": "Rice and moong dal cooked with ghee, pepper, cumin",
            "allergens": "Dairy",
            "stock_qty": 60,
            "category": "Breakfast",
            "image_url": "https://images.unsplash.com/photo-1606491956689-2ea866880c84",
            "veg_type": "veg",
            "prep_time": 12,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_sopanam_005",
            "name": "Filter Coffee",
            "canteen_id": "sopanam",
            "price": 15.0,
            "nutrition": {
                "calories": 45,
                "carbs": 6.0,
                "protein": 2.0,
                "fat": 2.0,
                "fiber": 0.0,
                "vitamins": "B2",
                "sodium": 25.0
            },
            "ingredients": "Decoction coffee with hot milk and sugar",
            "allergens": "Dairy",
            "stock_qty": 150,
            "category": "Beverages",
            "image_url": "https://images.unsplash.com/photo-1509042239860-f550ce710b93",
            "veg_type": "veg",
            "prep_time": 3,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_sopanam_006",
            "name": "Upma",
            "canteen_id": "sopanam",
            "price": 30.0,
            "nutrition": {
                "calories": 250,
                "carbs": 45.0,
                "protein": 6.0,
                "fat": 6.0,
                "fiber": 4.0,
                "vitamins": "B complex",
                "sodium": 280.0
            },
            "ingredients": "Semolina with vegetables, mustard seeds, curry leaves",
            "allergens": "Gluten",
            "stock_qty": 70,
            "category": "Breakfast",
            "image_url": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec",
            "veg_type": "veg",
            "prep_time": 10,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_sopanam_007",
            "name": "Poori Bhaji (3 pcs)",
            "canteen_id": "sopanam",
            "price": 40.0,
            "nutrition": {
                "calories": 320,
                "carbs": 48.0,
                "protein": 8.0,
                "fat": 12.0,
                "fiber": 4.5,
                "vitamins": "A, C, K",
                "sodium": 350.0
            },
            "ingredients": "Deep fried wheat bread with spiced potato curry",
            "allergens": "Gluten, Deep fried",
            "stock_qty": 65,
            "category": "Breakfast",
            "image_url": "https://images.unsplash.com/photo-1606491956689-2ea866880c84",
            "veg_type": "veg",
            "prep_time": 12,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        }
    ]
    await db.menu_items.insert_many(sopanam_items)
    print("✅ Sopanam menu seeded")
    
    # Seed Menu Items - MBA Canteen (North Indian)
    mba_items = [
        {
            "item_id": "item_mba_001",
            "name": "Chicken Biryani",
            "canteen_id": "mba",
            "price": 120.0,
            "nutrition": {
                "calories": 650,
                "carbs": 78.0,
                "protein": 35.0,
                "fat": 22.0,
                "fiber": 3.0,
                "vitamins": "B6, B12, D",
                "sodium": 890.0
            },
            "ingredients": "Basmati rice with marinated chicken, spices, herbs",
            "allergens": "Dairy",
            "stock_qty": 50,
            "category": "Main Course",
            "image_url": "https://images.unsplash.com/photo-1563379091339-03b47dad6a23",
            "veg_type": "non-veg",
            "prep_time": 25,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_mba_002",
            "name": "Veg Biryani",
            "canteen_id": "mba",
            "price": 90.0,
            "nutrition": {
                "calories": 480,
                "carbs": 72.0,
                "protein": 12.0,
                "fat": 15.0,
                "fiber": 6.0,
                "vitamins": "A, C, K",
                "sodium": 720.0
            },
            "ingredients": "Basmati rice with mixed vegetables, spices, saffron",
            "allergens": "Dairy, Nuts",
            "stock_qty": 60,
            "category": "Main Course",
            "image_url": "https://images.unsplash.com/photo-1563379091339-03b47dad6a23",
            "veg_type": "veg",
            "prep_time": 20,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_mba_003",
            "name": "Butter Naan (2 pcs)",
            "canteen_id": "mba",
            "price": 40.0,
            "nutrition": {
                "calories": 300,
                "carbs": 50.0,
                "protein": 8.0,
                "fat": 8.0,
                "fiber": 2.0,
                "vitamins": "B1, B3",
                "sodium": 420.0
            },
            "ingredients": "Leavened flatbread brushed with butter",
            "allergens": "Gluten, Dairy",
            "stock_qty": 100,
            "category": "Breads",
            "image_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950",
            "veg_type": "veg",
            "prep_time": 8,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_mba_004",
            "name": "Paneer Butter Masala",
            "canteen_id": "mba",
            "price": 110.0,
            "nutrition": {
                "calories": 420,
                "carbs": 18.0,
                "protein": 22.0,
                "fat": 32.0,
                "fiber": 3.0,
                "vitamins": "A, D, B12",
                "sodium": 680.0
            },
            "ingredients": "Cottage cheese in creamy tomato-butter gravy",
            "allergens": "Dairy",
            "stock_qty": 45,
            "category": "Main Course",
            "image_url": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7",
            "veg_type": "veg",
            "prep_time": 15,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_mba_005",
            "name": "Chicken Tikka (6 pcs)",
            "canteen_id": "mba",
            "price": 150.0,
            "nutrition": {
                "calories": 380,
                "carbs": 8.0,
                "protein": 48.0,
                "fat": 18.0,
                "fiber": 1.0,
                "vitamins": "B6, B12, D",
                "sodium": 820.0
            },
            "ingredients": "Grilled marinated chicken chunks with yogurt and spices",
            "allergens": "Dairy",
            "stock_qty": 40,
            "category": "Starters",
            "image_url": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0",
            "veg_type": "non-veg",
            "prep_time": 20,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_mba_006",
            "name": "Dal Makhani",
            "canteen_id": "mba",
            "price": 80.0,
            "nutrition": {
                "calories": 320,
                "carbs": 35.0,
                "protein": 15.0,
                "fat": 14.0,
                "fiber": 8.0,
                "vitamins": "B9, B1",
                "sodium": 560.0
            },
            "ingredients": "Black lentils cooked with cream, butter, tomatoes",
            "allergens": "Dairy",
            "stock_qty": 55,
            "category": "Main Course",
            "image_url": "https://images.unsplash.com/photo-1546833998-877b37c2e5c6",
            "veg_type": "veg",
            "prep_time": 18,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_mba_007",
            "name": "Mango Lassi",
            "canteen_id": "mba",
            "price": 50.0,
            "nutrition": {
                "calories": 180,
                "carbs": 32.0,
                "protein": 6.0,
                "fat": 4.0,
                "fiber": 1.0,
                "vitamins": "A, C, D",
                "sodium": 85.0
            },
            "ingredients": "Mango pulp blended with yogurt and sugar",
            "allergens": "Dairy",
            "stock_qty": 80,
            "category": "Beverages",
            "image_url": "https://images.unsplash.com/photo-1608039129954-5a6f9e07b761",
            "veg_type": "veg",
            "prep_time": 5,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        }
    ]
    await db.menu_items.insert_many(mba_items)
    print("✅ MBA Canteen menu seeded")
    
    # Seed Menu Items - Samudra (Traditional Meals)
    samudra_items = [
        {
            "item_id": "item_samudra_001",
            "name": "Full Meals (Unlimited)",
            "canteen_id": "samudra",
            "price": 80.0,
            "nutrition": {
                "calories": 800,
                "carbs": 125.0,
                "protein": 22.0,
                "fat": 20.0,
                "fiber": 12.0,
                "vitamins": "A, C, K, B complex",
                "sodium": 950.0
            },
            "ingredients": "Rice, sambar, rasam, vegetables, curd, papad",
            "allergens": "Dairy",
            "stock_qty": 100,
            "category": "Meals",
            "image_url": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec",
            "veg_type": "veg",
            "prep_time": 15,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_samudra_002",
            "name": "Chapati with Dal (4 pcs)",
            "canteen_id": "samudra",
            "price": 60.0,
            "nutrition": {
                "calories": 420,
                "carbs": 68.0,
                "protein": 18.0,
                "fat": 8.0,
                "fiber": 10.0,
                "vitamins": "B1, B9, Iron",
                "sodium": 480.0
            },
            "ingredients": "Whole wheat flatbread with yellow lentil curry",
            "allergens": "Gluten",
            "stock_qty": 85,
            "category": "Meals",
            "image_url": "https://images.unsplash.com/photo-1599043225092-c9c5e6c53c5e",
            "veg_type": "veg",
            "prep_time": 12,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_samudra_003",
            "name": "Curd Rice",
            "canteen_id": "samudra",
            "price": 40.0,
            "nutrition": {
                "calories": 280,
                "carbs": 48.0,
                "protein": 8.0,
                "fat": 6.0,
                "fiber": 1.5,
                "vitamins": "B12, D, Calcium",
                "sodium": 320.0
            },
            "ingredients": "Cooked rice mixed with yogurt, tempered with spices",
            "allergens": "Dairy",
            "stock_qty": 90,
            "category": "Light Meals",
            "image_url": "https://images.unsplash.com/photo-1589621316382-008455b857cd",
            "veg_type": "veg",
            "prep_time": 8,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_samudra_004",
            "name": "Sambar Rice",
            "canteen_id": "samudra",
            "price": 50.0,
            "nutrition": {
                "calories": 350,
                "carbs": 62.0,
                "protein": 12.0,
                "fat": 8.0,
                "fiber": 8.0,
                "vitamins": "A, C, K",
                "sodium": 620.0
            },
            "ingredients": "Rice with lentil-vegetable stew, tamarind, spices",
            "allergens": "None",
            "stock_qty": 75,
            "category": "Meals",
            "image_url": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec",
            "veg_type": "veg",
            "prep_time": 10,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_samudra_005",
            "name": "Buttermilk",
            "canteen_id": "samudra",
            "price": 15.0,
            "nutrition": {
                "calories": 40,
                "carbs": 5.0,
                "protein": 3.0,
                "fat": 1.0,
                "fiber": 0.0,
                "vitamins": "B12, Probiotics",
                "sodium": 180.0
            },
            "ingredients": "Churned yogurt with water, salt, spices",
            "allergens": "Dairy",
            "stock_qty": 120,
            "category": "Beverages",
            "image_url": "https://images.unsplash.com/photo-1608039129954-5a6f9e07b761",
            "veg_type": "veg",
            "prep_time": 3,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_samudra_006",
            "name": "Raita",
            "canteen_id": "samudra",
            "price": 25.0,
            "nutrition": {
                "calories": 60,
                "carbs": 8.0,
                "protein": 4.0,
                "fat": 2.0,
                "fiber": 1.0,
                "vitamins": "D, B12, Calcium",
                "sodium": 180.0
            },
            "ingredients": "Yogurt with cucumber, tomato, spices",
            "allergens": "Dairy",
            "stock_qty": 95,
            "category": "Sides",
            "image_url": "https://images.unsplash.com/photo-1506976785307-8732e854ad03",
            "veg_type": "veg",
            "prep_time": 5,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "item_id": "item_samudra_007",
            "name": "Fruit Salad",
            "canteen_id": "samudra",
            "price": 45.0,
            "nutrition": {
                "calories": 120,
                "carbs": 30.0,
                "protein": 2.0,
                "fat": 0.5,
                "fiber": 5.0,
                "vitamins": "A, C, E, K",
                "sodium": 5.0
            },
            "ingredients": "Fresh seasonal fruits - apple, banana, grapes, papaya",
            "allergens": "None",
            "stock_qty": 70,
            "category": "Healthy Options",
            "image_url": "https://images.unsplash.com/photo-1564093497595-593b96d80180",
            "veg_type": "veg",
            "prep_time": 7,
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        }
    ]
    await db.menu_items.insert_many(samudra_items)
    print("✅ Samudra menu seeded")
    
    # Seed pre-configured management accounts
    management_users = [
        {
            "user_id": "mgmt_superadmin",
            "email": "canteenmanager@amrita.edu",
            "password_hash": hash_password("admin123"),
            "name": "Super Admin",
            "role": "management",
            "canteen_id": None,
            "picture": None,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "user_id": "mgmt_sopanam",
            "email": "sopanam-admin@amrita.edu",
            "password_hash": hash_password("sopanam123"),
            "name": "Sopanam Manager",
            "role": "management",
            "canteen_id": "sopanam",
            "picture": None,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "user_id": "mgmt_mba",
            "email": "mba-admin@amrita.edu",
            "password_hash": hash_password("mba123"),
            "name": "MBA Manager",
            "role": "management",
            "canteen_id": "mba",
            "picture": None,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "user_id": "mgmt_samudra",
            "email": "samudra-admin@amrita.edu",
            "password_hash": hash_password("samudra123"),
            "name": "Samudra Manager",
            "role": "management",
            "canteen_id": "samudra",
            "picture": None,
            "created_at": datetime.utcnow().isoformat()
        }
    ]
    await db.users.insert_many(management_users)
    print("✅ Management accounts seeded")
    
    print("\n🎉 Database seeded successfully!")
    print("\n📋 Management Login Credentials:")
    print("1. Super Admin: canteenmanager@amrita.edu / admin123")
    print("2. Sopanam Manager: sopanam-admin@amrita.edu / sopanam123")
    print("3. MBA Manager: mba-admin@amrita.edu / mba123")
    print("4. Samudra Manager: samudra-admin@amrita.edu / samudra123")

if __name__ == "__main__":
    asyncio.run(seed_database())
