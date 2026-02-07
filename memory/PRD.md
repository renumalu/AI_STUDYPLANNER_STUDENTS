# EduBloom - AI Study Planner for Engineering Students

## Original Problem Statement
Build an AI-powered study planner tailored specifically for engineering students that:
- Analyzes subjects, deadlines, prerequisites, and cognitive load
- Creates personalized, adaptive study schedules
- Helps students balance deep learning with timely completion
- Evolves dynamically as priorities, performance, and difficulty change

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **AI**: Gemini API for study plan generation and chatbot

## User Personas
1. **Engineering Students** (18-25 years): Need help organizing study schedules across multiple complex subjects
2. **Students with Variable Schedules**: Different availability on weekdays vs weekends
3. **Students Preparing for Exams**: Need prioritization based on confidence levels and deadlines

## Core Requirements (Static)
1. JWT-based authentication (email/password)
2. Multi-step onboarding flow
3. Subject management with confidence tracking
4. AI-powered study plan generation
5. Visual calendar with color-coded sessions
6. Progress tracking and analytics
7. AI study assistant chatbot
8. Export to Google Calendar (.ics) and PDF
9. Dark/Light theme support

## What's Been Implemented (Feb 7, 2026)
- ✅ User registration and login with JWT auth
- ✅ 4-step onboarding flow (Student Details, Study Time, Subjects, Review)
- ✅ Subject CRUD with confidence levels, strong/weak areas
- ✅ AI study plan generation using Gemini API
- ✅ Dashboard with stats, today's sessions, recommendations
- ✅ Calendar view with cognitive load indicators
- ✅ AI Study Assistant chatbot
- ✅ Settings page with profile management
- ✅ Export to ICS (Google Calendar) and PDF
- ✅ Dark/Light theme toggle
- ✅ Mobile-responsive design

## Prioritized Backlog
### P0 (Critical) - DONE
- Authentication ✅
- Onboarding ✅
- Study plan generation ✅
- Dashboard ✅

### P1 (High Priority) - DONE
- Calendar view ✅
- AI Assistant ✅
- Export features ✅

### P2 (Medium Priority)
- [ ] Weekly confidence checkpoints with progress graphs
- [ ] Automatic rebalancing suggestions
- [ ] Push notifications for study reminders
- [ ] Pomodoro timer integration

## Next Tasks
1. Add weekly confidence checkpoints with visual progress tracking
2. Implement automatic study plan rebalancing based on confidence changes
3. Add study session completion analytics with charts
4. Integrate push notifications for session reminders
5. Add social features (study groups, leaderboards)
