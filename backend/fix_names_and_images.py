import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

BASE_IMAGE_DIR = ROOT_DIR / "static" / "food_images"
BASE_URL = "http://localhost:8001"

# ─── Name fixes: old name → correct name ──────────────────────────────────────
NAME_FIXES = {
    # Masala prefix on already-named items
    "Masala Masala Tea":      "Masala Tea",
    "Masala Filter Coffee":   "Filter Coffee",
    "Masala Masala Dosa":     "Masala Dosa",

    # Spicy prefix where it makes no sense
    "Spicy Lime Juice":       "Lime Juice",
    "Spicy Masala Tea":       "Masala Tea",
    "Spicy Filter Coffee":    "Filter Coffee",
    "Spicy Masala Dosa":      "Masala Dosa",

    # Butter prefix where it makes no sense
    "Butter Filter Coffee":   "Filter Coffee",
    "Butter Masala Tea":      "Masala Tea",
    "Butter Lime Juice":      "Lime Juice",
    "Butter Masala Dosa":     "Masala Dosa",

    # Ghee prefix where it makes no sense
    "Ghee Masala Tea":        "Masala Tea",
    "Ghee Filter Coffee":     "Filter Coffee",
    "Ghee Lime Juice":        "Lime Juice",
}

# ─── Image helpers ────────────────────────────────────────────────────────────
def determine_image(name: str) -> str | None:
    """Return a /static/... URL if a matching image file exists."""
    term = name.lower().strip()

    # 1. Exact match: "masala tea" → "masala tea.jpg"
    for ext in (".jpg", ".jpeg", ".png"):
        p = BASE_IMAGE_DIR / f"{term}{ext}"
        if p.exists():
            return f"{BASE_URL}/static/food_images/{p.name}"

    # 2. No-space match: "masaladosa.jpg"
    no_space = term.replace(" ", "")
    for ext in (".jpg", ".jpeg", ".png"):
        p = BASE_IMAGE_DIR / f"{no_space}{ext}"
        if p.exists():
            return f"{BASE_URL}/static/food_images/{p.name}"

    # 3. Fuzzy: term appears inside filename or vice-versa
    try:
        for fname in os.listdir(BASE_IMAGE_DIR):
            if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            base = os.path.splitext(fname)[0].lower()
            if term in base or base in term:
                return f"{BASE_URL}/static/food_images/{fname}"
    except Exception:
        pass

    return None  # No image found – leave existing value


# ─── Main ─────────────────────────────────────────────────────────────────────
async def fix_all():
    # ── 1. Fix bad names ──────────────────────────────────────────────────────
    print("🔧 Fixing bad menu item names…")
    name_fix_count = 0
    duplicate_removed = 0

    for bad_name, good_name in NAME_FIXES.items():
        # Check how many items have the bad name
        bad_docs = await db.menu_items.find({"name": bad_name}).to_list(None)
        if not bad_docs:
            continue

        for doc in bad_docs:
            canteen_id = doc.get("canteen_id")
            # Does a correct-name item already exist in the same canteen?
            exists = await db.menu_items.find_one(
                {"name": good_name, "canteen_id": canteen_id}
            )
            if exists:
                # Remove the duplicate
                await db.menu_items.delete_one({"_id": doc["_id"]})
                print(f"  🗑  Removed duplicate '{bad_name}' ({canteen_id}) — '{good_name}' already exists")
                duplicate_removed += 1
            else:
                # Rename
                await db.menu_items.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"name": good_name}}
                )
                print(f"  ✅ Renamed '{bad_name}' → '{good_name}' ({canteen_id})")
                name_fix_count += 1

    print(f"\n  Done: {name_fix_count} renamed, {duplicate_removed} duplicates removed.\n")

    # ── 2. Reload image URLs for ALL items ───────────────────────────────────
    print("🖼  Reloading image URLs from static/food_images…")
    items = await db.menu_items.find({}, {"_id": 1, "name": 1, "image_url": 1}).to_list(None)

    updated = 0
    skipped = 0
    for item in items:
        new_url = determine_image(item["name"])
        if new_url and new_url != item.get("image_url"):
            await db.menu_items.update_one(
                {"_id": item["_id"]},
                {"$set": {"image_url": new_url}}
            )
            print(f"  🖼  {item['name']} → {new_url.split('/')[-1]}")
            updated += 1
        else:
            skipped += 1

    print(f"\n  Done: {updated} images updated, {skipped} unchanged.\n")
    print("🎉 All fixes applied successfully!")


if __name__ == "__main__":
    asyncio.run(fix_all())
