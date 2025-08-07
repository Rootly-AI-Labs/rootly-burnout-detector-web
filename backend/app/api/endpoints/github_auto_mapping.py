"""
GitHub Auto-Mapping API endpoint with detailed progress logging.
"""
import asyncio
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...models import get_db, User, GitHubIntegration, UserMapping
from ...auth.dependencies import get_current_active_user
from ...services.progress_logger import GitHubMappingProgressLogger
from ...services.enhanced_github_collector import collect_team_github_data_with_mapping

logger = logging.getLogger(__name__)
router = APIRouter()

class AutoMappingRequest(BaseModel):
    team_emails: List[str]
    clear_existing_mappings: bool = False

class AutoMappingResponse(BaseModel):
    status: str
    message: str
    total_emails: int
    operation_id: str

@router.post("/github/auto-map", response_model=AutoMappingResponse)
async def start_github_auto_mapping(
    request: AutoMappingRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Start GitHub auto-mapping process with detailed progress logging.
    
    This endpoint will:
    1. Clear existing logs for the operation
    2. Start the auto-mapping process in the background
    3. Log detailed progress that can be monitored via the progress API
    
    Args:
        request: Auto-mapping configuration
        background_tasks: FastAPI background tasks
        current_user: Authenticated user
        db: Database session
    
    Returns:
        Operation status and tracking information
    """
    
    # Check for GitHub integration
    github_integration = db.query(GitHubIntegration).filter(
        GitHubIntegration.user_id == current_user.id,
        GitHubIntegration.github_token.isnot(None)
    ).first()
    
    if not github_integration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No GitHub integration found. Please connect your GitHub account first."
        )
    
    if not request.team_emails:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No team emails provided for mapping."
        )
    
    # Clear existing mappings if requested
    if request.clear_existing_mappings:
        db.query(UserMapping).filter(
            UserMapping.user_id == current_user.id,
            UserMapping.target_platform == "github"
        ).delete()
        db.commit()
        logger.info(f"Cleared existing GitHub mappings for user {current_user.id}")
    
    # Generate operation ID for tracking
    operation_id = f"github_auto_map_{current_user.id}_{len(request.team_emails)}"
    
    # Start background task
    background_tasks.add_task(
        run_github_auto_mapping_task,
        user_id=current_user.id,
        team_emails=request.team_emails,
        github_integration_id=github_integration.id,
        operation_id=operation_id
    )
    
    return AutoMappingResponse(
        status="started",
        message=f"GitHub auto-mapping started for {len(request.team_emails)} team members. Monitor progress via /progress/logs/github_mapping",
        total_emails=len(request.team_emails),
        operation_id=operation_id
    )

async def run_github_auto_mapping_task(
    user_id: int,
    team_emails: List[str],
    github_integration_id: int,
    operation_id: str
):
    """
    Background task to perform GitHub auto-mapping with detailed progress logging.
    
    Args:
        user_id: User ID performing the mapping
        team_emails: List of email addresses to map
        github_integration_id: GitHub integration ID
        operation_id: Unique operation identifier
    """
    db = next(get_db())
    
    try:
        # Initialize progress logger
        progress_logger = GitHubMappingProgressLogger(user_id=user_id, db=db)
        
        # Clear any existing logs for this operation
        progress_logger.clear_logs()
        
        # Start the auto-mapping process
        progress_logger.start_auto_mapping(len(team_emails))
        
        # Get GitHub integration
        github_integration = db.query(GitHubIntegration).filter(
            GitHubIntegration.id == github_integration_id
        ).first()
        
        if not github_integration:
            progress_logger.fail_step(
                "github_integration",
                "GitHub integration not found",
                f"Integration ID {github_integration_id} not found"
            )
            return
        
        # Decrypt GitHub token
        from ...api.endpoints.github import decrypt_token
        github_token = decrypt_token(github_integration.github_token)
        
        # Start organization discovery
        from ...services.github_collector import GitHubCollector
        collector = GitHubCollector()
        organizations = collector.organizations
        
        progress_logger.start_organization_discovery(organizations)
        
        # Set progress logger on collector for detailed logging
        collector._progress_logger = progress_logger
        
        successful_mappings = 0
        failed_emails = []
        
        # Process each email
        for index, email in enumerate(team_emails, 1):
            try:
                progress_logger.start_email_processing(email, index, len(team_emails))
                
                # Attempt to correlate email to GitHub
                github_username = await collector._correlate_email_to_github(
                    email, github_token, user_id
                )
                
                if github_username:
                    # Create/update mapping in database
                    existing_mapping = db.query(UserMapping).filter(
                        UserMapping.user_id == user_id,
                        UserMapping.source_identifier == email,
                        UserMapping.target_platform == "github"
                    ).first()
                    
                    if existing_mapping:
                        existing_mapping.target_identifier = github_username
                        existing_mapping.mapping_successful = True
                        existing_mapping.error_message = None
                    else:
                        new_mapping = UserMapping(
                            user_id=user_id,
                            source_platform="rootly",  # Default platform
                            source_identifier=email,
                            target_platform="github",
                            target_identifier=github_username,
                            mapping_successful=True
                        )
                        db.add(new_mapping)
                    
                    db.commit()
                    successful_mappings += 1
                    
                    progress_logger.complete_email_mapping(email, github_username, "auto_discovery")
                else:
                    failed_emails.append(email)
                    progress_logger.complete_email_mapping(email, None, "no_match_found")
                    
            except Exception as e:
                logger.error(f"Failed to process email {email}: {e}")
                failed_emails.append(email)
                progress_logger.complete_email_mapping(email, None, f"error: {str(e)}")
        
        # Complete organization discovery logging
        # This would be done earlier in practice, but we'll estimate for logging
        estimated_org_members = 50  # Placeholder
        progress_logger.complete_organization_discovery(estimated_org_members, organizations)
        
        # Complete the auto-mapping process
        progress_logger.complete_auto_mapping(successful_mappings, len(team_emails), failed_emails)
        
        logger.info(f"GitHub auto-mapping completed: {successful_mappings}/{len(team_emails)} emails mapped")
        
    except Exception as e:
        logger.error(f"GitHub auto-mapping task failed: {e}")
        
        # Log the failure
        if 'progress_logger' in locals():
            progress_logger.fail_step(
                "auto_mapping_error",
                f"Auto-mapping failed: {str(e)}",
                f"Operation ID: {operation_id}"
            )
    
    finally:
        db.close()

@router.get("/github/auto-map/status")
async def get_github_auto_mapping_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get the current status of GitHub auto-mapping operation.
    
    Returns:
        Current status and progress information
    """
    try:
        # Get latest progress logs
        from ...services.progress_logger import ProgressLogger
        
        logs = ProgressLogger.get_logs(
            user_id=current_user.id,
            operation_type="github_mapping",
            limit=50,
            db=db
        )
        
        if not logs:
            return {
                "status": "not_started",
                "message": "No GitHub auto-mapping operations found",
                "logs": []
            }
        
        # Analyze logs to determine current status
        latest_log = logs[0]
        
        if latest_log["status"] == "completed" and "complete" in latest_log["step_name"]:
            status = "completed"
        elif latest_log["status"] == "failed":
            status = "failed"
        elif any(log["status"] == "in_progress" for log in logs[:5]):
            status = "in_progress"
        else:
            status = "unknown"
        
        return {
            "status": status,
            "message": latest_log["message"],
            "progress_percentage": latest_log.get("progress_percentage"),
            "total_logs": len(logs),
            "latest_update": latest_log["created_at"],
            "recent_logs": logs[:10]  # Return 10 most recent logs
        }
        
    except Exception as e:
        logger.error(f"Failed to get GitHub auto-mapping status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve status: {str(e)}"
        )