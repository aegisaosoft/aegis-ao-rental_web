# Quick Fix: SSL Certificate Still Not Working on Azure

## Immediate Steps to Check

### 1. Verify Custom Domain is Configured

In Azure Portal:
1. Go to **aegis-rental-web** App Service
2. **Settings** → **Custom domains**
3. Check if `www.aegis-rental.com` shows:
   - ✅ **Status**: "Ready" or "Enabled"
   - ✅ **Certificate**: Should show a certificate name
   - ❌ If it shows "Not Secure" or no certificate, continue to Step 2

### 2. Check Certificate Status

1. In **Custom domains**, click on `www.aegis-rental.com`
2. Look at **TLS/SSL binding** section
3. You should see:
   - A certificate listed
   - Status: "Enabled" or "Valid"
4. If no certificate or status is "Pending":
   - Certificate may still be provisioning (wait 10-15 minutes)
   - Or certificate creation failed

### 3. Create/Bind Certificate (If Missing)

**Option A: Using Azure Portal UI**

1. **Custom domains** → Click `www.aegis-rental.com`
2. Click **Add binding** (if no binding exists)
3. Select:
   - **Domain**: `www.aegis-rental.com`
   - **Private certificate**: Choose "Create App Service Managed Certificate"
   - **TLS/SSL type**: `SNI SSL`
4. Click **Add binding**
5. Wait 10-15 minutes

**Option B: Using Azure CLI (Faster)**

```bash
# Login to Azure
az login

# Set variables
RESOURCE_GROUP="<your-resource-group>"
APP_NAME="aegis-rental-web"
DOMAIN="www.aegis-rental.com"

# Create managed certificate
az webapp config ssl create \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --hostname $DOMAIN

# Bind the certificate
az webapp config ssl bind \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

### 4. Verify DNS Configuration

The domain must have correct DNS records:

```bash
# Check CNAME record
nslookup www.aegis-rental.com

# Should return your Azure App Service hostname
# Example: aegis-rental-web-gvcxbpccfncfbjh4.canadacentral-01.azurewebsites.net
```

**If DNS is incorrect:**
1. Go to your domain registrar (where you bought aegis-rental.com)
2. Add/Update CNAME record:
   - **Name**: `www`
   - **Value**: `aegis-rental-web-gvcxbpccfncfbjh4.canadacentral-01.azurewebsites.net` (check Azure for exact value)
   - **TTL**: 3600 (or default)

### 5. Enable HTTPS Redirect

1. **Settings** → **TLS/SSL settings**
2. Toggle **HTTPS Only** to **On**
3. **Save**
4. **Restart** the App Service

### 6. Clear Browser HSTS Cache

If you've visited the site before, browsers cache HSTS:

**Chrome:**
1. Go to: `chrome://net-internals/#hsts`
2. Enter: `www.aegis-rental.com`
3. Click **"Delete domain security policies"**
4. Try accessing the site again

**Firefox:**
1. Type in address bar: `about:config`
2. Search for: `security.tls.insecure_fallback_hosts`
3. Add: `www.aegis-rental.com`

### 7. Check Certificate Details

After certificate is bound, verify:

1. Go to **Settings** → **TLS/SSL settings** → **Private Key Certificates**
2. Find the certificate for your domain
3. Check:
   - **Status**: Should be "Issued"
   - **Thumbprint**: Should exist
   - **Expiration**: Should show future date

## Common Issues & Solutions

### Issue: "Certificate creation failed"

**Causes:**
- DNS not properly configured
- Domain not verified
- Azure can't reach domain for validation

**Solution:**
1. Verify DNS CNAME is correct (Step 4)
2. Wait 1-2 hours for DNS propagation
3. Try creating certificate again

### Issue: "Certificate still pending after 20 minutes"

**Solution:**
1. Check Azure status page for issues
2. Try deleting and recreating the certificate
3. Contact Azure support if persists

### Issue: "Certificate works but shows as insecure"

**Solution:**
1. Clear browser cache
2. Check certificate chain is complete
3. Verify minimum TLS version (should be 1.2)

### Issue: "HSTS error won't go away"

**Solution:**
1. Clear HSTS (Step 6)
2. Wait 24 hours (HSTS can cache for a day)
3. Use incognito/private mode to test
4. Try different browser

## Verify SSL is Working

After configuration:

1. **Test certificate:**
   ```bash
   curl -I https://www.aegis-rental.com
   ```

2. **Online SSL checker:**
   - Visit: https://www.ssllabs.com/ssltest/analyze.html?d=www.aegis-rental.com
   - Should show grade A or better

3. **Browser test:**
   - Visit: `https://www.aegis-rental.com`
   - Should show green lock icon
   - No certificate warnings

## Still Not Working?

If SSL certificate issue persists after trying all steps:

1. **Check Azure Status:**
   - Go to Azure Portal → **Service Health**
   - Check for any ongoing issues

2. **Review App Service Logs:**
   - **Log stream** in Azure Portal
   - Look for SSL/TLS errors

3. **Alternative: Use Azure DNS**
   - If using external DNS, consider Azure DNS for better integration

4. **Contact Azure Support:**
   - If certificate creation keeps failing
   - Azure support can verify domain configuration

## Quick Checklist

- [ ] Custom domain added to Azure App Service
- [ ] DNS CNAME record points to Azure hostname
- [ ] SSL certificate created (App Service Managed Certificate)
- [ ] Certificate bound to custom domain
- [ ] HTTPS Only enabled
- [ ] App Service restarted
- [ ] Browser HSTS cache cleared
- [ ] Tested in incognito/private mode

## Expected Timeline

- **DNS Propagation**: 1-48 hours (usually 1-2 hours)
- **Certificate Provisioning**: 5-15 minutes
- **Total**: Should work within 30 minutes of correct setup

