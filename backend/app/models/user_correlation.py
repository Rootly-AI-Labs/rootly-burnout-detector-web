"""
User correlation model for mapping users across different platforms.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base

class UserCorrelation(Base):
    __tablename__ = "user_correlations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    email = Column(String(255), nullable=False, index=True)  # The email that links platforms
    name = Column(String(255), nullable=True)  # User's display name from platform
    github_username = Column(String(100), nullable=True, index=True)
    slack_user_id = Column(String(20), nullable=True, index=True)
    rootly_email = Column(String(255), nullable=True)
    pagerduty_user_id = Column(String(50), nullable=True)
    integration_ids = Column(JSON, nullable=True)  # Array of integration IDs this user belongs to
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="user_correlations")
    
    def __repr__(self):
        return f"<UserCorrelation(id={self.id}, user_id={self.user_id}, email='{self.email}')>"
    
    @property
    def connected_platforms(self) -> list:
        """Get list of connected platforms for this correlation."""
        platforms = []
        if self.github_username:
            platforms.append("github")
        if self.slack_user_id:
            platforms.append("slack")
        if self.rootly_email:
            platforms.append("rootly")
        if self.pagerduty_user_id:
            platforms.append("pagerduty")
        return platforms
    
    @property
    def platform_count(self) -> int:
        """Get number of connected platforms."""
        return len(self.connected_platforms)
    
    def update_platform_mapping(self, platform: str, identifier: str):
        """Update the mapping for a specific platform."""
        if platform == "github":
            self.github_username = identifier
        elif platform == "slack":
            self.slack_user_id = identifier
        elif platform == "rootly":
            self.rootly_email = identifier
        elif platform == "pagerduty":
            self.pagerduty_user_id = identifier
        else:
            raise ValueError(f"Unknown platform: {platform}")
    
    def get_platform_identifier(self, platform: str) -> str:
        """Get the identifier for a specific platform."""
        if platform == "github":
            return self.github_username
        elif platform == "slack":
            return self.slack_user_id
        elif platform == "rootly":
            return self.rootly_email
        elif platform == "pagerduty":
            return self.pagerduty_user_id
        else:
            raise ValueError(f"Unknown platform: {platform}")
    
    def has_platform(self, platform: str) -> bool:
        """Check if this correlation has a specific platform connected."""
        return platform in self.connected_platforms