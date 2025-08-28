"""
GitHub integration API endpoints for OAuth and data collection.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
import secrets
import json
import os
import logging
from cryptography.fernet import Fernet
import base64
from datetime import datetime
from pydantic import BaseModel

from ...models import get_db, User, GitHubIntegration, UserCorrelation
from ...auth.dependencies import get_current_user
from ...auth.integration_oauth import github_integration_oauth
from ...core.config import settings

router = APIRouter(prefix="/github", tags=["github-integration"])
logger = logging.getLogger(__name__)

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
async def connect_github(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiate GitHub OAuth flow for integration.
    Returns authorization URL for frontend to redirect to.
    """
    # Check if OAuth credentials are configured
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is not configured. Please contact your administrator to set up GitHub integration."
        )
    
    # Generate state parameter for security
    state = secrets.token_urlsafe(32)
    
    # Store state in session or database (simplified for this example)
    # In production, you'd want to store this more securely
    auth_url = github_integration_oauth.get_authorization_url(state=state)
    
    return {
        "authorization_url": auth_url,
        "state": state
    }

@router.get("/callback")
async def github_callback(
    code: str,
    state: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Handle GitHub OAuth callback and store integration.
    """
    try:
        # Exchange code for token
        token_data = await github_integration_oauth.exchange_code_for_token(code)
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get access token from GitHub"
            )
        
        # Get user info
        user_info = await github_integration_oauth.get_user_info(access_token)
        github_username = user_info.get("login")
        
        if not github_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get GitHub username"
            )
        
        # Get user's organizations
        try:
            orgs = await github_integration_oauth.get_organizations(access_token)
            org_names = [org.get("login") for org in orgs if org.get("login")]
        except Exception:
            org_names = []  # Organizations might not be accessible
        
        # Get user's emails for correlation
        try:
            emails = await github_integration_oauth.get_all_emails(access_token)
            email_addresses = [email.get("email") for email in emails]
        except Exception:
            email_addresses = []
        
        # Encrypt the token
        encrypted_token = encrypt_token(access_token)
        
        # Check if integration already exists
        existing_integration = db.query(GitHubIntegration).filter(
            GitHubIntegration.user_id == current_user.id
        ).first()
        
        if existing_integration:
            # Update existing integration
            existing_integration.github_token = encrypted_token
            existing_integration.github_username = github_username
            existing_integration.organizations = org_names
            existing_integration.token_source = "oauth"
            existing_integration.updated_at = datetime.utcnow()
            integration = existing_integration
        else:
            # Create new integration
            integration = GitHubIntegration(
                user_id=current_user.id,
                github_token=encrypted_token,
                github_username=github_username,
                organizations=org_names,
                token_source="oauth"
            )
            db.add(integration)
        
        # Update user correlations
        for email in email_addresses:
            existing_correlation = db.query(UserCorrelation).filter(
                UserCorrelation.user_id == current_user.id,
                UserCorrelation.email == email
            ).first()
            
            if existing_correlation:
                existing_correlation.github_username = github_username
            else:
                correlation = UserCorrelation(
                    user_id=current_user.id,
                    email=email,
                    github_username=github_username
                )
                db.add(correlation)
        
        db.commit()
        
        return {
            "success": True,
            "message": "GitHub integration connected successfully",
            "integration": {
                "id": integration.id,
                "github_username": github_username,
                "organizations": org_names,
                "emails_connected": len(email_addresses)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect GitHub integration: {str(e)}"
        )

@router.post("/test")
async def test_github_integration(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test GitHub integration permissions and connectivity.
    """
    integration = db.query(GitHubIntegration).filter(
        GitHubIntegration.user_id == current_user.id
    ).first()
    
    if not integration or not integration.github_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="GitHub integration not found"
        )
    
    try:
        # Decrypt token
        access_token = decrypt_token(integration.github_token)
        
        # Test permissions
        permissions = await github_integration_oauth.test_permissions(access_token)
        
        # Get basic user info
        user_info = await github_integration_oauth.get_user_info(access_token)
        
        return {
            "success": True,
            "integration": {
                "github_username": integration.github_username,
                "organizations": integration.organizations,
                "connected_at": integration.created_at.isoformat(),
                "last_updated": integration.updated_at.isoformat()
            },
            "permissions": permissions,
            "user_info": {
                "username": user_info.get("login"),
                "name": user_info.get("name"),
                "public_repos": user_info.get("public_repos"),
                "followers": user_info.get("followers"),
                "following": user_info.get("following")
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test GitHub integration: {str(e)}"
        )

@router.get("/status")
async def get_github_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get GitHub integration status for current user, including beta token access.
    """
    # Check for user's personal integration first
    integration = db.query(GitHubIntegration).filter(
        GitHubIntegration.user_id == current_user.id
    ).first()
    
    # Check for beta GitHub token from Railway environment
    beta_github_token = os.getenv('GITHUB_TOKEN')
    logger.info(f"Beta GitHub token check: exists={beta_github_token is not None}, length={len(beta_github_token) if beta_github_token else 0}")
    
    # If user has personal integration, return that
    if integration:
        # Get token preview
        token_preview = None
        try:
            if integration.github_token:
                decrypted_token = decrypt_token(integration.github_token)
                token_preview = f"...{decrypted_token[-4:]}" if decrypted_token else None
        except Exception:
            pass  # Token preview is optional
        
        return {
            "connected": True,
            "integration": {
                "id": integration.id,
                "github_username": integration.github_username,
                "organizations": integration.organizations,
                "token_source": integration.token_source,
                "is_oauth": integration.is_oauth,
                "supports_refresh": integration.supports_refresh,
                "connected_at": integration.created_at.isoformat(),
                "last_updated": integration.updated_at.isoformat(),
                "token_preview": token_preview,
                "is_beta": False
            }
        }
    
    # If no personal integration but beta token exists, provide beta access
    elif beta_github_token:
        try:
            # Test the beta token and get basic info
            import httpx
            headers = {
                "Authorization": f"token {beta_github_token}",
                "Accept": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                # Get user info
                user_response = await client.get("https://api.github.com/user", headers=headers)
                if user_response.status_code == 200:
                    user_info = user_response.json()
                    github_username = user_info.get("login", "beta-user")
                    
                    # Get organizations
                    try:
                        orgs_response = await client.get("https://api.github.com/user/orgs", headers=headers)
                        if orgs_response.status_code == 200:
                            orgs = orgs_response.json()
                            org_names = [org.get("login") for org in orgs if org.get("login")]
                        else:
                            org_names = []
                    except Exception:
                        org_names = []
                    
                    logger.info(f"Beta GitHub token working: {github_username}, orgs: {org_names}")
                    
                    return {
                        "connected": True,
                        "integration": {
                            "id": "beta-github",
                            "github_username": github_username,
                            "organizations": org_names,
                            "token_source": "beta",
                            "is_oauth": False,
                            "supports_refresh": False,
                            "connected_at": datetime.now().isoformat(),
                            "last_updated": datetime.now().isoformat(),
                            "token_preview": f"***{beta_github_token[-4:]}",
                            "is_beta": True
                        }
                    }
                else:
                    logger.warning(f"Beta GitHub token test failed: {user_response.status_code}")
                    
        except Exception as e:
            logger.error(f"Error testing beta GitHub token: {e}")
    
    # No integration available
    return {
        "connected": False,
        "integration": None
    }

class TokenRequest(BaseModel):
    token: str

@router.post("/token")
async def connect_github_with_token(
    request: TokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Connect GitHub integration using a personal access token.
    """
    try:
        # Validate token by making a test API call
        headers = {
            "Authorization": f"token {request.token}",
            "Accept": "application/json"
        }
        
        # Test the token by getting user info
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get("https://api.github.com/user", headers=headers)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid GitHub token or insufficient permissions"
                )
            
            user_info = response.json()
            github_username = user_info.get("login")
            
            if not github_username:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get GitHub username from token"
                )
            
            # Get user's organizations (optional)
            try:
                orgs_response = await client.get("https://api.github.com/user/orgs", headers=headers)
                if orgs_response.status_code == 200:
                    orgs = orgs_response.json()
                    org_names = [org.get("login") for org in orgs if org.get("login")]
                else:
                    org_names = []
            except Exception:
                org_names = []
            
            # Get user's emails for correlation (optional)
            try:
                emails_response = await client.get("https://api.github.com/user/emails", headers=headers)
                if emails_response.status_code == 200:
                    emails = emails_response.json()
                    email_addresses = [email.get("email") for email in emails if email.get("verified")]
                else:
                    email_addresses = []
            except Exception:
                email_addresses = []
        
        # Encrypt the token
        encrypted_token = encrypt_token(request.token)
        
        # Check if integration already exists
        existing_integration = db.query(GitHubIntegration).filter(
            GitHubIntegration.user_id == current_user.id
        ).first()
        
        if existing_integration:
            # Update existing integration
            existing_integration.github_token = encrypted_token
            existing_integration.github_username = github_username
            existing_integration.organizations = org_names
            existing_integration.token_source = "manual"
            existing_integration.updated_at = datetime.utcnow()
            integration = existing_integration
        else:
            # Create new integration
            integration = GitHubIntegration(
                user_id=current_user.id,
                github_token=encrypted_token,
                github_username=github_username,
                organizations=org_names,
                token_source="manual"
            )
            db.add(integration)
        
        # Update user correlations
        for email in email_addresses:
            existing_correlation = db.query(UserCorrelation).filter(
                UserCorrelation.user_id == current_user.id,
                UserCorrelation.email == email
            ).first()
            
            if existing_correlation:
                existing_correlation.github_username = github_username
            else:
                correlation = UserCorrelation(
                    user_id=current_user.id,
                    email=email,
                    github_username=github_username
                )
                db.add(correlation)
        
        db.commit()
        
        return {
            "success": True,
            "message": "GitHub integration connected successfully with personal access token",
            "integration": {
                "id": integration.id,
                "github_username": github_username,
                "organizations": org_names,
                "token_source": "manual",
                "emails_connected": len(email_addresses)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect GitHub integration: {str(e)}"
        )

@router.delete("/disconnect")
async def disconnect_github(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect GitHub integration for current user.
    """
    integration = db.query(GitHubIntegration).filter(
        GitHubIntegration.user_id == current_user.id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="GitHub integration not found"
        )
    
    try:
        # Remove GitHub data from user correlations
        correlations = db.query(UserCorrelation).filter(
            UserCorrelation.user_id == current_user.id
        ).all()
        
        for correlation in correlations:
            correlation.github_username = None
        
        # Delete the integration
        db.delete(integration)
        db.commit()
        
        return {
            "success": True,
            "message": "GitHub integration disconnected successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disconnect GitHub integration: {str(e)}"
        )