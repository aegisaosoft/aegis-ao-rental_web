# Azure Custom Domain SSL Certificate Setup

## Problem: ERR_CERT_COMMON_NAME_INVALID

When accessing `www.aegis-rental.com`, you get:
- "Your connection is not private"
- `ERR_CERT_COMMON_NAME_INVALID`
- HSTS error preventing access

This happens because the custom domain doesn't have an SSL certificate bound to it.

## Solution: Configure SSL Certificate in Azure

### Step 1: Verify Custom Domain is Added

1. Go to Azure Portal → Your App Service (`aegis-rental-web`)
2. Navigate to **Settings** → **Custom domains**
3. Verify `www.aegis-rental.com` is listed
4. If not, click **Add custom domain** and add it:
   - For `www.aegis-rental.com`, you need a CNAME record pointing to your Azure App Service
   - Azure will provide the exact CNAME value (e.g., `aegis-rental-web-gvcxbpccfncfbjh4.canadacentral-01.azurewebsites.net`)

### Step 2: Add App Service Managed Certificate (Easiest - FREE)

This is the recommended method as it's free and automatically renews.

1. In Azure Portal → Your App Service → **Settings** → **Custom domains**
2. Find your domain (`www.aegis-rental.com`)
3. Click **Add binding** or the domain name
4. In the **TLS/SSL settings** tab:
   - Click **Add TLS/SSL binding**
   - Select:
     - **Domain**: `www.aegis-rental.com`
     - **Certificate Source**: `Create App Service Managed Certificate`
     - **TLS/SSL type**: `SNI SSL` (recommended, free)
   - Click **Add**
5. Wait 5-10 minutes for Azure to provision the certificate

### Step 3: Enable HTTPS Only

1. Go to **Settings** → **TLS/SSL settings**
2. Toggle **HTTPS Only** to **On**
3. Save

### Step 4: Configure Minimum TLS Version

1. In **TLS/SSL settings**
2. Set **Minimum TLS Version** to `1.2` (recommended)
3. Save

### Step 5: Restart App Service

1. Go to **Overview**
2. Click **Restart**
3. Wait for restart to complete

## Alternative: Upload Your Own Certificate

If you have your own SSL certificate:

1. Go to **Settings** → **TLS/SSL settings** → **Private Key Certificates (.pfx)**
2. Click **Upload Certificate**
3. Upload your `.pfx` file and enter the password
4. Then bind it to your custom domain:
   - Go to **Custom domains**
   - Click **Add binding**
   - Select your domain and the uploaded certificate

## Verify SSL is Working

After 5-10 minutes:

1. Visit `https://www.aegis-rental.com`
2. Check the browser lock icon - should show as secure
3. You can test SSL certificate using:
   - https://www.ssllabs.com/ssltest/analyze.html?d=www.aegis-rental.com
   - https://www.check-your-website.net/ssl-checker/www.aegis-rental.com

## Troubleshooting

### Certificate Still Not Working After 10 Minutes

1. Check certificate status in **Custom domains**:
   - Status should be "Enabled" and show a green checkmark
   - If it shows "Pending" or error, wait longer or check DNS settings

2. Verify DNS Records:
   ```bash
   # Check CNAME record
   nslookup www.aegis-rental.com
   
   # Should show your Azure App Service hostname
   ```

3. Clear Browser Cache:
   - Chrome: Ctrl+Shift+Delete → Clear cached images and files
   - Try incognito/private mode

### HSTS Error Persists

If HSTS error persists after certificate is bound:

1. **Clear HSTS for the domain** (Chrome):
   - Go to `chrome://net-internals/#hsts`
   - Enter `www.aegis-rental.com` in "Delete domain security policies"
   - Click "Delete"

2. **Wait 24 hours**: HSTS can take up to 24 hours to clear naturally

3. **Try different browser**: Test in Firefox or Edge to confirm certificate works

### Certificate Not Provisioning

If App Service Managed Certificate fails:

1. Verify DNS is correctly configured:
   - CNAME must point to Azure App Service
   - DNS propagation can take up to 48 hours

2. Check domain verification:
   - Azure needs to verify domain ownership
   - Ensure no other verification records conflict

3. Contact your domain registrar if DNS issues persist

## Azure CLI Method

You can also configure via CLI:

```bash
# Enable HTTPS only
az webapp update \
  --name aegis-rental-web \
  --resource-group <your-resource-group> \
  --https-only true

# Set minimum TLS version
az webapp config set \
  --name aegis-rental-web \
  --resource-group <your-resource-group> \
  --min-tls-version 1.2

# Create and bind managed certificate (if supported)
az webapp config ssl create \
  --name aegis-rental-web \
  --resource-group <your-resource-group> \
  --hostname www.aegis-rental.com
```

## Important Notes

- **App Service Managed Certificates** are FREE and auto-renew
- **SNI SSL** is free and supports multiple domains
- **IP SSL** requires a dedicated IP and costs extra
- Certificate provisioning can take **5-10 minutes**
- DNS changes can take **up to 48 hours** to propagate globally

## Next Steps After SSL is Configured

1. Test the site: `https://www.aegis-rental.com`
2. Verify all pages load over HTTPS
3. Update any hardcoded HTTP URLs in your code to HTTPS
4. Enable HTTP to HTTPS redirect (via **HTTPS Only** setting)

