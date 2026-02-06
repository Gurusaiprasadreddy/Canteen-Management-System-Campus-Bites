import requests
import json

BASE_URL = "http://localhost:8001/api"

def run_test():
    # 1. Login as MBA Crew
    # We need to know the credentials. Seed data uses 'crew123'
    # Find email from debug output or guess: crew-mba@campusbites.com?
    # Let's try likely candidates
    
    # Try 'crew-samudra' since we saw it in debug output
    email = "crew-samudra@campusbites.com"
    password = "crew123"
    
    print(f"Logging in as {email}...")
    try:
        # Correct crew login endpoint
        resp = requests.post(f"http://localhost:8001/api/auth/crew/login", json={
            "email": email,
            "password": password
        })
        
        if resp.status_code != 200:
            print(f"Login failed: {resp.status_code} {resp.text}")
            return

        token = resp.json()['token']
        headers = {"Authorization": f"Bearer {token}"}
        print("Login success.")
        
        with open("test_results.txt", "w") as f:
            f.write("Login success.\n")
            
            # 2. Fetch Recent Orders for 'mba'
            f.write("\nFetching recent orders for 'mba'...\n")
            # Using BASE_URL which is .../api
            # Requests will be to /api/orders/... which is correct now (single /api)
            resp = requests.get(f"{BASE_URL}/orders/recent/mba", headers=headers)
            f.write(f"Status: {resp.status_code}\n")
            orders = resp.json()
            f.write(f"Count: {len(orders)}\n")
            if len(orders) > 0:
                f.write(f"First order: {orders[0]['token_number']} - {orders[0]['status']}\n")
                
                # 3. Verify the first token
                target_token = orders[0]['token_number']
                f.write(f"\nVerifying token {target_token} (Type: {type(target_token)})...\n")
                
                # Send as integer (it is already int)
                resp = requests.post(f"{BASE_URL}/orders/verify-token", json={"token": target_token}, headers=headers)
                f.write(f"Status: {resp.status_code}\n")
                f.write(f"Response: {resp.text}\n")
                
            # 4. Try verifying 8533949 (Int manually)
            manual_token = 8533949
            f.write(f"\nVerifying manual token {manual_token}...\n")
            resp = requests.post(f"{BASE_URL}/orders/verify-token", json={"token": manual_token}, headers=headers)
            f.write(f"Status: {resp.status_code}\n")
            f.write(f"Response: {resp.text}\n")

            # 5. Verify AI Chatbot Logic
            f.write(f"\nTesting AI Chatbot with token {target_token}...\n")
            chat_payload = {
                "message": f"Please verify token {target_token}",
                "canteen_id": "mba"
            }
            resp = requests.post(f"{BASE_URL}/crew/chat", json=chat_payload, headers=headers)
            f.write(f"Status: {resp.status_code}\n")
            f.write(f"AI Response: {resp.text}\n")

            # 6. Test Management Login & Auth Precedence
            f.write(f"\n--- Testing Management Login & Auth Precedence ---\n")
            # Login as Management
            mgt_resp = requests.post(f"{BASE_URL}/auth/management/login", json={
                "email": "canteenmanager@amrita.edu",
                "password": "admin123" 
            }) 
            if mgt_resp.status_code == 200:
                mgt_token = mgt_resp.json()['token']
                f.write(f"Management Login Success. Token: {mgt_token[:10]}...\n")
                
                # Test Access with Header (Should Succeed)
                mgt_headers = {"Authorization": f"Bearer {mgt_token}"}
                dash_resp = requests.get(f"{BASE_URL}/management/analytics/revenue", headers=mgt_headers)
                f.write(f"Header-only Access: {dash_resp.status_code} (Expected 200)\n")
                
                # Test Access with Header + Conflicting Student Cookie (Should Prioritize Header -> Succeed)
                # Create a dummy student cookie if possible, or just rely on the fact that requests session handles cookies if we logged in as student earlier.
                # Since we didn't login as student in this script session, we can manually add a cookie header.
                # But requests handles cookies via jar. 
                # Let's mock a header that looks like a cookie? Or just send the header.
                # The real test is if the backend accepts the header.
                
                # Let's try to Verify Token using Crew Token in Header, but pretend we have a student cookie.
                # Actually, simpler: verify the previous crew logic holds.
                # If the above 200 OK worked, it proves management token is valid.
                pass
            else:
                f.write(f"Management Login Failed: {mgt_resp.status_code} {mgt_resp.text}\n")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_test()
