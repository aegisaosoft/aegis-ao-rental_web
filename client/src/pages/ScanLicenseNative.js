/*
 * BlinkID Full-Screen Scanner with VideoRecognizer
 * Native BlinkID engine with horizontal frame for driver's license
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as BlinkIDSDK from '@microblink/blinkid-in-browser-sdk';
import { apiService } from '../services/api';
import { useCompany } from '../context/CompanyContext';

// Global flag to prevent double initialization in React Strict Mode
let isInitializing = false;
let initializationComplete = false;

const ScanLicenseNative = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { companyConfig } = useCompany();
  
  const videoRef = useRef(null);
  const [status, setStatus] = useState('init');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Initializing...');
  const [currentSide, setCurrentSide] = useState('front');
  
  const videoRecognizerRef = useRef(null);
  const recognizerRef = useRef(null);
  const wasmSDKRef = useRef(null);
  const recognizerRunnerRef = useRef(null);

  const handleProcessResult = useCallback(async (result) => {
    try {
      setStatus('processing');
      toast.success('✅ License scanned!');
      
      const extractValue = (obj) => {
        if (!obj) return '';
        if (typeof obj === 'string') return obj;
        if (obj.latin) return obj.latin;
        if (obj.originalString) return obj.originalString;
        if (obj.description) return obj.description;
        if (obj.value) return obj.value;
        return String(obj);
      };

      const licenseData = {
        firstName: extractValue(result.firstName),
        lastName: extractValue(result.lastName),
        dateOfBirth: extractValue(result.dateOfBirth),
        licenseNumber: extractValue(result.documentNumber),
        stateIssued: extractValue(result.issuingAuthority) || extractValue(result.jurisdiction),
        expirationDate: extractValue(result.dateOfExpiry),
        address: extractValue(result.address)
      };

      console.log('[FullScreenScanner] Extracted:', licenseData);

      const userId = searchParams.get('userId');
      if (userId) {
        await apiService.upsertCustomerLicense(userId, licenseData);
        toast.success('✅ Saved to database!');
      }

      const returnTo = searchParams.get('returnTo');
      if (returnTo) {
        setTimeout(() => navigate(returnTo), 2000);
      }
    } catch (err) {
      console.error('[FullScreenScanner] Processing error:', err);
      toast.error('Failed to save');
      setStatus('error');
      setError(err.message);
    }
  }, [navigate, searchParams]);

  useEffect(() => {
    if (!companyConfig) {
      setStatus('loading');
      return;
    }

    // Prevent double initialization in React Strict Mode using module-level flag
    if (isInitializing || initializationComplete) {
      console.log('[FullScreenScanner] Already initializing or complete, skipping...');
      return;
    }

    let mounted = true;
    isInitializing = true;
    
    const initScanner = async () => {
      try {
        if (!mounted) return;
        
        setStatus('loading');
        setMessage('Loading BlinkID...');

        const licenseKey = companyConfig.blinkKey || companyConfig.BlinkKey;
        if (!licenseKey) {
          throw new Error('BlinkID license key not configured');
        }

        console.log('[FullScreenScanner] Initializing BlinkID SDK...');
        
        if (!mounted) return;
        
        const loadSettings = new BlinkIDSDK.WasmSDKLoadSettings(licenseKey);
        loadSettings.engineLocation = `${window.location.origin}/resources/`;
        
        const wasmSDK = await BlinkIDSDK.loadWasmModule(loadSettings);
        wasmSDKRef.current = wasmSDK;
        console.log('[FullScreenScanner] ✅ SDK loaded');

        if (!mounted) return;

        // Create multi-side recognizer
        const recognizer = await BlinkIDSDK.createBlinkIdMultiSideRecognizer(wasmSDK);
        recognizerRef.current = recognizer;
        
        const settings = await recognizer.currentSettings();
        settings.returnFullDocumentImage = true;
        settings.returnFaceImage = true;
        await recognizer.updateSettings(settings);
        
        console.log('[FullScreenScanner] ✅ Recognizer ready');

        if (!mounted) return;

        // Create recognizer runner
        const recognizerRunner = await BlinkIDSDK.createRecognizerRunner(
          wasmSDK,
          [recognizer],
          false
        );
        recognizerRunnerRef.current = recognizerRunner;

        if (!mounted) return;

        // Wait for video element to be ready
        let retries = 0;
        while (!videoRef.current && retries < 10) {
          console.warn('[FullScreenScanner] Video element not ready, waiting...', retries);
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
        
        if (!videoRef.current) {
          throw new Error('Video element not available after retries');
        }

        console.log('[FullScreenScanner] Creating VideoRecognizer with video element:', !!videoRef.current);
        setMessage('Starting camera...');
        
        // Create VideoRecognizer - BlinkID will handle camera access internally
        // Per Microblink docs: pass video element and recognizer runner
        const videoRecognizer = await BlinkIDSDK.VideoRecognizer.createVideoRecognizerFromCameraStream(
          videoRef.current,
          recognizerRunner
        );

        videoRecognizerRef.current = videoRecognizer;
        console.log('[FullScreenScanner] ✅ Ready to scan');

        if (!mounted) return;

        // Start recognition with callback approach
        setStatus('scanning');
        setMessage('📸 Ready! Position license in view');
        console.log('[FullScreenScanner] Starting recognition with callbacks...');
        
        // Set a timeout for recognition
        const recognitionTimeout = setTimeout(() => {
          if (mounted && videoRecognizerRef.current) {
            console.warn('[FullScreenScanner] Recognition timeout - no document detected after 45 seconds');
            toast.error('Timeout: Could not detect license. Try better lighting and hold license closer.');
            setMessage('⏱️ Timeout - Please try again');
          }
        }, 45000);
        
        // Start recognition with callbacks
        videoRecognizer.startRecognition(
          async (recognitionState) => {
            if (!mounted) return;
            
            console.log('[FullScreenScanner] State:', recognitionState);
            
            if (recognitionState === BlinkIDSDK.RecognizerResultState.Empty) {
              setMessage('🔍 Searching for document...');
              return;
            }
            
            if (recognitionState === BlinkIDSDK.RecognizerResultState.Uncertain) {
              setMessage('⚡ Detected! Hold steady...');
              return;
            }
            
            if (recognitionState === BlinkIDSDK.RecognizerResultState.Valid) {
              clearTimeout(recognitionTimeout);
              console.log('[FullScreenScanner] ✅ Valid recognition!');
              
              videoRecognizer.pauseRecognition();
              setMessage('✅ Captured!');
              
              const result = await recognizer.getResult();
              console.log('[FullScreenScanner] Result:', result);
              console.log('[FullScreenScanner] scanningFirstSideDone:', result.scanningFirstSideDone);
              
              if (!result.scanningFirstSideDone) {
                console.log('[FullScreenScanner] Front side captured');
                setCurrentSide('back');
                setMessage('🎉 Front done! Now scan BACK');
                toast.success('Front captured! Flip to back', { autoClose: 2000 });
                
                await new Promise(resolve => setTimeout(resolve, 2500));
                
                if (mounted) {
                  setMessage('📸 Position BACK of license');
                  videoRecognizer.resumeRecognition(true);
                }
              } else {
                console.log('[FullScreenScanner] ✅ Both sides complete!');
                setMessage('✅ Complete! Processing...');
                toast.success('Both sides captured!');
                await handleProcessResult(result);
              }
            }
          },
          (error) => {
            clearTimeout(recognitionTimeout);
            console.error('[FullScreenScanner] Recognition error:', error);
            setMessage('❌ Error: ' + error.message);
            toast.error('Scanning error: ' + error.message);
          }
        );

      } catch (err) {
        console.error('[FullScreenScanner] Init error:', err);
        if (mounted) {
          setError(err.message || 'Failed to initialize');
          setStatus('error');
        }
      } finally {
        isInitializing = false;
        if (mounted) {
          initializationComplete = true;
        }
      }
    };

    initScanner();

    // Cleanup - only run when component truly unmounts (not during Strict Mode remount)
    return () => {
      console.log('[FullScreenScanner] Cleanup starting...');
      mounted = false;
      
      // Only cleanup if this was a real unmount (navigation away)
      // Don't cleanup during React Strict Mode double-mount
      if (!initializationComplete) {
        console.log('[FullScreenScanner] Skipping cleanup - initialization not complete');
        return;
      }
      
      // Stop video recognizer
      if (videoRecognizerRef.current) {
        try {
          console.log('[FullScreenScanner] Releasing video feed...');
          videoRecognizerRef.current.releaseVideoFeed();
          videoRecognizerRef.current = null;
        } catch (e) {
          console.warn('[FullScreenScanner] Error releasing video feed:', e);
        }
      }
      
      // Delete recognizer runner
      if (recognizerRunnerRef.current) {
        try {
          console.log('[FullScreenScanner] Deleting recognizer runner...');
          recognizerRunnerRef.current.delete();
          recognizerRunnerRef.current = null;
        } catch (e) {
          console.warn('[FullScreenScanner] Error deleting recognizer runner:', e);
        }
      }
      
      // Delete recognizer
      if (recognizerRef.current) {
        try {
          console.log('[FullScreenScanner] Deleting recognizer...');
          recognizerRef.current.delete();
          recognizerRef.current = null;
        } catch (e) {
          console.warn('[FullScreenScanner] Error deleting recognizer:', e);
        }
      }
      
      // Reset flags for next mount
      isInitializing = false;
      initializationComplete = false;
      
      console.log('[FullScreenScanner] Cleanup complete');
    };
  }, [companyConfig, handleProcessResult]);

  return (
    <div className="fixed inset-0 bg-black">
      {/* Full-screen video */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Full-screen scanning frame with corner indicators */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Green corner indicators only - no frame border */}
        <div className="absolute top-8 left-8 w-24 h-24 border-t-8 border-l-8 border-green-400 rounded-tl-3xl animate-pulse"></div>
        <div className="absolute top-8 right-8 w-24 h-24 border-t-8 border-r-8 border-green-400 rounded-tr-3xl animate-pulse"></div>
        <div className="absolute bottom-24 left-8 w-24 h-24 border-b-8 border-l-8 border-green-400 rounded-bl-3xl animate-pulse"></div>
        <div className="absolute bottom-24 right-8 w-24 h-24 border-b-8 border-r-8 border-green-400 rounded-br-3xl animate-pulse"></div>
      </div>
      
      {/* Top status bar */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent text-white text-center py-6 px-4 z-10">
        <p className="text-2xl font-bold mb-2">{message}</p>
        <div className="flex items-center justify-center gap-2">
          <div className={`w-3 h-3 rounded-full ${currentSide === 'front' ? 'bg-green-400' : 'bg-gray-500'}`}></div>
          <span className="text-sm">Front</span>
          <div className="w-8 h-px bg-gray-500"></div>
          <div className={`w-3 h-3 rounded-full ${currentSide === 'back' ? 'bg-green-400' : 'bg-gray-500'}`}></div>
          <span className="text-sm">Back</span>
      </div>
      </div>
      
      {/* Bottom cancel button */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6 z-10">
      <button 
          onClick={() => {
            const returnTo = searchParams.get('returnTo');
            if (returnTo) navigate(returnTo);
            else navigate(-1);
          }}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl text-lg"
      >
        Cancel
      </button>
      </div>

      {/* Loading overlay */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-95 z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-green-400 mx-auto mb-6"></div>
            <p className="text-white text-2xl font-semibold">{message}</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-95 z-50">
          <div className="text-center max-w-md p-8">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <p className="text-red-400 text-xl mb-6">{error || 'An error occurred'}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanLicenseNative;
