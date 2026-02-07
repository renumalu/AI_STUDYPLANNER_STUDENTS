from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId
import json
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'study-planner-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# API Keys
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app
app = FastAPI(title="AI Study Planner API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    college: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    weekday_hours: Optional[float] = 3.0
    weekend_hours: Optional[float] = 6.0
    preferred_study_time: Optional[str] = "evening"
    target_date: Optional[str] = None
    onboarding_completed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OnboardingData(BaseModel):
    college: str
    branch: str
    graduation_year: int
    weekday_hours: float
    weekend_hours: float
    preferred_study_time: str
    target_date: str

class Subject(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    credits: int
    strong_areas: List[str] = []
    weak_areas: List[str] = []
    confidence_level: int = 3
    color: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubjectCreate(BaseModel):
    name: str
    credits: int
    strong_areas: List[str] = []
    weak_areas: List[str] = []
    confidence_level: int = 3
    color: Optional[str] = None

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    credits: Optional[int] = None
    strong_areas: Optional[List[str]] = None
    weak_areas: Optional[List[str]] = None
    confidence_level: Optional[int] = None
    color: Optional[str] = None

class StudySession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subject_id: str
    subject_name: str
    date: str
    start_time: str
    end_time: str
    duration_hours: float
    session_type: str  # learning, practice, revision, buffer
    topics: List[str] = []
    cognitive_load: str  # high, medium, low
    color: str
    completed: bool = False

class StudyPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    sessions: List[StudySession] = []
    subject_breakdown: Dict[str, Any] = {}
    recommendations: List[str] = []
    next_steps: List[str] = []
    estimated_completion: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GeneratePlanRequest(BaseModel):
    regenerate: bool = False

class ChatMessage(BaseModel):
    role: str  # user or assistant
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    message: str

class ConfidenceUpdate(BaseModel):
    subject_id: str
    new_confidence: int

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Subject colors for visual distinction
SUBJECT_COLORS = [
    "#6366F1",  # Indigo
    "#8B5CF6",  # Violet
    "#EC4899",  # Pink
    "#14B8A6",  # Teal
    "#F59E0B",  # Amber
    "#10B981",  # Emerald
    "#3B82F6",  # Blue
    "#EF4444",  # Red
]

def get_subject_color(index: int) -> str:
    return SUBJECT_COLORS[index % len(SUBJECT_COLORS)]

# ==================== AI FUNCTIONS ====================

async def generate_study_plan_with_ai(user: dict, subjects: list) -> dict:
    """Generate a personalized study plan using Gemini AI"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    # Prepare context for AI
    subjects_info = []
    for s in subjects:
        subjects_info.append({
            "name": s["name"],
            "credits": s["credits"],
            "strong_areas": s.get("strong_areas", []),
            "weak_areas": s.get("weak_areas", []),
            "confidence_level": s.get("confidence_level", 3)
        })
    
    target_date = user.get("target_date", (datetime.now(timezone.utc) + timedelta(days=90)).strftime("%Y-%m-%d"))
    
    prompt = f"""You are an AI study planner for engineering students. Generate a detailed study plan based on the following information:

STUDENT PROFILE:
- Name: {user.get('name', 'Student')}
- Branch: {user.get('branch', 'Engineering')}
- Available study hours on weekdays: {user.get('weekday_hours', 3)} hours/day
- Available study hours on weekends: {user.get('weekend_hours', 6)} hours/day
- Preferred study time: {user.get('preferred_study_time', 'evening')}
- Target completion date: {target_date}

SUBJECTS:
{json.dumps(subjects_info, indent=2)}

Generate a study plan for the next 14 days. Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{{
    "sessions": [
        {{
            "subject_name": "Subject Name",
            "date": "YYYY-MM-DD",
            "start_time": "HH:MM",
            "end_time": "HH:MM",
            "duration_hours": 1.5,
            "session_type": "learning|practice|revision|buffer",
            "topics": ["topic1", "topic2"],
            "cognitive_load": "high|medium|low"
        }}
    ],
    "subject_breakdown": {{
        "Subject Name": {{
            "total_hours": 10,
            "percentage": 33,
            "justification": "Why this allocation"
        }}
    }},
    "recommendations": ["recommendation 1", "recommendation 2"],
    "next_steps": ["Focus on weak areas first", "..."],
    "estimated_completion": "YYYY-MM-DD"
}}

IMPORTANT RULES:
1. Allocate more time to subjects with lower confidence and higher credits
2. Schedule weak topics earlier in the plan
3. Place high cognitive load sessions during preferred study time
4. Include buffer time for unexpected delays
5. Mix learning, practice, and revision sessions
6. Start dates from today: {datetime.now(timezone.utc).strftime("%Y-%m-%d")}
7. Respect the daily hour limits strictly"""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"plan-{user['id']}-{datetime.now().timestamp()}",
            system_message="You are an expert AI study planner. Always respond with valid JSON only, no markdown formatting."
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse JSON response
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        plan_data = json.loads(response_text)
        return plan_data
    except Exception as e:
        logger.error(f"AI plan generation error: {e}")
        # Return a basic fallback plan
        return generate_fallback_plan(user, subjects)

def generate_fallback_plan(user: dict, subjects: list) -> dict:
    """Generate a basic study plan without AI"""
    sessions = []
    subject_breakdown = {}
    
    today = datetime.now(timezone.utc).date()
    weekday_hours = user.get('weekday_hours', 3)
    weekend_hours = user.get('weekend_hours', 6)
    preferred_time = user.get('preferred_study_time', 'evening')
    
    # Calculate start time based on preference
    time_map = {
        'morning': '08:00',
        'afternoon': '14:00',
        'evening': '18:00',
        'night': '21:00'
    }
    start_time = time_map.get(preferred_time, '18:00')
    
    # Sort subjects by priority (lower confidence + higher credits = higher priority)
    sorted_subjects = sorted(subjects, key=lambda x: (x.get('confidence_level', 3), -x.get('credits', 3)))
    
    total_credits = sum(s.get('credits', 3) for s in subjects)
    
    for i, subject in enumerate(sorted_subjects):
        credit_ratio = subject.get('credits', 3) / total_credits
        confidence = subject.get('confidence_level', 3)
        
        # Adjust ratio based on confidence (lower confidence = more time)
        confidence_multiplier = (6 - confidence) / 5
        adjusted_ratio = credit_ratio * (1 + confidence_multiplier * 0.3)
        
        subject_breakdown[subject['name']] = {
            "total_hours": round(adjusted_ratio * 42, 1),  # 14 days average
            "percentage": round(adjusted_ratio * 100),
            "justification": f"{'More' if confidence <= 2 else 'Standard'} time allocated due to {'low' if confidence <= 2 else 'moderate'} confidence and {subject.get('credits', 3)} credits"
        }
    
    # Generate sessions for 14 days
    for day_offset in range(14):
        current_date = today + timedelta(days=day_offset)
        is_weekend = current_date.weekday() >= 5
        daily_hours = weekend_hours if is_weekend else weekday_hours
        
        # Distribute hours among subjects
        hours_per_subject = daily_hours / len(subjects) if subjects else 0
        current_time = datetime.strptime(start_time, "%H:%M")
        
        for i, subject in enumerate(sorted_subjects[:3]):  # Max 3 subjects per day
            if hours_per_subject < 0.5:
                continue
                
            session_duration = min(hours_per_subject, 2)  # Max 2 hours per session
            end_time = current_time + timedelta(hours=session_duration)
            
            # Determine session type based on day in plan
            if day_offset < 5:
                session_type = "learning"
            elif day_offset < 10:
                session_type = "practice"
            else:
                session_type = "revision"
            
            cognitive_load = "high" if subject.get('confidence_level', 3) <= 2 else "medium"
            
            sessions.append({
                "subject_name": subject['name'],
                "date": current_date.strftime("%Y-%m-%d"),
                "start_time": current_time.strftime("%H:%M"),
                "end_time": end_time.strftime("%H:%M"),
                "duration_hours": session_duration,
                "session_type": session_type,
                "topics": subject.get('weak_areas', [])[:2] if day_offset < 7 else subject.get('strong_areas', [])[:2],
                "cognitive_load": cognitive_load
            })
            
            current_time = end_time + timedelta(minutes=15)  # 15 min break
    
    return {
        "sessions": sessions,
        "subject_breakdown": subject_breakdown,
        "recommendations": [
            "Focus on weak areas first before moving to practice",
            "Take short breaks between high-intensity sessions",
            "Review notes before each study session"
        ],
        "next_steps": [
            f"Start with {sorted_subjects[0]['name'] if sorted_subjects else 'your weakest subject'}",
            "Complete foundational concepts before advanced topics",
            "Use active recall techniques for better retention"
        ],
        "estimated_completion": (today + timedelta(days=14)).strftime("%Y-%m-%d")
    }

async def get_ai_assistant_response(user: dict, message: str, chat_history: list) -> str:
    """Get response from AI study assistant"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    # Get user's subjects for context
    subjects = await db.subjects.find({"user_id": user['id']}, {"_id": 0}).to_list(100)
    subjects_context = "\n".join([f"- {s['name']}: Confidence {s.get('confidence_level', 3)}/5, Weak areas: {', '.join(s.get('weak_areas', []))}" for s in subjects])
    
    system_message = f"""You are EduBloom, an AI study assistant for engineering students. You help with:
- Study tips and techniques
- Subject-specific guidance
- Time management advice
- Motivation and focus strategies
- Explaining difficult concepts

Student Profile:
- Name: {user.get('name', 'Student')}
- Branch: {user.get('branch', 'Engineering')}
- Subjects:
{subjects_context}

Be encouraging, practical, and specific. Keep responses concise but helpful."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"chat-{user['id']}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=message))
        return response
    except Exception as e:
        logger.error(f"AI assistant error: {e}")
        return "I apologize, I'm having trouble connecting right now. Please try again in a moment."

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate email format
    if not data.email or "@" not in data.email or "." not in data.email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Validate password
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Create user
    user = UserProfile(
        email=data.email,
        name=data.name
    )
    
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    token = create_token(user.id, user.email)
    
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "onboarding_completed": False
        }
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user['id'], user['email'])
    
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "onboarding_completed": user.get('onboarding_completed', False)
        }
    }

# ==================== USER ROUTES ====================

@api_router.get("/user/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user['id'],
        "email": current_user['email'],
        "name": current_user['name'],
        "college": current_user.get('college'),
        "branch": current_user.get('branch'),
        "graduation_year": current_user.get('graduation_year'),
        "weekday_hours": current_user.get('weekday_hours', 3),
        "weekend_hours": current_user.get('weekend_hours', 6),
        "preferred_study_time": current_user.get('preferred_study_time', 'evening'),
        "target_date": current_user.get('target_date'),
        "onboarding_completed": current_user.get('onboarding_completed', False)
    }

@api_router.post("/user/onboarding")
async def complete_onboarding(data: OnboardingData, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user['id']},
        {"$set": {
            "college": data.college,
            "branch": data.branch,
            "graduation_year": data.graduation_year,
            "weekday_hours": data.weekday_hours,
            "weekend_hours": data.weekend_hours,
            "preferred_study_time": data.preferred_study_time,
            "target_date": data.target_date,
            "onboarding_completed": True
        }}
    )
    return {"message": "Onboarding completed successfully"}

@api_router.put("/user/profile")
async def update_profile(data: dict, current_user: dict = Depends(get_current_user)):
    allowed_fields = ['name', 'college', 'branch', 'graduation_year', 'weekday_hours', 'weekend_hours', 'preferred_study_time', 'target_date']
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if update_data:
        await db.users.update_one({"id": current_user['id']}, {"$set": update_data})
    
    return {"message": "Profile updated successfully"}

# ==================== SUBJECTS ROUTES ====================

@api_router.get("/subjects")
async def get_subjects(current_user: dict = Depends(get_current_user)):
    subjects = await db.subjects.find({"user_id": current_user['id']}, {"_id": 0}).to_list(100)
    return subjects

@api_router.post("/subjects")
async def create_subject(data: SubjectCreate, current_user: dict = Depends(get_current_user)):
    # Get count for color assignment
    count = await db.subjects.count_documents({"user_id": current_user['id']})
    
    subject = Subject(
        user_id=current_user['id'],
        name=data.name,
        credits=data.credits,
        strong_areas=data.strong_areas,
        weak_areas=data.weak_areas,
        confidence_level=data.confidence_level,
        color=data.color or get_subject_color(count)
    )
    
    subject_dict = subject.model_dump()
    subject_dict['created_at'] = subject_dict['created_at'].isoformat()
    
    await db.subjects.insert_one(subject_dict)
    
    return {
        "id": subject.id,
        "user_id": subject.user_id,
        "name": subject.name,
        "credits": subject.credits,
        "strong_areas": subject.strong_areas,
        "weak_areas": subject.weak_areas,
        "confidence_level": subject.confidence_level,
        "color": subject.color
    }

@api_router.put("/subjects/{subject_id}")
async def update_subject(subject_id: str, data: SubjectUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.subjects.update_one(
        {"id": subject_id, "user_id": current_user['id']},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    return {"message": "Subject updated successfully"}

@api_router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.subjects.delete_one({"id": subject_id, "user_id": current_user['id']})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    return {"message": "Subject deleted successfully"}

# ==================== STUDY PLAN ROUTES ====================

@api_router.get("/study-plan")
async def get_study_plan(current_user: dict = Depends(get_current_user)):
    plan = await db.study_plans.find_one({"user_id": current_user['id']}, {"_id": 0})
    if not plan:
        return None
    return plan

@api_router.post("/study-plan/generate")
async def generate_study_plan(data: GeneratePlanRequest, current_user: dict = Depends(get_current_user)):
    # Get user's subjects
    subjects = await db.subjects.find({"user_id": current_user['id']}, {"_id": 0}).to_list(100)
    
    if not subjects:
        raise HTTPException(status_code=400, detail="Please add at least one subject before generating a plan")
    
    # Generate plan using AI
    plan_data = await generate_study_plan_with_ai(current_user, subjects)
    
    # Create subject ID mapping
    subject_map = {s['name']: s for s in subjects}
    
    # Process sessions and add IDs and colors
    sessions = []
    for session in plan_data.get('sessions', []):
        subject = subject_map.get(session['subject_name'])
        if subject:
            sessions.append(StudySession(
                subject_id=subject['id'],
                subject_name=session['subject_name'],
                date=session['date'],
                start_time=session['start_time'],
                end_time=session['end_time'],
                duration_hours=session['duration_hours'],
                session_type=session['session_type'],
                topics=session.get('topics', []),
                cognitive_load=session['cognitive_load'],
                color=subject.get('color', '#6366F1')
            ).model_dump())
    
    # Create study plan
    plan = StudyPlan(
        user_id=current_user['id'],
        sessions=sessions,
        subject_breakdown=plan_data.get('subject_breakdown', {}),
        recommendations=plan_data.get('recommendations', []),
        next_steps=plan_data.get('next_steps', []),
        estimated_completion=plan_data.get('estimated_completion', '')
    )
    
    plan_dict = plan.model_dump()
    plan_dict['created_at'] = plan_dict['created_at'].isoformat()
    plan_dict['updated_at'] = plan_dict['updated_at'].isoformat()
    
    # Upsert plan
    await db.study_plans.update_one(
        {"user_id": current_user['id']},
        {"$set": plan_dict},
        upsert=True
    )
    
    return plan_dict

@api_router.put("/study-plan/session/{session_id}/complete")
async def mark_session_complete(session_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.study_plans.update_one(
        {"user_id": current_user['id'], "sessions.id": session_id},
        {"$set": {"sessions.$.completed": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"message": "Session marked as complete"}

# ==================== PROGRESS ROUTES ====================

@api_router.post("/progress/update-confidence")
async def update_confidence(data: ConfidenceUpdate, current_user: dict = Depends(get_current_user)):
    # Update subject confidence
    result = await db.subjects.update_one(
        {"id": data.subject_id, "user_id": current_user['id']},
        {"$set": {"confidence_level": data.new_confidence}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Log progress history
    await db.progress_history.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current_user['id'],
        "subject_id": data.subject_id,
        "confidence_level": data.new_confidence,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Confidence updated successfully"}

@api_router.get("/progress/history")
async def get_progress_history(current_user: dict = Depends(get_current_user)):
    history = await db.progress_history.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    return history

@api_router.get("/progress/stats")
async def get_progress_stats(current_user: dict = Depends(get_current_user)):
    # Get subjects
    subjects = await db.subjects.find({"user_id": current_user['id']}, {"_id": 0}).to_list(100)
    
    # Get study plan
    plan = await db.study_plans.find_one({"user_id": current_user['id']}, {"_id": 0})
    
    # Calculate stats
    total_sessions = 0
    completed_sessions = 0
    total_hours = 0
    completed_hours = 0
    
    if plan and plan.get('sessions'):
        for session in plan['sessions']:
            total_sessions += 1
            total_hours += session.get('duration_hours', 0)
            if session.get('completed'):
                completed_sessions += 1
                completed_hours += session.get('duration_hours', 0)
    
    avg_confidence = sum(s.get('confidence_level', 3) for s in subjects) / len(subjects) if subjects else 0
    
    return {
        "total_subjects": len(subjects),
        "average_confidence": round(avg_confidence, 1),
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "completion_rate": round((completed_sessions / total_sessions * 100) if total_sessions > 0 else 0, 1),
        "total_hours": round(total_hours, 1),
        "completed_hours": round(completed_hours, 1)
    }

# ==================== AI CHAT ROUTES ====================

@api_router.post("/chat/assistant")
async def chat_with_assistant(data: ChatRequest, current_user: dict = Depends(get_current_user)):
    # Get chat history
    history = await db.chat_history.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("timestamp", -1).limit(10).to_list(10)
    
    # Get AI response
    response = await get_ai_assistant_response(current_user, data.message, history)
    
    # Save messages
    user_msg = {
        "id": str(uuid.uuid4()),
        "user_id": current_user['id'],
        "role": "user",
        "content": data.message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    assistant_msg = {
        "id": str(uuid.uuid4()),
        "user_id": current_user['id'],
        "role": "assistant",
        "content": response,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_history.insert_many([user_msg, assistant_msg])
    
    return {"response": response}

@api_router.get("/chat/history")
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    history = await db.chat_history.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    return history

@api_router.delete("/chat/history")
async def clear_chat_history(current_user: dict = Depends(get_current_user)):
    await db.chat_history.delete_many({"user_id": current_user['id']})
    return {"message": "Chat history cleared"}

# ==================== YOUTUBE SUMMARIZER ROUTES ====================

class YouTubeSummarizeRequest(BaseModel):
    url: str
    subject_id: Optional[str] = None

class YouTubeSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    video_url: str
    video_title: str
    thumbnail: str
    summary: str
    key_points: List[str] = []
    timestamps: List[dict] = []
    subject_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

def extract_video_id(url: str) -> str:
    """Extract video ID from YouTube URL"""
    import re
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/shorts\/([^&\n?#]+)'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

async def get_youtube_transcript(video_id: str) -> str:
    """Get transcript from YouTube video"""
    import requests
    try:
        # Try to get captions using a simple approach
        response = requests.get(f"https://www.youtube.com/watch?v={video_id}")
        # For demo purposes, we'll use AI to work with the video URL directly
        return f"Video ID: {video_id}"
    except:
        return None

async def summarize_youtube_video(video_url: str, video_id: str) -> dict:
    """Summarize YouTube video using Gemini AI"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    prompt = f"""Analyze this YouTube video URL and provide a comprehensive study summary.
Video URL: {video_url}

Please provide:
1. A concise summary (2-3 paragraphs)
2. 5-7 key points/takeaways for students
3. Important timestamps/topics to focus on (estimate based on typical educational video structure)

Format your response as JSON:
{{
    "summary": "Your summary here...",
    "key_points": ["Point 1", "Point 2", ...],
    "timestamps": [
        {{"time": "0:00", "topic": "Introduction"}},
        {{"time": "2:30", "topic": "Main concept"}}
    ],
    "video_title": "Estimated title based on URL"
}}

If you cannot access the video directly, provide a helpful response based on the video ID and common educational content patterns.
Return ONLY valid JSON."""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"youtube-{video_id}",
            system_message="You are an AI that summarizes educational YouTube videos for engineering students. Always respond with valid JSON."
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse response
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"YouTube summarization error: {e}")
        return {
            "summary": "Unable to generate summary. Please try again or check the video URL.",
            "key_points": ["Video analysis pending"],
            "timestamps": [],
            "video_title": "YouTube Video"
        }

@api_router.post("/youtube/summarize")
async def summarize_youtube(data: YouTubeSummarizeRequest, current_user: dict = Depends(get_current_user)):
    video_id = extract_video_id(data.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    # Generate summary using AI
    result = await summarize_youtube_video(data.url, video_id)
    
    # Create summary object
    summary = YouTubeSummary(
        user_id=current_user['id'],
        video_url=data.url,
        video_title=result.get('video_title', 'YouTube Video'),
        thumbnail=f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
        summary=result.get('summary', ''),
        key_points=result.get('key_points', []),
        timestamps=result.get('timestamps', []),
        subject_id=data.subject_id
    )
    
    # Save to database
    summary_dict = summary.model_dump()
    summary_dict['created_at'] = summary_dict['created_at'].isoformat()
    await db.youtube_summaries.insert_one(summary_dict)
    
    return {
        "id": summary.id,
        "video_url": summary.video_url,
        "video_title": summary.video_title,
        "thumbnail": summary.thumbnail,
        "summary": summary.summary,
        "key_points": summary.key_points,
        "timestamps": summary.timestamps
    }

@api_router.get("/youtube/summaries")
async def get_youtube_summaries(current_user: dict = Depends(get_current_user)):
    summaries = await db.youtube_summaries.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return summaries

@api_router.delete("/youtube/summaries/{summary_id}")
async def delete_youtube_summary(summary_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.youtube_summaries.delete_one({
        "id": summary_id,
        "user_id": current_user['id']
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Summary not found")
    return {"message": "Summary deleted"}

# ==================== QUIZ ROUTES ====================

class QuizGenerateRequest(BaseModel):
    subject_id: Optional[str] = None
    topic: Optional[str] = None
    num_questions: int = 5
    difficulty: str = "medium"  # easy, medium, hard

class QuizQuestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    options: List[str]
    correct_answer: int
    explanation: str

class Quiz(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    subject_id: Optional[str] = None
    topic: str
    difficulty: str
    questions: List[dict] = []
    score: Optional[int] = None
    total: int = 0
    completed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuizSubmitRequest(BaseModel):
    answers: Dict[str, int]  # question_id: selected_answer_index

async def generate_quiz_questions(subject_name: str, topic: str, num_questions: int, difficulty: str) -> List[dict]:
    """Generate quiz questions using AI"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    prompt = f"""Generate {num_questions} multiple choice quiz questions for engineering students.

Subject: {subject_name}
Topic: {topic}
Difficulty: {difficulty}

Return ONLY a valid JSON array with this structure:
[
    {{
        "question": "Your question here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": 0,
        "explanation": "Brief explanation why this is correct"
    }}
]

Rules:
- Each question must have exactly 4 options
- correct_answer is the index (0-3) of the correct option
- Make questions appropriate for the difficulty level
- Focus on conceptual understanding, not just memorization
- Include practical application questions"""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"quiz-{uuid.uuid4()}",
            system_message="You are an expert quiz generator for engineering subjects. Always respond with valid JSON arrays."
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        questions = json.loads(response_text)
        
        # Add IDs to questions
        for q in questions:
            q['id'] = str(uuid.uuid4())
        
        return questions
    except Exception as e:
        logger.error(f"Quiz generation error: {e}")
        return []

@api_router.post("/quiz/generate")
async def generate_quiz(data: QuizGenerateRequest, current_user: dict = Depends(get_current_user)):
    # Get subject name if subject_id provided
    subject_name = "General Engineering"
    if data.subject_id:
        subject = await db.subjects.find_one({"id": data.subject_id, "user_id": current_user['id']}, {"_id": 0})
        if subject:
            subject_name = subject['name']
    
    topic = data.topic or subject_name
    
    # Generate questions
    questions = await generate_quiz_questions(subject_name, topic, data.num_questions, data.difficulty)
    
    if not questions:
        raise HTTPException(status_code=500, detail="Failed to generate quiz questions")
    
    # Create quiz
    quiz = Quiz(
        user_id=current_user['id'],
        subject_id=data.subject_id,
        topic=topic,
        difficulty=data.difficulty,
        questions=questions,
        total=len(questions)
    )
    
    quiz_dict = quiz.model_dump()
    quiz_dict['created_at'] = quiz_dict['created_at'].isoformat()
    await db.quizzes.insert_one(quiz_dict)
    
    # Return quiz without correct answers for taking
    safe_questions = []
    for q in questions:
        safe_questions.append({
            "id": q['id'],
            "question": q['question'],
            "options": q['options']
        })
    
    return {
        "id": quiz.id,
        "topic": quiz.topic,
        "difficulty": quiz.difficulty,
        "questions": safe_questions,
        "total": quiz.total
    }

@api_router.post("/quiz/{quiz_id}/submit")
async def submit_quiz(quiz_id: str, data: QuizSubmitRequest, current_user: dict = Depends(get_current_user)):
    quiz = await db.quizzes.find_one({"id": quiz_id, "user_id": current_user['id']}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Calculate score
    correct = 0
    results = []
    
    for question in quiz['questions']:
        user_answer = data.answers.get(question['id'])
        is_correct = user_answer == question['correct_answer']
        if is_correct:
            correct += 1
        
        results.append({
            "question_id": question['id'],
            "question": question['question'],
            "options": question['options'],
            "user_answer": user_answer,
            "correct_answer": question['correct_answer'],
            "is_correct": is_correct,
            "explanation": question['explanation']
        })
    
    # Update quiz
    await db.quizzes.update_one(
        {"id": quiz_id},
        {"$set": {"score": correct, "completed": True}}
    )
    
    return {
        "quiz_id": quiz_id,
        "score": correct,
        "total": quiz['total'],
        "percentage": round(correct / quiz['total'] * 100, 1),
        "results": results
    }

@api_router.get("/quiz/history")
async def get_quiz_history(current_user: dict = Depends(get_current_user)):
    quizzes = await db.quizzes.find(
        {"user_id": current_user['id'], "completed": True},
        {"_id": 0, "questions": 0}
    ).sort("created_at", -1).to_list(50)
    return quizzes

# ==================== FLASHCARD ROUTES ====================

class FlashcardCreate(BaseModel):
    front: str
    back: str
    subject_id: Optional[str] = None
    tags: List[str] = []

class FlashcardDeck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: str = ""
    subject_id: Optional[str] = None
    card_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Flashcard(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    deck_id: str
    front: str
    back: str
    tags: List[str] = []
    difficulty: int = 0  # 0-5 for spaced repetition
    next_review: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    review_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GenerateFlashcardsRequest(BaseModel):
    topic: str
    subject_id: Optional[str] = None
    count: int = 10

class FlashcardReviewRequest(BaseModel):
    difficulty: int  # 0=again, 1=hard, 2=good, 3=easy

async def generate_flashcards_ai(topic: str, subject_name: str, count: int) -> List[dict]:
    """Generate flashcards using AI"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    prompt = f"""Generate {count} flashcards for engineering students studying {subject_name}.

Topic: {topic}

Return ONLY a valid JSON array:
[
    {{
        "front": "Question or term",
        "back": "Answer or definition with key details",
        "tags": ["tag1", "tag2"]
    }}
]

Rules:
- Front should be a clear question or term
- Back should be concise but complete
- Include 1-3 relevant tags per card
- Mix definitions, concepts, and applications
- Make them useful for exam preparation"""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"flashcards-{uuid.uuid4()}",
            system_message="You are an expert flashcard creator for engineering subjects. Always respond with valid JSON."
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Flashcard generation error: {e}")
        return []

@api_router.post("/flashcards/decks")
async def create_deck(name: str, description: str = "", subject_id: str = None, current_user: dict = Depends(get_current_user)):
    deck = FlashcardDeck(
        user_id=current_user['id'],
        name=name,
        description=description,
        subject_id=subject_id
    )
    
    deck_dict = deck.model_dump()
    deck_dict['created_at'] = deck_dict['created_at'].isoformat()
    await db.flashcard_decks.insert_one(deck_dict)
    
    return {"id": deck.id, "name": deck.name, "description": deck.description}

@api_router.get("/flashcards/decks")
async def get_decks(current_user: dict = Depends(get_current_user)):
    decks = await db.flashcard_decks.find({"user_id": current_user['id']}, {"_id": 0}).to_list(100)
    return decks

@api_router.post("/flashcards/generate")
async def generate_flashcards(data: GenerateFlashcardsRequest, current_user: dict = Depends(get_current_user)):
    # Get subject name
    subject_name = "Engineering"
    if data.subject_id:
        subject = await db.subjects.find_one({"id": data.subject_id}, {"_id": 0})
        if subject:
            subject_name = subject['name']
    
    # Create a deck for these flashcards
    deck = FlashcardDeck(
        user_id=current_user['id'],
        name=f"{data.topic} Flashcards",
        description=f"AI-generated flashcards for {data.topic}",
        subject_id=data.subject_id
    )
    
    deck_dict = deck.model_dump()
    deck_dict['created_at'] = deck_dict['created_at'].isoformat()
    await db.flashcard_decks.insert_one(deck_dict)
    
    # Generate flashcards
    cards_data = await generate_flashcards_ai(data.topic, subject_name, data.count)
    
    # Save flashcards
    cards = []
    for card_data in cards_data:
        card = Flashcard(
            user_id=current_user['id'],
            deck_id=deck.id,
            front=card_data['front'],
            back=card_data['back'],
            tags=card_data.get('tags', [])
        )
        card_dict = card.model_dump()
        card_dict['created_at'] = card_dict['created_at'].isoformat()
        card_dict['next_review'] = card_dict['next_review'].isoformat()
        await db.flashcards.insert_one(card_dict)
        cards.append({
            "id": card.id,
            "front": card.front,
            "back": card.back,
            "tags": card.tags
        })
    
    # Update deck card count
    await db.flashcard_decks.update_one(
        {"id": deck.id},
        {"$set": {"card_count": len(cards)}}
    )
    
    return {
        "deck_id": deck.id,
        "deck_name": deck.name,
        "cards": cards,
        "count": len(cards)
    }

@api_router.get("/flashcards/deck/{deck_id}")
async def get_deck_cards(deck_id: str, current_user: dict = Depends(get_current_user)):
    deck = await db.flashcard_decks.find_one({"id": deck_id, "user_id": current_user['id']}, {"_id": 0})
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    cards = await db.flashcards.find({"deck_id": deck_id}, {"_id": 0}).to_list(500)
    
    return {
        "deck": deck,
        "cards": cards
    }

@api_router.get("/flashcards/review")
async def get_cards_for_review(current_user: dict = Depends(get_current_user)):
    """Get cards due for review using spaced repetition"""
    now = datetime.now(timezone.utc).isoformat()
    
    cards = await db.flashcards.find(
        {"user_id": current_user['id'], "next_review": {"$lte": now}},
        {"_id": 0}
    ).limit(20).to_list(20)
    
    return cards

@api_router.post("/flashcards/{card_id}/review")
async def review_flashcard(card_id: str, data: FlashcardReviewRequest, current_user: dict = Depends(get_current_user)):
    """Update card after review using SM-2 algorithm simplified"""
    card = await db.flashcards.find_one({"id": card_id, "user_id": current_user['id']}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Simplified spaced repetition
    intervals = {
        0: 1,      # Again - 1 minute
        1: 10,     # Hard - 10 minutes
        2: 1440,   # Good - 1 day
        3: 4320    # Easy - 3 days
    }
    
    minutes = intervals.get(data.difficulty, 1440)
    next_review = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    
    await db.flashcards.update_one(
        {"id": card_id},
        {"$set": {
            "difficulty": data.difficulty,
            "next_review": next_review.isoformat(),
            "review_count": card.get('review_count', 0) + 1
        }}
    )
    
    return {"message": "Review recorded", "next_review": next_review.isoformat()}

@api_router.post("/flashcards")
async def create_flashcard(deck_id: str, data: FlashcardCreate, current_user: dict = Depends(get_current_user)):
    card = Flashcard(
        user_id=current_user['id'],
        deck_id=deck_id,
        front=data.front,
        back=data.back,
        tags=data.tags
    )
    
    card_dict = card.model_dump()
    card_dict['created_at'] = card_dict['created_at'].isoformat()
    card_dict['next_review'] = card_dict['next_review'].isoformat()
    await db.flashcards.insert_one(card_dict)
    
    # Update deck count
    await db.flashcard_decks.update_one(
        {"id": deck_id},
        {"$inc": {"card_count": 1}}
    )
    
    return {"id": card.id, "front": card.front, "back": card.back}

@api_router.delete("/flashcards/{card_id}")
async def delete_flashcard(card_id: str, current_user: dict = Depends(get_current_user)):
    card = await db.flashcards.find_one({"id": card_id, "user_id": current_user['id']}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    await db.flashcards.delete_one({"id": card_id})
    await db.flashcard_decks.update_one(
        {"id": card['deck_id']},
        {"$inc": {"card_count": -1}}
    )
    
    return {"message": "Card deleted"}

@api_router.delete("/flashcards/decks/{deck_id}")
async def delete_deck(deck_id: str, current_user: dict = Depends(get_current_user)):
    await db.flashcards.delete_many({"deck_id": deck_id, "user_id": current_user['id']})
    await db.flashcard_decks.delete_one({"id": deck_id, "user_id": current_user['id']})
    return {"message": "Deck and all cards deleted"}

# ==================== EXPORT ROUTES ====================

@api_router.get("/export/ics")
async def export_to_ics(current_user: dict = Depends(get_current_user)):
    plan = await db.study_plans.find_one({"user_id": current_user['id']}, {"_id": 0})
    
    if not plan or not plan.get('sessions'):
        raise HTTPException(status_code=404, detail="No study plan found")
    
    # Generate ICS content
    ics_content = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//EduBloom//AI Study Planner//EN\n"
    
    for session in plan['sessions']:
        date = session['date'].replace("-", "")
        start = session['start_time'].replace(":", "") + "00"
        end = session['end_time'].replace(":", "") + "00"
        
        ics_content += f"""BEGIN:VEVENT
DTSTART:{date}T{start}
DTEND:{date}T{end}
SUMMARY:{session['subject_name']} - {session['session_type'].title()}
DESCRIPTION:Topics: {', '.join(session.get('topics', []))}\\nCognitive Load: {session['cognitive_load']}
UID:{session['id']}@studysage
END:VEVENT
"""
    
    ics_content += "END:VCALENDAR"
    
    return StreamingResponse(
        io.BytesIO(ics_content.encode()),
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=study-plan.ics"}
    )

@api_router.get("/export/pdf-data")
async def get_pdf_data(current_user: dict = Depends(get_current_user)):
    """Return data needed for PDF generation on frontend"""
    user = await db.users.find_one({"id": current_user['id']}, {"_id": 0, "password": 0})
    subjects = await db.subjects.find({"user_id": current_user['id']}, {"_id": 0}).to_list(100)
    plan = await db.study_plans.find_one({"user_id": current_user['id']}, {"_id": 0})
    stats = await get_progress_stats(current_user)
    
    return {
        "user": user,
        "subjects": subjects,
        "plan": plan,
        "stats": stats
    }

# ==================== ROOT ROUTE ====================

@api_router.get("/")
async def root():
    return {"message": "EduBloom API - AI Study Planner for Engineering Students"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
