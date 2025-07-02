#!/bin/bash

# Setup script for Rootly Burnout Detector Web App repository

echo "🚀 Setting up Rootly Burnout Detector Web App repository..."

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: FastAPI backend foundation

✅ Features included:
- FastAPI application with health endpoints
- SQLAlchemy database models (User, Analysis)
- JWT authentication system
- OAuth preparation (Google/GitHub)
- Environment configuration
- Docker setup for development
- Comprehensive documentation

🔄 Next steps:
- Set up OAuth endpoints
- Integrate Rootly API
- Build React frontend"

echo "✅ Git repository initialized with initial commit"
echo ""
echo "🔗 Next steps:"
echo "1. Create GitHub repository: https://github.com/new"
echo "2. Repository name: rootly-burnout-detector-web"
echo "3. Add remote and push:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/rootly-burnout-detector-web.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "📁 Repository structure created successfully!"
echo "📖 See GETTING_STARTED.md for development instructions"