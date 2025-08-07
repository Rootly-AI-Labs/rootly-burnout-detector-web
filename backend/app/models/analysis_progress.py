"""
Analysis Progress Log Model - Tracks detailed progress during analysis execution.
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class AnalysisProgressLog(Base):
    """
    Stores detailed progress logs for analysis operations.
    Used to show real-time feedback to users about what's happening during analysis.
    """
    __tablename__ = "analysis_progress_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=True)  # Nullable for pre-analysis operations
    operation_type = Column(String(100), nullable=False)  # e.g., "github_mapping", "incident_collection", "ai_analysis"
    step_name = Column(String(200), nullable=False)  # e.g., "organization_verification", "email_correlation"
    status = Column(String(50), nullable=False)  # "started", "in_progress", "completed", "failed", "skipped"
    message = Column(Text, nullable=False)  # Detailed message for the user
    details = Column(Text, nullable=True)  # Additional technical details
    item_current = Column(Integer, nullable=True)  # Current item being processed (e.g., email 3 of 10)
    item_total = Column(Integer, nullable=True)  # Total items to process
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    analysis = relationship("Analysis")
    
    @property
    def progress_percentage(self):
        """Calculate progress percentage if item counts are available."""
        if self.item_total and self.item_current:
            return min(100, (self.item_current / self.item_total) * 100)
        return None
    
    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "operation_type": self.operation_type,
            "step_name": self.step_name,
            "status": self.status,
            "message": self.message,
            "details": self.details,
            "progress_percentage": self.progress_percentage,
            "item_current": self.item_current,
            "item_total": self.item_total,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }