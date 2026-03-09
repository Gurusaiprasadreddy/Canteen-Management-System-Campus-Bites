from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional

# ── Master Models ────────────────────────────────────────────────────────────

class AssignmentMenuItem(BaseModel):
    id: str
    name: str
    price: str
    prepTime: str
    itemType: str  # Veg / Non-Veg

class AssignmentStudent(BaseModel):
    id: str
    name: str
    rollNo: str
    email: str
    canteenPreference: str  # sopanam / mba / samudra

class AssignmentCanteen(BaseModel):
    id: str
    name: str
    location: str
    operatingHours: str
    status: str  # Open / Closed

# ── Transaction Models ───────────────────────────────────────────────────────

class AssignmentOrder(BaseModel):
    id: str
    studentId: str
    menuItemId: str
    quantity: int
    status: str  # Pending / Preparing / Ready / Completed

class AssignmentProteinGoal(BaseModel):
    id: str
    targetProtein: str
    budgetLimit: str

class AssignmentWellnessQuery(BaseModel):
    id: str
    studentId: str
    symptomInput: str
    aiResponse: str
    timestamp: str   # ISO date string

class AssignmentRecommendationLog(BaseModel):
    id: str
    studentId: str
    cartItems: str       # comma-separated item names
    recommendedItems: str  # comma-separated recommended item names
    algorithmUsed: str   # Apriori / Gemini / Smart-Rules

class AssignmentRecommendationFeedback(BaseModel):
    id: str
    recommendationId: str
    rating: int          # 1-5
    wasHelpful: str      # Yes / No


def get_assignment_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/api/assignment", tags=["assignment"])

    # ══════════════════════════════════════════
    # M1 — MENU ITEM MASTER
    # ══════════════════════════════════════════
    @router.get("/menu-items")
    async def get_menu_items():
        return await db.assignment_menu_items.find({}, {"_id": 0}).to_list(100)

    @router.get("/menu-items/{item_id}")
    async def get_menu_item(item_id: str):
        item = await db.assignment_menu_items.find_one({"id": item_id}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return item

    @router.post("/menu-items")
    async def create_menu_item(item: AssignmentMenuItem):
        if await db.assignment_menu_items.find_one({"id": item.id}):
            raise HTTPException(status_code=400, detail="Item ID already exists")
        await db.assignment_menu_items.insert_one(item.model_dump())
        return item

    @router.put("/menu-items/{item_id}")
    async def update_menu_item(item_id: str, item: AssignmentMenuItem):
        if not await db.assignment_menu_items.find_one({"id": item_id}):
            raise HTTPException(status_code=404, detail="Item not found")
        if item_id != item.id:
            if await db.assignment_menu_items.find_one({"id": item.id}):
                raise HTTPException(status_code=400, detail="New Item ID already exists")
            await db.assignment_orders.update_many({"menuItemId": item_id}, {"$set": {"menuItemId": item.id}})
        await db.assignment_menu_items.replace_one({"id": item_id}, item.model_dump())
        return item

    @router.delete("/menu-items/{item_id}")
    async def delete_menu_item(item_id: str):
        if await db.assignment_orders.find_one({"menuItemId": item_id}):
            raise HTTPException(status_code=400, detail="Cannot delete — referenced by an Order (FK Constraint)")
        result = await db.assignment_menu_items.delete_one({"id": item_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        return {"message": "Deleted"}

    # ══════════════════════════════════════════
    # M2 — STUDENT MASTER
    # ══════════════════════════════════════════
    @router.get("/students")
    async def get_students():
        return await db.assignment_students.find({}, {"_id": 0}).to_list(100)

    @router.get("/students/{student_id}")
    async def get_student(student_id: str):
        s = await db.assignment_students.find_one({"id": student_id}, {"_id": 0})
        if not s:
            raise HTTPException(status_code=404, detail="Student not found")
        return s

    @router.post("/students")
    async def create_student(student: AssignmentStudent):
        if await db.assignment_students.find_one({"id": student.id}):
            raise HTTPException(status_code=400, detail="Student ID already exists")
        if await db.assignment_students.find_one({"rollNo": student.rollNo}):
            raise HTTPException(status_code=400, detail="Roll No already exists")
        await db.assignment_students.insert_one(student.model_dump())
        return student

    @router.put("/students/{student_id}")
    async def update_student(student_id: str, student: AssignmentStudent):
        if not await db.assignment_students.find_one({"id": student_id}):
            raise HTTPException(status_code=404, detail="Student not found")
        await db.assignment_students.replace_one({"id": student_id}, student.model_dump())
        return student

    @router.delete("/students/{student_id}")
    async def delete_student(student_id: str):
        if await db.assignment_orders.find_one({"studentId": student_id}):
            raise HTTPException(status_code=400, detail="Cannot delete — Student has existing Orders (FK Constraint)")
        result = await db.assignment_students.delete_one({"id": student_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        return {"message": "Deleted"}

    # ══════════════════════════════════════════
    # M3 — CANTEEN MASTER
    # ══════════════════════════════════════════
    @router.get("/canteens")
    async def get_canteens():
        return await db.assignment_canteens.find({}, {"_id": 0}).to_list(100)

    @router.get("/canteens/{canteen_id}")
    async def get_canteen(canteen_id: str):
        c = await db.assignment_canteens.find_one({"id": canteen_id}, {"_id": 0})
        if not c:
            raise HTTPException(status_code=404, detail="Canteen not found")
        return c

    @router.post("/canteens")
    async def create_canteen(canteen: AssignmentCanteen):
        if await db.assignment_canteens.find_one({"id": canteen.id}):
            raise HTTPException(status_code=400, detail="Canteen ID already exists")
        await db.assignment_canteens.insert_one(canteen.model_dump())
        return canteen

    @router.put("/canteens/{canteen_id}")
    async def update_canteen(canteen_id: str, canteen: AssignmentCanteen):
        if not await db.assignment_canteens.find_one({"id": canteen_id}):
            raise HTTPException(status_code=404, detail="Canteen not found")
        await db.assignment_canteens.replace_one({"id": canteen_id}, canteen.model_dump())
        return canteen

    @router.delete("/canteens/{canteen_id}")
    async def delete_canteen(canteen_id: str):
        result = await db.assignment_canteens.delete_one({"id": canteen_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Canteen not found")
        return {"message": "Deleted"}

    # ══════════════════════════════════════════
    # T1 — ORDER TRANSACTION
    # ══════════════════════════════════════════
    @router.get("/orders")
    async def get_orders():
        return await db.assignment_orders.find({}, {"_id": 0}).to_list(100)

    @router.get("/orders/{order_id}")
    async def get_order(order_id: str):
        o = await db.assignment_orders.find_one({"id": order_id}, {"_id": 0})
        if not o:
            raise HTTPException(status_code=404, detail="Order not found")
        return o

    @router.post("/orders")
    async def create_order(order: AssignmentOrder):
        if await db.assignment_orders.find_one({"id": order.id}):
            raise HTTPException(status_code=400, detail="Order ID already exists")
        if not await db.assignment_menu_items.find_one({"id": order.menuItemId}):
            raise HTTPException(status_code=400, detail=f"Menu Item '{order.menuItemId}' not found (FK Constraint)")
        if not await db.assignment_students.find_one({"id": order.studentId}):
            raise HTTPException(status_code=400, detail=f"Student '{order.studentId}' not found (FK Constraint)")
        await db.assignment_orders.insert_one(order.model_dump())
        return order

    @router.put("/orders/{order_id}")
    async def update_order(order_id: str, order: AssignmentOrder):
        if not await db.assignment_orders.find_one({"id": order_id}):
            raise HTTPException(status_code=404, detail="Order not found")
        if not await db.assignment_menu_items.find_one({"id": order.menuItemId}):
            raise HTTPException(status_code=400, detail=f"Menu Item '{order.menuItemId}' not found (FK Constraint)")
        await db.assignment_orders.replace_one({"id": order_id}, order.model_dump())
        return order

    @router.delete("/orders/{order_id}")
    async def delete_order(order_id: str):
        if await db.assignment_recommendation_feedback.find_one({"recommendationId": order_id}):
            raise HTTPException(status_code=400, detail="Cannot delete — referenced by Feedback")
        result = await db.assignment_orders.delete_one({"id": order_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"message": "Deleted"}

    # ══════════════════════════════════════════
    # T2 — WELLNESS QUERY LOG
    # ══════════════════════════════════════════
    @router.get("/wellness-queries")
    async def get_wellness_queries():
        return await db.assignment_wellness_queries.find({}, {"_id": 0}).to_list(100)

    @router.get("/wellness-queries/{query_id}")
    async def get_wellness_query(query_id: str):
        q = await db.assignment_wellness_queries.find_one({"id": query_id}, {"_id": 0})
        if not q:
            raise HTTPException(status_code=404, detail="Query not found")
        return q

    @router.post("/wellness-queries")
    async def create_wellness_query(query: AssignmentWellnessQuery):
        if await db.assignment_wellness_queries.find_one({"id": query.id}):
            raise HTTPException(status_code=400, detail="Query ID already exists")
        if not await db.assignment_students.find_one({"id": query.studentId}):
            raise HTTPException(status_code=400, detail=f"Student '{query.studentId}' not found (FK Constraint)")
        await db.assignment_wellness_queries.insert_one(query.model_dump())
        return query

    @router.put("/wellness-queries/{query_id}")
    async def update_wellness_query(query_id: str, query: AssignmentWellnessQuery):
        if not await db.assignment_wellness_queries.find_one({"id": query_id}):
            raise HTTPException(status_code=404, detail="Query not found")
        await db.assignment_wellness_queries.replace_one({"id": query_id}, query.model_dump())
        return query

    @router.delete("/wellness-queries/{query_id}")
    async def delete_wellness_query(query_id: str):
        result = await db.assignment_wellness_queries.delete_one({"id": query_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Query not found")
        return {"message": "Deleted"}

    # ══════════════════════════════════════════
    # T3 — FOOD RECOMMENDATION LOG
    # ══════════════════════════════════════════
    @router.get("/recommendation-logs")
    async def get_recommendation_logs():
        return await db.assignment_recommendation_logs.find({}, {"_id": 0}).to_list(100)

    @router.get("/recommendation-logs/{log_id}")
    async def get_recommendation_log(log_id: str):
        log = await db.assignment_recommendation_logs.find_one({"id": log_id}, {"_id": 0})
        if not log:
            raise HTTPException(status_code=404, detail="Log not found")
        return log

    @router.post("/recommendation-logs")
    async def create_recommendation_log(log: AssignmentRecommendationLog):
        if await db.assignment_recommendation_logs.find_one({"id": log.id}):
            raise HTTPException(status_code=400, detail="Log ID already exists")
        if not await db.assignment_students.find_one({"id": log.studentId}):
            raise HTTPException(status_code=400, detail=f"Student '{log.studentId}' not found (FK Constraint)")
        await db.assignment_recommendation_logs.insert_one(log.model_dump())
        return log

    @router.put("/recommendation-logs/{log_id}")
    async def update_recommendation_log(log_id: str, log: AssignmentRecommendationLog):
        if not await db.assignment_recommendation_logs.find_one({"id": log_id}):
            raise HTTPException(status_code=404, detail="Log not found")
        await db.assignment_recommendation_logs.replace_one({"id": log_id}, log.model_dump())
        return log

    @router.delete("/recommendation-logs/{log_id}")
    async def delete_recommendation_log(log_id: str):
        if await db.assignment_recommendation_feedback.find_one({"recommendationId": log_id}):
            raise HTTPException(status_code=400, detail="Cannot delete — referenced by Feedback (FK Constraint)")
        result = await db.assignment_recommendation_logs.delete_one({"id": log_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Log not found")
        return {"message": "Deleted"}

    # ══════════════════════════════════════════
    # T4 — RECOMMENDATION FEEDBACK
    # ══════════════════════════════════════════
    @router.get("/recommendation-feedback")
    async def get_recommendation_feedback():
        return await db.assignment_recommendation_feedback.find({}, {"_id": 0}).to_list(100)

    @router.get("/recommendation-feedback/{fb_id}")
    async def get_feedback(fb_id: str):
        fb = await db.assignment_recommendation_feedback.find_one({"id": fb_id}, {"_id": 0})
        if not fb:
            raise HTTPException(status_code=404, detail="Feedback not found")
        return fb

    @router.post("/recommendation-feedback")
    async def create_feedback(fb: AssignmentRecommendationFeedback):
        if await db.assignment_recommendation_feedback.find_one({"id": fb.id}):
            raise HTTPException(status_code=400, detail="Feedback ID already exists")
        if not await db.assignment_recommendation_logs.find_one({"id": fb.recommendationId}):
            raise HTTPException(status_code=400, detail=f"Recommendation Log '{fb.recommendationId}' not found (FK Constraint)")
        await db.assignment_recommendation_feedback.insert_one(fb.model_dump())
        return fb

    @router.put("/recommendation-feedback/{fb_id}")
    async def update_feedback(fb_id: str, fb: AssignmentRecommendationFeedback):
        if not await db.assignment_recommendation_feedback.find_one({"id": fb_id}):
            raise HTTPException(status_code=404, detail="Feedback not found")
        if not await db.assignment_recommendation_logs.find_one({"id": fb.recommendationId}):
            raise HTTPException(status_code=400, detail=f"Recommendation Log '{fb.recommendationId}' not found (FK Constraint)")
        await db.assignment_recommendation_feedback.replace_one({"id": fb_id}, fb.model_dump())
        return fb

    @router.delete("/recommendation-feedback/{fb_id}")
    async def delete_feedback(fb_id: str):
        result = await db.assignment_recommendation_feedback.delete_one({"id": fb_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Feedback not found")
        return {"message": "Deleted"}

    # ══════════════════════════════════════════
    # PROTEIN GOALS TABLE (kept for compatibility)
    # ══════════════════════════════════════════
    @router.get("/protein-goals")
    async def get_protein_goals():
        return await db.assignment_protein_goals.find({}, {"_id": 0}).to_list(100)

    @router.post("/protein-goals")
    async def create_protein_goal(goal: AssignmentProteinGoal):
        if await db.assignment_protein_goals.find_one({"id": goal.id}):
            raise HTTPException(status_code=400, detail="Goal ID already exists")
        await db.assignment_protein_goals.insert_one(goal.model_dump())
        return goal

    @router.put("/protein-goals/{goal_id}")
    async def update_protein_goal(goal_id: str, goal: AssignmentProteinGoal):
        if not await db.assignment_protein_goals.find_one({"id": goal_id}):
            raise HTTPException(status_code=404, detail="Goal not found")
        await db.assignment_protein_goals.replace_one({"id": goal_id}, goal.model_dump())
        return goal

    @router.delete("/protein-goals/{goal_id}")
    async def delete_protein_goal(goal_id: str):
        result = await db.assignment_protein_goals.delete_one({"id": goal_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Goal not found")
        return {"message": "Deleted"}

    return router


class AssignmentProteinGoal(BaseModel):
    id: str
    targetProtein: str
    budgetLimit: str

class AssignmentOrder(BaseModel):
    id: str
    menuItemId: str
    quantity: int
    instructions: str

def get_assignment_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/api/assignment", tags=["assignment"])

    # ==========================
    # MENU ITEMS TABLE
    # ==========================
    @router.get("/menu-items")
    async def get_menu_items():
        items = await db.assignment_menu_items.find({}, {"_id": 0}).to_list(100)
        return items

    @router.post("/menu-items")
    async def create_menu_item(item: AssignmentMenuItem):
        existing = await db.assignment_menu_items.find_one({"id": item.id})
        if existing:
            raise HTTPException(status_code=400, detail="Item ID already exists")
        await db.assignment_menu_items.insert_one(item.model_dump())
        return item

    @router.put("/menu-items/{item_id}")
    async def update_menu_item(item_id: str, item: AssignmentMenuItem):
        existing = await db.assignment_menu_items.find_one({"id": item_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Item not found")
            
        if item_id != item.id:
            collision = await db.assignment_menu_items.find_one({"id": item.id})
            if collision:
                raise HTTPException(status_code=400, detail="New Item ID already exists")
                
            # NESTED OPERATION (CASCADE UPDATE): 
            # If a Menu Item ID changes, we must cascade that change to the Orders table.
            await db.assignment_orders.update_many(
                {"menuItemId": item_id},
                {"$set": {"menuItemId": item.id}}
            )

        await db.assignment_menu_items.replace_one({"id": item_id}, item.model_dump())
        return item

    @router.delete("/menu-items/{item_id}")
    async def delete_menu_item(item_id: str):
        # NESTED OPERATION (RESTRICT DELETE):
        # Prevent deletion if the Primary Key is being referenced in the Orders table (Foreign Key Constraint).
        existing_order = await db.assignment_orders.find_one({"menuItemId": item_id})
        if existing_order:
            raise HTTPException(status_code=400, detail="Integrity Error: Cannot delete Menu Item. It is currently referenced by an existing Order (Foreign Key Constraint violation).")
            
        result = await db.assignment_menu_items.delete_one({"id": item_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        return {"message": "Deleted"}

    # ==========================
    # PROTEIN GOALS TABLE
    # ==========================
    @router.get("/protein-goals")
    async def get_protein_goals():
        goals = await db.assignment_protein_goals.find({}, {"_id": 0}).to_list(100)
        return goals

    @router.post("/protein-goals")
    async def create_protein_goal(goal: AssignmentProteinGoal):
        existing = await db.assignment_protein_goals.find_one({"id": goal.id})
        if existing:
            raise HTTPException(status_code=400, detail="Goal ID already exists")
        await db.assignment_protein_goals.insert_one(goal.model_dump())
        return goal

    @router.put("/protein-goals/{goal_id}")
    async def update_protein_goal(goal_id: str, goal: AssignmentProteinGoal):
        existing = await db.assignment_protein_goals.find_one({"id": goal_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Goal not found")
            
        if goal_id != goal.id:
            collision = await db.assignment_protein_goals.find_one({"id": goal.id})
            if collision:
                raise HTTPException(status_code=400, detail="New Goal ID already exists")
        
        await db.assignment_protein_goals.replace_one({"id": goal_id}, goal.model_dump())
        return goal

    @router.delete("/protein-goals/{goal_id}")
    async def delete_protein_goal(goal_id: str):
        result = await db.assignment_protein_goals.delete_one({"id": goal_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Goal not found")
        return {"message": "Deleted"}

    # ==========================
    # ORDERS TABLE
    # ==========================
    @router.get("/orders")
    async def get_orders():
        orders = await db.assignment_orders.find({}, {"_id": 0}).to_list(100)
        return orders

    @router.post("/orders")
    async def create_order(order: AssignmentOrder):
        existing = await db.assignment_orders.find_one({"id": order.id})
        if existing:
            raise HTTPException(status_code=400, detail="Order ID already exists")
            
        # NESTED OPERATION (FOREIGN KEY CHECK): Does the Menu Item exist in the reference table?
        menu_item = await db.assignment_menu_items.find_one({"id": order.menuItemId})
        if not menu_item:
            raise HTTPException(status_code=400, detail=f"Integrity Error: Menu Item ID '{order.menuItemId}' does not exist in Menu Items table.")
            
        # NESTED OPERATION (TRIGGER-LIKE ACTION): Deduct price from Protein Goal Budget limit if present
        # Mocking finding the generic active user goal
        goal = await db.assignment_protein_goals.find_one()
        if goal:
            try:
                item_price = float(menu_item.get('price', 0))
                current_budget = float(goal.get('budgetLimit', 0))
                new_budget = current_budget - (item_price * order.quantity)
                
                await db.assignment_protein_goals.update_one(
                    {"id": goal['id']},
                    {"$set": {"budgetLimit": str(max(new_budget, 0))}}
                )
            except ValueError:
                pass # If price or budget isn't numeric, skip this nested operation

        await db.assignment_orders.insert_one(order.model_dump())
        return order

    @router.put("/orders/{order_id}")
    async def update_order(order_id: str, order: AssignmentOrder):
        existing = await db.assignment_orders.find_one({"id": order_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Order not found")
            
        if order_id != order.id:
            collision = await db.assignment_orders.find_one({"id": order.id})
            if collision:
                raise HTTPException(status_code=400, detail="New Order ID already exists")
                
        # NESTED OPERATION (FOREIGN KEY CHECK)
        menu_item = await db.assignment_menu_items.find_one({"id": order.menuItemId})
        if not menu_item:
            raise HTTPException(status_code=400, detail=f"Integrity Error: Menu Item ID '{order.menuItemId}' does not exist.")
            
        await db.assignment_orders.replace_one({"id": order_id}, order.model_dump())
        return order

    @router.delete("/orders/{order_id}")
    async def delete_order(order_id: str):
        result = await db.assignment_orders.delete_one({"id": order_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"message": "Deleted"}

    return router
