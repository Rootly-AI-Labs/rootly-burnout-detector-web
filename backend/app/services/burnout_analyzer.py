"""
Burnout analysis service for analyzing incident patterns and calculating burnout metrics.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from collections import defaultdict

from ..core.rootly_client import RootlyAPIClient

logger = logging.getLogger(__name__)


class BurnoutAnalyzerService:
    """Service for analyzing burnout based on Rootly incident data."""
    
    def __init__(self, api_token: str):
        self.client = RootlyAPIClient(api_token)
        
        # Burnout scoring thresholds
        self.thresholds = {
            "incidents_per_week": {
                "low": 3,
                "medium": 6,
                "high": 10
            },
            "after_hours_percentage": {
                "low": 0.1,    # 10%
                "medium": 0.25, # 25%
                "high": 0.4     # 40%
            },
            "weekend_percentage": {
                "low": 0.05,    # 5%
                "medium": 0.15, # 15%
                "high": 0.25    # 25%
            },
            "avg_response_time_minutes": {
                "low": 15,
                "medium": 30,
                "high": 60
            },
            "severity_weight": {
                "critical": 3.0,
                "high": 2.0,
                "medium": 1.5,
                "low": 1.0
            }
        }
    
    async def analyze_burnout(
        self, 
        time_range_days: int = 30,
        include_weekends: bool = True
    ) -> Dict[str, Any]:
        """
        Analyze burnout for the team based on incident data.
        
        Returns structured analysis results with:
        - Overall team health score
        - Individual member burnout scores
        - Burnout factors
        """
        logger.info(f"Starting burnout analysis for {time_range_days} days")
        
        try:
            # Fetch data from Rootly
            logger.info(f"TRACE: About to call _fetch_analysis_data for {time_range_days} days")
            data = await self._fetch_analysis_data(time_range_days)
            logger.info(f"TRACE: _fetch_analysis_data returned: type={type(data)}, is_none={data is None}")
            
            # Check if data was successfully fetched (data should never be None due to fallbacks)
            if data is None:
                logger.error("TRACE: Data is None after _fetch_analysis_data")
                raise Exception("Failed to fetch data from Rootly API - no data returned")
            
            # Extract users and incidents (with additional safety checks)
            logger.info(f"TRACE: About to extract users and incidents from data")
            users = data.get("users", []) if data else []
            incidents = data.get("incidents", []) if data else []
            metadata = data.get("collection_metadata", {}) if data else {}
            logger.info(f"TRACE: Extracted {len(users)} users, {len(incidents)} incidents")
            
            # Analyze team burnout
            team_analysis = self._analyze_team_data(
                users, 
                incidents, 
                metadata,
                include_weekends
            )
            
            # Calculate overall team health
            team_health = self._calculate_team_health(team_analysis["members"])
            
            # Generate insights and recommendations
            insights = self._generate_insights(team_analysis, team_health)
            
            return {
                "analysis_timestamp": datetime.now().isoformat(),
                "metadata": {
                    **metadata,
                    "include_weekends": include_weekends
                },
                "team_health": team_health,
                "team_analysis": team_analysis,
                "insights": insights,
                "recommendations": self._generate_recommendations(team_health, team_analysis)
            }
            
        except Exception as e:
            logger.error(f"Burnout analysis failed: {e}")
            raise
    
    async def _fetch_analysis_data(self, days_back: int) -> Dict[str, Any]:
        """Fetch all required data from Rootly API."""
        try:
            # Use the existing data collection method
            logger.info(f"Fetching analysis data for {days_back} days")
            data = await self.client.collect_analysis_data(days_back=days_back)
            
            # Add detailed logging to debug the NoneType issue
            logger.info(f"Data from collect_analysis_data: type={type(data)}, value={data}")
            
            # Ensure we always have a valid data structure
            if data is None:
                logger.warning("collect_analysis_data returned None, creating fallback data structure")
                data = {
                    "users": [],
                    "incidents": [],
                    "collection_metadata": {
                        "timestamp": datetime.now().isoformat(),
                        "days_analyzed": days_back,
                        "total_users": 0,
                        "total_incidents": 0,
                        "error": "Data collection returned None",
                        "date_range": {
                            "start": (datetime.now() - timedelta(days=days_back)).isoformat(),
                            "end": datetime.now().isoformat()
                        }
                    }
                }
            
            # Additional safety check
            if not isinstance(data, dict):
                logger.error(f"Data is not a dictionary! Type: {type(data)}, Value: {data}")
                data = {
                    "users": [],
                    "incidents": [],
                    "collection_metadata": {
                        "timestamp": datetime.now().isoformat(),
                        "days_analyzed": days_back,
                        "total_users": 0,
                        "total_incidents": 0,
                        "error": f"Data collection returned invalid type: {type(data)}",
                        "date_range": {
                            "start": (datetime.now() - timedelta(days=days_back)).isoformat(),
                            "end": datetime.now().isoformat()
                        }
                    }
                }
            
            # Add additional safety check for logging
            if data and isinstance(data, dict):
                logger.info(f"Successfully fetched data: {len(data.get('users', []))} users, {len(data.get('incidents', []))} incidents")
            else:
                logger.warning(f"Data is not a valid dictionary: type={type(data)}, value={data}")
            return data
        except Exception as e:
            logger.error(f"Error fetching analysis data: {str(e)}")
            logger.error(f"Exception type: {type(e).__name__}")
            logger.error(f"Full exception details: {repr(e)}")
            # Return fallback data instead of raising
            return {
                "users": [],
                "incidents": [],
                "collection_metadata": {
                    "timestamp": datetime.now().isoformat(),
                    "days_analyzed": days_back,
                    "total_users": 0,
                    "total_incidents": 0,
                    "error": str(e),
                    "date_range": {
                        "start": (datetime.now() - timedelta(days=days_back)).isoformat(),
                        "end": datetime.now().isoformat()
                    }
                }
            }
    
    def _analyze_team_data(
        self, 
        users: List[Dict[str, Any]], 
        incidents: List[Dict[str, Any]],
        metadata: Dict[str, Any],
        include_weekends: bool
    ) -> Dict[str, Any]:
        """Analyze burnout data for the entire team."""
        # Ensure all inputs are valid
        users = users or []
        incidents = incidents or []
        metadata = metadata or {}
        
        # Map users to their incidents
        user_incidents = self._map_user_incidents(users, incidents)
        
        # Analyze each team member
        member_analyses = []
        for user in users:
            # Add safety check for None user
            if user is None:
                continue
            user_id = str(user.get("id")) if user.get("id") is not None else "unknown"
            user_analysis = self._analyze_member_burnout(
                user,
                user_incidents.get(user_id, []),
                metadata,
                include_weekends
            )
            member_analyses.append(user_analysis)
        
        # Sort by burnout score (highest first)
        member_analyses.sort(key=lambda x: x["burnout_score"], reverse=True)
        
        return {
            "members": member_analyses,
            "total_members": len(users),
            "total_incidents": len(incidents)
        }
    
    def _map_user_incidents(
        self, 
        users: List[Dict[str, Any]], 
        incidents: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Map incidents to users based on involvement."""
        user_incidents = defaultdict(list)
        
        # Ensure inputs are valid
        incidents = incidents or []
        
        for incident in incidents:
            # Add safety check for None incident
            if incident is None:
                continue
            attrs = incident.get("attributes", {}) if incident else {}
            incident_users = set()
            
            # Extract all users involved in the incident
            # Creator/Reporter
            if attrs.get("user", {}).get("data", {}).get("id"):
                incident_users.add(str(attrs["user"]["data"]["id"]))
            
            # Started by (acknowledged)
            if attrs.get("started_by", {}).get("data", {}).get("id"):
                incident_users.add(str(attrs["started_by"]["data"]["id"]))
            
            # Resolved by
            if attrs.get("resolved_by", {}).get("data", {}).get("id"):
                incident_users.add(str(attrs["resolved_by"]["data"]["id"]))
            
            # Add incident to each involved user
            for user_id in incident_users:
                user_incidents[user_id].append(incident)
        
        return dict(user_incidents)
    
    def _analyze_member_burnout(
        self,
        user: Dict[str, Any],
        incidents: List[Dict[str, Any]],
        metadata: Dict[str, Any],
        include_weekends: bool
    ) -> Dict[str, Any]:
        """Analyze burnout for a single team member."""
        user_attrs = user.get("attributes", {})
        user_id = user.get("id")
        user_name = user_attrs.get("full_name") or user_attrs.get("name", "Unknown")
        user_email = user_attrs.get("email")
        
        # If no incidents, return minimal analysis
        if not incidents:
            return {
                "user_id": user_id,
                "user_name": user_name,
                "user_email": user_email,
                "burnout_score": 0,
                "risk_level": "low",
                "incident_count": 0,
                "factors": {
                    "workload": 0,
                    "after_hours": 0,
                    "weekend_work": 0,
                    "incident_load": 0,
                    "response_time": 0
                },
                "metrics": {
                    "incidents_per_week": 0,
                    "after_hours_percentage": 0,
                    "weekend_percentage": 0,
                    "avg_response_time_minutes": 0,
                    "severity_distribution": {}
                }
            }
        
        # Calculate metrics
        days_analyzed = metadata.get("days_analyzed", 30)
        metrics = self._calculate_member_metrics(
            incidents, 
            days_analyzed, 
            include_weekends
        )
        
        # Calculate burnout factors (0-10 scale for each)
        factors = self._calculate_burnout_factors(metrics)
        
        # Calculate overall burnout score (weighted average)
        burnout_score = self._calculate_burnout_score(factors)
        
        # Determine risk level
        risk_level = self._determine_risk_level(burnout_score)
        
        return {
            "user_id": user_id,
            "user_name": user_name,
            "user_email": user_email,
            "burnout_score": round(burnout_score, 2),
            "risk_level": risk_level,
            "incident_count": len(incidents),
            "factors": factors,
            "metrics": metrics
        }
    
    def _calculate_member_metrics(
        self,
        incidents: List[Dict[str, Any]],
        days_analyzed: int,
        include_weekends: bool
    ) -> Dict[str, Any]:
        """Calculate detailed metrics for a team member."""
        # Initialize counters
        after_hours_count = 0
        weekend_count = 0
        response_times = []
        severity_counts = defaultdict(int)
        
        for incident in incidents:
            attrs = incident.get("attributes", {})
            
            # Check timing
            created_at = attrs.get("created_at")
            if created_at:
                dt = self._parse_timestamp(created_at)
                if dt:
                    # After hours: before 9 AM or after 6 PM
                    if dt.hour < 9 or dt.hour >= 18:
                        after_hours_count += 1
                    
                    # Weekend: Saturday (5) or Sunday (6)
                    if dt.weekday() >= 5:
                        weekend_count += 1
            
            # Response time (time to acknowledge)
            started_at = attrs.get("started_at")
            if created_at and started_at:
                response_time = self._calculate_response_time(created_at, started_at)
                if response_time is not None:
                    response_times.append(response_time)
            
            # Severity
            severity = attrs.get("severity", {}).get("data", {}).get("attributes", {}).get("name", "unknown").lower()
            severity_counts[severity] += 1
        
        # Calculate averages and percentages
        incidents_per_week = (len(incidents) / days_analyzed) * 7
        after_hours_percentage = after_hours_count / len(incidents) if incidents else 0
        weekend_percentage = weekend_count / len(incidents) if incidents else 0
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        return {
            "incidents_per_week": round(incidents_per_week, 2),
            "after_hours_percentage": round(after_hours_percentage, 3),
            "weekend_percentage": round(weekend_percentage, 3),
            "avg_response_time_minutes": round(avg_response_time, 1),
            "severity_distribution": dict(severity_counts)
        }
    
    def _calculate_burnout_factors(self, metrics: Dict[str, Any]) -> Dict[str, float]:
        """Calculate individual burnout factors on a 0-10 scale."""
        factors = {}
        
        # Workload factor (based on incidents per week)
        ipw = metrics["incidents_per_week"]
        thresholds = self.thresholds["incidents_per_week"]
        if ipw <= thresholds["low"]:
            factors["workload"] = (ipw / thresholds["low"]) * 3
        elif ipw <= thresholds["medium"]:
            factors["workload"] = 3 + ((ipw - thresholds["low"]) / (thresholds["medium"] - thresholds["low"])) * 3
        elif ipw <= thresholds["high"]:
            factors["workload"] = 6 + ((ipw - thresholds["medium"]) / (thresholds["high"] - thresholds["medium"])) * 3
        else:
            factors["workload"] = min(10, 9 + (ipw - thresholds["high"]) / thresholds["high"])
        
        # After-hours factor
        ahp = metrics["after_hours_percentage"]
        ah_thresholds = self.thresholds["after_hours_percentage"]
        if ahp <= ah_thresholds["low"]:
            factors["after_hours"] = (ahp / ah_thresholds["low"]) * 3
        elif ahp <= ah_thresholds["medium"]:
            factors["after_hours"] = 3 + ((ahp - ah_thresholds["low"]) / (ah_thresholds["medium"] - ah_thresholds["low"])) * 3
        elif ahp <= ah_thresholds["high"]:
            factors["after_hours"] = 6 + ((ahp - ah_thresholds["medium"]) / (ah_thresholds["high"] - ah_thresholds["medium"])) * 3
        else:
            factors["after_hours"] = min(10, 9 + (ahp - ah_thresholds["high"]) / ah_thresholds["high"])
        
        # Weekend work factor
        wp = metrics["weekend_percentage"]
        w_thresholds = self.thresholds["weekend_percentage"]
        if wp <= w_thresholds["low"]:
            factors["weekend_work"] = (wp / w_thresholds["low"]) * 3
        elif wp <= w_thresholds["medium"]:
            factors["weekend_work"] = 3 + ((wp - w_thresholds["low"]) / (w_thresholds["medium"] - w_thresholds["low"])) * 3
        elif wp <= w_thresholds["high"]:
            factors["weekend_work"] = 6 + ((wp - w_thresholds["medium"]) / (w_thresholds["high"] - w_thresholds["medium"])) * 3
        else:
            factors["weekend_work"] = min(10, 9 + (wp - w_thresholds["high"]) / w_thresholds["high"])
        
        # Incident load factor (severity-weighted)
        severity_dist = metrics["severity_distribution"]
        weighted_incidents = 0
        for severity, count in severity_dist.items():
            weight = self.thresholds["severity_weight"].get(severity, 1.0)
            weighted_incidents += count * weight
        
        # Normalize by weeks
        days_analyzed = 30  # Default assumption
        weighted_per_week = (weighted_incidents / days_analyzed) * 7
        
        # Scale to 0-10
        if weighted_per_week <= 5:
            factors["incident_load"] = weighted_per_week * 2
        else:
            factors["incident_load"] = min(10, 10)
        
        # Response time factor
        art = metrics["avg_response_time_minutes"]
        rt_thresholds = self.thresholds["avg_response_time_minutes"]
        if art <= rt_thresholds["low"]:
            factors["response_time"] = (art / rt_thresholds["low"]) * 3
        elif art <= rt_thresholds["medium"]:
            factors["response_time"] = 3 + ((art - rt_thresholds["low"]) / (rt_thresholds["medium"] - rt_thresholds["low"])) * 3
        elif art <= rt_thresholds["high"]:
            factors["response_time"] = 6 + ((art - rt_thresholds["medium"]) / (rt_thresholds["high"] - rt_thresholds["medium"])) * 3
        else:
            factors["response_time"] = min(10, 9 + (art - rt_thresholds["high"]) / rt_thresholds["high"])
        
        # Round all factors
        return {k: round(v, 2) for k, v in factors.items()}
    
    def _calculate_burnout_score(self, factors: Dict[str, float]) -> float:
        """Calculate overall burnout score from individual factors."""
        # Weighted average of factors
        weights = {
            "workload": 0.3,
            "after_hours": 0.25,
            "weekend_work": 0.2,
            "incident_load": 0.15,
            "response_time": 0.1
        }
        
        total_score = 0
        total_weight = 0
        
        for factor, weight in weights.items():
            if factor in factors:
                total_score += factors[factor] * weight
                total_weight += weight
        
        return total_score / total_weight if total_weight > 0 else 0
    
    def _determine_risk_level(self, burnout_score: float) -> str:
        """Determine risk level based on burnout score."""
        if burnout_score >= 7:
            return "critical"
        elif burnout_score >= 5:
            return "high"
        elif burnout_score >= 3:
            return "medium"
        else:
            return "low"
    
    def _calculate_team_health(self, member_analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate overall team health metrics."""
        if not member_analyses:
            return {
                "overall_score": 10,  # Perfect health if no data
                "risk_distribution": {"low": 0, "medium": 0, "high": 0, "critical": 0},
                "average_burnout_score": 0,
                "health_status": "excellent",
                "members_at_risk": 0
            }
        
        # Calculate averages and distributions
        burnout_scores = [m["burnout_score"] for m in member_analyses]
        avg_burnout = sum(burnout_scores) / len(burnout_scores)
        
        # Count risk levels
        risk_dist = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        for member in member_analyses:
            risk_dist[member["risk_level"]] += 1
        
        # Calculate overall health score (inverse of burnout)
        overall_score = 10 - avg_burnout
        
        # Determine health status
        if overall_score >= 8:
            health_status = "excellent"
        elif overall_score >= 6:
            health_status = "good"
        elif overall_score >= 4:
            health_status = "fair"
        else:
            health_status = "poor"
        
        return {
            "overall_score": round(overall_score, 2),
            "risk_distribution": risk_dist,
            "average_burnout_score": round(avg_burnout, 2),
            "health_status": health_status,
            "members_at_risk": risk_dist["high"] + risk_dist["critical"]
        }
    
    def _generate_insights(
        self, 
        team_analysis: Dict[str, Any], 
        team_health: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate insights from the analysis."""
        insights = []
        members = team_analysis["members"]
        
        # Team-level insights
        if team_health["members_at_risk"] > 0:
            insights.append({
                "type": "warning",
                "category": "team",
                "message": f"{team_health['members_at_risk']} team members are at high or critical burnout risk",
                "priority": "high"
            })
        
        # Find common patterns
        if members:
            # High after-hours work
            high_after_hours = [m for m in members if m["metrics"]["after_hours_percentage"] > 0.3]
            if len(high_after_hours) >= len(members) * 0.3:
                insights.append({
                    "type": "pattern",
                    "category": "after_hours",
                    "message": f"{len(high_after_hours)} team members have >30% after-hours incidents",
                    "priority": "high"
                })
            
            # Weekend work patterns
            high_weekend = [m for m in members if m["metrics"]["weekend_percentage"] > 0.2]
            if len(high_weekend) >= len(members) * 0.25:
                insights.append({
                    "type": "pattern",
                    "category": "weekend_work",
                    "message": f"{len(high_weekend)} team members regularly handle weekend incidents",
                    "priority": "medium"
                })
            
            # Response time issues
            slow_response = [m for m in members if m["metrics"]["avg_response_time_minutes"] > 45]
            if slow_response:
                insights.append({
                    "type": "metric",
                    "category": "response_time",
                    "message": f"{len(slow_response)} team members have average response times >45 minutes",
                    "priority": "medium"
                })
        
        return insights
    
    def _generate_recommendations(
        self, 
        team_health: Dict[str, Any], 
        team_analysis: Dict[str, Any]
    ) -> List[str]:
        """Generate actionable recommendations based on analysis."""
        recommendations = []
        members = team_analysis["members"]
        
        # Team health recommendations
        if team_health["health_status"] in ["poor", "fair"]:
            recommendations.append("Consider implementing or reviewing on-call rotation schedules to distribute load more evenly")
        
        if team_health["members_at_risk"] > 0:
            recommendations.append(f"Schedule 1-on-1s with the {team_health['members_at_risk']} team members at high/critical risk")
        
        # Pattern-based recommendations
        if members:
            # After-hours pattern
            avg_after_hours = sum(m["metrics"]["after_hours_percentage"] for m in members) / len(members)
            if avg_after_hours > 0.25:
                recommendations.append("Implement follow-the-sun support or adjust business hours coverage")
            
            # Weekend pattern
            avg_weekend = sum(m["metrics"]["weekend_percentage"] for m in members) / len(members)
            if avg_weekend > 0.15:
                recommendations.append("Review weekend on-call compensation and rotation frequency")
            
            # Workload distribution
            workload_variance = self._calculate_workload_variance(members)
            if workload_variance > 0.5:
                recommendations.append("Incident load is unevenly distributed - consider load balancing strategies")
            
            # Response time
            avg_response = sum(m["metrics"]["avg_response_time_minutes"] for m in members if m["metrics"]["avg_response_time_minutes"] > 0) / len(members) if members else 0
            if avg_response > 30:
                recommendations.append("Review alerting and escalation procedures to improve response times")
        
        # Always include a positive recommendation
        if team_health["health_status"] in ["excellent", "good"]:
            recommendations.append("Continue current practices and monitor for changes in team health metrics")
        
        return recommendations
    
    def _parse_timestamp(self, timestamp: str) -> Optional[datetime]:
        """Parse ISO format timestamp."""
        try:
            return datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except:
            return None
    
    def _calculate_response_time(self, created_at: str, started_at: str) -> Optional[float]:
        """Calculate response time in minutes."""
        created = self._parse_timestamp(created_at)
        started = self._parse_timestamp(started_at)
        
        if created and started:
            return (started - created).total_seconds() / 60
        return None
    
    def _calculate_workload_variance(self, members: List[Dict[str, Any]]) -> float:
        """Calculate variance in workload distribution."""
        if not members:
            return 0
        
        incident_counts = [m["incident_count"] for m in members]
        if not incident_counts:
            return 0
        
        mean = sum(incident_counts) / len(incident_counts)
        variance = sum((x - mean) ** 2 for x in incident_counts) / len(incident_counts)
        
        # Normalize by mean to get coefficient of variation
        return variance / mean if mean > 0 else 0