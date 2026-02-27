"""
Fat2FitXpress API Testing Suite
Tests: Auth, Dashboard, Workout Plans, Weight Tracking, Water Intake, Workout Logs, Progress Photos, Profile
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ['EXPO_PUBLIC_BACKEND_URL'].rstrip('/')

class TestAuth:
    """Authentication flow tests"""
    
    def test_signup_new_user(self):
        """Test user signup with unique email"""
        unique_email = f"TEST_user_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Test User",
            "email": unique_email,
            "password": "testpass123"
        })
        assert response.status_code == 200, f"Signup failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["email"] == unique_email
        assert data["user"]["name"] == "Test User"
    
    def test_signup_duplicate_email(self):
        """Test signup with existing email returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Test User",
            "email": "test@fat2fit.com",
            "password": "test123456"
        })
        assert response.status_code == 400, "Duplicate email should return 400"
        assert "already registered" in response.json()["detail"].lower()
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@fat2fit.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "test@fat2fit.com"
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@fat2fit.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, "Invalid credentials should return 401"
    
    def test_get_me_with_token(self):
        """Test /auth/me endpoint with valid token"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@fat2fit.com",
            "password": "test123456"
        })
        token = login_response.json()["token"]
        
        # Get user info
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@fat2fit.com"
        assert "password_hash" not in data, "Password hash should not be exposed"
    
    def test_get_me_without_token(self):
        """Test /auth/me without token returns 403"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 403, "Should return 403 without token"


class TestWorkoutPlans:
    """Workout plans endpoints"""
    
    def test_get_workout_plans(self):
        """Test fetching all workout plans (seeded data)"""
        response = requests.get(f"{BASE_URL}/api/workout-plans")
        assert response.status_code == 200
        
        plans = response.json()
        assert isinstance(plans, list)
        assert len(plans) == 3, "Should have 3 seeded plans"
        
        # Verify plan structure
        plan = plans[0]
        assert "id" in plan
        assert "name" in plan
        assert "level" in plan
        assert "days_per_week" in plan
        assert "duration_weeks" in plan
        assert "days" in plan
    
    def test_get_single_workout_plan(self):
        """Test fetching a specific workout plan"""
        response = requests.get(f"{BASE_URL}/api/workout-plans/beginner-full-body")
        assert response.status_code == 200
        
        plan = response.json()
        assert plan["id"] == "beginner-full-body"
        assert plan["name"] == "Full Body Foundation"
        assert plan["level"] == "Beginner"
    
    def test_get_nonexistent_plan(self):
        """Test fetching plan that doesn't exist"""
        response = requests.get(f"{BASE_URL}/api/workout-plans/nonexistent-plan")
        assert response.status_code == 404


@pytest.fixture
def auth_token():
    """Fixture to provide authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@fat2fit.com",
        "password": "test123456"
    })
    if response.status_code != 200:
        pytest.skip("Cannot get auth token - login failed")
    return response.json()["token"]


class TestWeightTracker:
    """Weight entries CRUD tests"""
    
    def test_create_and_get_weight_entry(self, auth_token):
        """Test creating weight entry and verifying persistence"""
        today = datetime.now().strftime("%Y-%m-%d")
        weight_value = 75.5
        
        # Create weight entry
        response = requests.post(f"{BASE_URL}/api/weight-entries", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"weight": weight_value, "date": today}
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        entry = response.json()
        assert entry["weight"] == weight_value
        assert entry["date"] == today
        entry_id = entry["id"]
        
        # GET to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/weight-entries",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 200
        entries = get_response.json()
        assert any(e["id"] == entry_id and e["weight"] == weight_value for e in entries)
    
    def test_update_existing_weight_entry(self, auth_token):
        """Test updating weight entry for same date"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Create first entry
        requests.post(f"{BASE_URL}/api/weight-entries",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"weight": 70.0, "date": today}
        )
        
        # Update with new weight for same date
        response = requests.post(f"{BASE_URL}/api/weight-entries",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"weight": 71.5, "date": today}
        )
        assert response.status_code == 200
        entry = response.json()
        assert entry["weight"] == 71.5
    
    def test_delete_weight_entry(self, auth_token):
        """Test deleting weight entry"""
        # Create entry
        create_response = requests.post(f"{BASE_URL}/api/weight-entries",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"weight": 80.0, "date": "2026-01-15"}
        )
        entry_id = create_response.json()["id"]
        
        # Delete entry
        delete_response = requests.delete(f"{BASE_URL}/api/weight-entries/{entry_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["status"] == "deleted"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/weight-entries",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        entries = get_response.json()
        assert not any(e["id"] == entry_id for e in entries)


class TestWaterIntake:
    """Water intake tracking tests"""
    
    def test_get_water_intake_new_date(self, auth_token):
        """Test getting water intake for date with no data"""
        test_date = "2026-12-25"
        response = requests.get(f"{BASE_URL}/api/water-intake?date={test_date}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["glasses"] == 0
        assert data["goal"] == 8
    
    def test_add_water_glass(self, auth_token):
        """Test adding water glass and verifying persistence"""
        test_date = datetime.now().strftime("%Y-%m-%d")
        
        # Add glass
        response = requests.post(f"{BASE_URL}/api/water-intake/add",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"date": test_date}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["glasses"] >= 1
        initial_glasses = data["glasses"]
        
        # Verify persistence by GET
        get_response = requests.get(f"{BASE_URL}/api/water-intake?date={test_date}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.json()["glasses"] == initial_glasses
    
    def test_remove_water_glass(self, auth_token):
        """Test removing water glass"""
        test_date = datetime.now().strftime("%Y-%m-%d")
        
        # Add glasses first
        requests.post(f"{BASE_URL}/api/water-intake/add",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"date": test_date}
        )
        requests.post(f"{BASE_URL}/api/water-intake/add",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"date": test_date}
        )
        
        # Get current count
        get_response = requests.get(f"{BASE_URL}/api/water-intake?date={test_date}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        before_count = get_response.json()["glasses"]
        
        # Remove one glass
        response = requests.post(f"{BASE_URL}/api/water-intake/remove",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"date": test_date}
        )
        assert response.status_code == 200
        after_count = response.json()["glasses"]
        assert after_count == before_count - 1


class TestWorkoutLogs:
    """Workout logging tests"""
    
    def test_create_and_get_workout_log(self, auth_token):
        """Test creating workout log and verifying persistence"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        log_data = {
            "date": today,
            "plan_name": "Full Body Foundation",
            "day_name": "Full Body A",
            "exercises": [
                {
                    "name": "Barbell Squat",
                    "muscle_group": "Legs",
                    "sets": [
                        {"reps": 10, "weight": 50.0},
                        {"reps": 10, "weight": 50.0},
                        {"reps": 8, "weight": 55.0}
                    ]
                }
            ]
        }
        
        # Create log
        response = requests.post(f"{BASE_URL}/api/workout-logs",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=log_data
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        created_log = response.json()
        assert created_log["plan_name"] == "Full Body Foundation"
        assert created_log["day_name"] == "Full Body A"
        log_id = created_log["id"]
        
        # GET to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/workout-logs",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 200
        logs = get_response.json()
        assert any(log["id"] == log_id for log in logs)


class TestProgressPhotos:
    """Progress photos tests"""
    
    def test_create_and_get_progress_photo(self, auth_token):
        """Test creating progress photo and verifying persistence"""
        today = datetime.now().strftime("%Y-%m-%d")
        fake_base64 = "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
        
        # Create photo
        response = requests.post(f"{BASE_URL}/api/progress-photos",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "photo_base64": fake_base64,
                "date": today,
                "note": "Test progress photo"
            }
        )
        assert response.status_code == 200
        
        photo = response.json()
        assert photo["date"] == today
        assert photo["note"] == "Test progress photo"
        assert photo["has_photo"] is True
        photo_id = photo["id"]
        
        # GET list to verify
        list_response = requests.get(f"{BASE_URL}/api/progress-photos",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert list_response.status_code == 200
        photos = list_response.json()
        assert any(p["id"] == photo_id for p in photos)
    
    def test_get_single_photo_with_base64(self, auth_token):
        """Test getting single photo includes base64 data"""
        today = datetime.now().strftime("%Y-%m-%d")
        fake_base64 = "data:image/jpeg;base64,TESTDATA123"
        
        # Create photo
        create_response = requests.post(f"{BASE_URL}/api/progress-photos",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"photo_base64": fake_base64, "date": today, "note": ""}
        )
        photo_id = create_response.json()["id"]
        
        # Get single photo
        response = requests.get(f"{BASE_URL}/api/progress-photos/{photo_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        photo = response.json()
        assert "photo_base64" in photo
        assert photo["photo_base64"] == fake_base64
    
    def test_delete_progress_photo(self, auth_token):
        """Test deleting progress photo"""
        # Create photo
        create_response = requests.post(f"{BASE_URL}/api/progress-photos",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "photo_base64": "data:image/jpeg;base64,DELETE_TEST",
                "date": "2026-01-20",
                "note": "To be deleted"
            }
        )
        photo_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/progress-photos/{photo_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/progress-photos/{photo_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 404


class TestProfile:
    """Profile update tests"""
    
    def test_update_profile(self, auth_token):
        """Test updating profile and verifying changes"""
        # Update profile
        response = requests.put(f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "name": "Test User Updated",
                "height_cm": 175.0,
                "weight_kg": 70.0,
                "age": 25,
                "gender": "male",
                "goal": "Muscle Gain"
            }
        )
        assert response.status_code == 200
        
        updated_user = response.json()
        assert updated_user["name"] == "Test User Updated"
        assert updated_user["height_cm"] == 175.0
        assert updated_user["weight_kg"] == 70.0
        assert updated_user["age"] == 25
        
        # Verify persistence via /auth/me
        get_response = requests.get(f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        user = get_response.json()
        assert user["name"] == "Test User Updated"
        assert user["height_cm"] == 175.0


class TestDashboard:
    """Dashboard endpoint tests"""
    
    def test_get_dashboard(self, auth_token):
        """Test dashboard returns all required data"""
        response = requests.get(f"{BASE_URL}/api/dashboard",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "user" in data
        assert "water" in data
        assert "weight_history" in data
        assert "workouts_this_week" in data
        assert "today" in data
        
        # Verify water structure
        assert "glasses" in data["water"]
        assert "goal" in data["water"]
        
        # Verify weight_history is a list
        assert isinstance(data["weight_history"], list)
