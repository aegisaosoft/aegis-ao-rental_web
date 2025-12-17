/*
 * Mobile-friendly page to upload Driver License image.
 */
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { X, CreditCard } from 'lucide-react';
import { apiService } from '../services/api';
import { useCompany } from '../context/CompanyContext';

const MobileScan = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { companyConfig } = useCompany();
  const [status, setStatus] = useState('prompt'); // prompt, ready, preview, uploading, success
  const [imagePreview, setImagePreview] = useState('');
  const [frontImage, setFrontImage] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [uploadedFrontUrl, setUploadedFrontUrl] = useState(null);
  const [uploadedBackUrl, setUploadedBackUrl] = useState(null);
  const [uploadingSide, setUploadingSide] = useState(null); // 'front' or 'back'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const isWizardMode = searchParams.get('wizard') === 'true';
  
  // Check if company has BlinkID key configured
  const hasBlinkKey = companyConfig?.blinkKey || 
                      companyConfig?.BlinkKey || 
                      process.env.REACT_APP_BLINKID_LICENSE_KEY;
  // Initialize state from localStorage immediately
  const [companyId, setCompanyId] = useState(() => localStorage.getItem('companyId') || null);
  const [userId, setUserId] = useState(() => localStorage.getItem('userId') || null);
  const [tokenFromUrl, setTokenFromUrl] = useState(null);
  
  // Use refs to persist values across renders (won't be lost on re-render)
  // Initialize refs with current localStorage values
  const companyIdRef = useRef(localStorage.getItem('companyId') || null);
  const userIdRef = useRef(localStorage.getItem('userId') || null);
  
  // Track if we've already processed the token to prevent infinite loops
  const tokenProcessedRef = useRef(false);
  
  // Update refs when state changes
  useEffect(() => {
    companyIdRef.current = companyId;
    userIdRef.current = userId;
  }, [companyId, userId]);
  
  // Safety net: constantly sync refs from localStorage (in case something clears state)
  // This ensures refs always have the latest values from localStorage
  // CRITICAL: Also restore from refs if localStorage is cleared
  useEffect(() => {
    const syncFromStorage = () => {
      const storedCompanyId = localStorage.getItem('companyId');
      const storedUserId = localStorage.getItem('userId');
      
      // If refs have values but localStorage doesn't, restore to localStorage (protection against clearing)
      if (companyIdRef.current && !storedCompanyId) {
        console.log('[Sync] Restoring companyId to localStorage from ref:', companyIdRef.current);
        localStorage.setItem('companyId', companyIdRef.current);
      }
      if (userIdRef.current && !storedUserId) {
        console.log('[Sync] Restoring userId to localStorage from ref:', userIdRef.current);
        localStorage.setItem('userId', userIdRef.current);
      }
      
      // Always update refs if localStorage has values (defensive - ensure refs match localStorage)
      if (storedCompanyId) {
        companyIdRef.current = storedCompanyId;
        if (!companyId) setCompanyId(storedCompanyId);
      }
      if (storedUserId) {
        userIdRef.current = storedUserId;
        if (!userId) setUserId(storedUserId);
      }
    };
    
    // Sync immediately
    syncFromStorage();
    
    // Sync periodically to catch any localStorage updates/clears (every 1 second - more frequent)
    const interval = setInterval(syncFromStorage, 1000);
    return () => clearInterval(interval);
  }, [companyId, userId]);
  
  // Extract auth token, companyId, and userId from URL and store them
  useEffect(() => {
    console.log('[MobileScan] ========== EXTRACTING URL PARAMETERS ==========');
    console.log('[MobileScan] Full URL:', window.location.href);
    console.log('[MobileScan] Search params:', window.location.search);
    
    const tokenParam = searchParams.get('token');
    const companyIdFromUrl = searchParams.get('companyId');
    const userIdFromUrl = searchParams.get('userId');
    
    console.log('[MobileScan] Extracted parameters:');
    console.log('[MobileScan] - token:', tokenParam ? tokenParam.substring(0, 20) + '...' : 'NOT FOUND');
    console.log('[MobileScan] - companyId:', companyIdFromUrl || 'NOT FOUND');
    console.log('[MobileScan] - userId:', userIdFromUrl || 'NOT FOUND');
    
    // Store token in state so it's available throughout the component
    if (tokenParam) {
      setTokenFromUrl(tokenParam);
    }
    
    // Prevent infinite loop: if we've already processed this token, skip processing
    if (tokenParam && tokenProcessedRef.current) {
      console.log('[MobileScan] ⚠️ Token already processed, skipping to prevent infinite loop');
      // Still update companyId and userId from URL if needed, but don't process token again
    } else if (tokenParam) {
      // Mark as processing to prevent re-processing
      tokenProcessedRef.current = true;
      
      console.log('[MobileScan] ========== TOKEN FOUND IN URL ==========');
      console.log('[MobileScan] Raw token param:', tokenParam.substring(0, 50) + '...');
      console.log('[MobileScan] Token param length:', tokenParam.length);
      
      // Store the token from the QR code URL
      // Decode URL encoding and trim any whitespace
      let cleanToken = tokenParam.trim();
      
      // Decode URL encoding (in case token was URL-encoded in the QR code)
      try {
        cleanToken = decodeURIComponent(cleanToken);
        console.log('[MobileScan] Token decoded successfully');
      } catch (e) {
        // If decode fails, use original (might not be encoded)
        console.warn('[MobileScan] Token URL decode failed, using original:', e);
      }
      
      // Final trim after decoding
      cleanToken = cleanToken.trim();
      
      console.log('[MobileScan] Clean token preview (first 50 chars):', cleanToken.substring(0, 50));
      console.log('[MobileScan] Clean token length:', cleanToken.length);
      
      // Store token in server session instead of localStorage
      const storeTokenInSession = async () => {
        console.log('[MobileScan] ========== STORING TOKEN IN SESSION ==========');
        console.log('[MobileScan] Token length:', cleanToken.length);
        console.log('[MobileScan] Company ID:', companyIdFromUrl);
        console.log('[MobileScan] User ID:', userIdFromUrl);
        
        try {
          console.log('[MobileScan] Calling apiService.setSessionToken...');
          const response = await apiService.setSessionToken(cleanToken, companyIdFromUrl, userIdFromUrl);
          console.log('[MobileScan] setSessionToken response:', response);
          console.log('[MobileScan] ✅ Token stored in server session successfully');
          
          // NO profile verification needed - if setSessionToken succeeded, session is set
            // Token is now stored in session, so we don't need to reload
            // The tokenProcessedRef flag prevents reprocessing if the component re-renders
            // Token can stay in URL - it won't be processed again due to the ref flag
            console.log('[MobileScan] ✅ Token processed and stored in session. Component will not reprocess.');
        } catch (error) {
          console.error('[MobileScan] ❌ Failed to store token in session:', error);
          console.error('[MobileScan] Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            statusText: error.response?.statusText,
            config: {
              url: error.config?.url,
              method: error.config?.method,
              data: error.config?.data
            }
          });
          toast.error('Failed to import authentication: ' + (error.response?.data?.message || error.message));
        }
      };
      
      storeTokenInSession();
    } else {
      console.log('[MobileScan] ⚠️ No token found in URL parameters');
    }
    
    // Store companyId and userId from URL in state, refs, and localStorage
    if (companyIdFromUrl) {
      setCompanyId(companyIdFromUrl);
      companyIdRef.current = companyIdFromUrl;
      localStorage.setItem('companyId', companyIdFromUrl);
      console.log('Company ID imported from QR code URL:', companyIdFromUrl);
    }
    
    if (userIdFromUrl) {
      setUserId(userIdFromUrl);
      userIdRef.current = userIdFromUrl;
      localStorage.setItem('userId', userIdFromUrl);
      console.log('User ID imported from QR code URL:', userIdFromUrl);
    }
    
    // If not in URL, try to get from localStorage
    // Token is now managed via sessions, but we can still get it from URL for QR code scans
    if (!companyIdFromUrl || !userIdFromUrl) {
      const storedCompanyId = localStorage.getItem('companyId');
      const storedUserId = localStorage.getItem('userId');
      
      // Use stored values if URL doesn't have them
      if (!companyIdFromUrl && storedCompanyId) {
        setCompanyId(storedCompanyId);
        companyIdRef.current = storedCompanyId;
      }
      if (!userIdFromUrl && storedUserId) {
        setUserId(storedUserId);
        userIdRef.current = storedUserId;
      }
      
      // Try to extract from token if still missing
      if (tokenParam && (!companyIdFromUrl || !userIdFromUrl)) {
        try {
          const tokenParts = tokenParam.split('.');
          if (tokenParts.length >= 2) {
            const payload = JSON.parse(atob(tokenParts[1]));
            
            // Log the entire payload for debugging
            console.log('[Mount] Token payload:', payload);
            console.log('[Mount] Available token claims:', Object.keys(payload));
            
            // Try multiple possible claim names for userId
            const extractedUserId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] 
              || payload.sub 
              || payload.userId 
              || payload.UserId
              || payload.id
              || payload.Id
              || payload.nameid
              || payload.unique_name
              || payload.name;
            
            // Try multiple possible claim names for companyId
            const extractedCompanyId = payload.companyId 
              || payload.CompanyId
              || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
              || payload.company_id
              || payload.CompanyId
              || payload.orgid
              || payload.organizationId;
            
            console.log('[Mount] Extracted from token - userId:', extractedUserId, 'companyId:', extractedCompanyId);
            
            if (!userIdFromUrl && !storedUserId && extractedUserId) {
              setUserId(String(extractedUserId));
              userIdRef.current = String(extractedUserId);
              localStorage.setItem('userId', String(extractedUserId));
              console.log('[Mount] User ID extracted from token:', extractedUserId);
            }
            if (!companyIdFromUrl && !storedCompanyId && extractedCompanyId) {
              setCompanyId(String(extractedCompanyId));
              companyIdRef.current = String(extractedCompanyId);
              localStorage.setItem('companyId', String(extractedCompanyId));
              console.log('[Mount] Company ID extracted from token:', extractedCompanyId);
            }
          }
        } catch (e) {
          console.error('[Mount] Could not extract userId/companyId from token:', e);
          console.error('[Mount] Token (first 50 chars):', tokenParam?.substring(0, 50) || 'N/A');
        }
      }
    }
  }, [searchParams]);

  const handleFileChange = async (e, side) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // CRITICAL: Re-sync refs from localStorage right before file handling
    // This ensures we have the values even if component re-rendered
    const storedCompanyId = localStorage.getItem('companyId');
    const storedUserId = localStorage.getItem('userId');
    if (storedCompanyId) {
      companyIdRef.current = storedCompanyId;
      if (!companyId) setCompanyId(storedCompanyId);
    }
    if (storedUserId) {
      userIdRef.current = storedUserId;
      if (!userId) setUserId(storedUserId);
    }
    
    console.log('[FileChange] Preserved values:', {
      companyId: { ref: companyIdRef.current, state: companyId, localStorage: storedCompanyId },
      userId: { ref: userIdRef.current, state: userId, localStorage: storedUserId }
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      toast.error('File size must be less than 10MB');
      return;
    }

    // Create preview directly from File object (in memory)
    const reader = new FileReader();
    reader.onloadend = () => {
      // CRITICAL: Re-sync and restore values after async file read (camera operations might clear storage)
      const checkCompanyId = companyIdRef.current || localStorage.getItem('companyId');
      const checkUserId = userIdRef.current || localStorage.getItem('userId');
      
      // Restore to localStorage if refs have values but storage doesn't
      if (companyIdRef.current && !checkCompanyId) {
        localStorage.setItem('companyId', companyIdRef.current);
        console.log('[FileChange] Restored companyId to localStorage after file read');
      }
      if (userIdRef.current && !checkUserId) {
        localStorage.setItem('userId', userIdRef.current);
        console.log('[FileChange] Restored userId to localStorage after file read');
      }
      
      // Final sync from refs
      if (companyIdRef.current) {
        localStorage.setItem('companyId', companyIdRef.current);
      }
      if (userIdRef.current) {
        localStorage.setItem('userId', userIdRef.current);
      }
      
      console.log('[FileChange] After file read - preserved values:', {
        companyId: { ref: companyIdRef.current, localStorage: localStorage.getItem('companyId') },
        userId: { ref: userIdRef.current, localStorage: localStorage.getItem('userId') }
      });
      
      if (side === 'front') {
        setFrontImage(file);
        setFrontPreview(reader.result);
      } else {
        setBackPreview(reader.result);
      }
      
      // Auto-upload after selecting
      handleUpload(file, side).catch(err => {
        console.error('Error in handleUpload:', err);
      });
      
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (file, side) => {
    // Get customer ID from userId (in this context, userId is the customerId)
    const currentCustomerId = userIdRef.current || userId || localStorage.getItem('userId') || searchParams.get('userId');
    const wizardId = searchParams.get('wizardId') || '';
    
    setUploadingSide(side);
    setUploadProgress(0);
    setError('');

    try {
      let response;
      let imageUrl;
      let fullImageUrl;

      if (!currentCustomerId && wizardId) {
        // For wizard mode (new customer without customerId), upload to temporary wizard storage
        response = await apiService.uploadWizardLicenseImage(
          wizardId,
          side,
          file,
          (progress) => {
            setUploadProgress(progress);
          }
        );

        // Get the image URL from response
        imageUrl = response?.data?.imageUrl || response?.data?.result?.imageUrl;
        
        // Construct full URL if relative path is returned
        // For static files (wizard/customers), use backend origin directly (not through /api proxy)
        fullImageUrl = imageUrl;
        if (imageUrl && !imageUrl.startsWith('http')) {
          // Get backend base URL - static files are served directly, not through /api proxy
          let backendBaseUrl = window.location.origin;
          if (process.env.REACT_APP_API_URL) {
            // Extract backend origin from REACT_APP_API_URL (e.g., "https://backend.com/api" -> "https://backend.com")
            const apiUrl = process.env.REACT_APP_API_URL;
            try {
              const urlObj = new URL(apiUrl);
              backendBaseUrl = `${urlObj.protocol}//${urlObj.host}`;
            } catch (e) {
              // If REACT_APP_API_URL is relative (e.g., "/api"), use current origin
              backendBaseUrl = window.location.origin;
            }
          }
          fullImageUrl = `${backendBaseUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
        }

        // Store uploaded image URL
        if (side === 'front') {
          setUploadedFrontUrl(fullImageUrl);
        } else {
          setUploadedBackUrl(fullImageUrl);
        }

        // Trigger refresh event for booking page
        try {
          // Use BroadcastChannel for cross-tab communication
          const channel = new BroadcastChannel('license_images_channel');
          channel.postMessage({ type: 'wizardImageUploaded', side, wizardId });
          channel.close();
          
          // Also set a flag in localStorage for immediate detection
          localStorage.setItem('licenseImagesUploaded', JSON.stringify({
            side,
            wizardId,
            imageUrl: fullImageUrl,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.log('BroadcastChannel not available:', e);
        }

        toast.success(
          side === 'front'
            ? 'Front photo saved! Now take a photo of the back side.'
            : 'Back photo saved! You can now return to the wizard.'
        );
      } else if (currentCustomerId) {
        // Customer ID exists, upload directly to server
        response = await apiService.uploadCustomerLicenseImage(
          currentCustomerId,
          side,
          file,
          (progress) => {
            setUploadProgress(progress);
          }
        );

        // Get the image URL from response
        imageUrl = response?.data?.imageUrl || response?.data?.result?.imageUrl;
        
        // Construct full URL if relative path is returned
        fullImageUrl = imageUrl;
        if (imageUrl && !imageUrl.startsWith('http')) {
          const apiBaseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || window.location.origin;
          fullImageUrl = `${apiBaseUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
        }

        // Store uploaded image URL
        if (side === 'front') {
          setUploadedFrontUrl(fullImageUrl);
        } else {
          setUploadedBackUrl(fullImageUrl);
        }

        // Trigger refresh event for parent window (booking page) if in iframe or same origin
        try {
          // Use BroadcastChannel for cross-tab communication
          const channel = new BroadcastChannel('license-upload');
          channel.postMessage({ type: 'imageUploaded', side, customerId: currentCustomerId });
          channel.close();
          
          // Also set a flag in localStorage for immediate detection
          localStorage.setItem('licenseImageUploaded', JSON.stringify({
            side,
            customerId: currentCustomerId,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.log('BroadcastChannel not available:', e);
        }

        toast.success(
          side === 'front'
            ? 'Front photo saved!'
            : 'Back photo saved!'
        );
      } else {
        setError('Wizard ID or User ID is required. Please ensure you are logged in or have a valid wizard ID.');
        toast.error('Wizard ID or User ID is required. Please ensure you are logged in or have a valid wizard ID.');
        return;
      }

      // If both images are uploaded, navigate back after a delay
      if (side === 'back' && frontImage) {
        setTimeout(() => {
          const returnTo = searchParams.get('returnTo') || '/';
          navigate(returnTo);
        }, 2000);
      }
    } catch (err) {
      console.error(`Error uploading ${side} image:`, err);
      setError(err.response?.data?.message || 'Failed to upload image. Please try again.');
      toast.error(err.response?.data?.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingSide(null);
      setUploadProgress(0);
    }
  };

  const handleRetake = () => {
    setStatus('ready');
    setImagePreview('');
    setError('');
    setUploadProgress(0);
  };

  const handleStartBlinkIDScan = () => {
    // Redirect to ScanLicense page with ALL parameters preserved
    const returnTo = searchParams.get('returnTo') || window.location.pathname;
    // Token from URL (QR code) takes priority, otherwise check session
    const token = searchParams.get('token') || tokenFromUrl;
    const companyId = searchParams.get('companyId') || localStorage.getItem('companyId');
    const userId = searchParams.get('userId') || localStorage.getItem('userId');
    
    // Build URL with all parameters
    const params = new URLSearchParams();
    params.set('returnTo', returnTo);
    if (token) params.set('token', token);
    if (companyId) params.set('companyId', companyId);
    if (userId) params.set('userId', userId);
    
    // Add cache buster to force reload
    params.set('v', Date.now().toString());
    console.log('[MobileScan] Redirecting to /scan-native (BlinkID video capture) with params:', params.toString());
    navigate(`/scan-native?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 relative">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Driver License Photos
        </h1>

        {/* File inputs for front and back - always in DOM so files remain accessible */}

        {status === 'prompt' && (
          <div className="space-y-6">
            {/* Only show BlinkID scan option if company has key configured */}
            {hasBlinkKey && (
              <div className="bg-blue-900 bg-opacity-50 rounded-lg p-6 text-center">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2">Scan Your Driver License</h2>
                <p className="text-gray-300 mb-6">
                  Use BlinkID to automatically extract information from your driver license.
                </p>
                <button
                  onClick={handleStartBlinkIDScan}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors"
                >
                  Start BlinkID Scan
                </button>
              </div>
            )}
            
            {hasBlinkKey && (
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-3">or</p>
              </div>
            )}
            
            <button
              onClick={() => setStatus('ready')}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg"
            >
              {hasBlinkKey ? 'Upload Photos Instead' : 'Upload Photos'}
            </button>
            
            {error && (
              <div className="bg-red-900 text-red-100 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {status === 'ready' && (
          <div className="space-y-6">
            <p className="text-center text-gray-300 mb-4 text-sm">
              Use your phone to take photos. Scan the QR code below or use the button to upload from your computer.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Front Image Placeholder */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Driver License Front *
                </label>
                {frontPreview ? (
                  <div className="relative">
                    <img
                      src={frontPreview}
                      alt="Driver license front"
                      className="w-full h-48 object-cover rounded-lg border border-gray-600"
                    />
                    {uploadingSide === 'front' && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                        <div className="text-center text-white">
                          <div className="animate-spin h-6 w-6 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                          <p className="text-xs">{uploadProgress}%</p>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setFrontImage(null);
                        setFrontPreview(null);
                        if (frontInputRef.current) {
                          frontInputRef.current.value = '';
                        }
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="block w-full h-48 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 flex items-center justify-center bg-gray-800">
                    <input
                      ref={frontInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileChange(e, 'front')}
                      className="hidden"
                    />
                    <div className="text-center">
                      <CreditCard className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <span className="text-xs text-gray-400">Choose File</span>
                    </div>
                  </label>
                )}
              </div>

              {/* Back Image Placeholder */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Driver License Back *
                </label>
                {backPreview ? (
                  <div className="relative">
                    <img
                      src={backPreview}
                      alt="Driver license back"
                      className="w-full h-48 object-cover rounded-lg border border-gray-600"
                    />
                    {uploadingSide === 'back' && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                        <div className="text-center text-white">
                          <div className="animate-spin h-6 w-6 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                          <p className="text-xs">{uploadProgress}%</p>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setBackPreview(null);
                        if (backInputRef.current) {
                          backInputRef.current.value = '';
                        }
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="block w-full h-48 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 flex items-center justify-center bg-gray-800">
                    <input
                      ref={backInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileChange(e, 'back')}
                      className="hidden"
                    />
                    <div className="text-center">
                      <CreditCard className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <span className="text-xs text-gray-400">Choose File</span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-900 text-red-100 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Display uploaded images */}
            {(uploadedFrontUrl || uploadedBackUrl) && (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-200 text-center">
                  Uploaded Images
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {uploadedFrontUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Front (Uploaded)
                      </label>
                      <div className="relative">
                        <img
                          src={uploadedFrontUrl}
                          alt="Uploaded driver license front"
                          className="w-full h-48 object-cover rounded-lg border-2 border-green-500"
                        />
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                          ✓ Uploaded
                        </div>
                      </div>
                    </div>
                  )}
                  {uploadedBackUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Back (Uploaded)
                      </label>
                      <div className="relative">
                        <img
                          src={uploadedBackUrl}
                          alt="Uploaded driver license back"
                          className="w-full h-48 object-cover rounded-lg border-2 border-green-500"
                        />
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                          ✓ Uploaded
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {frontPreview && backPreview && (
              <div className="text-center">
                <button
                  onClick={() => {
                    const returnTo = searchParams.get('returnTo') || '/';
                    navigate(returnTo);
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}

        {status === 'preview' && (
          <div className="space-y-4">
            {imagePreview && (
              <div className="bg-gray-800 rounded-lg p-4">
                <img
                  src={imagePreview}
                  alt="License preview"
                  className="w-full rounded-lg"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg"
              >
                Retake
              </button>
              <button
                onClick={handleUpload}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
              >
                Upload
              </button>
            </div>
            {error && (
              <div className="bg-red-900 text-red-100 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {status === 'uploading' && (
          <div className="space-y-4 text-center">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="mb-4">
                <div className="w-full bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-300">Uploading... {uploadProgress}%</p>
              </div>
            </div>
            {error && (
              <div className="bg-red-900 text-red-100 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 text-center">
            <div className="bg-green-900 text-green-100 p-6 rounded-lg">
              <p className="text-lg font-bold">✓ {isWizardMode ? 'Photo Saved!' : 'Upload Successful!'}</p>
              <p className="text-sm mt-2">
                {isWizardMode 
                  ? 'Your photo has been saved. You can now take the other side or return to the wizard.'
                  : 'Closing page...'}
              </p>
              {isWizardMode ? (
                <button
                  onClick={() => {
                    const returnTo = searchParams.get('returnTo') || '/';
                    navigate(returnTo);
                  }}
                  className="w-full mt-4 bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg"
                >
                  Return to Wizard
                </button>
              ) : (
                <p className="text-xs mt-2 text-green-200">If the page doesn't close automatically, please close it manually.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileScan;
