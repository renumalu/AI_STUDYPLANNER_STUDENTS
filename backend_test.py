#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import time

class StudySageAPITester:
    def __init__(self, base_url="https://feature-complete-32.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

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
                    details += f", Response: {response.text[:100]}"
            
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

    def test_health_check(self):
        """Test API health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_user_registration(self):
        """Test user registration"""
        timestamp = int(time.time())
        test_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "testpass123"
        }
        
        result = self.run_test("User Registration", "POST", "auth/register", 200, test_data)
        if result and 'token' in result:
            self.token = result['token']
            self.user_id = result['user']['id']
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.token:
            return False
            
        # Try to get profile first to verify token works
        profile = self.run_test("Get Profile (Login Verification)", "GET", "user/profile", 200)
        return profile is not None

    def test_onboarding(self):
        """Test user onboarding"""
        if not self.token:
            return False
            
        onboarding_data = {
            "college": "Test University",
            "branch": "Computer Science Engineering",
            "graduation_year": 2025,
            "weekday_hours": 4.0,
            "weekend_hours": 8.0,
            "preferred_study_time": "evening",
            "target_date": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
        }
        
        result = self.run_test("Complete Onboarding", "POST", "user/onboarding", 200, onboarding_data)
        return result is not None

    def test_subject_operations(self):
        """Test CRUD operations for subjects"""
        if not self.token:
            return False
            
        # Create subject
        subject_data = {
            "name": "Data Structures and Algorithms",
            "credits": 4,
            "strong_areas": ["Arrays", "Linked Lists"],
            "weak_areas": ["Trees", "Graphs"],
            "confidence_level": 3,
            "color": "#6366F1"
        }
        
        created_subject = self.run_test("Create Subject", "POST", "subjects", 200, subject_data)
        if not created_subject:
            return False
            
        subject_id = created_subject.get('id')
        if not subject_id:
            self.log_test("Subject Creation - Get ID", False, "No subject ID returned")
            return False
        
        # Get subjects
        subjects = self.run_test("Get Subjects", "GET", "subjects", 200)
        if not subjects or len(subjects) == 0:
            return False
        
        # Update subject
        update_data = {
            "confidence_level": 4,
            "strong_areas": ["Arrays", "Linked Lists", "Stacks"]
        }
        
        updated = self.run_test("Update Subject", "PUT", f"subjects/{subject_id}", 200, update_data)
        if not updated:
            return False
        
        # Delete subject
        deleted = self.run_test("Delete Subject", "DELETE", f"subjects/{subject_id}", 200)
        return deleted is not None

    def test_study_plan_generation(self):
        """Test AI study plan generation"""
        if not self.token:
            return False
            
        # First create a subject for plan generation
        subject_data = {
            "name": "Machine Learning",
            "credits": 3,
            "strong_areas": ["Linear Algebra"],
            "weak_areas": ["Neural Networks", "Deep Learning"],
            "confidence_level": 2
        }
        
        created_subject = self.run_test("Create Subject for Plan", "POST", "subjects", 200, subject_data)
        if not created_subject:
            return False
        
        # Generate study plan
        plan_data = {"regenerate": False}
        
        # AI generation might take time, so increase timeout expectation
        print("🔄 Generating AI study plan (this may take 10-15 seconds)...")
        start_time = time.time()
        
        plan = self.run_test("Generate Study Plan", "POST", "study-plan/generate", 200, plan_data)
        
        generation_time = time.time() - start_time
        print(f"⏱️  Plan generation took {generation_time:.2f} seconds")
        
        if not plan:
            return False
        
        # Verify plan structure
        if 'sessions' not in plan or 'recommendations' not in plan:
            self.log_test("Study Plan Structure", False, "Missing required fields")
            return False
        
        # Get study plan
        retrieved_plan = self.run_test("Get Study Plan", "GET", "study-plan", 200)
        return retrieved_plan is not None

    def test_progress_tracking(self):
        """Test progress tracking features"""
        if not self.token:
            return False
            
        # Get progress stats
        stats = self.run_test("Get Progress Stats", "GET", "progress/stats", 200)
        if not stats:
            return False
        
        # Get progress history
        history = self.run_test("Get Progress History", "GET", "progress/history", 200)
        return history is not None

    def test_ai_assistant(self):
        """Test AI assistant chat functionality"""
        if not self.token:
            return False
            
        # Send message to AI assistant
        chat_data = {
            "message": "What are the best study techniques for Data Structures?"
        }
        
        print("🔄 Testing AI assistant (this may take 5-10 seconds)...")
        start_time = time.time()
        
        response = self.run_test("AI Assistant Chat", "POST", "chat/assistant", 200, chat_data)
        
        chat_time = time.time() - start_time
        print(f"⏱️  AI response took {chat_time:.2f} seconds")
        
        if not response or 'response' not in response:
            return False
        
        # Get chat history
        history = self.run_test("Get Chat History", "GET", "chat/history", 200)
        if not history:
            return False
        
        # Clear chat history
        cleared = self.run_test("Clear Chat History", "DELETE", "chat/history", 200)
        return cleared is not None

    def test_export_functionality(self):
        """Test export features"""
        if not self.token:
            return False
            
        # Test PDF data export
        pdf_data = self.run_test("Export PDF Data", "GET", "export/pdf-data", 200)
        if not pdf_data:
            return False
        
        # Test ICS export (might fail if no study plan)
        # We'll test this but not fail the entire test suite if it fails
        try:
            ics_response = requests.get(f"{self.base_url}/export/ics", 
                                      headers={'Authorization': f'Bearer {self.token}'}, 
                                      timeout=30)
            if ics_response.status_code == 200:
                self.log_test("Export ICS Calendar", True, "ICS export successful")
            else:
                self.log_test("Export ICS Calendar", False, f"Status: {ics_response.status_code}")
        except Exception as e:
            self.log_test("Export ICS Calendar", False, f"Exception: {str(e)}")
        
        return True

    def test_youtube_summarizer(self):
        """Test YouTube video summarization feature"""
        if not self.token:
            return False
            
        # Test YouTube summarization with a sample URL
        youtube_data = {
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # Sample YouTube URL
            "subject_id": None
        }
        
        print("🔄 Testing YouTube summarization (this may take 10-15 seconds)...")
        start_time = time.time()
        
        summary = self.run_test("YouTube Video Summarization", "POST", "youtube/summarize", 200, youtube_data)
        
        summarization_time = time.time() - start_time
        print(f"⏱️  YouTube summarization took {summarization_time:.2f} seconds")
        
        if not summary:
            return False
        
        # Verify summary structure
        required_fields = ['id', 'video_url', 'video_title', 'summary', 'key_points']
        for field in required_fields:
            if field not in summary:
                self.log_test("YouTube Summary Structure", False, f"Missing field: {field}")
                return False
        
        # Store summary ID for later tests
        self.youtube_summary_id = summary.get('id')
        
        # Get YouTube summaries
        summaries = self.run_test("Get YouTube Summaries", "GET", "youtube/summaries", 200)
        if not summaries or len(summaries) == 0:
            return False
        
        # Delete YouTube summary
        if self.youtube_summary_id:
            deleted = self.run_test("Delete YouTube Summary", "DELETE", f"youtube/summaries/{self.youtube_summary_id}", 200)
            return deleted is not None
        
        return True

    def test_quiz_system(self):
        """Test AI quiz generation and submission"""
        if not self.token:
            return False
            
        # Generate quiz
        quiz_data = {
            "subject_id": None,
            "topic": "Binary Search Trees",
            "num_questions": 5,
            "difficulty": "medium"
        }
        
        print("🔄 Testing quiz generation (this may take 10-15 seconds)...")
        start_time = time.time()
        
        quiz = self.run_test("Generate Quiz", "POST", "quiz/generate", 200, quiz_data)
        
        generation_time = time.time() - start_time
        print(f"⏱️  Quiz generation took {generation_time:.2f} seconds")
        
        if not quiz:
            return False
        
        # Verify quiz structure
        required_fields = ['id', 'topic', 'difficulty', 'questions', 'total']
        for field in required_fields:
            if field not in quiz:
                self.log_test("Quiz Structure", False, f"Missing field: {field}")
                return False
        
        if len(quiz['questions']) != 5:
            self.log_test("Quiz Questions Count", False, f"Expected 5 questions, got {len(quiz['questions'])}")
            return False
        
        # Store quiz ID for submission test
        quiz_id = quiz.get('id')
        
        # Prepare answers (selecting first option for all questions)
        answers = {}
        for question in quiz['questions']:
            answers[question['id']] = 0  # Select first option
        
        # Submit quiz
        submit_data = {"answers": answers}
        
        results = self.run_test("Submit Quiz", "POST", f"quiz/{quiz_id}/submit", 200, submit_data)
        if not results:
            return False
        
        # Verify results structure
        result_fields = ['quiz_id', 'score', 'total', 'percentage', 'results']
        for field in result_fields:
            if field not in results:
                self.log_test("Quiz Results Structure", False, f"Missing field: {field}")
                return False
        
        # Get quiz history
        history = self.run_test("Get Quiz History", "GET", "quiz/history", 200)
        return history is not None

    def test_flashcards_system(self):
        """Test AI flashcard generation and spaced repetition"""
        if not self.token:
            return False
            
        # Get initial decks (should be empty)
        initial_decks = self.run_test("Get Initial Flashcard Decks", "GET", "flashcards/decks", 200)
        if initial_decks is None:
            return False
        
        # Generate flashcards
        flashcard_data = {
            "topic": "Operating System Deadlocks",
            "subject_id": None,
            "count": 5
        }
        
        print("🔄 Testing flashcard generation (this may take 10-15 seconds)...")
        start_time = time.time()
        
        generated = self.run_test("Generate Flashcards", "POST", "flashcards/generate", 200, flashcard_data)
        
        generation_time = time.time() - start_time
        print(f"⏱️  Flashcard generation took {generation_time:.2f} seconds")
        
        if not generated:
            return False
        
        # Verify generated flashcards structure
        required_fields = ['deck_id', 'deck_name', 'cards', 'count']
        for field in required_fields:
            if field not in generated:
                self.log_test("Flashcards Generation Structure", False, f"Missing field: {field}")
                return False
        
        if len(generated['cards']) != 5:
            self.log_test("Flashcards Count", False, f"Expected 5 cards, got {len(generated['cards'])}")
            return False
        
        deck_id = generated['deck_id']
        
        # Get deck cards
        deck_cards = self.run_test("Get Deck Cards", "GET", f"flashcards/deck/{deck_id}", 200)
        if not deck_cards or 'deck' not in deck_cards or 'cards' not in deck_cards:
            return False
        
        # Test adding a manual card
        manual_card_data = {
            "front": "What is a deadlock?",
            "back": "A situation where processes are blocked forever, waiting for each other",
            "tags": ["deadlock", "operating-systems"]
        }
        
        added_card = self.run_test("Add Manual Flashcard", "POST", f"flashcards?deck_id={deck_id}", 200, manual_card_data)
        if not added_card:
            return False
        
        card_id = added_card.get('id')
        
        # Test flashcard review (spaced repetition)
        if card_id:
            review_data = {"difficulty": 2}  # Good difficulty
            reviewed = self.run_test("Review Flashcard", "POST", f"flashcards/{card_id}/review", 200, review_data)
            if not reviewed:
                return False
        
        # Get cards for review
        review_cards = self.run_test("Get Cards for Review", "GET", "flashcards/review", 200)
        if review_cards is None:
            return False
        
        # Delete the manual card
        if card_id:
            deleted_card = self.run_test("Delete Flashcard", "DELETE", f"flashcards/{card_id}", 200)
            if not deleted_card:
                return False
        
        # Delete the entire deck
        deleted_deck = self.run_test("Delete Flashcard Deck", "DELETE", f"flashcards/decks/{deck_id}", 200)
        return deleted_deck is not None

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting StudySage API Test Suite")
        print("=" * 50)
        
        # Basic connectivity tests
        self.test_health_check()
        self.test_root_endpoint()
        
        # Authentication tests
        if self.test_user_registration():
            self.test_user_login()
            self.test_onboarding()
            
            # Core functionality tests
            self.test_subject_operations()
            self.test_study_plan_generation()
            self.test_progress_tracking()
            self.test_ai_assistant()
            self.test_export_functionality()
            
            # NEW FEATURES TESTING
            print("\n🆕 Testing New Features:")
            print("-" * 30)
            self.test_youtube_summarizer()
            self.test_quiz_system()
            self.test_flashcards_system()
        else:
            print("❌ Registration failed - skipping authenticated tests")
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Print failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = StudySageAPITester()
    
    try:
        success = tester.run_all_tests()
        
        # Save detailed results
        with open('/app/test_reports/backend_test_results.json', 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'success_rate': (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0,
                'results': tester.test_results
            }, f, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"💥 Test suite failed with exception: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())