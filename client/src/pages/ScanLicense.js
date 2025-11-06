/*
 * Microblink BlinkID in-browser scanning page for mobile
 */
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createBlinkId } from '@microblink/blinkid';
import { apiService } from '../services/api';

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

  // Capture and process image
  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current || !blinkidRef.current) {
      return;
    }

    try {
      setScanning(false);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

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

      // Get companyId and userId from URL params or localStorage
      const companyId = searchParams.get('companyId') || localStorage.getItem('companyId');
      const userId = searchParams.get('userId') || localStorage.getItem('userId');

      if (!userId) {
        throw new Error('User ID is required to save license information');
      }

      // Save license information to database
      try {
        // Convert formattedResult to match CreateCustomerLicenseDto format
        // Convert date strings to ISO format for API
        const convertDateForAPI = (dateStr) => {
          if (!dateStr) return null;
          // If already in ISO format (YYYY-MM-DD), use it directly
          if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr + 'T00:00:00Z'; // Convert to ISO datetime format
          }
          // Try to parse and convert
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
        // Continue anyway - at least the image was uploaded
      }

      // Store result in localStorage for the booking page to pick up
      localStorage.setItem('scannedLicenseData', JSON.stringify(formattedResult));

      toast.success('License scanned successfully!');
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
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4 text-center">Driver License Scan</h1>

          {status === 'init' && (
            <div className="text-center">
              <p className="mb-4">Initializing scanner...</p>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <p className="mb-4">Loading BlinkID SDK...</p>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            </div>
          )}

          {status === 'ready' && !scanning && (
            <div className="space-y-4">
              <p className="text-center mb-4">Click to start camera and scan your license</p>
              <button
                onClick={startCamera}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
              >
                Start Camera
              </button>
            </div>
          )}

          {status === 'ready' && scanning && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-4 border-blue-500 rounded-lg" style={{ width: '80%', height: '60%' }}>
                    <div className="absolute top-2 left-2 text-xs text-blue-400">Align license here</div>
                  </div>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                <button
                  onClick={captureAndProcess}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
                >
                  Capture & Scan
                </button>
                <button
                  onClick={cancelScan}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className="text-center">
              <p className="mb-4">Processing license image...</p>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center">
              <p className="text-green-400 mb-4">✓ License scanned successfully!</p>
              <p className="text-sm text-gray-400">You can close this page.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <p className="text-red-400 mb-4">{error || 'An error occurred'}</p>
              {status === 'error' && (
                <button
                  onClick={() => {
                    setStatus('ready');
                    setError('');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanLicense;


