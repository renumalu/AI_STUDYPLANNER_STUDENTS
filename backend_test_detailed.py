#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import time

class EduBloomDetailedTester:
    def __init__(self, base_url="https://feature-complete-32.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_resources = {}

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return response.text
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_authentication_comprehensive(self):
        """Comprehensive authentication testing"""
        print("\n🔐 AUTHENTICATION TESTS")
        print("-" * 40)
        
        # Test invalid registration
        invalid_data = {
            "name": "Test User",
            "email": "invalid-email",
            "password": "123"  # Too short
        }
        self.run_test("Register Invalid Email", "POST", "auth/register", 400, invalid_data)
        
        # Test valid registration
        timestamp = int(time.time())
        valid_data = {
            "name": f"EduBloom Tester {timestamp}",
            "email": f"edutest{timestamp}@university.edu",
            "password": "securepass123"
        }
        
        result = self.run_test("Register Valid User", "POST", "auth/register", 200, valid_data)
        if result and 'token' in result:
            self.token = result['token']
            self.user_id = result['user']['id']
            self.created_resources['user_email'] = valid_data['email']
            self.created_resources['user_password'] = valid_data['password']
        
        # Test duplicate registration
        self.run_test("Register Duplicate Email", "POST", "auth/register", 400, valid_data)
        
        # Test login with valid credentials
        login_data = {
            "email": valid_data['email'],
            "password": valid_data['password']
        }
        login_result = self.run_test("Login Valid Credentials", "POST", "auth/login", 200, login_data)
        
        # Test login with invalid credentials
        invalid_login = {
            "email": valid_data['email'],
            "password": "wrongpassword"
        }
        self.run_test("Login Invalid Password", "POST", "auth/login", 401, invalid_login)
        
        # Test protected endpoint without token
        old_token = self.token
        self.token = None
        self.run_test("Access Protected Without Token", "GET", "user/profile", 401)
        self.token = old_token
        
        # Test protected endpoint with invalid token
        old_token = self.token
        self.token = "invalid_token"
        self.run_test("Access Protected Invalid Token", "GET", "user/profile", 401)
        self.token = old_token

    def test_user_profile_comprehensive(self):
        """Comprehensive user profile testing"""
        print("\n👤 USER PROFILE TESTS")
        print("-" * 40)
        
        if not self.token:
            print("❌ Skipping profile tests - no authentication token")
            return
        
        # Get initial profile
        profile = self.run_test("Get User Profile", "GET", "user/profile", 200)
        
        # Complete onboarding with comprehensive data
        onboarding_data = {
            "college": "Indian Institute of Technology Delhi",
            "branch": "Computer Science and Engineering",
            "graduation_year": 2025,
            "weekday_hours": 5.0,
            "weekend_hours": 10.0,
            "preferred_study_time": "morning",
            "target_date": (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d")
        }
        
        self.run_test("Complete Onboarding", "POST", "user/onboarding", 200, onboarding_data)
        
        # Update profile
        update_data = {
            "name": "Updated EduBloom User",
            "weekday_hours": 6.0,
            "preferred_study_time": "evening"
        }
        
        self.run_test("Update Profile", "PUT", "user/profile", 200, update_data)
        
        # Verify profile updates
        updated_profile = self.run_test("Get Updated Profile", "GET", "user/profile", 200)
        if updated_profile:
            if updated_profile.get('name') == update_data['name']:
                self.log_test("Profile Name Update Verification", True)
            else:
                self.log_test("Profile Name Update Verification", False, "Name not updated correctly")

    def test_subjects_comprehensive(self):
        """Comprehensive subject management testing"""
        print("\n📚 SUBJECT MANAGEMENT TESTS")
        print("-" * 40)
        
        if not self.token:
            print("❌ Skipping subject tests - no authentication token")
            return
        
        # Create multiple subjects
        subjects_data = [
            {
                "name": "Data Structures and Algorithms",
                "credits": 4,
                "strong_areas": ["Arrays", "Linked Lists", "Stacks"],
                "weak_areas": ["Trees", "Graphs", "Dynamic Programming"],
                "confidence_level": 3,
                "color": "#6366F1"
            },
            {
                "name": "Database Management Systems",
                "credits": 3,
                "strong_areas": ["SQL Basics", "ER Diagrams"],
                "weak_areas": ["Normalization", "Transactions", "Indexing"],
                "confidence_level": 2,
                "color": "#8B5CF6"
            },
            {
                "name": "Operating Systems",
                "credits": 4,
                "strong_areas": ["Process Management"],
                "weak_areas": ["Memory Management", "File Systems", "Deadlocks"],
                "confidence_level": 4,
                "color": "#EC4899"
            }
        ]
        
        created_subjects = []
        for i, subject_data in enumerate(subjects_data):
            result = self.run_test(f"Create Subject {i+1}: {subject_data['name']}", "POST", "subjects", 200, subject_data)
            if result:
                created_subjects.append(result)
        
        self.created_resources['subjects'] = created_subjects
        
        # Get all subjects
        all_subjects = self.run_test("Get All Subjects", "GET", "subjects", 200)
        if all_subjects and len(all_subjects) >= 3:
            self.log_test("Subject Count Verification", True, f"Found {len(all_subjects)} subjects")
        else:
            self.log_test("Subject Count Verification", False, f"Expected at least 3 subjects, found {len(all_subjects) if all_subjects else 0}")
        
        # Update first subject
        if created_subjects:
            subject_id = created_subjects[0]['id']
            update_data = {
                "confidence_level": 5,
                "strong_areas": ["Arrays", "Linked Lists", "Stacks", "Queues"],
                "weak_areas": ["Trees", "Graphs"]
            }
            
            self.run_test("Update Subject Confidence", "PUT", f"subjects/{subject_id}", 200, update_data)
        
        # Test invalid subject operations
        self.run_test("Update Non-existent Subject", "PUT", "subjects/invalid-id", 404, {"confidence_level": 3})
        self.run_test("Delete Non-existent Subject", "DELETE", "subjects/invalid-id", 404)

    def test_progress_tracking_comprehensive(self):
        """Comprehensive progress tracking testing"""
        print("\n📈 PROGRESS TRACKING TESTS")
        print("-" * 40)
        
        if not self.token:
            print("❌ Skipping progress tests - no authentication token")
            return
        
        # Get initial stats
        initial_stats = self.run_test("Get Initial Progress Stats", "GET", "progress/stats", 200)
        
        # Update confidence for subjects
        if self.created_resources.get('subjects'):
            for subject in self.created_resources['subjects']:
                confidence_data = {
                    "subject_id": subject['id'],
                    "new_confidence": 4
                }
                self.run_test(f"Update Confidence for {subject['name'][:20]}", "POST", "progress/update-confidence", 200, confidence_data)
        
        # Get updated stats
        updated_stats = self.run_test("Get Updated Progress Stats", "GET", "progress/stats", 200)
        
        # Get progress history
        history = self.run_test("Get Progress History", "GET", "progress/history", 200)
        if history and len(history) > 0:
            self.log_test("Progress History Verification", True, f"Found {len(history)} history entries")
        else:
            self.log_test("Progress History Verification", False, "No progress history found")

    def test_non_ai_features(self):
        """Test all non-AI dependent features"""
        print("\n🔧 NON-AI FEATURES TESTS")
        print("-" * 40)
        
        if not self.token:
            print("❌ Skipping non-AI tests - no authentication token")
            return
        
        # Test export functionality
        pdf_data = self.run_test("Export PDF Data", "GET", "export/pdf-data", 200)
        if pdf_data:
            required_fields = ['user', 'subjects', 'stats']
            for field in required_fields:
                if field in pdf_data:
                    self.log_test(f"PDF Data Contains {field}", True)
                else:
                    self.log_test(f"PDF Data Contains {field}", False, f"Missing {field}")
        
        # Test ICS export (might fail if no study plan)
        try:
            ics_response = requests.get(f"{self.base_url}/export/ics", 
                                      headers={'Authorization': f'Bearer {self.token}'}, 
                                      timeout=30)
            if ics_response.status_code == 200:
                self.log_test("Export ICS Calendar", True, "ICS export successful")
            elif ics_response.status_code == 404:
                self.log_test("Export ICS Calendar", True, "No study plan found (expected)")
            else:
                self.log_test("Export ICS Calendar", False, f"Status: {ics_response.status_code}")
        except Exception as e:
            self.log_test("Export ICS Calendar", False, f"Exception: {str(e)}")

    def test_ai_dependent_features(self):
        """Test AI-dependent features and report their status"""
        print("\n🤖 AI-DEPENDENT FEATURES TESTS")
        print("-" * 40)
        
        if not self.token:
            print("❌ Skipping AI tests - no authentication token")
            return
        
        # Test study plan generation
        if self.created_resources.get('subjects'):
            plan_data = {"regenerate": False}
            print("🔄 Testing AI study plan generation...")
            plan_result = self.run_test("Generate AI Study Plan", "POST", "study-plan/generate", 200, plan_data)
            
            if plan_result:
                # Test getting the plan
                retrieved_plan = self.run_test("Get Study Plan", "GET", "study-plan", 200)
                
                # Test session completion if plan exists
                if retrieved_plan and retrieved_plan.get('sessions'):
                    session_id = retrieved_plan['sessions'][0]['id']
                    self.run_test("Mark Session Complete", "PUT", f"study-plan/session/{session_id}/complete", 200)
        
        # Test AI assistant
        chat_data = {"message": "What are effective study techniques for computer science?"}
        print("🔄 Testing AI assistant...")
        chat_result = self.run_test("AI Assistant Chat", "POST", "chat/assistant", 200, chat_data)
        
        if chat_result:
            # Test chat history
            history = self.run_test("Get Chat History", "GET", "chat/history", 200)
            # Clear chat history
            self.run_test("Clear Chat History", "DELETE", "chat/history", 200)
        
        # Test YouTube summarizer
        youtube_data = {
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "subject_id": self.created_resources.get('subjects', [{}])[0].get('id')
        }
        print("🔄 Testing YouTube summarization...")
        youtube_result = self.run_test("YouTube Video Summarization", "POST", "youtube/summarize", 200, youtube_data)
        
        if youtube_result:
            # Get summaries
            summaries = self.run_test("Get YouTube Summaries", "GET", "youtube/summaries", 200)
            
            # Try to delete summary
            if youtube_result.get('id'):
                self.run_test("Delete YouTube Summary", "DELETE", f"youtube/summaries/{youtube_result['id']}", 200)
        
        # Test quiz generation
        quiz_data = {
            "subject_id": self.created_resources.get('subjects', [{}])[0].get('id'),
            "topic": "Binary Search Trees",
            "num_questions": 5,
            "difficulty": "medium"
        }
        print("🔄 Testing quiz generation...")
        quiz_result = self.run_test("Generate AI Quiz", "POST", "quiz/generate", 200, quiz_data)
        
        if quiz_result and quiz_result.get('questions'):
            # Submit quiz
            answers = {}
            for question in quiz_result['questions']:
                answers[question['id']] = 0  # Select first option
            
            submit_data = {"answers": answers}
            submit_result = self.run_test("Submit Quiz", "POST", f"quiz/{quiz_result['id']}/submit", 200, submit_data)
            
            # Get quiz history
            self.run_test("Get Quiz History", "GET", "quiz/history", 200)
        
        # Test flashcard generation
        flashcard_data = {
            "topic": "Operating System Concepts",
            "subject_id": self.created_resources.get('subjects', [{}])[0].get('id'),
            "count": 5
        }
        print("🔄 Testing flashcard generation...")
        flashcard_result = self.run_test("Generate AI Flashcards", "POST", "flashcards/generate", 200, flashcard_data)
        
        if flashcard_result:
            deck_id = flashcard_result.get('deck_id')
            
            # Get deck cards
            if deck_id:
                deck_cards = self.run_test("Get Deck Cards", "GET", f"flashcards/deck/{deck_id}", 200)
                
                # Test manual card creation
                manual_card = {
                    "front": "What is a process?",
                    "back": "A program in execution with its own memory space",
                    "tags": ["process", "operating-systems"]
                }
                
                card_result = self.run_test("Create Manual Flashcard", "POST", f"flashcards?deck_id={deck_id}", 200, manual_card)
                
                if card_result:
                    card_id = card_result.get('id')
                    
                    # Test flashcard review
                    review_data = {"difficulty": 2}
                    self.run_test("Review Flashcard", "POST", f"flashcards/{card_id}/review", 200, review_data)
                    
                    # Delete card
                    self.run_test("Delete Flashcard", "DELETE", f"flashcards/{card_id}", 200)
                
                # Get cards for review
                self.run_test("Get Cards for Review", "GET", "flashcards/review", 200)
                
                # Delete deck
                self.run_test("Delete Flashcard Deck", "DELETE", f"flashcards/decks/{deck_id}", 200)

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("\n🧹 CLEANUP")
        print("-" * 40)
        
        if not self.token:
            return
        
        # Delete created subjects
        if self.created_resources.get('subjects'):
            for subject in self.created_resources['subjects']:
                self.run_test(f"Cleanup Subject: {subject['name'][:20]}", "DELETE", f"subjects/{subject['id']}", 200)

    def run_comprehensive_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting EduBloom Comprehensive API Test Suite")
        print("=" * 60)
        
        # Basic connectivity
        self.run_test("Health Check", "GET", "health", 200)
        self.run_test("Root Endpoint", "GET", "", 200)
        
        # Run test categories
        self.test_authentication_comprehensive()
        self.test_user_profile_comprehensive()
        self.test_subjects_comprehensive()
        self.test_progress_tracking_comprehensive()
        self.test_non_ai_features()
        self.test_ai_dependent_features()
        
        # Cleanup
        self.cleanup_resources()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 FINAL TEST RESULTS: {self.tests_passed}/{self.tests_run} passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Categorize failures
        failed_tests = [r for r in self.test_results if not r['success']]
        ai_failures = []
        critical_failures = []
        
        for test in failed_tests:
            test_name = test['test'].lower()
            if any(keyword in test_name for keyword in ['ai', 'generate', 'chat', 'youtube', 'quiz', 'flashcard']):
                ai_failures.append(test)
            else:
                critical_failures.append(test)
        
        if critical_failures:
            print(f"\n❌ CRITICAL FAILURES ({len(critical_failures)}):")
            for test in critical_failures:
                print(f"  - {test['test']}: {test['details']}")
        
        if ai_failures:
            print(f"\n⚠️  AI-RELATED FAILURES ({len(ai_failures)}):")
            for test in ai_failures:
                print(f"  - {test['test']}: {test['details']}")
        
        return len(critical_failures) == 0

def main():
    """Main test execution"""
    tester = EduBloomDetailedTester()
    
    try:
        success = tester.run_comprehensive_tests()
        
        # Save detailed results
        with open('/app/test_reports/backend_comprehensive_results.json', 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'success_rate': (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0,
                'results': tester.test_results,
                'created_resources': tester.created_resources
            }, f, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"💥 Test suite failed with exception: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())