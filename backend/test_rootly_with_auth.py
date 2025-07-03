#!/usr/bin/env python3
"""
Test script for Rootly API integration with proper JWT authentication.
This script demonstrates how to test the Rootly endpoints with valid JWT tokens.
"""
import sys
import os
import requests
import json

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.models import get_db, User, create_tables
from app.auth.jwt import create_access_token
from app.core.config import settings

def create_test_user_with_token():
    """Create a test user and generate a JWT token."""
    print("🔧 Creating Test User and JWT Token...")
    print("=" * 50)
    
    # Ensure database tables exist
    create_tables()
    
    # Get database session
    db = next(get_db())
    
    try:
        # Check if test user already exists
        test_email = "test@example.com"
        existing_user = db.query(User).filter(User.email == test_email).first()
        
        if existing_user:
            user = existing_user
            print(f"✅ Using existing test user: {user}")
        else:
            # Create test user
            user = User(
                email=test_email,
                name="Test User",
                provider="test",
                provider_id="test_id_123",
                is_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"✅ Created test user: {user}")
        
        # Generate JWT token
        jwt_token = create_access_token(data={"sub": user.id})
        
        print(f"🎫 Generated JWT Token: {jwt_token}")
        
        return user, jwt_token
        
    finally:
        db.close()

def test_auth_me_endpoint(token: str, base_url: str = "http://localhost:8000"):
    """Test the /auth/me endpoint with JWT token."""
    print(f"\n🔍 Testing /auth/me endpoint...")
    print("=" * 45)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{base_url}/auth/me", headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            user_data = response.json()
            print("✅ Authentication successful!")
            print(f"User Data: {json.dumps(user_data, indent=2)}")
            return True
        else:
            print(f"❌ Authentication failed: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("⚠️ Could not connect to server. Make sure the FastAPI server is running.")
        print("   Start the server with: uvicorn app.main:app --reload")
        return False
    except Exception as e:
        print(f"❌ Error testing auth endpoint: {e}")
        return False

def test_rootly_endpoints(token: str, base_url: str = "http://localhost:8000"):
    """Test the Rootly integration endpoints."""
    print(f"\n🔗 Testing Rootly Integration Endpoints...")
    print("=" * 55)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test 1: Token update endpoint
    print("1. Testing token update endpoint...")
    try:
        test_token_data = {"token": "rootly_test_token_123"}
        response = requests.post(f"{base_url}/rootly/token", headers=headers, json=test_token_data)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Token update endpoint working")
        else:
            print(f"   ⚠️ Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("   ⚠️ Server not running")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Token test endpoint
    print("\n2. Testing token validation endpoint...")
    try:
        response = requests.get(f"{base_url}/rootly/token/test", headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Token test endpoint working")
            result = response.json()
            print(f"   Result: {json.dumps(result, indent=4)}")
        else:
            print(f"   ⚠️ Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("   ⚠️ Server not running")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Data preview endpoint
    print("\n3. Testing data preview endpoint...")
    try:
        response = requests.get(f"{base_url}/rootly/data/preview", headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Data preview endpoint working")
            result = response.json()
            print(f"   Result: {json.dumps(result, indent=4)}")
        else:
            print(f"   ⚠️ Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("   ⚠️ Server not running")
    except Exception as e:
        print(f"   ❌ Error: {e}")

def print_curl_examples(token: str, base_url: str = "http://localhost:8000"):
    """Print curl command examples for testing."""
    print(f"\n📋 Curl Command Examples:")
    print("=" * 35)
    
    print("1. Test authentication:")
    print(f"curl -H 'Authorization: Bearer {token}' \\")
    print(f"     {base_url}/auth/me")
    
    print("\n2. Update Rootly token:")
    print(f"curl -X POST -H 'Authorization: Bearer {token}' \\")
    print(f"     -H 'Content-Type: application/json' \\")
    print(f"     -d '{{\"token\": \"your_rootly_token_here\"}}' \\")
    print(f"     {base_url}/rootly/token")
    
    print("\n3. Test Rootly token:")
    print(f"curl -H 'Authorization: Bearer {token}' \\")
    print(f"     {base_url}/rootly/token/test")
    
    print("\n4. Preview Rootly data:")
    print(f"curl -H 'Authorization: Bearer {token}' \\")
    print(f"     {base_url}/rootly/data/preview")

def explain_jwt_validation_process():
    """Explain how JWT validation works in the backend."""
    print(f"\n📚 JWT Validation Process in Backend:")
    print("=" * 50)
    
    print("1. Token Creation (during OAuth):")
    print("   - User completes OAuth flow (Google/GitHub)")
    print("   - Backend creates JWT with user ID as 'sub' claim")
    print("   - Token is signed with secret key and includes expiry")
    print("   - Token is returned to frontend")
    
    print("\n2. Token Validation (on protected endpoints):")
    print("   - Client sends request with 'Authorization: Bearer {token}' header")
    print("   - HTTPBearer security extracts token from header")
    print("   - get_current_user dependency calls decode_access_token()")
    print("   - JWT is decoded using secret key and algorithm")
    print("   - Token expiry is checked automatically by jose library")
    print("   - User ID is extracted from 'sub' claim")
    print("   - User is looked up in database by ID")
    print("   - User object is returned if valid, 401 error if not")
    
    print("\n3. Protected Endpoints:")
    print("   - /auth/me - Returns current user info")
    print("   - /rootly/token - Update user's Rootly API token")
    print("   - /rootly/token/test - Test Rootly API connection")
    print("   - /rootly/data/preview - Preview Rootly data")
    print("   - /analysis/* - All analysis endpoints")
    
    print(f"\n4. JWT Configuration:")
    print(f"   - Secret Key: {settings.JWT_SECRET_KEY}")
    print(f"   - Algorithm: {settings.JWT_ALGORITHM}")
    print(f"   - Token Expiry: {settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES} minutes")

if __name__ == "__main__":
    try:
        # Create test user and token
        user, token = create_test_user_with_token()
        
        # Test authentication endpoint
        auth_success = test_auth_me_endpoint(token)
        
        if auth_success:
            # Test Rootly endpoints
            test_rootly_endpoints(token)
        
        # Print curl examples
        print_curl_examples(token)
        
        # Explain JWT validation
        explain_jwt_validation_process()
        
        print(f"\n🎉 Test setup completed!")
        print(f"\n💡 Next Steps:")
        print("1. Start the FastAPI server: uvicorn app.main:app --reload")
        print("2. Use the generated JWT token to test endpoints")
        print("3. Set a real Rootly API token to test the integration")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)