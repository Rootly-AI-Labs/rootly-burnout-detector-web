#!/usr/bin/env python3
"""
Script to create a test JWT token and test user for development/testing purposes.
This script demonstrates how JWT tokens are validated in the backend.
"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.models import get_db, User, create_tables
from app.auth.jwt import create_access_token
from app.core.config import settings

def create_test_user_and_token():
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
            print(f"✅ Test user already exists: {existing_user}")
            user = existing_user
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
        
        print(f"\n🔑 JWT Token Configuration:")
        print(f"Secret Key: {settings.JWT_SECRET_KEY}")
        print(f"Algorithm: {settings.JWT_ALGORITHM}")
        print(f"Expires: {settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
        
        print(f"\n🎫 Generated JWT Token:")
        print(f"{jwt_token}")
        
        print(f"\n📋 Test User Details:")
        print(f"ID: {user.id}")
        print(f"Email: {user.email}")
        print(f"Name: {user.name}")
        print(f"Provider: {user.provider}")
        print(f"Is Verified: {user.is_verified}")
        
        print(f"\n🧪 How to use this token for testing:")
        print("1. Include it in the Authorization header as: 'Bearer {token}'")
        print("2. Example curl command:")
        print(f"   curl -H 'Authorization: Bearer {jwt_token}' http://localhost:8000/auth/me")
        
        print(f"\n🔍 Test the /auth/me endpoint:")
        print("   This endpoint validates the JWT token and returns user info")
        print("   It uses the get_current_active_user dependency which:")
        print("   - Extracts the Bearer token from Authorization header")
        print("   - Decodes the JWT using the secret key and algorithm")
        print("   - Validates the token hasn't expired")
        print("   - Looks up the user by ID from the 'sub' claim in the token")
        print("   - Returns the user object if valid, or 401 error if invalid")
        
        return user, jwt_token
        
    finally:
        db.close()

def test_jwt_validation(token: str):
    """Test JWT token validation."""
    print(f"\n🔍 Testing JWT Token Validation...")
    print("=" * 45)
    
    from app.auth.jwt import decode_access_token, get_user_id_from_token
    
    # Test token decoding
    payload = decode_access_token(token)
    if payload:
        print(f"✅ Token decoded successfully")
        print(f"   Payload: {payload}")
        
        user_id = get_user_id_from_token(token)
        print(f"   User ID from token: {user_id}")
    else:
        print("❌ Token validation failed")

def demonstrate_auth_flow():
    """Demonstrate the complete authentication flow."""
    print(f"\n📚 Authentication Flow Explanation:")
    print("=" * 50)
    
    print("1. OAuth Flow (Google/GitHub):")
    print("   - User visits /auth/google or /auth/github")
    print("   - Redirected to OAuth provider")
    print("   - After consent, provider redirects to callback")
    print("   - Backend exchanges code for access token")
    print("   - Backend fetches user info from provider")
    print("   - Backend creates/updates user in database")
    print("   - Backend generates JWT token with user ID")
    print("   - Frontend receives JWT token")
    
    print("\n2. JWT Token Validation:")
    print("   - Client includes JWT in Authorization header")
    print("   - Backend extracts token from Bearer header")
    print("   - Backend decodes JWT using secret key")
    print("   - Backend validates token expiry")
    print("   - Backend looks up user by ID from token")
    print("   - Backend returns user data or 401 error")
    
    print("\n3. Protected Endpoints:")
    print("   - /auth/me - Get current user info")
    print("   - /rootly/* - All Rootly integration endpoints")
    print("   - /analysis/* - All analysis endpoints")

if __name__ == "__main__":
    try:
        user, token = create_test_user_and_token()
        test_jwt_validation(token)
        demonstrate_auth_flow()
        
        print(f"\n🎉 Test setup completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)