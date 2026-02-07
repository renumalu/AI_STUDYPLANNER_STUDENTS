#!/usr/bin/env python3

import requests
import json
import time
from datetime import datetime, timedelta

def test_data_persistence():
    """Test data persistence for all features"""
    base_url = "https://feature-complete-32.preview.emergentagent.com/api"
    
    # Register a new user
    timestamp = int(time.time())
    test_data = {
        "name": f"Persistence Test User {timestamp}",
        "email": f"persist{timestamp}@example.com", 
        "password": "testpass123"
    }
    
    print("🔄 Testing Data Persistence...")
    response = requests.post(f"{base_url}/auth/register", json=test_data, timeout=30)
    if response.status_code != 200:
        print(f"❌ Registration failed: {response.status_code}")
        return False
    
    token = response.json()['token']
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # Complete onboarding
    onboarding_data = {
        "college": "Persistence Test University",
        "branch": "Computer Science Engineering", 
        "graduation_year": 2025,
        "weekday_hours": 4.0,
        "weekend_hours": 8.0,
        "preferred_study_time": "evening",
        "target_date": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
    }
    
    requests.post(f"{base_url}/user/onboarding", json=onboarding_data, headers=headers, timeout=30)
    
    # Create a subject
    subject_data = {
        "name": "Software Engineering",
        "credits": 3,
        "strong_areas": ["Design Patterns", "Testing"],
        "weak_areas": ["Architecture", "DevOps"],
        "confidence_level": 3
    }
    
    subject_response = requests.post(f"{base_url}/subjects", json=subject_data, headers=headers, timeout=30)
    subject_id = subject_response.json()['id']
    
    # Generate and save study plan
    print("📋 Testing Study Plan Persistence...")
    plan_response = requests.post(f"{base_url}/study-plan/generate", json={"regenerate": False}, headers=headers, timeout=60)
    if plan_response.status_code == 200:
        print("✅ Study Plan saved successfully")
        
        # Verify retrieval
        get_plan = requests.get(f"{base_url}/study-plan", headers=headers, timeout=30)
        if get_plan.status_code == 200 and get_plan.json():
            print("✅ Study Plan retrieved successfully")
        else:
            print("❌ Study Plan retrieval failed")
            return False
    else:
        print("❌ Study Plan generation failed")
        return False
    
    # Generate and save quiz
    print("❓ Testing Quiz Persistence...")
    quiz_data = {"topic": "Software Testing", "num_questions": 3, "difficulty": "medium"}
    quiz_response = requests.post(f"{base_url}/quiz/generate", json=quiz_data, headers=headers, timeout=45)
    if quiz_response.status_code == 200:
        quiz_id = quiz_response.json()['id']
        
        # Submit quiz to save to history
        answers = {}
        for q in quiz_response.json()['questions']:
            answers[q['id']] = 0
        
        submit_response = requests.post(f"{base_url}/quiz/{quiz_id}/submit", json={"answers": answers}, headers=headers, timeout=30)
        if submit_response.status_code == 200:
            print("✅ Quiz submitted and saved to history")
            
            # Verify history
            history_response = requests.get(f"{base_url}/quiz/history", headers=headers, timeout=30)
            if history_response.status_code == 200 and len(history_response.json()) > 0:
                print("✅ Quiz history retrieved successfully")
            else:
                print("❌ Quiz history retrieval failed")
                return False
        else:
            print("❌ Quiz submission failed")
            return False
    else:
        print("❌ Quiz generation failed")
        return False
    
    # Generate and save flashcards
    print("🃏 Testing Flashcard Persistence...")
    flashcard_data = {"topic": "Design Patterns", "count": 3}
    flashcard_response = requests.post(f"{base_url}/flashcards/generate", json=flashcard_data, headers=headers, timeout=45)
    if flashcard_response.status_code == 200:
        deck_id = flashcard_response.json()['deck_id']
        print("✅ Flashcard deck created and saved")
        
        # Verify deck retrieval
        deck_response = requests.get(f"{base_url}/flashcards/deck/{deck_id}", headers=headers, timeout=30)
        if deck_response.status_code == 200:
            deck_data = deck_response.json()
            if len(deck_data['cards']) == 3:
                print("✅ Flashcard deck retrieved with correct card count")
            else:
                print(f"❌ Expected 3 cards, got {len(deck_data['cards'])}")
                return False
        else:
            print("❌ Flashcard deck retrieval failed")
            return False
    else:
        print("❌ Flashcard generation failed")
        return False
    
    # Generate and save YouTube summary
    print("🎥 Testing YouTube Summary Persistence...")
    youtube_data = {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
    youtube_response = requests.post(f"{base_url}/youtube/summarize", json=youtube_data, headers=headers, timeout=45)
    if youtube_response.status_code == 200:
        summary_id = youtube_response.json()['id']
        print("✅ YouTube summary created and saved")
        
        # Verify summaries retrieval
        summaries_response = requests.get(f"{base_url}/youtube/summaries", headers=headers, timeout=30)
        if summaries_response.status_code == 200 and len(summaries_response.json()) > 0:
            print("✅ YouTube summaries retrieved successfully")
        else:
            print("❌ YouTube summaries retrieval failed")
            return False
    else:
        print("❌ YouTube summarization failed")
        return False
    
    # Test AI chat and history
    print("💬 Testing Chat History Persistence...")
    chat_data = {"message": "Explain the Singleton design pattern"}
    chat_response = requests.post(f"{base_url}/chat/assistant", json=chat_data, headers=headers, timeout=30)
    if chat_response.status_code == 200:
        print("✅ AI chat message sent and saved")
        
        # Verify chat history
        history_response = requests.get(f"{base_url}/chat/history", headers=headers, timeout=30)
        if history_response.status_code == 200 and len(history_response.json()) >= 2:  # User + Assistant messages
            print("✅ Chat history retrieved successfully")
        else:
            print("❌ Chat history retrieval failed")
            return False
    else:
        print("❌ AI chat failed")
        return False
    
    # Test export functionality
    print("📤 Testing Export Features...")
    
    # Test PDF data export
    pdf_response = requests.get(f"{base_url}/export/pdf-data", headers=headers, timeout=30)
    if pdf_response.status_code == 200:
        pdf_data = pdf_response.json()
        if 'user' in pdf_data and 'subjects' in pdf_data and 'plan' in pdf_data:
            print("✅ PDF data export working")
        else:
            print("❌ PDF data export incomplete")
            return False
    else:
        print("❌ PDF data export failed")
        return False
    
    # Test ICS export
    ics_response = requests.get(f"{base_url}/export/ics", headers=headers, timeout=30)
    if ics_response.status_code == 200:
        print("✅ ICS calendar export working")
    else:
        print("❌ ICS calendar export failed")
        return False
    
    print("\n🎉 All data persistence tests passed!")
    return True

if __name__ == "__main__":
    success = test_data_persistence()
    exit(0 if success else 1)