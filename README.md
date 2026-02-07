# 🎓 EduBloom - AI-Powered Study Planner for Engineering Students

<div align="center">

![EduBloom Banner](https://images.pexels.com/photos/6283211/pexels-photo-6283211.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1)

**Study Smarter, Not Harder** 🚀

[![Live Demo](https://img.shields.io/badge/Live%20Demo-EduBloom-6366F1?style=for-the-badge&logo=vercel)](https://feature-complete-32.preview.emergentagent.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)

</div>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Screenshots](#-screenshots)
- [Installation](#-installation)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [Team](#-team)

---

## 🎯 Problem Statement

Engineering students face a uniquely demanding academic environment:

- **Cognitive Load Imbalance** – Different subjects demand different levels of mental effort
- **Prerequisite Dependencies** – Courses build heavily on prior concepts
- **Dynamic Prioritization Issues** – Deadlines and difficulties constantly shift priorities
- **Inefficient Study Patterns** – Cramming leads to poor retention and high stress
- **Lack of Personalization** – Existing tools don't adapt to individual learning patterns

---

## 💡 Our Solution

**EduBloom** is an AI-powered study planner that transforms how engineering students approach their academics:

```
┌─────────────────────────────────────────────────────────────────┐
│                         STUDYSAGE                                │
│                                                                  │
│   📊 Analyze    →    🤖 AI Process    →    📅 Generate Plan     │
│                                                                  │
│   • Subjects         • Cognitive Load       • Smart Schedule    │
│   • Deadlines        • Prerequisites        • Session Types     │
│   • Confidence       • Weak Areas           • Recommendations   │
│   • Availability     • Learning Style       • Progress Track    │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🎬 YouTube Summarizer (NEW!)
- Paste any educational YouTube video URL
- **AI-powered summary** with key points and timestamps
- Save summaries for later reference
- **Export to PDF** for offline studying
- History sidebar for previously summarized videos

### 📝 Quiz System (NEW!)
- **AI-generated MCQ quizzes** based on any topic
- Difficulty levels: Easy, Medium, Hard
- Instant feedback with explanations
- Score tracking and quiz history
- Visual results with correct/incorrect indicators

### 🃏 Flashcard System (NEW!)
- **AI-powered flashcard generation** from any topic
- Beautiful flip-card interface
- **Spaced repetition algorithm** (SM-2 inspired)
- Manual card creation option
- Deck management with statistics
- Review mode with difficulty ratings (Again/Hard/Good/Easy)

### 🧠 AI-Powered Study Plan Generation
- **Smart Scheduling Algorithm** using Google Gemini AI
- Analyzes subject difficulty, credits, and confidence levels
- Allocates more time to weak areas and high-credit subjects
- Schedules high cognitive load tasks during preferred study times

### ⏱️ Pomodoro Timer
- Built-in 25/5 minute focus timer
- Session tracking and completion counter
- Start, Pause, Reset controls
- Visual mode indicator (Focus/Break)

### 🎮 Gamification System
- Level progression with XP rewards
- 25 XP per completed session
- Visual level indicator on dashboard
- Progress tracking towards next level

### 📅 Visual Calendar with Cognitive Load Indicators
- **Color-coded sessions** based on cognitive demand (High/Medium/Low)
- Daily, weekly, and monthly views
- Session types: Learning, Practice, Revision, Buffer
- One-click session completion tracking

### 📊 Progress Tracking & Analytics
- Real-time confidence level tracking per subject
- Study hours and completion statistics
- Weekly progress chart
- Subject time distribution pie chart
- Star ratings for confidence visualization

### 🤖 AI Study Assistant (Chatbot)
- Personalized study tips and guidance
- Subject-specific help and explanations
- Time management advice
- Motivational support

### 📤 Export Capabilities
- **Google Calendar (.ics)** - Import directly to any calendar app
- **PDF Export** - Printable study plan with all details

### 🌙 Dark/Light Theme
- Beautiful Electric Swiss design system
- Automatic theme detection
- Smooth transitions

### 📱 Mobile Responsive
- Fully responsive design
- Bottom navigation for mobile
- Touch-friendly interface

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI Framework |
| **Tailwind CSS** | Styling |
| **Shadcn/UI** | Component Library |
| **React Router** | Navigation |
| **Axios** | HTTP Client |
| **date-fns** | Date Manipulation |
| **Lucide React** | Icons |
| **Recharts** | Charts & Graphs |

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** | Python Web Framework |
| **MongoDB** | NoSQL Database |
| **Motor** | Async MongoDB Driver |
| **PyJWT** | Authentication |
| **Bcrypt** | Password Hashing |
| **Pydantic** | Data Validation |

### AI & Services
| Technology | Purpose |
|------------|---------|
| **Google Gemini AI** | Study Plan Generation & Chatbot |
| **emergentintegrations** | AI Integration Library |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  Login  │ │Onboard  │ │Dashboard│ │Calendar │ │Assistant│   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
│       │           │           │           │           │         │
│       └───────────┴───────────┴───────────┴───────────┘         │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │   Axios + Auth    │                        │
│                    └─────────┬─────────┘                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────┼──────────────────────────────────┐
│                        BACKEND (FastAPI)                         │
│                    ┌─────────▼─────────┐                        │
│                    │   API Router      │                        │
│                    │   /api/*          │                        │
│                    └─────────┬─────────┘                        │
│       ┌──────────────────────┼──────────────────────┐           │
│       ▼                      ▼                      ▼           │
│  ┌─────────┐           ┌─────────┐           ┌─────────┐       │
│  │  Auth   │           │ Subjects│           │  Plan   │       │
│  │ Service │           │ Service │           │Generator│       │
│  └────┬────┘           └────┬────┘           └────┬────┘       │
│       │                     │                     │             │
│       └─────────────────────┼─────────────────────┘             │
│                             ▼                                   │
│                    ┌─────────────────┐                          │
│                    │    MongoDB      │                          │
│                    │   (Database)    │                          │
│                    └─────────────────┘                          │
│                             │                                   │
│                    ┌────────▼────────┐                          │
│                    │   Gemini AI     │                          │
│                    │  (External API) │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📸 Screenshots

### Login Page
Beautiful split-screen design with hero image and clean login form.

### Dashboard
- Welcome message with personalized greeting
- Stats overview (Subjects, Confidence, Completion, Hours)
- Today's study sessions with cognitive load indicators
- AI Recommendations
- Subject progress tracking
- Next steps guidance

### Calendar View
- Full month calendar with color-coded dates
- Session details on date selection
- Cognitive load legend
- Weekly overview

### AI Study Assistant
- Conversational interface
- Suggested questions for quick start
- Context-aware responses based on your subjects

### Dark Mode
- Beautiful dark theme with Electric Swiss design
- Deep zinc background with violet accents

---

## 🚀 Installation

### Prerequisites
- Node.js 18+ & Yarn
- Python 3.10+
- MongoDB 7.0+
- Gemini API Key

### Clone Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/studysage.git
cd studysage
```

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="studysage"
CORS_ORIGINS="*"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
GEMINI_API_KEY="your-gemini-api-key"
EOF

# Run the server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
yarn install

# Create .env file
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

# Run the development server
yarn start
```

### Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/api
- API Docs: http://localhost:8001/docs

---

## ☁️ Deployment

### Option 1: Docker Deployment

```dockerfile
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=studysage
      - JWT_SECRET=${JWT_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=http://backend:8001
    depends_on:
      - backend

volumes:
  mongo_data:
```

```bash
docker-compose up -d
```

### Option 2: Vercel + Railway

**Frontend (Vercel):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

**Backend (Railway):**
1. Connect your GitHub repo to Railway
2. Add environment variables
3. Deploy automatically

### Option 3: AWS/GCP/Azure

1. **Database**: MongoDB Atlas (Free Tier)
2. **Backend**: AWS Lambda / Cloud Run / Azure Functions
3. **Frontend**: S3 + CloudFront / Firebase Hosting / Azure Static Web Apps

---

## 📚 API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login user |

### User

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/profile` | GET | Get user profile |
| `/api/user/profile` | PUT | Update profile |
| `/api/user/onboarding` | POST | Complete onboarding |

### Subjects

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/subjects` | GET | Get all subjects |
| `/api/subjects` | POST | Create subject |
| `/api/subjects/{id}` | PUT | Update subject |
| `/api/subjects/{id}` | DELETE | Delete subject |

### Study Plan

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/study-plan` | GET | Get current plan |
| `/api/study-plan/generate` | POST | Generate new plan |
| `/api/study-plan/session/{id}/complete` | PUT | Mark session complete |

### AI Chat

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/assistant` | POST | Send message to AI |
| `/api/chat/history` | GET | Get chat history |
| `/api/chat/history` | DELETE | Clear chat history |

### Export

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/export/ics` | GET | Download .ics file |
| `/api/export/pdf-data` | GET | Get PDF data |

---

## 🔮 Future Roadmap

### Phase 2 - Advanced Analytics
- [ ] Weekly confidence checkpoints with graphs
- [ ] Study pattern analysis
- [ ] Performance predictions

### Phase 3 - Collaboration
- [ ] Study groups
- [ ] Leaderboards
- [ ] Peer tutoring

### Phase 4 - Extended Platform
- [ ] Mobile app (React Native)
- [ ] Browser extension
- [ ] LMS integrations

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👥 Team

| Name | Role | GitHub |
|------|------|--------|
| Your Name | Full Stack Developer | [@yourusername](https://github.com/yourusername) |

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ for Engineering Students**

⭐ Star this repo if you found it helpful!

</div>
