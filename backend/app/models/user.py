"""
User model for authentication and user management.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=True)  # NULL for OAuth users
    provider = Column(String(50), nullable=True)  # 'google', 'github', or NULL
    provider_id = Column(String(255), nullable=True)  # OAuth provider user ID
    is_verified = Column(Boolean, default=False)  # TRUE for OAuth users
    rootly_token = Column(Text, nullable=True)  # Encrypted Rootly API token
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    analyses = relationship("Analysis", back_populates="user")
    rootly_integrations = relationship("RootlyIntegration", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', provider='{self.provider}')>"