# JWT Authentication Guide for Rootly Burnout Detector

## Overview

This guide explains how JWT token validation works in the Rootly Burnout Detector backend, including how to create test users and generate valid JWT tokens for testing the Rootly integration.

## Authentication Flow

### 1. OAuth Authentication (Production)
- User visits `/auth/google` or `/auth/github`
- User is redirected to OAuth provider (Google/GitHub)
- After consent, provider redirects to callback endpoint
- Backend exchanges authorization code for access token
- Backend fetches user info from OAuth provider
- Backend creates/updates user in database
- Backend generates JWT token with user ID as 'sub' claim
- User is redirected to frontend with JWT token

### 2. JWT Token Structure
```json
{
  "sub": "3",           // User ID (string)
  "exp": 1752104568     // Expiration timestamp
}
```

### 3. JWT Validation Process
1. Client sends request with `Authorization: Bearer {token}` header
2. `HTTPBearer` security extracts token from header
3. `get_current_user` dependency calls `decode_access_token()`
4. JWT is decoded using secret key and algorithm
5. Token expiry is checked automatically
6. User ID is extracted from 'sub' claim
7. User is looked up in database by ID
8. User object is returned if valid, 401 error if not

## Configuration

### JWT Settings (`app/core/config.py`)
```python
JWT_SECRET_KEY = "your-secret-key-change-in-production-use-openssl-rand-hex-32"
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days
```

### Database Schema (`app/models/user.py`)
```python
class User(Base):
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=True)
    provider = Column(String(50), nullable=True)  # 'google', 'github', 'test'
    provider_id = Column(String(255), nullable=True)
    is_verified = Column(Boolean, default=False)
    rootly_token = Column(Text, nullable=True)  # For Rootly API access
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

## Protected Endpoints

All endpoints require valid JWT token in Authorization header:

### Authentication Endpoints
- `GET /auth/me` - Get current user information

### Rootly Integration Endpoints
- `POST /rootly/token` - Update user's Rootly API token
- `GET /rootly/token/test` - Test Rootly API connection
- `GET /rootly/data/preview` - Preview Rootly data

### Analysis Endpoints
- `POST /analysis/*` - All analysis endpoints

## Testing JWT Authentication

### 1. Create Test User and Token

Use the provided script to create a test user and generate a valid JWT token:

```bash
cd backend
source venv/bin/activate
python3 create_test_jwt.py
```

This will output:
- Test user details
- Valid JWT token
- Curl command examples

### 2. Test Authentication Endpoint

```bash
curl -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
     http://localhost:8000/auth/me
```

Expected response:
```json
{
  "id": 3,
  "email": "test@example.com",
  "name": "Test User",
  "provider": "test",
  "is_verified": true,
  "has_rootly_token": false,
  "created_at": "2025-07-02T23:40:28"
}
```

### 3. Test Rootly Integration

First, set a Rootly API token:
```bash
curl -X POST -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
     -H 'Content-Type: application/json' \
     -d '{"token": "YOUR_ROOTLY_API_TOKEN"}' \
     http://localhost:8000/rootly/token
```

Then test the connection:
```bash
curl -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
     http://localhost:8000/rootly/token/test
```

## JWT Token Validation Implementation

### Core JWT Functions (`app/auth/jwt.py`)

```python
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    
    # Ensure sub claim is a string (required by JWT spec)
    if "sub" in to_encode and isinstance(to_encode["sub"], int):
        to_encode["sub"] = str(to_encode["sub"])
    
    # Set expiration
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    
    # Encode token
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify a JWT access token."""
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.JWTError:
        return None
```

### Authentication Dependencies (`app/auth/dependencies.py`)

```python
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    return user
```

## Rootly API Integration

### How Rootly Token Validation Works

1. **Token Storage**: User's Rootly API token is stored in the `rootly_token` field
2. **Token Validation**: When updating token, backend tests connection to Rootly API
3. **API Calls**: RootlyAPIClient uses the stored token for API requests

### RootlyAPIClient (`app/core/rootly_client.py`)

```python
class RootlyAPIClient:
    def __init__(self, api_token: str):
        self.api_token = api_token
        self.base_url = settings.ROOTLY_API_BASE_URL
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/vnd.api+json"
        }
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test API connection and return basic account info."""
        # Makes request to /v1/users to validate token
        # Returns success/error status with details
```

## Security Considerations

1. **JWT Secret**: Use a strong secret key in production
2. **Token Expiry**: Tokens expire after 7 days
3. **HTTPS**: Always use HTTPS in production
4. **Token Storage**: Rootly tokens should be encrypted in production
5. **CORS**: Configure CORS properly for production

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Invalid or expired JWT token
2. **400 Bad Request on Rootly endpoints**: No Rootly token configured
3. **Connection errors**: Rootly API not accessible or invalid token

### Debug Steps

1. Verify JWT token is properly formatted
2. Check token expiration
3. Ensure Authorization header format: `Bearer {token}`
4. Test with `/auth/me` endpoint first
5. Check server logs for detailed error messages

## Scripts for Testing

- `create_test_jwt.py` - Create test user and JWT token
- `test_rootly_with_auth.py` - Comprehensive authentication and Rootly testing
- `test_auth.py` - Basic authentication endpoint testing

## Next Steps for Production

1. Set up proper OAuth credentials (Google/GitHub)
2. Use environment variables for secrets
3. Implement token encryption for Rootly API tokens
4. Set up proper CORS configuration
5. Add rate limiting and additional security measures