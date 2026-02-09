# HEIC Conversion Integration - Installation Guide

This guide provides instructions for integrating HEIC (High Efficiency Image Container) conversion support into the Car Rental application.

## Overview

The HEIC conversion system provides automatic client-side and server-side fallback conversion of HEIC/HEIF files (iPhone photos) to JPEG/PNG format for license photo uploads.

### Features

- **Client-side conversion**: Fast conversion using `heic2any` library
- **Server-side fallback**: Uses Sharp library via Node.js service if client conversion fails
- **Automatic detection**: Detects HEIC files by MIME type and extension
- **Progress tracking**: Real-time conversion progress with visual feedback
- **Error handling**: Comprehensive error handling with user-friendly messages
- **Mobile optimization**: Optimized for mobile photo uploads

## Installation Steps

### 1. Client-side Dependencies

Install the required npm packages:

```bash
cd client
npm install heic2any@1.0.4
npm install --save-dev @types/heic2any
```

### 2. Server-side Dependencies

Install Sharp for HEIC conversion:

```bash
cd server
npm install sharp@0.32.6
npm install multer@1.4.5-lts.1  # If not already installed
```

**Important**: Sharp version 0.32.6+ is required for HEIC support.

### 3. Files Already Copied

The following files have been copied to your project:

#### Client-side (TypeScript):
- `client/src/shared/utils/heicTypes.ts` - Type definitions
- `client/src/shared/utils/heicValidation.ts` - File validation utilities
- `client/src/shared/utils/heicConverter.ts` - Main conversion logic
- `client/src/shared/services/heicApi.ts` - API service for server conversion

#### Server-side (Node.js):
- `server/shared/utils/heicTypes.js` - Server type utilities
- `server/shared/services/heicConverter.js` - Sharp-based conversion service
- `server/shared/middleware/heicMiddleware.js` - Express middleware

#### C# Controller:
- `CarRental.Api/Controllers/HeicController.cs` - C# API endpoints (delegates to Node.js)

#### Example Component:
- `client/src/components/common/HeicIntegratedLicenseUploader.jsx` - Enhanced uploader with HEIC support

## Integration Examples

### 1. Replace Existing License Photo Uploader

Replace your existing license photo uploader with the HEIC-integrated version:

```jsx
// Old import
// import { LicensePhotoSingle } from './common/LicensePhotoUploader';

// New import
import HeicIntegratedLicenseUploader from './common/HeicIntegratedLicenseUploader';

// Usage
<HeicIntegratedLicenseUploader
  side="front"
  imageUrl={frontImageUrl}
  onUpload={handleFrontUpload}
  onDelete={handleFrontDelete}
  conversionConfig={{ quality: 0.85, format: 'image/jpeg' }}
  maxSize={8 * 1024 * 1024} // 8MB
/>
```

### 2. Add HEIC Conversion to Existing Components

For existing file input handlers:

```jsx
import { convertHeicWithFallback } from '../shared/utils/heicConverter';
import { isHeicFile } from '../shared/utils/heicValidation';

const handleFileUpload = async (file) => {
  try {
    let finalFile = file;

    // Convert HEIC if needed
    if (isHeicFile(file)) {
      const result = await convertHeicWithFallback(file, {
        quality: 0.85,
        format: 'image/jpeg'
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      finalFile = result.file;
    }

    // Continue with upload
    await uploadFile(finalFile);
  } catch (error) {
    console.error('Upload failed:', error);
    // Handle error
  }
};
```

## Server Setup

### 1. Add Routes (Express.js)

If using Node.js server directly, add these routes:

```javascript
const multer = require('multer');
const { heicConversionRoute, heicSupportRoute, heicStatsRoute } = require('./shared/middleware/heicMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// HEIC conversion routes
app.post('/api/heic/convert', upload.single('file'), heicConversionRoute());
app.get('/api/heic/support', heicSupportRoute());
app.get('/api/heic/stats', heicStatsRoute());
```

### 2. Add Middleware to Existing Upload Routes

Automatically convert HEIC files in existing routes:

```javascript
const { heicMiddleware } = require('./shared/middleware/heicMiddleware');

// Add to existing file upload routes
app.post('/api/upload/license',
  upload.single('file'),
  heicMiddleware({ enableStats: true }),  // Add this line
  (req, res) => {
    // req.file will now have converted JPEG instead of HEIC
    // ... existing logic
  }
);
```

## Configuration

### Environment Variables

Set up the Node.js service URL for C# controller:

```bash
# .env or environment
NODE_HEIC_SERVICE_URL=http://localhost:3001
```

### Conversion Settings

Default configuration in `heicTypes.js`:

```javascript
const DEFAULT_CONFIG = {
  quality: 85,           // JPEG quality (10-100)
  maxSize: 20971520,     // 20MB max file size
  outputFormat: 'jpeg',  // 'jpeg' | 'png' | 'webp'
  enableStats: false     // Enable conversion statistics
};
```

## Testing

### Test HEIC Support

Check if server supports HEIC conversion:

```bash
curl http://localhost:3000/api/heic/support
```

Expected response:
```json
{
  "supported": true,
  "sharpVersion": "0.32.6",
  "libvipsVersion": "8.14.5"
}
```

### Test Conversion

Upload a HEIC file:

```bash
curl -X POST -F "file=@test.heic" -F "quality=85" -F "format=image/jpeg" \
     http://localhost:3000/api/heic/convert \
     --output converted.jpg
```

## Troubleshooting

### Common Issues

1. **Sharp installation fails**:
   ```bash
   npm install --platform=linux --arch=x64 sharp
   ```

2. **HEIC files not detected**:
   - Ensure file extensions include `.heic` and `.heif`
   - Check MIME type handling in your server

3. **Client conversion fails**:
   - Browser compatibility issue with `heic2any`
   - Falls back to server conversion automatically

4. **Server conversion fails**:
   - Check Sharp installation and HEIC support
   - Verify libvips has HEIF support

### Debug Logging

Enable detailed logging:

```javascript
// In heicMiddleware options
const middleware = heicMiddleware({
  enableStats: true,
  onSuccess: (original, converted, stats) => {
    console.log('HEIC conversion success:', stats);
  },
  onError: (error, req, res) => {
    console.error('HEIC conversion error:', error);
  }
});
```

## Performance Notes

- Client-side conversion is faster but may fail on older browsers
- Server-side conversion is more reliable but uses CPU resources
- Consider caching converted files to avoid repeated conversions
- Monitor conversion statistics for performance optimization

## Security Considerations

- File size limits are enforced (default 20MB)
- File type validation prevents non-image uploads
- Converted files are temporary and should be cleaned up
- Consider virus scanning for uploaded files

## Browser Support

### Client-side (heic2any):
- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

### Fallback:
- All browsers (uses server conversion)

## License

This HEIC conversion integration is part of the Car Rental application and follows the same licensing terms.

Copyright (c) 2025 Alexander Orlov.