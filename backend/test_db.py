import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
async def run():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    items = await db.menu_items.find({"name": "Bonda"}).limit(5).to_list(5)
    for i in items:
        print(i['name'], i['image_url'])
    
    items2 = await db.menu_items.find({"name": "Badam Milk"}).limit(5).to_list(5)
    for i in items2:
        print(i['name'], i['image_url'])

asyncio.run(run())
