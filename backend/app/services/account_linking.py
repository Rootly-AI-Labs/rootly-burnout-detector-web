"""
Account linking service for managing multiple OAuth providers and email addresses.
"""
import logging
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.orm import Session
from datetime import datetime

from ..models import User, OAuthProvider, UserEmail
from ..auth.oauth import github_oauth, google_oauth

logger = logging.getLogger(__name__)

class AccountLinkingService:
    """Service for linking OAuth accounts and managing user emails."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def link_or_create_user(
        self, 
        provider: str, 
        user_info: Dict[str, Any], 
        access_token: str,
        refresh_token: Optional[str] = None
    ) -> Tuple[User, bool]:
        """
        Link OAuth provider to existing user or create new user.
        
        Returns:
            Tuple of (User, is_new_user)
        """
        provider_user_id = str(user_info.get("id"))
        
        # Get all emails for this provider
        if provider == "github":
            all_emails = await github_oauth.get_all_emails(access_token)
            primary_email = github_oauth.select_primary_email(all_emails) or user_info.get("email")
            email_list = [email["email"] for email in all_emails]
        elif provider == "google":
            # Google typically provides one verified email
            primary_email = user_info.get("email")
            email_list = [primary_email] if primary_email else []
            all_emails = [{"email": primary_email, "verified": True, "primary": True}] if primary_email else []
        else:
            raise ValueError(f"Unsupported provider: {provider}")
        
        if not primary_email:
            raise ValueError(f"No valid email found for {provider} user")
        
        # Check if this OAuth provider is already linked
        existing_oauth = self.db.query(OAuthProvider).filter(
            OAuthProvider.provider == provider,
            OAuthProvider.provider_user_id == provider_user_id
        ).first()
        
        if existing_oauth:
            # Update existing OAuth provider
            existing_oauth.access_token = access_token
            existing_oauth.refresh_token = refresh_token
            existing_oauth.updated_at = datetime.now()
            self.db.commit()
            return existing_oauth.user, False
        
        # Look for existing user by any of the emails
        existing_user = self._find_user_by_emails(email_list)
        
        if existing_user:
            # Link this provider to existing user
            logger.info(f"Linking {provider} account to existing user {existing_user.id}")
            self._link_provider_to_user(
                existing_user, provider, provider_user_id, 
                access_token, refresh_token, user_info
            )
            self._add_emails_to_user(existing_user, all_emails, provider)
            return existing_user, False
        else:
            # Create new user
            logger.info(f"Creating new user for {provider} account")
            new_user = self._create_new_user(
                primary_email, user_info.get("name"), 
                provider, provider_user_id, access_token, refresh_token
            )
            self._add_emails_to_user(new_user, all_emails, provider)
            return new_user, True
    
    def _find_user_by_emails(self, email_list: List[str]) -> Optional[User]:
        """Find existing user by any of the provided emails."""
        for email in email_list:
            # Check primary email
            user = self.db.query(User).filter(User.email == email).first()
            if user:
                return user
            
            # Check secondary emails
            user_email = self.db.query(UserEmail).filter(UserEmail.email == email).first()
            if user_email:
                return user_email.user
        
        return None
    
    def _create_new_user(
        self, 
        primary_email: str, 
        name: Optional[str],
        provider: str,
        provider_user_id: str,
        access_token: str,
        refresh_token: Optional[str]
    ) -> User:
        """Create a new user with OAuth provider."""
        user = User(
            email=primary_email,
            name=name,
            is_verified=True,
            # Legacy fields for backward compatibility
            provider=provider,
            provider_id=provider_user_id
        )
        self.db.add(user)
        self.db.flush()  # Get user ID
        
        # Add OAuth provider
        oauth_provider = OAuthProvider(
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
            access_token=access_token,
            refresh_token=refresh_token,
            is_primary=True
        )
        self.db.add(oauth_provider)
        
        # Add primary email
        user_email = UserEmail(
            user_id=user.id,
            email=primary_email,
            is_primary=True,
            is_verified=True,
            source=provider
        )
        self.db.add(user_email)
        
        self.db.commit()
        return user
    
    def _link_provider_to_user(
        self,
        user: User,
        provider: str,
        provider_user_id: str,
        access_token: str,
        refresh_token: Optional[str],
        user_info: Dict[str, Any]
    ) -> None:
        """Link a new OAuth provider to existing user."""
        # Check if this provider is already linked
        existing = self.db.query(OAuthProvider).filter(
            OAuthProvider.user_id == user.id,
            OAuthProvider.provider == provider
        ).first()
        
        if existing:
            # Update existing provider
            existing.provider_user_id = provider_user_id
            existing.access_token = access_token
            existing.refresh_token = refresh_token
            existing.updated_at = datetime.now()
        else:
            # Add new provider
            is_primary = len(user.oauth_providers) == 0
            oauth_provider = OAuthProvider(
                user_id=user.id,
                provider=provider,
                provider_user_id=provider_user_id,
                access_token=access_token,
                refresh_token=refresh_token,
                is_primary=is_primary
            )
            self.db.add(oauth_provider)
        
        # Update user name if not set
        if not user.name and user_info.get("name"):
            user.name = user_info["name"]
        
        self.db.commit()
    
    def _add_emails_to_user(
        self, 
        user: User, 
        email_data: List[Dict[str, Any]], 
        provider: str
    ) -> None:
        """Add emails from OAuth provider to user."""
        for email_info in email_data:
            email = email_info["email"]
            
            # Check if email already exists for this user
            existing = self.db.query(UserEmail).filter(
                UserEmail.user_id == user.id,
                UserEmail.email == email
            ).first()
            
            if not existing:
                user_email = UserEmail(
                    user_id=user.id,
                    email=email,
                    is_primary=email_info.get("primary", False) and email == user.email,
                    is_verified=email_info.get("verified", True),
                    source=provider
                )
                self.db.add(user_email)
        
        self.db.commit()
    
    def get_user_providers(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all OAuth providers for a user."""
        providers = self.db.query(OAuthProvider).filter(
            OAuthProvider.user_id == user_id
        ).all()
        
        return [
            {
                "id": p.id,
                "provider": p.provider,
                "is_primary": p.is_primary,
                "created_at": p.created_at,
                "updated_at": p.updated_at
            }
            for p in providers
        ]
    
    def get_user_emails(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all emails for a user."""
        emails = self.db.query(UserEmail).filter(
            UserEmail.user_id == user_id
        ).all()
        
        return [
            {
                "id": e.id,
                "email": e.email,
                "is_primary": e.is_primary,
                "is_verified": e.is_verified,
                "source": e.source,
                "created_at": e.created_at
            }
            for e in emails
        ]
    
    def unlink_provider(self, user_id: int, provider: str) -> bool:
        """Unlink an OAuth provider from user."""
        providers = self.db.query(OAuthProvider).filter(
            OAuthProvider.user_id == user_id
        ).all()
        
        # Don't allow unlinking if it's the only provider
        if len(providers) <= 1:
            return False
        
        provider_to_remove = self.db.query(OAuthProvider).filter(
            OAuthProvider.user_id == user_id,
            OAuthProvider.provider == provider
        ).first()
        
        if not provider_to_remove:
            return False
        
        # If removing primary provider, make another one primary
        if provider_to_remove.is_primary:
            remaining_provider = self.db.query(OAuthProvider).filter(
                OAuthProvider.user_id == user_id,
                OAuthProvider.provider != provider
            ).first()
            if remaining_provider:
                remaining_provider.is_primary = True
        
        self.db.delete(provider_to_remove)
        self.db.commit()
        return True