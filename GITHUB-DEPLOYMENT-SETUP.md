# GitHub Deployment Setup for Azure Web App

## 🚀 Complete Guide to Deploy from GitHub to Azure Web App

This guide will help you set up automatic deployment from your GitHub repository to your Azure Web App.

## 📋 Prerequisites

- GitHub repository with this code
- Azure Web App: `aegis-ao-rental-web`
- Azure resource group: `aegis-ao-rental`
- Azure subscription with appropriate permissions

## 🎯 Step 1: Create Azure Service Principal

You need to create an Azure Service Principal (SPN) to authenticate GitHub Actions with Azure.

### Method A: Azure CLI
```bash
# Login to Azure
az login

# Create service principal (replace with your subscription ID)
az ad sp create-for-rbac --name "aegis-ao-rental-sp" --role contributor --scopes /subscriptions/{subscription-id}/resourceGroups/aegis-ao-rental --sdk-auth --output json
```

The output will look like:
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "...",
  "tenantId": "..."
}
```

### Method B: Azure Portal
1. Go to Azure Active Directory
2. Click "App registrations"
3. Click "New registration"
4. Name: `aegis-ao-rental-sp`
5. Click "Register"
6. Copy the Application (client) ID and Directory (tenant) ID
7. Go to "Certificates & secrets"
8. Create a new client secret
9. Copy the secret value

## 🔐 Step 2: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click **"Settings"** tab
3. Click **"Secrets and variables"** → **"Actions"**
4. Click **"New repository secret"**
5. Add the following secret:

**Secret Name**: `AZURE_CREDENTIALS`  
**Secret Value**: Paste the JSON output from the service principal creation (from Step 1)

Example:
```json
{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "subscriptionId": "your-subscription-id",
  "tenantId": "your-tenant-id"
}
```

## 🔧 Step 3: Update Workflow Configuration

The workflow file (`.github/workflows/deploy-git.yml`) is already created and configured with:

- ✅ Trigger on push to `main` or `master` branch
- ✅ Set up Node.js 22
- ✅ Install root dependencies
- ✅ Build React client
- ✅ Install server dependencies
- ✅ Deploy to Azure Web App
- ✅ Configure Azure Web App settings

## 🎯 Step 4: Update Azure Web App Details

Before pushing, update the workflow file with your actual Azure details:

1. Open `.github/workflows/deploy-git.yml`
2. Update the following settings (if different):
   - **app-name**: `aegis-ao-rental-web` (line ~93)
   - **resource-group**: `aegis-ao-rental` (line ~77)

## 🚀 Step 5: Deploy Your Code

### Push to GitHub:
```bash
# Navigate to the project directory
cd C:\aegis-ao\rental\aegis-ao-rental_web

# Add all files
git add .

# Commit changes
git commit -m "Add GitHub Actions deployment workflow for Azure"

# Push to GitHub
git push origin main
```

### Monitor Deployment:
1. Go to your GitHub repository
2. Click **"Actions"** tab
3. You'll see the deployment workflow running
4. Click on the workflow to see detailed logs

## ⚙️ Step 6: Configure Azure Web App Settings

After the first deployment, you may need to configure additional settings:

### Using Azure CLI:
```bash
# Set environment variables
az webapp config appsettings set \
  --name aegis-ao-rental-web \
  --resource-group aegis-ao-rental \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
         WEBSITE_NODE_DEFAULT_VERSION=22-lts \
    SCM_DO_BUILD_DURING_DEPLOYMENT=false

# Set connection string for database (if needed)
az webapp config connection-string set \
  --name aegis-ao-rental-web \
  --resource-group aegis-ao-rental \
  --connection-string-type PostgreSQL \
  --settings DefaultConnection="your-connection-string"
```

### Using Azure Portal:
1. Go to your Azure Web App
2. Navigate to **Configuration** → **Application settings**
3. Add the following settings:
   - `NODE_ENV` = `production`
   - `PORT` = `8080`
   - `WEBSITE_NODE_DEFAULT_VERSION` = `22-lts`
   - `SCM_DO_BUILD_DURING_DEPLOYMENT` = `false`
   - Add your database connection strings if needed
4. Click **"Save"**

## 🔍 Step 7: Verify Deployment

1. Wait for the GitHub Actions workflow to complete
2. Check the workflow logs for any errors
3. Visit your app at: `https://aegis-ao-rental-web.azurewebsites.net`
4. Check the health endpoint: `https://aegis-ao-rental-web.azurewebsites.net/api/health`

## 🔄 Troubleshooting

### Common Issues:

#### 1. Deployment Fails - Build Error
**Solution:**
- Check the GitHub Actions logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

#### 2. App Not Starting
**Solution:**
- Check Azure Web App logs
- Verify `package.json` has correct `start` script
- Check application settings in Azure Portal
- Make sure the web app is configured for Linux

#### 3. Static Files Not Loading
**Solution:**
- Ensure React build is in `client/build/`
- Check `web.config` is in root directory
- Verify the server is configured to serve static files from the correct directory

#### 4. API Routes Not Working
**Solution:**
- Verify CORS settings in `server/index.js`
- Check that the API base URL is correctly configured
- Ensure environment variables are set in Azure

### Check Logs:

```bash
# View Azure Web App logs
az webapp log tail --name aegis-ao-rental-web --resource-group aegis-ao-rental

# Or in Azure Portal:
# Go to your Web App → Log stream
```

### View Deployment Logs:
Go to GitHub → Actions → Select workflow → View logs

## 🎉 Success Checklist

- [ ] Azure service principal created
- [ ] GitHub secret `AZURE_CREDENTIALS` added
- [ ] Workflow file created in `.github/workflows/deploy-git.yml`
- [ ] Code pushed to GitHub
- [ ] Deployment triggered automatically
- [ ] App accessible at Azure URL
- [ ] Health check passing (`/api/health`)
- [ ] Static files loading
- [ ] API routes working
- [ ] Database connection working (if applicable)

## 📝 Environment Variables

The following environment variables should be set in Azure Web App Configuration:

**Required:**
- `NODE_ENV` = `production`
- `PORT` = `8080`

**Optional (for API connection):**
- `API_BASE_URL` = Your backend API URL (e.g., `https://your-api.azurewebsites.net/api`)
- `JWT_SECRET` = Your JWT secret key
- Database connection strings

## 🔗 Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure Web Apps Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Azure Web Apps Deploy Action](https://github.com/Azure/webapps-deploy)
- [Node.js on Azure](https://docs.microsoft.com/en-us/azure/app-service/quickstart-nodejs)

## 🆘 Support

If you encounter issues:
1. Check GitHub Actions logs
2. Check Azure Web App logs
3. Verify all secrets are correctly set
4. Ensure application settings are correct
5. Verify the resource group and app name in the workflow file

