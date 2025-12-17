from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
from typing import List, Dict, Any
import json
import asyncio

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

class AIService:
    def __init__(self):
        self.api_key = EMERGENT_LLM_KEY
    
    async def get_collaborative_recommendations(self, student_order_history: List[Dict], available_items: List[Dict]) -> List[Dict]:
        """Get AI recommendations based on order history and available items"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"collab_{id(student_order_history)}",
                system_message="You are a food recommendation expert. Analyze order history and suggest similar items."
            ).with_model("openai", "gpt-4o")
            
            prompt = f"""Based on this student's order history:
{json.dumps(student_order_history, indent=2)}

And these available menu items:
{json.dumps(available_items, indent=2)}

Provide 5 personalized food recommendations. Return ONLY a JSON array with this exact format:
[
  {{
    "item_id": "string",
    "item_name": "string",
    "reason": "Brief reason for recommendation",
    "confidence": 0.9
  }}
]

No additional text, only the JSON array."""
            
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            # Parse JSON from response
            try:
                recommendations = json.loads(response)
                return recommendations
            except json.JSONDecodeError:
                # Try to extract JSON from response
                import re
                json_match = re.search(r'\[.*\]', response, re.DOTALL)
                if json_match:
                    recommendations = json.loads(json_match.group())
                    return recommendations
                return []
        except Exception as e:
            print(f"Error in collaborative recommendations: {e}")
            return []
    
    async def get_symptom_recommendations(self, symptom: str, available_items: List[Dict]) -> Dict:
        """Get meal recommendations based on symptoms"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"symptom_{symptom}",
                system_message="You are a nutritionist expert. Recommend foods based on health symptoms."
            ).with_model("openai", "gpt-4o")
            
            prompt = f"""A student is experiencing: {symptom}

Available canteen items with full nutrition:
{json.dumps(available_items, indent=2)}

Provide:
1. Best meal recommendations (with item IDs)
2. Foods to avoid
3. Brief explanation of why these foods help

Return ONLY a JSON object with this exact format:
{{
  "recommended_items": [
    {{
      "item_id": "string",
      "item_name": "string",
      "reason": "Why it helps with {symptom}"
    }}
  ],
  "avoid": ["item names to avoid"],
  "explanation": "Brief overall explanation"
}}

No additional text, only the JSON object."""
            
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            try:
                result = json.loads(response)
                return result
            except json.JSONDecodeError:
                import re
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                    return result
                return {"recommended_items": [], "avoid": [], "explanation": "Unable to process recommendation"}
        except Exception as e:
            print(f"Error in symptom recommendations: {e}")
            return {"recommended_items": [], "avoid": [], "explanation": "Error processing recommendation"}
    
    async def generate_weekly_diet_plan(self, goal: str, current_weight: float, target_weight: float, available_items: List[Dict]) -> Dict:
        """Generate a weekly diet plan based on gym goals"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"gym_{goal}",
                system_message="You are a fitness nutritionist. Create detailed weekly meal plans using available canteen food."
            ).with_model("openai", "gpt-4o")
            
            prompt = f"""Create a 7-day diet plan for a student with these details:
- Goal: {goal}
- Current Weight: {current_weight} kg
- Target Weight: {target_weight} kg

Available canteen items with full nutrition:
{json.dumps(available_items, indent=2)}

Create a realistic weekly plan using ONLY these available items. Return ONLY a JSON object with this exact format:
{{
  "weekly_plan": {{
    "monday": {{
      "breakfast": {{"item_id": "string", "item_name": "string", "portion": "string"}},
      "lunch": {{"item_id": "string", "item_name": "string", "portion": "string"}},
      "snack": {{"item_id": "string", "item_name": "string", "portion": "string"}},
      "dinner": {{"item_id": "string", "item_name": "string", "portion": "string"}}
    }},
    "tuesday": {{ "Same structure" }},
    "wednesday": {{ "Same structure" }},
    "thursday": {{ "Same structure" }},
    "friday": {{ "Same structure" }},
    "saturday": {{ "Same structure" }},
    "sunday": {{ "Same structure" }}
  }},
  "daily_calories": 2000,
  "protein_target": 150,
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}}

No additional text, only the JSON object."""
            
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            try:
                plan = json.loads(response)
                return plan
            except json.JSONDecodeError:
                import re
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    plan = json.loads(json_match.group())
                    return plan
                return {"weekly_plan": {}, "daily_calories": 2000, "protein_target": 100, "tips": []}
        except Exception as e:
            print(f"Error in weekly diet plan: {e}")
            return {"weekly_plan": {}, "daily_calories": 2000, "protein_target": 100, "tips": []}

ai_service = AIService()
