import React, { useRef, useState, useEffect } from 'react';
import * as BlinkIDSDK from '@microblink/blinkid-in-browser-sdk';
import { useCompany } from '../context/CompanyContext';

function DriverLicenseScanner() {
  const { companyConfig } = useCompany();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [currentSide, setCurrentSide] = useState('front'); // 'front' or 'back'
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
          setIsCameraActive(true);
          setError(null);
        } catch (playErr) {
          // Ignore AbortError - it's harmless and happens during React re-renders
          if (playErr.name !== 'AbortError') {
            throw playErr;
          }
          // Still set camera as active even with AbortError
          setIsCameraActive(true);
          setError(null);
        }
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Разрешите доступ к камере в настройках браузера');
      } else if (err.name === 'NotFoundError') {
        setError('Камера не найдена на устройстве');
      } else if (err.name === 'AbortError') {
        // Ignore AbortError - it's harmless
        setIsCameraActive(true);
      } else {
        setError('Ошибка доступа к камере: ' + err.message);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        
        // Save front or back image
        if (currentSide === 'front') {
          setFrontImage({ url: imageUrl, blob });
          stopCamera();
        } else {
          setBackImage({ url: imageUrl, blob });
          stopCamera();
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const processWithBlinkID = async () => {
    setIsProcessing(true);
    try {
      if (!frontImage || !backImage) {
        throw new Error('Both front and back images required');
      }

      // Get BlinkID license key from company config
      const licenseKey = companyConfig?.blinkKey || companyConfig?.BlinkKey;
      if (!licenseKey) {
        throw new Error('BlinkID license key not configured');
      }

      console.log('[DL Scanner] Initializing BlinkID SDK...');
      
      // Load BlinkID SDK
      const loadSettings = new BlinkIDSDK.WasmSDKLoadSettings(licenseKey);
      // Set engine location to public resources folder
      loadSettings.engineLocation = `${window.location.origin}/resources/`;
      
      console.log('[DL Scanner] SDK Settings:', {
        engineLocation: loadSettings.engineLocation
      });
      
      const wasmSDK = await BlinkIDSDK.loadWasmModule(loadSettings);
      console.log('[DL Scanner] BlinkID SDK loaded successfully');

      // Create recognizer for multi-side (front and back)
      const recognizer = await BlinkIDSDK.createBlinkIdMultiSideRecognizer(wasmSDK);
      
      // Configure recognizer settings
      const settings = await recognizer.currentSettings();
      settings.returnFullDocumentImage = true;
      settings.returnFaceImage = true;
      await recognizer.updateSettings(settings);

      // Create recognizer runner
      const recognizerRunner = await BlinkIDSDK.createRecognizerRunner(
        wasmSDK,
        [recognizer],
        false
      );

      // Process front side
      console.log('[DL Scanner] Processing front side...');
      const frontFrame = await createCapturedFrame(frontImage.blob);
      const frontResult = await recognizerRunner.processImage(frontFrame);
      
      // Process back side
      console.log('[DL Scanner] Processing back side...');
      const backFrame = await createCapturedFrame(backImage.blob);
      const backResult = await recognizerRunner.processImage(backFrame);

      if (frontResult.recognitionStatus === BlinkIDSDK.RecognizerResultState.Empty ||
          backResult.recognitionStatus === BlinkIDSDK.RecognizerResultState.Empty) {
        throw new Error('Could not extract license data. Please retake the photos.');
      }

      // Get extracted data
      const result = await recognizer.getResult();
      console.log('[DL Scanner] ===== RAW EXTRACTED DATA =====');
      console.log('[DL Scanner] Full result object:', result);
      console.log('[DL Scanner] Result keys:', Object.keys(result));
      console.log('[DL Scanner] firstName:', result.firstName);
      console.log('[DL Scanner] lastName:', result.lastName);
      console.log('[DL Scanner] dateOfBirth:', result.dateOfBirth);
      console.log('[DL Scanner] documentNumber:', result.documentNumber);
      console.log('[DL Scanner] address:', result.address);
      console.log('[DL Scanner] barcode:', result.barcode);
      console.log('[DL Scanner] mrz:', result.mrz);
      console.log('[DL Scanner] processingStatus:', result.processingStatus);
      console.log('[DL Scanner] frontProcessingStatus:', result.frontProcessingStatus);
      console.log('[DL Scanner] backProcessingStatus:', result.backProcessingStatus);
      console.log('[DL Scanner] ===========================');

      // Helper function to extract string value from BlinkID result objects
      const extractValue = (obj) => {
        if (!obj) return '';
        if (typeof obj === 'string') return obj;
        if (obj.latin) return obj.latin;
        if (obj.originalString) return obj.originalString;
        if (obj.description) return obj.description;
        if (obj.value) return obj.value;
        if (obj.alpha2) return obj.alpha2; // Country code
        // Log what we're trying to extract
        console.log('[DL Scanner] Extracting from object:', obj);
        return '';
      };

      // Try to extract from barcode if VIZ extraction failed
      const barcodeData = result.barcode;
      const useBarcode = barcodeData && (!extractValue(result.firstName) || !extractValue(result.lastName));
      
      console.log('[DL Scanner] Use barcode data?', useBarcode);
      if (useBarcode && barcodeData) {
        console.log('[DL Scanner] Barcode data available:', barcodeData);
        console.log('[DL Scanner] Barcode keys:', Object.keys(barcodeData));
        console.log('[DL Scanner] Barcode.barcodeData:', barcodeData.barcodeData);
        console.log('[DL Scanner] Barcode.rawData:', barcodeData.rawData);
        console.log('[DL Scanner] Barcode.stringData:', barcodeData.stringData);
        console.log('[DL Scanner] Barcode firstName:', barcodeData.firstName);
        console.log('[DL Scanner] Barcode lastName:', barcodeData.lastName);
        console.log('[DL Scanner] Barcode dateOfBirth:', barcodeData.dateOfBirth);
        console.log('[DL Scanner] Barcode address:', barcodeData.address);
        console.log('[DL Scanner] backProcessingStatus meaning:', {
          0: 'Success',
          1: 'DetectionFailed', 
          2: 'ImagePreprocessingFailed',
          3: 'StabilityTestFailed',
          4: 'ScanningWrongSide',
          15: 'BarcodeRecognitionFailed'
        }[result.backProcessingStatus]);
      }

      // Parse and store extracted data (prefer barcode if VIZ is empty)
      const licenseData = {
        firstName: useBarcode ? extractValue(barcodeData.firstName) : extractValue(result.firstName),
        lastName: useBarcode ? extractValue(barcodeData.lastName) : extractValue(result.lastName),
        fullName: useBarcode ? extractValue(barcodeData.fullName) : extractValue(result.fullName),
        dateOfBirth: useBarcode ? extractValue(barcodeData.dateOfBirth) : extractValue(result.dateOfBirth),
        documentNumber: useBarcode ? extractValue(barcodeData.documentNumber) : extractValue(result.documentNumber),
        address: useBarcode ? extractValue(barcodeData.address) : extractValue(result.address),
        dateOfExpiry: useBarcode ? extractValue(barcodeData.dateOfExpiry) : extractValue(result.dateOfExpiry),
        dateOfIssue: useBarcode ? extractValue(barcodeData.dateOfIssue) : extractValue(result.dateOfIssue),
        sex: useBarcode ? extractValue(barcodeData.sex) : extractValue(result.sex),
        nationality: extractValue(result.nationality),
        licenseNumber: useBarcode ? extractValue(barcodeData.documentNumber) : extractValue(result.documentNumber),
        stateIssued: extractValue(result.issuingAuthority) || extractValue(result.jurisdiction),
        expirationDate: useBarcode ? extractValue(barcodeData.dateOfExpiry) : extractValue(result.dateOfExpiry),
        rawData: {
          viz: {
            firstName: result.firstName,
            lastName: result.lastName,
            fullName: result.fullName,
            dateOfBirth: result.dateOfBirth,
            documentNumber: result.documentNumber,
            address: result.address,
            dateOfExpiry: result.dateOfExpiry,
            sex: result.sex,
            nationality: result.nationality
          },
          barcode: barcodeData
        }
      };

      console.log('[DL Scanner] Parsed license data:', licenseData);

      // Check if we got any meaningful data
      const hasData = licenseData.firstName || licenseData.lastName || licenseData.documentNumber;
      
      // Store images and data
      localStorage.setItem('scannedLicenseFront', frontImage.url);
      localStorage.setItem('scannedLicenseBack', backImage.url);
      localStorage.setItem('scannedLicenseData', JSON.stringify(licenseData));
      localStorage.setItem('licenseScanned', 'true');
      localStorage.setItem('licenseDataExtracted', hasData ? 'true' : 'false');

      console.log('[DL Scanner] License images stored');
      console.log('[DL Scanner] Data extraction status:', hasData ? 'SUCCESS' : 'FAILED - Manual entry required');
      
      if (!hasData) {
        console.warn('[DL Scanner] ⚠️ No license data could be extracted from images.');
        console.warn('[DL Scanner] Images are saved but user will need to enter information manually.');
        console.warn('[DL Scanner] Possible reasons: Low image quality, glare, barcode not visible/readable');
      } else {
        console.log('[DL Scanner] ✅ License data successfully extracted:', licenseData);
      }

      // Cleanup
      recognizerRunner.delete();
      recognizer.delete();
      wasmSDK.delete();
      
      // Get return URL from query params
      const urlParams = new URLSearchParams(window.location.search);
      const returnTo = urlParams.get('returnTo');
      
      console.log('[DL Scanner] Processing complete, redirecting back...');
      
      // Redirect back to the booking page after a short delay
      setTimeout(() => {
        if (returnTo) {
          window.location.href = returnTo;
        } else {
          window.history.back();
        }
      }, 1500);
    } catch (err) {
      console.error('[DL Scanner] Processing error:', err);
      setError('Ошибка обработки: ' + err.message);
      setIsProcessing(false);
    }
  };

  // Helper function to convert Blob to CapturedFrame format for BlinkID
  const createCapturedFrame = async (blob) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Create CapturedFrame object compatible with BlinkID SDK
        const capturedFrame = {
          imageData: imageData,
          width: canvas.width,
          height: canvas.height
        };
        
        resolve(capturedFrame);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
  };
  
  const handleConfirmFront = () => {
    // Move to back side
    setCapturedImage(null);
    setCurrentSide('back');
    startCamera();
  };
  
  const handleRetake = () => {
    // Retake current side
    URL.revokeObjectURL(capturedImage);
    setCapturedImage(null);
    if (currentSide === 'front') {
      setFrontImage(null);
    } else {
      setBackImage(null);
    }
    setError(null);
    startCamera();
  };
  
  const handleConfirmBack = async () => {
    // Process both images
    await processWithBlinkID();
  };

  useEffect(() => {
    startCamera();
    return () => { stopCamera(); };
  }, []);

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column',
      backgroundColor: '#000', position: 'relative', overflow: 'hidden'
    }}>
      {error && (
        <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(220, 53, 69, 0.95)', color: 'white', padding: '15px 20px', borderRadius: '8px', zIndex: 1000, maxWidth: '90%', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {isProcessing && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '20px 30px', borderRadius: '12px', zIndex: 1000, textAlign: 'center' }}>
          <div style={{ border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid white', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
          Обработка изображения...
        </div>
      )}

      {!capturedImage ? (
        <>
          {/* Full screen camera feed */}
          <video ref={videoRef} autoPlay playsInline muted style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%', 
            height: '100%', 
            objectFit: 'cover' 
          }} />
          
          {/* Guide overlay - help user position license */}
          {isCameraActive && (
            <div style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              width: '90%', 
              maxWidth: '500px',
              aspectRatio: '1.586',
              border: '2px solid rgba(255,255,255,0.5)',
              borderRadius: '8px',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              {/* Corner indicators */}
              <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '20px', height: '20px', borderTop: '4px solid #4CAF50', borderLeft: '4px solid #4CAF50' }} />
              <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '20px', height: '20px', borderTop: '4px solid #4CAF50', borderRight: '4px solid #4CAF50' }} />
              <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '20px', height: '20px', borderBottom: '4px solid #4CAF50', borderLeft: '4px solid #4CAF50' }} />
              <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderBottom: '4px solid #4CAF50', borderRight: '4px solid #4CAF50' }} />
            </div>
          )}
          
          {/* Top instruction */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold',
            textAlign: 'center',
            zIndex: 20,
            maxWidth: '90%'
          }}>
            {currentSide === 'front' ? 'Поместите лицевую сторону в рамку' : 'Поместите обратную сторону в рамку'}
          </div>
          
          {/* Bottom controls */}
          <div style={{ position: 'absolute', bottom: '30px', left: '0', right: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', zIndex: 200 }}>
            <button 
              onClick={captureImage} 
              disabled={!isCameraActive} 
              style={{ 
                width: '70px', 
                height: '70px', 
                backgroundColor: 'white', 
                border: '5px solid #4CAF50', 
                borderRadius: '50%', 
                cursor: 'pointer', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.6)', 
                opacity: isCameraActive ? 1 : 0.5,
                transition: 'transform 0.1s',
                position: 'relative'
              }}
              onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
              onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)', 
                width: '26px', 
                height: '26px', 
                backgroundColor: '#4CAF50', 
                borderRadius: '3px' 
              }} />
            </button>
            <div style={{ 
              backgroundColor: 'rgba(0,0,0,0.8)', 
              color: 'white', 
              padding: '8px 20px', 
              borderRadius: '20px', 
              fontSize: '13px',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              {currentSide === 'front' ? 'Шаг 1 из 2' : 'Шаг 2 из 2'}
            </div>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Full screen image */}
          <img src={capturedImage} alt="Captured License" style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }} />
          
          {/* Floating label at top */}
          <div style={{ 
            position: 'absolute', 
            top: '20px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.8)', 
            color: 'white', 
            padding: '10px 24px', 
            borderRadius: '20px', 
            fontSize: '16px', 
            fontWeight: 'bold',
            zIndex: 100
          }}>
            {currentSide === 'front' ? 'Лицевая сторона (1/2)' : 'Обратная сторона (2/2)'}
          </div>
          
          {/* Buttons at bottom */}
          <div style={{ 
            position: 'absolute', 
            bottom: '0', 
            left: '0', 
            right: '0',
            display: 'flex', 
            gap: '10px', 
            padding: '20px', 
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 100
          }}>
            <button onClick={handleRetake} style={{ flex: 1, padding: '15px', fontSize: '16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Переснять
            </button>
            <button 
              onClick={currentSide === 'front' ? handleConfirmFront : handleConfirmBack} 
              disabled={isProcessing} 
              style={{ flex: 1, padding: '15px', fontSize: '16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', opacity: isProcessing ? 0.6 : 1 }}
            >
              {isProcessing ? 'Обработка...' : (currentSide === 'front' ? 'Далее →' : 'Готово ✓')}
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default DriverLicenseScanner;


