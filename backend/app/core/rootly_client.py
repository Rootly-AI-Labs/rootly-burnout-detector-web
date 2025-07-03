"""
Rootly API client for direct HTTP integration.
"""
import httpx
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from urllib.parse import urlencode

from .config import settings

logger = logging.getLogger(__name__)

class RootlyAPIClient:
    """Direct HTTP client for Rootly API."""
    
    def __init__(self, api_token: str):
        self.api_token = api_token
        self.base_url = settings.ROOTLY_API_BASE_URL
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/vnd.api+json"
        }
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test API connection and return basic account info."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/v1/users",
                    headers=self.headers,
                    params={"page[size]": 1}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Log full response to examine available organization data
                    print(f"DEBUG: Full Rootly API response: {data}")
                    
                    # Extract any organization/account info from the response
                    organization_name = None
                    account_info = {
                        "total_users": data.get("meta", {}).get("total_count", 0),
                        "api_version": "v1"
                    }
                    
                    # Check if there's organization info in meta or data
                    if "meta" in data:
                        meta = data["meta"]
                        if "organization" in meta:
                            organization_name = meta.get("organization", {}).get("name")
                        elif "account" in meta:
                            organization_name = meta.get("account", {}).get("name")
                    
                    # Check first user data for organization info
                    if "data" in data and data["data"] and len(data["data"]) > 0:
                        first_user = data["data"][0]
                        if "attributes" in first_user:
                            attrs = first_user["attributes"]
                            # Extract organization name from full_name_with_team: "[Team Name] User Name"
                            if "full_name_with_team" in attrs:
                                full_name_with_team = attrs["full_name_with_team"]
                                if full_name_with_team and full_name_with_team.startswith("[") and "]" in full_name_with_team:
                                    organization_name = full_name_with_team.split("]")[0][1:]  # Extract text between [ ]
                            # Fallback to other fields
                            elif "organization_name" in attrs:
                                organization_name = attrs["organization_name"]
                            elif "company" in attrs:
                                organization_name = attrs["company"]
                    
                    if organization_name:
                        account_info["organization_name"] = organization_name
                    
                    return {
                        "status": "success",
                        "message": "Connected successfully",
                        "account_info": account_info
                    }
                elif response.status_code == 401:
                    return {
                        "status": "error",
                        "message": "Invalid API token",
                        "error_code": "UNAUTHORIZED"
                    }
                elif response.status_code == 404:
                    return {
                        "status": "error", 
                        "message": "API endpoint not found - check your Rootly configuration",
                        "error_code": "NOT_FOUND"
                    }
                else:
                    return {
                        "status": "error",
                        "message": f"API request failed with status {response.status_code}",
                        "error_code": "API_ERROR"
                    }
                    
        except httpx.ConnectError:
            return {
                "status": "error",
                "message": "Unable to connect to Rootly API - check your internet connection",
                "error_code": "CONNECTION_ERROR"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Unexpected error: {str(e)}",
                "error_code": "UNKNOWN_ERROR"
            }
    
    async def get_users(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch users from Rootly API."""
        all_users = []
        page = 1
        page_size = min(limit, 100)  # Rootly API typically limits to 100 per page
        
        try:
            async with httpx.AsyncClient() as client:
                while len(all_users) < limit:
                    response = await client.get(
                        f"{self.base_url}/v1/users",
                        headers=self.headers,
                        params={
                            "page[number]": page,
                            "page[size]": page_size
                        }
                    )
                    
                    if response.status_code != 200:
                        raise Exception(f"API request failed: {response.status_code} {response.text}")
                    
                    data = response.json()
                    users = data.get("data", [])
                    
                    if not users:
                        break
                    
                    all_users.extend(users)
                    
                    # Check if we have more pages
                    meta = data.get("meta", {})
                    if page >= meta.get("total_pages", 1):
                        break
                    
                    page += 1
                
                logger.info(f"Fetched {len(all_users)} users from Rootly")
                return all_users[:limit]
                
        except Exception as e:
            logger.error(f"Error fetching users: {e}")
            raise
    
    async def get_incidents(self, days_back: int = 30, limit: int = 1000) -> List[Dict[str, Any]]:
        """Fetch incidents from Rootly API."""
        all_incidents = []
        page = 1
        page_size = min(100, limit)  # Rootly API page size limit
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        try:
            async with httpx.AsyncClient() as client:
                while len(all_incidents) < limit:
                    params = {
                        "page[number]": page,
                        "page[size]": page_size,
                        "filter[created_at][gte]": start_date.isoformat(),
                        "filter[created_at][lte]": end_date.isoformat(),
                        "include": "severity,user,started_by,resolved_by"
                    }
                    
                    response = await client.get(
                        f"{self.base_url}/v1/incidents",
                        headers=self.headers,
                        params=params
                    )
                    
                    if response.status_code != 200:
                        raise Exception(f"API request failed: {response.status_code} {response.text}")
                    
                    data = response.json()
                    incidents = data.get("data", [])
                    
                    if not incidents:
                        break
                    
                    all_incidents.extend(incidents)
                    
                    # Check if we have more pages
                    meta = data.get("meta", {})
                    if page >= meta.get("total_pages", 1):
                        break
                    
                    page += 1
                
                logger.info(f"Fetched {len(all_incidents)} incidents from last {days_back} days")
                return all_incidents[:limit]
                
        except Exception as e:
            logger.error(f"Error fetching incidents: {e}")
            raise
    
    async def get_user_incident_roles(self, user_id: str, incident_ids: List[str]) -> List[Dict[str, Any]]:
        """Get user roles for specific incidents."""
        # This would require additional API calls to incident role endpoints
        # For now, return empty list - this can be expanded based on Rootly API capabilities
        return []
    
    async def collect_analysis_data(self, days_back: int = 30) -> Dict[str, Any]:
        """Collect all data needed for burnout analysis."""
        logger.info(f"Starting Rootly data collection for last {days_back} days...")
        
        try:
            # Test connection first
            connection_test = await self.test_connection()
            if connection_test["status"] != "success":
                raise Exception(f"Connection test failed: {connection_test['message']}")
            
            # Collect users and incidents in parallel
            users_task = self.get_users(limit=200)
            incidents_task = self.get_incidents(days_back=days_back, limit=1000)
            
            users = await users_task
            incidents = await incidents_task
            
            # Validate data
            if not users:
                raise Exception("No users found - check API permissions")
            
            # Process and return data
            processed_data = {
                "users": users,
                "incidents": incidents,
                "collection_metadata": {
                    "timestamp": datetime.now().isoformat(),
                    "days_analyzed": days_back,
                    "total_users": len(users),
                    "total_incidents": len(incidents),
                    "date_range": {
                        "start": (datetime.now() - timedelta(days=days_back)).isoformat(),
                        "end": datetime.now().isoformat()
                    }
                }
            }
            
            logger.info(f"Data collection completed: {len(users)} users, {len(incidents)} incidents")
            return processed_data
            
        except Exception as e:
            logger.error(f"Data collection failed: {e}")
            raise