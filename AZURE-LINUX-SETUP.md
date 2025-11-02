# Azure Linux App Service Setup Guide

## IMPORTANT: Configure Azure Portal Settings

Your app should run as **standalone Node.js**. Follow these steps when creating the new service:

### 1. Create New Web App
1. Go to Azure Portal → Create a resource
2. Search for "Web App" → Create
3. **App name**: `aegis-rental-web`
4. **Publish**: Code
5. **Runtime stack**: Node 20 LTS
6. **Operating System**: Linux
7. Create the resource

### 2. Verify Deployment Type
After creation, go to **Settings** → **General settings**:
- Check **Publishing** section - should say **"Code"** (NOT "Container" or "Docker")
- Container type should be **"None"**

### 3. Configure Startup Command
1. In **General settings**, find **"Startup Command"**
2. Set it to: `node index.js`
3. Click **Save**

### 4. Verify Stack Configuration
1. Still in **General settings**
2. **Stack**: Should be `Node.js`
3. **Major Version**: Should be `20 LTS`
4. Click **Save**

### 5. Set Application Settings
Go to **Configuration** → **Application settings** and add/verify:

- `NODE_ENV` = `production`
- `API_BASE_URL` = `https://your-csharp-api.azurewebsites.net` (Your C# API URL)
- `PORT` = `8080` (usually set automatically by Azure)
- `WEBSITE_NODE_DEFAULT_VERSION` = `~20`
- `SCM_DO_BUILD_DURING_DEPLOYMENT` = `true`
- `ENABLE_ORYX_BUILD` = `true`

### 6. Restart the App
After making changes, go to **Overview** → Click **Restart**

## Deployment Structure

The deployment creates a flat structure:
```
/home/site/wwwroot/
├── index.js          (server entry point)
├── package.json       (from server/package.json)
├── package-lock.json
├── routes/
├── config/
├── middleware/
└── public/           (React build files)
```

## Startup Command

The startup command in Azure should be:
```
node index.js
```

This is automatically set by the `package.json` start script, but you can also set it explicitly in Azure Portal.

## Troubleshooting

If the app still tries to use Docker:
1. Check **Container settings** → Container type should be "None"
2. Check **General settings** → Publishing should be "Code"
3. Restart the app after making changes
4. Check logs in **Log stream** to see startup errors

