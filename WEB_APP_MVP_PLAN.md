# Rootly Burnout Detector - Web App MVP Plan

## 🎯 MVP Vision

**Core Value**: "Connect Rootly → See burnout insights"

A simple web application that analyzes Rootly incident data to provide burnout risk assessment for engineering teams. Focus on viewing data with minimal complexity.

## 📋 MVP Scope

### ✅ Included Features
- Social login (Google/GitHub OAuth)
- Rootly API token setup
- Single analysis execution
- Team dashboard with burnout scores
- Individual member detail views
- Basic responsive design
- Simple settings page
- Previous analysis history

### ❌ Excluded (Future Versions)
- Multiple data sources (GitHub, Slack)
- Historical trends and analytics
- Automated scheduling
- Team collaboration features
- Advanced charts and visualizations
- Email notifications
- Export functionality
- API access for integrations

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React.js + TypeScript (deployed on Vercel)
- **Backend**: FastAPI + Python (deployed on Railway)
- **Database**: PostgreSQL (Railway managed)
- **Authentication**: OAuth (Google/GitHub) + JWT tokens
- **Charts**: Chart.js or similar lightweight library

### Project Structure
```
rootly-burnout-detector/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── main.py         # FastAPI entry point
│   │   ├── auth.py         # Authentication
│   │   ├── models.py       # Database models
│   │   ├── api/            # API endpoints
│   │   └── core/           # Business logic (existing analysis code)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API calls
│   │   └── utils/          # Utilities
│   ├── package.json
│   └── vercel.json
└── WEB_APP_MVP_PLAN.md     # This file
```

## 🚀 User Flow

### 1. Landing & Signup (30 seconds)
```
Landing Page → Social Login (Google/GitHub) → Token Setup
```

### 2. First Analysis (3 minutes)
```
Social Login (Google/GitHub) → Enter Rootly Token → Test Connection → Configure Analysis → Run Analysis → View Results
```

### 3. Dashboard Usage (Ongoing)
```
View Team Dashboard → Click Individual Members → Review Details → Run New Analysis
```

## 🎨 UI/UX Design

### Landing Page
- Clean hero section with value proposition
- Preview of dashboard screenshot
- Single CTA: "Get Started Free"
- Minimal design focusing on trust and simplicity

### Dashboard
- **Header**: Logo, navigation, user menu
- **Metrics Row**: High/Medium/Low risk counts + team average
- **Chart Section**: Bar chart of team member scores
- **Team List**: Scrollable list with member details
- **Mobile**: Responsive design with stacked layout

### Member Detail Modal
- **Header**: Name, score, risk level
- **Metrics**: Incident count, after-hours %, resolution time
- **Dimensions**: Emotional exhaustion, depersonalization, accomplishment
- **Recommendations**: Simple bullet list

## 🔧 Technical Implementation

### Backend API Endpoints
```python
# Authentication (OAuth)
GET  /auth/google           # Google OAuth login
GET  /auth/google/callback  # Google OAuth callback
GET  /auth/github           # GitHub OAuth login  
GET  /auth/github/callback  # GitHub OAuth callback
GET  /auth/me               # Get current user

# Analysis
POST /analysis/start        # Start new analysis
GET  /analysis/{id}         # Get analysis status
GET  /analysis/{id}/results # Get analysis results
GET  /analysis/current      # Get latest analysis
GET  /analysis/history      # Get previous analyses

# Settings
PUT  /user/token           # Update Rootly token
GET  /user/settings        # Get user settings
```

### Database Schema
```sql
-- Users table
users (
  id SERIAL PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  password_hash VARCHAR,                    -- NULL for OAuth users
  provider VARCHAR,                         -- 'google', 'github', or NULL
  provider_id VARCHAR,                      -- OAuth provider user ID
  is_verified BOOLEAN DEFAULT FALSE,       -- TRUE for OAuth users
  rootly_token VARCHAR ENCRYPTED,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analyses table  
analyses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  status VARCHAR DEFAULT 'pending',        -- pending, running, completed, failed
  config JSONB,
  results JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### Frontend Components
```jsx
// Main components
<App />
├── <LandingPage />
├── <SocialLogin />          # Google/GitHub OAuth buttons
├── <AuthCallback />         # OAuth callback handler
├── <TokenSetup />
├── <Dashboard />
│   ├── <MetricsRow />
│   ├── <TeamChart />
│   ├── <TeamMemberList />
│   └── <AnalysisHistory />  # Previous analyses
├── <MemberDetailModal />
└── <SettingsPage />
```

## 🚀 Build Priority Order

### **Phase 1: Core Backend (Days 1-3)**
**Start here - this enables everything else**

1. **FastAPI Foundation**
   ```bash
   # Create basic FastAPI app with database
   - Database models (User, Analysis)
   - Basic JWT auth structure
   - Health check endpoint
   ```

2. **OAuth Setup**
   ```bash
   # Social login endpoints
   - Google OAuth flow
   - GitHub OAuth flow  
   - Test with simple redirect
   ```

3. **Rootly Integration**
   ```bash
   # Core business logic
   - Rootly API client
   - Token validation
   - Data fetching with error handling
   ```

### **Phase 2: Analysis Engine (Days 4-5)**
4. **Analysis Runner**
   ```bash
   # Integrate existing burnout code
   - Wrap main.py logic in API
   - Progress tracking
   - Error handling
   ```

### **Phase 3: Frontend Foundation (Days 6-8)**
5. **React Setup**
   ```bash
   # Basic app structure
   - Routing (React Router)
   - Auth context
   - API service layer
   ```

6. **Progress & Error UI**
   ```bash
   # User feedback system
   - Loading states
   - Progress bars
   - Error messages
   - Success notifications
   ```

### **Phase 4: User Flow (Days 9-12)**
7. **Authentication Flow**
8. **Token Setup**
9. **Dashboard**
10. **Member Details**

### **Phase 5: Polish & Deploy (Days 13-16)**
11. **History & Settings**
12. **Responsive Design**
13. **Deployment**
14. **Testing**

## 🎨 Progress & Error Handling Design

### **Analysis Progress UI**

```jsx
<AnalysisProgressPage>
  <ProgressHeader>
    <StatusBadge status={analysisStatus}>
      {statusText}
    </StatusBadge>
    <EstimatedTime>
      {timeRemaining}
    </EstimatedTime>
  </ProgressHeader>

  <ProgressVisualization>
    <CircularProgress 
      percent={progress} 
      size="120px"
      strokeWidth={8}
      strokeColor="#4CAF50"
    />
    
    <ProgressSteps>
      <Step 
        status="completed" 
        icon="🔗" 
        label="Connecting to Rootly"
      />
      <Step 
        status="active" 
        icon="📊" 
        label="Fetching incident data"
        detail="Processing 247 incidents..."
      />
      <Step 
        status="pending" 
        icon="👥" 
        label="Analyzing team patterns"
      />
      <Step 
        status="pending" 
        icon="🧠" 
        label="Calculating burnout scores"
      />
    </ProgressSteps>
  </ProgressVisualization>

  <LiveStats>
    <StatCounter 
      label="Users Found" 
      value={stats.users} 
      animated 
    />
    <StatCounter 
      label="Incidents Processed" 
      value={stats.incidents} 
      animated 
    />
    <StatCounter 
      label="Time Range" 
      value={`${stats.days} days`} 
    />
  </LiveStats>

  <ProgressLog>
    <LogEntry level="info" timestamp="now">
      ✅ Successfully connected to Rootly
    </LogEntry>
    <LogEntry level="info" timestamp="5s ago">
      📥 Fetching incident data for last 30 days
    </LogEntry>
    <LogEntry level="info" timestamp="12s ago">
      🔍 Found 15 team members
    </LogEntry>
  </ProgressLog>
</AnalysisProgressPage>
```

### **Error Handling UI**

```jsx
// Network/API Errors
<ErrorState type="network">
  <ErrorIcon>🔌</ErrorIcon>
  <ErrorTitle>Connection Failed</ErrorTitle>
  <ErrorMessage>
    Unable to connect to Rootly. Please check your internet connection.
  </ErrorMessage>
  <ErrorActions>
    <Button variant="primary" onClick={retry}>
      Try Again
    </Button>
    <Button variant="secondary" onClick={checkStatus}>
      Check Rootly Status
    </Button>
  </ErrorActions>
</ErrorState>

// Authentication Errors
<ErrorState type="auth">
  <ErrorIcon>🔐</ErrorIcon>
  <ErrorTitle>Invalid Rootly Token</ErrorTitle>
  <ErrorMessage>
    Your Rootly API token appears to be invalid or expired.
  </ErrorMessage>
  <ErrorDetails>
    <Detail>Error code: 401 Unauthorized</Detail>
    <Detail>Check token permissions: incidents:read, users:read</Detail>
  </ErrorDetails>
  <ErrorActions>
    <Button variant="primary" onClick={updateToken}>
      Update Token
    </Button>
    <Button variant="secondary" onClick={getHelp}>
      Get Help
    </Button>
  </ErrorActions>
</ErrorState>

// Data Processing Errors
<ErrorState type="processing">
  <ErrorIcon>⚠️</ErrorIcon>
  <ErrorTitle>Analysis Failed</ErrorTitle>
  <ErrorMessage>
    We encountered an error while processing your data.
  </ErrorMessage>
  <ErrorDetails>
    <Detail>Failed at: Calculating burnout dimensions</Detail>
    <Detail>Affected users: 3 of 15</Detail>
  </ErrorDetails>
  <ErrorActions>
    <Button variant="primary" onClick={retryAnalysis}>
      Retry Analysis
    </Button>
    <Button variant="secondary" onClick={contactSupport}>
      Contact Support
    </Button>
  </ErrorActions>
</ErrorState>

// Partial Success
<WarningState type="partial">
  <WarningIcon>⚠️</WarningIcon>
  <WarningTitle>Analysis Completed with Warnings</WarningTitle>
  <WarningMessage>
    Analysis completed but some data was unavailable.
  </WarningMessage>
  <WarningDetails>
    <Detail>✅ 12 users analyzed successfully</Detail>
    <Detail>⚠️ 3 users missing incident data</Detail>
  </WarningDetails>
  <WarningActions>
    <Button variant="primary" onClick={viewResults}>
      View Results
    </Button>
    <Button variant="secondary" onClick={viewDetails}>
      See Details
    </Button>
  </WarningActions>
</WarningState>
```

### **Inline Error Components**

```jsx
// Token Input with Validation
<TokenInput>
  <Label>Rootly API Token</Label>
  <InputGroup>
    <Input 
      type="password"
      value={token}
      onChange={setToken}
      error={tokenError}
      placeholder="rootly_xxxxxxxxxxxxxxxx"
    />
    <TestButton 
      loading={testing}
      onClick={testToken}
      status={testStatus}
    >
      {testing ? <Spinner /> : 'Test'}
    </TestButton>
  </InputGroup>
  
  {tokenError && (
    <ErrorMessage type="inline">
      {tokenError}
    </ErrorMessage>
  )}
  
  {testStatus === 'success' && (
    <SuccessMessage type="inline">
      ✅ Connected successfully! Found Acme Corp with 15 users.
    </SuccessMessage>
  )}
</TokenInput>

// Loading States
<LoadingCard>
  <SkeletonLoader>
    <SkeletonText width="60%" />
    <SkeletonText width="40%" />
    <SkeletonChart height="200px" />
  </SkeletonLoader>
</LoadingCard>
```

### **Toast Notifications**

```jsx
// Success Toast
<Toast type="success" duration={5000}>
  <ToastIcon>✅</ToastIcon>
  <ToastMessage>
    Analysis completed! Found 2 high-risk team members.
  </ToastMessage>
  <ToastAction onClick={viewDashboard}>
    View Dashboard
  </ToastAction>
</Toast>

// Error Toast
<Toast type="error" duration={8000}>
  <ToastIcon>❌</ToastIcon>
  <ToastMessage>
    Failed to save analysis. Please try again.
  </ToastMessage>
  <ToastAction onClick={retry}>
    Retry
  </ToastAction>
</Toast>

// Info Toast  
<Toast type="info" duration={3000}>
  <ToastIcon>ℹ️</ToastIcon>
  <ToastMessage>
    Analysis started. This usually takes 2-3 minutes.
  </ToastMessage>
</Toast>
```

## 📅 Development Timeline

### Week 1: Backend Foundation
- **Day 1**: FastAPI setup, database models, OAuth structure
- **Day 2-3**: Rootly API integration with comprehensive error handling
- **Day 4-5**: Analysis engine integration with progress tracking
- **Day 6-7**: API endpoints, testing, error scenarios

### Week 2: Frontend Core  
- **Day 1-2**: React setup, routing, progress/error UI components
- **Day 3-4**: Authentication flow, token setup with validation
- **Day 5-7**: Dashboard, charts, member details

### Week 3: Integration & Polish
- **Day 1-3**: Frontend/backend integration, comprehensive error handling
- **Day 4-5**: Loading states, user feedback, edge cases
- **Day 6-7**: UI polish, responsive design

### Week 4: Deployment & Testing
- **Day 1-2**: Railway/Vercel deployment
- **Day 3-4**: Error monitoring, performance optimization  
- **Day 5-7**: End-to-end testing, error scenario testing

## 🔐 Security & Privacy

### Data Protection
- Rootly tokens encrypted in database
- OAuth with Google/GitHub (no password storage needed)
- JWT tokens for session management
- HTTPS enforcement
- Input validation and sanitization

### Privacy
- OAuth providers handle authentication (Google/GitHub)
- Minimal data collection (email, name, analysis results only)
- No third-party analytics in MVP
- Clear data retention policy
- User can delete account and data

## 📊 Success Metrics

### MVP Launch Goals
- **Technical**: 99% uptime, <2s page load times
- **User Experience**: <5 minutes from signup to first results
- **Adoption**: 10 active teams using the platform
- **Feedback**: Positive user feedback on core functionality

### Key User Actions to Track
1. OAuth login completion rate (Google/GitHub)
2. Successful token setup rate
3. First analysis completion rate
4. Dashboard engagement (time spent, pages viewed)
5. Repeat usage (users running multiple analyses)
6. Previous analysis access rate

## 🚀 Deployment Strategy

### Railway (Backend)
```dockerfile
# Dockerfile for FastAPI
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Vercel (Frontend)
```json
// vercel.json
{
  "builds": [{"src": "package.json", "use": "@vercel/static-build"}],
  "routes": [{"src": "/(.*)", "dest": "/index.html"}],
  "env": {
    "REACT_APP_API_URL": "https://burnout-api.railway.app"
  }
}
```

### Environment Variables
```bash
# Backend (Railway)
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
ROOTLY_API_BASE_URL=https://api.rootly.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
FRONTEND_URL=https://burnout-detector.vercel.app

# Frontend (Vercel)
REACT_APP_API_URL=https://burnout-api.railway.app
```

## 🔄 Post-MVP Roadmap

### Version 2.0 (Month 2)
- GitHub integration for code analysis
- Historical trend analysis
- Basic automated scheduling

### Version 3.0 (Month 3)
- Slack integration for communication patterns
- Team collaboration features
- Advanced analytics and insights

### Version 4.0 (Month 4)
- Export functionality (PDF reports, CSV)
- API access for integrations
- Advanced alerting and notifications

## ⚠️ Risks & Mitigation

### Technical Risks
- **Rootly API changes**: Monitor API docs, implement error handling
- **Performance with large teams**: Implement pagination, caching
- **Database scaling**: Use Railway's managed PostgreSQL scaling

### Product Risks
- **User adoption**: Focus on clear value demonstration
- **Data accuracy**: Validate analysis algorithms thoroughly
- **Security concerns**: Implement proper encryption, auditing

## 🎯 Getting Started

1. **Clone repository**: `git clone ...`
2. **Set up OAuth apps**: Create Google & GitHub OAuth applications
3. **Set up backend**: `cd backend && pip install -r requirements.txt`
4. **Set up frontend**: `cd frontend && npm install`
5. **Configure environment**: Copy example env files and update OAuth credentials
6. **Run locally**: Backend on :8000, frontend on :3000
7. **Deploy**: Push to trigger Railway/Vercel deployments

---

**Total Estimated Development Time**: 4 weeks
**Target Launch Date**: [Set based on start date]
**MVP Budget**: $20-50/month (hosting costs)