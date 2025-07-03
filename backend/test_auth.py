#!/usr/bin/env python3
"""
Test script for authentication endpoints.
"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_auth_endpoints():
    """Test authentication endpoints."""
    print("🔐 Testing Authentication Endpoints...")
    print("=" * 50)
    
    # Test Google OAuth login endpoint
    response = client.get("/auth/google")
    print(f"Google OAuth endpoint status: {response.status_code}")
    if response.status_code == 501:
        print("⚠️ Google OAuth not configured (expected in development)")
    elif response.status_code == 200:
        data = response.json()
        print(f"✅ Google OAuth endpoint working: {data.get('authorization_url', '')[:50]}...")
    else:
        print(f"❌ Google OAuth endpoint failed: {response.text}")
    
    # Test GitHub OAuth login endpoint
    response = client.get("/auth/github")
    print(f"GitHub OAuth endpoint status: {response.status_code}")
    if response.status_code == 501:
        print("⚠️ GitHub OAuth not configured (expected in development)")
    elif response.status_code == 200:
        data = response.json()
        print(f"✅ GitHub OAuth endpoint working: {data.get('authorization_url', '')[:50]}...")
    else:
        print(f"❌ GitHub OAuth endpoint failed: {response.text}")
    
    # Test protected endpoint without auth
    response = client.get("/auth/me")
    print(f"Protected endpoint without auth status: {response.status_code}")
    if response.status_code == 403:
        print("✅ Protected endpoint correctly requires authentication")
    else:
        print(f"⚠️ Protected endpoint response: {response.status_code}")
    
    print("\n🎉 Authentication endpoints test completed!")
    print("\nTo test OAuth flow:")
    print("1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables")
    print("2. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables")
    print("3. Visit http://localhost:8000/auth/google or http://localhost:8000/auth/github")

if __name__ == "__main__":
    test_auth_endpoints()