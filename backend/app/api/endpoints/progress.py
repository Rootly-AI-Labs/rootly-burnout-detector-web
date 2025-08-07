"""
Progress API endpoints for real-time operation tracking.
"""
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...models import get_db, User, AnalysisProgressLog
from ...auth.dependencies import get_current_active_user
from ...services.progress_logger import ProgressLogger

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/logs/{operation_type}")
async def get_progress_logs(
    operation_type: str,
    analysis_id: Optional[int] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get progress logs for a specific operation type.
    
    Args:
        operation_type: Type of operation (e.g., "github_mapping", "analysis")
        analysis_id: Optional analysis ID to filter logs
        limit: Maximum number of logs to return
    
    Returns:
        List of progress log entries
    """
    try:
        logs = ProgressLogger.get_logs(
            user_id=current_user.id,
            operation_type=operation_type,
            analysis_id=analysis_id,
            limit=limit,
            db=db
        )
        
        return {
            "operation_type": operation_type,
            "total_logs": len(logs),
            "logs": logs
        }
        
    except Exception as e:
        logger.error(f"Failed to get progress logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve progress logs: {str(e)}"
        )

@router.delete("/logs/{operation_type}")
async def clear_progress_logs(
    operation_type: str,
    analysis_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Clear progress logs for a specific operation.
    
    Args:
        operation_type: Type of operation to clear
        analysis_id: Optional analysis ID to filter deletion
    """
    try:
        # Delete logs
        query = db.query(AnalysisProgressLog).filter(
            AnalysisProgressLog.user_id == current_user.id,
            AnalysisProgressLog.operation_type == operation_type
        )
        
        if analysis_id:
            query = query.filter(AnalysisProgressLog.analysis_id == analysis_id)
        
        deleted_count = query.count()
        query.delete()
        db.commit()
        
        return {
            "operation_type": operation_type,
            "deleted_logs": deleted_count,
            "message": f"Cleared {deleted_count} progress logs for {operation_type}"
        }
        
    except Exception as e:
        logger.error(f"Failed to clear progress logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear progress logs: {str(e)}"
        )

@router.get("/logs/{operation_type}/latest")
async def get_latest_progress_log(
    operation_type: str,
    analysis_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get the most recent progress log for an operation.
    
    Args:
        operation_type: Type of operation
        analysis_id: Optional analysis ID to filter
    
    Returns:
        Latest progress log entry or null
    """
    try:
        query = db.query(AnalysisProgressLog).filter(
            AnalysisProgressLog.user_id == current_user.id,
            AnalysisProgressLog.operation_type == operation_type
        )
        
        if analysis_id:
            query = query.filter(AnalysisProgressLog.analysis_id == analysis_id)
        
        latest_log = query.order_by(AnalysisProgressLog.created_at.desc()).first()
        
        return {
            "operation_type": operation_type,
            "latest_log": latest_log.to_dict() if latest_log else None
        }
        
    except Exception as e:
        logger.error(f"Failed to get latest progress log: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve latest progress log: {str(e)}"
        )

@router.get("/logs/{operation_type}/status")
async def get_operation_status(
    operation_type: str,
    analysis_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get the overall status of an operation based on its progress logs.
    
    Args:
        operation_type: Type of operation
        analysis_id: Optional analysis ID to filter
    
    Returns:
        Operation status summary
    """
    try:
        query = db.query(AnalysisProgressLog).filter(
            AnalysisProgressLog.user_id == current_user.id,
            AnalysisProgressLog.operation_type == operation_type
        )
        
        if analysis_id:
            query = query.filter(AnalysisProgressLog.analysis_id == analysis_id)
        
        logs = query.order_by(AnalysisProgressLog.created_at.desc()).limit(50).all()
        
        if not logs:
            return {
                "operation_type": operation_type,
                "status": "not_started",
                "progress_percentage": 0,
                "message": "Operation has not started"
            }
        
        # Analyze logs to determine overall status
        latest_log = logs[0]
        
        # Count status types
        status_counts = {}
        for log in logs:
            status_counts[log.status] = status_counts.get(log.status, 0) + 1
        
        # Determine overall status
        if latest_log.status == "failed":
            overall_status = "failed"
            message = latest_log.message
        elif latest_log.status == "completed" and "complete" in latest_log.step_name:
            overall_status = "completed"
            message = latest_log.message
        elif any(log.status == "in_progress" for log in logs[:10]):  # Check recent logs
            overall_status = "in_progress"
            message = latest_log.message
        elif latest_log.status == "started":
            overall_status = "started"
            message = latest_log.message
        else:
            overall_status = "unknown"
            message = "Status unclear from logs"
        
        # Calculate progress if available
        progress_percentage = latest_log.progress_percentage
        
        return {
            "operation_type": operation_type,
            "status": overall_status,
            "progress_percentage": progress_percentage,
            "message": message,
            "total_logs": len(logs),
            "status_breakdown": status_counts,
            "latest_update": latest_log.created_at.isoformat() if latest_log.created_at else None
        }
        
    except Exception as e:
        logger.error(f"Failed to get operation status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve operation status: {str(e)}"
        )