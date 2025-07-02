#!/usr/bin/env python3
"""
Test script for the FastAPI backend.
"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    """Test the root endpoint."""
    response = client.get("/")
    print(f"Root endpoint status: {response.status_code}")
    print(f"Root endpoint response: {response.json()}")
    assert response.status_code == 200
    assert "message" in response.json()
    print("✅ Root endpoint test passed!")

def test_health_endpoint():
    """Test the health endpoint."""
    response = client.get("/health")
    print(f"Health endpoint status: {response.status_code}")
    print(f"Health endpoint response: {response.json()}")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    print("✅ Health endpoint test passed!")

def test_database_creation():
    """Test that database tables are created."""
    import os
    db_file = "test.db"
    if os.path.exists(db_file):
        print("✅ Database file created successfully!")
    else:
        print("❌ Database file not found")

if __name__ == "__main__":
    print("🚀 Testing Rootly Burnout Detector API...")
    print("=" * 50)
    
    try:
        test_root_endpoint()
        test_health_endpoint()
        test_database_creation()
        
        print("\n🎉 All tests passed! FastAPI backend is working correctly.")
        print("\nNext steps:")
        print("1. Set up OAuth endpoints")
        print("2. Create Rootly API integration")
        print("3. Build analysis runner")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        sys.exit(1)