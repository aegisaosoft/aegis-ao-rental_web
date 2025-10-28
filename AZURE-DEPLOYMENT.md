# Azure Deployment Guide

## Current Setup
- **.NET API**: Deployed and accessible (you can see Swagger)
- **React Client**: Needs to be configured to point to your API

## Step 1: Get Your API URL

Your API is deployed at a URL like:
- `https://your-api-name.azurewebsites.net`

Add `/api` to the end: `https://your-api-name.azurewebsites.net/api`

## Step 2: Configure the React App

### Option A: Build with Environment Variable (Recommended)

1. Open PowerShell or Command Prompt in the `aegis-ao-rental_web/client` folder

2. Set the environment variable and build:
```powershell
# PowerShell
$env:REACT_APP_API_URL="https://your-api-name.azurewebsites.net/api"; npm run build
```

Or on Linux/Mac:
```bash
REACT_APP_API_URL=https://your-api-name.azurewebsites.net/api npm run build
```

### Option B: Use Azure Application Settings

If you're using Azure Static Web Apps or App Service, you can set the environment variable in Azure Portal:

1. Go to Azure Portal
2. Navigate to your Static Web App or App Service
3. Go to Configuration → Application settings
4. Add: `REACT_APP_API_URL` = `https://your-api-name.azurewebsites.net/api`
5. Restart the app

### Option C: Create .env File Locally

Create a file `aegis-ao-rental_web/client/.env` (this file is gitignored):

```env
REACT_APP_API_URL=https://your-api-name.azurewebsites.net/api
```

Then run `npm run build` in the client folder.

## Step 3: Deploy the Build

After building, the `build` folder will contain your production-ready app. Deploy this to:

- **Azure Static Web Apps**: Use the deployment center
- **Azure App Service**: Use zip deploy or git deployment
- **Azure Storage**: Upload the build folder contents

## Step 4: Verify Deployment

1. Visit your deployed React app
2. Open browser DevTools (F12) → Network tab
3. Try to load the page
4. Check if API calls are going to the correct URL

## Troubleshooting

### If you see "Route not found":
- The API URL is incorrect
- CORS might be blocking requests
- Check Azure API logs

### If you see CORS errors:
Your .NET API needs to allow your React app's origin. In your API's `Program.cs` or `Startup.cs`:

```csharp
app.UseCors(options => options
    .WithOrigins("https://your-react-app.azurestaticapps.net")
    .AllowAnyMethod()
    .AllowAnyHeader()
    .AllowCredentials()
);
```

### If the site loads but API calls fail:
- Check browser console for errors
- Verify the API URL in Network tab
- Check if the API requires authentication

