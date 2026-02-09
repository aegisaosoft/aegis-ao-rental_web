const express = require('express');
const multer = require('multer');
const axios = require('axios');
const router = express.Router();

// Configure multer to store in memory for Document AI processing
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// Import Google Cloud Document AI (when credentials are configured)
let documentAI = null;
try {
  const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
  documentAI = DocumentProcessorServiceClient;
  console.log('[License] Google Cloud Document AI SDK loaded successfully');
} catch (err) {
  console.warn('[License] Google Cloud Document AI SDK not available:', err.message);
}

// POST /api/license/validate-front-side
// Process front side of driver license with Google Cloud Document AI
router.post('/validate-front-side', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file || !file.buffer || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Invalid or missing image' });
    }

    console.log('[License] Processing front side with Document AI, size:', file.buffer.length, 'bytes');

    // Process with Google Cloud Document AI
    const documentAiResult = await processWithDocumentAI(file.buffer, file.mimetype);

    return res.json({
      success: documentAiResult.success,
      data: documentAiResult.data,
      extractedText: documentAiResult.extractedText,
      confidence: documentAiResult.confidence,
      processingMethod: 'google_document_ai',
      message: documentAiResult.success
        ? 'Front side processed successfully with Document AI'
        : 'Document AI processing failed, manual entry required'
    });

  } catch (e) {
    console.error('[License] Front side processing error:', e);
    return res.status(500).json({
      success: false,
      message: 'Failed to process front side',
      error: e.message,
      processingMethod: 'error'
    });
  }
});

// POST /api/license/validate-back-side
// Process back side PDF417 barcode via C# API
router.post('/validate-back-side', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file || !file.buffer || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Invalid or missing image' });
    }

    console.log('[License] Processing back side PDF417, size:', file.buffer.length, 'bytes');

    // Forward to C# API for PDF417 barcode processing
    const csharpApiResult = await processWithCSharpAPI(file);

    return res.json({
      success: csharpApiResult.success,
      data: csharpApiResult.data,
      confidence: csharpApiResult.confidenceScore || 0,
      processingMethod: 'pdf417_zxing_idparser',
      rawBarcodeData: csharpApiResult.rawBarcodeData,
      message: csharpApiResult.success
        ? 'PDF417 barcode processed successfully'
        : 'PDF417 processing failed, manual entry required',
      errorMessage: csharpApiResult.errorMessage
    });

  } catch (e) {
    console.error('[License] Back side processing error:', e);
    return res.status(500).json({
      success: false,
      message: 'Failed to process back side',
      error: e.message,
      processingMethod: 'error'
    });
  }
});

// POST /api/license/validate-both-sides
// Process both sides and combine results
router.post('/validate-both-sides', upload.fields([
  { name: 'frontSide', maxCount: 1 },
  { name: 'backSide', maxCount: 1 }
]), async (req, res) => {
  try {
    const frontFile = req.files?.frontSide?.[0];
    const backFile = req.files?.backSide?.[0];

    if (!frontFile || !backFile) {
      return res.status(400).json({
        message: 'Both front and back side images are required'
      });
    }

    console.log('[License] Processing both sides of driver license');

    // Process both sides concurrently
    const [frontResult, backResult] = await Promise.all([
      processWithDocumentAI(frontFile.buffer, frontFile.mimetype),
      processWithCSharpAPI(backFile)
    ]);

    // Combine results - prioritize PDF417 barcode data (more accurate)
    const combinedData = combineResults(frontResult, backResult);

    return res.json({
      success: combinedData.success,
      data: combinedData.data,
      frontSideResult: frontResult,
      backSideResult: backResult,
      primarySource: combinedData.primarySource,
      confidence: combinedData.confidence,
      processingMethod: 'combined_document_ai_pdf417',
      message: combinedData.success
        ? 'Both sides processed and combined successfully'
        : 'Processing completed with partial results'
    });

  } catch (e) {
    console.error('[License] Both sides processing error:', e);
    return res.status(500).json({
      success: false,
      message: 'Failed to process both sides',
      error: e.message,
      processingMethod: 'error'
    });
  }
});

// Legacy endpoint for backward compatibility
router.post('/validate', upload.single('file'), async (req, res) => {
  const side = req.query.side || req.body.side || 'front';

  if (side === 'back') {
    // Redirect to back side processing
    return router.handle(req, res, '/validate-back-side');
  } else {
    // Default to front side processing
    return router.handle(req, res, '/validate-front-side');
  }
});

// Process image with Google Cloud Document AI
async function processWithDocumentAI(imageBuffer, mimeType) {
  try {
    // Check if Document AI is available
    if (!documentAI) {
      return {
        success: false,
        errorMessage: 'Google Cloud Document AI not configured',
        data: createEmptyLicenseData(),
        confidence: 0,
        extractedText: ''
      };
    }

    // Get configuration from environment
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us';
    const processorId = process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID;

    if (!projectId || !processorId) {
      console.warn('[License] Missing Google Cloud Document AI configuration');
      return {
        success: false,
        errorMessage: 'Google Cloud Document AI not properly configured',
        data: createEmptyLicenseData(),
        confidence: 0,
        extractedText: ''
      };
    }

    // Initialize Document AI client
    const client = new documentAI();
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    // Create process request
    const request = {
      name,
      rawDocument: {
        content: imageBuffer.toString('base64'),
        mimeType: mimeType
      }
    };

    console.log('[License] Calling Google Cloud Document AI...');
    const [result] = await client.processDocument(request);

    if (!result.document) {
      return {
        success: false,
        errorMessage: 'No document detected by Document AI',
        data: createEmptyLicenseData(),
        confidence: 0,
        extractedText: ''
      };
    }

    // Extract text from Document AI result
    const extractedText = result.document.text || '';
    console.log('[License] Document AI extracted text length:', extractedText.length);

    // Parse license data from extracted text and entities
    const licenseData = parseDocumentAIResult(result.document, extractedText);
    const confidence = calculateConfidence(result.document);

    return {
      success: true,
      data: licenseData,
      extractedText: extractedText,
      confidence: confidence,
      processingMethod: 'google_document_ai'
    };

  } catch (error) {
    console.error('[License] Document AI processing error:', error);
    return {
      success: false,
      errorMessage: `Document AI processing failed: ${error.message}`,
      data: createEmptyLicenseData(),
      confidence: 0,
      extractedText: ''
    };
  }
}

// Process back side via C# API
async function processWithCSharpAPI(file) {
  try {
    // Get C# API base URL from environment
    const csharpApiUrl = process.env.CSHARP_API_BASE_URL || 'https://localhost:5001';

    console.log('[License] Forwarding to C# API for PDF417 processing...');

    // Create FormData for multipart request
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('backSideImage', file.buffer, {
      filename: file.originalname || 'license-back.jpg',
      contentType: file.mimetype
    });

    // Forward request to C# API
    const response = await axios.post(
      `${csharpApiUrl}/api/driverlicense/parse-back-side`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    if (response.data?.success) {
      console.log('[License] C# API processing successful');
      return {
        success: true,
        data: response.data.data,
        confidenceScore: response.data.confidenceScore || 0,
        rawBarcodeData: response.data.rawBarcodeData,
        processingMethod: response.data.processingMethod || 'pdf417_csharp'
      };
    } else {
      console.warn('[License] C# API processing failed:', response.data?.errorMessage);
      return {
        success: false,
        errorMessage: response.data?.errorMessage || 'C# API processing failed',
        data: null,
        confidenceScore: 0
      };
    }

  } catch (error) {
    console.error('[License] C# API communication error:', error.message);
    return {
      success: false,
      errorMessage: `C# API communication failed: ${error.message}`,
      data: null,
      confidenceScore: 0
    };
  }
}

// Parse Document AI result into structured license data
function parseDocumentAIResult(document, extractedText) {
  const licenseData = createEmptyLicenseData();

  try {
    // Parse entities if available
    if (document.entities) {
      for (const entity of document.entities) {
        const entityType = entity.type;
        const entityValue = entity.textAnchor?.content || entity.mentionText || '';

        // Map Document AI entity types to license fields
        switch (entityType) {
          case 'person_name':
          case 'full_name':
            parseNameField(entityValue, licenseData);
            break;
          case 'document_id':
          case 'license_number':
            licenseData.licenseNumber = entityValue.trim();
            break;
          case 'date_of_birth':
          case 'birth_date':
            licenseData.dateOfBirth = formatDate(entityValue);
            break;
          case 'expiration_date':
          case 'exp_date':
            licenseData.expirationDate = formatDate(entityValue);
            break;
          case 'address':
            licenseData.address = entityValue.trim();
            break;
          case 'city':
            licenseData.city = entityValue.trim();
            break;
          case 'state':
          case 'jurisdiction':
            licenseData.state = entityValue.trim();
            break;
          case 'postal_code':
          case 'zip_code':
            licenseData.postalCode = entityValue.trim();
            break;
          case 'sex':
          case 'gender':
            licenseData.sex = entityValue.trim();
            break;
        }
      }
    }

    // Fallback: Parse with regex patterns if entities are insufficient
    if (!licenseData.licenseNumber || !licenseData.firstName) {
      console.log('[License] Using regex fallback for Document AI parsing');
      const regexParsed = parseWithRegexPatterns(extractedText);

      // Fill in missing fields
      Object.keys(regexParsed).forEach(key => {
        if (!licenseData[key] && regexParsed[key]) {
          licenseData[key] = regexParsed[key];
        }
      });
    }

    // Set processing metadata
    licenseData.processingMethod = 'google_document_ai';
    licenseData.extractionTimestamp = new Date().toISOString();
    licenseData.needsManualEntry = !licenseData.firstName && !licenseData.licenseNumber;

    console.log('[License] Document AI parsed license for:', licenseData.firstName, licenseData.lastName);

  } catch (error) {
    console.error('[License] Error parsing Document AI result:', error);
  }

  return licenseData;
}

// Parse name field (could be "SMITH, JOHN" or "JOHN SMITH")
function parseNameField(nameValue, licenseData) {
  if (!nameValue) return;

  const cleanName = nameValue.trim().replace(/[,\s]+/g, ' ');

  // Handle "LAST, FIRST" format
  if (nameValue.includes(',')) {
    const parts = nameValue.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      licenseData.lastName = parts[0];
      licenseData.firstName = parts[1].split(' ')[0]; // Take first word after comma
    }
  } else {
    // Handle "FIRST LAST" format
    const parts = cleanName.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      licenseData.firstName = parts[0];
      licenseData.lastName = parts[parts.length - 1]; // Take last word
      if (parts.length > 2) {
        licenseData.middleName = parts.slice(1, -1).join(' ');
      }
    }
  }
}

// Parse with regex patterns as fallback
function parseWithRegexPatterns(text) {
  const data = {};

  // License number patterns (various state formats)
  const licensePatterns = [
    /(?:DL|LIC|LICENSE|ID)[:\s#]*([A-Z0-9]{6,15})/i,
    /\b([A-Z0-9]{6,12})\s*(?:EXP|EXPIRES|EXPIRATION)/i,
    /\b([0-9]{8,12})\b/, // Simple numeric license
  ];

  for (const pattern of licensePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.licenseNumber = match[1];
      break;
    }
  }

  // Date patterns
  const datePatterns = [
    /DOB[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /BIRTH[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /EXP[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ];

  datePatterns.forEach(pattern => {
    const match = text.match(pattern);
    if (match) {
      const dateStr = formatDate(match[1]);
      if (pattern.source.includes('DOB') || pattern.source.includes('BIRTH')) {
        data.dateOfBirth = dateStr;
      } else {
        data.expirationDate = dateStr;
      }
    }
  });

  return data;
}

// Combine results from front and back side processing
function combineResults(frontResult, backResult) {
  // Prioritize PDF417 data (more accurate) over OCR data
  if (backResult.success && backResult.data) {
    return {
      success: true,
      data: backResult.data,
      primarySource: 'pdf417_barcode',
      confidence: backResult.confidenceScore || 0.9
    };
  } else if (frontResult.success && frontResult.data) {
    return {
      success: true,
      data: frontResult.data,
      primarySource: 'document_ai_ocr',
      confidence: frontResult.confidence || 0.7
    };
  } else {
    return {
      success: false,
      data: createEmptyLicenseData(),
      primarySource: 'none',
      confidence: 0
    };
  }
}

// Calculate confidence score from Document AI result
function calculateConfidence(document) {
  if (!document.entities || document.entities.length === 0) {
    return 0.3;
  }

  const confidences = document.entities
    .map(entity => entity.confidence || 0.5)
    .filter(conf => conf > 0);

  if (confidences.length === 0) return 0.5;

  const avgConfidence = confidences.reduce((a, b) => a + b) / confidences.length;
  return Math.round(avgConfidence * 100) / 100;
}

// Create empty license data structure
function createEmptyLicenseData() {
  return {
    // Personal information
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    sex: '',

    // License information
    licenseNumber: '',
    issuingState: '',
    issuingCountry: 'US',
    issueDate: '',
    expirationDate: '',

    // Address information
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',

    // Physical characteristics
    height: '',
    eyeColor: '',

    // Processing metadata
    processingMethod: '',
    extractionTimestamp: new Date().toISOString(),
    needsManualEntry: true
  };
}

// Format date string to YYYY-MM-DD
function formatDate(dateString) {
  if (!dateString) return null;

  try {
    // Handle various date formats
    const cleanDate = dateString.replace(/[^\d\/\-]/g, '');
    const date = new Date(cleanDate);

    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    // Try MM/DD/YYYY format
    const parts = cleanDate.split(/[\/\-]/);
    if (parts.length === 3) {
      const month = parseInt(parts[0]);
      const day = parseInt(parts[1]);
      let year = parseInt(parts[2]);

      if (year < 100) year += 2000; // Handle 2-digit years

      const formattedDate = new Date(year, month - 1, day);
      if (!isNaN(formattedDate.getTime())) {
        return formattedDate.toISOString().split('T')[0];
      }
    }
  } catch (e) {
    console.warn('[License] Date parsing failed for:', dateString);
  }

  return null;
}

module.exports = router;