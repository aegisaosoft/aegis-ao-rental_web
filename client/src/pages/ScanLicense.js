/*
 * Microblink BlinkID in-browser scanning page for mobile - with front/back support
 */
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createBlinkId } from '@microblink/blinkid';
import { apiService } from '../services/api';
import { CheckCircle2, Camera, XCircle } from 'lucide-react';

const ScanLicense = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('init');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const blinkidRef = useRef(null);

  // Initialize BlinkID SDK
  useEffect(() => {
    const initBlinkID = async () => {
      try {
        setStatus('loading');

        const licenseKey = process.env.REACT_APP_BLINKID_LICENSE_KEY || '';

        if (!licenseKey) {
          toast.error('BlinkID license key missing');
          setError('BlinkID license key missing');
          setStatus('error');
          return;
        }

        // Initialize BlinkID SDK using npm package
        const blinkid = await createBlinkId({
          licenseKey: licenseKey
        });

        blinkidRef.current = blinkid;
        setStatus('ready');
      } catch (e) {
        console.error('BlinkID initialization error:', e);
        toast.error('Failed to initialize scanner');
        setError(e.message || 'Initialization failed');
        setStatus('error');
      }
    };

    initBlinkID();

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      setScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Failed to access camera. Please allow camera permissions.');
      setError('Camera access denied');
      setScanning(false);
      setStatus('error');
    }
  };

  // Capture and process image - ONE TIME ONLY
  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current || !blinkidRef.current) {
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // STOP CAMERA IMMEDIATELY after capture
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setScanning(false);

      // Convert canvas to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));

      setStatus('processing');
      toast.info('Processing license image...');

      // Recognize the image using BlinkID v7
      const result = await blinkidRef.current.recognize(blob);
      
      if (!result || !result.isValid) {
        throw new Error('Could not extract license information. Please try again.');
      }

      // Format the result
      const formatDate = (dateObj) => {
        if (!dateObj) return '';
        if (typeof dateObj === 'string') return dateObj;
        if (dateObj.year && dateObj.month && dateObj.day) {
          return `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
        }
        if (dateObj instanceof Date) {
          return dateObj.toISOString().split('T')[0];
        }
        return '';
      };

      const formattedResult = {
        licenseNumber: result.documentNumber || result.licenseNumber || '',
        firstName: result.firstName || '',
        lastName: result.lastName || '',
        middleName: result.middleName || '',
        issuingState: result.issuingState || result.state || result.jurisdiction || '',
        issuingCountry: result.issuingCountry || result.country || 'US',
        expirationDate: result.expirationDate ? formatDate(result.expirationDate) : '',
        issueDate: result.issueDate ? formatDate(result.issueDate) : '',
        address: result.address || result.addressLine1 || '',
        city: result.city || '',
        state: result.state || result.addressState || '',
        postalCode: result.postalCode || result.zip || '',
        country: result.country || 'US',
        dateOfBirth: result.dateOfBirth ? formatDate(result.dateOfBirth) : '',
        sex: result.sex || result.gender || '',
        height: result.height || '',
        eyeColor: result.eyeColor || '',
      };

      // Get userId from URL params or localStorage
      const userId = searchParams.get('userId') || localStorage.getItem('userId');

      if (!userId) {
        throw new Error('User ID is required to save license information');
      }

      // Save license information to database
      try {
        const convertDateForAPI = (dateStr) => {
          if (!dateStr) return null;
          if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr + 'T00:00:00Z';
          }
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          } catch (e) {
            console.warn('[ScanLicense] Could not parse date:', dateStr);
          }
          return null;
        };

        const licenseData = {
          licenseNumber: formattedResult.licenseNumber || '',
          stateIssued: formattedResult.issuingState || formattedResult.state || '',
          countryIssued: formattedResult.issuingCountry || formattedResult.country || 'US',
          sex: formattedResult.sex || null,
          height: formattedResult.height || null,
          eyeColor: formattedResult.eyeColor || null,
          middleName: formattedResult.middleName || null,
          issueDate: convertDateForAPI(formattedResult.issueDate),
          expirationDate: convertDateForAPI(formattedResult.expirationDate),
          licenseAddress: formattedResult.address || null,
          licenseCity: formattedResult.city || null,
          licenseState: formattedResult.state || null,
          licensePostalCode: formattedResult.postalCode || null,
          licenseCountry: formattedResult.country || 'US',
          restrictionCode: null,
          endorsements: null
        };

        // Validate required fields
        if (!licenseData.licenseNumber || !licenseData.stateIssued) {
          throw new Error('License number and state are required');
        }

        if (!licenseData.expirationDate) {
          throw new Error('Expiration date is required');
        }

        console.log('[ScanLicense] Saving license data to database:', licenseData);

        // Call API to save license information
        const saveResponse = await apiService.upsertCustomerLicense(userId, licenseData);
        
        console.log('[ScanLicense] License data saved successfully:', saveResponse);
        toast.success('License information saved to database!');
      } catch (saveErr) {
        console.error('[ScanLicense] Error saving license data:', saveErr);
        toast.error('License scanned but failed to save to database: ' + (saveErr.response?.data?.message || saveErr.message));
      }

      // Store result in localStorage for the booking page to pick up
      localStorage.setItem('scannedLicenseData', JSON.stringify(formattedResult));

      toast.success('🎉 License scanned successfully!');
      setStatus('done');

      // Navigate back to returnTo page if provided
      const returnTo = searchParams.get('returnTo');
      if (returnTo) {
        setTimeout(() => {
          navigate(returnTo);
        }, 2000);
      }
    } catch (err) {
      console.error('Processing error:', err);
      toast.error('Failed to process license. Please try again.');
      setError(err.message || 'Processing failed');
      setStatus('error');
      // Reset to allow retry
      setTimeout(() => {
        setStatus('ready');
        setError('');
      }, 2000);
    }
  };

  // Cancel scanning
  const cancelScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
    setStatus('ready');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 shadow-lg">
        <h1 className="text-xl font-bold text-center">Scan Driver License</h1>
        <p className="text-sm text-center text-gray-400 mt-1">
          Position your license in the frame
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative">
        {status === 'init' && (
          <div className="text-center"><p>Initializing scanner...</p></div>
        )}

        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
            <p>Loading BlinkID SDK...</p>
          </div>
        )}

        {status === 'ready' && !scanning && (
          <div className="text-center">
            <Camera className="h-24 w-24 text-blue-500 mx-auto mb-4" />
            <p className="text-xl font-bold mb-6">
              Ready to scan your license
            </p>
            <button
              onClick={startCamera}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg"
            >
              Start Camera
            </button>
          </div>
        )}

        {status === 'ready' && scanning && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Dark overlay with cutout */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top dark area */}
              <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-60" style={{ height: 'calc(50% - 140px)' }}></div>
              {/* Bottom dark area */}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60" style={{ height: 'calc(50% - 140px)' }}></div>
              {/* Left dark area */}
              <div className="absolute left-0 bg-black bg-opacity-60" style={{ top: 'calc(50% - 140px)', width: 'calc((100% - 90%) / 2)', height: '280px' }}></div>
              {/* Right dark area */}
              <div className="absolute right-0 bg-black bg-opacity-60" style={{ top: 'calc(50% - 140px)', width: 'calc((100% - 90%) / 2)', height: '280px' }}></div>
              
              {/* License frame guide - centered horizontally and vertically */}
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ width: '90%', maxWidth: '450px', height: '280px' }}>
                {/* Border frame */}
                <div className="absolute inset-0 border-4 border-white rounded-2xl shadow-lg"></div>
                
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-10 h-10 border-t-6 border-l-6 border-green-400 rounded-tl-2xl"></div>
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-6 border-r-6 border-green-400 rounded-tr-2xl"></div>
                <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-6 border-l-6 border-green-400 rounded-bl-2xl"></div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-6 border-r-6 border-green-400 rounded-br-2xl"></div>
                
                {/* Instructions above frame */}
                <div className="absolute -top-16 left-0 right-0 flex justify-center">
                  <div className="bg-black bg-opacity-80 px-6 py-3 rounded-lg">
                    <p className="text-white text-base font-semibold text-center">
                      Place license in frame
                    </p>
                  </div>
                </div>
                
                {/* Centering crosshair */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-8 h-0.5 bg-green-400 absolute -left-4 top-1/2"></div>
                  <div className="w-0.5 h-8 bg-green-400 absolute left-1/2 -top-4"></div>
                </div>
              </div>
            </div>
          </>
        )}

        {status === 'processing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
            <p className="text-lg">Processing license...</p>
          </div>
        )}

        {status === 'done' && (
          <div className="text-center">
            <CheckCircle2 className="h-24 w-24 text-green-500 mx-auto mb-4" />
            <p className="text-2xl font-bold mb-2">Success!</p>
            <p className="text-gray-400">License scanned successfully</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <XCircle className="h-24 w-24 text-red-500 mx-auto mb-4" />
            <p className="text-xl font-bold mb-2">Error</p>
            <p className="text-gray-400">{error || 'An error occurred'}</p>
            <button
              onClick={() => {
                setStatus('ready');
                setError('');
              }}
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg"
            >
              Try Again
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      {status === 'ready' && scanning && (
        <div className="bg-gray-800 p-6 shadow-lg">
          <div className="flex gap-3 max-w-md mx-auto">
            <button
              onClick={cancelScan}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-4 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={captureAndProcess}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2"
            >
              <Camera className="h-6 w-6" />
              Capture
            </button>
          </div>
          
          {/* Scanning Tips */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-300">
              💡 <strong>Tips:</strong> Hold camera steady • Good lighting • License flat
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanLicense;
