"""
Slack data collector for web app burnout analysis.
"""

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict
# from sqlalchemy.orm import Session
# from ..models import SlackIntegration

logger = logging.getLogger(__name__)


class SlackCollector:
    """Collects Slack communication data for burnout analysis."""
    
    def __init__(self):
        self.cache_dir = Path('.slack_cache')
        self.cache_dir.mkdir(exist_ok=True)
        
        # Business hours configuration
        self.business_hours = {'start': 9, 'end': 17}
        
        # Manual name mappings (based on user names from Rootly)
        # These map from Rootly user full names to Slack user IDs
        # Names should match the format used in Slack messages: "**Name**"
        self.name_to_slack_mappings = {
            "Spencer Cheng": "U093A3G69GC",  # Real Slack user ID
            "Jasmeet Singh": "U002JASMEET",  # Needs real Slack user ID
            "Sylvain Kalache": "U003SYLVAIN",  # Needs real Slack user ID
            "Christo Mitov": "U004CHRISTO",  # Needs real Slack user ID
            # Add more mappings as needed based on actual Slack users
        }
        
        # Keep email mappings as fallback for backward compatibility
        self.email_to_slack_mappings = {
            "spencer.cheng@rootly.com": "U093A3G69GC",
            "jasmeet.singh@rootly.com": "U002JASMEET", 
            "sylvain@rootly.com": "U003SYLVAIN",
            "christo.mitov@rootly.com": "U004CHRISTO",
            "ibrahim@rootly.com": "U005IBRAHIM",
            "weihan@rootly.com": "U006WEIHAN",
            "alex.mingoia@rootly.com": "U007ALEX",
            "quentin@rootly.com": "U008QUENTIN",
            "gideon@rootly.com": "U009GIDEON",
            "dan@rootly.com": "U010DAN",
            "nicholas@rootly.com": "U0929P29NQ1",
            "kumbi@rootly.com": "U011KUMBI",
            "andre@rootly.com": "U012ANDRE",
            "jj@rootly.com": "U013JJ",
            "jp@rootly.com": "U014JP",
            "ryan@rootly.com": "U015RYAN",
            "john@rootly.com": "U016JOHN",
            "nicole@rootly.com": "U017NICOLE",
            "shadab@rootly.com": "U018SHADAB",
            "dinesh.panda@bigbinary.com": "U019DINESH"
        }
        
    def _extract_name_from_slack_message(self, message_text: str) -> Optional[str]:
        """
        Extract name from various Slack message formats:
        - **Name** | Team
        - Name here - message content
        - Name jumping in - message content
        - Just saw the alerts... Name here - message content
        
        Args:
            message_text: The Slack message text
            
        Returns:
            Extracted name or None if not found
        """
        import re
        
        # Pattern 1: **Name** | Team format
        pattern1 = r'\*\*([^*]+)\*\*'
        match = re.search(pattern1, message_text)
        if match:
            return match.group(1).strip()
        
        # Pattern 2: "Name here" format - look for "Name here" after various prefixes
        # Examples: "Jasmeet here", "Spencer here", "Sylvain here"
        pattern2 = r'(?:^|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+here\b'
        match = re.search(pattern2, message_text)
        if match:
            potential_name = match.group(1).strip()
            # Filter out common false positives
            if potential_name.lower() not in ['team', 'everyone', 'all', 'someone']:
                return potential_name
        
        # Pattern 3: "Name jumping in" format
        pattern3 = r'(?:^|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+jumping\s+in\b'
        match = re.search(pattern3, message_text)
        if match:
            potential_name = match.group(1).strip()
            if potential_name.lower() not in ['team', 'everyone', 'all', 'someone']:
                return potential_name
        
        # Pattern 4: Look for names in common introduction patterns
        # "Thanks for the PR. Jasmeet here", "Sorry team - Sylvain here"
        pattern4 = r'(?:^|[.!?]\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+here(?:\s*[-–—]|\s*\.|\s*,|\s*$)'
        match = re.search(pattern4, message_text)
        if match:
            potential_name = match.group(1).strip()
            if potential_name.lower() not in ['team', 'everyone', 'all', 'someone']:
                return potential_name
        
        return None
        
    def _correlate_slack_message_to_user(self, message_text: str) -> Optional[str]:
        """
        Correlate a Slack message to a user ID by extracting the name.
        
        Args:
            message_text: The Slack message text containing **Name** format
            
        Returns:
            Slack user ID or None if not found
        """
        name = self._extract_name_from_slack_message(message_text)
        if name:
            logger.info(f"Extracted name from message: {name}")
            return self.name_to_slack_mappings.get(name)
        return None
        
    async def _correlate_user_to_slack(self, user_identifier: str, token: str = None, is_name: bool = False) -> Optional[str]:
        """
        Correlate a user identifier (email or name) to a Slack user ID.
        
        Args:
            user_identifier: Email or name to correlate
            token: Slack API token
            is_name: True if user_identifier is a name, False if email
        """
        logger.info(f"Slack correlation attempt for {user_identifier} (is_name: {is_name}), token={'present' if token else 'missing'}")
        
        # First check manual mappings based on type
        if is_name:
            logger.info(f"Checking name mappings for {user_identifier}")
            slack_user_id = self.name_to_slack_mappings.get(user_identifier)
            if slack_user_id:
                logger.info(f"Found Slack correlation via name mapping: {user_identifier} -> {slack_user_id}")
                return slack_user_id
            else:
                logger.warning(f"No name mapping found for {user_identifier}")
        else:
            logger.info(f"Checking email mappings for {user_identifier}")
            slack_user_id = self.email_to_slack_mappings.get(user_identifier)
            if slack_user_id:
                logger.info(f"Found Slack correlation via email mapping: {user_identifier} -> {slack_user_id}")
                return slack_user_id
            else:
                logger.warning(f"No email mapping found for {user_identifier}")
            
        # If we have a token and it's an email, try API-based discovery
        if token and not is_name:
            try:
                logger.info(f"Attempting API-based discovery for {user_identifier}")
                slack_user_id = await self._discover_slack_user_by_email(user_identifier, token)
                if slack_user_id:
                    logger.info(f"Found Slack correlation via API: {user_identifier} -> {slack_user_id}")
                    return slack_user_id
            except Exception as e:
                logger.error(f"Error discovering Slack user for {user_identifier}: {e}")
        
        logger.warning(f"No Slack correlation found for {user_identifier}")
        return None

    async def _correlate_email_to_slack(self, email: str, token: str = None) -> Optional[str]:
        """Legacy method for backward compatibility."""
        return await self._correlate_user_to_slack(email, token, is_name=False)
        
    async def _discover_slack_user_by_email(self, email: str, token: str) -> Optional[str]:
        """
        Try to discover Slack user ID by email using the Slack API.
        """
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                # Use users.lookupByEmail API method
                lookup_url = "https://slack.com/api/users.lookupByEmail"
                params = {'email': email}
                
                async with session.get(lookup_url, headers=headers, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get('ok') and data.get('user'):
                            return data['user']['id']
                        else:
                            logger.debug(f"Slack API lookup failed for {email}: {data.get('error', 'unknown error')}")
                    else:
                        logger.warning(f"Slack API HTTP error for {email}: {resp.status}")
        
        except Exception as e:
            logger.error(f"Error looking up Slack user by email {email}: {e}")
        
        return None
        
    def _collect_mock_data_from_files(self, user_id: str, email: str, start_date: datetime, end_date: datetime) -> Dict:
        """
        Collect mock data from JSON files (like original burnout detector).
        
        This method reads from structured JSON files with user messages,
        similar to the original detector's approach.
        """
        # Try to find mock data files - could be from original detector or generated
        possible_mock_dirs = [
            "/Users/spencercheng/Workspace/Rootly/rootly-burnout-detector/test_slack_data",
            "./test_slack_data", 
            "./mock_slack_data"
        ]
        
        messages_file = None
        for mock_dir in possible_mock_dirs:
            test_file = Path(mock_dir) / "messages" / f"{user_id}_messages.json"
            if test_file.exists():
                messages_file = test_file
                break
        
        if not messages_file:
            logger.warning(f"No mock message file found for user {user_id}")
            return self._generate_mock_slack_data(user_id, email, start_date, end_date)
        
        try:
            with open(messages_file) as f:
                all_messages = json.load(f)
            
            # Filter messages within date range
            messages = []
            for msg in all_messages:
                msg_time = datetime.fromtimestamp(float(msg['ts']))
                if start_date <= msg_time <= end_date:
                    messages.append(msg)
            
            logger.info(f"Found {len(messages)} messages for {user_id} in mock data")
            
            # Process messages using the same logic as original detector
            return self._process_mock_messages(messages, user_id, email, start_date, end_date)
        
        except Exception as e:
            logger.error(f"Error reading mock data for {user_id}: {e}")
            return self._generate_mock_slack_data(user_id, email, start_date, end_date)
    
    def _process_mock_messages(self, messages: List[Dict], user_id: str, email: str, start_date: datetime, end_date: datetime) -> Dict:
        """Process mock messages using the same logic as original detector."""
        
        days_analyzed = (end_date - start_date).days
        total_messages = len(messages)
        after_hours_messages = 0
        weekend_messages = 0
        channels_active = set()
        dm_messages = 0
        thread_messages = 0
        message_lengths = []
        
        # Process each message
        for msg in messages:
            # Parse timestamp
            ts = datetime.fromtimestamp(float(msg['ts']))
            
            # Check timing
            if ts.hour < 9 or ts.hour >= 17:
                after_hours_messages += 1
            
            if ts.weekday() >= 5:  # Saturday=5, Sunday=6
                weekend_messages += 1
            
            # Channel activity
            channel = msg.get('channel', '')
            if channel:
                channels_active.add(channel)
            
            # Check if DM
            if msg.get('is_dm', False) or channel.startswith('D'):
                dm_messages += 1
            
            # Thread participation
            if msg.get('thread_ts') and msg['thread_ts'] != msg['ts']:
                thread_messages += 1
            
            # Message length
            text = msg.get('text', '')
            if text:
                message_lengths.append(len(text))
        
        # Calculate metrics
        messages_per_day = total_messages / days_analyzed if days_analyzed > 0 else 0
        after_hours_percentage = (after_hours_messages / total_messages) if total_messages > 0 else 0
        weekend_percentage = (weekend_messages / total_messages) if total_messages > 0 else 0
        dm_ratio = (dm_messages / total_messages) if total_messages > 0 else 0
        thread_participation_rate = (thread_messages / total_messages) if total_messages > 0 else 0
        avg_message_length = sum(message_lengths) / len(message_lengths) if message_lengths else 0
        
        # Generate burnout indicators
        burnout_indicators = {
            "excessive_messaging": messages_per_day > 50,
            "poor_sentiment": False,  # Would need sentiment analysis
            "late_responses": False,  # Would need response time analysis
            "after_hours_activity": after_hours_percentage > 0.25
        }
        
        return {
            'user_id': user_id,
            'email': email,
            'analysis_period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': days_analyzed
            },
            'metrics': {
                'total_messages': total_messages,
                'messages_per_day': round(messages_per_day, 1),
                'after_hours_percentage': round(after_hours_percentage, 3),
                'weekend_percentage': round(weekend_percentage, 3),
                'channel_diversity': len(channels_active),
                'dm_ratio': round(dm_ratio, 3),
                'thread_participation_rate': round(thread_participation_rate, 3),
                'avg_message_length': round(avg_message_length, 1),
                'peak_hour_concentration': 0.5,  # Would need more analysis
                'response_pattern_score': 6.0,  # Would need response analysis
                'avg_sentiment': 0.0,  # Would need sentiment analysis
                'negative_sentiment_ratio': 0.15,  # Would need sentiment analysis
                'positive_sentiment_ratio': 0.45,  # Would need sentiment analysis
                'stress_indicator_ratio': 0.1,  # Would need stress analysis
                'sentiment_volatility': 0.2  # Would need sentiment analysis
            },
            'burnout_indicators': burnout_indicators,
            'activity_data': {
                'messages_sent': total_messages,
                'channels_active': len(channels_active),
                'after_hours_messages': after_hours_messages,
                'weekend_messages': weekend_messages,
                'avg_response_time_minutes': 30,  # Would need response analysis
                'sentiment_score': 0.0,  # Would need sentiment analysis
                'burnout_indicators': burnout_indicators
            }
        }
    
    async def _fetch_real_slack_data(self, user_id: str, email: str, start_date: datetime, end_date: datetime, token: str, workspace_id: str) -> Dict:
        """Fetch real Slack data using the Slack API."""
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        base_url = "https://slack.com/api"
        
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                # Get user info
                user_info_url = f"{base_url}/users.info"
                user_params = {'user': user_id}
                
                async with session.get(user_info_url, headers=headers, params=user_params) as resp:
                    if resp.status == 200:
                        user_data = await resp.json()
                        if not user_data.get('ok'):
                            logger.warning(f"Slack API error for user info: {user_data.get('error')}")
                    else:
                        logger.warning(f"Slack API HTTP error for user info: {resp.status}")
                
                # Get channels the user is in
                channels_url = f"{base_url}/users.conversations"
                channels_params = {'user': user_id, 'types': 'public_channel,private_channel,mpim,im', 'limit': 1000}
                
                total_channels = 0
                channels_data = {}
                async with session.get(channels_url, headers=headers, params=channels_params) as resp:
                    if resp.status == 200:
                        channels_data = await resp.json()
                        if channels_data.get('ok'):
                            total_channels = len(channels_data.get('channels', []))
                        else:
                            logger.warning(f"Slack API error for channels: {channels_data.get('error')}")
                    else:
                        logger.warning(f"Slack API HTTP error for channels: {resp.status}")
                
                # Get actual message counts from channels
                days_analyzed = (end_date - start_date).days
                total_messages = 0
                after_hours_messages = 0
                weekend_messages = 0
                response_times = []
                
                # Get user's channels and count real messages
                if channels_data.get('ok'):
                    channels = channels_data.get('channels', [])
                    
                    # Convert dates to timestamps for Slack API
                    start_ts = start_date.timestamp()
                    end_ts = end_date.timestamp()
                    
                    for channel in channels[:10]:  # Limit to first 10 channels to avoid rate limits
                        channel_id = channel.get('id')
                        if not channel_id:
                            continue
                            
                        try:
                            # Get message history for this channel
                            history_url = f"{base_url}/conversations.history"
                            history_params = {
                                'channel': channel_id,
                                'oldest': start_ts,
                                'latest': end_ts,
                                'limit': 1000  # Max messages per channel
                            }
                            
                            async with session.get(history_url, headers=headers, params=history_params) as hist_resp:
                                if hist_resp.status == 200:
                                    history_data = await hist_resp.json()
                                    if history_data.get('ok'):
                                        messages = history_data.get('messages', [])
                                        
                                        # Count messages from this user
                                        user_messages = [msg for msg in messages if msg.get('user') == user_id]
                                        total_messages += len(user_messages)
                                        
                                        # Analyze timing for after-hours and weekend activity
                                        for msg in user_messages:
                                            msg_ts = float(msg.get('ts', 0))
                                            msg_dt = datetime.fromtimestamp(msg_ts)
                                            
                                            # Check if after hours (before 9 AM or after 5 PM)
                                            if msg_dt.hour < 9 or msg_dt.hour >= 17:
                                                after_hours_messages += 1
                                            
                                            # Check if weekend (Saturday=5, Sunday=6)
                                            if msg_dt.weekday() >= 5:
                                                weekend_messages += 1
                                                
                        except Exception as e:
                            logger.debug(f"Error getting history for channel {channel_id}: {e}")
                            continue
                
                # Calculate percentages
                after_hours_percentage = (after_hours_messages / total_messages) if total_messages > 0 else 0
                weekend_percentage = (weekend_messages / total_messages) if total_messages > 0 else 0
                
                # Calculate real metrics
                avg_response_time = sum(response_times) / len(response_times) if response_times else 0
                sentiment_score = 0.0  # Default neutral since we don't have sentiment analysis yet
                
                # Calculate activity metrics
                messages_per_day = total_messages / days_analyzed if days_analyzed > 0 else 0
                active_channels = total_channels  # Use total channels the user is in
                
                # Generate burnout indicators
                burnout_indicators = {
                    "excessive_messaging": messages_per_day > 50,
                    "poor_sentiment": sentiment_score < -0.1,
                    "late_responses": avg_response_time > 60,
                    "after_hours_activity": after_hours_percentage > 0.25
                }
                
                return {
                    'user_id': user_id,
                    'email': email,
                    'analysis_period': {
                        'start': start_date.isoformat(),
                        'end': end_date.isoformat(),
                        'days': days_analyzed
                    },
                    'metrics': {
                        'total_messages': total_messages,
                        'messages_per_day': round(messages_per_day, 1),
                        'after_hours_percentage': round(after_hours_percentage, 3),
                        'weekend_percentage': round(weekend_percentage, 3),
                        'channel_diversity': active_channels,
                        'dm_ratio': 0.2,  # Would need actual DM analysis
                        'thread_participation_rate': 0.4,  # Would need actual thread analysis
                        'avg_message_length': 50,  # Would need actual message content analysis
                        'peak_hour_concentration': 0.5,  # Would need actual time analysis
                        'response_pattern_score': 6.0,  # Would need actual response time analysis
                        'avg_sentiment': round(sentiment_score, 3),
                        'negative_sentiment_ratio': 0.15,  # Would need actual analysis
                        'positive_sentiment_ratio': 0.45,  # Would need actual analysis
                        'stress_indicator_ratio': 0.1,  # Would need actual analysis
                        'sentiment_volatility': 0.2  # Would need actual analysis
                    },
                    'burnout_indicators': burnout_indicators,
                    'activity_data': {
                        'messages_sent': total_messages,
                        'channels_active': active_channels,
                        'after_hours_messages': after_hours_messages,
                        'weekend_messages': weekend_messages,
                        'avg_response_time_minutes': round(avg_response_time, 1),
                        'sentiment_score': round(sentiment_score, 3),
                        'burnout_indicators': burnout_indicators
                    }
                }
                
        except Exception as e:
            logger.error(f"Error fetching real Slack data for {user_id}: {e}")
            # Fall back to mock data
            return self._generate_mock_slack_data(user_id, email, start_date, end_date)
        
    async def collect_slack_data_for_user(self, user_identifier: str, days: int = 30, slack_token: str = None, mock_mode: bool = False, is_name: bool = False) -> Optional[Dict]:
        """
        Collect Slack activity data for a single user using email or name correlation.
        
        Args:
            user_identifier: User's email or name to correlate with Slack
            days: Number of days to analyze
            slack_token: Slack API token for authentication
            mock_mode: Whether to use mock data (like original detector)
            is_name: True if user_identifier is a name, False if email
            
        Returns:
            Slack activity data or None if no correlation found
        """
        # Use correlation to find Slack user ID
        slack_user_id = await self._correlate_user_to_slack(user_identifier, slack_token, is_name)
        
        if not slack_user_id:
            logger.warning(f"No Slack user ID found for {'name' if is_name else 'email'} {user_identifier}")
            return None
            
        logger.info(f"Collecting Slack data for {slack_user_id} ({user_identifier})")
        
        # Set up date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Use mock data if explicitly requested (like original detector)
        if mock_mode:
            logger.info(f"Using mock mode for {slack_user_id}")
            return self._collect_mock_data_from_files(slack_user_id, user_identifier, start_date, end_date)
        
        # Use real Slack API if token provided
        if slack_token:
            logger.info(f"Using real Slack API for {slack_user_id} with token: {slack_token[:10]}...")
            return await self._fetch_real_slack_data(slack_user_id, user_identifier, start_date, end_date, slack_token, "T0001ROOTLY")
        else:
            # Fall back to generated mock data for testing
            logger.warning(f"No Slack token, using generated mock data for {slack_user_id}")
            return self._generate_mock_slack_data(slack_user_id, user_identifier, start_date, end_date)
    
    def _generate_mock_slack_data(self, slack_user_id: str, email: str, start_date: datetime, end_date: datetime) -> Dict:
        """Generate realistic mock Slack data for testing."""
        
        import random
        
        days_analyzed = (end_date - start_date).days
        
        # Base activity levels (some users more active than others)
        activity_multiplier = random.choice([0.5, 0.8, 1.0, 1.2, 1.5])
        
        # Generate message activity
        total_messages = int(random.randint(100, 800) * activity_multiplier)
        after_hours_messages = int(total_messages * random.uniform(0.1, 0.3))
        weekend_messages = int(total_messages * random.uniform(0.05, 0.2))
        
        # Calculate daily averages
        messages_per_day = total_messages / days_analyzed if days_analyzed > 0 else 0
        
        # Calculate percentages
        after_hours_percentage = (after_hours_messages / total_messages) if total_messages > 0 else 0
        weekend_percentage = (weekend_messages / total_messages) if total_messages > 0 else 0
        
        # Generate other metrics
        channels_active = random.randint(3, 15)
        avg_response_time = random.randint(15, 120)  # minutes
        sentiment_score = random.uniform(-0.2, 0.3)  # Slightly positive on average
        
        # Generate burnout indicators
        burnout_indicators = {
            "excessive_messaging": messages_per_day > 50,
            "poor_sentiment": sentiment_score < -0.1,
            "late_responses": avg_response_time > 60,
            "after_hours_activity": after_hours_percentage > 0.25
        }
        
        return {
            'user_id': slack_user_id,
            'email': email,
            'analysis_period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': days_analyzed
            },
            'metrics': {
                'total_messages': total_messages,
                'messages_per_day': round(messages_per_day, 1),
                'after_hours_percentage': round(after_hours_percentage, 3),
                'weekend_percentage': round(weekend_percentage, 3),
                'channel_diversity': channels_active,
                'dm_ratio': random.uniform(0.1, 0.3),
                'thread_participation_rate': random.uniform(0.2, 0.6),
                'avg_message_length': random.randint(20, 80),
                'peak_hour_concentration': random.uniform(0.3, 0.7),
                'response_pattern_score': random.uniform(3.0, 8.0),
                'avg_sentiment': round(sentiment_score, 3),
                'negative_sentiment_ratio': random.uniform(0.1, 0.3),
                'positive_sentiment_ratio': random.uniform(0.3, 0.6),
                'stress_indicator_ratio': random.uniform(0.05, 0.2),
                'sentiment_volatility': random.uniform(0.1, 0.4)
            },
            'burnout_indicators': burnout_indicators,
            'activity_data': {
                'messages_sent': total_messages,
                'channels_active': channels_active,
                'after_hours_messages': after_hours_messages,
                'weekend_messages': weekend_messages,
                'avg_response_time_minutes': avg_response_time,
                'sentiment_score': round(sentiment_score, 3),
                'burnout_indicators': burnout_indicators
            }
        }
    
    def _is_business_hours(self, dt: datetime) -> bool:
        """Check if datetime is within business hours."""
        return (
            dt.weekday() < 5 and  # Monday = 0, Friday = 4
            self.business_hours['start'] <= dt.hour < self.business_hours['end']
        )


async def collect_team_slack_data(team_identifiers: List[str], days: int = 30, slack_token: str = None, mock_mode: bool = False, use_names: bool = False) -> Dict[str, Dict]:
    """
    Collect Slack data for all team members.
    
    Args:
        team_identifiers: List of team member emails or names
        days: Number of days to analyze
        slack_token: Slack API token for real data collection
        mock_mode: Whether to use mock data from files (like original detector)
        use_names: True if team_identifiers contains names, False if emails
        
    Returns:
        Dict mapping identifier -> slack_activity_data
    """
    collector = SlackCollector()
    slack_data = {}
    
    for identifier in team_identifiers:
        try:
            user_data = await collector.collect_slack_data_for_user(identifier, days, slack_token, mock_mode, use_names)
            if user_data:
                slack_data[identifier] = user_data
        except Exception as e:
            logger.error(f"Failed to collect Slack data for {identifier}: {e}")
    
    logger.info(f"Collected Slack data for {len(slack_data)} users out of {len(team_identifiers)}")
    return slack_data


async def process_slack_messages_with_name_correlation(messages: List[str], days: int = 30) -> Dict[str, Dict]:
    """
    Process Slack messages that contain names in various formats and correlate them to users.
    
    Args:
        messages: List of Slack message strings with various name formats
        days: Number of days to analyze (for metrics calculation)
        
    Returns:
        Dict mapping user names to their Slack activity data
    """
    collector = SlackCollector()
    user_data = {}
    
    # Group messages by user
    messages_by_user = {}
    
    for message in messages:
        name = collector._extract_name_from_slack_message(message)
        if name:
            if name not in messages_by_user:
                messages_by_user[name] = []
            messages_by_user[name].append(message)
    
    # Process each user's messages
    for user_name, user_messages in messages_by_user.items():
        slack_user_id = collector.name_to_slack_mappings.get(user_name)
        
        if not slack_user_id:
            logger.warning(f"No Slack user ID mapping found for {user_name}")
            continue
            
        # Analyze the messages for burnout indicators
        total_messages = len(user_messages)
        after_hours_messages = 0
        weekend_messages = 0
        stress_indicators = 0
        urgent_indicators = 0
        
        for message in user_messages:
            # Enhanced stress indicator detection
            stress_keywords = ['swamped', 'overwhelmed', 'burned out', 'exhausted', 'stressed', 'fires', 'emergency', 'again', 'drowning', 'firefighting', 'haven\'t had time']
            if any(keyword in message.lower() for keyword in stress_keywords):
                stress_indicators += 1
            
            # Detect urgency indicators
            urgent_keywords = ['alerts', 'incident', 'down', 'emergency', 'urgent', 'hotfix', 'critical']
            if any(keyword in message.lower() for keyword in urgent_keywords):
                urgent_indicators += 1
            
            # Time-based analysis (look for time stamps in messages)
            import re
            time_pattern = r'(\d{1,2}:\d{2}\s*(?:AM|PM))'
            time_match = re.search(time_pattern, message)
            if time_match:
                time_str = time_match.group(1)
                try:
                    from datetime import datetime
                    # Parse time (simplified - assumes today's date)
                    time_obj = datetime.strptime(time_str, '%I:%M %p')
                    hour = time_obj.hour
                    
                    # Check if after hours (before 9 AM or after 5 PM)
                    if hour < 9 or hour >= 17:
                        after_hours_messages += 1
                        
                    # Check if late evening (after 6 PM)
                    if hour >= 18:
                        stress_indicators += 1  # Late messages are stress indicators
                        
                except:
                    pass  # Skip if time parsing fails
        
        # Calculate metrics
        messages_per_day = total_messages / days if days > 0 else 0
        stress_indicator_ratio = stress_indicators / total_messages if total_messages > 0 else 0
        after_hours_percentage = after_hours_messages / total_messages if total_messages > 0 else 0
        urgent_ratio = urgent_indicators / total_messages if total_messages > 0 else 0
        
        # Generate burnout indicators
        burnout_indicators = {
            "excessive_messaging": messages_per_day > 10,  # Adjusted threshold
            "poor_sentiment": stress_indicator_ratio > 0.2,
            "late_responses": False,  # Would need response time analysis
            "after_hours_activity": after_hours_percentage > 0.3
        }
        
        user_data[user_name] = {
            'user_id': slack_user_id,
            'name': user_name,
            'analysis_period': {
                'days': days
            },
            'metrics': {
                'total_messages': total_messages,
                'messages_per_day': round(messages_per_day, 1),
                'stress_indicator_ratio': round(stress_indicator_ratio, 3),
                'after_hours_percentage': round(after_hours_percentage, 3),
                'urgent_ratio': round(urgent_ratio, 3),
                'weekend_percentage': 0.0,  # Would need date analysis
            },
            'burnout_indicators': burnout_indicators,
            'activity_data': {
                'messages_sent': total_messages,
                'stress_indicators': stress_indicators,
                'urgent_indicators': urgent_indicators,
                'after_hours_messages': after_hours_messages,
                'burnout_indicators': burnout_indicators
            }
        }
    
    logger.info(f"Processed messages for {len(user_data)} users")
    return user_data


def parse_structured_slack_messages(message_block: str) -> List[Dict[str, str]]:
    """
    Parse structured Slack messages from the communication format.
    
    Args:
        message_block: Raw message block with timestamps, names, and content
        
    Returns:
        List of parsed message dictionaries
    """
    import re
    
    messages = []
    
    # Split by the separator lines (---)
    message_parts = message_block.split('---')
    
    for part in message_parts:
        lines = part.strip().split('\n')
        if len(lines) < 3:
            continue
            
        # Extract components
        name_line = None
        time_line = None
        content_lines = []
        
        for line in lines:
            line = line.strip()
            if '**' in line and '|' in line:
                name_line = line
            elif ':alarm_clock:' in line and ('AM' in line or 'PM' in line):
                time_line = line
            elif line and not line.startswith('Rootly') and line != '---':
                content_lines.append(line)
        
        if name_line and time_line:
            # Extract name from **Name** | Team format
            name_match = re.search(r'\*\*([^*]+)\*\*', name_line)
            name = name_match.group(1).strip() if name_match else None
            
            # Extract time
            time_match = re.search(r'(\d{1,2}:\d{2}\s*(?:AM|PM))', time_line)
            timestamp = time_match.group(1) if time_match else None
            
            # Combine content
            content = ' '.join(content_lines).strip()
            
            if name and content:
                messages.append({
                    'name': name,
                    'timestamp': timestamp,
                    'content': content,
                    'full_text': f"**{name}** | Engineering Team\n{time_line}\n{content}"
                })
    
    return messages