# Azure Deployment Setup Guide

## Using Publish Profile (Basic Authentication) - RECOMMENDED

The workflow is configured to use **publish profile** which uses basic authentication. This is the simplest method.

## Step-by-Step Setup

1. **Get Publish Profile from Azure Portal:**
   - Go to your Azure Web App: `aegis-ao-rental-web`
   - Click **"Get publish profile"** button
   - Download the `.PublishSettings` file
   - Open it in a text editor and copy the entire content

2. **Add to GitHub Secrets:**
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click **"New repository secret"**
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Value: Paste the entire content from the `.PublishSettings` file
   - Click **"Add secret"**

3. **Configure App Settings in Azure Portal (One-time setup):**
   
   **General Settings:**
   - Go to Azure Portal → Your Web App → **Configuration** → **General settings**
   - Set **Startup Command**: `node server/index.js`
   - Set **Stack**: `Node.js`
   - Set **Major Version**: `20 LTS`
   - Click **Save**
   
   **Application Settings:**
   - Go to **Configuration** → **Application settings**
   - Click **+ New application setting** for each:
     - `NODE_ENV` = `production`
     - `SCM_DO_BUILD_DURING_DEPLOYMENT` = `true`
     - `ENABLE_ORYX_BUILD` = `true`
     - `WEBSITE_NODE_DEFAULT_VERSION` = `~20`
     - `PORT` = `8080` (usually set automatically by Azure)
     - `API_BASE_URL` = Your C# API URL (e.g., `https://aegis-ao-rentals-xxx.azurewebsites.net`)
   - Click **Save**

4. **Push to GitHub:**
   Once the secret is added, push your code to trigger the deployment automatically!

## Alternative: Service Principal (If you prefer not to use publish profile)

If you prefer to use service principal:

1. **Create Service Principal:**
   ```bash
   az login
   az ad sp create-for-rbac --name "aegis-ao-rental-sp" \
     --role contributor \
     --scopes /subscriptions/{subscription-id}/resourceGroups/aegis-ao-rental \
     --output json
   ```

2. **Add Individual Secrets to GitHub:**
   - `AZURE_CLIENT_ID` - from the JSON output
   - `AZURE_TENANT_ID` - from the JSON output
   - `AZURE_SUBSCRIPTION_ID` - your Azure subscription ID
   - `AZURE_CLIENT_SECRET` - from the JSON output (create a secret in Azure AD)

3. **Update Workflow:**
   Change the login step to:
   ```yaml
   - name: Login to Azure
     uses: azure/login@v2
     with:
       client-id: ${{ secrets.AZURE_CLIENT_ID }}
       tenant-id: ${{ secrets.AZURE_TENANT_ID }}
       subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
       client-secret: ${{ secrets.AZURE_CLIENT_SECRET }}
   ```

### Option 3: Service Principal with JSON Credentials

1. **Create Service Principal and get JSON:**
   ```bash
   az login
   az ad sp create-for-rbac --name "aegis-ao-rental-sp" \
     --role contributor \
     --scopes /subscriptions/{subscription-id}/resourceGroups/aegis-ao-rental \
     --sdk-auth --output json
   ```

2. **Add JSON to GitHub Secrets:**
   - Name: `AZURE_CREDENTIALS`
   - Value: Paste the entire JSON output

3. **The workflow will use:**
   ```yaml
   - name: Login to Azure
     uses: azure/login@v2
     with:
       creds: ${{ secrets.AZURE_CREDENTIALS }}
   ```

## Recommended: Use Publish Profile

The publish profile method is **simplest** and **most reliable** for Azure Web Apps. The workflow is already configured for it.

Just:
1. Download publish profile from Azure Portal
2. Add it to GitHub secrets as `AZURE_WEBAPP_PUBLISH_PROFILE`
3. Manually configure the startup command and app settings in Azure Portal (one-time setup)

