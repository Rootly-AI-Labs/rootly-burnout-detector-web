"""
Progress Logger Service - Tracks and logs detailed progress during operations.
"""
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from ..models import get_db, AnalysisProgressLog

logger = logging.getLogger(__name__)

class ProgressLogger:
    """
    Service to log detailed progress during GitHub mapping and analysis operations.
    Provides real-time feedback to users via database storage and API endpoints.
    """
    
    def __init__(self, user_id: int, operation_type: str, analysis_id: Optional[int] = None, db: Session = None):
        self.user_id = user_id
        self.operation_type = operation_type
        self.analysis_id = analysis_id
        self.db = db or next(get_db())
        self._should_close_db = db is None
        
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._should_close_db:
            self.db.close()
    
    def log_step(
        self, 
        step_name: str, 
        status: str, 
        message: str, 
        details: Optional[str] = None,
        item_current: Optional[int] = None,
        item_total: Optional[int] = None
    ) -> int:
        """
        Log a progress step.
        
        Args:
            step_name: Name of the operation step
            status: "started", "in_progress", "completed", "failed", "skipped"
            message: User-friendly message
            details: Technical details
            item_current: Current item number (for progress tracking)
            item_total: Total items to process
            
        Returns:
            Log entry ID
        """
        try:
            log_entry = AnalysisProgressLog(
                user_id=self.user_id,
                analysis_id=self.analysis_id,
                operation_type=self.operation_type,
                step_name=step_name,
                status=status,
                message=message,
                details=details,
                item_current=item_current,
                item_total=item_total
            )
            
            self.db.add(log_entry)
            self.db.commit()
            self.db.refresh(log_entry)
            
            # Also log to application logger
            progress_text = ""
            if item_current and item_total:
                progress_text = f" ({item_current}/{item_total})"
            
            logger.info(f"[{self.operation_type}] {step_name}: {message}{progress_text}")
            
            return log_entry.id
            
        except Exception as e:
            logger.error(f"Failed to log progress step: {e}")
            return -1
    
    def start_step(self, step_name: str, message: str, item_total: Optional[int] = None) -> int:
        """Log the start of an operation step."""
        return self.log_step(step_name, "started", message, item_total=item_total)
    
    def update_step(self, step_name: str, message: str, item_current: int, item_total: Optional[int] = None, details: Optional[str] = None) -> int:
        """Log progress within an operation step."""
        return self.log_step(step_name, "in_progress", message, details, item_current, item_total)
    
    def complete_step(self, step_name: str, message: str, details: Optional[str] = None) -> int:
        """Log the successful completion of an operation step."""
        return self.log_step(step_name, "completed", message, details)
    
    def fail_step(self, step_name: str, message: str, details: Optional[str] = None) -> int:
        """Log the failure of an operation step."""
        return self.log_step(step_name, "failed", message, details)
    
    def skip_step(self, step_name: str, message: str, details: Optional[str] = None) -> int:
        """Log that an operation step was skipped."""
        return self.log_step(step_name, "skipped", message, details)
    
    def clear_logs(self):
        """Clear all progress logs for this operation."""
        try:
            self.db.query(AnalysisProgressLog).filter(
                AnalysisProgressLog.user_id == self.user_id,
                AnalysisProgressLog.operation_type == self.operation_type,
                AnalysisProgressLog.analysis_id == self.analysis_id
            ).delete()
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to clear progress logs: {e}")
    
    @staticmethod
    def get_logs(user_id: int, operation_type: str, analysis_id: Optional[int] = None, limit: int = 100, db: Session = None) -> list:
        """
        Retrieve progress logs for a specific operation.
        
        Args:
            user_id: User ID
            operation_type: Type of operation
            analysis_id: Optional analysis ID filter
            limit: Maximum number of logs to return
            db: Database session
            
        Returns:
            List of log dictionaries
        """
        if not db:
            db = next(get_db())
            should_close = True
        else:
            should_close = False
            
        try:
            query = db.query(AnalysisProgressLog).filter(
                AnalysisProgressLog.user_id == user_id,
                AnalysisProgressLog.operation_type == operation_type
            )
            
            if analysis_id:
                query = query.filter(AnalysisProgressLog.analysis_id == analysis_id)
            
            logs = query.order_by(AnalysisProgressLog.created_at.desc()).limit(limit).all()
            
            return [log.to_dict() for log in logs]
            
        except Exception as e:
            logger.error(f"Failed to retrieve progress logs: {e}")
            return []
        finally:
            if should_close:
                db.close()


class GitHubMappingProgressLogger(ProgressLogger):
    """Specialized progress logger for GitHub mapping operations."""
    
    def __init__(self, user_id: int, analysis_id: Optional[int] = None, db: Session = None):
        super().__init__(user_id, "github_mapping", analysis_id, db)
    
    def start_auto_mapping(self, total_emails: int):
        """Log the start of auto-mapping process."""
        return self.start_step(
            "auto_mapping_init",
            f"Starting GitHub auto-mapping for {total_emails} team members",
            item_total=total_emails
        )
    
    def start_organization_discovery(self, organizations: list):
        """Log organization member discovery."""
        org_list = ", ".join(organizations)
        return self.start_step(
            "org_discovery", 
            f"Discovering members in organizations: {org_list}",
            details=f"Organizations: {organizations}"
        )
    
    def complete_organization_discovery(self, total_members: int, organizations: list):
        """Log completion of organization discovery."""
        org_list = ", ".join(organizations)
        return self.complete_step(
            "org_discovery",
            f"Found {total_members} members across organizations: {org_list}",
            details=f"Total GitHub users discovered: {total_members}"
        )
    
    def start_email_processing(self, email: str, current_index: int, total_emails: int):
        """Log the start of processing a specific email."""
        return self.update_step(
            "email_processing",
            f"Processing {email}",
            current_index,
            total_emails,
            f"Attempting to correlate {email} with GitHub account"
        )
    
    def log_mapping_strategy(self, email: str, strategy: str, result: Optional[str] = None):
        """Log which mapping strategy is being tried."""
        if result:
            message = f"✅ {strategy} successful: {email} → {result}"
            status = "completed"
        else:
            message = f"⚠️ {strategy} failed for {email}"
            status = "in_progress"
            
        return self.log_step(
            "mapping_strategy",
            status,
            message,
            details=f"Strategy: {strategy}, Email: {email}, Result: {result}"
        )
    
    def log_organization_verification(self, username: str, email: str, verified: bool, organizations: list):
        """Log organization membership verification."""
        if verified:
            message = f"✅ {username} verified as member of specified organizations"
            status = "completed"
        else:
            org_list = ", ".join(organizations)
            message = f"❌ {username} NOT a member of organizations: {org_list}"
            status = "failed"
            
        return self.log_step(
            "org_verification",
            status,
            message,
            details=f"Username: {username}, Email: {email}, Organizations checked: {organizations}"
        )
    
    def complete_email_mapping(self, email: str, github_username: Optional[str], method: str):
        """Log the completion of mapping for a specific email."""
        if github_username:
            message = f"✅ Successfully mapped {email} → {github_username}"
            status = "completed"
            details = f"Mapping method: {method}"
        else:
            message = f"❌ Could not map {email} to any GitHub account"
            status = "failed"
            details = "No valid GitHub account found within specified organizations"
            
        return self.log_step(
            "email_mapping",
            status,
            message,
            details
        )
    
    def complete_auto_mapping(self, successful_mappings: int, total_emails: int, failed_emails: list):
        """Log the completion of the auto-mapping process."""
        success_rate = (successful_mappings / total_emails * 100) if total_emails > 0 else 0
        
        message = f"Auto-mapping completed: {successful_mappings}/{total_emails} emails mapped ({success_rate:.1f}% success rate)"
        
        details = {
            "successful_mappings": successful_mappings,
            "total_emails": total_emails,
            "success_rate": success_rate,
            "failed_emails": failed_emails
        }
        
        return self.complete_step(
            "auto_mapping_complete",
            message,
            str(details)
        )