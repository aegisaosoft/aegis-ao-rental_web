# Azure Images Diagnostic Guide

## Problem: Images Not Showing on Azure

If images are not displaying on `www.aegis-rental.com`, follow these steps:

## Step 1: Check Azure Log Stream

1. Go to Azure Portal → **aegis-rental-web** App Service
2. Navigate to **Log stream**
3. Look for `[Model Image]` log messages when you try to load a page
4. Check what paths are being checked and what errors occur

## Step 2: Verify Images Are Deployed

### Option A: Using Azure Kudu Console

1. Go to: `https://aegis-rental-web.scm.azurewebsites.net`
2. Click **Debug console** → **CMD** or **PowerShell**
3. Navigate to: `site/wwwroot/public/models`
4. Check if PNG files are there:
   ```bash
   dir site\wwwroot\public\models\*.png
   ```
5. Should show files like `HONDA_CIVIC.png`, `TOYOTA_COROLLA.png`, etc.

### Option B: Using Browser

1. Try to access an image directly:
   ```
   https://www.aegis-rental.com/api/models/HONDA_CIVIC.png
   ```
2. If you get 404, images aren't deployed
3. If you get an error, check server logs

## Step 3: Check Deployment Logs

1. Go to GitHub → **Actions**
2. Find the latest deployment
3. Check the **"Copy client build to server public"** step
4. Look for:
   - `✅ Models folder exists with X PNG images`
   - If it shows 0 images, the copy failed

## Step 4: Manual Fix - Redeploy

If images are missing:

1. **Trigger a new deployment:**
   ```bash
   git commit --allow-empty -m "Trigger deployment to include model images"
   git push
   ```

2. **Wait for deployment to complete** (check GitHub Actions)

3. **Restart Azure App Service:**
   - Azure Portal → App Service → **Overview** → **Restart**

## Step 5: Verify Image Path in Code

The frontend should use `/api/models/` in production. Check browser console:

1. Open DevTools (F12) → **Console**
2. Look for 404 errors when loading images
3. Check Network tab → Filter by "models"
4. See what URL it's trying to load

Expected: `https://www.aegis-rental.com/api/models/MAKE_MODEL.png`

## Step 6: Test Image Endpoint Directly

Try accessing these URLs directly in browser:

- `https://www.aegis-rental.com/api/models/HONDA_CIVIC.png`
- `https://www.aegis-rental.com/api/models/TOYOTA_COROLLA.png`

**Expected Results:**
- ✅ **200 OK** = Image exists and is served correctly
- ❌ **404 Not Found** = Image not deployed or wrong path
- ❌ **500 Error** = Server error (check logs)

## Step 7: Check Server Configuration

Verify the server is looking in the right place:

In Azure Log Stream, when you access an image, you should see:
```
[Model Image] Serving from server: /home/site/wwwroot/public/models/HONDA_CIVIC.png
```

If you see:
```
[Model Image] Models directory does not exist: /home/site/wwwroot/public/models
```

Then images weren't copied during deployment.

## Common Issues & Solutions

### Issue: Images Show as Broken (Red X)

**Cause:** Images are deployed but path is wrong

**Solution:**
1. Check browser Network tab - what URL is being requested?
2. Verify server route `/api/models/:filename` is working
3. Check server logs for path resolution errors

### Issue: All Images Return 404

**Cause:** Images not deployed or in wrong location

**Solution:**
1. Verify deployment included images (Step 3)
2. Check Kudu console for files (Step 2)
3. Redeploy if missing

### Issue: Some Images Work, Others Don't

**Cause:** Filename mismatch or missing files

**Solution:**
1. Check the exact filename format:
   - Should be: `MAKE_MODEL.png` (uppercase, underscores)
   - Example: `HONDA_CIVIC.png`, not `honda_civic.png`
2. Verify the image file exists in `client/public/models/`
3. Check if filename matches what code is requesting

## Quick Diagnostic Script

If you have access to Azure Kudu:

```bash
# Navigate to site root
cd site/wwwroot

# Check if public folder exists
ls -la public/

# Check if models folder exists
ls -la public/models/

# Count PNG files
ls -1 public/models/*.png | wc -l

# List first 10 files
ls -1 public/models/*.png | head -10

# Check server index.js location
ls -la index.js

# Check __dirname would resolve to
pwd
```

## Force Redeploy with Images

If images are definitely missing:

1. **Verify local files exist:**
   ```bash
   # Should show 100+ PNG files
   ls client/public/models/*.png | wc -l
   ```

2. **Commit and push:**
   ```bash
   git add .
   git commit -m "Ensure model images are included in deployment"
   git push
   ```

3. **Monitor GitHub Actions** to see if images are copied

4. **Wait for deployment**, then restart Azure App Service

5. **Test:** Visit `https://www.aegis-rental.com` and check images

## Expected File Count

You should have approximately **100-117 PNG files** in:
- `client/public/models/*.png` (source)
- `server/public/models/*.png` (after copy, before deploy)
- `site/wwwroot/public/models/*.png` (on Azure)

If the count doesn't match, the copy step failed.

