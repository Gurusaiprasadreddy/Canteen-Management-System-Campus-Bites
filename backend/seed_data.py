import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime
import uuid
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
            "image_url": "/assets/sopanam.png"
        },
        {
            "canteen_id": "mba",
            "name": "MBA Canteen",
            "description": "North Indian meals & premium dining",
            "operating_hours": "8:00 AM - 9:00 PM",
            "image_url": "/assets/mba.png"
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
    
    # --- IMPROVED GENERATION LOGIC ---
    import random

    # Specific Image Map (Keyword -> Image URL)
    # Using specific Unsplash IDs to ensure relevance
    kw_images = {
        # --- SOUTH INDIAN (Sopanam) ---
        "Idli": "https://images.unsplash.com/photo-1589301760557-01db1b4aff85?w=500&q=80",
        "Masala Dosa": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&q=80",
        "Ghee Roast Dosa": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&q=80",
        "Rava Dosa": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&q=80", 
        "Onion Dosa": "https://images.unsplash.com/photo-1589301760557-01db1b4aff85?w=500&q=80", 
        "Uttapam": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&q=80",
        "Uzhunnu Vada": "https://images.unsplash.com/photo-1626082929543-5bab0f006c42?w=500&q=80",
        "Ven Pongal": "https://images.unsplash.com/photo-1610447385848-df8dbcb93368?w=500&q=80",
        "Rava Upma": "https://images.unsplash.com/photo-1610447384918-620251755a30?w=500&q=80",
        "Poori Bhaji": "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&q=80",
        "Veg Biryani": "https://images.unsplash.com/photo-1563379091339-03b47dad6a23?w=500&q=80",
        "Tomato Rice": "https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=500&q=80",
        "Curd Rice": "https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=500&q=80",
        "Lemon Rice": "https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=500&q=80",
        "Sambar Rice": "https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=500&q=80",
        "Veg Pulao": "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&q=80",
        "Fried Rice": "https://images.unsplash.com/photo-1603133872878-684f208fb74b?w=500&q=80",
        "Chapati Curry": "https://images.unsplash.com/photo-1604579278540-12628618a3e7?w=500&q=80",
        "Veg Meals": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80",
        "Pazham Pori": "https://images.unsplash.com/photo-1629739763784-1cd5f307cdae?w=500&q=80",
        "Mulaku Bajji": "https://images.unsplash.com/photo-1629739763784-1cd5f307cdae?w=500&q=80",
        "Bonda": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80",
        "Samosa": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80",
        "Veg Cutlet": "https://images.unsplash.com/photo-1541529086526-db283c563270?w=500&q=80",
        "Filter Coffee": "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=500&q=80",
        "Masala Tea": "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=500&q=80",
        "Horlicks": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&q=80",
        "Badam Milk": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&q=80",
        "Lime Juice": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80",

        # --- NORTH INDIAN / PREMIUM (MBA) ---
        "Aloo Paratha": "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=500&q=80",
        "Gobhi Paratha": "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=500&q=80",
        "Paneer Paratha": "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=500&q=80",
        "Chole Bhature": "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&q=80",
        "Veg Sandwich": "https://images.unsplash.com/photo-1550505393-259250495393?w=500&q=80", # Specific Veg Sandwich
        "Pancakes": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&q=80",
        "Chicken Biryani": "https://images.unsplash.com/photo-1563379091339-03b47dad6a23?w=500&q=80",
        "Butter Naan": "https://images.unsplash.com/photo-1602882298642-7065991d3dd6?w=500&q=80",
        "Paneer Butter Masala": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&q=80",
        "Chicken Tikka Masala": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&q=80",
        "Dal Makhani": "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&q=80",
        "Chicken Fried Rice": "https://images.unsplash.com/photo-1603133872878-684f208fb74b?w=500&q=80",
        "Schezwan Noodles": "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=500&q=80",
        "Chilli Chicken": "https://images.unsplash.com/photo-1525351473314-192cb91b97b0?w=500&q=80",
        "Kadai Paneer": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&q=80",
        "Chicken Roll": "https://images.unsplash.com/photo-1633504581786-316c8002b1b9?w=500&q=80",
        "Veg Roll": "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&q=80", # Distinct Veg Roll (Spring Roll style)
        "French Fries": "https://images.unsplash.com/photo-1541592106381-b31e9674c96a?w=500&q=80",
        "Chicken Nuggets": "https://images.unsplash.com/photo-1562967914-608f82629710?w=500&q=80",
        "Momos": "https://images.unsplash.com/photo-1626776420079-7a87dd95604a?w=500&q=80",
        "Mango Lassi": "https://images.unsplash.com/photo-1611090123512-32b7ecb87233?w=500&q=80",
        "Sweet Lassi": "https://images.unsplash.com/photo-1611090123512-32b7ecb87233?w=500&q=80",
        "Cold Coffee": "https://images.unsplash.com/photo-1572442388796-11668a67e569?w=500&q=80",
        "Chocolate Shake": "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=500&q=80",
        "Oreo Shake": "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=500&q=80",
        "Coke": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80",

        # --- TRADITIONAL (Samudra) ---
        "Puttu Kadala": "https://images.unsplash.com/photo-1610447385848-df8dbcb93368?w=500&q=80",
        "Appam Stew": "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80",
        "Idiyappam": "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80",
        "Thatte Idli": "https://images.unsplash.com/photo-1589301760557-01db1b4aff85?w=500&q=80",
        "Full Meals": "https://images.unsplash.com/photo-1552611052-33e04de081de?w=500&q=80",
        "Fish Curry Meals": "https://images.unsplash.com/photo-1559847844-5310fd19a03a?w=500&q=80",
        "Chicken Curry": "https://images.unsplash.com/photo-1604579278540-12628618a3e7?w=500&q=80",
        "Beef Fry": "https://images.unsplash.com/photo-1616428741366-888e22851cf2?w=500&q=80",
        "Tapioca & Fish Curry": "https://images.unsplash.com/photo-1604152135912-04a022e23696?w=500&q=80",
        "Chapati Dal": "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&q=80",
        "Ghee Rice": "https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=500&q=80",
        "Fish Cutlet": "https://images.unsplash.com/photo-1541529086526-db283c563270?w=500&q=80",
        "Chicken Cutlet": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80", # Distinct Chicken Cutlet
        "Egg Puffs": "https://images.unsplash.com/photo-1605658846723-b7d54e0817df?w=500&q=80",
        "Meat Puffs": "https://images.unsplash.com/photo-1605658846723-b7d54e0817df?w=500&q=80",
        "Black Tea": "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=500&q=80",
        "Black Coffee": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80",
        "Spiced Buttermilk": "https://images.unsplash.com/photo-1611090123512-32b7ecb87233?w=500&q=80",
        "Fresh Lime Soda": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80",
        "Mint Lime": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80"
    }

    # Fallback pool
    # Fallback pool - High Quality Stable Unsplash IDs
    image_pool = {
        "Breakfast": [
            "https://images.unsplash.com/photo-1553603227-2358fb37d6e1?w=500&q=80", # Idli/Dosa generic
            "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80"  # Vada/Fried
        ],
        "Main Course": [
            "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&q=80", # Biryani
            "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80", # Meals
            "https://images.unsplash.com/photo-1506354666786-959d6d497f1a?w=500&q=80"  # Pizza/General
        ],
        "Snacks": [
            "https://images.unsplash.com/photo-1563185393-5ba15e9a4f61?w=500&q=80", # Puffs/Samosa
            "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80", # Samosa
            "https://images.unsplash.com/photo-1605658846723-b7d54e0817df?w=500&q=80"  # Snacks
        ],
        "Beverages": [
            "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=500&q=80", # Juices
            "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&q=80", # Coffee
            "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80"  # Soda
        ]
    }
    
    # Item generators
    base_items = {
        "sopanam": { # South Indian
            "Breakfast": ["Idli", "Masala Dosa", "Ghee Roast Dosa", "Uzhunnu Vada", "Ven Pongal", "Rava Upma", "Poori Bhaji", "Rava Dosa", "Onion Dosa", "Uttapam"],
            "Main Course": ["Veg Biryani", "Tomato Rice", "Curd Rice", "Lemon Rice", "Sambar Rice", "Veg Pulao", "Fried Rice", "Chapati Curry", "Veg Meals"],
            "Snacks": ["Pazham Pori", "Mulaku Bajji", "Bonda", "Samosa", "Veg Cutlet", "Uzhunnu Vada"],
            "Beverages": ["Filter Coffee", "Masala Tea", "Horlicks", "Badam Milk", "Lime Juice"]
        },
        "mba": { # North Indian / Premium
            "Breakfast": ["Aloo Paratha", "Gobhi Paratha", "Paneer Paratha", "Chole Bhature", "Veg Sandwich", "Pancakes"],
            "Main Course": ["Chicken Biryani", "Veg Biryani", "Butter Naan", "Paneer Butter Masala", "Chicken Tikka Masala", "Dal Makhani", "Chicken Fried Rice", "Schezwan Noodles", "Chilli Chicken", "Kadai Paneer"],
            "Snacks": ["Chicken Roll", "Veg Roll", "French Fries", "Chicken Nuggets", "Momos"],
            "Beverages": ["Mango Lassi", "Sweet Lassi", "Cold Coffee", "Chocolate Shake", "Oreo Shake", "Coke"]
        },
        "samudra": { # Traditional / Meals
            "Breakfast": ["Puttu Kadala", "Appam Stew", "Idiyappam", "Ghee Dosa", "Thatte Idli"],
            "Main Course": ["Full Meals", "Fish Curry Meals", "Chicken Curry", "Beef Fry", "Tapioca & Fish Curry", "Chapati Dal", "Ghee Rice"],
            "Snacks": ["Fish Cutlet", "Chicken Cutlet", "Egg Puffs", "Meat Puffs"],
            "Beverages": ["Black Tea", "Black Coffee", "Spiced Buttermilk", "Fresh Lime Soda", "Mint Lime"]
        }
    }
    
    modifiers = ["Special", "Mini", "Family", "Spicy", "Roasted", "Butter", "Ghee", "Masala"]
    
    def generate_menu_for_canteen(canteen_id, base_dict):
        menu_list = []
        count = 1
        
        # 1. Add Base Items First
        for category, items in base_dict.items():
            for name in items:
                 menu_list.append(create_item(canteen_id, count, name, category))
                 count += 1
        
        # 2. Generate Variations to reach 60+
        target_count = 65
        
        while count <= target_count:
            # Pick random category and item
            cat = random.choice(list(base_dict.keys()))
            item_name = random.choice(base_dict[cat])
            modifier = random.choice(modifiers)
            
            new_name = f"{modifier} {item_name}"
            
            if not any(i['name'] == new_name for i in menu_list):
                 menu_list.append(create_item(canteen_id, count, new_name, cat, is_variant=True))
                 count += 1
                 
        return menu_list

    def determine_image(name, category):
        # 1. Try to find strict partial match in keywords keys
        name_lower = name.lower()
        for kw, url in kw_images.items():
            if kw.lower() in name_lower:
                return url
        
        # 2. Fallback to category pool
        return random.choice(image_pool.get(category, image_pool["Main Course"]))

    def create_item(canteen_id, index, name, category, is_variant=False):
        # Determine price
        base_price = 30
        if category == "Main Course": base_price = 100
        elif category == "Snacks": base_price = 20
        elif category == "Beverages": base_price = 15
        elif category == "Breakfast": base_price = 40
        
        # Determine Veg Type - STRICT Logic
        name_lower = name.lower()
        non_veg_keywords = ["chicken", "fish", "beef", "meat", "prawn", "egg", "non-veg", "omelette"]
        if any(kw in name_lower for kw in non_veg_keywords):
            base_price += 40
            veg_type = "non-veg"
        else:
            veg_type = "veg"
            
        if is_variant:
            base_price += random.randint(10, 30)
            
        # Select Smart Image
        img = determine_image(name, category)
        
        return {
            "item_id": f"item_{canteen_id}_{index:03d}",
            "name": name,
            "canteen_id": canteen_id,
            "price": float(base_price),
            "nutrition": {
                "calories": random.randint(100, 800),
                "carbs": random.randint(10, 100),
                "protein": random.randint(2, 40),
                "fat": random.randint(2, 30),
                "fiber": random.randint(1, 10),
                "vitamins": "A, B, C",
                "sodium": random.randint(50, 500)
            },
            "ingredients": "Secret Chef's Ingredients",
            "allergens": "None" if veg_type == "veg" else "Non-Veg",
            "stock_qty": random.randint(50, 200),
            "category": category,
            "image_url": img,
            "veg_type": veg_type,
            "prep_time": random.randint(5, 20),
            "available": True,
            "created_at": datetime.utcnow().isoformat()
        }

    # Generate lists
    sopanam_items = generate_menu_for_canteen("sopanam", base_items["sopanam"])
    mba_items = generate_menu_for_canteen("mba", base_items["mba"])
    samudra_items = generate_menu_for_canteen("samudra", base_items["samudra"])

    # Insert items
    await db.menu_items.insert_many(sopanam_items)
    print(f"✅ Sopanam menu seeded ({len(sopanam_items)} items)")
    
    await db.menu_items.insert_many(mba_items)
    print(f"✅ MBA Canteen menu seeded ({len(mba_items)} items)")
    
    await db.menu_items.insert_many(samudra_items)
    print(f"✅ Samudra menu seeded ({len(samudra_items)} items)")

    
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
    
    # Seed crew accounts
    await db.users.delete_many({"role": "crew"})
    crew_users = [
        {
            "user_id": "crew_sopanam",
            "email": "crew-sopanam@campusbites.com",
            "password_hash": hash_password("crew123"),
            "name": "Sopanam Crew",
            "role": "crew",
            "canteen_id": "sopanam",
            "picture": None,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "user_id": "crew_mba",
            "email": "crew-mba@campusbites.com",
            "password_hash": hash_password("crew123"),
            "name": "MBA Crew",
            "role": "crew",
            "canteen_id": "mba",
            "picture": None,
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "user_id": "crew_samudra",
            "email": "crew-samudra@campusbites.com",
            "password_hash": hash_password("crew123"),
            "name": "Samudra Crew",
            "role": "crew",
            "canteen_id": "samudra",
            "picture": None,
            "created_at": datetime.utcnow().isoformat()
        }
    ]
    await db.users.insert_many(crew_users)
    print("✅ Crew accounts seeded")
    
    # Seed demo orders for crew dashboard
    await db.orders.delete_many({})
    from datetime import timedelta
    import random
    
    # Get some menu items for orders
    menu_items = await db.menu_items.find().limit(10).to_list(10)
    
    demo_orders = []
    token_counter = 101
    
    # Create orders for each canteen with different statuses
    canteen_ids = ["sopanam", "mba", "samudra"]
    statuses = ["REQUESTED", "PREPARING", "READY"]
    
    for canteen_id in canteen_ids:
        # Get menu items for this canteen
        canteen_items = [item for item in menu_items if item.get('canteen_id') == canteen_id]
        if not canteen_items:
            canteen_items = menu_items[:3]  # Fallback
        
        # Create 2-3 orders per canteen with different statuses
        for i, status in enumerate(statuses):
            # Select 1-3 random items
            num_items = random.randint(1, 3)
            selected_items = random.sample(canteen_items, min(num_items, len(canteen_items)))
            
            order_items = []
            total_amount = 0
            for item in selected_items:
                quantity = random.randint(1, 2)
                price = item.get('price', 50.0)
                order_items.append({
                    "item_id": item['item_id'],
                    "name": item['name'],
                    "quantity": quantity,
                    "price": price
                })
                total_amount += price * quantity
            
            # Create order with different timestamps for priority testing
            created_time = datetime.utcnow()
            if status == "REQUESTED" and i == 0:
                # Make first REQUESTED order older (for priority highlighting)
                created_time = datetime.utcnow() - timedelta(minutes=15)
            elif status == "PREPARING":
                created_time = datetime.utcnow() - timedelta(minutes=8)
            elif status == "READY":
                created_time = datetime.utcnow() - timedelta(minutes=3)
            
            order = {
                "order_id": f"order_{uuid.uuid4().hex[:12]}",
                "student_id": "demo_student",
                "items": order_items,
                "canteen_id": canteen_id,
                "token_number": random.randint(1000000, 9999999),
                "status": status,
                "payment_id": f"pay_{uuid.uuid4().hex[:8]}",
                "razorpay_order_id": f"order_{uuid.uuid4().hex[:8]}",
                "razorpay_payment_id": f"pay_{uuid.uuid4().hex[:8]}",
                "total_amount": total_amount,
                "created_at": created_time.isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(hours=1)).isoformat()
            }
            demo_orders.append(order)
            token_counter += 1
    
    if demo_orders:
        await db.orders.insert_many(demo_orders)
        print(f"✅ {len(demo_orders)} demo orders seeded")
    
    
    
    print("\n🎉 Database seeded successfully!")
    print("\n📋 Management Login Credentials:")
    print("1. Super Admin: canteenmanager@amrita.edu / admin123")
    print("2. Sopanam Manager: sopanam-admin@amrita.edu / sopanam123")
    print("3. MBA Manager: mba-admin@amrita.edu / mba123")
    print("4. Samudra Manager: samudra-admin@amrita.edu / samudra123")
    print("\n👥 Crew Login Credentials:")
    print("1. Sopanam Crew: crew-sopanam@campusbites.com / crew123")
    print("2. MBA Crew: crew-mba@campusbites.com / crew123")
    print("3. Samudra Crew: crew-samudra@campusbites.com / crew123")

if __name__ == "__main__":
    asyncio.run(seed_database())
