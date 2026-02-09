# Driver License AI Integration Guide

## Overview

This system integrates advanced AI-powered driver license processing using:

- **Google Cloud Document AI** for front-side OCR processing
- **PDF417 Barcode Parser** (C# + ZXing.Net + IdParser) for back-side barcode reading
- **Combined Intelligence** that prioritizes accurate barcode data over OCR

## Architecture

```
Client (React)
    ↓
Node.js Server (/api/license/validate-both-sides)
    ├── Google Cloud Document AI (front side)
    └── C# API (PDF417 back side)
```

## Setup Instructions

### 1. Google Cloud Document AI Setup

#### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing one
3. Enable Document AI API
4. Create a Document AI processor:
   - Type: **DRIVER_LICENSE_PROCESSOR**
   - Location: **us** (or your preferred region)

#### 1.2 Service Account Setup
```bash
# Create service account
gcloud iam service-accounts create document-ai-service \
    --description="Document AI service account for license processing" \
    --display-name="Document AI Service"

# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:document-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/documentai.apiUser"

# Create and download service account key
gcloud iam service-accounts keys create ./service-account-key.json \
    --iam-account=document-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

#### 1.3 Environment Configuration
Update `server/.env`:
```env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us
GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
```

### 2. C# API Setup (PDF417 Processing)

#### 2.1 Install Dependencies
The C# project includes these NuGet packages:
```xml
<PackageReference Include="ZXing.Net" Version="0.16.9" />
<PackageReference Include="IdParser" Version="4.2.0" />
<PackageReference Include="System.Drawing.Common" Version="8.0.0" />
```

#### 2.2 Build and Run C# API
```bash
cd C:/aegis-ao/rental/aegis-ao-rental/CarRental.Api
dotnet build
dotnet run
```

The C# API will be available at `https://localhost:5001`

#### 2.3 Configure API URL
Update `server/.env`:
```env
CSHARP_API_BASE_URL=https://localhost:5001
```

### 3. Node.js Server Setup

#### 3.1 Install Dependencies
```bash
cd aegis-ao-rental_web/server
npm install @google-cloud/documentai
```

#### 3.2 Restart Server
```bash
npm run dev
```

## API Endpoints

### POST `/api/license/validate-front-side`
Process front side with Google Document AI
- **Input**: `file` (FormData)
- **Output**: Document AI OCR result

### POST `/api/license/validate-back-side`
Process back side PDF417 via C# API
- **Input**: `file` (FormData)
- **Output**: Structured barcode data

### POST `/api/license/validate-both-sides`
Process both sides and combine results
- **Input**: `frontSide`, `backSide` (FormData)
- **Output**: Combined intelligent result

## Data Flow

### 1. Front Side Processing (Document AI)
```javascript
const documentAI = new DocumentProcessorServiceClient();
const result = await documentAI.processDocument({
  name: `projects/${projectId}/locations/${location}/processors/${processorId}`,
  rawDocument: { content: imageBase64, mimeType: 'image/jpeg' }
});
```

### 2. Back Side Processing (C# PDF417)
```csharp
// ZXing.Net barcode detection
var barcodeReader = new BarcodeReader();
var result = barcodeReader.Decode(bitmap);

// IdParser data extraction
var license = IdentificationCard.Parse(result.Text);
```

### 3. Intelligent Combination
```javascript
function combineResults(frontResult, backResult) {
  // Priority: PDF417 barcode > Document AI OCR
  if (backResult.success) {
    return { data: backResult.data, primarySource: 'pdf417_barcode' };
  }
  return { data: frontResult.data, primarySource: 'document_ai_ocr' };
}
```

## Data Structure

### License Data Fields
```javascript
{
  // Personal Information
  firstName: string,
  middleName: string,
  lastName: string,
  dateOfBirth: string, // YYYY-MM-DD
  sex: string,

  // License Information
  licenseNumber: string,
  issuingState: string,
  issueDate: string,
  expirationDate: string,

  // Address Information
  address: string,
  city: string,
  state: string,
  postalCode: string,

  // Physical Characteristics
  height: string, // e.g., "5'10\""
  eyeColor: string,

  // Processing Metadata
  processingMethod: string, // 'combined_document_ai_pdf417'
  primarySource: string,    // 'pdf417_barcode' | 'document_ai_ocr'
  confidence: number,       // 0.0 - 1.0
  extractionTimestamp: string
}
```

## Error Handling

### Graceful Degradation
1. **PDF417 Success + Document AI Fail** → Use barcode data
2. **PDF417 Fail + Document AI Success** → Use OCR data
3. **Both Fail** → Manual entry with captured images

### Error Response Format
```javascript
{
  success: false,
  message: "Processing failed",
  errorMessage: "Specific error details",
  data: emptyLicenseStructure,
  requiresManualEntry: true
}
```

## Performance Considerations

### Processing Times
- **PDF417 Barcode**: ~500ms (very fast, high accuracy)
- **Document AI OCR**: ~2-3s (slower, lower accuracy)
- **Combined Processing**: Concurrent execution

### Accuracy Comparison
- **PDF417**: 95-99% accuracy (structured data)
- **Document AI**: 80-95% accuracy (visual OCR)

## Testing

### Test Images
Use driver license images with:
1. **Clear PDF417 barcode** (back side)
2. **Readable text** (front side)
3. **Various states/formats**

### Validation
```bash
curl -X POST http://localhost:5000/api/license/validate-both-sides \
  -F "frontSide=@license-front.jpg" \
  -F "backSide=@license-back.jpg"
```

## Security Notes

### Data Protection
- Images processed in memory only
- No persistent storage of license images
- Google Cloud data retention policies apply

### API Security
- Rate limiting implemented
- File type validation
- Size limits (15MB max)

## Troubleshooting

### Common Issues

#### "Google Cloud Document AI not configured"
- Verify `GOOGLE_CLOUD_PROJECT_ID` is set
- Check service account credentials
- Ensure Document AI API is enabled

#### "C# API communication failed"
- Verify C# API is running on correct port
- Check `CSHARP_API_BASE_URL` configuration
- Ensure HTTPS certificates are valid

#### "No PDF417 barcode detected"
- Verify image quality (min 300 DPI recommended)
- Ensure barcode is not damaged/obscured
- Try different image formats (PNG, JPEG)

### Debug Logging
```bash
# Enable detailed logging
export DEBUG=license:*
npm run dev
```

## Future Enhancements

### Planned Features
1. **Real-time confidence scoring**
2. **Multi-state format support**
3. **Batch processing capabilities**
4. **Enhanced validation rules**

### Integration Points
- Customer onboarding workflows
- Rental agreement automation
- Identity verification systems

---

For technical support, contact the development team or check the API health endpoint:
`GET /api/driverlicense/health`