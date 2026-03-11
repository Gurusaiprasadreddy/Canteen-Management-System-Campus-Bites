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

# ── MY MODULE MODELS (Management, Crew, User Management, Spending Analytics) ──

class MyManagementAccount(BaseModel):
    id: str
    name: str
    email: str
    canteenAssigned: str   # sopanam / mba / samudra / all
    accessLevel: str       # Admin / Manager / Viewer

class MyCrewMember(BaseModel):
    id: str
    name: str
    canteenId: str         # sopanam / mba / samudra
    shift: str             # Morning / Afternoon / Evening
    contactNumber: str

class MyUserAccount(BaseModel):
    id: str
    name: str
    email: str
    role: str              # student / management / crew
    status: str            # Active / Inactive / Suspended

class MyCrewOrderAssignment(BaseModel):
    id: str
    crewId: str            # FK → MyCrewMember
    managerId: str         # FK → MyManagementAccount
    orderId: str
    canteenId: str
    assignedAt: str        # ISO datetime

class MySpendingBudget(BaseModel):
    id: str
    userId: str            # FK → MyUserAccount
    monthYear: str         # e.g. 2025-03
    budgetLimit: str       # in ₹
    amountSpent: str       # in ₹
    alertThreshold: str    # percentage e.g. 80

class MySpendingReport(BaseModel):
    id: str
    userId: str            # FK → MyUserAccount
    period: str            # Weekly / Monthly
    totalSpent: str
    topCanteen: str
    topCategory: str
    generatedAt: str       # ISO datetime

class MyUserActivityLog(BaseModel):
    id: str
    userId: str            # FK → MyUserAccount
    action: str            # Login / Order Placed / Budget Set / Profile Updated
    details: str
    timestamp: str         # ISO datetime


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

    # ══════════════════════════════════════════════════════════════
    # MY MODULE FORMS — Management, Crew, User Management, Spending
    # ══════════════════════════════════════════════════════════════

    # M1 — MANAGEMENT ACCOUNT MASTER
    @router.get("/management-accounts")
    async def get_management_accounts():
        return await db.my_management_accounts.find({}, {"_id": 0}).to_list(100)

    @router.get("/management-accounts/{acc_id}")
    async def get_management_account(acc_id: str):
        rec = await db.my_management_accounts.find_one({"id": acc_id}, {"_id": 0})
        if not rec:
            raise HTTPException(status_code=404, detail="Management Account not found")
        return rec

    @router.post("/management-accounts")
    async def create_management_account(acc: MyManagementAccount):
        if await db.my_management_accounts.find_one({"id": acc.id}):
            raise HTTPException(status_code=400, detail="Account ID already exists")
        if await db.my_management_accounts.find_one({"email": acc.email}):
            raise HTTPException(status_code=400, detail="Email already registered")
        await db.my_management_accounts.insert_one(acc.model_dump())
        return acc

    @router.put("/management-accounts/{acc_id}")
    async def update_management_account(acc_id: str, acc: MyManagementAccount):
        if not await db.my_management_accounts.find_one({"id": acc_id}):
            raise HTTPException(status_code=404, detail="Account not found")
        await db.my_management_accounts.replace_one({"id": acc_id}, acc.model_dump())
        return acc

    @router.delete("/management-accounts/{acc_id}")
    async def delete_management_account(acc_id: str):
        if await db.my_crew_order_assignments.find_one({"managerId": acc_id}):
            raise HTTPException(status_code=400, detail="Cannot delete — Manager has active Crew Assignments (FK Constraint)")
        result = await db.my_management_accounts.delete_one({"id": acc_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Account not found")
        return {"message": "Deleted"}

    # M2 — CREW MEMBER MASTER
    @router.get("/crew-members")
    async def get_crew_members():
        return await db.my_crew_members.find({}, {"_id": 0}).to_list(100)

    @router.get("/crew-members/{crew_id}")
    async def get_crew_member(crew_id: str):
        rec = await db.my_crew_members.find_one({"id": crew_id}, {"_id": 0})
        if not rec:
            raise HTTPException(status_code=404, detail="Crew Member not found")
        return rec

    @router.post("/crew-members")
    async def create_crew_member(crew: MyCrewMember):
        if await db.my_crew_members.find_one({"id": crew.id}):
            raise HTTPException(status_code=400, detail="Crew ID already exists")
        await db.my_crew_members.insert_one(crew.model_dump())
        return crew

    @router.put("/crew-members/{crew_id}")
    async def update_crew_member(crew_id: str, crew: MyCrewMember):
        if not await db.my_crew_members.find_one({"id": crew_id}):
            raise HTTPException(status_code=404, detail="Crew Member not found")
        await db.my_crew_members.replace_one({"id": crew_id}, crew.model_dump())
        return crew

    @router.delete("/crew-members/{crew_id}")
    async def delete_crew_member(crew_id: str):
        if await db.my_crew_order_assignments.find_one({"crewId": crew_id}):
            raise HTTPException(status_code=400, detail="Cannot delete — Crew Member has active Order Assignments (FK Constraint)")
        result = await db.my_crew_members.delete_one({"id": crew_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Crew Member not found")
        return {"message": "Deleted"}

    # M3 — USER ACCOUNT MASTER
    @router.get("/user-accounts")
    async def get_user_accounts():
        return await db.my_user_accounts.find({}, {"_id": 0}).to_list(100)

    @router.get("/user-accounts/{user_id}")
    async def get_user_account(user_id: str):
        rec = await db.my_user_accounts.find_one({"id": user_id}, {"_id": 0})
        if not rec:
            raise HTTPException(status_code=404, detail="User Account not found")
        return rec

    @router.post("/user-accounts")
    async def create_user_account(user: MyUserAccount):
        if await db.my_user_accounts.find_one({"id": user.id}):
            raise HTTPException(status_code=400, detail="User ID already exists")
        if await db.my_user_accounts.find_one({"email": user.email}):
            raise HTTPException(status_code=400, detail="Email already registered")
        await db.my_user_accounts.insert_one(user.model_dump())
        return user

    @router.put("/user-accounts/{user_id}")
    async def update_user_account(user_id: str, user: MyUserAccount):
        if not await db.my_user_accounts.find_one({"id": user_id}):
            raise HTTPException(status_code=404, detail="User Account not found")
        await db.my_user_accounts.replace_one({"id": user_id}, user.model_dump())
        return user

    @router.delete("/user-accounts/{user_id}")
    async def delete_user_account(user_id: str):
        if await db.my_user_activity_logs.find_one({"userId": user_id}):
            raise HTTPException(status_code=400, detail="Cannot delete — User has Activity Logs (FK Constraint)")
        result = await db.my_user_accounts.delete_one({"id": user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User Account not found")
        return {"message": "Deleted"}

    # T1 — CREW ORDER ASSIGNMENT TRANSACTION
    @router.get("/crew-order-assignments")
    async def get_crew_order_assignments():
        return await db.my_crew_order_assignments.find({}, {"_id": 0}).to_list(100)

    @router.get("/crew-order-assignments/{assign_id}")
    async def get_crew_order_assignment(assign_id: str):
        rec = await db.my_crew_order_assignments.find_one({"id": assign_id}, {"_id": 0})
        if not rec:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return rec

    @router.post("/crew-order-assignments")
    async def create_crew_order_assignment(assign: MyCrewOrderAssignment):
        if await db.my_crew_order_assignments.find_one({"id": assign.id}):
            raise HTTPException(status_code=400, detail="Assignment ID already exists")
        if not await db.my_crew_members.find_one({"id": assign.crewId}):
            raise HTTPException(status_code=400, detail=f"Crew Member '{assign.crewId}' not found (FK Constraint)")
        if not await db.my_management_accounts.find_one({"id": assign.managerId}):
            raise HTTPException(status_code=400, detail=f"Manager Account '{assign.managerId}' not found (FK Constraint)")
        await db.my_crew_order_assignments.insert_one(assign.model_dump())
        return assign

    @router.put("/crew-order-assignments/{assign_id}")
    async def update_crew_order_assignment(assign_id: str, assign: MyCrewOrderAssignment):
        if not await db.my_crew_order_assignments.find_one({"id": assign_id}):
            raise HTTPException(status_code=404, detail="Assignment not found")
        if not await db.my_crew_members.find_one({"id": assign.crewId}):
            raise HTTPException(status_code=400, detail=f"Crew Member '{assign.crewId}' not found (FK Constraint)")
        await db.my_crew_order_assignments.replace_one({"id": assign_id}, assign.model_dump())
        return assign

    @router.delete("/crew-order-assignments/{assign_id}")
    async def delete_crew_order_assignment(assign_id: str):
        result = await db.my_crew_order_assignments.delete_one({"id": assign_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return {"message": "Deleted"}

    # T2 — SPENDING BUDGET TRANSACTION
    @router.get("/spending-budgets")
    async def get_spending_budgets():
        return await db.my_spending_budgets.find({}, {"_id": 0}).to_list(100)

    @router.get("/spending-budgets/{budget_id}")
    async def get_spending_budget(budget_id: str):
        rec = await db.my_spending_budgets.find_one({"id": budget_id}, {"_id": 0})
        if not rec:
            raise HTTPException(status_code=404, detail="Budget not found")
        return rec

    @router.post("/spending-budgets")
    async def create_spending_budget(budget: MySpendingBudget):
        if await db.my_spending_budgets.find_one({"id": budget.id}):
            raise HTTPException(status_code=400, detail="Budget ID already exists")
        if not await db.my_user_accounts.find_one({"id": budget.userId}):
            raise HTTPException(status_code=400, detail=f"User '{budget.userId}' not found (FK Constraint)")
        await db.my_spending_budgets.insert_one(budget.model_dump())
        return budget

    @router.put("/spending-budgets/{budget_id}")
    async def update_spending_budget(budget_id: str, budget: MySpendingBudget):
        if not await db.my_spending_budgets.find_one({"id": budget_id}):
            raise HTTPException(status_code=404, detail="Budget not found")
        if not await db.my_user_accounts.find_one({"id": budget.userId}):
            raise HTTPException(status_code=400, detail=f"User '{budget.userId}' not found (FK Constraint)")
        await db.my_spending_budgets.replace_one({"id": budget_id}, budget.model_dump())
        return budget

    @router.delete("/spending-budgets/{budget_id}")
    async def delete_spending_budget(budget_id: str):
        result = await db.my_spending_budgets.delete_one({"id": budget_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Budget not found")
        return {"message": "Deleted"}

    # T3 — SPENDING REPORT TRANSACTION
    @router.get("/spending-reports")
    async def get_spending_reports():
        return await db.my_spending_reports.find({}, {"_id": 0}).to_list(100)

    @router.get("/spending-reports/{report_id}")
    async def get_spending_report(report_id: str):
        rec = await db.my_spending_reports.find_one({"id": report_id}, {"_id": 0})
        if not rec:
            raise HTTPException(status_code=404, detail="Report not found")
        return rec

    @router.post("/spending-reports")
    async def create_spending_report(report: MySpendingReport):
        if await db.my_spending_reports.find_one({"id": report.id}):
            raise HTTPException(status_code=400, detail="Report ID already exists")
        if not await db.my_user_accounts.find_one({"id": report.userId}):
            raise HTTPException(status_code=400, detail=f"User '{report.userId}' not found (FK Constraint)")
        await db.my_spending_reports.insert_one(report.model_dump())
        return report

    @router.put("/spending-reports/{report_id}")
    async def update_spending_report(report_id: str, report: MySpendingReport):
        if not await db.my_spending_reports.find_one({"id": report_id}):
            raise HTTPException(status_code=404, detail="Report not found")
        await db.my_spending_reports.replace_one({"id": report_id}, report.model_dump())
        return report

    @router.delete("/spending-reports/{report_id}")
    async def delete_spending_report(report_id: str):
        result = await db.my_spending_reports.delete_one({"id": report_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Report not found")
        return {"message": "Deleted"}

    # T4 — USER ACTIVITY LOG TRANSACTION
    @router.get("/user-activity-logs")
    async def get_user_activity_logs():
        return await db.my_user_activity_logs.find({}, {"_id": 0}).to_list(100)

    @router.get("/user-activity-logs/{log_id}")
    async def get_user_activity_log(log_id: str):
        rec = await db.my_user_activity_logs.find_one({"id": log_id}, {"_id": 0})
        if not rec:
            raise HTTPException(status_code=404, detail="Log not found")
        return rec

    @router.post("/user-activity-logs")
    async def create_user_activity_log(log: MyUserActivityLog):
        if await db.my_user_activity_logs.find_one({"id": log.id}):
            raise HTTPException(status_code=400, detail="Log ID already exists")
        if not await db.my_user_accounts.find_one({"id": log.userId}):
            raise HTTPException(status_code=400, detail=f"User '{log.userId}' not found (FK Constraint)")
        await db.my_user_activity_logs.insert_one(log.model_dump())
        return log

    @router.put("/user-activity-logs/{log_id}")
    async def update_user_activity_log(log_id: str, log: MyUserActivityLog):
        if not await db.my_user_activity_logs.find_one({"id": log_id}):
            raise HTTPException(status_code=404, detail="Log not found")
        await db.my_user_activity_logs.replace_one({"id": log_id}, log.model_dump())
        return log

    @router.delete("/user-activity-logs/{log_id}")
    async def delete_user_activity_log(log_id: str):
        result = await db.my_user_activity_logs.delete_one({"id": log_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Log not found")
        return {"message": "Deleted"}

    return router
