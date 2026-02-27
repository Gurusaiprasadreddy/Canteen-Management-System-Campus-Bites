import asyncio, os, httpx
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
async def run():
    db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    client = httpx.AsyncClient()
    url = "https://api.unsplash.com/search/photos"
    headers = {"Authorization": f"Client-ID {os.environ.get('UNSPLASH_ACCESS_KEY')}"}
    
    # 1. Fix Bonda
    res = await client.get(url, params={'query': 'indian fritters bonda', 'per_page': 1, 'orientation': 'landscape'}, headers=headers)
    if res.status_code == 200 and res.json()['results']:
        bonda_url = res.json()['results'][0]['urls']['regular']
        await db.menu_items.update_many({"name": {"$regex": "Bonda", "$options": "i"}}, {"$set": {"image_url": bonda_url}})
        print("Updated Bonda:", bonda_url)
        
    # 2. Fix Chapati Curry
    res2 = await client.get(url, params={'query': 'indian chapati roti and curry', 'per_page': 1, 'orientation': 'landscape'}, headers=headers)
    if res2.status_code == 200 and res2.json()['results']:
        chapati_url = res2.json()['results'][0]['urls']['regular']
        await db.menu_items.update_many({"name": {"$regex": "Chapati Curry", "$options": "i"}}, {"$set": {"image_url": chapati_url}})
        print("Updated Chapati Curry:", chapati_url)

asyncio.run(run())
