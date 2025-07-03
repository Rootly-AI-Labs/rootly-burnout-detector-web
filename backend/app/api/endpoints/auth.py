"""
Authentication API endpoints.
"""
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ...models import get_db, User
from ...auth.oauth import google_oauth, github_oauth
from ...auth.jwt import create_access_token
from ...auth.dependencies import get_current_active_user
from ...core.config import settings

router = APIRouter()

@router.get("/google")
async def google_login():
    """Initiate Google OAuth login."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured"
        )
    
    authorization_url = google_oauth.get_authorization_url()
    return {"authorization_url": authorization_url}

@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(None),
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured"
        )
    
    try:
        # Exchange code for token
        token_data = await google_oauth.exchange_code_for_token(code)
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No access token received"
            )
        
        # Get user info
        user_info = await google_oauth.get_user_info(access_token)
        
        # Find or create user
        user = db.query(User).filter(
            User.email == user_info["email"]
        ).first()
        
        if not user:
            user = User(
                email=user_info["email"],
                name=user_info.get("name"),
                provider="google",
                provider_id=user_info["id"],
                is_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update provider info if user exists
            user.provider = "google"
            user.provider_id = user_info["id"]
            user.is_verified = True
            if user_info.get("name"):
                user.name = user_info["name"]
            db.commit()
        
        # Create JWT token
        jwt_token = create_access_token(data={"sub": user.id})
        
        # Redirect to frontend with token
        redirect_url = f"{settings.FRONTEND_URL}/auth/success?token={jwt_token}"
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        error_url = f"{settings.FRONTEND_URL}/auth/error?message={str(e)}"
        return RedirectResponse(url=error_url)

@router.get("/github")
async def github_login():
    """Initiate GitHub OAuth login."""
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="GitHub OAuth not configured"
        )
    
    authorization_url = github_oauth.get_authorization_url()
    return {"authorization_url": authorization_url}

@router.get("/github/callback")
async def github_callback(
    code: str = Query(...),
    state: str = Query(None),
    db: Session = Depends(get_db)
):
    """Handle GitHub OAuth callback."""
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="GitHub OAuth not configured"
        )
    
    try:
        # Exchange code for token
        token_data = await github_oauth.exchange_code_for_token(code)
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No access token received"
            )
        
        # Get user info
        user_info = await github_oauth.get_user_info(access_token)
        
        # GitHub doesn't always provide email in the main endpoint
        email = user_info.get("email")
        if not email:
            # Get email from separate endpoint
            import httpx
            headers = {"Authorization": f"token {access_token}"}
            async with httpx.AsyncClient() as client:
                email_response = await client.get(
                    "https://api.github.com/user/emails", 
                    headers=headers
                )
                if email_response.status_code == 200:
                    emails = email_response.json()
                    primary_email = next(
                        (e["email"] for e in emails if e["primary"]), 
                        None
                    )
                    if primary_email:
                        email = primary_email
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No email address available from GitHub"
            )
        
        # Find or create user
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            user = User(
                email=email,
                name=user_info.get("name") or user_info.get("login"),
                provider="github",
                provider_id=str(user_info["id"]),
                is_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update provider info if user exists
            user.provider = "github"
            user.provider_id = str(user_info["id"])
            user.is_verified = True
            if user_info.get("name"):
                user.name = user_info["name"]
            db.commit()
        
        # Create JWT token
        jwt_token = create_access_token(data={"sub": user.id})
        
        # Redirect to frontend with token
        redirect_url = f"{settings.FRONTEND_URL}/auth/success?token={jwt_token}"
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        error_url = f"{settings.FRONTEND_URL}/auth/error?message={str(e)}"
        return RedirectResponse(url=error_url)

@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user information."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "provider": current_user.provider,
        "is_verified": current_user.is_verified,
        "has_rootly_token": bool(current_user.rootly_token),
        "created_at": current_user.created_at
    }