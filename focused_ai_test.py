#!/usr/bin/env python3

import requests
import json
import time
from datetime import datetime, timedelta

def test_ai_features():
    """Test AI features with longer timeout"""
    base_url = "https://feature-complete-32.preview.emergentagent.com/api"
    
    # Register a new user
    timestamp = int(time.time())
    test_data = {
        "name": f"AI Test User {timestamp}",
        "email": f"aitest{timestamp}@example.com", 
        "password": "testpass123"
    }
    
    print("🔄 Registering test user...")
    response = requests.post(f"{base_url}/auth/register", json=test_data, timeout=30)
    if response.status_code != 200:
        print(f"❌ Registration failed: {response.status_code}")
        return False
    
    token = response.json()['token']
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # Complete onboarding
    onboarding_data = {
        "college": "AI Test University",
        "branch": "Computer Science Engineering", 
        "graduation_year": 2025,
        "weekday_hours": 4.0,
        "weekend_hours": 8.0,
        "preferred_study_time": "evening",
        "target_date": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
    }
    
    print("🔄 Completing onboarding...")
    requests.post(f"{base_url}/user/onboarding", json=onboarding_data, headers=headers, timeout=30)
    
    # Create a subject
    subject_data = {
        "name": "Data Structures",
        "credits": 4,
        "strong_areas": ["Arrays", "Linked Lists"],
        "weak_areas": ["Trees", "Graphs", "Dynamic Programming"],
        "confidence_level": 2
    }
    
    print("🔄 Creating subject...")
    subject_response = requests.post(f"{base_url}/subjects", json=subject_data, headers=headers, timeout=30)
    if subject_response.status_code != 200:
        print(f"❌ Subject creation failed: {subject_response.status_code}")
        return False
    
    # Test AI Study Plan Generation with longer timeout
    print("🔄 Testing AI Study Plan Generation (60 second timeout)...")
    start_time = time.time()
    
    try:
        plan_response = requests.post(
            f"{base_url}/study-plan/generate", 
            json={"regenerate": False}, 
            headers=headers, 
            timeout=60
        )
        
        generation_time = time.time() - start_time
        print(f"⏱️  Plan generation took {generation_time:.2f} seconds")
        
        if plan_response.status_code == 200:
            plan_data = plan_response.json()
            print("✅ AI Study Plan Generation - SUCCESS")
            print(f"   📋 Generated {len(plan_data.get('sessions', []))} study sessions")
            print(f"   📚 Subject breakdown: {len(plan_data.get('subject_breakdown', {}))}")
            print(f"   💡 Recommendations: {len(plan_data.get('recommendations', []))}")
        else:
            print(f"❌ AI Study Plan Generation - FAILED: {plan_response.status_code}")
            try:
                error_data = plan_response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   Response: {plan_response.text[:200]}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ AI Study Plan Generation - TIMEOUT (60 seconds)")
        return False
    except Exception as e:
        print(f"❌ AI Study Plan Generation - EXCEPTION: {e}")
        return False
    
    # Test Quiz Generation
    print("🔄 Testing AI Quiz Generation...")
    start_time = time.time()
    
    quiz_data = {
        "topic": "Data Structures",
        "num_questions": 5,
        "difficulty": "medium"
    }
    
    try:
        quiz_response = requests.post(
            f"{base_url}/quiz/generate",
            json=quiz_data,
            headers=headers,
            timeout=45
        )
        
        generation_time = time.time() - start_time
        print(f"⏱️  Quiz generation took {generation_time:.2f} seconds")
        
        if quiz_response.status_code == 200:
            quiz_data = quiz_response.json()
            print("✅ AI Quiz Generation - SUCCESS")
            print(f"   ❓ Generated {len(quiz_data.get('questions', []))} questions")
            print(f"   📝 Topic: {quiz_data.get('topic')}")
            print(f"   🎯 Difficulty: {quiz_data.get('difficulty')}")
        else:
            print(f"❌ AI Quiz Generation - FAILED: {quiz_response.status_code}")
            try:
                error_data = quiz_response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   Response: {quiz_response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ AI Quiz Generation - EXCEPTION: {e}")
        return False
    
    # Test Flashcard Generation
    print("🔄 Testing AI Flashcard Generation...")
    start_time = time.time()
    
    flashcard_data = {
        "topic": "Algorithms",
        "count": 5
    }
    
    try:
        flashcard_response = requests.post(
            f"{base_url}/flashcards/generate",
            json=flashcard_data,
            headers=headers,
            timeout=45
        )
        
        generation_time = time.time() - start_time
        print(f"⏱️  Flashcard generation took {generation_time:.2f} seconds")
        
        if flashcard_response.status_code == 200:
            flashcard_data = flashcard_response.json()
            print("✅ AI Flashcard Generation - SUCCESS")
            print(f"   🃏 Generated {len(flashcard_data.get('cards', []))} flashcards")
            print(f"   📚 Deck: {flashcard_data.get('deck_name')}")
        else:
            print(f"❌ AI Flashcard Generation - FAILED: {flashcard_response.status_code}")
            try:
                error_data = flashcard_response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   Response: {flashcard_response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ AI Flashcard Generation - EXCEPTION: {e}")
        return False
    
    # Test YouTube Summarizer
    print("🔄 Testing YouTube Summarizer...")
    start_time = time.time()
    
    youtube_data = {
        "url": "https://www.youtube.com/watch?v=8hly31xKli0",  # Educational video
        "subject_id": None
    }
    
    try:
        youtube_response = requests.post(
            f"{base_url}/youtube/summarize",
            json=youtube_data,
            headers=headers,
            timeout=45
        )
        
        generation_time = time.time() - start_time
        print(f"⏱️  YouTube summarization took {generation_time:.2f} seconds")
        
        if youtube_response.status_code == 200:
            youtube_data = youtube_response.json()
            print("✅ YouTube Summarizer - SUCCESS")
            print(f"   🎥 Video: {youtube_data.get('video_title')}")
            print(f"   📝 Summary length: {len(youtube_data.get('summary', ''))}")
            print(f"   🔑 Key points: {len(youtube_data.get('key_points', []))}")
        else:
            print(f"❌ YouTube Summarizer - FAILED: {youtube_response.status_code}")
            try:
                error_data = youtube_response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   Response: {youtube_response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ YouTube Summarizer - EXCEPTION: {e}")
        return False
    
    # Test AI Assistant
    print("🔄 Testing AI Assistant...")
    start_time = time.time()
    
    chat_data = {
        "message": "Explain binary search algorithm and its time complexity"
    }
    
    try:
        chat_response = requests.post(
            f"{base_url}/chat/assistant",
            json=chat_data,
            headers=headers,
            timeout=30
        )
        
        generation_time = time.time() - start_time
        print(f"⏱️  AI assistant response took {generation_time:.2f} seconds")
        
        if chat_response.status_code == 200:
            chat_data = chat_response.json()
            print("✅ AI Assistant - SUCCESS")
            print(f"   💬 Response length: {len(chat_data.get('response', ''))}")
        else:
            print(f"❌ AI Assistant - FAILED: {chat_response.status_code}")
            try:
                error_data = chat_response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   Response: {chat_response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ AI Assistant - EXCEPTION: {e}")
        return False
    
    print("\n🎉 All AI features tested successfully with Emergent LLM key!")
    return True

if __name__ == "__main__":
    success = test_ai_features()
    exit(0 if success else 1)