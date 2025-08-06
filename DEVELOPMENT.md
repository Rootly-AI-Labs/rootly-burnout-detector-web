# Development Workflow

## Environment Setup

### Branches
- `main` - Production branch (https://www.oncallburnout.com)
- `dev` - Development branch (https://dev.oncallburnout.com)
- `feature/*` - Feature branches

### Environment URLs
- **Production Frontend**: https://www.oncallburnout.com
- **Production API**: https://rootly-burnout-detector-web-production.up.railway.app
- **Development Frontend**: https://dev.oncallburnout.com  
- **Development API**: https://rootly-burnout-detector-web-dev.up.railway.app

## Development Process

### 1. Creating New Features

```bash
# Start from dev branch
git checkout dev
git pull origin dev

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: your feature description"

# Push feature branch
git push origin feature/your-feature-name
```

### 2. Testing Changes

```bash
# Test locally
cd frontend && npm run dev
cd backend && python -m uvicorn app.main:app --reload

# Test builds
cd frontend && npm run build
cd backend && python -m pytest
```

### 3. Creating Pull Requests

1. **Feature → Dev**: 
   - Create PR from `feature/your-feature` → `dev`
   - Test on development environment
   - Get review and merge

2. **Dev → Main**:
   - Create PR from `dev` → `main` 
   - Final review and testing
   - Deploy to production

### 4. OAuth Configuration per Environment

#### Development OAuth Apps
- **Google OAuth**: Create separate dev app with dev callback URLs
- **GitHub OAuth**: Create separate dev app with dev callback URLs

#### Production OAuth Apps  
- **Google OAuth**: Production app with production callback URLs
- **GitHub OAuth**: Production app with production callback URLs

## Environment Variables

### Development (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://rootly-burnout-detector-web-dev.up.railway.app
```

### Production
```bash
NEXT_PUBLIC_API_URL=https://rootly-burnout-detector-web-production.up.railway.app
```

## CI/CD Pipeline

- ✅ Automated testing on all PRs
- ✅ Build verification
- ✅ Type checking and linting  
- ✅ Auto-deployment to dev on `dev` branch push
- ✅ Auto-deployment to production on `main` branch push

## Branch Protection

- **Main**: Requires PR approval, passing tests, up-to-date branch
- **Dev**: Requires passing tests before merge

## Quick Commands

```bash
# Switch to dev and pull latest
git checkout dev && git pull origin dev

# Create and push feature branch
git checkout -b feature/name && git push -u origin feature/name

# Run full test suite
npm run test && python -m pytest

# Build for production
npm run build
```