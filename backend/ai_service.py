try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    HAS_EMERGENT = True
except ImportError:
    HAS_EMERGENT = False
    print("WARNING: emergentintegrations package not found. AI features will use fallbacks.")
    class LlmChat:
        def __init__(self, *args, **kwargs): pass
        def with_model(self, *args): return self
        async def send_message(self, *args): return "{}"
    class UserMessage:
        def __init__(self, text): self.text = text
import os
from typing import List, Dict, Any
import json
import re

try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if HAS_GEMINI and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class AIService:
    def __init__(self):
        # Pre-defined rules for the "Natural Language Wellness Agent"
        self.symptom_rules = {
            "headache": {"keywords": ["headache", "migraine", "head ache"], "categories": ["Beverages"], "tags": ["caffeine", "hydration"], "reason": "Caffeine enables blood vessel constriction which can help relieve headaches."},
            "stress": {"keywords": ["stress", "anxiety", "depressed", "tension"], "categories": ["Beverages", "Desserts", "Healthy Options"], "items": ["Badam Milk", "Chocolate", "Ice Cream"], "reason": "Comfort foods and magnesium-rich options can help alleviate stress."},
            "tired": {"keywords": ["tired", "fatigue", "exhausted", "sleepy"], "categories": ["Beverages", "Snacks"], "tags": ["energy", "sugar"], "reason": "Quick energy boost from healthy carbs and hydration."},
            "cold": {"keywords": ["cold", "flu", "fever", "cough"], "categories": ["Soups", "Beverages"], "items": ["Pepper Rasam", "Ginger Tea", "Soup"], "reason": "Warm fluids help soothe the throat and clear congestion."},
            "hungry": {"keywords": ["hungry", "starving", "famished"], "categories": ["Main Course", "Meals", "Biryani"], "reason": "Filling, calorie-dense meals to limit hunger."}
        }
        
        # Pre-defined associations for "Predictive Personalization" (Apriori-style rules)
        # Item Name -> List of complementary Item Names
        self.associations = {
            "Chicken Biryani": ["Coke", "Pepsi", "Ice Cream", "Raita"],
            "Veg Biryani": ["Paneer Butter Masala", "Lime Soda", "Raita"],
            "Masala Dosa": ["Filter Coffee", "Vada"],
            "Idli": ["Vada", "Filter Coffee"],
            "Fried Rice": ["Gobi Manchurian", "Coke"],
            "Meals": ["Omelette", "Fish Fry"],
            "Burger": ["French Fries", "Coke", "Milkshake"]
        }

    async def get_symptom_recommendations(self, symptom: str, available_items: List[Dict], history: List[Dict]=None, user_preferences: Dict=None) -> Dict:
        """
        Analyze symptom with NLP, Time-Awareness, and Chat Context to recommend items.
        Advanced Dynamic Workflow.
        """
        import difflib
        from datetime import datetime
        
        # Professional Health-Based Rules (Knowledge Base)
        self.symptom_rules = {
            "headache": {
                "keywords": ["headache", "migraine", "head ache", "pounding head", "head hurts", "splitting headache"], 
                "categories": ["Beverages"], 
                "items": ["Coffee", "Tea", "Ginger Tea"],
                "intent": "Fatigue",
                "response_template": "Headaches are often caused by dehydration or fatigue.\n☕ We recommend {items} for quick relief."
            },
            "stress": {
                "keywords": ["stress", "anxiety", "depressed", "tension", "worried", "panicked", "anxious"], 
                "categories": ["Beverages", "Desserts"], 
                "items": ["Badam Milk", "Green Tea", "Chocolate"], 
                "intent": "Mental Wellness",
                "response_template": "🧘 Try {items} — they help calm the mind and reduce stress."
            },
            "hungry": {
                "keywords": ["hungry", "starving", "famished", "appetite", "empty stomach"], 
                "categories": ["Main Course", "Meals", "Biryani"], 
                "items": ["Chicken Biryani", "Veg Biryani", "Burger", "Meals"],
                "intent": "Hunger",
                "response_template": "🍽️ You seem hungry! We recommend filling options like {items} to satisfy your appetite."
            },
            "tired": {
                "keywords": ["tired", "fatigue", "exhausted", "sleepy", "drained", "low energy"], 
                "categories": ["Beverages", "Snacks"], 
                "items": ["Fruit Juice", "Cold Coffee", "Fruit Bowl"],
                "intent": "Low Energy",
                "response_template": "⚡ Feeling low on energy? Boost it with {items}."
            },
            "gym": {
                "keywords": ["gym", "workout", "protein", "fitness", "muscle", "gains"],
                "categories": ["Healthy Options"],
                "items": ["Boiled Eggs", "Protein Shake", "Chicken Salad"],
                "intent": "Fitness",
                "response_template": "💪 For your fitness goals, we recommend high-protein options like {items}."
            },
            "cold": {
                "keywords": ["cold", "flu", "cough", "runny nose", "sneezing", "sick", "throat", "congestion"],
                "categories": ["Beverages", "Soups"],
                "items": ["Masala Tea", "Ginger Tea", "Filter Coffee", "Rasam", "Black Tea", "Pepper Rasam"],
                "intent": "Cold & Flu Recovery",
                "response_template": "🤧 Sorry to hear you're unwell! {items} are warm and soothing — they help ease congestion and soothe your throat. Stay hydrated!"
            },
            "fever": {
                "keywords": ["fever", "high temperature", "chills", "sweating", "body heat", "burning up", "temperature"],
                "categories": ["Beverages", "Main Course"],
                "items": ["Curd Rice", "Coconut Water", "Lime Juice", "Plain Rice", "Rasam", "Buttermilk"],
                "intent": "Fever Recovery",
                "response_template": "🌡️ When you have a fever, your body needs light, easy-to-digest foods and plenty of fluids. {items} will help keep you hydrated and nourished. Avoid heavy or spicy foods and rest well!"
            },
            "pain": {
                "keywords": ["pain", "stomach", "nausea", "vomit", "indigestion", "acidity", "gas", "bloating"],
                "categories": ["Beverages", "Main Course"],
                "items": ["Curd Rice", "Badam Milk", "Lime Juice", "Spiced Buttermilk"],
                "intent": "Digestive Comfort",
                "response_template": "🫶 For digestive discomfort, light and easy-to-digest options like {items} are ideal. Avoid spicy food for now."
            }
        }

        symptom_lower = symptom.lower()
        matched_rule = None
        
        # --- Time-of-Day Logic ---
        current_hour = datetime.now().hour
        is_late_night = current_hour >= 21 or current_hour <= 5
        
        # 1. NLP Intent Classification (Rule-based + Fuzzy Match)
        all_keywords = {}
        for key, rule in self.symptom_rules.items():
            for kw in rule["keywords"]:
                all_keywords[kw] = rule
        
        import re
        cleaned_input = re.sub(r'[^\w\s]', '', symptom_lower)
        user_words = cleaned_input.split()
        
        # Priority 1: Direct Keyword Matching
        for key, rule in self.symptom_rules.items():
             if any(k in symptom_lower for k in rule["keywords"]):
                 matched_rule = rule
                 break
        
        # Priority 2: Fuzzy match
        if not matched_rule:
            for word in user_words:
                matches = difflib.get_close_matches(word, all_keywords.keys(), n=1, cutoff=0.8)
                if matches:
                    matched_rule = all_keywords[matches[0]]
                    break
                    
        # --- Context Awareness ---
        # If no new intent is found, check history for previous intent to handle follow-ups like "what about something else?"
        if not matched_rule and history and len(history) > 0:
             last_bot_msg = next((msg["content"] for msg in reversed(history) if msg["role"] == "assistant"), "")
             # Simple context check: did we just talk about a specific intent?
             for key, rule in self.symptom_rules.items():
                 if rule["intent"] in last_bot_msg or any(i in last_bot_msg for i in rule["items"]):
                     # Assume user is continuing conversation about this topic
                     matched_rule = rule
                     break

        # Priority 3: Fallback
        if not matched_rule:
            return {
                "recommended_items": [],
                "avoid": [],
                "explanation": "I specialize in nutritional advice based on how you are feeling (e.g., 'I have a headache' or 'I feel stressed'). Could you please describe your current physical or mental state?"
            }

        recommendations = []
        suggested_item_names = []
        
        # 2. Find matching items
        target_items = matched_rule["items"]
        
        # --- Smart Logic: Late Night Overrides ---
        if is_late_night and "Coffee" in target_items:
             # Override Caffeine at night
             target_items = ["Green Tea", "Milk", "Water"]
             matched_rule = matched_rule.copy() # Avoid modifying global rule
             matched_rule["response_template"] = "Since it's late, we suggest avoiding caffeine.\n🌙 Try {items} for better sleep."
             matched_rule["intent"] = "Night Hydration"

        # Specific item match
        for target_name in target_items:
            matches = [i for i in available_items if target_name.lower() in i["name"].lower()]
            for m in matches:
                if m["name"] not in suggested_item_names:
                    recommendations.append({
                        "item_id": m["item_id"], 
                        "item_name": m["name"], 
                        "reason": f"Recommended for {matched_rule['intent']}"
                    })
                    suggested_item_names.append(m["name"])
        
        # Category fallback
        if len(recommendations) < 3 and "categories" in matched_rule:
             category_matches = [i for i in available_items if i.get("category") in matched_rule["categories"] and i["name"] not in suggested_item_names]
             import random
             random.shuffle(category_matches)
             for m in category_matches[:3-len(recommendations)]:
                 recommendations.append({
                     "item_id": m["item_id"], 
                     "item_name": m["name"], 
                     "reason": f"Good option for {matched_rule['intent']}"
                 })

        # Format Response
        top_names = [r["item_name"] for r in recommendations[:2]]
        if not top_names:
             top_names = target_items[:2]
             
        items_str = " or ".join(top_names)
        friendly_response = matched_rule["response_template"].format(items=items_str)

        return {
            "recommended_items": recommendations[:3],
            "avoid": [],
            "explanation": friendly_response
        }

    async def get_collaborative_recommendations(self, order_history_items: List[Dict], available_items: List[Dict]) -> List[Dict]:
        """
        Predictive Personalization (The Recommender)
        Uses simplified Apriori-style logic/rules to suggest complementary pairings.
        """
        if not order_history_items:
            # Cold start: Recommend popular items
            return [item for item in available_items if item.get("category") in ["Main Course", "Snacks"]][:3]

        last_ordered_names = [item["item_name"] for item in order_history_items[-3:]] # Look at last 3 items
        
        recommendations = []
        suggested_names = set()
        
        for last_item in last_ordered_names:
            # Check association rules
            for key_item, complements in self.associations.items():
                if key_item.lower() in last_item.lower():
                    # Found a match, add its complements
                    for comp_name in complements:
                        if comp_name not in suggested_names:
                            # Find the actual item object
                            match = next((i for i in available_items if comp_name.lower() in i["name"].lower()), None)
                            if match:
                                recommendations.append(match)
                                suggested_names.add(comp_name)
        
        # If we don't have enough specific recommendations, fill with popular/random items
        if len(recommendations) < 3:
            remaining = [i for i in available_items if i["name"] not in suggested_names]
            import random
            random.shuffle(remaining)
            recommendations.extend(remaining[:3-len(recommendations)])
            
        return recommendations[:3]

    async def generate_weekly_diet_plan(self, goal: str, current_weight: float, target_weight: float, available_items: List[Dict], **kwargs) -> Dict:
        """
        AI-Powered Goal-Oriented Optimization
        Uses Google Gemini to generate a personalized weekly diet plan based on canteen available items.
        """
        # Determine target protein based on goal
        target_protein = int(kwargs.get('protein_goal', 20))
            
        # Extract lightweight item dataset for the LLM
        food_catalog = []
        for i in available_items:
            try:
                food_catalog.append({
                    "id": i["item_id"],
                    "name": i["name"],
                    "protein": int(round(i.get("nutrition", {}).get("protein", 0))),
                    "cals": int(round(i.get("nutrition", {}).get("calories", 0))),
                    "canteen": i.get("canteen_id")
                })
            except Exception:
                continue
        
        # Check if we can use Gemini
        if not HAS_GEMINI or not GEMINI_API_KEY:
            # Fallback to a basic random/popular distribution if Gemini isn't available
            import random
            daily_cals = 2000
            weekly_plan = {}
            days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            
            protein_items = [i for i in available_items if i.get("nutrition", {}).get("protein", 0) > 0]
            if not protein_items: protein_items = available_items[:5]
            
            for day in days:
                sel = random.sample(protein_items, min(3, len(protein_items)))
                day_plan = {}
                meals = ["breakfast", "lunch", "dinner"]
                for idx, meal in enumerate(meals):
                    if idx < len(sel):
                        day_plan[meal] = {
                            "item_id": sel[idx]["item_id"], 
                            "item_name": sel[idx]["name"], 
                            "protein": sel[idx].get("nutrition", {}).get("protein", 0),
                            "image_url": sel[idx].get("image_url"),
                            "price": sel[idx].get("price"),
                            "canteen_id": sel[idx].get("canteen_id")
                        }
                weekly_plan[day] = day_plan
                
            return {
                "daily_calories": daily_cals,
                "protein_target": target_protein,
                "tips": ["(Fallback Mode Activated - API Key Missing)", f"Target Protein per Meal: {target_protein}g", "Drink plenty of water."],
                "weekly_plan": weekly_plan
            }
            
        # Advanced LLM Prompt for true Personalization
        prompt = f"""
        You are an expert, professional AI nutritionist for a college campus.
        Generate a comprehensive 7-day meal plan for a student based purely on the items available in the college canteen.

        USER PROFILE:
        - Goal: {goal}
        - Current Weight: {current_weight} kg
        - Target Weight: {target_weight} kg
        - Target Protein per meal: ~{target_protein}g

        AVAILABLE CANTEEN MENU (Use ONLY items from this list by their exact 'id' and 'name'):
        {json.dumps(food_catalog)}

        REQUIREMENTS:
        1. Create a full plan for Monday through Sunday.
        2. Format EXACTLY as the JSON structure below without any markdown formatting or code blocks.
        3. Make sure the meals differ slightly day-by-day so it does not get boring.
        4. Focus on higher protein if the goal is muscle gain, or lower calories if the goal is weight loss.

        EXPECTED JSON OUTPUT FORMAT:
        {{
           "daily_calories": 2400,
           "protein_target": {target_protein},
           "tips": [
                "Give 3 very actionable, specific tips based on their weight goal ({goal}) and canteen choices."
           ],
           "weekly_plan": {{
               "Monday": {{
                  "breakfast": {{"item_id": "item123", "item_name": "Oatmeal", "protein": 10}},
                  "lunch": {{"item_id": "item456", "item_name": "Chicken Salad", "protein": 30}},
                  "dinner": {{"item_id": "item789", "item_name": "Protein Shake", "protein": 25}}
               }},
               "Tuesday": {{
                  // Same structure
               }}
               // Repeat for all 7 days exactly
           }}
        }}
        """

        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            # Run the synchronous API call in a thread to keep FastAPI completely async and fast
            import asyncio
            response = await asyncio.to_thread(model.generate_content, prompt)
            
            # Clean the markdown off the JSON response
            text = response.text.strip()
            if text.startswith('```json'): text = text[7:-3].strip()
            elif text.startswith('```'): text = text[3:-3].strip()
            
            data = json.loads(text)
            
            # Map back image_url, price, canteen_id from original objects 
            # (since we didn't send them to the LLM to save tokens)
            item_lookup = {i["item_id"]: i for i in available_items}
            
            if "weekly_plan" in data:
                for day, meals in data["weekly_plan"].items():
                    for meal_type, meal_data in meals.items():
                        lookup = item_lookup.get(meal_data.get("item_id"))
                        if lookup:
                            meal_data["image_url"] = lookup.get("image_url")
                            meal_data["price"] = lookup.get("price")
                            meal_data["canteen_id"] = lookup.get("canteen_id")
            
            return data
            
        except Exception as e:
            print(f"Gemini API Error: {str(e)}")
            # Return basic empty structure to gracefully handle failure
            return {
                "daily_calories": 2000,
                "protein_target": target_protein,
                "tips": ["Could not generate AI plan at this moment. Please try again later."],
                "weekly_plan": {}
            }

    async def get_crew_assistance(self, query: str, context: Dict = None) -> Dict:
        """
        AI assistant for crew operational guidance.
        Clear, professional, fast-action oriented responses.
        """
        query_lower = query.lower()
        import re

        # Regex patterns for entities
        token_pattern = re.search(r'\b(\d{6,7})\b', query) # Matches 6 or 7 digit tokens
        
        # 1. Verify Token
        if any(word in query_lower for word in ["verify", "check", "token"]) and token_pattern:
            token = token_pattern.group(1)
            return {
                "response": f"Verifying token #{token}...",
                "action": "verify_token",
                "entity": token
            }

        # 2. Show Pending Orders
        if any(word in query_lower for word in ["pending", "orders", "show", "list", "queue"]):
            return {
                "response": "Fetching pending orders...",
                "action": "show_orders"
            }
        
        # 3. Priority Checks
        if any(word in query_lower for word in ["delay", "late", "priority", "alert"]):
            return {
                "response": "Checking for priority alerts...",
                "action": "show_priority"
            }
        
        # 4. General Help / Status Explanations
        if "status" in query_lower or "explain" in query_lower:
             return {
                "response": "Status Guide:\n• **Requested**: New order\n• **Accepted**: You acknowledged it\n• **Preparing**: Cooking in progress\n• **Ready**: Waiting for pickup\n• **Completed**: Handed over",
                "action": "info"
            }

        # Default fallback
        return {
            "response": "I can help with:\n• Checking pending orders\n• Verifying tokens (e.g., 'Verify 6149834')\n• Checking priority alerts",
            "action": "help"
        }

    async def analyze_order_combos(self, orders: List[Dict], min_support: float = 0.1) -> List[Dict]:
        """
        Analyze frequent item combinations from order history.
        Returns combo suggestions for management.
        """
        from collections import defaultdict
        
        # Count item pairs
        pair_counts = defaultdict(int)
        item_counts = defaultdict(int)
        total_orders = len(orders)
        
        if total_orders == 0:
            return []
        
        for order in orders:
            items = order.get('items', [])
            item_names = [item['item_name'] for item in items]
            
            # Count individual items
            for name in item_names:
                item_counts[name] += 1
            
            # Count pairs
            for i in range(len(item_names)):
                for j in range(i + 1, len(item_names)):
                    pair = tuple(sorted([item_names[i], item_names[j]]))
                    pair_counts[pair] += 1
        
        # Calculate support and confidence
        combos = []
        for (item1, item2), count in pair_counts.items():
            support = count / total_orders
            if support >= min_support:
                confidence1 = count / item_counts[item1] if item_counts[item1] > 0 else 0
                confidence2 = count / item_counts[item2] if item_counts[item2] > 0 else 0
                
                combos.append({
                    "item1": item1,
                    "item2": item2,
                    "frequency": count,
                    "support": round(support * 100, 1),
                    "confidence": round(max(confidence1, confidence2) * 100, 1),
                    "suggestion": f"Create combo: {item1} + {item2}"
                })
        
        # Sort by frequency
        combos.sort(key=lambda x: x['frequency'], reverse=True)
        return combos[:10]

    async def generate_management_insights(self, analytics_data: Dict) -> Dict:
        """
        Generate AI-driven business insights and recommendations for management.
        Professional, insight-driven, executive-level.
        """
        insights = []
        recommendations = []
        
        total_orders = analytics_data.get('total_orders', 0)
        total_revenue = analytics_data.get('total_revenue', 0)
        avg_order_value = analytics_data.get('average_order_value', 0)
        top_items = analytics_data.get('top_items', [])
        peak_hours = analytics_data.get('peak_hours', {})
        
        # Revenue insights
        if total_revenue > 0:
            insights.append({
                "type": "revenue",
                "title": "Revenue Performance",
                "message": f"Total revenue: ₹{total_revenue:.2f} from {total_orders} orders",
                "metric": total_revenue
            })
        
        # Average order value insights
        if avg_order_value > 0:
            if avg_order_value < 100:
                recommendations.append({
                    "priority": "high",
                    "category": "pricing",
                    "title": "Increase Average Order Value",
                    "suggestion": "Current AOV is ₹{:.2f}. Consider introducing combo offers to increase basket size.".format(avg_order_value)
                })
            else:
                insights.append({
                    "type": "performance",
                    "title": "Strong AOV",
                    "message": f"Average order value of ₹{avg_order_value:.2f} indicates healthy spending",
                    "metric": avg_order_value
                })
        
        # Top items insights
        if top_items and len(top_items) > 0:
            top_item = top_items[0]
            insights.append({
                "type": "demand",
                "title": "Most Popular Item",
                "message": f"{top_item['item_name']} is your top seller with {top_item['quantity']} orders",
                "metric": top_item['quantity']
            })
            
            recommendations.append({
                "priority": "medium",
                "category": "inventory",
                "title": "Stock Optimization",
                "suggestion": f"Ensure adequate stock of {top_item['item_name']} during peak hours to avoid stockouts."
            })
        
        # Peak hours insights
        if peak_hours:
            peak_hour = max(peak_hours.items(), key=lambda x: x[1])[0] if peak_hours else None
            if peak_hour:
                insights.append({
                    "type": "timing",
                    "title": "Peak Hour Identified",
                    "message": f"Highest order volume at {peak_hour}",
                    "metric": peak_hours[peak_hour]
                })
                
                recommendations.append({
                    "priority": "high",
                    "category": "operations",
                    "title": "Staffing Optimization",
                    "suggestion": f"Increase staff during {peak_hour} to handle demand efficiently."
                })
        
        return {
            "insights": insights,
            "recommendations": recommendations,
            "summary": f"Analyzed {total_orders} orders. {len(recommendations)} actionable recommendations generated."
        }

    async def predict_peak_hours(self, orders: List[Dict]) -> Dict:
        """
        Analyze order timestamps to identify peak hours.
        """
        from collections import defaultdict
        from datetime import datetime
        
        hour_counts = defaultdict(int)
        
        for order in orders:
            try:
                created_at = order.get('created_at')
                if isinstance(created_at, str):
                    dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                else:
                    dt = created_at
                
                hour = dt.hour
                hour_counts[hour] += 1
            except:
                continue
        
        # Format for display
        peak_hours = {}
        for hour, count in hour_counts.items():
            time_str = f"{hour:02d}:00 - {hour:02d}:59"
            peak_hours[time_str] = count
        
        # Find peak hour
        if peak_hours:
            peak_time = max(peak_hours.items(), key=lambda x: x[1])
            return {
                "peak_hours": dict(sorted(peak_hours.items())),
                "busiest_hour": peak_time[0],
                "busiest_hour_orders": peak_time[1]
            }
        
        return {"peak_hours": {}, "busiest_hour": None, "busiest_hour_orders": 0}

ai_service = AIService()

