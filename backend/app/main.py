"""
FastAPI main application for Rootly Burnout Detector.
"""
import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from .models import create_tables
from .core.config import settings
from .core.rate_limiting import limiter, custom_rate_limit_exceeded_handler
from .middleware.security import security_middleware
from .api.endpoints import auth, rootly, analysis, analyses, pagerduty, github, slack, llm, mappings, manual_mappings, debug_mappings, migrate, admin, notifications, invitations, surveys

logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Rootly Burnout Detector API",
    description="API for detecting burnout risk in engineering teams using Rootly incident data",
    version="1.0.0",
    swagger_ui_parameters={
        "defaultModelsExpandDepth": 1,  # Don't expand schemas deeply
        "syntaxHighlight.theme": "monokai",
        "displayRequestDuration": True,
        "filter": True,
        "tryItOutEnabled": True,
    }
)

# Add rate limiting to the app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)

# Add security middleware
app.middleware("http")(security_middleware)

# Configure CORS - Secure configuration
def get_cors_origins():
    """Get allowed CORS origins based on environment."""
    # Always allow the configured frontend URL
    origins = [settings.FRONTEND_URL]
    
    # Add common development ports for localhost
    if settings.FRONTEND_URL.startswith("http://localhost"):
        # Allow common Next.js development ports
        origins.extend([
            "http://localhost:3000",
            "http://localhost:3001", 
            "http://localhost:3002"
        ])
    
    # TEMPORARY: Allow localhost for OAuth testing (remove after testing)
    if not any("localhost" in origin for origin in origins):
        origins.extend([
            "http://localhost:3000",
            "http://localhost:3001"
        ])
    
    # Add production domains if they exist
    production_frontend = os.getenv("PRODUCTION_FRONTEND_URL")
    if production_frontend:
        origins.append(production_frontend)
    
    # Add the production domain explicitly
    origins.extend([
        "https://www.oncallburnout.com",
        "https://oncallburnout.com"
    ])
    
    # Add Vercel preview URLs if in development/staging
    vercel_url = os.getenv("VERCEL_URL") 
    if vercel_url:
        origins.append(f"https://{vercel_url}")
    
    # Remove duplicates while preserving order
    origins = list(dict.fromkeys(origins))
    
    
    return origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),  # Specific allowed origins only
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Specific methods only
    allow_headers=[
        "Accept",
        "Accept-Language", 
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With"
    ],  # Specific headers only
)

@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Rootly Burnout Detector API", "version": "1.0.0"}

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "rootly-burnout-detector"}

# Initialize database tables
@app.on_event("startup")
async def startup_event():
    create_tables()

    # Run database migrations
    try:
        from migrations.migration_runner import run_migrations
        print("🔧 Running database migrations...")
        success = run_migrations()
        if success:
            print("✅ All migrations applied successfully")
        else:
            print("⚠️  Some migrations failed - check logs")
    except Exception as e:
        print(f"⚠️  Migration runner failed: {e}")
        # Don't fail startup if migrations fail
        pass

    # Start survey scheduler
    from app.services.survey_scheduler import survey_scheduler
    from app.models import SessionLocal

    survey_scheduler.start()
    print("✅ Survey scheduler started")

    # Load existing schedules from database
    db = SessionLocal()
    try:
        survey_scheduler.schedule_organization_surveys(db)
        print("✅ Loaded survey schedules from database")
    except Exception as e:
        print(f"⚠️ Error loading survey schedules: {str(e)}")
    finally:
        db.close()
    

# Include API routers
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(rootly.router, prefix="/rootly", tags=["rootly"])
app.include_router(pagerduty.router, prefix="/pagerduty", tags=["pagerduty"])
app.include_router(analyses.router, prefix="/analyses", tags=["analyses"])
app.include_router(github.router, prefix="/integrations", tags=["github-integration"])
app.include_router(slack.router, prefix="/integrations", tags=["slack-integration"])
app.include_router(llm.router, tags=["llm-tokens"])
app.include_router(mappings.router, prefix="/integrations", tags=["integration-mappings"])
app.include_router(manual_mappings.router, prefix="/integrations", tags=["manual-mappings"])
app.include_router(debug_mappings.router, prefix="/api", tags=["debug"])
app.include_router(migrate.router, prefix="/api/migrate", tags=["migration"])
app.include_router(admin.router, prefix="/api", tags=["admin"])
app.include_router(notifications.router, prefix="/api", tags=["notifications"])
app.include_router(invitations.router, prefix="/api", tags=["invitations"])
app.include_router(surveys.router, prefix="/api/surveys", tags=["surveys"])
logger.info("✅ Surveys router registered successfully")
