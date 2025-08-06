# Development Environment Setup

## Frontend: https://dev.oncallburnout.com

### Option A: Vercel (Recommended)

1. **Create New Vercel Project**
   - Import repository
   - Name: `rootly-burnout-detector-dev`
   - Branch: `dev`
   - Environment Variables:
     ```bash
     NEXT_PUBLIC_API_URL=https://rootly-burnout-detector-web-dev.up.railway.app
     ```

2. **Add Custom Domain**
   - Vercel Dashboard → Project → Settings → Domains
   - Add: `dev.oncallburnout.com`
   - Copy the DNS records provided

3. **Update DNS Records**
   - Go to your domain registrar
   - Add CNAME record:
     ```
     Name: dev
     Value: cname.vercel-dns.com (or provided value)
     TTL: Auto
     ```

### Option B: Railway

1. **Create Development Environment**
   - Railway Dashboard → Project → New Environment
   - Name: `development`
   - Branch: `dev`

2. **Deploy Frontend Service**
   - Add frontend service to dev environment
   - Connect to `dev` branch

3. **Add Custom Domain**
   - Service Settings → Custom Domain
   - Add: `dev.oncallburnout.com`

## Backend: Railway Dev Environment

1. **Create Railway Dev Environment**
   - Railway Dashboard → Your project
   - New Environment: `development`
   - Branch: `dev`

2. **Environment Variables for Dev**
   ```bash
   FRONTEND_URL=https://dev.oncallburnout.com
   GOOGLE_REDIRECT_URI=https://rootly-burnout-detector-web-dev.up.railway.app/auth/google/callback
   GITHUB_REDIRECT_URI=https://rootly-burnout-detector-web-dev.up.railway.app/auth/github/callback
   DATABASE_URL=postgresql://... (separate dev database)
   # Copy all other env vars from production
   ```

## OAuth Apps for Development

### Google OAuth (Development)
1. Google Cloud Console → New OAuth App
2. Name: "Rootly Burnout Detector (Dev)"
3. **Authorized JavaScript origins**:
   ```
   https://dev.oncallburnout.com
   http://localhost:3000
   ```
4. **Authorized redirect URIs**:
   ```
   https://rootly-burnout-detector-web-dev.up.railway.app/auth/google/callback
   ```

### GitHub OAuth (Development)  
1. GitHub → Settings → Developer settings → OAuth Apps
2. New OAuth App
3. Name: "Rootly Burnout Detector (Dev)"
4. Homepage URL: `https://dev.oncallburnout.com`
5. **Authorization callback URL**:
   ```
   https://rootly-burnout-detector-web-dev.up.railway.app/auth/github/callback
   ```

## Testing the Setup

1. **DNS Propagation**
   ```bash
   nslookup dev.oncallburnout.com
   ```

2. **SSL Certificate**
   - Should auto-generate within 5-10 minutes
   - Check: https://dev.oncallburnout.com

3. **OAuth Flow**
   - Test Google login on dev site
   - Test GitHub login on dev site
   - Verify redirect to onboarding page

## Environment URLs Summary

- **Production Frontend**: https://www.oncallburnout.com
- **Development Frontend**: https://dev.oncallburnout.com
- **Production API**: https://rootly-burnout-detector-web-production.up.railway.app  
- **Development API**: https://rootly-burnout-detector-web-dev.up.railway.app

## Development Workflow

```bash
# Work on dev branch
git checkout dev
git pull origin dev

# Make changes
git add . && git commit -m "your changes"
git push origin dev

# Auto-deploys to https://dev.oncallburnout.com
# Test thoroughly before merging to main
```