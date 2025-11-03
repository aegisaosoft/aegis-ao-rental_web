# Quick Fix: Get Your App Running

## Current Status
- ✅ Code pushed to GitHub
- ✅ GitHub Actions workflow configured
- ✅ Deployment package created correctly
- ❌ API is stopped
- ❌ Web app is trying to run in Docker mode

## Steps to Fix (Do These Now)

### 1. Start the API
1. Go to Azure Portal
2. Find App Service: `aegis-ao-rental-h4hda5gmengyhyc9`
3. Click **Overview** → **Start**
4. Wait until status shows **Running**
5. Verify: Visit https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net/swagger

### 2. Configure Web App for Node.js (NOT Docker)
1. In Azure Portal, find App Service: `aegis-rental-web`
2. Go to **Settings** → **General settings**
3. Set:
   - **Stack**: `Node 20 LTS`
   - **Startup Command**: `node server/index.js`
   - **Always On**: Enable
4. Click **Save**

### 3. Configure Container Settings
1. In same App Service
2. Go to **Settings** → **Container settings**
3. Set **Container type**: `None`
4. Click **Save**

### 4. Set Environment Variables
1. In same App Service
2. Go to **Configuration** → **Application settings**
3. Add/Update:
   - `NODE_ENV` = `production`
   - `API_BASE_URL` = `https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net`
   - `SCM_DO_BUILD_DURING_DEPLOYMENT` = `false`
4. Click **Save**

### 5. Restart Web App
1. In same App Service
2. Go to **Overview**
3. Click **Restart**
4. Wait until status shows **Running**

### 6. Verify Deployment
1. Visit: https://aegis-rental-web.canadacentral-01.azurewebsites.net (or your actual URL)
2. Check if site loads
3. If you see errors, check **Log stream** for details

## Why This Happens
Azure App Service defaults to Docker when you don't explicitly configure it for Node.js. The startup command and container type settings tell Azure to run your code directly with Node.js instead of Docker.

## If It Still Doesn't Work
1. Check **Log stream** in Azure Portal
2. Look for error messages
3. Share the errors with me

