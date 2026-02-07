import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def verify_connection():
    try:
        mongo_url = os.environ.get('MONGO_URL')
        if not mongo_url:
            print("❌ MONGO_URL not found in .env")
            return

        print(f"Testing connection to: {mongo_url.split('@')[-1]}") # Hide credentials
        
        client = AsyncIOMotorClient(mongo_url)
        db_name = os.environ.get('DB_NAME', 'campus_bites')
        db = client[db_name]
        
        # Check connection by pinging
        await client.admin.command('ping')
        print("✅ MongoDB Connection Successful!")
        
        # List Users
        print(f"\nChecking users in database '{db_name}':")
        users = await db.users.find({}, {'email': 1, 'role': 1, 'name': 1}).to_list(None)
        
        if users:
            print(f"✅ Found {len(users)} users:")
            for user in users:
                print(f" - {user.get('name')} ({user.get('email')}) - Role: {user.get('role')}")
        else:
            print("❌ No users found in the database!")

    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(verify_connection())
