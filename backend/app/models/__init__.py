"""
Database models for the Rootly Burnout Detector.
"""
from .base import Base, get_db, create_tables, SessionLocal
from .user import User
from .analysis import Analysis
from .rootly_integration import RootlyIntegration
from .oauth_provider import OAuthProvider, UserEmail
from .github_integration import GitHubIntegration
from .slack_integration import SlackIntegration
from .user_correlation import UserCorrelation

__all__ = [
    "Base", "get_db", "create_tables", "SessionLocal", "User", "Analysis", 
    "RootlyIntegration", "OAuthProvider", "UserEmail", "GitHubIntegration", 
    "SlackIntegration", "UserCorrelation"
]