#!/usr/bin/env python3
"""
Test script for database models.
"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models import User, Analysis, SessionLocal, create_tables
from sqlalchemy.orm import Session

def test_models():
    print("🗄️ Testing Database Models...")
    print("=" * 40)
    
    # Create tables if they don't exist
    create_tables()
    
    # Create a test session
    db: Session = SessionLocal()
    
    try:
        # Test User creation
        test_user = User(
            email="test@example.com",
            name="Test User",
            provider="google",
            provider_id="123456789",
            is_verified=True,
            rootly_token="test_token_encrypted"
        )
        
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        
        print(f"✅ Created user: {test_user}")
        
        # Test Analysis creation
        test_analysis = Analysis(
            user_id=test_user.id,
            status="completed",
            config={"date_range": "30d", "team_filter": "engineering"},
            results={"team_score": 85, "high_risk_count": 2}
        )
        
        db.add(test_analysis)
        db.commit()
        db.refresh(test_analysis)
        
        print(f"✅ Created analysis: {test_analysis}")
        
        # Test relationships
        user_analyses = db.query(User).filter(User.id == test_user.id).first().analyses
        print(f"✅ User has {len(user_analyses)} analyses")
        
        analysis_user = db.query(Analysis).filter(Analysis.id == test_analysis.id).first().user
        print(f"✅ Analysis belongs to user: {analysis_user.email}")
        
        # Clean up test data
        db.delete(test_analysis)
        db.delete(test_user)
        db.commit()
        
        print("\n🎉 All model tests passed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        db.rollback()
        return False
    
    finally:
        db.close()
    
    return True

if __name__ == "__main__":
    success = test_models()
    if not success:
        sys.exit(1)