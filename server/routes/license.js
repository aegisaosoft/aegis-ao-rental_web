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

    // TODO: Integrate real OCR/validation. For now do basic checks.
    const sizeOk = file.size > 0;
    const result = {
      isValid: sizeOk,
      // Placeholder fields; replace when integrating real OCR
      data: {
        licenseNumber: '',
        issuingState: '',
        issuingCountry: 'US',
        sex: '',
        height: '',
        eyeColor: '',
        middleName: '',
        issueDate: '',
        expirationDate: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      }
    };

    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Validation failed' });
  }
});

module.exports = router;


