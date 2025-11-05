const express = require('express');
const multer = require('multer');
const router = express.Router();

// Configure multer to store in memory (we will forward/process buffer)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/license/validate
// Accepts multipart/form-data with field: file
router.post('/validate', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file || !file.buffer || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Invalid or missing image' });
    }

    // TODO: Integrate real OCR/BlinkID validation
    // Server-side BlinkID OCR is not yet implemented
    // Currently, client-side parsing is not available due to CORS restrictions
    // To implement: Install @microblink/blinkid-in-browser-sdk on the server or use BlinkID Cloud API
    
    return res.status(501).json({ 
      isValid: false,
      message: 'OCR/BlinkID integration is not yet implemented on the server. Please implement real OCR parsing.',
      error: 'NOT_IMPLEMENTED'
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Validation failed' });
  }
});

module.exports = router;


