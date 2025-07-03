from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base


class RootlyIntegration(Base):
    __tablename__ = "rootly_integrations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)  # User-defined name or auto-generated
    organization_name = Column(String(255), nullable=True)  # From Rootly API
    token = Column(Text, nullable=False)  # Encrypted Rootly API token
    total_users = Column(Integer, nullable=True)  # From API metadata
    is_default = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="rootly_integrations")
    analyses = relationship("Analysis", back_populates="rootly_integration")
    
    def __repr__(self):
        return f"<RootlyIntegration(id={self.id}, name='{self.name}', organization='{self.organization_name}')>"