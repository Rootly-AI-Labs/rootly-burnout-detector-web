# Branch Protection Setup

## Setup Instructions

### 1. GitHub Branch Protection Rules

Go to: `Settings > Branches > Add rule`

#### For `main` branch:
- Branch name pattern: `main`
- ✅ Require a pull request before merging
- ✅ Require approvals: 1
- ✅ Dismiss stale reviews when new commits are pushed
- ✅ Require review from code owners
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Required status checks:
  - `ci/frontend-build`
  - `ci/backend-tests`
  - `pre-commit-checks`
- ✅ Require conversation resolution
- ✅ Include administrators (recommended)

#### For `dev` branch:
- Branch name pattern: `dev`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
- ✅ Required status checks:
  - `ci/frontend-build`
  - `ci/backend-tests`

### 2. Recommended Workflow

```
feature-branch → dev → main
     ↓           ↓      ↓
   local      staging  production
```

### 3. Environment URLs

- **Production**: https://www.oncallburnout.com
- **Development**: https://dev.oncallburnout.com
- **API Production**: https://rootly-burnout-detector-web-production.up.railway.app
- **API Development**: https://rootly-burnout-detector-web-dev.up.railway.app