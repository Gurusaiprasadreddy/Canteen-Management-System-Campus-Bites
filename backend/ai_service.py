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

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

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
        Goal-Oriented Optimization (DSA meets AI)
        Implementation of 0/1 Knapsack Algorithm to find exact protein match.
        """
        # Determine target protein based on goal
        if kwargs.get('protein_goal'):
            target_protein = int(kwargs.get('protein_goal'))
        else:
            # Rough estimate if not provided
            target_protein = 20 # Default for single meal calculation logic
            
        # Filter relevant items (e.g. not beverages unless protein shake)
        # OPTIMIZATION: Convert protein to int for efficient Knapsack
        food_items = []
        for i in available_items:
             try:
                 p = i["nutrition"]["protein"]
                 if p > 0:
                     # Create a lightweight dict for the algorithm to avoid modifying original or deep copy issues
                     item_copy = i.copy()
                     item_copy["nutrition"] = i["nutrition"].copy() # Shallow copy nutrition dict
                     item_copy["nutrition"]["protein"] = int(round(p))
                     food_items.append(item_copy)
             except:
                 continue
        
        # KNAPSACK ALGORITHM IMPLEMENTATION
        # We want to find a combination of items where total protein is closest to target_protein
        # This is a variation of Subset Sum / Knapsack. 
        # Since user wants "exact 20 if not possible nearest one", we can treat protein as "weight".
        # We want to minimize |sum(protein) - target|.
        
        # Simple recursion with memoization for "Subset Sum" problem
        # Returns: (closest_sum, list_of_items)
        
        memo = {}
        
        def find_closest_subset(index, current_sum):
            state = (index, current_sum)
            if state in memo: return memo[state]
            
            if index >= len(food_items):
                return current_sum, []
            
            # Choice 1: Exclude current item
            sum1, items1 = find_closest_subset(index + 1, current_sum)
            
            # Choice 2: Include current item (if it doesn't vastly exceed target, purely efficiently)
            # Relaxation: We allow exceeding target slightly to find "nearest" (upper or lower)
            if current_sum + food_items[index]["nutrition"]["protein"] <= target_protein * 1.5: 
                sum2, items2 = find_closest_subset(index + 1, current_sum + food_items[index]["nutrition"]["protein"])
                items2 = [food_items[index]] + items2
            else:
                sum2 = float('inf')
                items2 = []
            
            # Compare which sum is closer to target
            diff1 = abs(target_protein - sum1)
            diff2 = abs(target_protein - sum2)
            
            if diff1 <= diff2:
                result = (sum1, items1)
            else:
                result = (sum2, items2)
                
            memo[state] = result
            return result
            
        best_sum, best_items = find_closest_subset(0, 0)
        
        # Format for weekly plan (User asked for Plan, but Knapsack is usually for a specific meal/day constraint)
        # We will distribute these "Best Fit" items across the days
        
        weekly_plan = {}
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        # If we didn't find good items, just fill randomly (fallback) but the algorithm above should work
        if not best_items:
             best_items = food_items[:3]
             
        import random
        
        # Available variations for slight randomization (simulate variety)
        # We will try to find other items with similar protein count
        similar_items = []
        if best_items:
             avg_protein = sum(i["nutrition"]["protein"] for i in best_items) / len(best_items)
             similar_items = [i for i in food_items if abs(i["nutrition"]["protein"] - avg_protein) < 5]
        
        if not similar_items:
             similar_items = best_items

        for day in days:
            # Distribute the knapsack result items with some variation
            # We shuffle similar items every day so it's not IDENTICAL every day
            daily_selection = list(similar_items)
            random.shuffle(daily_selection)
            
            # Ensure we have enough
            if len(daily_selection) < 3:
                daily_selection = (daily_selection * 3)[:3]

            day_plan = {}
            if len(daily_selection) > 0: 
                day_plan["breakfast"] = {
                    "item_id": daily_selection[0]["item_id"], 
                    "item_name": daily_selection[0]["name"], 
                    "protein": daily_selection[0]["nutrition"]["protein"],
                    "image_url": daily_selection[0].get("image_url"),
                    "price": daily_selection[0].get("price"),
                    "canteen_id": daily_selection[0].get("canteen_id")
                }
            if len(daily_selection) > 1: 
                day_plan["lunch"] = {
                    "item_id": daily_selection[1]["item_id"], 
                    "item_name": daily_selection[1]["name"], 
                    "protein": daily_selection[1]["nutrition"]["protein"],
                    "image_url": daily_selection[1].get("image_url"),
                    "price": daily_selection[1].get("price"),
                    "canteen_id": daily_selection[1].get("canteen_id")
                }
            if len(daily_selection) > 2: 
                day_plan["dinner"] = {
                    "item_id": daily_selection[2]["item_id"], 
                    "item_name": daily_selection[2]["name"], 
                    "protein": daily_selection[2]["nutrition"]["protein"],
                    "image_url": daily_selection[2].get("image_url"),
                    "price": daily_selection[2].get("price"),
                    "canteen_id": daily_selection[2].get("canteen_id")
                }
            
            weekly_plan[day] = day_plan

        return {
            "daily_calories": 2000,
            "protein_target": target_protein,
            "tips": [
                f"Based on your goal, we optimized using Knapsack Algorithm.",
                f"Target Protein: {target_protein}g",
                f"Achieved Protein in Meal: {best_sum}g (Closest match)"
            ],
            "weekly_plan": weekly_plan
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

