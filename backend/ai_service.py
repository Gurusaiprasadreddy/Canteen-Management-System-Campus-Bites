from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
from typing import List, Dict, Any
import json
import re

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

class AIService:
    def __init__(self):
        self.api_key = EMERGENT_LLM_KEY
        if not self.api_key:
            print("WARNING: EMERGENT_LLM_KEY not set!")
    
    def extract_json(self, text: str, expected_type='object'):
        """Extract JSON from text response"""
        try:
            # Try direct parse
            return json.loads(text)
        except:
            # Extract JSON with regex
            if expected_type == 'array':
                match = re.search(r'\[.*\]', text, re.DOTALL)
            else:
                match = re.search(r'\{.*\}', text, re.DOTALL)
            
            if match:
                try:
                    return json.loads(match.group())
                except:
                    pass
        return None
    
    async def get_symptom_recommendations(self, symptom: str, available_items: List[Dict]) -> Dict:
        """Get meal recommendations based on symptoms"""
        if not self.api_key:
            return {
                "recommended_items": [
                    {"item_id": "item_sopanam_001", "item_name": "Idli (2 pcs)", "reason": "Light, easy to digest, gentle on stomach"},
                    {"item_id": "item_samudra_005", "item_name": "Buttermilk", "reason": "Cooling effect, helps with digestion"}
                ],
                "avoid": ["Spicy food", "Fried items"],
                "explanation": f"For {symptom}, I recommend light and easily digestible foods. The items shown are gentle on your system."
            }
        
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"symptom_{symptom[:20]}",
                system_message="You are a helpful nutritionist. Provide practical food recommendations from the available menu items."
            ).with_model("openai", "gpt-4o")
            
            # Simplify the items data for the prompt
            simple_items = [{"item_id": item["item_id"], "name": item["name"], "nutrition": item["nutrition"]} for item in available_items[:15]]
            
            prompt = f"""A student has this symptom: {symptom}

Available items: {json.dumps(simple_items, indent=2)}

Recommend 3 best food items that help with this symptom. Return this EXACT JSON format:
{{
  "recommended_items": [
    {{"item_id": "item_sopanam_001", "item_name": "Idli (2 pcs)", "reason": "why it helps"}}
  ],
  "avoid": ["food1", "food2"],
  "explanation": "brief explanation"
}}"""
            
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            result = self.extract_json(response, 'object')
            if result and 'recommended_items' in result:
                return result
            
            # Fallback response
            return {
                "recommended_items": [
                    {"item_id": available_items[0]["item_id"], "item_name": available_items[0]["name"], "reason": "Light and nutritious option"}
                ],
                "avoid": [],
                "explanation": f"For {symptom}, try light and nutritious meals from our menu."
            }
            
        except Exception as e:
            print(f"AI Error: {e}")
            # Return fallback recommendations
            return {
                "recommended_items": [
                    {"item_id": available_items[0]["item_id"], "item_name": available_items[0]["name"], "reason": "Recommended by our system"} if available_items else {"item_id": "item_sopanam_001", "item_name": "Idli", "reason": "Light meal"}
                ],
                "avoid": [],
                "explanation": f"For {symptom}, we recommend light and nutritious meals."
            }
    
    async def generate_weekly_diet_plan(self, goal: str, current_weight: float, target_weight: float, available_items: List[Dict], **kwargs) -> Dict:
        """Generate a weekly diet plan"""
        protein_goal = kwargs.get('protein_goal', 150)
        carbs_goal = kwargs.get('carbs_goal', 250)
        calories_goal = kwargs.get('calories_goal', 2500)
        
        if not self.api_key:
            return {
                "daily_calories": calories_goal,
                "protein_target": protein_goal,
                "tips": [
                    f"Aim for {protein_goal}g protein daily",
                    f"Keep carbs around {carbs_goal}g per day",
                    "Eat 5-6 small meals throughout the day"
                ],
                "weekly_plan": {}
            }
        
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"diet_{goal}",
                system_message="You are a fitness nutritionist. Create practical meal plans using available canteen food."
            ).with_model("openai", "gpt-4o")
            
            # Simplify items
            simple_items = [{"item_id": item["item_id"], "name": item["name"], "nutrition": item["nutrition"]} for item in available_items[:20]]
            
            prompt = f"""Create a simple 3-day meal plan with these goals:
- Protein: {protein_goal}g/day
- Carbs: {carbs_goal}g/day  
- Calories: {calories_goal}/day

Available items: {json.dumps(simple_items, indent=2)}

Return this EXACT JSON format:
{{
  "daily_calories": {calories_goal},
  "protein_target": {protein_goal},
  "tips": ["tip1", "tip2", "tip3"],
  "weekly_plan": {{
    "monday": {{
      "breakfast": {{"item_id": "id", "item_name": "name", "portion": "1 serving"}},
      "lunch": {{"item_id": "id", "item_name": "name", "portion": "1 serving"}},
      "dinner": {{"item_id": "id", "item_name": "name", "portion": "1 serving"}}
    }},
    "tuesday": {{"breakfast": {{}}, "lunch": {{}}, "dinner": {{}}}},
    "wednesday": {{"breakfast": {{}}, "lunch": {{}}, "dinner": {{}}}}
  }}
}}"""
            
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            result = self.extract_json(response, 'object')
            if result and 'weekly_plan' in result:
                return result
            
            # Fallback
            return {
                "daily_calories": calories_goal,
                "protein_target": protein_goal,
                "tips": [
                    f"Target {protein_goal}g protein daily from lean sources",
                    f"Maintain {carbs_goal}g carbs for energy",
                    "Stay hydrated with 3-4 liters of water",
                    "Eat every 3-4 hours to maintain metabolism"
                ],
                "weekly_plan": {}
            }
            
        except Exception as e:
            print(f"AI Error: {e}")
            return {
                "daily_calories": calories_goal,
                "protein_target": protein_goal,
                "tips": [
                    f"Aim for {protein_goal}g protein daily",
                    f"Target {carbs_goal}g carbs per day",
                    "Eat 5-6 meals throughout the day",
                    "Stay hydrated"
                ],
                "weekly_plan": {}
            }

ai_service = AIService()
