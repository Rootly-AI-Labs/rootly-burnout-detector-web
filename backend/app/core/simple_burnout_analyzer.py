"""
Simplified burnout analysis engine for web API integration.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class SimpleBurnoutAnalyzer:
    """Simplified burnout analyzer focused on incident data."""
    
    def __init__(self, api_token: str):
        self.api_token = api_token
        # Initialize the client attribute to fix missing client error
        self.client = None
        # Default thresholds for risk assessment
        self.thresholds = {
            "incidents_per_week_high": 8,
            "incidents_per_week_medium": 4,
            "after_hours_percentage_high": 0.3,
            "after_hours_percentage_medium": 0.15,
            "avg_resolution_hours_high": 6,
            "avg_resolution_hours_medium": 3,
        }
    
    async def analyze_burnout(
        self, 
        time_range_days: int = 30,
        include_weekends: bool = True,
        include_github: bool = False,
        include_slack: bool = False,
        github_token: str = None,
        slack_token: str = None
    ) -> Dict[str, Any]:
        """
        Analyze burnout for the team based on incident data.
        This is the simplified version without AI enhancement.
        """
        logger.info(f"Starting simplified burnout analysis for {time_range_days} days")
        
        try:
            # Import client with error handling
            try:
                from ..core.rootly_client import RootlyAPIClient
            except ImportError as e:
                logger.error(f"Failed to import RootlyAPIClient: {e}")
                return {
                    "error": "RootlyAPIClient import failed",
                    "analysis_timestamp": datetime.now().isoformat(),
                    "team_summary": {"total_users": 0, "average_score": 0.0, "users_at_risk": 0},
                    "team_analysis": [],
                    "recommendations": ["System error - please contact support"],
                    "ai_enhanced": False
                }
            
            # Initialize Rootly API client and store it for error handling
            try:
                if not self.api_token:
                    raise ValueError("No API token provided")
                    
                self.client = RootlyAPIClient(self.api_token)
                logger.info("Successfully initialized RootlyAPIClient")
            except Exception as e:
                logger.error(f"Failed to initialize RootlyAPIClient: {e}")
                return {
                    "error": f"Client initialization failed: {e}",
                    "analysis_timestamp": datetime.now().isoformat(),
                    "team_summary": {"total_users": 0, "average_score": 0.0, "users_at_risk": 0},
                    "team_analysis": [],
                    "recommendations": ["API client initialization failed - check token validity"],
                    "ai_enhanced": False
                }
            
            # Collect data from Rootly with comprehensive error handling
            rootly_data = None
            try:
                logger.info(f"Collecting data for {time_range_days} days")
                rootly_data = await self.client.collect_analysis_data(time_range_days)
                logger.info(f"Successfully collected Rootly data: {type(rootly_data)}")
            except Exception as e:
                logger.error(f"Failed to collect Rootly data: {e}")
                return {
                    "error": f"Data collection failed: {e}",
                    "analysis_timestamp": datetime.now().isoformat(),
                    "team_summary": {"total_users": 0, "average_score": 0.0, "users_at_risk": 0},
                    "team_analysis": [],
                    "recommendations": ["Data collection failed - check API permissions"],
                    "ai_enhanced": False
                }
            
            # Validate collected data
            if not rootly_data or not isinstance(rootly_data, dict):
                logger.error(f"Invalid rootly_data: {type(rootly_data)}")
                return {
                    "error": "Invalid data received from API",
                    "analysis_timestamp": datetime.now().isoformat(),
                    "team_summary": {"total_users": 0, "average_score": 0.0, "users_at_risk": 0},
                    "team_analysis": [],
                    "recommendations": ["Invalid data received - please try again"],
                    "ai_enhanced": False
                }
            
            # Extract data with safe defaults
            users = rootly_data.get("users") if rootly_data else []
            incidents = rootly_data.get("incidents") if rootly_data else []
            metadata = rootly_data.get("collection_metadata") if rootly_data else {}
            
            logger.info(f"Extracted data - users: {len(users) if isinstance(users, list) else 'invalid'}, incidents: {len(incidents) if isinstance(incidents, list) else 'invalid'}")
            
            # Process the data using the existing team analysis method
            try:
                result = self.analyze_team_burnout(
                    users=users,
                    incidents=incidents,
                    metadata=metadata
                )
                logger.info("Successfully completed team burnout analysis")
                return result
            except Exception as e:
                logger.error(f"Team analysis failed: {e}")
                return {
                    "error": f"Analysis processing failed: {e}",
                    "analysis_timestamp": datetime.now().isoformat(),
                    "team_summary": {"total_users": 0, "average_score": 0.0, "users_at_risk": 0},
                    "team_analysis": [],
                    "recommendations": ["Analysis processing failed - please try again"],
                    "ai_enhanced": False,
                    "partial_data": {
                        "users_count": len(users) if isinstance(users, list) else 0,
                        "incidents_count": len(incidents) if isinstance(incidents, list) else 0
                    }
                }
                
        except Exception as e:
            logger.error(f"Critical error in analyze_burnout: {e}")
            return {
                "error": f"Critical analysis error: {e}",
                "analysis_timestamp": datetime.now().isoformat(),
                "team_summary": {"total_users": 0, "average_score": 0.0, "users_at_risk": 0},
                "team_analysis": [],
                "recommendations": ["Critical system error - please contact support"],
                "ai_enhanced": False
            }
    
    def analyze_team_burnout(
        self, 
        users: List[Dict[str, Any]], 
        incidents: List[Dict[str, Any]],
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze burnout risk for entire team."""
        # Handle None inputs safely with comprehensive logging
        try:
            users = users if users and isinstance(users, list) else []
            incidents = incidents if incidents and isinstance(incidents, list) else []
            metadata = metadata if metadata and isinstance(metadata, dict) else {}
            
            logger.info(f"Starting team burnout analysis for {len(users)} users and {len(incidents)} incidents")
            
            # Process incidents to extract user involvement with error handling
            user_incident_mapping = {}
            try:
                user_incident_mapping = self._map_users_to_incidents(users, incidents)
                logger.info(f"Successfully created user-incident mapping for {len(user_incident_mapping)} users")
            except Exception as e:
                logger.error(f"Error creating user-incident mapping: {e}")
                user_incident_mapping = {}
            
            # Analyze each user with comprehensive error handling
            team_analysis = []
            for i, user in enumerate(users):
                try:
                    if not user or not isinstance(user, dict):
                        logger.warning(f"Skipping invalid user data at index {i} (not a dict)")
                        continue
                        
                    user_id = user.get("id") if user else None
                    if not user_id:
                        logger.warning(f"Skipping user at index {i} - no ID found")
                        continue
                    
                    try:
                        # Safely filter user incidents with comprehensive null checks
                        user_incidents = []
                        user_incident_ids = user_incident_mapping.get(str(user_id), [])
                        
                        if user_incident_ids and isinstance(user_incident_ids, list):
                            for inc in incidents:
                                try:
                                    if (inc and isinstance(inc, dict) and 
                                        inc.get("id") and str(inc.get("id")) in user_incident_ids):
                                        user_incidents.append(inc)
                                except Exception as inc_error:
                                    logger.debug(f"Error filtering incident for user {user_id}: {inc_error}")
                                    continue
                        
                        logger.debug(f"User {user_id} has {len(user_incidents)} incidents")
                        
                        user_analysis = self._analyze_user_burnout(user, user_incidents, metadata)
                        if user_analysis and isinstance(user_analysis, dict):
                            team_analysis.append(user_analysis)
                            logger.debug(f"Successfully analyzed user {user_id}")
                        else:
                            logger.warning(f"User analysis returned None or invalid data for user {user_id}")
                            
                    except Exception as user_error:
                        logger.warning(f"Error analyzing user {user_id}: {user_error}")
                        continue
                        
                except Exception as e:
                    logger.warning(f"Error processing user at index {i}: {e}")
                    continue
            
            logger.info(f"Successfully analyzed {len(team_analysis)} out of {len(users)} users")
            
            # Calculate team summary with error handling
            team_summary = {}
            try:
                team_summary = self._calculate_team_summary(team_analysis)
            except Exception as e:
                logger.error(f"Error calculating team summary: {e}")
                team_summary = {
                    "total_users": len(team_analysis),
                    "average_score": 0.0,
                    "highest_score": 0.0,
                    "risk_distribution": {"high": 0, "medium": 0, "low": len(team_analysis)},
                    "users_at_risk": 0
                }
        except Exception as e:
            logger.error(f"Critical error in analyze_team_burnout: {e}")
            # Return safe fallback data
            return {
                "analysis_timestamp": datetime.now().isoformat(),
                "metadata": {},
                "team_summary": {
                    "total_users": 0,
                    "average_score": 0.0,
                    "highest_score": 0.0,
                    "risk_distribution": {"high": 0, "medium": 0, "low": 0},
                    "users_at_risk": 0
                },
                "team_analysis": [],
                "recommendations": ["Analysis failed - please retry with valid data"],
                "ai_enhanced": False,
                "error": f"Critical analysis error: {e}"
            }
        
        # Generate recommendations with error handling
        recommendations = []
        try:
            recommendations = self._generate_team_recommendations(team_summary, team_analysis)
        except Exception as e:
            logger.error(f"Error generating team recommendations: {e}")
            recommendations = ["Analysis completed - please review individual user data"]
        
        # Return comprehensive results with error handling
        try:
            return {
                "analysis_timestamp": datetime.now().isoformat(),
                "metadata": metadata,
                "team_summary": team_summary,
                "team_analysis": team_analysis,
                "recommendations": recommendations,
                "ai_enhanced": False
            }
        except Exception as e:
            logger.error(f"Error constructing final analysis result: {e}")
            return {
                "analysis_timestamp": datetime.now().isoformat(),
                "metadata": {},
                "team_summary": {
                    "total_users": 0,
                    "average_score": 0.0,
                    "highest_score": 0.0,
                    "risk_distribution": {"high": 0, "medium": 0, "low": 0},
                    "users_at_risk": 0
                },
                "team_analysis": [],
                "recommendations": ["Analysis construction failed - please retry"],
                "ai_enhanced": False,
                "error": f"Result construction error: {e}"
            }
    
    def _analyze_user_burnout(
        self, 
        user: Dict[str, Any], 
        user_incidents: List[Dict[str, Any]],
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze burnout risk for a single user."""
        # Comprehensive null safety for user data
        if not user or not isinstance(user, dict):
            logger.warning("_analyze_user_burnout: user is None or not a dict")
            return None
            
        try:
            user_attrs = user.get("attributes") if user else {}
            if not user_attrs or not isinstance(user_attrs, dict):
                user_attrs = {}
                
            user_id = user.get("id") if user else None
            
            # Safe extraction of user name with fallbacks
            user_name = "Unknown"
            if user_attrs and isinstance(user_attrs, dict):
                user_name = user_attrs.get("full_name") or user_attrs.get("name") or "Unknown"
                
            # Safe extraction of user email
            user_email = None
            if user_attrs and isinstance(user_attrs, dict):
                user_email = user_attrs.get("email")
        except Exception as e:
            logger.warning(f"Error extracting user basic info: {e}")
            user_attrs = {}
            user_id = None
            user_name = "Unknown"
            user_email = None
        
        # Handle None or empty incidents safely
        if not user_incidents or not isinstance(user_incidents, list):
            return {
                "user_id": user_id,
                "user_name": user_name,
                "user_email": user_email,
                "burnout_score": 0.0,
                "risk_level": "low",
                "incident_count": 0,
                "key_metrics": {
                    "incidents_per_week": 0,
                    "after_hours_percentage": 0,
                    "avg_resolution_hours": 0
                },
                "recommendations": ["No recent incident involvement - maintaining good work-life balance"]
            }
        
        # Calculate key metrics with null safety
        try:
            metadata = metadata or {}
            days_analyzed = metadata.get("days_analyzed", 30) if isinstance(metadata, dict) else 30
            incidents_count = len(user_incidents) if user_incidents else 0
            incidents_per_week = (incidents_count / days_analyzed) * 7 if days_analyzed > 0 else 0
            
            # Calculate after-hours percentage with comprehensive error handling
            after_hours_count = 0
            try:
                after_hours_count = self._count_after_hours_incidents(user_incidents)
            except Exception as e:
                logger.warning(f"Error counting after-hours incidents for user {user_id}: {e}")
                after_hours_count = 0
                
            after_hours_percentage = after_hours_count / incidents_count if incidents_count > 0 else 0
            
            # Calculate average resolution time with error handling
            resolution_times = []
            for incident in user_incidents:
                try:
                    if incident and isinstance(incident, dict):
                        duration = self._extract_incident_duration(incident)
                        if duration and isinstance(duration, (int, float)):
                            resolution_times.append(duration)
                except Exception as e:
                    logger.debug(f"Error extracting duration for incident in user {user_id} analysis: {e}")
                    continue
            
            avg_resolution_hours = (
                sum(resolution_times) / len(resolution_times) / 60 
                if resolution_times else 0
            )
        except Exception as e:
            logger.warning(f"Error calculating metrics for user {user_id}: {e}")
            incidents_per_week = 0
            after_hours_percentage = 0
            avg_resolution_hours = 0
        
        # Calculate burnout score (0-10 scale) with null safety
        try:
            # Ensure thresholds exist and are valid
            thresholds = getattr(self, 'thresholds', {}) or {}
            
            frequency_threshold = thresholds.get("incidents_per_week_high", 8)
            after_hours_threshold = thresholds.get("after_hours_percentage_high", 0.3)
            duration_threshold = thresholds.get("avg_resolution_hours_high", 6)
            
            frequency_score = min(10, (incidents_per_week / frequency_threshold) * 10) if frequency_threshold > 0 else 0
            after_hours_score = min(10, (after_hours_percentage / after_hours_threshold) * 10) if after_hours_threshold > 0 else 0
            duration_score = min(10, (avg_resolution_hours / duration_threshold) * 10) if duration_threshold > 0 else 0
            
            # Weight the scores (frequency is most important)
            burnout_score = (frequency_score * 0.5) + (after_hours_score * 0.3) + (duration_score * 0.2)
            
            # Determine risk level
            risk_level = self._determine_risk_level(burnout_score)
            
            # Generate recommendations
            recommendations = self._generate_user_recommendations(
                incidents_per_week, after_hours_percentage, avg_resolution_hours, risk_level
            )
        except Exception as e:
            logger.warning(f"Error calculating burnout score for user {user_id}: {e}")
            burnout_score = 0.0
            risk_level = "low"
            recommendations = ["Analysis incomplete - please retry"]
            
        
        # Return results with comprehensive error handling
        try:
            return {
                "user_id": user_id,
                "user_name": user_name,
                "user_email": user_email,
                "burnout_score": round(float(burnout_score), 2) if burnout_score is not None else 0.0,
                "risk_level": str(risk_level) if risk_level else "low",
                "incident_count": len(user_incidents) if user_incidents else 0,
                "key_metrics": {
                    "incidents_per_week": round(float(incidents_per_week), 2) if incidents_per_week is not None else 0.0,
                    "after_hours_percentage": round(float(after_hours_percentage) * 100, 1) if after_hours_percentage is not None else 0.0,
                    "avg_resolution_hours": round(float(avg_resolution_hours), 2) if avg_resolution_hours is not None else 0.0
                },
                "recommendations": recommendations if isinstance(recommendations, list) else ["Analysis incomplete"]
            }
        except Exception as e:
            logger.error(f"Error constructing result for user {user_id}: {e}")
            return {
                "user_id": user_id,
                "user_name": user_name or "Unknown",
                "user_email": user_email,
                "burnout_score": 0.0,
                "risk_level": "low",
                "incident_count": 0,
                "key_metrics": {
                    "incidents_per_week": 0.0,
                    "after_hours_percentage": 0.0,
                    "avg_resolution_hours": 0.0
                },
                "recommendations": ["Analysis failed - please retry"]
            }
    
    def _map_users_to_incidents(
        self, 
        users: List[Dict[str, Any]], 
        incidents: List[Dict[str, Any]]
    ) -> Dict[str, List[str]]:
        """Map users to incidents they were involved in."""
        user_incidents = {}
        
        # Defensive programming: handle None inputs
        if not incidents or not isinstance(incidents, list):
            logger.warning("_map_users_to_incidents: incidents is None or not a list")
            return user_incidents
            
        if not users or not isinstance(users, list):
            logger.warning("_map_users_to_incidents: users is None or not a list")
            return user_incidents
        
        for incident in incidents:
            try:
                if not incident or not isinstance(incident, dict):
                    logger.debug("Skipping invalid incident (not a dict)")
                    continue
                    
                incident_id = incident.get("id") if incident else None
                if not incident_id:
                    logger.debug("Skipping incident without ID")
                    continue
                    
                attrs = incident.get("attributes") if incident else None
                if not attrs or not isinstance(attrs, dict):
                    logger.debug(f"Skipping incident {incident_id} - invalid attributes")
                    continue
                
                # Extract user involvement from various fields with comprehensive null checks
                involved_users = set()
                
                # Created by - multiple layers of null checking
                try:
                    user_data = attrs.get("user") if attrs else None
                    if user_data and isinstance(user_data, dict):
                        data_section = user_data.get("data")
                        if data_section and isinstance(data_section, dict):
                            user_id = data_section.get("id")
                            if user_id:
                                involved_users.add(str(user_id))
                except Exception as e:
                    logger.debug(f"Error extracting created_by user for incident {incident_id}: {e}")
                
                # Started by - multiple layers of null checking
                try:
                    started_by_data = attrs.get("started_by") if attrs else None
                    if started_by_data and isinstance(started_by_data, dict):
                        data_section = started_by_data.get("data")
                        if data_section and isinstance(data_section, dict):
                            user_id = data_section.get("id")
                            if user_id:
                                involved_users.add(str(user_id))
                except Exception as e:
                    logger.debug(f"Error extracting started_by user for incident {incident_id}: {e}")
                
                # Resolved by - multiple layers of null checking
                try:
                    resolved_by_data = attrs.get("resolved_by") if attrs else None
                    if resolved_by_data and isinstance(resolved_by_data, dict):
                        data_section = resolved_by_data.get("data")
                        if data_section and isinstance(data_section, dict):
                            user_id = data_section.get("id")
                            if user_id:
                                involved_users.add(str(user_id))
                except Exception as e:
                    logger.debug(f"Error extracting resolved_by user for incident {incident_id}: {e}")
                
                # Add incident to each involved user with null safety
                try:
                    for user_id in involved_users:
                        if user_id and isinstance(user_id, str):
                            if user_id not in user_incidents:
                                user_incidents[user_id] = []
                            user_incidents[user_id].append(str(incident_id))
                except Exception as e:
                    logger.warning(f"Error adding incident {incident_id} to user mappings: {e}")
                    
            except Exception as e:
                logger.warning(f"Error processing incident {getattr(incident, 'get', lambda x: None)('id') if incident else 'unknown'}: {e}")
                continue
        
        logger.info(f"_map_users_to_incidents: Successfully mapped incidents for {len(user_incidents)} users")
        return user_incidents
    
    def _count_after_hours_incidents(self, incidents: List[Dict[str, Any]]) -> int:
        """Count incidents that occurred outside business hours."""
        after_hours_count = 0
        
        # Handle None or invalid incidents list
        if not incidents or not isinstance(incidents, list):
            logger.debug("_count_after_hours_incidents: incidents is None or not a list")
            return 0
        
        for incident in incidents:
            try:
                if not incident or not isinstance(incident, dict):
                    logger.debug("Skipping invalid incident in after-hours count")
                    continue
                    
                # Safely extract created_at with multiple null checks
                attrs = incident.get("attributes") if incident else None
                if not attrs or not isinstance(attrs, dict):
                    logger.debug("Skipping incident without valid attributes in after-hours count")
                    continue
                    
                created_at = attrs.get("created_at") if attrs else None
                if not created_at or not isinstance(created_at, str):
                    logger.debug("Skipping incident without valid created_at timestamp")
                    continue
                
                try:
                    # Parse ISO format timestamp
                    dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    
                    # Check if weekend (Saturday=5, Sunday=6)
                    is_weekend = dt.weekday() >= 5
                    
                    # Check if outside business hours (9 AM - 5 PM)
                    is_after_hours = dt.hour < 9 or dt.hour >= 17
                    
                    if is_weekend or is_after_hours:
                        after_hours_count += 1
                        
                except Exception as e:
                    logger.debug(f"Error parsing timestamp '{created_at}': {e}")
                    continue
                    
            except Exception as e:
                logger.debug(f"Error processing incident in after-hours count: {e}")
                continue
        
        logger.debug(f"_count_after_hours_incidents: Found {after_hours_count} after-hours incidents out of {len(incidents)} total")
        return after_hours_count
    
    def _extract_incident_duration(self, incident: Dict[str, Any]) -> Optional[float]:
        """Extract incident duration in minutes."""
        # Handle None or invalid incident
        if not incident or not isinstance(incident, dict):
            logger.debug("_extract_incident_duration: incident is None or not a dict")
            return None
            
        try:
            attrs = incident.get("attributes") if incident else None
            if not attrs or not isinstance(attrs, dict):
                logger.debug("_extract_incident_duration: attributes is None or not a dict")
                return None
                
            started_at = attrs.get("started_at") if attrs else None
            resolved_at = attrs.get("resolved_at") if attrs else None
            
            if not started_at or not resolved_at:
                logger.debug("_extract_incident_duration: missing started_at or resolved_at")
                return None
                
            if not isinstance(started_at, str) or not isinstance(resolved_at, str):
                logger.debug("_extract_incident_duration: timestamps are not strings")
                return None
            
            try:
                start = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                end = datetime.fromisoformat(resolved_at.replace('Z', '+00:00'))
                duration_seconds = (end - start).total_seconds()
                duration_minutes = duration_seconds / 60
                
                # Sanity check - duration should be positive and reasonable
                if duration_minutes < 0:
                    logger.debug(f"_extract_incident_duration: negative duration {duration_minutes}")
                    return None
                    
                return duration_minutes
                
            except Exception as e:
                logger.debug(f"Error parsing timestamps '{started_at}' to '{resolved_at}': {e}")
                return None
                
        except Exception as e:
            logger.warning(f"Error in _extract_incident_duration: {e}")
            return None
    
    def _determine_risk_level(self, score: float) -> str:
        """Determine risk level based on burnout score."""
        if score >= 7:
            return "high"
        elif score >= 4:
            return "medium"
        else:
            return "low"
    
    def _generate_user_recommendations(
        self, 
        incidents_per_week: float, 
        after_hours_percentage: float, 
        avg_resolution_hours: float,
        risk_level: str
    ) -> List[str]:
        """Generate personalized recommendations."""
        recommendations = []
        
        if risk_level == "high":
            recommendations.append("⚠️ High burnout risk detected - consider workload redistribution")
        
        if incidents_per_week > self.thresholds["incidents_per_week_medium"]:
            recommendations.append(f"📊 High incident volume ({incidents_per_week:.1f}/week) - review on-call rotations")
        
        if after_hours_percentage > self.thresholds["after_hours_percentage_medium"]:
            recommendations.append(f"🌙 High after-hours activity ({after_hours_percentage*100:.1f}%) - establish boundaries")
        
        if avg_resolution_hours > self.thresholds["avg_resolution_hours_medium"]:
            recommendations.append(f"⏱️ Long resolution times ({avg_resolution_hours:.1f}h avg) - review processes")
        
        if risk_level == "low":
            recommendations.append("✅ Healthy incident involvement - maintaining good balance")
        
        return recommendations or ["No specific recommendations at this time"]
    
    def _calculate_team_summary(self, team_analysis: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate team-wide summary statistics."""
        if not team_analysis:
            return {}
        
        scores = [user["burnout_score"] for user in team_analysis]
        risk_counts = {"high": 0, "medium": 0, "low": 0}
        
        for user in team_analysis:
            risk_counts[user["risk_level"]] += 1
        
        return {
            "total_users": len(team_analysis),
            "average_score": round(sum(scores) / len(scores), 2),
            "highest_score": max(scores),
            "risk_distribution": risk_counts,
            "users_at_risk": risk_counts["high"] + risk_counts["medium"]
        }
    
    def _generate_team_recommendations(
        self, 
        team_summary: Dict[str, Any], 
        team_analysis: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate team-level recommendations."""
        recommendations = []
        
        high_risk_count = team_summary.get("risk_distribution", {}).get("high", 0)
        medium_risk_count = team_summary.get("risk_distribution", {}).get("medium", 0)
        total_users = team_summary.get("total_users", 0)
        
        if high_risk_count > 0:
            recommendations.append(f"🚨 {high_risk_count} team members at high burnout risk - immediate attention needed")
        
        if total_users > 0 and (high_risk_count + medium_risk_count) / total_users > 0.5:
            recommendations.append("📋 Consider team workload redistribution and process improvements")
        
        avg_score = team_summary.get("average_score", 0)
        if avg_score > 6:
            recommendations.append("⚖️ Team average burnout score is high - review on-call policies")
        elif avg_score < 3:
            recommendations.append("✅ Team burnout levels are healthy - maintain current practices")
        
        return recommendations or ["Team analysis completed - review individual recommendations"]