import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const ScanLicense = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
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
    const initCamera = async () => {
      try {
        setError(null);
        setIsInitializing(false);
        startCamera();
      } catch (err) {
        setError(err.message || 'Failed to initialize camera');
        setIsInitializing(false);
      }
    };

    initCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {

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

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Log what we actually got

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
          setIsCameraActive(true);
          setError(null);
        } catch (playErr) {
          if (playErr.name !== 'AbortError') {
            throw playErr;
          }
          setIsCameraActive(true);
          setError(null);
        }
      }
    } catch (err) {
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


    canvas.toBlob(async (blob) => {
      if (!blob) return;


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
    if (!frontImage || !backImage) {
      setError('Missing images');
      return;
    }

    setIsProcessing(true);

    try {

      // Create FormData for both sides
      const formData = new FormData();
      formData.append('frontSide', frontImage.blob, 'license-front.png');
      formData.append('backSide', backImage.blob, 'license-back.png');

      // Call new API endpoint that processes both sides
      const response = await fetch('/api/license/validate-both-sides', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {

        // Extract data from the combined result
        const extractedData = result.data || {};
        const hasData = extractedData.firstName || extractedData.lastName || extractedData.licenseNumber;

        // Enhance data with processing metadata
        const enhancedData = {
          // Use extracted data or fallback to empty values
          firstName: extractedData.firstName || '',
          lastName: extractedData.lastName || '',
          middleName: extractedData.middleName || '',
          fullName: extractedData.fullName || '',
          dateOfBirth: extractedData.dateOfBirth || '',
          sex: extractedData.sex || '',

          // License information
          licenseNumber: extractedData.licenseNumber || '',
          issuingState: extractedData.issuingState || '',
          issueDate: extractedData.issueDate || '',
          expirationDate: extractedData.expirationDate || '',

          // Address information
          address: extractedData.address || '',
          city: extractedData.city || '',
          state: extractedData.state || '',
          zipCode: extractedData.postalCode || extractedData.zipCode || '',

          // Physical characteristics
          height: extractedData.height || '',
          eyeColor: extractedData.eyeColor || '',

          // Processing metadata
          processingMethod: result.processingMethod || 'combined_ai',
          primarySource: result.primarySource || 'unknown',
          confidence: result.confidence || 0,
          extractionTimestamp: new Date().toISOString(),
          needsManualEntry: !hasData,

          // Store processing details for debugging
          frontSideResult: result.frontSideResult,
          backSideResult: result.backSideResult
        };


        // Store images and data in localStorage
        localStorage.setItem('scannedLicenseFront', frontImage.url);
        localStorage.setItem('scannedLicenseBack', backImage.url);
        localStorage.setItem('scannedLicenseData', JSON.stringify(enhancedData));
        localStorage.setItem('licenseScanned', 'true');
        localStorage.setItem('licenseDataExtracted', hasData ? 'true' : 'false');

        if (hasData) {
          if (result.primarySource === 'pdf417_barcode') {
          } else if (result.primarySource === 'document_ai_ocr') {
          } else {
          }
        } else {
          toast.warning('License images processed but data extraction failed. Please enter details manually.');
        }

      } else {

        // Store images even if processing failed
        localStorage.setItem('scannedLicenseFront', frontImage.url);
        localStorage.setItem('scannedLicenseBack', backImage.url);
        localStorage.setItem('scannedLicenseData', JSON.stringify({
          processingMethod: 'failed',
          extractionTimestamp: new Date().toISOString(),
          needsManualEntry: true,
          errorMessage: result.message || 'Processing failed'
        }));
        localStorage.setItem('licenseScanned', 'true');
        localStorage.setItem('licenseDataExtracted', 'false');

        toast.error(result.message || 'Failed to process license images');
      }

      const returnTo = searchParams.get('returnTo') || '/';

      // Short delay to ensure localStorage is written
      setTimeout(() => {
        navigate(returnTo, { replace: true });
      }, 500);

    } catch (err) {

      // Store images even if there was an error
      localStorage.setItem('scannedLicenseFront', frontImage.url);
      localStorage.setItem('scannedLicenseBack', backImage.url);
      localStorage.setItem('scannedLicenseData', JSON.stringify({
        processingMethod: 'error',
        extractionTimestamp: new Date().toISOString(),
        needsManualEntry: true,
        errorMessage: err.message
      }));
      localStorage.setItem('licenseScanned', 'true');
      localStorage.setItem('licenseDataExtracted', 'false');

      setError('Failed to process license: ' + err.message);
      toast.error('Processing error. Please try again or enter details manually.');
      setIsProcessing(false);
    }
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
        <p style={{ fontSize: '18px', margin: 0 }}>Initializing camera...</p>
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
