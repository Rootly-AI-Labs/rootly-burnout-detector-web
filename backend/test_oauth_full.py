#!/usr/bin/env python3
"""
Test OAuth flow with real credentials.
"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_oauth_with_credentials():
    """Test OAuth endpoints with real credentials."""
    print("🔐 Testing OAuth with Credentials...")
    print("=" * 45)
    
    # Test Google OAuth
    response = client.get("/auth/google")
    print(f"Google OAuth status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        auth_url = data.get("authorization_url", "")
        print(f"✅ Google OAuth URL generated: {auth_url[:80]}...")
        print("🔗 Visit this URL to test Google login")
    elif response.status_code == 501:
        print("⚠️ Google OAuth not configured - add GOOGLE_CLIENT_ID to .env")
    else:
        print(f"❌ Google OAuth failed: {response.text}")
    
    # Test GitHub OAuth
    response = client.get("/auth/github")
    print(f"GitHub OAuth status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        auth_url = data.get("authorization_url", "")
        print(f"✅ GitHub OAuth URL generated: {auth_url[:80]}...")
        print("🔗 Visit this URL to test GitHub login")
    elif response.status_code == 501:
        print("⚠️ GitHub OAuth not configured - add GITHUB_CLIENT_ID to .env")
    else:
        print(f"❌ GitHub OAuth failed: {response.text}")
    
    print("\n📋 Next steps:")
    print("1. Create OAuth apps in Google/GitHub")
    print("2. Add credentials to .env file")
    print("3. Start server: uvicorn app.main:app --reload")
    print("4. Visit the OAuth URLs to test login flow")

if __name__ == "__main__":
    test_oauth_with_credentials()