from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SECRET_KEY = os.environ.get('JWT_SECRET', 'f2f_xpress_jwt_secret_key_prod_2024!')
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 72
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# --- Models ---
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    goal: Optional[str] = None

class WeightEntryCreate(BaseModel):
    weight: float
    date: str

class WaterAction(BaseModel):
    date: str

class WorkoutLogCreate(BaseModel):
    date: str
    plan_name: str
    day_name: str
    exercises: List[dict]

class ProgressPhotoCreate(BaseModel):
    photo_base64: str
    date: str
    note: Optional[str] = ""

# --- Auth Helpers ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def user_response(user: dict) -> dict:
    return {
        "id": user["id"], "name": user["name"], "email": user["email"],
        "height_cm": user.get("height_cm"), "weight_kg": user.get("weight_kg"),
        "age": user.get("age"), "gender": user.get("gender"),
        "goal": user.get("goal"), "created_at": user["created_at"]
    }

# --- Auth Routes ---
@api_router.post("/auth/signup")
async def signup(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "id": user_id, "name": data.name, "email": data.email,
        "password_hash": hash_password(data.password),
        "height_cm": None, "weight_kg": None, "age": None,
        "gender": None, "goal": None, "created_at": now
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    return {"token": token, "user": user_response(user_doc)}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"])
    return {"token": token, "user": user_response(user)}

@api_router.get("/auth/me")
async def get_me(user_id: str = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# --- Profile ---
@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, user_id: str = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return user

# --- Weight Tracker ---
@api_router.get("/weight-entries")
async def get_weight_entries(user_id: str = Depends(get_current_user)):
    entries = await db.weight_entries.find({"user_id": user_id}, {"_id": 0}).sort("date", -1).to_list(100)
    return entries

@api_router.post("/weight-entries")
async def create_weight_entry(data: WeightEntryCreate, user_id: str = Depends(get_current_user)):
    existing = await db.weight_entries.find_one({"user_id": user_id, "date": data.date})
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.weight_entries.update_one(
            {"user_id": user_id, "date": data.date},
            {"$set": {"weight": data.weight, "created_at": now}}
        )
        entry = await db.weight_entries.find_one({"user_id": user_id, "date": data.date}, {"_id": 0})
        return entry
    entry_id = str(uuid.uuid4())
    entry = {"id": entry_id, "user_id": user_id, "weight": data.weight, "date": data.date, "created_at": now}
    await db.weight_entries.insert_one(entry)
    return {k: v for k, v in entry.items() if k != "_id"}

@api_router.delete("/weight-entries/{entry_id}")
async def delete_weight_entry(entry_id: str, user_id: str = Depends(get_current_user)):
    result = await db.weight_entries.delete_one({"id": entry_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"status": "deleted"}

# --- Water Intake ---
@api_router.get("/water-intake")
async def get_water_intake(date: str, user_id: str = Depends(get_current_user)):
    intake = await db.water_intake.find_one({"user_id": user_id, "date": date}, {"_id": 0})
    if not intake:
        return {"id": str(uuid.uuid4()), "date": date, "glasses": 0, "goal": 8}
    return intake

@api_router.post("/water-intake/add")
async def add_water(data: WaterAction, user_id: str = Depends(get_current_user)):
    intake = await db.water_intake.find_one({"user_id": user_id, "date": data.date})
    if intake:
        await db.water_intake.update_one(
            {"user_id": user_id, "date": data.date},
            {"$set": {"glasses": intake.get("glasses", 0) + 1}}
        )
        updated = await db.water_intake.find_one({"user_id": user_id, "date": data.date}, {"_id": 0})
        return updated
    new_intake = {"id": str(uuid.uuid4()), "user_id": user_id, "date": data.date, "glasses": 1, "goal": 8}
    await db.water_intake.insert_one(new_intake)
    return {k: v for k, v in new_intake.items() if k != "_id"}

@api_router.post("/water-intake/remove")
async def remove_water(data: WaterAction, user_id: str = Depends(get_current_user)):
    intake = await db.water_intake.find_one({"user_id": user_id, "date": data.date})
    if intake and intake.get("glasses", 0) > 0:
        await db.water_intake.update_one(
            {"user_id": user_id, "date": data.date},
            {"$set": {"glasses": intake["glasses"] - 1}}
        )
        updated = await db.water_intake.find_one({"user_id": user_id, "date": data.date}, {"_id": 0})
        return updated
    return {"id": str(uuid.uuid4()), "date": data.date, "glasses": 0, "goal": 8}

# --- Workout Plans ---
@api_router.get("/workout-plans")
async def get_workout_plans():
    plans = await db.workout_plans.find({}, {"_id": 0}).to_list(100)
    return plans

@api_router.get("/workout-plans/{plan_id}")
async def get_workout_plan(plan_id: str):
    plan = await db.workout_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan

# --- Workout Logs ---
@api_router.get("/workout-logs")
async def get_workout_logs(user_id: str = Depends(get_current_user)):
    logs = await db.workout_logs.find({"user_id": user_id}, {"_id": 0}).sort("date", -1).to_list(100)
    return logs

@api_router.post("/workout-logs")
async def create_workout_log(data: WorkoutLogCreate, user_id: str = Depends(get_current_user)):
    log_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    log_doc = {
        "id": log_id, "user_id": user_id, "date": data.date,
        "plan_name": data.plan_name, "day_name": data.day_name,
        "exercises": data.exercises, "created_at": now
    }
    await db.workout_logs.insert_one(log_doc)
    return {k: v for k, v in log_doc.items() if k != "_id"}

# --- Progress Photos ---
@api_router.get("/progress-photos")
async def get_progress_photos(user_id: str = Depends(get_current_user)):
    photos = await db.progress_photos.find(
        {"user_id": user_id}, {"_id": 0, "photo_base64": 0}
    ).sort("date", -1).to_list(100)
    return photos

@api_router.get("/progress-photos/{photo_id}")
async def get_progress_photo(photo_id: str, user_id: str = Depends(get_current_user)):
    photo = await db.progress_photos.find_one({"id": photo_id, "user_id": user_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo

@api_router.post("/progress-photos")
async def create_progress_photo(data: ProgressPhotoCreate, user_id: str = Depends(get_current_user)):
    photo_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    photo_doc = {
        "id": photo_id, "user_id": user_id, "date": data.date,
        "photo_base64": data.photo_base64, "note": data.note or "", "created_at": now
    }
    await db.progress_photos.insert_one(photo_doc)
    return {"id": photo_id, "date": data.date, "note": data.note or "", "created_at": now, "has_photo": True}

@api_router.delete("/progress-photos/{photo_id}")
async def delete_progress_photo(photo_id: str, user_id: str = Depends(get_current_user)):
    result = await db.progress_photos.delete_one({"id": photo_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Photo not found")
    return {"status": "deleted"}

# --- Dashboard ---
@api_router.get("/dashboard")
async def get_dashboard(user_id: str = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    water = await db.water_intake.find_one({"user_id": user_id, "date": today}, {"_id": 0})
    if not water:
        water = {"glasses": 0, "goal": 8}
    latest_weight = await db.weight_entries.find({"user_id": user_id}, {"_id": 0}).sort("date", -1).to_list(1)
    weight_history = await db.weight_entries.find({"user_id": user_id}, {"_id": 0}).sort("date", -1).to_list(7)
    week_start = (datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday())).strftime("%Y-%m-%d")
    workout_count = await db.workout_logs.count_documents({"user_id": user_id, "date": {"$gte": week_start}})
    return {
        "user": user, "water": water,
        "latest_weight": latest_weight[0] if latest_weight else None,
        "weight_history": list(reversed(weight_history)),
        "workouts_this_week": workout_count, "today": today
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware, allow_credentials=True,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Seed Workout Plans ---
async def seed_workout_plans():
    count = await db.workout_plans.count_documents({})
    if count > 0:
        return
    plans = [
        {
            "id": "beginner-full-body", "name": "Full Body Foundation", "level": "Beginner",
            "description": "Perfect for beginners. 3 days per week full body workout to build a solid foundation.",
            "days_per_week": 3, "duration_weeks": 8,
            "days": [
                {"day": 1, "name": "Full Body A", "exercises": [
                    {"name": "Barbell Squat", "sets": 3, "reps": "8-10", "weight_kg": 40, "muscle_group": "Legs", "rest_seconds": 90, "notes": "Focus on form"},
                    {"name": "Bench Press", "sets": 3, "reps": "8-10", "weight_kg": 30, "muscle_group": "Chest", "rest_seconds": 90, "notes": "Retract shoulder blades"},
                    {"name": "Barbell Row", "sets": 3, "reps": "8-10", "weight_kg": 30, "muscle_group": "Back", "rest_seconds": 90, "notes": "Pull to lower chest"},
                    {"name": "Overhead Press", "sets": 3, "reps": "8-10", "weight_kg": 20, "muscle_group": "Shoulders", "rest_seconds": 60, "notes": "Full lockout"},
                    {"name": "Plank", "sets": 3, "reps": "30-45s", "weight_kg": 0, "muscle_group": "Core", "rest_seconds": 60, "notes": "Keep hips level"},
                ]},
                {"day": 3, "name": "Full Body B", "exercises": [
                    {"name": "Deadlift", "sets": 3, "reps": "6-8", "weight_kg": 50, "muscle_group": "Back/Legs", "rest_seconds": 120, "notes": "Keep back straight"},
                    {"name": "Incline Dumbbell Press", "sets": 3, "reps": "10-12", "weight_kg": 14, "muscle_group": "Chest", "rest_seconds": 60, "notes": "30° incline"},
                    {"name": "Lat Pulldown", "sets": 3, "reps": "10-12", "weight_kg": 35, "muscle_group": "Back", "rest_seconds": 60, "notes": "Pull to upper chest"},
                    {"name": "Lateral Raise", "sets": 3, "reps": "12-15", "weight_kg": 6, "muscle_group": "Shoulders", "rest_seconds": 45, "notes": "Slight bend in elbows"},
                    {"name": "Bicycle Crunches", "sets": 3, "reps": "15-20", "weight_kg": 0, "muscle_group": "Core", "rest_seconds": 45, "notes": "Slow and controlled"},
                ]},
                {"day": 5, "name": "Full Body C", "exercises": [
                    {"name": "Leg Press", "sets": 3, "reps": "10-12", "weight_kg": 80, "muscle_group": "Legs", "rest_seconds": 90, "notes": "Don't lock knees"},
                    {"name": "Dumbbell Chest Fly", "sets": 3, "reps": "12-15", "weight_kg": 10, "muscle_group": "Chest", "rest_seconds": 60, "notes": "Feel the stretch"},
                    {"name": "Seated Cable Row", "sets": 3, "reps": "10-12", "weight_kg": 30, "muscle_group": "Back", "rest_seconds": 60, "notes": "Squeeze shoulder blades"},
                    {"name": "Bicep Curls", "sets": 3, "reps": "10-12", "weight_kg": 10, "muscle_group": "Arms", "rest_seconds": 45, "notes": "No swinging"},
                    {"name": "Tricep Pushdown", "sets": 3, "reps": "10-12", "weight_kg": 15, "muscle_group": "Arms", "rest_seconds": 45, "notes": "Lock elbows"},
                ]},
            ]
        },
        {
            "id": "intermediate-ppl", "name": "Push / Pull / Legs", "level": "Intermediate",
            "description": "Classic PPL split for intermediate lifters. 6 days per week for maximum gains.",
            "days_per_week": 6, "duration_weeks": 12,
            "days": [
                {"day": 1, "name": "Push (Chest/Shoulders/Tri)", "exercises": [
                    {"name": "Barbell Bench Press", "sets": 4, "reps": "6-8", "weight_kg": 60, "muscle_group": "Chest", "rest_seconds": 120, "notes": "Pyramid up"},
                    {"name": "Incline Dumbbell Press", "sets": 3, "reps": "8-10", "weight_kg": 22, "muscle_group": "Upper Chest", "rest_seconds": 90, "notes": "30-45° incline"},
                    {"name": "Cable Fly", "sets": 3, "reps": "12-15", "weight_kg": 15, "muscle_group": "Chest", "rest_seconds": 60, "notes": "Squeeze at peak"},
                    {"name": "Overhead Press", "sets": 4, "reps": "8-10", "weight_kg": 35, "muscle_group": "Shoulders", "rest_seconds": 90, "notes": "Strict form"},
                    {"name": "Lateral Raises", "sets": 4, "reps": "12-15", "weight_kg": 8, "muscle_group": "Shoulders", "rest_seconds": 45, "notes": "Controlled tempo"},
                    {"name": "Tricep Dips", "sets": 3, "reps": "10-12", "weight_kg": 0, "muscle_group": "Triceps", "rest_seconds": 60, "notes": "Add weight if needed"},
                    {"name": "Overhead Tricep Extension", "sets": 3, "reps": "10-12", "weight_kg": 20, "muscle_group": "Triceps", "rest_seconds": 60, "notes": "Full stretch"},
                ]},
                {"day": 2, "name": "Pull (Back/Biceps)", "exercises": [
                    {"name": "Deadlift", "sets": 4, "reps": "5-6", "weight_kg": 80, "muscle_group": "Back", "rest_seconds": 180, "notes": "Belt recommended"},
                    {"name": "Pull-Ups", "sets": 4, "reps": "8-10", "weight_kg": 0, "muscle_group": "Back", "rest_seconds": 90, "notes": "Add weight when possible"},
                    {"name": "Barbell Row", "sets": 4, "reps": "8-10", "weight_kg": 50, "muscle_group": "Back", "rest_seconds": 90, "notes": "Overhand grip"},
                    {"name": "Face Pulls", "sets": 3, "reps": "15-20", "weight_kg": 12, "muscle_group": "Rear Delts", "rest_seconds": 45, "notes": "External rotation"},
                    {"name": "Barbell Curl", "sets": 3, "reps": "8-10", "weight_kg": 25, "muscle_group": "Biceps", "rest_seconds": 60, "notes": "No swinging"},
                    {"name": "Hammer Curls", "sets": 3, "reps": "10-12", "weight_kg": 12, "muscle_group": "Biceps", "rest_seconds": 45, "notes": "Neutral grip"},
                ]},
                {"day": 3, "name": "Legs", "exercises": [
                    {"name": "Barbell Squat", "sets": 4, "reps": "6-8", "weight_kg": 80, "muscle_group": "Quads", "rest_seconds": 180, "notes": "Below parallel"},
                    {"name": "Romanian Deadlift", "sets": 4, "reps": "8-10", "weight_kg": 60, "muscle_group": "Hamstrings", "rest_seconds": 90, "notes": "Feel the stretch"},
                    {"name": "Leg Press", "sets": 3, "reps": "10-12", "weight_kg": 120, "muscle_group": "Quads", "rest_seconds": 90, "notes": "Feet shoulder width"},
                    {"name": "Leg Curl", "sets": 3, "reps": "10-12", "weight_kg": 30, "muscle_group": "Hamstrings", "rest_seconds": 60, "notes": "Squeeze at top"},
                    {"name": "Calf Raises", "sets": 4, "reps": "15-20", "weight_kg": 40, "muscle_group": "Calves", "rest_seconds": 45, "notes": "Full ROM"},
                    {"name": "Walking Lunges", "sets": 3, "reps": "12 each", "weight_kg": 16, "muscle_group": "Glutes", "rest_seconds": 60, "notes": "Long strides"},
                ]},
                {"day": 4, "name": "Push Day 2", "exercises": [
                    {"name": "Dumbbell Bench Press", "sets": 4, "reps": "8-10", "weight_kg": 28, "muscle_group": "Chest", "rest_seconds": 90, "notes": "Mind-muscle connection"},
                    {"name": "Arnold Press", "sets": 4, "reps": "10-12", "weight_kg": 16, "muscle_group": "Shoulders", "rest_seconds": 60, "notes": "Full rotation"},
                    {"name": "Cable Lateral Raise", "sets": 3, "reps": "12-15", "weight_kg": 7, "muscle_group": "Shoulders", "rest_seconds": 45, "notes": "Behind body"},
                    {"name": "Close Grip Bench", "sets": 3, "reps": "8-10", "weight_kg": 40, "muscle_group": "Triceps", "rest_seconds": 90, "notes": "Shoulder width"},
                    {"name": "Rope Pushdown", "sets": 3, "reps": "12-15", "weight_kg": 18, "muscle_group": "Triceps", "rest_seconds": 45, "notes": "Split at bottom"},
                ]},
                {"day": 5, "name": "Pull Day 2", "exercises": [
                    {"name": "T-Bar Row", "sets": 4, "reps": "8-10", "weight_kg": 40, "muscle_group": "Back", "rest_seconds": 90, "notes": "Close grip"},
                    {"name": "Lat Pulldown", "sets": 4, "reps": "10-12", "weight_kg": 50, "muscle_group": "Back", "rest_seconds": 60, "notes": "Wide grip"},
                    {"name": "Reverse Fly", "sets": 3, "reps": "12-15", "weight_kg": 8, "muscle_group": "Rear Delts", "rest_seconds": 45, "notes": "Bent over"},
                    {"name": "Incline DB Curl", "sets": 3, "reps": "10-12", "weight_kg": 10, "muscle_group": "Biceps", "rest_seconds": 45, "notes": "Full stretch"},
                    {"name": "Concentration Curl", "sets": 3, "reps": "10-12", "weight_kg": 10, "muscle_group": "Biceps", "rest_seconds": 45, "notes": "Peak contraction"},
                ]},
                {"day": 6, "name": "Legs Day 2", "exercises": [
                    {"name": "Front Squat", "sets": 4, "reps": "8-10", "weight_kg": 50, "muscle_group": "Quads", "rest_seconds": 120, "notes": "Upright torso"},
                    {"name": "Bulgarian Split Squat", "sets": 3, "reps": "10 each", "weight_kg": 14, "muscle_group": "Quads/Glutes", "rest_seconds": 90, "notes": "Rear foot elevated"},
                    {"name": "Leg Extension", "sets": 3, "reps": "12-15", "weight_kg": 30, "muscle_group": "Quads", "rest_seconds": 60, "notes": "Pause at top"},
                    {"name": "Hip Thrust", "sets": 4, "reps": "10-12", "weight_kg": 60, "muscle_group": "Glutes", "rest_seconds": 90, "notes": "Squeeze at top"},
                    {"name": "Seated Calf Raise", "sets": 4, "reps": "15-20", "weight_kg": 30, "muscle_group": "Calves", "rest_seconds": 45, "notes": "High reps"},
                ]},
            ]
        },
        {
            "id": "advanced-power", "name": "Power & Hypertrophy", "level": "Advanced",
            "description": "Upper/Lower split with heavy compounds and hypertrophy work. For experienced lifters.",
            "days_per_week": 5, "duration_weeks": 16,
            "days": [
                {"day": 1, "name": "Upper Power", "exercises": [
                    {"name": "Barbell Bench Press", "sets": 5, "reps": "3-5", "weight_kg": 80, "muscle_group": "Chest", "rest_seconds": 180, "notes": "Heavy RPE 8-9"},
                    {"name": "Weighted Pull-Ups", "sets": 5, "reps": "3-5", "weight_kg": 15, "muscle_group": "Back", "rest_seconds": 180, "notes": "Add weight belt"},
                    {"name": "Overhead Press", "sets": 4, "reps": "5-6", "weight_kg": 50, "muscle_group": "Shoulders", "rest_seconds": 120, "notes": "Strict press"},
                    {"name": "Barbell Row", "sets": 4, "reps": "5-6", "weight_kg": 70, "muscle_group": "Back", "rest_seconds": 120, "notes": "Explosive pull"},
                    {"name": "Weighted Dips", "sets": 3, "reps": "6-8", "weight_kg": 15, "muscle_group": "Triceps", "rest_seconds": 90, "notes": "Forward lean"},
                ]},
                {"day": 2, "name": "Lower Power", "exercises": [
                    {"name": "Barbell Squat", "sets": 5, "reps": "3-5", "weight_kg": 120, "muscle_group": "Quads", "rest_seconds": 240, "notes": "Heavy. Belt up"},
                    {"name": "Conventional Deadlift", "sets": 4, "reps": "3-5", "weight_kg": 130, "muscle_group": "Posterior Chain", "rest_seconds": 240, "notes": "Max effort"},
                    {"name": "Barbell Hip Thrust", "sets": 4, "reps": "6-8", "weight_kg": 80, "muscle_group": "Glutes", "rest_seconds": 120, "notes": "Pause at top"},
                    {"name": "Leg Press", "sets": 3, "reps": "8-10", "weight_kg": 160, "muscle_group": "Quads", "rest_seconds": 120, "notes": "Wide stance"},
                    {"name": "Standing Calf Raise", "sets": 4, "reps": "8-10", "weight_kg": 60, "muscle_group": "Calves", "rest_seconds": 60, "notes": "Heavy"},
                ]},
                {"day": 4, "name": "Upper Hypertrophy", "exercises": [
                    {"name": "Incline Dumbbell Press", "sets": 4, "reps": "10-12", "weight_kg": 30, "muscle_group": "Chest", "rest_seconds": 60, "notes": "Mind-muscle"},
                    {"name": "Cable Fly", "sets": 3, "reps": "12-15", "weight_kg": 15, "muscle_group": "Chest", "rest_seconds": 45, "notes": "Constant tension"},
                    {"name": "Lat Pulldown", "sets": 4, "reps": "10-12", "weight_kg": 55, "muscle_group": "Back", "rest_seconds": 60, "notes": "Wide grip"},
                    {"name": "Seated Cable Row", "sets": 4, "reps": "10-12", "weight_kg": 45, "muscle_group": "Back", "rest_seconds": 60, "notes": "Squeeze"},
                    {"name": "Arnold Press", "sets": 4, "reps": "10-12", "weight_kg": 18, "muscle_group": "Shoulders", "rest_seconds": 60, "notes": "Full rotation"},
                    {"name": "Superset: Curls/Pushdowns", "sets": 3, "reps": "12-15", "weight_kg": 12, "muscle_group": "Arms", "rest_seconds": 45, "notes": "No rest between"},
                ]},
                {"day": 5, "name": "Lower Hypertrophy", "exercises": [
                    {"name": "Front Squat", "sets": 4, "reps": "10-12", "weight_kg": 60, "muscle_group": "Quads", "rest_seconds": 90, "notes": "Slow descent"},
                    {"name": "Romanian Deadlift", "sets": 4, "reps": "10-12", "weight_kg": 70, "muscle_group": "Hamstrings", "rest_seconds": 90, "notes": "Feel stretch"},
                    {"name": "Bulgarian Split Squat", "sets": 3, "reps": "12 each", "weight_kg": 16, "muscle_group": "Quads/Glutes", "rest_seconds": 60, "notes": "Deep stretch"},
                    {"name": "Leg Curl", "sets": 4, "reps": "12-15", "weight_kg": 35, "muscle_group": "Hamstrings", "rest_seconds": 45, "notes": "Squeeze at top"},
                    {"name": "Seated Calf Raise", "sets": 4, "reps": "15-20", "weight_kg": 30, "muscle_group": "Calves", "rest_seconds": 45, "notes": "Full ROM"},
                ]},
                {"day": 6, "name": "Full Body Power", "exercises": [
                    {"name": "Power Clean", "sets": 4, "reps": "3-5", "weight_kg": 60, "muscle_group": "Full Body", "rest_seconds": 120, "notes": "Explosive technique"},
                    {"name": "Incline Bench Press", "sets": 4, "reps": "6-8", "weight_kg": 60, "muscle_group": "Chest", "rest_seconds": 120, "notes": "Moderate heavy"},
                    {"name": "Pendlay Row", "sets": 4, "reps": "5-6", "weight_kg": 65, "muscle_group": "Back", "rest_seconds": 90, "notes": "Dead stop each rep"},
                    {"name": "Walking Lunges", "sets": 3, "reps": "10 each", "weight_kg": 20, "muscle_group": "Legs", "rest_seconds": 60, "notes": "Heavy dumbbells"},
                    {"name": "Ab Wheel Rollout", "sets": 3, "reps": "10-12", "weight_kg": 0, "muscle_group": "Core", "rest_seconds": 60, "notes": "Full extension"},
                ]},
            ]
        }
    ]
    await db.workout_plans.insert_many(plans)
    logger.info("Seeded 3 workout plans")

@app.on_event("startup")
async def startup():
    await seed_workout_plans()
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.weight_entries.create_index([("user_id", 1), ("date", -1)])
    await db.water_intake.create_index([("user_id", 1), ("date", 1)])
    await db.workout_logs.create_index([("user_id", 1), ("date", -1)])
    await db.progress_photos.create_index([("user_id", 1), ("date", -1)])
    logger.info("Fat2FitXpress API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
