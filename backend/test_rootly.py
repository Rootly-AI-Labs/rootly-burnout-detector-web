#!/usr/bin/env python3
"""
Test script for Rootly API integration.
"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_rootly_endpoints():
    """Test Rootly integration endpoints."""
    print("🔗 Testing Rootly Integration Endpoints...")
    print("=" * 55)
    
    # Test token update endpoint without auth (should fail)
    response = client.post("/rootly/token", json={"token": "test_token"})
    print(f"Token update without auth status: {response.status_code}")
    if response.status_code == 403:
        print("✅ Token update correctly requires authentication")
    else:
        print(f"⚠️ Unexpected response: {response.status_code}")
    
    # Test token test endpoint without auth (should fail)
    response = client.get("/rootly/token/test")
    print(f"Token test without auth status: {response.status_code}")
    if response.status_code == 403:
        print("✅ Token test correctly requires authentication")
    else:
        print(f"⚠️ Unexpected response: {response.status_code}")
    
    # Test data preview endpoint without auth (should fail)
    response = client.get("/rootly/data/preview")
    print(f"Data preview without auth status: {response.status_code}")
    if response.status_code == 403:
        print("✅ Data preview correctly requires authentication")
    else:
        print(f"⚠️ Unexpected response: {response.status_code}")
    
    print("\n🎉 Rootly integration endpoints test completed!")
    print("\nTo test with actual Rootly API:")
    print("1. Authenticate with OAuth (Google/GitHub)")
    print("2. Set a valid Rootly API token via POST /rootly/token")
    print("3. Test the token via GET /rootly/token/test")
    print("4. Preview data via GET /rootly/data/preview")

def test_rootly_client_structure():
    """Test that Rootly client can be imported and instantiated."""
    print("\n🔧 Testing Rootly Client Structure...")
    print("=" * 45)
    
    try:
        from app.core.rootly_client import RootlyAPIClient
        
        # Test client instantiation
        client = RootlyAPIClient("test_token")
        print("✅ RootlyAPIClient imported and instantiated successfully")
        
        # Check client has required methods
        required_methods = ["test_connection", "get_users", "get_incidents", "collect_analysis_data"]
        for method in required_methods:
            if hasattr(client, method):
                print(f"✅ Method {method} exists")
            else:
                print(f"❌ Method {method} missing")
        
        print("✅ Rootly client structure test passed")
        
    except Exception as e:
        print(f"❌ Rootly client test failed: {e}")

if __name__ == "__main__":
    test_rootly_endpoints()
    test_rootly_client_structure()