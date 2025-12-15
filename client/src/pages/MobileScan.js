/*
 * Mobile-friendly page to upload Driver License image.
 */
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { apiService } from '../services/api';
import { useCompany } from '../context/CompanyContext';

const MobileScan = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { companyConfig } = useCompany();
  const [status, setStatus] = useState('prompt'); // prompt, ready, preview, uploading, success
  const [imagePreview, setImagePreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
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

  const handleFileChange = async (e) => {
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
      
      setImagePreview(reader.result);
      setStatus('preview');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    // Check authentication - token can come from URL (QR code) or session
    // If token is in URL, it will be stored in session by the useEffect above
    // For now, we'll check if we have a token from URL or if user is authenticated via session
    const hasTokenFromUrl = !!tokenFromUrl;
    if (!hasTokenFromUrl) {
      const errorMsg = 'You must be logged in to upload a driver license. Please log in and try again.';
      setError(errorMsg);
      toast.error(errorMsg);
      setStatus('ready');
      return;
    }

    // Read file directly from input (already in browser memory)
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      const errorMsg = 'Please select an image first';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setStatus('uploading');
    setError('');

    try {
      // CRITICAL: Re-sync from localStorage right before upload (defensive programming)
      // This is the last chance to recover the values - ALWAYS update refs from localStorage
      // ALSO: Restore to localStorage if refs have values but storage doesn't (protection)
      let lastChanceCompanyId = localStorage.getItem('companyId');
      let lastChanceUserId = localStorage.getItem('userId');
      
      // If refs have values but localStorage doesn't, restore first
      if (companyIdRef.current && !lastChanceCompanyId) {
        localStorage.setItem('companyId', companyIdRef.current);
        lastChanceCompanyId = companyIdRef.current;
        console.log('[Upload] Restored companyId to localStorage from ref before upload');
      }
      if (userIdRef.current && !lastChanceUserId) {
        localStorage.setItem('userId', userIdRef.current);
        lastChanceUserId = userIdRef.current;
        console.log('[Upload] Restored userId to localStorage from ref before upload');
      }
      
      // Now sync refs from localStorage (in case it was updated elsewhere)
      if (lastChanceCompanyId) {
        const wasDifferent = companyIdRef.current !== lastChanceCompanyId;
        companyIdRef.current = lastChanceCompanyId;
        if (wasDifferent) {
          console.log('[Upload] Synced companyId from localStorage:', lastChanceCompanyId);
        }
      }
      if (lastChanceUserId) {
        const wasDifferent = userIdRef.current !== lastChanceUserId;
        userIdRef.current = lastChanceUserId;
        if (wasDifferent) {
          console.log('[Upload] Synced userId from localStorage:', lastChanceUserId);
        }
      }
      
      // Use refs first (most reliable - won't be stale), then state, then localStorage, then URL
      // This ensures we always have the values even if component re-rendered
      const finalCompanyId = companyIdRef.current || companyId || localStorage.getItem('companyId') || searchParams.get('companyId');
      const finalUserId = userIdRef.current || userId || localStorage.getItem('userId') || searchParams.get('userId');
      
      console.log('[Upload] CompanyId sources:', {
        ref: companyIdRef.current,
        state: companyId,
        localStorage: localStorage.getItem('companyId'),
        url: searchParams.get('companyId'),
        final: finalCompanyId
      });
      console.log('[Upload] UserId sources:', {
        ref: userIdRef.current,
        state: userId,
        localStorage: localStorage.getItem('userId'),
        url: searchParams.get('userId'),
        final: finalUserId
      });
      
      // ALWAYS try to extract from token first (token is source of truth)
      let extractedCompanyId = finalCompanyId;
      let extractedUserId = finalUserId;
      
      const token = tokenFromUrl || searchParams.get('token');
      if (token) {
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length >= 2) {
            const payload = JSON.parse(atob(tokenParts[1]));
            
            // Log the entire payload for debugging
            console.log('[Upload] Token payload:', payload);
            console.log('[Upload] Available token claims:', Object.keys(payload));
            
            // Try multiple possible claim names for userId
            const possibleUserId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] 
              || payload.sub 
              || payload.userId 
              || payload.UserId
              || payload.id
              || payload.Id
              || payload.nameid
              || payload.unique_name
              || payload.name;
            
            // Try multiple possible claim names for companyId
            const possibleCompanyId = payload.companyId 
              || payload.CompanyId
              || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
              || payload.company_id
              || payload.CompanyId
              || payload.orgid
              || payload.organizationId;
            
            console.log('[Upload] Extracted from token - userId:', possibleUserId, 'companyId:', possibleCompanyId);
            
            // Use token values if we found them (token is source of truth)
            if (possibleUserId) {
              extractedUserId = possibleUserId;
              // Always update state, refs, and localStorage with token values
              setUserId(String(possibleUserId));
              userIdRef.current = String(possibleUserId);
              localStorage.setItem('userId', String(possibleUserId));
              console.log('[Upload] Using userId from token:', possibleUserId);
            }
            
            if (possibleCompanyId) {
              extractedCompanyId = possibleCompanyId;
              // Always update state, refs, and localStorage with token values
              setCompanyId(String(possibleCompanyId));
              companyIdRef.current = String(possibleCompanyId);
              localStorage.setItem('companyId', String(possibleCompanyId));
              console.log('[Upload] Using companyId from token:', possibleCompanyId);
            }
          }
        } catch (e) {
          console.error('[Upload] Could not extract userId/companyId from token:', e);
          if (token) {
            console.error('[Upload] Token (first 50 chars):', token.substring(0, 50));
          }
        }
      } else {
        console.warn('[Upload] No token available for extraction');
      }
      
      if (!extractedCompanyId || !extractedUserId) {
        setError('Company ID and User ID are required. Please ensure you are logged in with a valid account.');
        toast.error('Company ID and User ID are required');
        setStatus('ready');
        return;
      }
      
      console.log('Uploading with companyId:', extractedCompanyId, 'userId:', extractedUserId);
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      // Send file directly from memory (File object)
      try {
        const response = await apiService.uploadDriverLicense(file, extractedCompanyId, extractedUserId, (progress) => {
          setUploadProgress(progress);
        });
        
        console.log('Upload response:', response);
        console.log('Upload successful!', response.data);
        
        setStatus('success');
      } catch (uploadError) {
        console.error('Upload error details:', uploadError);
        console.error('Upload error response:', uploadError.response?.data);
        throw uploadError; // Re-throw to be caught by outer catch block
      }
      
      // Try to close the window/page after a short delay
      setTimeout(() => {
        // First, try to close the window directly (some mobile browsers allow this)
        try {
          window.close();
        } catch (e) {
          console.log('Could not close window:', e);
        }
        
        // If window.close() didn't work, try navigating back
        // Check if we can go back
        if (window.history.length > 1) {
          try {
            navigate(-1);
          } catch (e) {
            console.log('Could not navigate back:', e);
          }
        }
        
        // If neither worked, the user will see the success message with instructions
      }, 1500);
    } catch (err) {
      console.error('Upload error:', err);
      
      // Extract detailed error information
      let errorMessage = 'Failed to upload driver license';
      let errorDetails = '';
      
      if (err.response) {
        // Server responded with error
        const status = err.response.status;
        const data = err.response.data;
        
        errorMessage = data?.message || data?.error || `Server error (${status})`;
        
        // Add status code details
        if (status === 400) {
          errorDetails = 'Bad request - Please check your file and try again';
        } else if (status === 401) {
          const hasAuthHeader = data?.hasAuthHeader;
          errorDetails = hasAuthHeader 
            ? 'Your session has expired. Please log in again.'
            : 'You are not logged in. Please log in and try again.';
        } else if (status === 403) {
          errorDetails = 'Forbidden - You do not have permission to upload';
        } else if (status === 413) {
          errorDetails = 'File too large - Maximum size is 10MB';
        } else if (status === 500) {
          errorDetails = 'Server error - Please try again later';
        } else {
          errorDetails = `HTTP ${status}: ${data?.message || 'Unknown error'}`;
        }
        
        // Include additional error details if available
        if (data?.reason) {
          errorDetails += ` (Reason: ${data.reason})`;
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'Network error - Unable to connect to server';
        errorDetails = 'Please check your internet connection and try again';
      } else {
        // Error setting up the request
        errorMessage = err.message || 'Failed to upload driver license';
        errorDetails = 'Please check the file and try again';
      }
      
      const fullError = errorDetails ? `${errorMessage}. ${errorDetails}` : errorMessage;
      setError(fullError);
      toast.error(errorMessage);
      setStatus('preview');
    }
  };

  const handleRetake = () => {
    setStatus('ready');
    setImagePreview('');
    setError('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          {isWizardMode ? 'Take Driver License Photo' : 'Driver License Scan'}
        </h1>

        {/* File input - always in DOM so file remains accessible */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

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
              {hasBlinkKey ? 'Upload Photo Instead' : 'Upload Photo'}
            </button>
            
            {error && (
              <div className="bg-red-900 text-red-100 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {status === 'ready' && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-300 mb-6">
                {isWizardMode 
                  ? 'Take a clear photo of your driver license. You\'ll need to take photos of both the front and back sides.'
                  : 'Click the button below to open your camera and take a photo of your driver license.'}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg"
              >
                Open Camera
              </button>
              {isWizardMode && (
                <button
                  onClick={() => {
                    const returnTo = searchParams.get('returnTo') || '/';
                    navigate(returnTo);
                  }}
                  className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg"
                >
                  Close
                </button>
              )}
            </div>
            {error && (
              <div className="bg-red-900 text-red-100 p-3 rounded-lg text-sm">
                {error}
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
