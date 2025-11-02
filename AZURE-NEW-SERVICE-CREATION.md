# Azure Web App Setup - Step by Step

## Create New Web App

Follow these exact steps to create a new Azure Web App:

### Step 1: Create Resource
1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"+ Create a resource"** (top left)
3. Search for **"Web App"**
4. Click **"Create"**

### Step 2: Basics Tab
Fill in the following:

**Project Details:**
- **Subscription**: Your subscription
- **Resource Group**: Create new or select existing

**Instance Details:**
- **Name**: `aegis-rental-web`
- **Publish**: **Code** (NOT Docker Container)
- **Runtime stack**: **Node 20 LTS**
- **Operating System**: **Linux**
- **Region**: Choose closest (e.g., Canada Central)

**App Service Plan:**
- Create new or select existing
- Recommended: **Linux Basic B1** or higher

Click **"Review + create"** → **"Create"**

### Step 3: After Deployment
Once created, go to the Web App resource:

1. Navigate to **Settings** → **General settings**
2. Verify:
   - **Stack**: Node 20 LTS
   - **Startup Command**: Leave empty or set to `node index.js`
   - **Always On**: Enable (recommended)

3. Navigate to **Settings** → **Container settings**
   - **Container type**: Should be "None"

4. Navigate to **Configuration** → **Application settings**
   Add these settings:
   ```
   NODE_ENV = production
   API_BASE_URL = https://your-csharp-api.azurewebsites.net
   WEBSITE_NODE_DEFAULT_VERSION = ~20
   SCM_DO_BUILD_DURING_DEPLOYMENT = true
   ```

5. Click **Save** at the top

### Step 4: Get Publish Profile
1. Go to **Deployment** → **Deployment Center**
2. Click **"Download publish profile"**
3. Save the `.PublishSettings` file

### Step 5: Configure GitHub Actions
1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. If `AZURE_WEBAPP_PUBLISH_PROFILE` exists, update it
3. If not, click **"New repository secret"**
4. **Name**: `AZURE_WEBAPP_PUBLISH_PROFILE`
5. **Value**: Copy entire contents of the `.PublishSettings` file you downloaded
6. Click **"Add secret"**

### Step 6: Deploy
1. Go to your GitHub repository
2. Navigate to **Actions** tab
3. Select **"Build and deploy Node.js app to Azure Web App"**
4. Click **"Run workflow"** → **"Run workflow"** button

The workflow will:
- Build the React frontend
- Install server dependencies
- Create flat deployment structure
- Deploy to Azure

### Step 7: Verify Deployment
1. Go back to Azure Portal → Your Web App
2. Navigate to **Overview**
3. Click on your Web App URL
4. The site should load!

## Troubleshooting

If you see 503 or Docker errors:
1. Go to **Log stream** in Azure Portal
2. Check for startup errors
3. Verify **Container settings** → Container type is "None"
4. Verify **General settings** → Publishing is "Code"
5. Restart the app from **Overview**

If API calls fail:
1. Check **Configuration** → **Application settings**
2. Verify `API_BASE_URL` is set correctly
3. Verify CORS is enabled on your C# API

