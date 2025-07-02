# Getting Started with Rootly Burnout Detector Web App

## 📋 Development Status

### ✅ Completed
- **FastAPI Backend Foundation**
  - Database models (User, Analysis)
  - JWT authentication system
  - Health and status endpoints
  - Environment configuration
  - SQLAlchemy integration

### 🚧 In Progress
- OAuth endpoints (Google/GitHub)
- Rootly API integration
- Analysis runner

### 📝 Planned
- React frontend
- Dashboard components
- Deployment setup

## 🚀 Current Setup

### 1. Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python test_api.py  # Test the API
python -m app.main  # Start development server
```

### 2. API Documentation
Visit `http://localhost:8000/docs` when the server is running.

### 3. Database
Currently using SQLite for development. The database file (`test.db`) is created automatically.

## 🔧 Configuration

### Environment Variables
Copy `backend/.env.example` to `backend/.env` and update:

```bash
# Basic settings
DEBUG=True
SECRET_KEY=your-secret-key-change-in-production

# Database (SQLite for now)
DATABASE_URL=sqlite:///./test.db

# OAuth (set up later)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Rootly integration
ROOTLY_API_BASE_URL=https://api.rootly.com
FRONTEND_URL=http://localhost:3000
```

## 📁 Project Structure

```
rootly-burnout-detector-web/
├── README.md                    # Project overview
├── GETTING_STARTED.md          # This file
├── WEB_APP_MVP_PLAN.md         # Detailed implementation plan
├── docker-compose.yml          # Local development with PostgreSQL
├── .gitignore                  # Git ignore rules
└── backend/                    # FastAPI application
    ├── app/
    │   ├── main.py             # Application entry point
    │   ├── core/
    │   │   ├── config.py       # Settings management
    │   │   ├── burnout_analyzer.py  # Core analysis logic
    │   │   └── data_collector.py    # Data collection utilities
    │   ├── models/
    │   │   ├── user.py         # User database model
    │   │   ├── analysis.py     # Analysis database model
    │   │   └── base.py         # Database configuration
    │   └── auth/
    │       ├── jwt.py          # JWT token handling
    │       └── dependencies.py # Authentication dependencies
    ├── requirements.txt        # Python dependencies
    ├── .env.example           # Environment template
    ├── .env                   # Environment variables (git-ignored)
    ├── Dockerfile             # Docker configuration
    └── test_api.py            # API test script
```

## 🧪 Testing

### Run Tests
```bash
cd backend
python test_api.py
```

### Expected Output
```
🚀 Testing Rootly Burnout Detector API...
==================================================
✅ Root endpoint test passed!
✅ Health endpoint test passed!
✅ Database file created successfully!

🎉 All tests passed! FastAPI backend is working correctly.
```

## 🔄 Next Development Steps

1. **OAuth Integration** - Add Google/GitHub login
2. **Rootly API Client** - Connect to Rootly's incident data
3. **Analysis Engine** - Integrate existing burnout calculation logic
4. **React Frontend** - Build the user interface
5. **Deployment** - Set up Railway + Vercel hosting

## 🆘 Troubleshooting

### Common Issues

**Import Errors**
```bash
# Make sure you're in the backend directory and venv is activated
cd backend
source venv/bin/activate
```

**Database Issues**
```bash
# Delete and recreate database
rm test.db
python -m app.main  # Will recreate tables
```

**Port Already in Use**
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

## 📚 Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [MVP Implementation Plan](./WEB_APP_MVP_PLAN.md)

Ready to continue development! 🚀