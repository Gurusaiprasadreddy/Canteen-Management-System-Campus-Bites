from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional

class AssignmentMenuItem(BaseModel):
    id: str
    name: str
    price: str
    prepTime: str
    itemType: str

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
