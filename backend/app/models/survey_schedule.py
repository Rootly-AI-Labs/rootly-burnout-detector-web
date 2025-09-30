"""
Survey schedule configuration for automated daily burnout check-ins.
"""
from sqlalchemy import Column, Integer, String, Boolean, Time, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class SurveySchedule(Base):
    """
    Organization-level configuration for automated survey delivery.
    """
    __tablename__ = "survey_schedules"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)

    # Schedule settings
    enabled = Column(Boolean, default=True)
    send_time = Column(Time, nullable=False)  # UTC time to send (e.g., 09:00)
    timezone = Column(String(50), default="America/New_York")  # Organization timezone

    # Frequency settings
    send_weekdays_only = Column(Boolean, default=True)  # Skip weekends

    # Reminder settings
    send_reminder = Column(Boolean, default=True)  # Send reminder if not completed
    reminder_time = Column(Time, nullable=True)  # Time to send reminder (e.g., 14:00)
    reminder_hours_after = Column(Integer, default=5)  # Hours after initial send (if reminder_time not set)

    # Message customization
    message_template = Column(String(500), default=(
        "Good morning! 🌅\n\n"
        "Quick 2-minute check-in: How are you feeling today?\n\n"
        "Your feedback helps us support team health and prevent burnout."
    ))

    reminder_message_template = Column(String(500), default=(
        "Quick reminder 🔔\n\n"
        "Haven't heard from you yet today. Take 2 minutes to check in?\n\n"
        "Your wellbeing matters to us."
    ))

    # Relationships
    organization = relationship("Organization", backref="survey_schedule")


class UserSurveyPreference(Base):
    """
    Individual user preferences for survey delivery.
    """
    __tablename__ = "user_survey_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    # Opt-in/out preferences
    receive_daily_surveys = Column(Boolean, default=True)
    receive_slack_dms = Column(Boolean, default=True)
    receive_reminders = Column(Boolean, default=True)  # Opt-out of reminders specifically

    # Custom delivery time (overrides org default if set)
    custom_send_time = Column(Time, nullable=True)
    custom_timezone = Column(String(50), nullable=True)

    # Relationships
    user = relationship("User", backref="survey_preference")
