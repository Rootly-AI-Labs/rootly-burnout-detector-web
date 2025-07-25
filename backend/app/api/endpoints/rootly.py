"""
Rootly integration API endpoints.
"""
from typing import Dict, Any
from datetime import datetime, timedelta
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...models import get_db, User, RootlyIntegration
from ...auth.dependencies import get_current_active_user
from ...core.rootly_client import RootlyAPIClient

logger = logging.getLogger(__name__)

router = APIRouter()

class RootlyTokenUpdate(BaseModel):
    token: str

class RootlyIntegrationAdd(BaseModel):
    token: str
    name: str

class RootlyIntegrationUpdate(BaseModel):
    name: str = None
    is_default: bool = None

class RootlyTestResponse(BaseModel):
    status: str
    message: str
    account_info: Dict[str, Any] = None
    error_code: str = None

@router.post("/token/test")
async def test_rootly_token_preview(
    token_update: RootlyTokenUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Test Rootly token and return preview info without saving."""
    # Test the token first
    client = RootlyAPIClient(token_update.token)
    test_result = await client.test_connection()
    
    print(f"DEBUG: Rootly test_connection result: {test_result}")
    
    if test_result["status"] != "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Invalid Rootly token",
                "error": test_result["message"],
                "error_code": test_result.get("error_code")
            }
        )
    
    # Extract organization info from test result
    account_info = test_result.get("account_info", {})
    organization_name = account_info.get("organization_name")
    total_users = account_info.get("total_users", 0)
    
    # Generate a default name for the integration
    if organization_name:
        base_name = organization_name
    else:
        # Extract from email domain as fallback
        email_domain = current_user.email.split('@')[1] if '@' in current_user.email else 'Organization'
        base_name = email_domain.split('.')[0].title()
    
    # Check if user already has this exact token (only active integrations)
    existing_token = db.query(RootlyIntegration).filter(
        RootlyIntegration.user_id == current_user.id,
        RootlyIntegration.api_token == token_update.token,
        RootlyIntegration.is_active == True
    ).first()
    
    if existing_token:
        return {
            "status": "duplicate_token",
            "message": f"This token is already connected as '{existing_token.name}'",
            "existing_integration": {
                "id": existing_token.id,
                "name": existing_token.name,
                "organization_name": existing_token.organization_name
            }
        }
    
    # Generate a unique name if team name already exists
    existing_names = [
        integration.name for integration in 
        db.query(RootlyIntegration).filter(
            RootlyIntegration.user_id == current_user.id,
            RootlyIntegration.platform == "rootly"
        ).all()
    ]
    
    suggested_name = base_name
    counter = 2
    while suggested_name in existing_names:
        suggested_name = f"{base_name} #{counter}"
        counter += 1
    
    return {
        "status": "success",
        "message": "Token is valid and ready to add",
        "preview": {
            "organization_name": organization_name,
            "suggested_name": suggested_name,
            "total_users": total_users,
            "can_add": True
        },
        "account_info": account_info
    }

@router.post("/token/add")
async def add_rootly_integration(
    integration_data: RootlyIntegrationAdd,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add a new Rootly integration after testing."""
    # Test the token again to ensure it's still valid
    client = RootlyAPIClient(integration_data.token)
    test_result = await client.test_connection()
    
    if test_result["status"] != "success":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Token is no longer valid",
                "error": test_result["message"],
                "error_code": test_result.get("error_code")
            }
        )
    
    # Check if user already has this exact token (prevent duplicates, only active integrations)
    existing_token = db.query(RootlyIntegration).filter(
        RootlyIntegration.user_id == current_user.id,
        RootlyIntegration.api_token == integration_data.token,
        RootlyIntegration.is_active == True
    ).first()
    
    if existing_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": f"This token is already connected as '{existing_token.name}'",
                "existing_integration": {
                    "id": existing_token.id,
                    "name": existing_token.name,
                    "organization_name": existing_token.organization_name
                }
            }
        )
    
    # Extract organization info from test result
    account_info = test_result.get("account_info", {})
    organization_name = account_info.get("organization_name")
    total_users = account_info.get("total_users", 0)
    
    # Check if this will be the user's first Rootly integration (make it default)
    existing_integrations = db.query(RootlyIntegration).filter(
        RootlyIntegration.user_id == current_user.id,
        RootlyIntegration.platform == "rootly"
    ).count()
    is_first_integration = existing_integrations == 0
    
    # Create the new integration
    new_integration = RootlyIntegration(
        user_id=current_user.id,
        name=integration_data.name,
        organization_name=organization_name,
        api_token=integration_data.token,
        total_users=total_users,
        is_default=is_first_integration,  # First integration becomes default
        is_active=True,
        created_at=datetime.utcnow(),
        last_used_at=datetime.utcnow()
    )
    
    try:
        db.add(new_integration)
        db.commit()
        db.refresh(new_integration)
        
        return {
            "status": "success",
            "message": f"Rootly integration '{integration_data.name}' added successfully",
            "integration": {
                "id": new_integration.id,
                "name": new_integration.name,
                "organization_name": new_integration.organization_name,
                "total_users": new_integration.total_users,
                "is_default": new_integration.is_default,
                "created_at": new_integration.created_at.isoformat()
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save integration: {str(e)}"
        )

@router.get("/integrations")
async def list_integrations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all Rootly integrations for the current user with permissions."""
    integrations = db.query(RootlyIntegration).filter(
        RootlyIntegration.user_id == current_user.id,
        RootlyIntegration.is_active == True,
        RootlyIntegration.platform == "rootly"
    ).order_by(RootlyIntegration.created_at.desc()).all()
    
    result_integrations = []
    
    for integration in integrations:
        integration_data = {
            "id": integration.id,
            "name": integration.name,
            "organization_name": integration.organization_name,
            "total_users": integration.total_users,
            "is_default": integration.is_default,
            "created_at": integration.created_at.isoformat(),
            "last_used_at": integration.last_used_at.isoformat() if integration.last_used_at else None,
            "token_suffix": f"****{integration.api_token[-4:]}" if integration.api_token and len(integration.api_token) >= 4 else "****"
        }
        
        # Check permissions for each integration
        if integration.api_token:
            try:
                client = RootlyAPIClient(integration.api_token)
                permissions = await client.check_permissions()
                integration_data["permissions"] = permissions
            except Exception as e:
                # If we can't check permissions, include a note
                integration_data["permissions"] = {
                    "users": {"access": False, "error": f"Permission check failed: {str(e)}"},
                    "incidents": {"access": False, "error": f"Permission check failed: {str(e)}"}
                }
        
        result_integrations.append(integration_data)
    
    return {
        "integrations": result_integrations
    }

@router.put("/integrations/{integration_id}")
async def update_integration(
    integration_id: int,
    update_data: RootlyIntegrationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a Rootly integration name or set as default."""
    integration = db.query(RootlyIntegration).filter(
        RootlyIntegration.id == integration_id,
        RootlyIntegration.user_id == current_user.id,
        RootlyIntegration.platform == "rootly"
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    # Handle name update
    if update_data.name is not None:
        # Check if new name conflicts with existing integrations
        existing_with_name = db.query(RootlyIntegration).filter(
            RootlyIntegration.user_id == current_user.id,
            RootlyIntegration.name == update_data.name,
            RootlyIntegration.id != integration_id,
            RootlyIntegration.is_active == True
        ).first()
        
        if existing_with_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An integration with the name '{update_data.name}' already exists"
            )
        
        integration.name = update_data.name
    
    # Handle setting as default
    if update_data.is_default is not None and update_data.is_default:
        # First, set all other Rootly integrations for this user to not default
        db.query(RootlyIntegration).filter(
            RootlyIntegration.user_id == current_user.id,
            RootlyIntegration.platform == "rootly",
            RootlyIntegration.is_active == True
        ).update({"is_default": False})
        
        # Then set this one as default
        integration.is_default = True
    
    try:
        db.commit()
        db.refresh(integration)
        
        message = ""
        if update_data.name is not None and update_data.is_default:
            message = f"Integration renamed to '{update_data.name}' and set as default"
        elif update_data.name is not None:
            message = f"Integration renamed to '{update_data.name}'"
        elif update_data.is_default:
            message = "Integration set as default"
        
        return {
            "status": "success",
            "message": message,
            "integration": {
                "id": integration.id,
                "name": integration.name,
                "organization_name": integration.organization_name,
                "total_users": integration.total_users,
                "is_default": integration.is_default,
                "created_at": integration.created_at.isoformat(),
                "last_used_at": integration.last_used_at.isoformat() if integration.last_used_at else None
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update integration: {str(e)}"
        )

@router.delete("/integrations/{integration_id}")
async def delete_integration(
    integration_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete/revoke a Rootly integration."""
    integration = db.query(RootlyIntegration).filter(
        RootlyIntegration.id == integration_id,
        RootlyIntegration.user_id == current_user.id,
        RootlyIntegration.platform == "rootly"
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    try:
        integration_name = integration.name
        
        # Soft delete - mark as inactive
        integration.is_active = False
        db.commit()
        
        return {
            "status": "success",
            "message": f"Integration '{integration_name}' has been revoked"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete integration: {str(e)}"
        )

@router.get("/token/test")
async def test_rootly_token(
    current_user: User = Depends(get_current_active_user)
) -> RootlyTestResponse:
    """Test the current user's Rootly API token."""
    if not current_user.rootly_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Rootly token configured"
        )
    
    client = RootlyAPIClient(current_user.rootly_token)
    test_result = await client.test_connection()
    
    return RootlyTestResponse(**test_result)

@router.get("/data/preview")
async def preview_rootly_data(
    days: int = 7,
    current_user: User = Depends(get_current_active_user)
):
    """Preview Rootly data without running full analysis."""
    if not current_user.rootly_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Rootly token configured"
        )
    
    try:
        client = RootlyAPIClient(current_user.rootly_token)
        
        # Get limited data for preview
        users = await client.get_users(limit=10)
        incidents = await client.get_incidents(days_back=days, limit=20)
        
        # Create preview summary
        preview = {
            "users_sample": len(users),
            "incidents_sample": len(incidents),
            "date_range_days": days,
            "sample_user": users[0] if users else None,
            "sample_incident": incidents[0] if incidents else None
        }
        
        return preview
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to preview data: {str(e)}"
        )

@router.get("/debug/incidents")
async def debug_rootly_incidents(
    integration_id: int,
    days: int = 7,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Debug endpoint to show raw Rootly incident data and processing steps."""
    # Get the integration
    integration = db.query(RootlyIntegration).filter(
        RootlyIntegration.id == integration_id,
        RootlyIntegration.user_id == current_user.id,
        RootlyIntegration.is_active == True
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    try:
        # Initialize client with this integration
        client = RootlyAPIClient(integration.api_token)
        
        # Get date range information
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        debug_info = {
            "integration_info": {
                "id": integration.id,
                "name": integration.name,
                "organization_name": integration.organization_name,
                "platform": integration.platform,
                "token_suffix": f"****{integration.api_token[-4:]}" if len(integration.api_token) >= 4 else "****"
            },
            "date_range": {
                "days_back": days,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "timezone": "UTC"
            },
            "api_test_results": {},
            "raw_api_response": {},
            "processed_data": {},
            "filters_applied": {},
            "errors": []
        }
        
        # Step 1: Test basic connection
        logger.info(f"DEBUG: Testing connection for integration {integration.id}")
        try:
            connection_test = await client.test_connection()
            debug_info["api_test_results"]["connection"] = connection_test
        except Exception as e:
            debug_info["errors"].append(f"Connection test failed: {str(e)}")
            debug_info["api_test_results"]["connection"] = {"status": "error", "message": str(e)}
        
        # Step 2: Test permissions
        logger.info(f"DEBUG: Testing permissions for integration {integration.id}")
        try:
            permissions = await client.check_permissions()
            debug_info["api_test_results"]["permissions"] = permissions
        except Exception as e:
            debug_info["errors"].append(f"Permission check failed: {str(e)}")
            debug_info["api_test_results"]["permissions"] = {"error": str(e)}
        
        # Step 3: Get raw incidents with detailed logging
        logger.info(f"DEBUG: Fetching incidents for {days} days from integration {integration.id}")
        try:
            # Get incidents with limit for debugging
            incidents = await client.get_incidents(days_back=days, limit=100)
            
            debug_info["raw_api_response"] = {
                "total_incidents_fetched": len(incidents),
                "sample_incidents": incidents[:3] if incidents else [],  # First 3 for inspection
                "incident_date_range": [],
                "status_breakdown": {},
                "severity_breakdown": {}
            }
            
            # Analyze the incidents
            if incidents:
                # Extract dates and analyze distribution
                incident_dates = []
                status_counts = {}
                severity_counts = {}
                
                for incident in incidents:
                    attrs = incident.get("attributes", {})
                    created_at = attrs.get("created_at")
                    status = attrs.get("status", "unknown")
                    
                    # Count status
                    status_counts[status] = status_counts.get(status, 0) + 1
                    
                    # Count severity
                    severity = "unknown"
                    severity_data = attrs.get("severity")
                    if severity_data and isinstance(severity_data, dict):
                        data = severity_data.get("data")
                        if data and isinstance(data, dict):
                            attributes = data.get("attributes")
                            if attributes and isinstance(attributes, dict):
                                name = attributes.get("name")
                                if name and isinstance(name, str):
                                    severity = name.lower()
                    severity_counts[severity] = severity_counts.get(severity, 0) + 1
                    
                    # Parse and collect dates
                    if created_at:
                        try:
                            dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                            incident_dates.append(dt.isoformat())
                        except:
                            pass
                
                # Sort dates to show range
                if incident_dates:
                    incident_dates.sort()
                    debug_info["raw_api_response"]["incident_date_range"] = [
                        incident_dates[0],  # Earliest
                        incident_dates[-1]  # Latest
                    ]
                
                debug_info["raw_api_response"]["status_breakdown"] = status_counts
                debug_info["raw_api_response"]["severity_breakdown"] = severity_counts
            
        except Exception as e:
            debug_info["errors"].append(f"Incident fetch failed: {str(e)}")
            debug_info["raw_api_response"]["error"] = str(e)
            incidents = []
        
        # Step 4: Show filtering logic
        debug_info["filters_applied"] = {
            "date_filter": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "filter_string": f"filter[created_at][gte]={start_date.isoformat()}&filter[created_at][lte]={end_date.isoformat()}"
            },
            "incidents_in_range": 0,
            "incidents_outside_range": 0,
            "date_parsing_errors": 0
        }
        
        # Analyze date filtering
        if incidents:
            in_range = 0
            outside_range = 0
            parsing_errors = 0
            
            for incident in incidents:
                attrs = incident.get("attributes", {})
                created_at = attrs.get("created_at")
                
                if created_at:
                    try:
                        dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        if start_date <= dt <= end_date:
                            in_range += 1
                        else:
                            outside_range += 1
                    except:
                        parsing_errors += 1
                else:
                    parsing_errors += 1
            
            debug_info["filters_applied"]["incidents_in_range"] = in_range
            debug_info["filters_applied"]["incidents_outside_range"] = outside_range
            debug_info["filters_applied"]["date_parsing_errors"] = parsing_errors
        
        # Step 5: Show processed data structure
        debug_info["processed_data"] = {
            "total_incidents_processed": len(incidents),
            "users_referenced": set(),
            "incident_processing_summary": {}
        }
        
        # Extract user references from incidents
        user_references = set()
        if incidents:
            for incident in incidents:
                attrs = incident.get("attributes", {})
                
                # Check various user fields
                for field in ["user", "started_by", "resolved_by"]:
                    user_data = attrs.get(field)
                    if user_data and isinstance(user_data, dict):
                        data = user_data.get("data")
                        if data and isinstance(data, dict) and data.get("id"):
                            user_references.add(str(data["id"]))
            
            debug_info["processed_data"]["users_referenced"] = list(user_references)
            debug_info["processed_data"]["unique_users_count"] = len(user_references)
        
        # Step 6: Get users for comparison
        try:
            users = await client.get_users(limit=50)
            debug_info["processed_data"]["total_users_fetched"] = len(users)
            debug_info["processed_data"]["sample_users"] = users[:2] if users else []
        except Exception as e:
            debug_info["errors"].append(f"User fetch failed: {str(e)}")
            debug_info["processed_data"]["user_fetch_error"] = str(e)
        
        return debug_info
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Debug failed: {str(e)}"
        )