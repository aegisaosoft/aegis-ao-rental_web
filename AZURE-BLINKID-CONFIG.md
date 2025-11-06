# Azure BlinkID License Keys Configuration

## Overview
This guide explains how to configure BlinkID license keys in Azure for production deployment.

## Environment Variables to Set in Azure

### For Azure Static Web Apps or App Service

1. Go to Azure Portal
2. Navigate to your Static Web App or App Service
3. Go to **Configuration** → **Application settings** (or **Environment variables**)
4. Click **"+ New application setting"** or **"+ Add"**

Add the following environment variables:

| Name | Value | Description |
|------|-------|-------------|
| `REACT_APP_BLINKID_LICENSE_KEY` | `sRwCABBjb20uYWVnaXMucmVudGFsBmxleUpEY21WaGRHVmtUMjRpT2pFM05qRTRNRGN5TURZeU9UUXNJa055WldGMFpXUkdiM0lpT2lKbVlXWXhaRGN4TlMwek5UQTFMVFF4TkRRdE9UQmpZeTFpWmpneE0yRTJOMkl5TWpRaWZRPT3PE3dDj0ZUHIeC9vbn10GDKkj9x4zVSa7WHoKMKudQR99hCgI2iPzVJyh5py+XteEsROSg82cBgSKOhP2g1RGKNZsZwDAGfbnSvn1/2VFD13IdXg4FfmGwOGcexQvi` | In-browser license key (default) |
| `REACT_APP_BLINKID_LICENSE_KEY_IOS` | `sRwCABBjb20uYWVnaXMucmVudGFsAWxleUpEY21WaGRHVmtUMjRpT2pFM05qRTRNRFU1TmpNM01ETXNJa055WldGMFpXUkdiM0lpT2lKbVlXWXhaRGN4TlMwek5UQTFMVFF4TkRRdE9UQmpZeTFpWmpneE0yRTJOMkl5TWpRaWZRPT0Trkh59Ptu0TmYmMtFGcyPjVAYo82JBiigJvGi/yaIYxoC/u52vL4OVSFRCL55j9Cb8VZRGARz7H0vt2N5hOhsxOb26DrLGiW9fp95iislTZIf6jYVglFHAh86Q0ou` | iOS-specific license key |
| `REACT_APP_BLINKID_LICENSE_KEY_ANDROID` | `sRwCABBjb20uYWVnaXMucmVudGFsAGxleUpEY21WaGRHVmtUMjRpT2pFM05qRTRNRFU1TmpNM05URXNJa055WldGMFpXUkdiM0lpT2lKbVlXWXhaRGN4TlMwek5UQTFMVFF4TkRRdE9UQmpZeTFpWmpneE0yRTJOMkl5TWpRaWZRPT1XsyXuJCnegWL4+6bdiTJHhulIipn3EouE9ubYmsQ/olYD4Wn+84IKGbCRVEVXF1HqQzVOGTraIQULPMtUfHCOzBH7VJNI8oqLmIomXm2czDAyhfdx95Fiu5XRgXnF` | Android-specific license key |

5. Click **"Save"**
6. Restart your application (if required)

## Important Notes

### For Azure Static Web Apps
- Environment variables must be prefixed with `REACT_APP_` for Create React App
- These variables are baked into the build at build time
- You may need to trigger a new build after adding/changing variables

### For Azure App Service
- Environment variables are available at runtime
- You can set them in Azure Portal → Configuration → Application settings
- Changes require a restart of the app service

### Build-Time vs Runtime
- **Create React App** embeds environment variables at build time
- If you're using Azure Static Web Apps, you must set these variables before building
- For Azure App Service with runtime builds, variables are available during build

## Verification

After setting the environment variables:

1. **Trigger a new build/deployment**
2. **Check the browser console** for BlinkID initialization messages
3. **Test license scanning** to ensure it works

## Troubleshooting

### License key not working
- Verify the environment variable names are exactly as shown (case-sensitive)
- Ensure the `REACT_APP_` prefix is present
- Check that the values were copied completely (no truncation)
- Restart the app service after changes

### Build-time embedding
If using Azure Static Web Apps, you may need to:
1. Set the variables in Azure Portal
2. Trigger a new build via GitHub Actions
3. The build process will embed these variables into the React app

## Alternative: Build with Environment Variables

If you prefer to build locally with environment variables:

```powershell
# Set environment variables
$env:REACT_APP_BLINKID_LICENSE_KEY="sRwCABBjb20uYWVnaXMucmVudGFsBmxleUpEY21WaGRHVmtUMjRpT2pFM05qRTRNRGN5TURZeU9UUXNJa055WldGMFpXUkdiM0lpT2lKbVlXWXhaRGN4TlMwek5UQTFMVFF4TkRRdE9UQmpZeTFpWmpneE0yRTJOMkl5TWpRaWZRPT3PE3dDj0ZUHIeC9vbn10GDKkj9x4zVSa7WHoKMKudQR99hCgI2iPzVJyh5py+XteEsROSg82cBgSKOhP2g1RGKNZsZwDAGfbnSvn1/2VFD13IdXg4FfmGwOGcexQvi"
$env:REACT_APP_BLINKID_LICENSE_KEY_IOS="sRwCABBjb20uYWVnaXMucmVudGFsAWxleUpEY21WaGRHVmtUMjRpT2pFM05qRTRNRFU1TmpNM01ETXNJa055WldGMFpXUkdiM0lpT2lKbVlXWXhaRGN4TlMwek5UQTFMVFF4TkRRdE9UQmpZeTFpWmpneE0yRTJOMkl5TWpRaWZRPT0Trkh59Ptu0TmYmMtFGcyPjVAYo82JBiigJvGi/yaIYxoC/u52vL4OVSFRCL55j9Cb8VZRGARz7H0vt2N5hOhsxOb26DrLGiW9fp95iislTZIf6jYVglFHAh86Q0ou"
$env:REACT_APP_BLINKID_LICENSE_KEY_ANDROID="sRwCABBjb20uYWVnaXMucmVudGFsAGxleUpEY21WaGRHVmtUMjRpT2pFM05qRTRNRFU1TmpNM05URXNJa055WldGMFpXUkdiM0lpT2lKbVlXWXhaRGN4TlMwek5UQTFMVFF4TkRRdE9UQmpZeTFpWmpneE0yRTJOMkl5TWpRaWZRPT1XsyXuJCnegWL4+6bdiTJHhulIipn3EouE9ubYmsQ/olYD4Wn+84IKGbCRVEVXF1HqQzVOGTraIQULPMtUfHCOzBH7VJNI8oqLmIomXm2czDAyhfdx95Fiu5XRgXnF"

# Build
cd client
npm run build
```

Then deploy the `build` folder to Azure.

