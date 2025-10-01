"""
Scheduled survey delivery service using APScheduler.
Sends daily burnout check-in DMs to Slack users.
"""
import logging
from datetime import datetime, time
from typing import List, Dict
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
import pytz

from app.models.survey_schedule import SurveySchedule, UserSurveyPreference
from app.models.user_correlation import UserCorrelation
from app.models.slack_integration import SlackIntegration
from app.models.slack_workspace_mapping import SlackWorkspaceMapping
from app.models.user_burnout_report import UserBurnoutReport
from app.services.slack_dm_sender import SlackDMSender
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class SurveyScheduler:
    """
    Manages scheduled delivery of daily burnout surveys via Slack DM.
    """

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.dm_sender = SlackDMSender()

    def start(self):
        """Start the scheduler."""
        self.scheduler.start()
        logger.info("Survey scheduler started")

    def stop(self):
        """Stop the scheduler."""
        self.scheduler.shutdown()
        logger.info("Survey scheduler stopped")

    def schedule_organization_surveys(self, db: Session):
        """
        Schedule survey delivery for all active organizations.
        Called on app startup and when schedules are updated.
        """
        # Remove existing jobs
        self.scheduler.remove_all_jobs()

        # Get all enabled survey schedules
        schedules = db.query(SurveySchedule).filter(
            SurveySchedule.enabled == True
        ).all()

        for schedule in schedules:
            self._add_schedule_job(schedule, db)

        logger.info(f"Scheduled surveys for {len(schedules)} organizations")

    def _add_schedule_job(self, schedule: SurveySchedule, db: Session):
        """
        Add a cron job for a specific organization's survey schedule.
        """
        org_timezone = pytz.timezone(schedule.timezone)
        send_hour = schedule.send_time.hour
        send_minute = schedule.send_time.minute

        # Create cron trigger for initial survey
        if schedule.send_weekdays_only:
            trigger = CronTrigger(
                hour=send_hour,
                minute=send_minute,
                day_of_week='mon-fri',
                timezone=org_timezone
            )
        else:
            trigger = CronTrigger(
                hour=send_hour,
                minute=send_minute,
                timezone=org_timezone
            )

        # Add initial survey job
        job_id = f"survey_org_{schedule.organization_id}"
        self.scheduler.add_job(
            self._send_organization_surveys,
            trigger=trigger,
            args=[schedule.organization_id, db, False],  # False = not a reminder
            id=job_id,
            replace_existing=True
        )

        logger.info(
            f"Scheduled daily surveys for org {schedule.organization_id} "
            f"at {send_hour:02d}:{send_minute:02d} {schedule.timezone}"
        )

        # Add reminder job if enabled
        if schedule.send_reminder:
            if schedule.reminder_time:
                # Use specific reminder time
                reminder_hour = schedule.reminder_time.hour
                reminder_minute = schedule.reminder_time.minute
            else:
                # Calculate reminder time as X hours after initial send
                from datetime import datetime, timedelta
                initial_time = datetime.combine(datetime.today(), schedule.send_time)
                reminder_time = initial_time + timedelta(hours=schedule.reminder_hours_after)
                reminder_hour = reminder_time.hour
                reminder_minute = reminder_time.minute

            # Create reminder trigger
            if schedule.send_weekdays_only:
                reminder_trigger = CronTrigger(
                    hour=reminder_hour,
                    minute=reminder_minute,
                    day_of_week='mon-fri',
                    timezone=org_timezone
                )
            else:
                reminder_trigger = CronTrigger(
                    hour=reminder_hour,
                    minute=reminder_minute,
                    timezone=org_timezone
                )

            # Add reminder job
            reminder_job_id = f"reminder_org_{schedule.organization_id}"
            self.scheduler.add_job(
                self._send_organization_surveys,
                trigger=reminder_trigger,
                args=[schedule.organization_id, db, True],  # True = is a reminder
                id=reminder_job_id,
                replace_existing=True
            )

            logger.info(
                f"Scheduled reminders for org {schedule.organization_id} "
                f"at {reminder_hour:02d}:{reminder_minute:02d} {schedule.timezone}"
            )

    async def _send_organization_surveys(self, organization_id: int, db: Session, is_reminder: bool = False):
        """
        Send surveys to all opted-in users in an organization.

        Args:
            organization_id: ID of the organization
            db: Database session
            is_reminder: If True, only send to users who haven't completed survey today
        """
        try:
            message_type = "reminder" if is_reminder else "initial survey"
            logger.info(f"Starting {message_type} delivery for organization {organization_id}")

            # Get organization's Slack workspace
            workspace_mapping = db.query(SlackWorkspaceMapping).filter(
                SlackWorkspaceMapping.organization_id == organization_id,
                SlackWorkspaceMapping.status == 'active'
            ).first()

            if not workspace_mapping:
                logger.warning(f"No active Slack workspace for org {organization_id}")
                return

            # Get Slack token
            slack_integration = db.query(SlackIntegration).filter(
                SlackIntegration.workspace_id == workspace_mapping.workspace_id
            ).first()

            if not slack_integration:
                logger.warning(f"No Slack integration for workspace {workspace_mapping.workspace_id}")
                return

            # Get all users in organization who should receive surveys
            users = self._get_survey_recipients(organization_id, db, is_reminder)

            # Get survey schedule for custom message
            schedule = db.query(SurveySchedule).filter(
                SurveySchedule.organization_id == organization_id
            ).first()

            # Choose appropriate message template
            if is_reminder and schedule:
                message_template = schedule.reminder_message_template
            elif schedule:
                message_template = schedule.message_template
            else:
                message_template = None

            # Send DMs
            sent_count = 0
            failed_count = 0
            skipped_count = 0

            for user in users:
                try:
                    # If reminder, check if user already completed survey today
                    if is_reminder:
                        from datetime import datetime
                        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

                        already_completed = db.query(UserBurnoutReport).filter(
                            UserBurnoutReport.user_id == user['user_id'],
                            UserBurnoutReport.organization_id == organization_id,
                            UserBurnoutReport.submitted_at >= today_start
                        ).first()

                        if already_completed:
                            skipped_count += 1
                            logger.debug(f"Skipping reminder for user {user['user_id']} - already completed")
                            continue

                    await self.dm_sender.send_survey_dm(
                        slack_token=slack_integration.slack_token,
                        slack_user_id=user['slack_user_id'],
                        user_id=user['user_id'],
                        organization_id=organization_id,
                        message=message_template
                    )
                    sent_count += 1
                except Exception as e:
                    logger.error(f"Failed to send DM to user {user['user_id']}: {str(e)}")
                    failed_count += 1

            if is_reminder:
                logger.info(
                    f"Reminder delivery complete for org {organization_id}: "
                    f"{sent_count} sent, {skipped_count} already completed, {failed_count} failed"
                )
            else:
                logger.info(
                    f"Initial survey delivery complete for org {organization_id}: "
                    f"{sent_count} sent, {failed_count} failed"
                )

                # Create notification for admins (only for initial delivery, not reminders)
                if sent_count > 0:
                    try:
                        notification_service = NotificationService(db)
                        notification_service.create_survey_delivery_notification(
                            organization_id=organization_id,
                            triggered_by=None,  # Scheduled delivery
                            recipient_count=sent_count,
                            is_manual=False
                        )
                    except Exception as e:
                        logger.error(f"Failed to create delivery notification: {str(e)}")

        except Exception as e:
            logger.error(f"Error in daily survey delivery for org {organization_id}: {str(e)}")

    def _get_survey_recipients(self, organization_id: int, db: Session, is_reminder: bool = False) -> List[Dict]:
        """
        Get list of users who should receive surveys.
        Returns users with Slack correlation and survey opt-in.

        Args:
            organization_id: Organization ID
            db: Database session
            is_reminder: If True, also check reminder preferences
        """
        from app.models.user import User

        # Query users with preferences
        users = db.query(User, UserCorrelation, UserSurveyPreference).join(
            UserCorrelation, User.id == UserCorrelation.user_id
        ).outerjoin(
            UserSurveyPreference, User.id == UserSurveyPreference.user_id
        ).filter(
            User.organization_id == organization_id,
            UserCorrelation.slack_user_id.isnot(None)  # Must have Slack ID
        ).all()

        recipients = []
        for user, correlation, preference in users:
            # Check if user opted out (default is opted-in)
            if preference and not preference.receive_daily_surveys:
                continue
            if preference and not preference.receive_slack_dms:
                continue

            # For reminders, also check reminder opt-out
            if is_reminder and preference and not preference.receive_reminders:
                continue

            recipients.append({
                'user_id': user.id,
                'slack_user_id': correlation.slack_user_id,
                'email': user.email,
                'name': user.name or correlation.name
            })

        return recipients


# Global scheduler instance
survey_scheduler = SurveyScheduler()
