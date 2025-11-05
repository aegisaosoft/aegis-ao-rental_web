const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const router = express.Router();

// Configure multer to store in memory (we will forward/process buffer)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Get license key from environment
const BLINKID_LICENSE_KEY = process.env.BLINKID_LICENSE_KEY || process.env.REACT_APP_BLINKID_LICENSE_KEY || '';

// POST /api/license/validate
// Accepts multipart/form-data with field: file
router.post('/validate', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file || !file.buffer || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Invalid or missing image' });
    }

    if (!BLINKID_LICENSE_KEY) {
      console.warn('[License] BlinkID license key not configured');
      return res.status(501).json({ 
        isValid: false,
        message: 'BlinkID license key not configured on server',
        error: 'LICENSE_KEY_MISSING'
      });
    }

    console.log('[License] Processing license image with BlinkID, size:', file.buffer.length, 'bytes');

    // Try to use BlinkID Cloud API or process locally
    // Note: The in-browser SDK may not work in Node.js, so we'll try Cloud API approach
    try {
      // Option 1: Try BlinkID Cloud API (if available)
      // The Cloud API endpoint would typically be something like:
      // https://api.microblink.com/v1/blinkid/recognize
      
      // For now, we'll use a direct approach with the license key
      // Since the exact API endpoint structure may vary, we'll implement a flexible solution
      
      const formData = new FormData();
      formData.append('image', file.buffer, {
        filename: file.originalname || 'license.jpg',
        contentType: file.mimetype
      });
      formData.append('licenseKey', BLINKID_LICENSE_KEY);

      // Try BlinkID Cloud API endpoint
      // Note: Adjust the endpoint URL based on Microblink's actual API documentation
      const blinkidApiUrl = process.env.BLINKID_API_URL || 'https://api.microblink.com/v1/blinkid/recognize';
      
      console.log('[License] Calling BlinkID API:', blinkidApiUrl);
      
      const response = await axios.post(blinkidApiUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${BLINKID_LICENSE_KEY}` // Alternative auth method if needed
        },
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      if (response.data && response.data.result) {
        const result = response.data.result;
        console.log('[License] BlinkID recognition successful');
        
        // Map BlinkID result to our format
        const parsedData = {
          licenseNumber: result.number || result.documentNumber || result.licenseNumber,
          firstName: result.firstName || result.firstname,
          lastName: result.lastName || result.lastname,
          issuingState: result.jurisdiction || result.state || result.issuingState,
          issuingCountry: result.country || result.issuingCountry || 'US',
          expirationDate: result.dateOfExpiry ? formatDate(result.dateOfExpiry) : null,
          issueDate: result.dateOfIssue ? formatDate(result.dateOfIssue) : null,
          address: result.address || result.addressLine1,
          city: result.city,
          state: result.state || result.addressState,
          postalCode: result.postalCode || result.zip,
          country: result.country || 'US',
          sex: result.sex || result.gender,
          height: result.height,
          eyeColor: result.eyeColor,
          dateOfBirth: result.dateOfBirth ? formatDate(result.dateOfBirth) : null
        };

        return res.json({
          isValid: true,
          data: parsedData,
          raw: result // Include raw result for debugging
        });
      } else {
        throw new Error('Invalid response from BlinkID API');
      }
    } catch (apiError) {
      console.error('[License] BlinkID API error:', apiError.message);
      console.error('[License] Error details:', {
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data
      });

      // If API call fails, return 501 to indicate it's not fully implemented
      // This allows the client to handle gracefully
      if (apiError.response?.status === 404 || apiError.code === 'ENOTFOUND') {
        return res.status(501).json({
          isValid: false,
          message: 'BlinkID API endpoint not found. Please configure BLINKID_API_URL or use client-side SDK.',
          error: 'API_ENDPOINT_NOT_FOUND',
          hint: 'The BlinkID Cloud API endpoint may need to be configured in environment variables'
        });
      }

      // For other errors, return 501 with details
      return res.status(501).json({
        isValid: false,
        message: 'BlinkID OCR processing failed. Please use client-side SDK or configure Cloud API.',
        error: 'PROCESSING_FAILED',
        details: apiError.message
      });
    }
  } catch (e) {
    console.error('[License] Validation error:', e);
    return res.status(500).json({ 
      message: 'Validation failed',
      error: e.message
    });
  }
});

// Helper function to format dates from BlinkID result
function formatDate(dateObj) {
  if (!dateObj) return null;
  
  // Handle different date formats from BlinkID
  if (typeof dateObj === 'string') {
    return dateObj;
  }
  
  if (dateObj.year && dateObj.month && dateObj.day) {
    const year = dateObj.year;
    const month = String(dateObj.month).padStart(2, '0');
    const day = String(dateObj.day).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

module.exports = router;


