#!/usr/bin/env python3
"""
Migration script to add multi-organization support.
This creates the new RootlyIntegration table and migrates existing rootly_token data.
"""

import os
import sys
from datetime import datetime

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models.base import Base
from app.models.user import User
from app.models.analysis import Analysis
from app.models.rootly_integration import RootlyIntegration
from app.core.config import settings

def migrate_database():
    """Run the migration to add multi-organization support."""
    
    # Create engine and session
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    print("🚀 Starting migration to multi-organization support...")
    
    # Create all tables (including new RootlyIntegration table)
    print("📋 Creating new database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Add the new column to existing analyses table if it doesn't exist
    session = SessionLocal()
    try:
        # Try to add the new column first
        try:
            session.execute(text("ALTER TABLE analyses ADD COLUMN rootly_integration_id INTEGER"))
            session.commit()
            print("✅ Added rootly_integration_id column to analyses table")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("📋 rootly_integration_id column already exists")
            else:
                print(f"⚠️  Column addition warning: {e}")
            session.rollback()
        
        # Migrate existing data
        # Find users with existing rootly_token
        users_with_tokens = session.query(User).filter(User.rootly_token.isnot(None)).all()
        
        print(f"📊 Found {len(users_with_tokens)} users with existing Rootly tokens")
        
        for user in users_with_tokens:
            print(f"👤 Migrating user: {user.email}")
            
            # Create a new RootlyIntegration record for this user
            integration = RootlyIntegration(
                user_id=user.id,
                name="Primary Account",  # Default name for migrated accounts
                organization_name=None,  # Will be populated when they test connection again
                token=user.rootly_token,
                is_default=True,  # Mark as default integration
                is_active=True,
                created_at=user.created_at or datetime.utcnow()
            )
            
            session.add(integration)
            session.flush()  # Get the integration ID
            
            # Update existing analyses to reference this integration
            analyses = session.query(Analysis).filter(Analysis.user_id == user.id).all()
            for analysis in analyses:
                analysis.rootly_integration_id = integration.id
            
            print(f"  ✅ Created integration ID {integration.id} with {len(analyses)} linked analyses")
        
        # Commit all changes
        session.commit()
        print(f"✅ Migration completed successfully! Migrated {len(users_with_tokens)} users")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        session.close()
    
    print("🎉 Migration completed! Users can now manage multiple Rootly organizations.")
    print("\n📝 Next steps:")
    print("   1. Users can test their existing tokens to populate organization names")
    print("   2. Users can add additional Rootly organizations")
    print("   3. Analyses will be tracked per organization")

if __name__ == "__main__":
    migrate_database()