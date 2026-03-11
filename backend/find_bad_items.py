import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

bad_prefixes  = ['spicy', 'butter', 'ghee', 'masala', 'roasted']
bad_keywords  = ['tea', 'coffee', 'juice', 'milk', 'lassi', 'shake', 'coke', 'soda', 'lime', 'horlicks', 'boost']

async def fix():
    all_items = await db.menu_items.find({}, {'name': 1, '_id': 1, 'canteen_id': 1}).to_list(None)
    flagged = []
    for item in all_items:
        name_lower = item['name'].lower()
        for prefix in bad_prefixes:
            if name_lower.startswith(prefix + ' ') and any(kw in name_lower for kw in bad_keywords):
                flagged.append(item)
                break

    print(f"Found {len(flagged)} bad items:")
    for f in flagged:
        print(f"  [{f['canteen_id']}] {f['name']}")

    if not flagged:
        print("Nothing to remove.")
        return

    print("\nRemoving...")
    for item in flagged:
        await db.menu_items.delete_one({"_id": item["_id"]})
        print(f"  Deleted: {item['name']} ({item['canteen_id']})")

    print(f"\nDone. {len(flagged)} bad items removed.")

asyncio.run(fix())
