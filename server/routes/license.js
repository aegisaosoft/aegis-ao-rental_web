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

    // TODO: Integrate real OCR/validation. For now do basic checks and return sample data.
    const sizeOk = file.size > 0;
    const result = {
      isValid: sizeOk,
      // Sample data for testing; replace when integrating real OCR
      data: {
        licenseNumber: 'D123456789',
        issuingState: 'CA',
        issuingCountry: 'US',
        sex: 'M',
        height: '5\'10"',
        eyeColor: 'Brown',
        middleName: 'John',
        issueDate: '2020-01-15',
        expirationDate: '2028-01-15',
        address: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90210',
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


