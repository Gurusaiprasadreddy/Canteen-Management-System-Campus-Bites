import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load env
load_dotenv('.env')

async def check():
    try:
        mongo_url = os.environ['MONGO_URL']
        db_name = os.environ['DB_NAME']
        print(f"Connecting to {mongo_url}, DB: {db_name}")
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Check Canteens
        print("\n--- CANTEENS ---")
        canteens = await db.canteens.find().to_list(100)
        for c in canteens:
            print(f"ID: '{c['canteen_id']}' | Name: {c['name']}")

        # Check Users (Crew)
        print("\n--- CREW USERS ---")
        users = await db.users.find({"role": "crew"}).to_list(100)
        for u in users:
            print(f"Email: {u['email']} | Canteen ID: '{u.get('canteen_id')}'")
            
        # Check all orders count
        print("\n--- ORDERS BY CANTEEN ---")
        pipeline = [{"$group": {"_id": "$canteen_id", "count": {"$sum": 1}}}]
        counts = await db.orders.aggregate(pipeline).to_list(100)
        print(counts)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check())
