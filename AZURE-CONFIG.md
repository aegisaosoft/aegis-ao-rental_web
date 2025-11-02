# Azure Configuration for Standalone Node.js Server

## Problem: 503 Service Unavailable / Docker Detection

If Azure is trying to use Docker or showing 503 errors, follow these steps to configure it as a **standalone Node.js server**.

## Solution: Configure Azure App Service Settings

### Step 1: Set Startup Command

In Azure Portal:
1. Go to your App Service: `aegis-ao-rental-web`
2. Navigate to **Configuration** → **General settings**
3. Set **Startup Command** to:
   ```
   node server/index.js
   ```
4. **Save** the configuration

### Step 2: Ensure Linux Stack

1. In Azure Portal, go to **Configuration** → **General settings**
2. Verify:
   - **Stack**: `Node.js`
   - **Major Version**: `20 LTS` or `18 LTS`
   - **Minor Version**: (latest)
   - **Startup Command**: `node server/index.js`

### Step 3: Set Required Environment Variables

Go to **Configuration** → **Application settings** and add/verify:

| Name | Value | Notes |
|------|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `8080` | Azure sets this automatically, but ensure it's set |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~20` | Or `~18` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` | Build during deployment |
| `API_BASE_URL` | Your C# API URL | e.g., `https://aegis-ao-rentals-xxx.azurewebsites.net` |
| `ENABLE_ORYX_BUILD` | `true` | Enable Oryx build |

### Step 4: Disable Docker (if enabled)

If Docker is detected:
1. Go to **Configuration** → **General settings**
2. Set **Stack** to `Node.js` (not Docker)
3. Remove any Docker-related settings

### Step 5: Verify Application Structure

Ensure your deployed app has this structure:
```
/home/site/wwwroot/
├── server/
│   └── index.js          # Server entry point
├── client/
│   └── build/            # React build output
├── package.json          # Root package.json with "start": "node server/index.js"
└── node_modules/          # Root dependencies
```

### Step 6: Restart App Service

After configuration changes:
1. Click **Save** in Azure Portal
2. Go to **Overview** → Click **Restart**

## Verify It's Working

1. Check **Log stream** in Azure Portal:
   - Should see: `✅ Server running on http://0.0.0.0:8080`
   - Should NOT see Docker-related messages

2. Test health endpoint:
   ```
   https://aegis-rental.com/api/health
   ```
   Should return: `{"status":"OK",...}`

3. Check **Deployment Center** logs:
   - Should show Node.js build process
   - Should NOT show Docker build

## Troubleshooting

### Still Getting 503?

1. **Check Log Stream**:
   - Azure Portal → Your App → **Log stream**
   - Look for error messages

2. **Check Deployment Logs**:
   - Azure Portal → **Deployment Center** → **Logs**
   - Verify build completed successfully

3. **Check Application Insights** (if enabled):
   - Look for startup errors

4. **Verify Dependencies**:
   - Ensure all dependencies in `package.json` are installed
   - Check for any missing modules

### Using Azure CLI

You can also configure via CLI:

```bash
# Set startup command
az webapp config set \
  --name aegis-ao-rental-web \
  --resource-group aegis-ao-rental \
  --startup-file "node server/index.js"

# Set stack to Node.js
az webapp config set \
  --name aegis-ao-rental-web \
  --resource-group aegis-ao-rental \
  --linux-fx-version "NODE|20-lts"

# Set environment variables
az webapp config appsettings set \
  --name aegis-ao-rental-web \
  --resource-group aegis-ao-rental \
  --settings \
    NODE_ENV=production \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    ENABLE_ORYX_BUILD=true
```

## Important Notes

- **No Dockerfile needed**: This is a standalone Node.js app
- **No Docker Compose**: Not using containerization
- **Windows web.config**: Ignored on Linux (only used on Windows/IIS)
- **Startup command**: Must be explicitly set to `node server/index.js`

