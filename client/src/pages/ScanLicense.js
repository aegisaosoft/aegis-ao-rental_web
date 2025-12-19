import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as BlinkIDSDK from '@microblink/blinkid-in-browser-sdk';
import { useCompany } from '../context/CompanyContext';
import { toast } from 'react-toastify';

const ScanLicense = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { companyConfig } = useCompany();
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recognizerRef = useRef(null);
  const recognizerRunnerRef = useRef(null);
  const streamRef = useRef(null);
  
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentSide, setCurrentSide] = useState('front');
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    const initSDK = async () => {
      try {
        setError(null);
        
        const licenseKey = companyConfig?.blinkKey || companyConfig?.BlinkKey;
        if (!licenseKey) {
          throw new Error('BlinkID license key not configured');
        }

        console.log('[ScanLicense] Loading BlinkID SDK...');
        
        const loadSettings = new BlinkIDSDK.WasmSDKLoadSettings(licenseKey);
        loadSettings.engineLocation = `${window.location.origin}/resources/`;
        
        const wasmSDK = await BlinkIDSDK.loadWasmModule(loadSettings);
        console.log('[ScanLicense] ✅ BlinkID SDK loaded');

        const recognizer = await BlinkIDSDK.createBlinkIdMultiSideRecognizer(wasmSDK);
        const settings = await recognizer.currentSettings();
        settings.returnFullDocumentImage = true;
        settings.returnFaceImage = true;
        await recognizer.updateSettings(settings);
        
        recognizerRef.current = recognizer;

        const recognizerRunner = await BlinkIDSDK.createRecognizerRunner(
          wasmSDK,
          [recognizer],
          false
        );
        recognizerRunnerRef.current = recognizerRunner;

        console.log('[ScanLicense] ✅ SDK initialized successfully');
        setIsInitializing(false);
        
        startCamera();
        
      } catch (err) {
        console.error('[ScanLicense] SDK initialization error:', err);
        setError(err.message || 'Failed to initialize scanner');
        setIsInitializing(false);
      }
    };

    initSDK();

    return () => {
      stopCamera();
      if (recognizerRunnerRef.current) {
        try {
          recognizerRunnerRef.current.delete();
          recognizerRunnerRef.current = null;
        } catch (e) {
          console.warn('[ScanLicense] Cleanup on unmount: recognizer runner already deleted');
        }
      }
      if (recognizerRef.current) {
        try {
          recognizerRef.current.delete();
          recognizerRef.current = null;
        } catch (e) {
          console.warn('[ScanLicense] Cleanup on unmount: recognizer already deleted');
        }
      }
    };
  }, [companyConfig]);

  const startCamera = async () => {
    try {
      console.log('[ScanLicense] Starting camera...');
      
      // Request highest possible resolution from back camera
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 3840, min: 1280 },  // Request 4K if available, minimum 720p
          height: { ideal: 2160, min: 720 },
          aspectRatio: { ideal: 16/9 }
        },
        audio: false
      };

      console.log('[ScanLicense] Requesting camera with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Log what we actually got
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log('[ScanLicense] Camera settings received:', settings);
      console.log('[ScanLicense] Actual resolution:', settings.width, 'x', settings.height);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
          setIsCameraActive(true);
          setError(null);
          console.log('[ScanLicense] ✅ Camera started');
        } catch (playErr) {
          if (playErr.name !== 'AbortError') {
            throw playErr;
          }
          setIsCameraActive(true);
          setError(null);
          console.log('[ScanLicense] ✅ Camera started (AbortError ignored)');
        }
      }
    } catch (err) {
      console.error('[ScanLicense] Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'AbortError') {
        setIsCameraActive(true);
      } else {
        setError('Camera error: ' + err.message);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    
    console.log('[ScanLicense] Full video resolution:', sourceWidth, 'x', sourceHeight);
    
    // Calculate the crop area - license frame is 90% width with aspect ratio 1.586 (credit card ratio)
    // The frame is centered on screen
    const frameWidthPercent = 0.90;  // 90% of screen width
    const licenseAspectRatio = 1.586; // Standard credit card / driver's license ratio
    
    // Calculate crop dimensions based on video resolution
    const cropWidth = sourceWidth * frameWidthPercent;
    const cropHeight = cropWidth / licenseAspectRatio;
    
    // Center the crop area
    const cropX = (sourceWidth - cropWidth) / 2;
    const cropY = (sourceHeight - cropHeight) / 2;
    
    console.log('[ScanLicense] Cropping to license frame:');
    console.log('[ScanLicense] - Crop area: x=' + cropX + ', y=' + cropY + ', w=' + cropWidth + ', h=' + cropHeight);
    
    // Set canvas to the cropped size
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    const context = canvas.getContext('2d');
    
    // Draw only the cropped area (the license frame) to canvas
    context.drawImage(
      video,
      cropX, cropY, cropWidth, cropHeight,  // Source rectangle (crop from video)
      0, 0, cropWidth, cropHeight            // Destination rectangle (fill canvas)
    );
    
    console.log('[ScanLicense] Captured image size:', canvas.width, 'x', canvas.height);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      console.log('[ScanLicense] Captured blob size:', blob.size, 'bytes (PNG format)');
      
      const imageUrl = URL.createObjectURL(blob);
      setCapturedImage(imageUrl);
      
      if (currentSide === 'front') {
        setFrontImage({ url: imageUrl, blob });
      } else {
        setBackImage({ url: imageUrl, blob });
      }
      
      stopCamera();
    }, 'image/png');
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (currentSide === 'front') {
      setFrontImage(null);
    } else {
      setBackImage(null);
    }
    setError(null);
    startCamera();
  };

  const handleConfirm = async () => {
    if (currentSide === 'front') {
      setCurrentSide('back');
      setCapturedImage(null);
      startCamera();
    } else {
      await processImages();
    }
  };

  const processImages = async () => {
    if (!frontImage || !backImage || !recognizerRunnerRef.current || !recognizerRef.current) {
      setError('Missing images or SDK not initialized');
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log('[ScanLicense] Processing front side...');
      console.log('[ScanLicense] Front blob size:', frontImage.blob.size);
      
      // Create captured frame from front blob using proper format
      const frontFrame = await createCapturedFrame(frontImage.blob);
      console.log('[ScanLicense] Front frame created:', frontFrame.width, 'x', frontFrame.height);
      
      // Process front
      const frontResult = await recognizerRunnerRef.current.processImage(frontFrame);
      console.log('[ScanLicense] Front result:', frontResult);
      
      if (frontResult.recognitionStatus === BlinkIDSDK.RecognizerResultState.Empty) {
        console.warn('[ScanLicense] Front side returned Empty - continuing with back side');
      }

      console.log('[ScanLicense] Processing back side...');
      console.log('[ScanLicense] Back blob size:', backImage.blob.size);
      
      // Create captured frame from back blob using proper format
      const backFrame = await createCapturedFrame(backImage.blob);
      console.log('[ScanLicense] Back frame created:', backFrame.width, 'x', backFrame.height);
      
      // Process back
      const backResult = await recognizerRunnerRef.current.processImage(backFrame);
      console.log('[ScanLicense] Back result:', backResult);
      
      if (backResult.recognitionStatus === BlinkIDSDK.RecognizerResultState.Empty) {
        console.warn('[ScanLicense] Back side returned Empty');
      }

      const result = await recognizerRef.current.getResult();
      console.log('[ScanLicense] ===== FULL RESULT =====');
      console.log('[ScanLicense] Full result object:', result);
      console.log('[ScanLicense] Result state:', result.state);
      console.log('[ScanLicense] Processing status:', result.processingStatus);
      console.log('[ScanLicense] Front processing status:', result.frontProcessingStatus);
      console.log('[ScanLicense] Back processing status:', result.backProcessingStatus);
      console.log('[ScanLicense] Recognition mode:', result.recognitionMode);
      console.log('[ScanLicense] Scanning first side done:', result.scanningFirstSideDone);
      
      // Check VIZ data from front
      console.log('[ScanLicense] === FRONT VIZ DATA ===');
      console.log('[ScanLicense] frontViz:', result.frontViz);
      if (result.frontViz) {
        console.log('[ScanLicense] frontViz.firstName:', result.frontViz.firstName);
        console.log('[ScanLicense] frontViz.lastName:', result.frontViz.lastName);
        console.log('[ScanLicense] frontViz.documentNumber:', result.frontViz.documentNumber);
        console.log('[ScanLicense] frontViz.dateOfBirth:', result.frontViz.dateOfBirth);
      }
      
      // Check VIZ data from back
      console.log('[ScanLicense] === BACK VIZ DATA ===');
      console.log('[ScanLicense] backViz:', result.backViz);
      if (result.backViz) {
        console.log('[ScanLicense] backViz has data:', Object.keys(result.backViz).length > 0);
      }
      
      console.log('[ScanLicense] === MAIN RESULT FIELDS ===');
      console.log('[ScanLicense] firstName:', result.firstName);
      console.log('[ScanLicense] lastName:', result.lastName);
      console.log('[ScanLicense] dateOfBirth:', result.dateOfBirth);
      console.log('[ScanLicense] documentNumber:', result.documentNumber);
      console.log('[ScanLicense] barcode:', result.barcode);
      
      // Check if barcode was scanned
      if (result.barcode && result.barcode.barcodeData) {
        console.log('[ScanLicense] ===== BARCODE RAW DATA =====');
        console.log('[ScanLicense] Barcode.barcodeData:', result.barcode.barcodeData);
        console.log('[ScanLicense] Barcode.rawData length:', result.barcode.barcodeData?.rawData?.length || 0);
        console.log('[ScanLicense] Barcode.stringData:', result.barcode.barcodeData?.stringData);
        console.log('[ScanLicense] Barcode.empty:', result.barcode.empty);
        console.log('[ScanLicense] ============================');
      }
      
      console.log('[ScanLicense] ======================');

      const extractValue = (obj) => {
        if (!obj) return '';
        if (typeof obj === 'string') return obj;
        if (obj.latin) return obj.latin;
        if (obj.originalString) return obj.originalString;
        if (obj.description) return obj.description;
        if (obj.value) return obj.value;
        if (obj.alpha2) return obj.alpha2;
        // Log what we're trying to extract for debugging
        if (Object.keys(obj).length > 0) {
          console.log('[ScanLicense] Extracting from object:', obj, 'Keys:', Object.keys(obj));
        }
        return '';
      };

      const extractDate = (dateObj) => {
        if (!dateObj) return '';
        if (typeof dateObj === 'string') return dateObj;
        
        // Handle DateResult object
        if (dateObj.year && dateObj.month && dateObj.day) {
          const month = String(dateObj.month).padStart(2, '0');
          const day = String(dateObj.day).padStart(2, '0');
          return `${dateObj.year}-${month}-${day}`;
        }
        
        // Handle Date object
        if (dateObj.successfullyParsed && dateObj.date) {
          const d = dateObj.date;
          if (d.year && d.month && d.day) {
            const month = String(d.month).padStart(2, '0');
            const day = String(d.day).padStart(2, '0');
            return `${d.year}-${month}-${day}`;
          }
        }
        
        console.log('[ScanLicense] Could not extract date from:', dateObj);
        return '';
      };

      // Try barcode first, then VIZ data, then main result fields
      const barcodeData = result.barcode;
      const frontViz = result.frontViz;
      const backViz = result.backViz;
      
      console.log('[ScanLicense] ===== DATA SOURCE PRIORITY =====');
      console.log('[ScanLicense] Barcode available:', !!barcodeData);
      console.log('[ScanLicense] Front VIZ available:', !!frontViz);
      console.log('[ScanLicense] Back VIZ available:', !!backViz);
      
      // Determine which data source to use
      let useBarcode = false;
      let useFrontViz = false;
      let useBackViz = false;
      
      if (barcodeData && (barcodeData.firstName || barcodeData.lastName)) {
        useBarcode = true;
        console.log('[ScanLicense] Using BARCODE data');
      } else if (frontViz && (frontViz.firstName || frontViz.lastName)) {
        useFrontViz = true;
        console.log('[ScanLicense] Using FRONT VIZ data');
      } else if (backViz && (backViz.firstName || backViz.lastName)) {
        useBackViz = true;
        console.log('[ScanLicense] Using BACK VIZ data');
      } else {
        console.log('[ScanLicense] Using MAIN RESULT fields (fallback)');
      }
      
      console.log('[ScanLicense] ================================');

      const extractedData = {
        firstName: useBarcode ? extractValue(barcodeData.firstName) : 
                   useFrontViz ? extractValue(frontViz.firstName) :
                   useBackViz ? extractValue(backViz.firstName) :
                   extractValue(result.firstName),
                   
        lastName: useBarcode ? extractValue(barcodeData.lastName) : 
                  useFrontViz ? extractValue(frontViz.lastName) :
                  useBackViz ? extractValue(backViz.lastName) :
                  extractValue(result.lastName),
                  
        fullName: useBarcode ? extractValue(barcodeData.fullName) : 
                  useFrontViz ? extractValue(frontViz.fullName) :
                  useBackViz ? extractValue(backViz.fullName) :
                  extractValue(result.fullName),
                  
        dateOfBirth: useBarcode ? extractDate(barcodeData.dateOfBirth) : 
                     useFrontViz ? extractDate(frontViz.dateOfBirth) :
                     useBackViz ? extractDate(backViz.dateOfBirth) :
                     extractDate(result.dateOfBirth),
                     
        licenseNumber: useBarcode ? extractValue(barcodeData.documentNumber) : 
                       useFrontViz ? extractValue(frontViz.documentNumber) :
                       useBackViz ? extractValue(backViz.documentNumber) :
                       extractValue(result.documentNumber),
                       
        address: useBarcode ? extractValue(barcodeData.address) : 
                 useFrontViz ? extractValue(frontViz.address) :
                 useBackViz ? extractValue(backViz.address) :
                 extractValue(result.address),
                 
        city: useBarcode ? extractValue(barcodeData.addressCity) : '',
        state: useBarcode ? extractValue(barcodeData.addressJurisdictionCode) : '',
        zipCode: useBarcode ? extractValue(barcodeData.addressPostalCode) : '',
        
        expirationDate: useBarcode ? extractDate(barcodeData.dateOfExpiry) : 
                        useFrontViz ? extractDate(frontViz.dateOfExpiry) :
                        useBackViz ? extractDate(backViz.dateOfExpiry) :
                        extractDate(result.dateOfExpiry),
                        
        issueDate: useBarcode ? extractDate(barcodeData.dateOfIssue) : 
                   useFrontViz ? extractDate(frontViz.dateOfIssue) :
                   useBackViz ? extractDate(backViz.dateOfIssue) :
                   extractDate(result.dateOfIssue),
                   
        sex: useBarcode ? extractValue(barcodeData.sex) : 
             useFrontViz ? extractValue(frontViz.sex) :
             useBackViz ? extractValue(backViz.sex) :
             extractValue(result.sex),
             
        height: useBarcode ? extractValue(barcodeData.height) : '',
        eyeColor: useBarcode ? extractValue(barcodeData.eyeColour) : '',
        documentClass: useBarcode ? extractValue(barcodeData.documentAdditionalNumber) : '',
      };

      console.log('[ScanLicense] Extracted data:', extractedData);

      // Check if we got any meaningful data
      const hasData = extractedData.firstName || extractedData.lastName || extractedData.licenseNumber;
      
      // Store images and data in localStorage (same as DriverLicenseScanner)
      localStorage.setItem('scannedLicenseFront', frontImage.url);
      localStorage.setItem('scannedLicenseBack', backImage.url);
      localStorage.setItem('scannedLicenseData', JSON.stringify(extractedData));
      localStorage.setItem('licenseScanned', 'true');
      localStorage.setItem('licenseDataExtracted', hasData ? 'true' : 'false');

      console.log('[ScanLicense] License images stored in localStorage');
      console.log('[ScanLicense] Data extraction status:', hasData ? 'SUCCESS' : 'FAILED - Manual entry required');
      
      if (!hasData) {
        console.warn('[ScanLicense] ⚠️ No license data could be extracted from images.');
        console.warn('[ScanLicense] Images are saved but user will need to enter information manually.');
        console.warn('[ScanLicense] Possible reasons: Low image quality, glare, barcode not visible/readable');
        toast.warning('License scanned but data extraction failed. Please enter details manually.');
      } else {
        console.log('[ScanLicense] ✅ License data successfully extracted:', extractedData);
      }

      // Cleanup
      if (recognizerRunnerRef.current) {
        try {
          recognizerRunnerRef.current.delete();
          recognizerRunnerRef.current = null;
        } catch (cleanupErr) {
          console.warn('[ScanLicense] Recognizer runner cleanup skipped (already deleted)');
        }
      }
      
      if (recognizerRef.current) {
        try {
          recognizerRef.current.delete();
          recognizerRef.current = null;
        } catch (cleanupErr) {
          console.warn('[ScanLicense] Recognizer cleanup skipped (already deleted)');
        }
      }

      const returnTo = searchParams.get('returnTo') || '/';
      console.log('[ScanLicense] Processing complete, redirecting to:', returnTo);
      
      // Short delay to ensure localStorage is written
      setTimeout(() => {
        navigate(returnTo, { replace: true });
      }, 500);

    } catch (err) {
      console.error('[ScanLicense] Processing error:', err);
      setError('Failed to process license: ' + err.message);
      setIsProcessing(false);
    }
  };

  const createCapturedFrame = async (blob) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Set canvas to actual image dimensions
        canvas.width = img.width;
        canvas.height = img.height;
        
        console.log('[ScanLicense] Image dimensions:', img.width, 'x', img.height);
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Create CapturedFrame object compatible with BlinkID SDK
        const capturedFrame = {
          imageData: imageData,
          width: canvas.width,
          height: canvas.height
        };
        
        console.log('[ScanLicense] CapturedFrame created:', capturedFrame.width, 'x', capturedFrame.height, 'pixels');
        resolve(capturedFrame);
      };

      img.onerror = () => {
        console.error('[ScanLicense] Failed to load image from blob');
        reject(new Error('Failed to load image'));
      };
      
      img.src = URL.createObjectURL(blob);
    });
  };

  const handleCancel = () => {
    const returnTo = searchParams.get('returnTo') || '/';
    navigate(returnTo, { replace: true });
  };

  if (error) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: 'white', padding: '20px' }}>
        <div style={{ backgroundColor: 'rgba(220, 53, 69, 0.95)', padding: '20px', borderRadius: '12px', maxWidth: '400px', textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>Error</h2>
          <p style={{ margin: '0', fontSize: '16px' }}>{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</p>
        </div>
        <button onClick={handleCancel} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
          Go Back
        </button>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: 'white' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid white', borderRadius: '50%', width: '60px', height: '60px', animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
        <p style={{ fontSize: '18px', margin: 0 }}>Initializing scanner...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: 'white' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid white', borderRadius: '50%', width: '60px', height: '60px', animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
        <p style={{ fontSize: '18px', margin: 0 }}>Processing license...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', position: 'fixed', top: 0, left: 0, overflow: 'hidden' }}>
      {!capturedImage ? (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }} 
          />
          
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
              <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '20px', height: '20px', borderTop: '4px solid #4CAF50', borderLeft: '4px solid #4CAF50' }} />
              <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '20px', height: '20px', borderTop: '4px solid #4CAF50', borderRight: '4px solid #4CAF50' }} />
              <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '20px', height: '20px', borderBottom: '4px solid #4CAF50', borderLeft: '4px solid #4CAF50' }} />
              <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderBottom: '4px solid #4CAF50', borderRight: '4px solid #4CAF50' }} />
            </div>
          )}
          
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
            {currentSide === 'front' ? 'Position the FRONT of your license in the frame' : 'Position the BACK of your license in the frame'}
          </div>
          
          <div style={{ 
            position: 'absolute', 
            bottom: '30px', 
            left: '0', 
            right: '0', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '12px', 
            zIndex: 200 
          }}>
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
              {currentSide === 'front' ? 'Step 1 of 2' : 'Step 2 of 2'}
            </div>
            
            <button 
              onClick={handleCancel} 
              style={{ 
                backgroundColor: 'rgba(108, 117, 125, 0.9)', 
                color: 'white', 
                border: 'none', 
                padding: '10px 24px', 
                borderRadius: '8px', 
                fontSize: '14px', 
                fontWeight: 'bold', 
                cursor: 'pointer' 
              }}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%',
          display: 'flex', 
          flexDirection: 'column'
        }}>
          <img 
            src={capturedImage} 
            alt="Captured License" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain', 
              backgroundColor: '#000' 
            }} 
          />
          
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
            {currentSide === 'front' ? 'Front Side (1/2)' : 'Back Side (2/2)'}
          </div>
          
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
            <button 
              onClick={handleRetake} 
              style={{ 
                flex: 1, 
                padding: '15px', 
                fontSize: '16px', 
                backgroundColor: '#6c757d', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: 'bold' 
              }}
            >
              Retake
            </button>
            <button 
              onClick={handleConfirm} 
              disabled={isProcessing}
              style={{ 
                flex: 1, 
                padding: '15px', 
                fontSize: '16px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: 'bold',
                opacity: isProcessing ? 0.6 : 1
              }}
            >
              {isProcessing ? 'Processing...' : (currentSide === 'front' ? 'Next →' : 'Process ✓')}
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default ScanLicense;
