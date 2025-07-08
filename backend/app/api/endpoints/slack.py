"""
Slack integration API endpoints for OAuth and data collection.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
import secrets
import json
from cryptography.fernet import Fernet
import base64
from datetime import datetime

from ...models import get_db, User, SlackIntegration, UserCorrelation
from ...auth.dependencies import get_current_user
from ...auth.integration_oauth import slack_integration_oauth
from ...core.config import settings

router = APIRouter(prefix="/slack", tags=["slack-integration"])

# Simple encryption for tokens (in production, use proper key management)
def get_encryption_key():
    """Get or create encryption key for tokens."""
    key = settings.JWT_SECRET_KEY.encode()
    # Ensure key is 32 bytes for Fernet
    key = base64.urlsafe_b64encode(key[:32].ljust(32, b'\0'))
    return key

def encrypt_token(token: str) -> str:
    """Encrypt a token for storage."""
    fernet = Fernet(get_encryption_key())
    return fernet.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a token from storage."""
    fernet = Fernet(get_encryption_key())
    return fernet.decrypt(encrypted_token.encode()).decode()

@router.post("/connect")
async def connect_slack(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiate Slack OAuth flow for integration.
    Returns authorization URL for frontend to redirect to.
    """
    # Generate state parameter for security
    state = secrets.token_urlsafe(32)
    
    # Store state in session or database (simplified for this example)
    # In production, you'd want to store this more securely
    auth_url = slack_integration_oauth.get_authorization_url(state=state)
    
    return {
        "authorization_url": auth_url,
        "state": state
    }

@router.get("/callback")
async def slack_callback(
    code: str,
    state: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Handle Slack OAuth callback and store integration.
    """
    try:
        # Exchange code for token
        token_data = await slack_integration_oauth.exchange_code_for_token(code)
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get access token from Slack"
            )
        
        # Get auth info and user ID
        auth_info = await slack_integration_oauth.test_auth(access_token)
        slack_user_id = auth_info.get("user_id")
        workspace_id = auth_info.get("team_id")
        
        if not slack_user_id or not workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get Slack user ID or workspace ID"
            )
        
        # Get user info
        user_info = await slack_integration_oauth.get_user_info(access_token, slack_user_id)
        user_profile = user_info.get("user", {}).get("profile", {})
        user_email = user_profile.get("email")
        
        # Encrypt the token
        encrypted_token = encrypt_token(access_token)
        
        # Check if integration already exists
        existing_integration = db.query(SlackIntegration).filter(
            SlackIntegration.user_id == current_user.id
        ).first()
        
        if existing_integration:
            # Update existing integration
            existing_integration.slack_token = encrypted_token
            existing_integration.slack_user_id = slack_user_id
            existing_integration.workspace_id = workspace_id
            existing_integration.token_source = "oauth"
            existing_integration.updated_at = datetime.utcnow()
            integration = existing_integration
        else:
            # Create new integration
            integration = SlackIntegration(
                user_id=current_user.id,
                slack_token=encrypted_token,
                slack_user_id=slack_user_id,
                workspace_id=workspace_id,
                token_source="oauth"
            )
            db.add(integration)
        
        # Update user correlations if email is available
        if user_email:
            existing_correlation = db.query(UserCorrelation).filter(
                UserCorrelation.user_id == current_user.id,
                UserCorrelation.email == user_email
            ).first()
            
            if existing_correlation:
                existing_correlation.slack_user_id = slack_user_id
            else:
                correlation = UserCorrelation(
                    user_id=current_user.id,
                    email=user_email,
                    slack_user_id=slack_user_id
                )
                db.add(correlation)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Slack integration connected successfully",
            "integration": {
                "id": integration.id,
                "slack_user_id": slack_user_id,
                "workspace_id": workspace_id,
                "user_email": user_email,
                "user_name": user_profile.get("real_name") or user_profile.get("display_name")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect Slack integration: {str(e)}"
        )

@router.post("/test")
async def test_slack_integration(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test Slack integration permissions and connectivity.
    """
    integration = db.query(SlackIntegration).filter(
        SlackIntegration.user_id == current_user.id
    ).first()
    
    if not integration or not integration.slack_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slack integration not found"
        )
    
    try:
        # Decrypt token
        access_token = decrypt_token(integration.slack_token)
        
        # Test permissions
        permissions = await slack_integration_oauth.test_permissions(access_token)
        
        # Get auth info
        auth_info = await slack_integration_oauth.test_auth(access_token)
        
        # Get user info
        user_info = await slack_integration_oauth.get_user_info(access_token, integration.slack_user_id)
        user_profile = user_info.get("user", {}).get("profile", {})
        
        return {
            "success": True,
            "integration": {
                "slack_user_id": integration.slack_user_id,
                "workspace_id": integration.workspace_id,
                "connected_at": integration.created_at.isoformat(),
                "last_updated": integration.updated_at.isoformat()
            },
            "permissions": permissions,
            "workspace_info": {
                "team_id": auth_info.get("team_id"),
                "team_name": auth_info.get("team"),
                "url": auth_info.get("url")
            },
            "user_info": {
                "user_id": integration.slack_user_id,
                "name": user_profile.get("real_name") or user_profile.get("display_name"),
                "email": user_profile.get("email"),
                "title": user_profile.get("title"),
                "timezone": user_profile.get("tz")
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test Slack integration: {str(e)}"
        )

@router.get("/status")
async def get_slack_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get Slack integration status for current user.
    """
    integration = db.query(SlackIntegration).filter(
        SlackIntegration.user_id == current_user.id
    ).first()
    
    if not integration:
        return {
            "connected": False,
            "integration": None
        }
    
    return {
        "connected": True,
        "integration": {
            "id": integration.id,
            "slack_user_id": integration.slack_user_id,
            "workspace_id": integration.workspace_id,
            "token_source": integration.token_source,
            "is_oauth": integration.is_oauth,
            "supports_refresh": integration.supports_refresh,
            "connected_at": integration.created_at.isoformat(),
            "last_updated": integration.updated_at.isoformat()
        }
    }

@router.post("/token")
async def connect_slack_with_token(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Connect Slack integration using a personal access token.
    """
    try:
        # Validate token by making a test API call
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Test the token by getting auth info
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get("https://slack.com/api/auth.test", headers=headers)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to validate Slack token"
                )
            
            auth_info = response.json()
            if not auth_info.get("ok", False):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid Slack token: {auth_info.get('error', 'Unknown error')}"
                )
            
            slack_user_id = auth_info.get("user_id")
            workspace_id = auth_info.get("team_id")
            
            if not slack_user_id or not workspace_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get Slack user ID or workspace ID from token"
                )
        
        # Get user info (optional)
        user_email = None
        user_name = None
        try:
            user_response = await client.get(
                "https://slack.com/api/users.info", 
                headers=headers, 
                params={"user": slack_user_id}
            )
            if user_response.status_code == 200:
                user_data = user_response.json()
                if user_data.get("ok", False):
                    user_profile = user_data.get("user", {}).get("profile", {})
                    user_email = user_profile.get("email")
                    user_name = user_profile.get("real_name") or user_profile.get("display_name")
        except Exception:
            pass  # User info is optional
        
        # Encrypt the token
        encrypted_token = encrypt_token(token)
        
        # Check if integration already exists
        existing_integration = db.query(SlackIntegration).filter(
            SlackIntegration.user_id == current_user.id
        ).first()
        
        if existing_integration:
            # Update existing integration
            existing_integration.slack_token = encrypted_token
            existing_integration.slack_user_id = slack_user_id
            existing_integration.workspace_id = workspace_id
            existing_integration.token_source = "manual"
            existing_integration.updated_at = datetime.utcnow()
            integration = existing_integration
        else:
            # Create new integration
            integration = SlackIntegration(
                user_id=current_user.id,
                slack_token=encrypted_token,
                slack_user_id=slack_user_id,
                workspace_id=workspace_id,
                token_source="manual"
            )
            db.add(integration)
        
        # Update user correlations if email is available
        if user_email:
            existing_correlation = db.query(UserCorrelation).filter(
                UserCorrelation.user_id == current_user.id,
                UserCorrelation.email == user_email
            ).first()
            
            if existing_correlation:
                existing_correlation.slack_user_id = slack_user_id
            else:
                correlation = UserCorrelation(
                    user_id=current_user.id,
                    email=user_email,
                    slack_user_id=slack_user_id
                )
                db.add(correlation)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Slack integration connected successfully with personal access token",
            "integration": {
                "id": integration.id,
                "slack_user_id": slack_user_id,
                "workspace_id": workspace_id,
                "token_source": "manual",
                "user_email": user_email,
                "user_name": user_name
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect Slack integration: {str(e)}"
        )

@router.delete("/disconnect")
async def disconnect_slack(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect Slack integration for current user.
    """
    integration = db.query(SlackIntegration).filter(
        SlackIntegration.user_id == current_user.id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slack integration not found"
        )
    
    try:
        # Remove Slack data from user correlations
        correlations = db.query(UserCorrelation).filter(
            UserCorrelation.user_id == current_user.id
        ).all()
        
        for correlation in correlations:
            correlation.slack_user_id = None
        
        # Delete the integration
        db.delete(integration)
        db.commit()
        
        return {
            "success": True,
            "message": "Slack integration disconnected successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disconnect Slack integration: {str(e)}"
        )