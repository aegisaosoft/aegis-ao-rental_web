/*
 *
 * Copyright (c) 2025 Alexander Orlov.
 * 34 Middletown Ave Atlantic Highlands NJ 07716
 *
 * THIS SOFTWARE IS THE CONFIDENTIAL AND PROPRIETARY INFORMATION OF
 * Alexander Orlov. ("CONFIDENTIAL INFORMATION"). YOU SHALL NOT DISCLOSE
 * SUCH CONFIDENTIAL INFORMATION AND SHALL USE IT ONLY IN ACCORDANCE
 * WITH THE TERMS OF THE LICENSE AGREEMENT YOU ENTERED INTO WITH
 * Alexander Orlov.
 *
 * Author: Alexander Orlov Aegis AO Soft
 *
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { toast } from 'react-toastify';
import { Car, ArrowLeft, CreditCard, X, Calendar, Eye } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';
import { createBlinkId } from '@microblink/blinkid';

const BookPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Get filters from URL
  const { companyConfig } = useCompany();
  const categoryId = searchParams.get('category');
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  // Priority: domain context only (no fallback)
  const companyId = companyConfig?.id || null;

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedServices, setSelectedServices] = useState([]); // Track selected services
  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [qrBase, setQrBase] = useState(() => (process.env.REACT_APP_PUBLIC_BASE_URL || localStorage.getItem('qrPublicBaseUrl') || window.location.origin));
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isViewingLicense, setIsViewingLicense] = useState(false); // Track if viewing vs editing
  const [licenseImageUrl, setLicenseImageUrl] = useState(null);
  const fetchLicenseImageRef = React.useRef(null); // Ref to store fetch function
  const lastParsedImageUrlRef = React.useRef(null); // Track last parsed image URL to prevent loops
  const isParsingRef = React.useRef(false); // Track if parsing is in progress

  // Auto-detect LAN base from server when running on localhost and no custom base set
  React.useEffect(() => {
    const current = process.env.REACT_APP_PUBLIC_BASE_URL || localStorage.getItem('qrPublicBaseUrl');
    if (current) return;
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      (async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout
          const r = await fetch(`/api/lan-ip?port=${encodeURIComponent(window.location.port || '3000')}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          const j = await r.json();
          if (j?.base) {
            setQrBase(j.base);
            localStorage.setItem('qrPublicBaseUrl', j.base);
          }
        } catch (e) {
          // Silently fail if LAN IP detection is not available
        }
      })();
    }
  }, []);
  const [modelImageSrc, setModelImageSrc] = useState('/economy.jpg');
  const [formData, setFormData] = useState({
    pickupDate: '',
    returnDate: '',
    pickupLocation: '',
    returnLocation: '',
    additionalNotes: ''
  });

  // Driver License form data
  const [licenseData, setLicenseData] = useState({
    licenseNumber: '',
    stateIssued: '',
    countryIssued: 'US',
    sex: '',
    height: '',
    eyeColor: '',
    middleName: '',
    issueDate: '',
    expirationDate: '',
    licenseAddress: '',
    licenseCity: '',
    licenseState: '',
    licensePostalCode: '',
    licenseCountry: 'US',
    restrictionCode: '',
    endorsements: ''
  });

  // Load license data from localStorage
  const loadScannedLicense = React.useCallback(() => {
    try {
      const raw = localStorage.getItem('scannedLicense');
      if (raw) {
        const d = JSON.parse(raw);
        setLicenseData(prev => ({
          ...prev,
          licenseNumber: d.licenseNumber || prev.licenseNumber || '',
          stateIssued: (d.issuingState || d.state || prev.stateIssued || '').toString().slice(0, 2).toUpperCase(),
          countryIssued: (d.issuingCountry || prev.countryIssued || 'US').toString().slice(0, 2).toUpperCase(),
          sex: (d.sex || prev.sex || '').toString().slice(0, 1).toUpperCase(),
          height: d.height || prev.height || '',
          eyeColor: d.eyeColor || prev.eyeColor || '',
          middleName: d.middleName || prev.middleName || '',
          issueDate: d.issueDate || prev.issueDate || '',
          expirationDate: d.expirationDate || prev.expirationDate || '',
          licenseAddress: d.address || prev.licenseAddress || '',
          licenseCity: d.city || prev.licenseCity || '',
          licenseState: d.state || prev.licenseState || '',
          licensePostalCode: d.postalCode || prev.licensePostalCode || '',
          licenseCountry: d.country || prev.licenseCountry || '',
        }));
        localStorage.removeItem('scannedLicense');
        toast.success('License data imported from scan');
        return true;
      }
    } catch (err) {
      console.error('Error loading scanned license:', err);
    }
    return false;
  }, []);

  // Prefill from localStorage if mobile scan placed data (on mount)
  React.useEffect(() => {
    loadScannedLicense();
  }, [loadScannedLicense]);

  // Fetch driver license image when authenticated - with smart polling to detect new uploads
  React.useEffect(() => {
    if (!isAuthenticated) {
        setLicenseImageUrl(null);
        return;
      }

    let consecutive404s = 0;
    const maxConsecutive404s = 3; // After 3 consecutive 404s, slow down polling
    let pollInterval = null;
    let pollDelay = 3000; // Start with 3 seconds

          const fetchLicenseImage = async () => {
        try {
          // Fetch directly with cache-busting parameter to ensure we always get the latest image
          const token = localStorage.getItem('token');
          if (!token) return; // Skip if no token
          
          // Get companyId and userId from token (primary source)
          let currentCompanyId = null;
          let currentUserId = null;
          
          // Parse token to extract IDs (primary source)
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length >= 2) {
              const payload = JSON.parse(atob(tokenParts[1]));
              
              // Extract customerId from token - prioritize nameid and customer_id (most common in JWT tokens)
              currentUserId = payload.nameid
                || payload.customer_id
                || payload.customerId
                || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
                || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier']
                || payload['http://schemas.microsoft.com/identity/claims/nameidentifier']
                || payload.nameidentifier
                || payload.NameIdentifier
                || payload.sub
                || payload.userId
                || payload.UserId
                || payload.id
                || payload.Id
                || payload.unique_name
                || payload.name;
              
              // Extract companyId from token - check all possible variations
              currentCompanyId = payload.company_id
                || payload.companyId
                || payload.CompanyId
                || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
                || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/name']
                || payload.orgid
                || payload.organizationId;
            }
          } catch (tokenError) {
            console.error('[License] Error parsing token:', tokenError);
          }
          
          // Fallback to user object or config if token doesn't have the IDs
          if (!currentUserId) {
            currentUserId = user?.customerId || user?.id || user?.userId || user?.Id || user?.UserId || user?.sub || user?.nameidentifier;
          }
          if (!currentCompanyId) {
            currentCompanyId = companyConfig?.id || companyId;
          }
          
          // Only warn if BOTH are still missing AFTER fallback
          if (!currentCompanyId || !currentUserId) {
            console.warn('[License] ⚠️ Missing IDs after all attempts. Token had userId:', !!currentUserId, 'companyId:', !!currentCompanyId);
            // Only log token payload if we're still missing IDs after fallback
            try {
              const token = localStorage.getItem('token');
              if (token) {
                const tokenParts = token.split('.');
                if (tokenParts.length >= 2) {
                  const payload = JSON.parse(atob(tokenParts[1]));
                  console.warn('[License] Token payload keys:', Object.keys(payload));
                }
              }
            } catch (e) {
              // Ignore token parsing errors here
            }
            // Missing required parameters, skip this fetch
            console.log('[License] Missing companyId or userId, skipping fetch');
            console.log('[License] companyId:', currentCompanyId, 'userId:', currentUserId);
            console.log('[License] user object:', user);
            return;
          }
          
          console.log('[License] Fetching license image for companyId:', currentCompanyId, 'userId:', currentUserId);
          
          // Try different file extensions - start with .jpg as it's most common
          const extensions = ['.jpg', '.png', '.jpeg'];
          let imageUrl = null;
          let testImage = new Image();
          let extensionIndex = 0;
          
          const tryNextExtension = () => {
            if (extensionIndex < extensions.length) {
              const ext = extensions[extensionIndex];
              imageUrl = `/licenses/${currentCompanyId}/${currentUserId}/driverlicense${ext}?t=${Date.now()}`;
              console.log('[License] Trying image URL with extension:', imageUrl);
              
              testImage = new Image();
              testImage.onload = () => {
                console.log('[License] Image verified and loaded successfully from:', imageUrl);
        setLicenseImageUrl(imageUrl);
                // Success - reset counter and restore normal polling
                if (consecutive404s > 0) {
                  consecutive404s = 0;
                  if (pollDelay > 3000) {
                    pollDelay = 3000;
                    clearInterval(pollInterval);
                    pollInterval = setInterval(fetchLicenseImage, pollDelay);
                  }
                }
              };
              testImage.onerror = () => {
                console.log('[License] Image failed to load from:', imageUrl);
                extensionIndex++;
                if (extensionIndex < extensions.length) {
                  // Try next extension
                  tryNextExtension();
                } else {
                  // All extensions tried, file doesn't exist
                  console.log('[License] All extensions tried, file does not exist');
                  consecutive404s++;
                  
                  // After multiple 404s, slow down polling to reduce console noise
                  if (consecutive404s >= maxConsecutive404s && pollDelay === 3000) {
                    pollDelay = 10000; // Change to 10 seconds
                    clearInterval(pollInterval);
                    pollInterval = setInterval(fetchLicenseImage, pollDelay);
                  }
                }
              };
              testImage.src = imageUrl;
            }
          };
          
          // Start trying extensions
          tryNextExtension();
      } catch (error) {
        // Network errors - don't log fetch aborts or 404s
        if (error.name !== 'AbortError' && error.response?.status !== 404 && error.status !== 404) {
          console.error('Error fetching driver license image:', error);
        }
      }
    };

          // Store fetch function in ref so it can be called from handleViewLicense
      fetchLicenseImageRef.current = fetchLicenseImage;
      
      // Fetch immediately
    fetchLicenseImage();

      // Start polling - will adjust frequency based on results
      pollInterval = setInterval(fetchLicenseImage, pollDelay);

      // Cleanup: revoke object URL when component unmounts
    return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
        fetchLicenseImageRef.current = null; // Clear ref on cleanup
      setLicenseImageUrl(prevUrl => {
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return null;
      });
    };
    }, [isAuthenticated, companyConfig, companyId, user]);

  // Auto-close QR modal and show license when image is uploaded while QR modal is open
  // Track if an image existed when QR modal was opened
  const hadImageWhenQrOpenedRef = React.useRef(false);
  const prevLicenseImageUrlRef = React.useRef(null);
  
  // Track image state when QR modal opens/closes (only depend on qrOpen)
  React.useEffect(() => {
    if (qrOpen) {
      // Remember if we already had an image when QR opened
      hadImageWhenQrOpenedRef.current = !!licenseImageUrl;
      prevLicenseImageUrlRef.current = licenseImageUrl;
    } else {
      // Reset when QR modal closes
      hadImageWhenQrOpenedRef.current = false;
      prevLicenseImageUrlRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrOpen]); // Only depend on qrOpen, not licenseImageUrl
  
  // Close QR modal when image appears (transitions from null to value) after QR was opened
  React.useEffect(() => {
    // Only trigger if: QR modal is open, we now have an image, and we didn't have one when QR opened
    if (licenseImageUrl && qrOpen && !hadImageWhenQrOpenedRef.current && !prevLicenseImageUrlRef.current) {
      // Image was just uploaded while QR modal is open - close QR and show license modal
      const timer = setTimeout(() => {
        setQrOpen(false);
        setIsLicenseModalOpen(true);
        hadImageWhenQrOpenedRef.current = true; // Mark that we now have an image
        prevLicenseImageUrlRef.current = licenseImageUrl;
      }, 500); // Small delay for smooth transition
      
      return () => clearTimeout(timer);
    }
    
    // Update previous reference for next comparison
    prevLicenseImageUrlRef.current = licenseImageUrl;
  }, [licenseImageUrl, qrOpen]);

  // Listen for storage events (when license is scanned on phone in another tab/window)
  React.useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'scannedLicense' && e.newValue) {
        // License was scanned on another device/tab
        loadScannedLicense();
      }
    };

    // Listen for storage events (works across tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    // Also poll periodically as fallback (storage event doesn't work in same tab)
    const pollInterval = setInterval(() => {
      const hasLicense = localStorage.getItem('scannedLicense');
      if (hasLicense) {
        loadScannedLicense();
      }
    }, 2000); // Check every 2 seconds

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [loadScannedLicense]);

  // Pre-check model image to avoid console errors; use default if missing
  React.useEffect(() => {
    const abort = new AbortController();
    const makeUpper = (make || '').toUpperCase();
    const modelUpper = (model || '').toUpperCase().replace(/\s+/g, '_');
    // Use /models/ path - served statically by Express in both dev and production
    const url = `/models/${makeUpper}_${modelUpper}.png`;
    if (!makeUpper || !modelUpper) {
      setModelImageSrc('/economy.jpg');
      return () => abort.abort();
    }
    (async () => {
      try {
        const res = await fetch(url, { method: 'HEAD', signal: abort.signal });
        setModelImageSrc(res.ok ? url : '/economy.jpg');
      } catch {
        setModelImageSrc('/economy.jpg');
      }
    })();
    return () => abort.abort();
  }, [make, model]);

  // Fetch existing license if customer is logged in
  const { data: customerLicense } = useQuery(
    ['customerLicense', user?.id],
    async () => {
      if (!user?.id) return null;
      try {
        const response = await apiService.getCustomerLicense(user.id);
        const data = response?.data || response || null;
        return data;
      } catch (error) {
        // If license not found, that's okay - user can create one
        if (error.response?.status === 404) {
          return null;
        }
        console.error('Error fetching customer license:', error);
        return null;
      }
    },
    {
      enabled: !!user?.id && isAuthenticated,
      retry: false,
      onSuccess: (data) => {
        if (data) {
          setLicenseData({
            licenseNumber: data.licenseNumber || '',
            stateIssued: data.stateIssued || '',
            countryIssued: data.countryIssued || 'US',
            sex: data.sex || '',
            height: data.height || '',
            eyeColor: data.eyeColor || '',
            middleName: data.middleName || '',
            issueDate: data.issueDate ? new Date(data.issueDate).toISOString().split('T')[0] : '',
            expirationDate: data.expirationDate ? new Date(data.expirationDate).toISOString().split('T')[0] : '',
            licenseAddress: data.licenseAddress || '',
            licenseCity: data.licenseCity || '',
            licenseState: data.licenseState || '',
            licensePostalCode: data.licensePostalCode || '',
            licenseCountry: data.licenseCountry || 'US',
            restrictionCode: data.restrictionCode || '',
            endorsements: data.endorsements || ''
          });
        }
      }
    }
  );

  // Save license mutation
  const saveLicenseMutation = useMutation(
    async (licenseData) => {
      const customerId = user?.id || user?.customer_id || user?.customerId;
      if (!customerId) throw new Error('Customer ID not found');
      
      return apiService.upsertCustomerLicense(customerId, licenseData);
    },
    {
      onSuccess: () => {
        toast.success(t('bookPage.licenseSaved'));
        queryClient.invalidateQueries(['customerLicense', user?.id]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || error.message || t('bookPage.licenseSaveFailed'));
        console.error('Error saving license:', error);
      }
    }
  );

  // Fetch company additional services
  const { data: companyServicesResponse } = useQuery(
    ['companyServices', companyId],
    () => apiService.getCompanyServices(companyId, { isActive: true }),
    {
      enabled: !!companyId,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );
  
  const companyServicesData = companyServicesResponse?.data || companyServicesResponse;
  const additionalOptions = useMemo(() => {
    return Array.isArray(companyServicesData) ? companyServicesData : [];
  }, [companyServicesData]);

  // Fetch model data to get daily rate
  const { data: modelsResponse } = useQuery(
    ['models', { make, model }],
    () => apiService.getModels({ make, modelName: model }),
    {
      enabled: !!(make && model),
      retry: 1,
      refetchOnWindowFocus: false
    }
  );
  
  const modelsData = modelsResponse?.data || modelsResponse;
  const modelData = Array.isArray(modelsData) ? modelsData[0] : null;
  const modelDailyRate = modelData?.dailyRate || modelData?.daily_rate || modelData?.DailyRate || 0;
  // Explicitly use Description field (not CategoryName)
  const modelDescription = modelData?.description || modelData?.Description || '';
  
  // Auto-select mandatory services when services load
  React.useEffect(() => {
    if (additionalOptions.length > 0 && selectedServices.length === 0) {
      const mandatoryServices = additionalOptions
        .filter(service => service.serviceIsMandatory || service.ServiceIsMandatory)
        .map(service => ({
          id: service.additionalServiceId || service.AdditionalServiceId,
          service: service,
          quantity: 1
        }));
      
      if (mandatoryServices.length > 0) {
        setSelectedServices(mandatoryServices);
      }
    }
  }, [additionalOptions, selectedServices.length]);

  // Fetch available vehicles matching the model filters
  const { data: vehiclesResponse } = useQuery(
    ['vehicles', { categoryId, make, model, companyId, status: 'Available' }],
    () => apiService.getVehicles({
      categoryId,
      make,
      model,
      companyId,
      status: 'Available',
      pageSize: 50
    }),
    {
      enabled: !!(make && model),
      retry: 1
    }
  );

  // Ensure vehicles is always an array
  const vehiclesData = vehiclesResponse?.data || vehiclesResponse;
  const vehicles = Array.isArray(vehiclesData?.items) 
    ? vehiclesData.items 
    : Array.isArray(vehiclesData) 
      ? vehiclesData 
      : Array.isArray(vehiclesResponse)
        ? vehiclesResponse
        : [];
  
  const selectedVehicle = Array.isArray(vehicles) ? vehicles.find(v => 
    (v.vehicle_id || v.vehicleId || v.id) === selectedVehicleId
  ) : null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLicenseChange = (e) => {
    setLicenseData({
      ...licenseData,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveLicense = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error(t('bookPage.loginToSaveLicense') || 'Please login to save license');
      navigate('/login', { state: { returnTo: `/book?${searchParams.toString()}` } });
      return;
    }

    // Validate required fields
    if (!licenseData.licenseNumber || !licenseData.stateIssued || !licenseData.expirationDate) {
      toast.error(t('bookPage.fillRequiredLicenseFields'));
      return;
    }

    saveLicenseMutation.mutate(licenseData, {
      onSuccess: () => {
        setIsLicenseModalOpen(false);
      }
    });
  };

  // Parse license image with BlinkID - works with any image URL (client-side parsing)
  // Helper function to format dates from BlinkID result
  const formatBlinkIDDate = (dateObj) => {
    if (!dateObj) return null;
    
    // Handle different date formats from BlinkID
    if (typeof dateObj === 'string') {
      return dateObj;
    }
    
    if (dateObj.year && dateObj.month && dateObj.day) {
      const year = dateObj.year;
      const month = String(dateObj.month).padStart(2, '0');
      const day = String(dateObj.day).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return null;
  };

  const parseLicenseImageWithBlinkID = async (imageUrl) => {
    // Prevent duplicate parsing
    if (isParsingRef.current) {
      console.log('[BlinkID] Already parsing, skipping duplicate request');
      return;
    }

    if (!imageUrl) {
      console.warn('[BlinkID] No image URL provided');
      return;
    }

    try {
      isParsingRef.current = true;
      console.log('[BlinkID] Starting to parse license image from:', imageUrl);

      const licenseKey = process.env.REACT_APP_BLINKID_LICENSE_KEY || '';

      if (!licenseKey) {
        console.warn('[BlinkID] License key not found, falling back to server endpoint');
        toast.warning('BlinkID license key not configured. Using server endpoint.');

        // Fallback to server endpoint if no license key
        const fullUrl = imageUrl.startsWith('http') ? imageUrl : window.location.origin + imageUrl;
        const response = await fetch(fullUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch license image: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        const formData = new FormData();
        formData.append('file', blob, 'driverlicense.jpg');

        const parseResponse = await fetch('/api/license/validate', {
          method: 'POST',
          body: formData
        });

        if (!parseResponse.ok) {
          if (parseResponse.status === 501) {
            const errorResult = await parseResponse.json();
            console.warn('[BlinkID] OCR not implemented on server:', errorResult);
            toast.warning('License OCR is not yet implemented. Please enter license information manually.');
            return;
          }
          throw new Error(`Parsing failed: ${parseResponse.statusText}`);
        }

        const serverResult = await parseResponse.json();
        console.log('[BlinkID] Server parsed data:', serverResult);

        if (serverResult.isValid && serverResult.data) {
          const parsedData = serverResult.data;
          const updatedLicenseData = {
            ...licenseData,
            ...(parsedData.licenseNumber && { licenseNumber: parsedData.licenseNumber }),
            ...(parsedData.issuingState && { stateIssued: parsedData.issuingState }),
            ...(parsedData.stateIssued && { stateIssued: parsedData.stateIssued }),
            ...(parsedData.issuingCountry && { countryIssued: parsedData.issuingCountry }),
            ...(parsedData.expirationDate && { expirationDate: parsedData.expirationDate }),
            ...(parsedData.address && { licenseAddress: parsedData.address }),
            ...(parsedData.city && { licenseCity: parsedData.city }),
            ...(parsedData.state && { licenseState: parsedData.state }),
            ...(parsedData.postalCode && { licensePostalCode: parsedData.postalCode })
          };
          setLicenseData(updatedLicenseData);
          setIsViewingLicense(false);
          toast.success('License information extracted from server');
        }
        return;
      }

      // Client-side BlinkID SDK parsing when license key is available
      console.log('[BlinkID] License key found, attempting client-side parsing using npm package');

      try {
        // Fetch the image
        const fullUrl = imageUrl.startsWith('http') ? imageUrl : window.location.origin + imageUrl;
        console.log('[BlinkID] Fetching image from:', fullUrl);
        const response = await fetch(fullUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch license image: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();

        // Convert blob to base64 for BlinkID
        const base64Image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        console.log('[BlinkID] Initializing BlinkID SDK with license key...');

        // Create BlinkID instance using the npm package
        // Use CDN for all BlinkID resources to avoid server routing issues
        const blinkid = await createBlinkId({
          licenseKey: licenseKey,
          // Use CDN for all BlinkID resources to avoid server routing issues
          engineLocation: 'https://unpkg.com/@microblink/blinkid-in-browser@6.11.0/resources',
          workerLocation: 'https://unpkg.com/@microblink/blinkid-in-browser@6.11.0/resources/BlinkIDWasmSDK.worker.min.js'
        });

        console.log('[BlinkID] SDK initialized successfully');

        // Process the image with BlinkID
        console.log('[BlinkID] Processing image with BlinkID...');
        const result = await blinkid.recognize(base64Image);

        console.log('[BlinkID] Recognition result:', result);

        if (!result || !result.result) {
          throw new Error('No recognition results');
        }

        const recognitionData = result.result;

        // Extract data from result
        const parsedData = {
          licenseNumber: recognitionData.documentNumber || recognitionData.number || recognitionData.licenseNumber,
          firstName: recognitionData.firstName || recognitionData.firstname,
          lastName: recognitionData.lastName || recognitionData.lastname,
          issuingState: recognitionData.jurisdiction || recognitionData.state || recognitionData.issuingState,
          issuingCountry: recognitionData.country || recognitionData.issuingCountry || 'US',
          expirationDate: recognitionData.dateOfExpiry ? formatBlinkIDDate(recognitionData.dateOfExpiry) : null,
          issueDate: recognitionData.dateOfIssue ? formatBlinkIDDate(recognitionData.dateOfIssue) : null,
          address: recognitionData.address?.street || recognitionData.address?.address || recognitionData.addressLine1,
          city: recognitionData.address?.city || recognitionData.city,
          state: recognitionData.address?.state || recognitionData.state || recognitionData.addressState,
          postalCode: recognitionData.address?.postalCode || recognitionData.postalCode || recognitionData.zip,
          country: recognitionData.address?.country || recognitionData.country || 'US',
          sex: recognitionData.sex || recognitionData.gender,
          height: recognitionData.height,
          eyeColor: recognitionData.eyeColor,
          dateOfBirth: recognitionData.dateOfBirth ? formatBlinkIDDate(recognitionData.dateOfBirth) : null
        };

        console.log('[BlinkID] Extracted data:', parsedData);

        // Update license data
        const updatedLicenseData = {
          ...licenseData,
          ...(parsedData.licenseNumber && { licenseNumber: parsedData.licenseNumber }),
          ...(parsedData.issuingState && { stateIssued: parsedData.issuingState }),
          ...(parsedData.issuingCountry && { countryIssued: parsedData.issuingCountry }),
          ...(parsedData.expirationDate && { expirationDate: parsedData.expirationDate }),
          ...(parsedData.issueDate && { issueDate: parsedData.issueDate }),
          ...(parsedData.address && { licenseAddress: parsedData.address }),
          ...(parsedData.city && { licenseCity: parsedData.city }),
          ...(parsedData.state && { licenseState: parsedData.state }),
          ...(parsedData.postalCode && { licensePostalCode: parsedData.postalCode }),
          ...(parsedData.sex && { sex: parsedData.sex }),
          ...(parsedData.height && { height: parsedData.height }),
          ...(parsedData.eyeColor && { eyeColor: parsedData.eyeColor }),
          ...(parsedData.dateOfBirth && { dateOfBirth: parsedData.dateOfBirth })
        };

        setLicenseData(updatedLicenseData);
        setIsViewingLicense(false);
        setIsLicenseModalOpen(true);

        const fullName = parsedData.firstName && parsedData.lastName 
          ? `${parsedData.firstName} ${parsedData.lastName}`
          : 'License information';
        toast.success(`License information extracted successfully! ${fullName}`);

      } catch (clientError) {
        console.error('[BlinkID] Client-side parsing failed:', clientError);
        console.error('[BlinkID] Error type:', clientError.name);
        console.error('[BlinkID] Error message:', clientError.message);

        toast.error('BlinkID client-side parsing failed. Please enter license information manually.');
      }

    } catch (error) {
      console.error('[BlinkID] Error parsing license image:', error);
      toast.error('Failed to parse license image: ' + error.message);
    } finally {
      isParsingRef.current = false;
    }
  };

  // View license: open license modal to show uploaded DL image
  const handleViewLicense = async () => {
    console.log('handleViewLicense called');
    if (!isAuthenticated) {
      toast.error(t('bookPage.pleaseLoginToViewLicense') || 'Please login to view license');
      navigate('/login', { state: { returnTo: `/book?${searchParams.toString()}` } });
      return;
    }
    
    // Get token and parse it for IDs - token is primary source
    const token = localStorage.getItem('token');
    let currentCompanyId = null;
    let currentUserId = null;
    
    // Parse token to extract IDs (primary source)
    if (token) {
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length >= 2) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('[View License] Token payload:', payload);
          console.log('[View License] Token payload keys:', Object.keys(payload));
          
          // Extract customerId from token - prioritize nameid and customer_id (most common in JWT tokens)
          currentUserId = payload.nameid
            || payload.customer_id
            || payload.customerId
            || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
            || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier']
            || payload['http://schemas.microsoft.com/identity/claims/nameidentifier']
            || payload.nameidentifier
            || payload.NameIdentifier
            || payload.sub
            || payload.userId
            || payload.UserId
            || payload.id
            || payload.Id
            || payload.unique_name
            || payload.name;
          
          // Extract companyId from token - check all possible variations
          currentCompanyId = payload.company_id
            || payload.companyId
            || payload.CompanyId
            || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
            || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/name']
            || payload.orgid
            || payload.organizationId;
          
          console.log('[View License] Extracted from token - userId:', currentUserId, 'companyId:', currentCompanyId);
        }
      } catch (error) {
        console.error('[View License] Error parsing token:', error);
      }
    }
    
    // Fallback to user object or config if token doesn't have the IDs
    if (!currentUserId) {
      currentUserId = user?.customerId || user?.id || user?.userId || user?.Id || user?.UserId || user?.sub || user?.nameidentifier;
    }
    if (!currentCompanyId) {
      currentCompanyId = companyConfig?.id || companyId;
    }
    
    // Only warn if BOTH are still missing AFTER fallback
    if (!currentCompanyId || !currentUserId) {
      console.warn('[View License] ⚠️ Missing IDs after all attempts. Token had userId:', !!currentUserId, 'companyId:', !!currentCompanyId);
      // Only log token payload if we're still missing IDs after fallback
      if (token) {
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length >= 2) {
            const payload = JSON.parse(atob(tokenParts[1]));
            console.warn('[View License] Token payload keys:', Object.keys(payload));
          }
        } catch (e) {
          // Ignore token parsing errors here
        }
      }
    }
    
    console.log('[View License] Final companyId:', currentCompanyId, 'userId (customerId):', currentUserId);
    console.log('[View License] user object:', user);
    console.log('[View License] companyConfig:', companyConfig);
    
    if (!currentCompanyId) {
      console.error('[View License] ❌ Missing companyId!');
      toast.error('Company ID not found. Please refresh the page.');
      return;
    }
    
    if (!currentUserId) {
      console.error('[View License] ❌ Missing userId (customerId)!');
      console.error('[View License] Available user properties:', user ? Object.keys(user) : 'user is null/undefined');
      toast.error('User ID (customer ID) not found. Please log in again.');
      return;
    }
    
    // Don't set URL here - let fetchLicenseImage try all extensions (.jpg, .jpeg, .png)
    // It will automatically try each extension and set the correct one
    
    console.log('Fetching license image, fetchLicenseImageRef.current:', fetchLicenseImageRef.current);
    // Trigger immediate fetch of license image
    if (fetchLicenseImageRef.current) {
      fetchLicenseImageRef.current();
    } else {
      console.warn('fetchLicenseImageRef.current is null!');
    }
    
    // Open the license modal in view mode to view the uploaded driver license image
    console.log('Opening license modal in view mode');
    setIsViewingLicense(true);
    setIsLicenseModalOpen(true);
    
    // Parse the existing image if available (wait a bit for image to load)
    setTimeout(() => {
      if (licenseImageUrl) {
        console.log('[View License] Parsing existing license image:', licenseImageUrl);
        parseLicenseImageWithBlinkID(licenseImageUrl);
      }
    }, 500);
  };
  
  // Parse license image when viewing license and image URL becomes available (only once per image)
  React.useEffect(() => {
    if (isViewingLicense && licenseImageUrl && isLicenseModalOpen) {
      // Only parse if this is a new image URL and we're not already parsing
      if (licenseImageUrl !== lastParsedImageUrlRef.current && !isParsingRef.current) {
        console.log('[View License] Image URL available, parsing with BlinkID:', licenseImageUrl);
        lastParsedImageUrlRef.current = licenseImageUrl;
        isParsingRef.current = true;
        parseLicenseImageWithBlinkID(licenseImageUrl).finally(() => {
          isParsingRef.current = false;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isViewingLicense, licenseImageUrl, isLicenseModalOpen]);

  // Create QR for phone scan: show QR code with link to scanning page
  const handleScanOnPhone = () => {
    if (!isAuthenticated) {
      toast.error(t('bookPage.pleaseLoginToScanLicense') || 'Please login to scan license');
      navigate('/login', { state: { returnTo: `/book?${searchParams.toString()}` } });
      return;
    }
    
    // Prefer configured public base URL for LAN/External access; fallback to current origin
    const configuredBase = qrBase || '';
    const origin = configuredBase || window.location.origin;
    const returnTo = window.location.pathname + window.location.search;
    
    // Get auth token from localStorage to pass to phone
    const token = localStorage.getItem('token');
    
      // Log token availability for debugging
      console.log('[QR Code] Generating QR code with token:', token ? 'Present' : 'Missing');
      console.log('[QR Code] User authenticated:', isAuthenticated);
      
      // Get companyId and userId (customerId) for query parameters
      const currentCompanyId = companyConfig?.id || companyId;
      const currentUserId = user?.customerId || user?.id || user?.userId || user?.Id || user?.UserId || user?.sub || user?.nameidentifier;
      
      // Build URL with auth token, companyId, and userId if available
      // ALWAYS include token if it exists (user is already authenticated at this point)
    let url = `${origin.replace(/\/$/, '')}/scan-mobile?returnTo=${encodeURIComponent(returnTo)}`;
      if (token) {
      url += `&token=${encodeURIComponent(token)}`;
        console.log('[QR Code] Token included in QR code URL');
      } else {
        console.warn('[QR Code] WARNING: Token not found in localStorage! QR code will not include authentication.');
        toast.warning('Authentication token not found. Please log in again.');
      }
      if (currentCompanyId) {
        url += `&companyId=${encodeURIComponent(currentCompanyId)}`;
      }
      if (currentUserId) {
        url += `&userId=${encodeURIComponent(currentUserId)}`;
      }
      
      console.log('[QR Code] Generated URL:', url.substring(0, 100) + '...');
    
    // Always show QR code modal (user can scan it with their phone)
    setQrUrl(url);
    setQrOpen(true);
    
    // On mobile devices, also offer direct navigation
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
    if (isMobile) {
      // Still show QR, but also allow direct navigation
      console.log('Mobile device detected - QR code shown, direct navigation available');
    }
  };

  // QR-based phone scan flow removed to satisfy current lint and scope

  const calculateTotal = () => {
    if (!modelDailyRate) return 0;
    
    // If dates are not set, return the daily rate (1 day)
    if (!formData.pickupDate || !formData.returnDate) {
      return modelDailyRate;
    }
    
    const pickup = new Date(formData.pickupDate);
    const returnDate = new Date(formData.returnDate);
    const days = Math.max(1, Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24)));
    
    return days * modelDailyRate;
  };

  // Handle service checkbox toggle
  const handleServiceToggle = (service) => {
    const serviceId = service.additionalServiceId || service.AdditionalServiceId;
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === serviceId);
      if (isSelected) {
        return prev.filter(s => s.id !== serviceId);
      } else {
        return [...prev, {
          id: serviceId,
          service: service,
          quantity: 1
        }];
      }
    });
  };

  // Calculate total for all selected services
  const calculateServicesTotal = () => {
    if (!formData.pickupDate || !formData.returnDate) return 0;
    
    const pickup = new Date(formData.pickupDate);
    const returnDate = new Date(formData.returnDate);
    const days = Math.max(1, Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24)));
    
    return selectedServices.reduce((total, selectedService) => {
      const price = selectedService.service.servicePrice || selectedService.service.ServicePrice || 0;
      return total + (price * days * selectedService.quantity);
    }, 0);
  };

  // Calculate grand total (vehicle daily rate + selected services)
  const calculateGrandTotal = () => {
    const vehicleTotal = calculateTotal();
    const servicesTotal = calculateServicesTotal();
    return vehicleTotal + servicesTotal;
  };

  const handleRentCar = async () => {
    // Prohibit booking if no company
    if (!companyId) {
      toast.error('Booking is not available. Please access via a company subdomain.');
      navigate('/');
      return;
    }
    
    if (!isAuthenticated) {
      navigate('/login', { state: { returnTo: `/book?${searchParams.toString()}` } });
      return;
    }
    
    if (!formData.pickupDate || !formData.returnDate) {
      toast.error(t('bookPage.selectPickupAndReturn'));
      return;
    }
    
    // Get first available vehicle via API if none selected
    let vehicleToUse = selectedVehicle;
    let vehicleId = null;
    
    if (!vehicleToUse) {
      try {
        // Call API to get first available vehicle for this model
        const response = await apiService.getFirstAvailableVehicle({
          make,
          model,
          companyId,
          status: 'Available'
        });
        
        // Handle different response structures
        const vehiclesData = response?.data || response;
        let vehiclesList = [];
        
        if (Array.isArray(vehiclesData)) {
          vehiclesList = vehiclesData;
        } else if (Array.isArray(vehiclesData?.items)) {
          vehiclesList = vehiclesData.items;
        } else if (Array.isArray(vehiclesData?.data)) {
          vehiclesList = vehiclesData.data;
        } else if (vehiclesData?.Vehicles && Array.isArray(vehiclesData.Vehicles)) {
          vehiclesList = vehiclesData.Vehicles;
        } else if (vehiclesData?.vehicles && Array.isArray(vehiclesData.vehicles)) {
          vehiclesList = vehiclesData.vehicles;
        }
        
        vehicleToUse = vehiclesList[0];
        
        if (vehicleToUse) {
          vehicleId = vehicleToUse.vehicle_id || vehicleToUse.vehicleId || vehicleToUse.id;
          setSelectedVehicleId(vehicleId);
        }
      } catch (error) {
        console.error('Error fetching first available vehicle:', error);
      }
    } else {
      vehicleId = vehicleToUse.vehicle_id || vehicleToUse.vehicleId || vehicleToUse.id;
    }
    
    if (!vehicleToUse || !vehicleId) {
      toast.error(t('bookPage.pleaseSelectVehicle'));
      return;
    }
    
    // Create booking data directly
    try {
      const bookingData = {
        vehicleId: vehicleId,
        companyId: vehicleToUse.company_id || vehicleToUse.companyId || companyId,
        customerId: user.id || user.customer_id || user.customerId,
        pickupDate: formData.pickupDate,
        returnDate: formData.returnDate,
        pickupLocation: formData.pickupLocation || vehicleToUse.location || '',
        returnLocation: formData.returnLocation || vehicleToUse.location || '',
        additionalNotes: formData.additionalNotes || ''
      };

      await apiService.createReservation(bookingData);
      toast.success(t('bookPage.bookingCreated'));
      navigate('/my-bookings');
    } catch (error) {
      toast.error(error.response?.data?.message || t('bookPage.bookingFailed'));
      console.error('Booking error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error(t('bookPage.pleaseLoginToBook'));
      navigate('/login', { state: { returnTo: `/book?${searchParams.toString()}` } });
      return;
    }

    if (!selectedVehicleId) {
      toast.error(t('bookPage.pleaseSelectVehicle'));
      return;
    }

    if (!formData.pickupDate || !formData.returnDate) {
      toast.error(t('bookPage.selectPickupAndReturn'));
      return;
    }

    const pickupDate = new Date(formData.pickupDate);
    const returnDate = new Date(formData.returnDate);

    if (returnDate <= pickupDate) {
      toast.error(t('bookPage.returnDateAfterPickup'));
      return;
    }

    try {
      if (!Array.isArray(vehicles)) {
        toast.error(t('bookPage.vehicleDataNotAvailable'));
        return;
      }

      const vehicle = vehicles.find(v => 
        (v.vehicle_id || v.vehicleId || v.id) === selectedVehicleId
      );

      if (!vehicle) {
        toast.error(t('bookPage.selectedVehicleNotFound'));
        return;
      }

      const bookingData = {
        vehicleId: vehicle.vehicle_id || vehicle.vehicleId || vehicle.id,
        companyId: vehicle.company_id || vehicle.companyId || companyId,
        customerId: user.id || user.customer_id || user.customerId,
        pickupDate: formData.pickupDate,
        returnDate: formData.returnDate,
        pickupLocation: formData.pickupLocation || vehicle.location || '',
        returnLocation: formData.returnLocation || vehicle.location || '',
        dailyRate: vehicle.daily_rate || vehicle.dailyRate || 0,
        taxAmount: 0,
        insuranceAmount: 0,
        additionalFees: 0,
        additionalNotes: formData.additionalNotes
      };

      await apiService.createReservation(bookingData);
      toast.success(t('bookPage.bookingCreated'));
      navigate('/my-bookings');
    } catch (error) {
      toast.error(error.response?.data?.message || t('bookPage.bookingFailed'));
      console.error('Booking error:', error);
    }
  };

  if (!make || !model) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('bookPage.noModelSelected')}</h2>
          <p className="text-gray-600 mb-4">{t('bookPage.selectModelToBook')}</p>
          <Link to="/" className="btn-primary">
            {t('bookPage.returnToHome')}
          </Link>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Part - Header and Vehicle Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Back Button */}
            <Link to="/" className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-4">
              <ArrowLeft className="h-5 w-5 mr-2" />
              {t('bookPage.backToHome')}
            </Link>

            {/* Header with Model Picture */}
            <div>
              <div className="flex flex-col gap-4 mb-6">
                {/* Model Picture */}
                {make && model && (
                  <div className="relative">
                    <img
                      src={modelImageSrc}
                      alt={`${make} ${model}`}
                      className="w-full h-64 object-cover rounded-lg shadow-md"
                    />
                  </div>
                )}
                {/* Header Text */}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {t('bookPage.bookModel', { make, model })}
                  </h1>
                  {modelDailyRate > 0 && (
                    <p className="text-xl font-semibold text-blue-600 mb-2">
                      ${modelDailyRate.toFixed(2)} / {t('vehicles.day')}
                    </p>
                  )}
                  {modelDescription && (
                    <p className="text-gray-600 mb-4">{modelDescription}</p>
                  )}
                  {!modelDescription && (
                    <p className="text-gray-600 mb-4">{t('bookPage.selectVehicleAndComplete')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Driver License Information - Buttons */}
            <div className="bg-white rounded-lg shadow-md p-6 space-y-3">
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login', { state: { returnTo: `/book?${searchParams.toString()}` } });
                    return;
                  }
                    setIsViewingLicense(false); // Edit mode
                  setIsLicenseModalOpen(true);
                }}
                className="w-full btn-outline flex items-center justify-center gap-2"
              >
                <CreditCard className="h-5 w-5" />
                {isAuthenticated 
                  ? (customerLicense ? t('bookPage.driverLicenseInformation') : t('bookPage.createLicenseInformation'))
                  : t('bookPage.driverLicenseInformation')}
              </button>
              
              {/* View License Button - only show if authenticated */}
              {isAuthenticated && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('View License button clicked');
                    handleViewLicense();
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
                  title="View Driver License"
                  type="button"
                >
                  <Eye className="h-5 w-5" />
                  View License
                </button>
              )}
            </div>

              {/* QR Modal */}
              {qrOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                  <div className="bg-white rounded-lg p-4 w-80 text-center">
                    <div className="text-lg font-semibold mb-2">{t('bookPage.scanOnYourPhone')}</div>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
                      alt="QR"
                      className="mx-auto mb-2"
                    />
                    <div className="text-xs break-all text-gray-600 mb-3">{qrUrl}</div>
                    <div className="text-left mb-3">
                      <label className="block text-xs text-gray-600 mb-1">{t('bookPage.publicBaseUrl')}</label>
                      <input
                        type="text"
                        value={qrBase}
                        onChange={(e)=>setQrBase(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        placeholder={t('bookPage.lanIpPlaceholder')}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={()=>{ localStorage.setItem('qrPublicBaseUrl', qrBase); toast.success(t('common.saved')); }}
                          className="flex-1 bg-blue-600 text-white py-1 rounded text-sm"
                        >{t('common.save')}</button>
                                                  <button
                            onClick={()=>{
                              const origin = (qrBase || window.location.origin).replace(/\/$/, '');
                              const returnTo = window.location.pathname + window.location.search;
                              const token = localStorage.getItem('token');
                              let url = `${origin}/scan-mobile?returnTo=${encodeURIComponent(returnTo)}`;
                              if (token && isAuthenticated) {
                                url += `&token=${encodeURIComponent(token)}`;
                              }
                              setQrUrl(url);
                            }}
                            className="flex-1 bg-gray-200 text-gray-800 py-1 rounded text-sm"
                          >Update QR</button>
                      </div>
                    </div>
                    <button
                      onClick={()=>setQrOpen(false)}
                      className="w-full bg-gray-200 text-gray-800 py-2 rounded-md font-semibold"
                    >Close</button>
                  </div>
                </div>
              )}

              {/* Driver License Modal */}
              {isLicenseModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                  {isViewingLicense ? (
                    // VIEW MODE: Only close button
                    <div className="flex justify-end items-center p-4">
                      <button
                        onClick={() => {
                          setIsLicenseModalOpen(false);
                          setIsViewingLicense(false);
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  ) : (
                    // EDIT MODE: Full header with title and buttons
                    <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <CreditCard className="h-6 w-6 mr-2" />
                        {t('bookPage.driverLicenseInformation')}
                      </h2>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleScanOnPhone}
                          className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-2 rounded shadow-md"
                          title={t('bookPage.scanOnPhoneViaQr')}
                        >
                          {t('bookPage.scanOnPhone')}
                        </button>
                        <button
                          onClick={() => {
                            setIsLicenseModalOpen(false);
                            setIsViewingLicense(false);
                          }}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                    </div>
                  )}

                                          <div className="p-6">
                        {isViewingLicense ? (
                          // VIEW MODE: Show only image or message - nothing else
                          <>
                            {licenseImageUrl ? (
                              <div className="flex justify-center items-center min-h-[400px] p-6">
                                <img
                                  src={licenseImageUrl}
                                  alt="Driver License"
                                  className="max-w-full max-h-[80vh] w-auto h-auto rounded-lg shadow-lg object-contain"
                                  onError={(e) => {
                                    console.error('[View License] ❌ Error loading image from:', licenseImageUrl);
                                    console.error('[View License] Error event:', e);
                                    // Don't clear immediately - wait a bit and check if it's really not there
                                    setTimeout(() => {
                                      // Re-check if image still fails after a moment
                                      const testImg = new Image();
                                      testImg.onerror = () => {
                                        console.error('[View License] ❌ Image confirmed missing after retry');
                                        setLicenseImageUrl(null);
                                      };
                                      testImg.onload = () => {
                                        console.log('[View License] ✅ Image loaded on retry, updating src');
                                        e.target.src = licenseImageUrl;
                                      };
                                      testImg.src = licenseImageUrl;
                                    }, 1000);
                                  }}
                                  onLoad={() => {
                                    console.log('[View License] ✅ Image loaded successfully from:', licenseImageUrl);
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="text-center py-16 px-6">
                                <p className="text-gray-600 text-lg mb-2">No driver license image found.</p>
                                <p className="text-gray-500 text-sm mb-2">
                                  Looking for: <code className="bg-gray-100 px-2 py-1 rounded text-xs">/licenses/{companyConfig?.id || companyId}/{user?.id || user?.userId}/driverlicense.*</code>
                                </p>
                                <p className="text-gray-500 mb-6">Please upload one using the "Scan on phone" button.</p>
                                <button
                                  type="button"
                                  onClick={handleScanOnPhone}
                                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg"
                                >
                                  {t('bookPage.scanOnPhone')}
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          // EDIT MODE: Show form with optional image preview
                          <>
                        {/* Display uploaded driver license image if available */}
                        {licenseImageUrl && (
                          <div className="mb-6 pb-6 border-b">
                                <label className="block text-sm font-medium text-gray-700 mb-4 text-lg">
                              {t('bookPage.uploadedDriverLicense') || 'Uploaded Driver License'}
                            </label>
                                <div className="bg-gray-50 rounded-lg p-6 flex justify-center items-center min-h-[400px]">
                              <img
                                src={licenseImageUrl}
                                alt="Driver License"
                                    className="max-w-full max-h-[600px] w-auto h-auto rounded-lg shadow-lg object-contain"
                                onError={(e) => {
                                      console.error('Error loading driver license image from:', licenseImageUrl);
                                      setLicenseImageUrl(null);
                                    }}
                                    onLoad={() => {
                                      console.log('Driver license image loaded successfully from:', licenseImageUrl);
                                }}
                              />
                            </div>
                          </div>
                        )}
                        <form onSubmit={handleSaveLicense} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* License Number */}
                          <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.licenseNumber')} *
                      </label>
                      <input
                        type="text"
                        name="licenseNumber"
                        value={licenseData.licenseNumber}
                        onChange={handleLicenseChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* State Issued */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.stateIssued')} *
                      </label>
                      <input
                        type="text"
                        name="stateIssued"
                        value={licenseData.stateIssued}
                        onChange={handleLicenseChange}
                        maxLength="2"
                        placeholder="e.g., NJ"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Country Issued */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.countryIssued')}
                      </label>
                      <input
                        type="text"
                        name="countryIssued"
                        value={licenseData.countryIssued}
                        onChange={handleLicenseChange}
                        maxLength="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Expiration Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.expirationDate')} *
                      </label>
                      <input
                        type="date"
                        name="expirationDate"
                        value={licenseData.expirationDate}
                        onChange={handleLicenseChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Issue Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.issueDate')}
                      </label>
                      <input
                        type="date"
                        name="issueDate"
                        value={licenseData.issueDate}
                        onChange={handleLicenseChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Sex */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.sex')}
                      </label>
                      <select
                        name="sex"
                        value={licenseData.sex}
                        onChange={handleLicenseChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">{t('bookPage.select')}</option>
                        <option value="M">{t('bookPage.male')}</option>
                        <option value="F">{t('bookPage.female')}</option>
                        <option value="X">{t('bookPage.other')}</option>
                      </select>
                    </div>

                    {/* Height */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.height')}
                      </label>
                      <input
                        type="text"
                        name="height"
                        value={licenseData.height}
                        onChange={handleLicenseChange}
                        placeholder="e.g., 5'10 inches"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Eye Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.eyeColor')}
                      </label>
                      <input
                        type="text"
                        name="eyeColor"
                        value={licenseData.eyeColor}
                        onChange={handleLicenseChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Middle Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.middleName')}
                      </label>
                      <input
                        type="text"
                        name="middleName"
                        value={licenseData.middleName}
                        onChange={handleLicenseChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                          </div>
                        </div>

                        {/* License Address */}
                        <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('bookPage.address')}
                    </label>
                    <input
                      type="text"
                      name="licenseAddress"
                      value={licenseData.licenseAddress}
                      onChange={handleLicenseChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* License City */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.city')}
                      </label>
                      <input
                        type="text"
                        name="licenseCity"
                        value={licenseData.licenseCity}
                        onChange={handleLicenseChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* License State */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.state')}
                      </label>
                      <input
                        type="text"
                        name="licenseState"
                        value={licenseData.licenseState}
                        onChange={handleLicenseChange}
                        maxLength="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* License Postal Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.postalCode')}
                      </label>
                      <input
                        type="text"
                        name="licensePostalCode"
                        value={licenseData.licensePostalCode}
                        onChange={handleLicenseChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* License Country */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.country')}
                      </label>
                      <input
                        type="text"
                        name="licenseCountry"
                        value={licenseData.licenseCountry}
                        onChange={handleLicenseChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Restriction Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.restrictionCode')}
                      </label>
                      <input
                        type="text"
                        name="restrictionCode"
                        value={licenseData.restrictionCode}
                        onChange={handleLicenseChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Endorsements */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('bookPage.endorsements')}
                    </label>
                    <input
                      type="text"
                      name="endorsements"
                      value={licenseData.endorsements}
                      onChange={handleLicenseChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                        <div className="flex gap-3 pt-4 border-t">
                          <button
                            type="button"
                            onClick={() => setIsLicenseModalOpen(false)}
                            className="flex-1 btn-secondary py-2"
                            disabled={saveLicenseMutation.isLoading}
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            type="submit"
                            className="flex-1 btn-primary py-2"
                            disabled={saveLicenseMutation.isLoading}
                          >
                            {saveLicenseMutation.isLoading 
                              ? t('bookPage.saving') 
                              : customerLicense 
                                ? t('bookPage.updateLicenseInformation') 
                                : t('bookPage.createLicenseInformation')}
                          </button>
                        </div>
                      </form>
                          </>
                        )}
                    </div>
                  </div>
                </div>
              )}
          </div>

          {/* Right Part - Booking Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              {/* Start Date and End Date at the top */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('home.startDate')}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="date"
                        name="pickupDate"
                        value={formData.pickupDate}
                        onChange={handleChange}
                        min={today}
                        required
                        placeholder="mm/dd/yyyy"
                        className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('home.endDate')}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="date"
                        name="returnDate"
                        value={formData.returnDate}
                        onChange={handleChange}
                        min={formData.pickupDate || today}
                        required
                        placeholder="mm/dd/yyyy"
                        className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {selectedVehicle ? (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('bookPage.bookingDetails')}</h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.pickupLocationLabel')}
                      </label>
                      <input
                        type="text"
                        name="pickupLocation"
                        value={formData.pickupLocation}
                        onChange={handleChange}
                        placeholder={selectedVehicle.location || 'Location'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.returnLocationLabel')}
                      </label>
                      <input
                        type="text"
                        name="returnLocation"
                        value={formData.returnLocation}
                        onChange={handleChange}
                        placeholder={selectedVehicle.location || 'Location'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.additionalNotes')}
                      </label>
                      <textarea
                        name="additionalNotes"
                        value={formData.additionalNotes}
                        onChange={handleChange}
                        rows="3"
                        placeholder={t('bookPage.specialRequests')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {formData.pickupDate && formData.returnDate && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">
                            {Math.max(1, Math.ceil((new Date(formData.returnDate) - new Date(formData.pickupDate)) / (1000 * 60 * 60 * 24)))} {t('bookPage.days')}
                          </span>
                          <span className="text-xl font-bold text-blue-600">
                            ${calculateGrandTotal().toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full btn-primary py-3 text-lg"
                      disabled={!isAuthenticated}
                    >
                      {isAuthenticated ? t('bookPage.completeBooking') : t('bookPage.loginToBook')}
                    </button>

                    {!isAuthenticated && (
                      <p className="text-sm text-center text-gray-600">
                        <Link to="/login" className="text-blue-600 hover:underline">
                          {t('bookPage.login')}
                        </Link> {t('bookPage.signInToComplete')}
                      </p>
                    )}
                  </form>
                </>
              ) : (
                <div>
                  {modelDailyRate > 0 && (
                    <p className="text-xl font-semibold text-blue-600 mb-2">
                      ${modelDailyRate.toFixed(2)} / {t('vehicles.day')}
                    </p>
                  )}
                  <h2 className="text-lg font-bold text-gray-900 mb-4">{t('bookPage.additionalOptions')}</h2>
                  {additionalOptions.length > 0 ? (
                    <>
                      <div className="space-y-1">
                        {additionalOptions.map((service) => {
                          const serviceId = service.additionalServiceId || service.AdditionalServiceId;
                          const isSelected = selectedServices.some(s => s.id === serviceId);
                          const isMandatory = service.serviceIsMandatory || service.ServiceIsMandatory;
                          
                          return (
                            <div 
                              key={serviceId}
                              className="flex items-center gap-2 text-gray-700"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected || isMandatory}
                                onChange={() => !isMandatory && handleServiceToggle(service)}
                                disabled={isMandatory}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span>
                                {service.serviceName || service.ServiceName}: ${(service.servicePrice || service.ServicePrice || 0).toFixed(0)} / day.
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Total */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-900">Total:</span>
                          <span className="text-xl font-bold text-blue-600">${calculateGrandTotal().toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Rent the Car Button */}
                      <button
                        onClick={handleRentCar}
                        className="w-full btn-primary py-3 text-lg mt-4"
                      >
                        {t('bookPage.rentTheCar')}
                      </button>

                      {!isAuthenticated && (
                        <p className="text-sm text-center text-gray-600 mt-2">
                          <Link to="/login" className="text-blue-600 hover:underline">
                            {t('bookPage.login')}
                          </Link> {t('bookPage.signInToComplete')}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">{t('bookPage.noAdditionalOptions')}</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookPage;

