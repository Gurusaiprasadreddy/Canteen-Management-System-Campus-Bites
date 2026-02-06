import requests
import json

BASE_URL = "http://localhost:8001/api"

def test_canteens():
    print("Fetching canteens...")
    try:
        resp = requests.get(f"{BASE_URL}/canteens")
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            canteens = resp.json()
            print(f"Found {len(canteens)} canteens:")
            for c in canteens:
                print(f"- {c.get('name')} ({c.get('canteen_id')})")
        else:
            print(f"Error: {resp.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_canteens()
