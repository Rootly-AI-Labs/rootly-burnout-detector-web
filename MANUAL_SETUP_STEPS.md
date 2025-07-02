# Manual Setup Steps for New Repository

## 🔧 Directory Cleanup Needed

The code has been copied but needs some cleanup. Please run these commands:

```bash
cd /Users/spencercheng/Workspace/Rootly/rootly-burnout-detector-web

# Clean up directory structure
rm -rf app  # Remove duplicate
mv backend/app .  # Move FastAPI app to root
mv backend/requirements.txt .
mv backend/test_api.py .
mv backend/test.db . 2>/dev/null || true  # Move if exists
mv backend/.env* . 2>/dev/null || true  # Move env files if they exist
rm -rf backend/venv  # Remove virtual environment
rmdir backend  # Remove empty backend directory

# Update backend structure to match our plan
mkdir backend
mv app backend/
mv requirements.txt backend/
mv test_api.py backend/
mv test.db backend/ 2>/dev/null || true
mv .env* backend/ 2>/dev/null || true
mv Dockerfile backend/
```

## 🚀 GitHub Repository Setup

1. **Create GitHub Repository**
   - Go to https://github.com/new
   - Repository name: `rootly-burnout-detector-web`
   - Description: "Modern web application for detecting burnout risk in engineering teams using Rootly incident data"
   - Choose Public or Private
   - Don't initialize with README (we already have one)

2. **Initialize Git and Push**
   ```bash
   cd /Users/spencercheng/Workspace/Rootly/rootly-burnout-detector-web
   
   # Run the setup script
   ./setup_repo.sh
   
   # Add your GitHub remote (replace YOUR_USERNAME)
   git remote add origin https://github.com/YOUR_USERNAME/rootly-burnout-detector-web.git
   git branch -M main
   git push -u origin main
   ```

## 📁 Expected Final Structure

```
rootly-burnout-detector-web/
├── README.md                    # Project overview ✅
├── GETTING_STARTED.md          # Development guide ✅
├── WEB_APP_MVP_PLAN.md         # Implementation plan ✅
├── MANUAL_SETUP_STEPS.md       # This file ✅
├── docker-compose.yml          # Local development ✅
├── .gitignore                  # Git ignore rules ✅
├── setup_repo.sh              # Repository setup script ✅
└── backend/                    # FastAPI application
    ├── app/
    │   ├── main.py             # FastAPI entry point ✅
    │   ├── core/
    │   │   ├── config.py       # Settings ✅
    │   │   ├── burnout_analyzer.py  # Analysis logic ✅
    │   │   └── data_collector.py    # Data collection ✅
    │   ├── models/
    │   │   ├── __init__.py     # Package init ✅
    │   │   ├── base.py         # Database config ✅
    │   │   ├── user.py         # User model ✅
    │   │   └── analysis.py     # Analysis model ✅
    │   ├── auth/
    │   │   ├── __init__.py     # Package init ✅
    │   │   ├── jwt.py          # JWT handling ✅
    │   │   └── dependencies.py # Auth dependencies ✅
    │   └── api/
    │       ├── __init__.py     # Package init ✅
    │       └── endpoints/      # API routes (to be added)
    ├── requirements.txt        # Python dependencies ✅
    ├── .env.example           # Environment template ✅
    ├── .env                   # Environment variables (git-ignored) ✅
    ├── Dockerfile             # Docker configuration ✅
    └── test_api.py            # API test script ✅
```

## ✅ Verification

After setup, verify everything works:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python test_api.py
```

Expected output:
```
🚀 Testing Rootly Burnout Detector API...
==================================================
✅ Root endpoint test passed!
✅ Health endpoint test passed!
✅ Database file created successfully!

🎉 All tests passed! FastAPI backend is working correctly.
```

## 🎯 Next Development Steps

Once the repository is set up, continue development with:

1. **OAuth Integration** - Add Google/GitHub login endpoints
2. **Rootly API Integration** - Connect to incident data
3. **Analysis Engine** - Integrate burnout calculation logic
4. **React Frontend** - Build the user interface

The foundation is solid and ready for the next phase! 🚀