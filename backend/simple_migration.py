#!/usr/bin/env python3
"""
Simple migration runner for Docker environment
Adds integration_name and platform columns to analyses table
"""

import os
import sys
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_database_url():
    """Get database URL from environment variables"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        # Try Railway environment variable
        database_url = os.getenv('RAILWAY_DATABASE_URL')
    if not database_url:
        # Try common postgres format
        host = os.getenv('PGHOST', 'localhost')
        port = os.getenv('PGPORT', '5432')
        user = os.getenv('PGUSER', 'postgres')
        password = os.getenv('PGPASSWORD', '')
        database = os.getenv('PGDATABASE', 'burnout_detector')
        database_url = f"postgresql://{user}:{password}@{host}:{port}/{database}"

    logger.info(f"🔗 Using database URL: {database_url[:50]}...")
    return database_url

def run_migrations():
    """Run all pending migrations"""

    try:
        database_url = get_database_url()
        engine = create_engine(database_url)

        with engine.connect() as conn:
            # Create migrations tracking table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS migrations (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR(50) DEFAULT 'completed'
                )
            """))
            conn.commit()

            # Migration 1: Add integration fields to analyses
            logger.info("🔧 Migration 1: Adding integration_name and platform to analyses...")
            result = conn.execute(text("""
                SELECT COUNT(*) as count FROM migrations
                WHERE name = '001_add_integration_fields_to_analyses'
                AND status = 'completed'
            """))

            if result.fetchone()[0] == 0:
                conn.execute(text("""
                    ALTER TABLE analyses
                    ADD COLUMN IF NOT EXISTS integration_name VARCHAR(255),
                    ADD COLUMN IF NOT EXISTS platform VARCHAR(50)
                """))

                conn.execute(text("""
                    INSERT INTO migrations (name, status)
                    VALUES ('001_add_integration_fields_to_analyses', 'completed')
                    ON CONFLICT (name) DO UPDATE SET
                        applied_at = CURRENT_TIMESTAMP,
                        status = 'completed'
                """))
                conn.commit()
                logger.info("✅ Migration 1 completed: Added integration fields to analyses")
            else:
                logger.info("⏭️  Migration 1 already applied")

            # Migration 2: Add name to user_correlations
            logger.info("🔧 Migration 2: Adding name column to user_correlations...")
            result = conn.execute(text("""
                SELECT COUNT(*) as count FROM migrations
                WHERE name = '002_add_name_to_user_correlations'
                AND status = 'completed'
            """))

            if result.fetchone()[0] == 0:
                conn.execute(text("""
                    ALTER TABLE user_correlations
                    ADD COLUMN IF NOT EXISTS name VARCHAR(255)
                """))

                conn.execute(text("""
                    INSERT INTO migrations (name, status)
                    VALUES ('002_add_name_to_user_correlations', 'completed')
                    ON CONFLICT (name) DO UPDATE SET
                        applied_at = CURRENT_TIMESTAMP,
                        status = 'completed'
                """))
                conn.commit()
                logger.info("✅ Migration 2 completed: Added name to user_correlations")
            else:
                logger.info("⏭️  Migration 2 already applied")

            # Migration 3: Add unique constraint on user_correlations
            logger.info("🔧 Migration 3: Adding unique constraint to user_correlations...")
            result = conn.execute(text("""
                SELECT COUNT(*) as count FROM migrations
                WHERE name = '003_unique_constraint_user_correlations'
                AND status = 'completed'
            """))

            if result.fetchone()[0] == 0:
                # Check if constraint already exists
                constraint_check = conn.execute(text("""
                    SELECT constraint_name
                    FROM information_schema.table_constraints
                    WHERE table_name='user_correlations'
                    AND constraint_type='UNIQUE'
                    AND constraint_name='uq_user_correlation_user_email'
                """))

                if not constraint_check.fetchone():
                    # Remove duplicates first (keep most recent)
                    conn.execute(text("""
                        DELETE FROM user_correlations a
                        USING user_correlations b
                        WHERE a.id < b.id
                        AND a.user_id = b.user_id
                        AND a.email = b.email
                    """))

                    # Add constraint
                    conn.execute(text("""
                        ALTER TABLE user_correlations
                        ADD CONSTRAINT uq_user_correlation_user_email
                        UNIQUE (user_id, email)
                    """))
                    logger.info("✅ Added unique constraint on (user_id, email)")
                else:
                    logger.info("⏭️  Unique constraint already exists")

                conn.execute(text("""
                    INSERT INTO migrations (name, status)
                    VALUES ('003_unique_constraint_user_correlations', 'completed')
                    ON CONFLICT (name) DO UPDATE SET
                        applied_at = CURRENT_TIMESTAMP,
                        status = 'completed'
                """))
                conn.commit()
                logger.info("✅ Migration 3 completed: Added unique constraint")
            else:
                logger.info("⏭️  Migration 3 already applied")

            # Migration 4: Fix organizations with NULL status
            migration_4_exists = conn.execute(text(
                "SELECT COUNT(*) FROM migrations WHERE name = 'fix_organization_status_null'"
            )).scalar()

            if migration_4_exists == 0:
                logger.info("🔧 Running Migration 4: Fix organizations with NULL status...")

                # Check if any organizations have NULL status
                null_status_count = conn.execute(text(
                    "SELECT COUNT(*) FROM organizations WHERE status IS NULL"
                )).scalar()

                if null_status_count > 0:
                    logger.info(f"   Found {null_status_count} organizations with NULL status")

                    # Update NULL status to 'active'
                    conn.execute(text(
                        "UPDATE organizations SET status = 'active' WHERE status IS NULL"
                    ))
                    conn.commit()
                    logger.info(f"   ✅ Updated {null_status_count} organizations to 'active' status")
                else:
                    logger.info("   ℹ️  No organizations with NULL status found")

                # Mark migration as complete
                conn.execute(text(
                    "INSERT INTO migrations (name, status) VALUES ('fix_organization_status_null', 'completed')"
                ))
                conn.commit()
                logger.info("✅ Migration 4 completed: Fixed organization status")
            else:
                logger.info("⏭️  Migration 4 already applied")

            return True

    except Exception as e:
        logger.error(f"❌ Migrations failed: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    logger.info("🚀 Simple migration runner starting...")
    success = run_migrations()

    if success:
        logger.info("🎉 All migrations completed successfully!")
    else:
        logger.error("❌ Migrations failed")
        sys.exit(1)

    sys.exit(0)