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



import React, { useState, useMemo, useCallback, useEffect } from 'react';

import { useSearchParams, useNavigate, Link } from 'react-router-dom';

import { useQuery, useMutation, useQueryClient } from 'react-query';

import { useAuth } from '../context/AuthContext';

import { useCompany } from '../context/CompanyContext';

import { toast } from 'react-toastify';

import { Car, ArrowLeft, CreditCard, X, Calendar, Mail, Lock, User as UserIcon } from 'lucide-react';

import { translatedApiService as apiService } from '../services/translatedApi';

import { useTranslation } from 'react-i18next';

import { countryToLanguage } from '../utils/countryLanguage';

import { sanitizeFilterDates } from '../utils/rentalSearchFilters';



const INITIAL_AUTH_FORM = {

  email: '',

  password: '',

  firstName: '',

  lastName: '',

  confirmPassword: ''

};



const SEARCH_FILTERS_STORAGE_KEY = 'rentalSearchFilters';



const BookPage = () => {

  const { t, i18n } = useTranslation();

  const [searchParams] = useSearchParams();

  const navigate = useNavigate();

  const { user, isAuthenticated, login: loginUser, register: registerUser } = useAuth();

  const queryClient = useQueryClient();



  // Get filters from URL

  const { companyConfig, formatPrice } = useCompany();

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
  
  const [selectedLocationId, setSelectedLocationId] = useState(searchParams.get('locationId') || '');



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



  const savedSearchFilters = useMemo(() => {

    try {

      const raw = localStorage.getItem(SEARCH_FILTERS_STORAGE_KEY);

      if (!raw) return null;

      const parsed = JSON.parse(raw);

      const { sanitized, changed } = sanitizeFilterDates(parsed);



      if (changed) {

        if (Object.keys(sanitized).length === 0) {

          localStorage.removeItem(SEARCH_FILTERS_STORAGE_KEY);

        } else {

          localStorage.setItem(SEARCH_FILTERS_STORAGE_KEY, JSON.stringify(sanitized));

        }

      }



      return sanitized;

    } catch (error) {

      console.warn('[BookPage] Failed to load saved search filters:', error);

      return null;

    }

  }, []);



  const searchStartDate = searchParams.get('startDate');

  const searchEndDate = searchParams.get('endDate');

  const searchCategoryParam = searchParams.get('searchCategory');

  const searchLocationParam =

    searchParams.get('locationId') || savedSearchFilters?.locationId || '';



  // Calculate today for default dates (same-day rental allowed)

  const today = new Date();

  const todayStr = today.toISOString().split('T')[0];



  const initialPickupDate = searchStartDate || savedSearchFilters?.startDate || todayStr;

  const initialReturnDate = searchEndDate || savedSearchFilters?.endDate || todayStr;

  const initialSearchCategory = searchCategoryParam || savedSearchFilters?.category || '';



  const companyCountryName = useMemo(

    () => companyConfig?.country || companyConfig?.Country || 'United States',

    [companyConfig]

  );



  const supportsIntlRegions = useMemo(() => {

    if (typeof Intl?.supportedValuesOf !== 'function') {

      return false;

    }



    try {

      const supported = Intl.supportedValuesOf('region');

      return Array.isArray(supported) && supported.length > 0;

    } catch {

      return false;

    }

  }, []);



  const countryOptions = useMemo(() => {

    if (supportsIntlRegions) {

      try {

        const regionCodes = Intl.supportedValuesOf('region').filter((code) => /^[A-Z]{2}$/.test(code));



        if (regionCodes.length > 0) {

          const displayNames = new Intl.DisplayNames([i18n.language || 'en'], { type: 'region' });



          return regionCodes

            .map((code) => ({

              code,

              name: displayNames.of(code) || code,

            }))

            .sort((a, b) => a.name.localeCompare(b.name));

        }

      } catch {

        // Fall through to static list if DisplayNames is not available or fails

      }

    }



    const fallbackCountries = Array.from(

      new Set([

        'United States',

        'Canada',

        'Brazil',

        'Argentina',

        'Chile',

        'Colombia',

        'Mexico',

        'Peru',

        'Uruguay',

        'Paraguay',

        'Bolivia',

        'Ecuador',

        'Venezuela',

        'Costa Rica',

        'Panama',

        'Guatemala',

        'Honduras',

        'El Salvador',

        'Nicaragua',

        'Belize',

        'Dominican Republic',

        'Cuba',

        'Jamaica',

        'Bahamas',

        'Barbados',

        'Antigua and Barbuda',

        'Saint Lucia',

        'Trinidad and Tobago',

        'United Kingdom',

        'Ireland',

        'France',

        'Germany',

        'Italy',

        'Spain',

        'Portugal',

        'Netherlands',

        'Belgium',

        'Switzerland',

        'Austria',

        'Norway',

        'Sweden',

        'Finland',

        'Denmark',

        'Australia',

        'New Zealand',

        'Japan',

        'South Korea',

        'China',

        'India',

        'South Africa',

        'Morocco',

        'Egypt',

        'Turkey',

        ...Object.keys(countryToLanguage || {}),

      ])

    ).sort((a, b) => a.localeCompare(b));



    return fallbackCountries.map((name) => ({

      code: name,

      name,

    }));

  }, [i18n.language, supportsIntlRegions]);

  const [formData, setFormData] = useState(() => ({

    pickupDate: initialPickupDate,

    returnDate: initialReturnDate,

    pickupLocation: savedSearchFilters?.pickupLocation || '',

    returnLocation: savedSearchFilters?.returnLocation || ''

  }));



  // Driver License form data

  const [licenseData, setLicenseData] = useState({

    licenseNumber: '',

    stateIssued: '',

    countryIssued: companyCountryName || 'United States',

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

  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [authStep, setAuthStep] = useState('email');

  const [authForm, setAuthForm] = useState(INITIAL_AUTH_FORM);

  const [authLoading, setAuthLoading] = useState(false);

  const [authError, setAuthError] = useState('');

  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [authReason, setAuthReason] = useState(null); // 'checkout' or 'license'

  

  // Refs for auto-focusing input fields

  const emailInputRef = React.useRef(null);

  const passwordInputRef = React.useRef(null);



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



  React.useEffect(() => {

    const payload = {

      startDate: formData.pickupDate || '',

      endDate: formData.returnDate || '',

      category: initialSearchCategory || '',

      locationId: searchLocationParam || '',

      pickupLocation: formData.pickupLocation || '',

      returnLocation: formData.returnLocation || ''

    };



    try {

      localStorage.setItem(SEARCH_FILTERS_STORAGE_KEY, JSON.stringify(payload));

    } catch (error) {

      console.warn('[BookPage] Failed to persist search filters:', error);

    }

  }, [

    formData.pickupDate,

    formData.returnDate,

    formData.pickupLocation,

    formData.returnLocation,

    initialSearchCategory,

    searchLocationParam

  ]);



  React.useEffect(() => {

    if (!companyCountryName) return;

    setLicenseData((prev) => {

      if (

        !prev.countryIssued ||

        prev.countryIssued === 'US' ||

        prev.countryIssued === 'United States'

      ) {

        return { ...prev, countryIssued: companyCountryName };

      }

      return prev;

    });

  }, [companyCountryName]);





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

  // Fetch company locations for dropdown
  const { data: pickupLocationsResponse } = useQuery(
    ['companyLocations', companyId],
    () => apiService.getCompanyLocations({ companyId: companyId, isActive: true, isPickupLocation: true }),
    {
      enabled: !!companyId,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );
  
  const pickupLocationsData = pickupLocationsResponse?.data || pickupLocationsResponse;
  const companyLocations = Array.isArray(pickupLocationsData) ? pickupLocationsData : [];
  const showLocationDropdown = companyLocations.length > 1;

  // Fetch accurate available count using the models API (which uses the stored procedure)
  // Must have companyId to ensure rates are filtered by company
  const { data: modelsGroupedResponse } = useQuery(
    ['modelsGroupedByCategory', companyId, selectedLocationId, formData.pickupDate, formData.returnDate],
    () => apiService.getModelsGroupedByCategory(
      companyId || null, 
      selectedLocationId || null,
      formData.pickupDate || null,
      formData.returnDate || null
    ),
    {
      enabled: !!companyId, // Require companyId, but dates are optional (backend uses defaults)
      retry: 1,
      refetchOnWindowFocus: false
    }
  );



  // Fetch model data to get daily rate (fallback if modelsGroupedByCategory doesn't have the rate)
  // Must have companyId to ensure rates are filtered by company
  const { data: modelsResponse } = useQuery(

    ['models', { make, model, companyId }],

    () => apiService.getModels({ make, modelName: model, companyId: companyId }),

    {

      enabled: !!(make && model && companyId), // Require companyId to filter rates by company

      retry: 1,

      refetchOnWindowFocus: false

    }

  );

  

  // Get model data from modelsGroupedByCategory (same source as home page) or getModels fallback
  // This ensures consistency with the listing page
  const modelData = useMemo(() => {
    // First try to get model from modelsGroupedByCategory (same as home page)
    if (modelsGroupedResponse && make && model) {
      const modelsGroupedData = modelsGroupedResponse?.data || modelsGroupedResponse;
      const categories = Array.isArray(modelsGroupedData) ? modelsGroupedData : [];
      
      // Find the model in the grouped response (matches make and model)
      for (const category of categories) {
        const models = category.models || category.Models || [];
        const matchingModel = models.find(m => {
          const modelMake = m.make || m.Make || '';
          const modelName = m.modelName || m.ModelName || '';
          return modelMake?.toLowerCase() === make?.toLowerCase() && 
                 modelName?.toLowerCase() === model?.toLowerCase();
        });
        
        if (matchingModel) {
          return matchingModel; // Found the model, return it
        }
      }
    }
    
    // Fallback to getModels if not found in grouped data
    if (modelsResponse) {
      const modelsData = modelsResponse?.data || modelsResponse;
      const data = Array.isArray(modelsData) ? modelsData[0] : null;
      if (data) {
        return data;
      }
    }
    
    return null;
  }, [modelsGroupedResponse, modelsResponse, make, model]);

  // Get daily rate from modelData
  const modelDailyRate = modelData?.dailyRate || modelData?.daily_rate || modelData?.DailyRate || 0;

  // Explicitly use Description field (not CategoryName)
  const modelDescription = modelData?.description || modelData?.Description || '';

  const modelCategory = modelData?.categoryName || modelData?.CategoryName || modelData?.category || '';

  

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

  const vehicles = React.useMemo(() => {

    const payload = vehiclesResponse?.data?.result || vehiclesResponse?.data || vehiclesResponse;

    if (Array.isArray(payload?.items)) return payload.items;

    if (Array.isArray(payload?.data)) return payload.data;

    if (Array.isArray(payload?.vehicles)) return payload.vehicles;

    if (Array.isArray(payload)) return payload;

    if (Array.isArray(vehiclesResponse)) return vehiclesResponse;

    return [];

  }, [vehiclesResponse]);



  const selectedVehicle = Array.isArray(vehicles) ? vehicles.find(v => 

    (v.vehicle_id || v.vehicleId || v.id) === selectedVehicleId

  ) : null;

  // Get accurate available count from stored procedure (considers dates and location)
  const availableVehiclesCount = React.useMemo(() => {
    if (!modelsGroupedResponse || !make || !model) {
      return 0;
    }
    
    const modelsGroupedData = modelsGroupedResponse?.data || modelsGroupedResponse;
    const categories = Array.isArray(modelsGroupedData) ? modelsGroupedData : [];
    
    // Find the model in the grouped response
    for (const category of categories) {
      if (category.models && Array.isArray(category.models)) {
        const matchingModel = category.models.find(m => 
          m.make?.toLowerCase() === make?.toLowerCase() && 
          m.modelName?.toLowerCase() === model?.toLowerCase()
        );
        
        if (matchingModel) {
          return matchingModel.availableCount || 0;
        }
      }
    }
    
    return 0;
  }, [modelsGroupedResponse, make, model]);



  React.useEffect(() => {

    if (!selectedVehicleId && vehicles.length > 0) {

      const first = vehicles[0];

      const id = first?.vehicle_id || first?.vehicleId || first?.id;

      if (id) {

        setSelectedVehicleId(id);

      }

    }

  }, [vehicles, selectedVehicleId]);



  const handleChange = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    
    // If pickup date is changing, check if return date needs adjustment
    if (name === 'pickupDate' && value) {
      const newPickupDate = new Date(value);
      const currentReturnDate = formData.returnDate ? new Date(formData.returnDate) : null;
      
      // If return date exists and is before new pickup date (not same day), set it to same day
      if (currentReturnDate && currentReturnDate < newPickupDate) {
        setFormData({
          ...formData,
          pickupDate: value,
          returnDate: value // Same day rental is allowed
        });
        return;
      }
    }
    
    setFormData({
      ...formData,
      [name]: value
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





  // Debug: Log when qrOpen state changes

  useEffect(() => {

    console.log('[QR Code] qrOpen state changed to:', qrOpen);

    console.log('[QR Code] qrUrl is:', qrUrl ? qrUrl.substring(0, 50) + '...' : 'empty');

  }, [qrOpen, qrUrl]);



  // Create QR for phone scan: show QR code with link to scanning page

  const handleScanOnPhone = async () => {

    console.log('[QR Code] ========== handleScanOnPhone CALLED ==========');

    console.log('[QR Code] Current qrOpen state:', qrOpen);

    console.log('[QR Code] Current qrUrl:', qrUrl);

    

    try {

      if (!isAuthenticated) {

        toast.error(t('bookPage.pleaseLoginToScanLicense') || 'Please login to scan license');

        navigate('/login', { state: { returnTo: `/book?${searchParams.toString()}` } });

        return;

      }

      

      // Prefer configured public base URL for LAN/External access; fallback to company's licensed domain

      const configuredBase = qrBase || '';

      // Use company's domain for BlinkID compatibility (from companyConfig.domain or companyConfig.companyUrl)
      const companyDomain = companyConfig?.domain || companyConfig?.companyUrl || companyConfig?.websiteUrl;
      const licensedDomain = companyDomain ? `https://${companyDomain.replace(/^https?:\/\//, '')}` : window.location.origin.replace(/^http:/, 'https:');
      
      const origin = configuredBase ? 
        configuredBase.replace(/^http:/, 'https:') : 
        (window.location.hostname === 'localhost' || window.location.hostname.match(/^192\.168\./) || window.location.hostname.match(/^127\.0\./) ?
          licensedDomain :
          window.location.origin.replace(/^http:/, 'https:'));

      const returnTo = window.location.pathname + window.location.search;

      

      // Log authentication status for debugging

      console.log('[QR Code] User authenticated:', isAuthenticated);

        

      // Get companyId and userId (customerId) for query parameters

      const currentCompanyId = companyConfig?.id || companyId;

      const currentUserId = user?.customerId || user?.id || user?.userId || user?.Id || user?.UserId || user?.sub || user?.nameidentifier;

      

      // Build base URL (we'll add token if available)

      let baseUrl = `${origin.replace(/\/$/, '')}/scan-mobile?returnTo=${encodeURIComponent(returnTo)}`;

      if (currentCompanyId) {

        baseUrl += `&companyId=${encodeURIComponent(currentCompanyId)}`;

      }

      if (currentUserId) {

        baseUrl += `&userId=${encodeURIComponent(currentUserId)}`;

      }

      

      // Try to get token FIRST (with short timeout), then show QR code with token if available

      if (isAuthenticated) {

        console.log('[QR Code] Attempting to retrieve token from session before generating QR code...');

        console.log('[QR Code] User is authenticated, checking session for token...');

        

        // Method 1: Try to get token from dedicated endpoint (fastest)

        // Method 2: Fallback to profile endpoint with includeToken=true

        const getTokenFromSession = async () => {

          try {

            // Try dedicated endpoint first using fetch with credentials

            const tokenResponse = await Promise.race([

              fetch('/api/auth/session-token', {

                method: 'GET',

                credentials: 'include',

                headers: {

                  'Accept': 'application/json',

                  'Content-Type': 'application/json'

                }

              }).then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))),

              new Promise((_, reject) => 

                setTimeout(() => reject(new Error('Token retrieval timeout')), 800)

              )

            ]);

            

            if (tokenResponse?.token || tokenResponse?.data?.token) {

              const token = tokenResponse.token || tokenResponse.data.token;

              console.log('[QR Code] ✅ Token retrieved from /session-token endpoint');

              return token;

            }

            return null;

          } catch (err) {

            console.warn('[QR Code] /session-token failed, trying profile endpoint:', err.message);

            

            // Fallback: Get token from profile response

            try {

              const profileResponse = await Promise.race([

                fetch('/api/auth/profile?includeToken=true', {

                  method: 'GET',

                  credentials: 'include',

                  headers: {

                    'Accept': 'application/json',

                    'Content-Type': 'application/json'

                  }

                }).then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))),

                new Promise((_, reject) => 

                  setTimeout(() => reject(new Error('Profile timeout')), 800)

                )

              ]);

              

              if (profileResponse?._token || profileResponse?.data?._token || profileResponse?.token) {

                const token = profileResponse._token || profileResponse.data?._token || profileResponse.token;

                console.log('[QR Code] ✅ Token retrieved from profile endpoint');

                return token;

              }

            } catch (profileErr) {

              console.warn('[QR Code] Profile endpoint also failed:', profileErr.message);

            }

            

            return null;

          }

        };

        

        // Try to get token, but don't block - show QR code after 1 second max

        const tokenPromise = getTokenFromSession();

        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 1000));

        

        Promise.race([tokenPromise, timeoutPromise])

          .then(token => {

            if (token) {

              const urlWithToken = baseUrl + `&token=${encodeURIComponent(token)}`;

              console.log('[QR Code] ✅ Token retrieved, generating QR code with token');

              setQrUrl(urlWithToken);

              setQrOpen(true);

            } else {

              // No token available - proceed without it

              console.log('[QR Code] ⚠️ No token available, generating QR code without token');

              console.log('[QR Code] User will need to log in on mobile device');

              setQrUrl(baseUrl);

              setQrOpen(true);

            }

          })

          .catch(err => {

            // Fallback - show QR code without token

            console.log('[QR Code] Token retrieval error, using base URL:', err.message);

            setQrUrl(baseUrl);

            setQrOpen(true);

          });

      } else {

        // Not authenticated - show QR code immediately without token

        console.log('[QR Code] User not authenticated, showing QR code without token');

        setQrUrl(baseUrl);

        setQrOpen(true);

      }

      

      // Force a re-render check after a brief delay

      setTimeout(() => {

        console.log('[QR Code] After 100ms - checking if modal rendered');

        const modalElement = document.querySelector('[data-qr-modal]');

        console.log('[QR Code] Modal element:', modalElement ? 'FOUND' : 'NOT FOUND');

        console.log('[QR Code] Current React qrOpen state (from closure):', qrOpen);

      }, 100);

    

      // On mobile devices, also offer direct navigation

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;

      if (isMobile) {

        console.log('Mobile device detected - QR code shown, direct navigation available');

      }

    } catch (error) {

      console.error('[QR Code] Error in handleScanOnPhone:', error);

      // Even on error, try to show QR code with basic URL

      const origin = (qrBase || window.location.origin).replace(/^http:/, 'https:');

      const returnTo = window.location.pathname + window.location.search;

      const fallbackUrl = `${origin.replace(/\/$/, '')}/scan-mobile?returnTo=${encodeURIComponent(returnTo)}`;

      console.log('[QR Code] Error fallback - setting states');

      setQrUrl(fallbackUrl);

      setQrOpen(true);

      toast.error('Error generating QR code, but showing basic version');

    }

  };



  // QR-based phone scan flow removed to satisfy current lint and scope



  const calculateTotal = useCallback(() => {

    if (!modelDailyRate) return 0;



    // If dates are not set, return the daily rate (1 day)

    if (!formData.pickupDate || !formData.returnDate) {

      return modelDailyRate;

    }



    const pickup = new Date(formData.pickupDate);

    const returnDate = new Date(formData.returnDate);

    const days = Math.max(1, Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24)) + 1);



    return days * modelDailyRate;

  }, [formData.pickupDate, formData.returnDate, modelDailyRate]);



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

  const calculateServicesTotal = useCallback(() => {

    if (!formData.pickupDate || !formData.returnDate) return 0;

    

    const pickup = new Date(formData.pickupDate);

    const returnDate = new Date(formData.returnDate);

    const days = Math.max(1, Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24)) + 1);

    

    return selectedServices.reduce((total, selectedService) => {

      const price = selectedService.service.servicePrice || selectedService.service.ServicePrice || 0;

      return total + (price * days * selectedService.quantity);

    }, 0);

  }, [formData.pickupDate, formData.returnDate, selectedServices]);



  // Calculate grand total (vehicle daily rate + selected services)

  const calculateGrandTotal = useCallback(() => {

    const vehicleTotal = calculateTotal();

    const servicesTotal = calculateServicesTotal();

    return vehicleTotal + servicesTotal;

  }, [calculateTotal, calculateServicesTotal]);



  const ensureVehicleSelection = useCallback(async () => {

    let vehicle = selectedVehicle;

    let vehicleId = selectedVehicleId;



    if (!vehicle || !vehicleId) {

      try {

        const response = await apiService.getFirstAvailableVehicle({

          make,

          model,

          companyId,

          status: 'Available',

          pageSize: 1

        });



        const data = response?.data?.result || response?.data || response;

        let list = [];



        if (Array.isArray(data?.items)) list = data.items;

        else if (Array.isArray(data?.data)) list = data.data;

        else if (Array.isArray(data?.vehicles)) list = data.vehicles;

        else if (Array.isArray(data)) list = data;



        const firstVehicle = list[0];

        if (firstVehicle) {

          const id = firstVehicle.vehicle_id || firstVehicle.vehicleId || firstVehicle.id;

          if (id) {

            setSelectedVehicleId(id);

            vehicle = firstVehicle;

            vehicleId = id;

          }

        }

      } catch (error) {

        console.error('Error fetching first available vehicle:', error);

      }

    }



    if (!vehicle || !vehicleId) {

      toast.error(t('bookPage.pleaseSelectVehicle'));

      return null;

    }



    return { vehicle, vehicleId };

  }, [companyId, make, model, selectedVehicle, selectedVehicleId, setSelectedVehicleId, t]);



  const resetAuthModal = useCallback(() => {

    setAuthStep('email');

    setAuthForm(INITIAL_AUTH_FORM);

    setAuthError('');

    setAuthReason(null);

  }, []);



  const openAuthModal = useCallback((reason = 'checkout') => {

    setAuthForm((prev) => ({ ...INITIAL_AUTH_FORM, email: prev.email || user?.email || '' }));

    setAuthStep('email');

    setAuthError('');

    setAuthReason(reason);

    setAuthModalOpen(true);

  }, [user]);

  

  // Auto-focus email field when modal opens with email step

  React.useEffect(() => {

    if (authModalOpen && authStep === 'email' && emailInputRef.current) {

      // Small delay to ensure modal is fully rendered

      setTimeout(() => {

        emailInputRef.current?.focus();

      }, 100);

    }

  }, [authModalOpen, authStep]);

  

  // Auto-focus password field when switching to password step

  React.useEffect(() => {

    if (authModalOpen && authStep === 'password' && passwordInputRef.current) {

      // Small delay to ensure field is fully rendered

      setTimeout(() => {

        passwordInputRef.current?.focus();

      }, 100);

    }

  }, [authModalOpen, authStep]);



  const handleCloseAuthModal = () => {

    if (authLoading || checkoutLoading) return;

    setAuthModalOpen(false);

    resetAuthModal();

  };



  const handleAuthInputChange = (e) => {

    const { name, value } = e.target;

    setAuthForm((prev) => ({ ...prev, [name]: value }));

  };



  const proceedToCheckout = useCallback(async (overrideUser = null) => {

    if (!formData.pickupDate || !formData.returnDate) {

      toast.error(t('bookPage.selectPickupAndReturn'));

      return;

    }



    const pickupDate = new Date(formData.pickupDate);

    const returnDate = new Date(formData.returnDate);



    if (returnDate < pickupDate) {

      toast.error(t('bookPage.returnDateAfterPickup'));

      return;

    }

    // Require location selection if multiple locations exist
    if (showLocationDropdown && !selectedLocationId) {
      toast.error(t('booking.selectLocationRequired') || 'Please select a location');
      return;
    }



    // Use overrideUser if provided (from login response), otherwise use user from state

    const userToUse = overrideUser || user;

    const customerId =

      userToUse?.id ||

      userToUse?.customer_id ||

      userToUse?.customerId ||

      userToUse?.CustomerId ||

      userToUse?.customer?.id ||

      null;



    if (!customerId) {

      toast.error(t('bookPage.loginToComplete', 'Please sign in to complete your booking.'));

      openAuthModal();

      return;

    }



    const selection = await ensureVehicleSelection();

    if (!selection) return;



    const { vehicle, vehicleId } = selection;



    try {

      setCheckoutLoading(true);



      const dailyRate = Number(vehicle.daily_rate || vehicle.dailyRate || modelDailyRate || 0);

      const additionalFees = calculateServicesTotal();



      const bookingData = {

        vehicleId,

        companyId: vehicle.company_id || vehicle.companyId || companyId,

        customerId,

        pickupDate: formData.pickupDate,

        returnDate: formData.returnDate,

        pickupLocation: formData.pickupLocation || vehicle.location || '',

        returnLocation: formData.returnLocation || vehicle.location || '',

        dailyRate,

        taxAmount: 0,

        insuranceAmount: 0,

        additionalFees,

        securityDeposit: companyConfig?.securityDeposit ?? 1000,

        locationId: selectedLocationId || null

      };



      const bookingResponse = await apiService.createBooking(bookingData);

      const reservation = bookingResponse?.data || bookingResponse;

      const bookingId = reservation?.id || reservation?.Id;

      const bookingNumber =

        reservation?.bookingNumber ||

        reservation?.BookingNumber ||

        reservation?.booking_number ||

        reservation?.bookingNo ||

        '';



      if (!bookingId) {

        toast.error(t('bookPage.bookingFailed') || 'Unable to create booking.');

        return;

      }



      const amount = calculateGrandTotal();

      if (amount <= 0) {

        toast.error(t('bookPage.invalidAmount') || 'Payment amount must be greater than zero.');

        return;

      }



      const checkoutResponse = await apiService.createCheckoutSession({

        customerId: userToUse.id || userToUse.customer_id || userToUse.customerId,

        companyId: vehicle.company_id || vehicle.companyId || companyId,

        bookingId,

        bookingNumber,

        amount,

        currency: (companyConfig?.currency || 'USD').toLowerCase(),

        description: `${make || ''} ${model || ''}`.trim() || 'Vehicle Booking',
        
        language: i18n.language,

        successUrl: `${window.location.origin}/my-bookings?booking=${bookingId ?? ''}`,

        cancelUrl: `${window.location.origin}${window.location.pathname}${window.location.search}`

      });



      const checkoutData = checkoutResponse?.data || checkoutResponse;

      const sessionUrl = checkoutData?.url || checkoutData?.Url;



      if (sessionUrl) {

        localStorage.removeItem(SEARCH_FILTERS_STORAGE_KEY);

        window.location.href = sessionUrl;

      } else {

        toast.error(t('bookPage.checkoutUnable') || 'Unable to start payment session.');

      }

    } catch (error) {

      const status = error.response?.status;

      const message = error.response?.data?.message || error.message;



      if (status === 401 || status === 403) {

        toast.error(t('bookPage.sessionExpired', 'Your session expired. Please sign in again.'));

        openAuthModal();

      } else {

        toast.error(message || t('bookPage.bookingFailed'));

      }

      console.error('Checkout error:', error);

    } finally {

      setCheckoutLoading(false);

    }

  }, [

    companyConfig?.currency,

    companyConfig?.securityDeposit,

    companyId,

    ensureVehicleSelection,

    formData.pickupDate,

    formData.returnDate,

    formData.pickupLocation,

    formData.returnLocation,

    make,

    model,

    t,

    i18n.language,

    user,

    calculateGrandTotal,

    calculateServicesTotal,

    modelDailyRate,

    openAuthModal,

    showLocationDropdown,

    selectedLocationId

  ]);



  const handleAuthSuccess = useCallback(async (userData = null) => {

    const reason = authReason;

    resetAuthModal();

    setAuthModalOpen(false);

    setAuthReason(null);

    

    // If authentication was for license, open license modal after auth

    if (reason === 'license') {

      setIsLicenseModalOpen(true);

      return;

    }

    

    // Otherwise proceed to checkout

    // If userData is provided, use it directly; otherwise wait for state update

    if (userData) {

      await proceedToCheckout(userData);

    } else {

      // Wait a bit for React state to update

      await new Promise(resolve => setTimeout(resolve, 300));

      await proceedToCheckout();

    }

  }, [proceedToCheckout, resetAuthModal, authReason]);



  const handleEmailSubmit = async (e) => {

    e.preventDefault();

    if (!authForm.email.trim()) {

      setAuthError(t('auth.emailRequired') || 'Email is required.');

      return;

    }

    try {

      setAuthLoading(true);

      setAuthError('');

      const normalizedEmail = authForm.email.trim().toLowerCase();

      setAuthForm((prev) => ({ ...prev, email: normalizedEmail }));

      await apiService.getCustomerByEmail(normalizedEmail);

      setAuthStep('password');

    } catch (error) {

      if (error.response?.status === 404) {

        setAuthStep('signup');

        setAuthError('');

      } else {

        setAuthError(error.response?.data?.message || t('auth.emailCheckFailed') || 'Unable to verify email.');

      }

    } finally {

      setAuthLoading(false);

    }

  };



  const handlePasswordSubmit = async (e) => {

    e.preventDefault();

    if (!authForm.password) {

      setAuthError(t('auth.passwordRequired') || 'Password is required.');

      return;

    }

    try {

      setAuthLoading(true);

      setAuthError('');

      await loginUser({

        email: authForm.email.trim().toLowerCase(),

        password: authForm.password

      });

      

      // Fetch the user profile directly to avoid race condition with state updates

      // This ensures we have the user data before proceeding to checkout

      let userData = null;

      try {

        const profileResponse = await apiService.getProfile();

        userData = profileResponse?.data || profileResponse;

      } catch (profileError) {

        console.warn('Failed to fetch profile after login, will use state:', profileError);

        // If profile fetch fails, wait for state to update

        await new Promise(resolve => setTimeout(resolve, 500));

      }

      

      await handleAuthSuccess(userData);

    } catch (error) {

      setAuthError(error.response?.data?.message || t('auth.invalidCredentials') || 'Invalid email or password.');

    } finally {

      setAuthLoading(false);

    }

  };



  const handleSignupSubmit = async (e) => {

    e.preventDefault();

    if (!authForm.firstName || !authForm.lastName) {

      setAuthError(t('auth.nameRequired') || 'First and last name are required.');

      return;

    }

    if (!authForm.password) {

      setAuthError(t('auth.passwordRequired') || 'Password is required.');

      return;

    }

    if (authForm.password !== authForm.confirmPassword) {

      setAuthError(t('auth.passwordMismatch') || 'Passwords do not match.');

      return;

    }



    try {

      setAuthLoading(true);

      setAuthError('');

      await registerUser({

        email: authForm.email.trim().toLowerCase(),

        password: authForm.password,

        firstName: authForm.firstName,

        lastName: authForm.lastName

      });

      

      // Fetch the user profile directly to avoid race condition with state updates

      let userData = null;

      try {

        const profileResponse = await apiService.getProfile();

        userData = profileResponse?.data || profileResponse;

      } catch (profileError) {

        console.warn('Failed to fetch profile after registration, will use state:', profileError);

        // If profile fetch fails, wait for state to update

        await new Promise(resolve => setTimeout(resolve, 500));

      }

      

      await handleAuthSuccess(userData);

    } catch (error) {

      setAuthError(error.response?.data?.message || t('auth.registrationFailed') || 'Unable to create account.');

    } finally {

      setAuthLoading(false);

    }

  };



  const handleSubmit = async (e) => {

    e.preventDefault();



    if (checkoutLoading) return;



    if (!companyId) {

      toast.error('Booking is not available. Please access via a company subdomain.');

      navigate('/');

      return;

    }



    if (!isAuthenticated) {

      openAuthModal();

      return;

    }



    await proceedToCheckout();

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



  return (

    <>

      <div className="min-h-screen bg-gray-50 py-8">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <Link to="/" className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6">

            <ArrowLeft className="h-5 w-5 mr-2" />

            {t('bookPage.backToHome')}

          </Link>



          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-8">

            <div className="space-y-6">

              <div className="bg-white rounded-lg shadow-md overflow-hidden">

                <div className="relative">

                  <img

                    src={modelImageSrc}

                    alt={`${make} ${model}`}

                    className="w-full h-64 object-cover"

                  />

                  <div className={`absolute top-3 right-3 ${availableVehiclesCount === 0 ? 'bg-red-600' : 'bg-blue-600'} text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg`}>

                    {availableVehiclesCount === 0 
                      ? t('bookPage.unavailable') || 'Unavailable'
                      : `${availableVehiclesCount} ${t('bookPage.availableCars') || 'available'}`
                    }

                  </div>

                </div>

                <div className="p-6 space-y-3">

                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">

                    {(make && model) ? `${make} ${model}` : t('bookPage.selectedVehicleLabel', 'Selected Vehicle')}

                  </p>

                  <h1 className="text-3xl font-bold text-gray-900">

                    {t('bookPage.bookModel', { make, model })}

                  </h1>

                  {modelDailyRate > 0 && (

                    <p className="text-xl font-semibold text-blue-600">

                      {formatPrice(modelDailyRate)} / {t('vehicles.day')}

                    </p>

                  )}

                  {modelCategory && (

                    <p className="text-sm font-semibold uppercase text-gray-700">

                      {modelCategory}

                    </p>

                  )}

                  {modelDescription ? (

                    <p className="text-gray-600">{modelDescription}</p>

                  ) : null}

                </div>

              </div>



              <div className="bg-white rounded-lg shadow-md p-6">

                <h2 className="text-lg font-semibold text-gray-900 mb-3">

                  {t('bookPage.driverLicenseInformation')}

                </h2>

                <p className="text-sm text-gray-600 mb-4">

                  {t('bookPage.driverLicenseHelper', 'Manage your driver license details before checkout.')}

                </p>

                <button

                  onClick={() => {

                    if (!isAuthenticated) {

                      openAuthModal('license');

                      return;

                    }

                    setIsLicenseModalOpen(true);

                  }}

                  className="w-full btn-outline flex items-center justify-center gap-2"

                >

                  <CreditCard className="h-5 w-5" />

                  {isAuthenticated 

                    ? (customerLicense ? t('bookPage.driverLicenseInformation') : t('bookPage.createLicenseInformation'))

                    : t('bookPage.driverLicenseInformation')}

                </button>

              </div>

            </div>



            <div className="space-y-6">

              <div className="bg-white rounded-lg shadow-md p-6 lg:sticky lg:top-8">

                <h2 className="text-lg font-semibold text-gray-900 mb-4">

                  {t('bookPage.bookingDetails')}

                </h2>

                

                <div className="mb-6">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

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

                          min={todayStr}

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

                          min={formData.pickupDate || todayStr}

                          required

                          placeholder="mm/dd/yyyy"

                          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"

                        />

                      </div>

                    </div>

                  </div>

                </div>

                {/* Location Dropdown - Show only if multiple locations */}
                {showLocationDropdown && (
                  <div className="mb-6">
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
                      required
                    >
                      <option value="">{t('booking.chooseLocation') || 'Choose a location'}</option>
                      {companyLocations.map((location) => {
                        const locationId = location.locationId || location.LocationId || location.id || location.Id;
                        const locationName = location.locationName || location.location_name || location.LocationName || '';
                        return (
                          <option key={locationId} value={locationId}>
                            {locationName}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}



                {selectedVehicle ? (

                  <form onSubmit={handleSubmit} className="space-y-4">



                    {modelDailyRate > 0 && (

                      <div className="mb-4">

                        <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">

                          {formatPrice(modelDailyRate)} / {t('vehicles.day')}

                        </p>

                        <h3 className="text-md font-semibold text-gray-900 mb-1">

                          {t('bookPage.ratePerDayTitle', 'Rate per Day')}

                        </h3>

                        <p className="text-sm text-gray-500 mb-3">

                          {t('bookPage.additionalOptions')}

                        </p>



                        {additionalOptions.length > 0 ? (

                          <div className="space-y-2">

                            {additionalOptions.map((service) => {

                              const serviceId = service.additionalServiceId || service.AdditionalServiceId;

                              const isSelected = selectedServices.some(s => s.id === serviceId);

                              const isMandatory = service.serviceIsMandatory || service.ServiceIsMandatory;



                              return (

                                <label

                                  key={serviceId}

                                  className="flex items-center gap-3 text-gray-700"

                                >

                                  <input

                                    type="checkbox"

                                    checked={isSelected || isMandatory}

                                    onChange={() => !isMandatory && handleServiceToggle(service)}

                                    disabled={isMandatory}

                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"

                                  />

                                  <span>

                                    {service.serviceName || service.ServiceName}:{' '}

                                    {formatPrice(service.servicePrice || service.ServicePrice || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / {t('vehicles.day') || 'day'}.

                                  </span>

                                </label>

                              );

                            })}

                          </div>

                        ) : (

                          <p className="text-gray-500">

                            {t('bookPage.noAdditionalOptions')}

                          </p>

                        )}

                      </div>

                    )}



                    {formData.pickupDate && formData.returnDate && (

                      <div className="bg-gray-50 p-4 rounded-lg">

                        <div className="flex justify-between items-center">

                          <span className="text-gray-600">

                            {Math.max(1, Math.ceil((new Date(formData.returnDate) - new Date(formData.pickupDate)) / (1000 * 60 * 60 * 24)) + 1)} {t('bookPage.days')}

                          </span>

                          <span className="text-xl font-bold text-blue-600">

                            {formatPrice(calculateGrandTotal())}

                          </span>

                        </div>

                      </div>

                    )}



                    <div className="border-t border-gray-200 pt-4">

                      <div className="flex justify-between items-center mb-4">

                        <span className="text-sm font-semibold text-gray-900">

                          {t('bookPage.totalLabel', 'Total')}

                        </span>

                        <span className="text-xl font-bold text-blue-600">

                          {formatPrice(calculateGrandTotal())}

                        </span>

                      </div>

                    </div>



                    <button

                      type="submit"

                      className="w-full btn-primary py-3 text-lg"

                      disabled={checkoutLoading || availableVehiclesCount === 0}

                      title={availableVehiclesCount === 0 ? t('bookPage.unavailable') || 'Unavailable' : ''}

                    >

                      {checkoutLoading

                        ? t('bookPage.processingPayment', 'Processing...')

                        : t('bookPage.completeBooking')}

                    </button>



                    {availableVehiclesCount === 0 && (

                      <p className="text-sm text-center text-red-600 mt-2 font-semibold">

                        {t('bookPage.noVehiclesAvailable') || 'No vehicles available for the selected dates and location'}

                      </p>

                    )}



                    {!isAuthenticated && (

                      <p className="text-sm text-center text-gray-600 mt-2">

                        <Link to="/login" className="text-blue-600 hover:underline">

                          {t('bookPage.login')}

                        </Link>{' '}

                        {t('bookPage.signInToComplete')}

                      </p>

                    )}

                  </form>

                ) : null}

              </div>

            </div>

          </div>



          {/* Driver License Modal */}

          {isLicenseModalOpen && (

            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

              <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">

                {/* Header with title and buttons */}

                <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">

                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">

                    <CreditCard className="h-6 w-6 mr-2" />

                    {t('bookPage.driverLicenseInformation')}

                  </h2>

                  <div className="flex items-center gap-2">

                    {(companyConfig?.blinkKey || companyConfig?.BlinkKey || process.env.REACT_APP_BLINKID_LICENSE_KEY) && (

                    <button

                      type="button"

                      onClick={(e) => {

                        console.log('[QR Code] ========== BUTTON CLICKED ==========');

                        e.preventDefault();

                        e.stopPropagation();

                        handleScanOnPhone();

                      }}

                      className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-2 rounded shadow-md"

                      title={t('bookPage.scanOnPhoneViaQr')}

                    >

                      {t('bookPage.scanOnPhone')}

                    </button>

                    )}

                    <button

                      onClick={() => {

                        setIsLicenseModalOpen(false);

                      }}

                      className="text-gray-400 hover:text-gray-600 transition-colors"

                    >

                      <X className="h-6 w-6" />

                    </button>

                  </div>

                </div>



                <div className="p-6">

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

                    list="country-issued-options"

                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                  />

                  <datalist id="country-issued-options">

                    {countryOptions.map(({ code, name }) => (

                      <option key={code} value={name} />

                    ))}

                  </datalist>

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

                </div>

              </div>

            </div>

          )}

        </div>

      </div>



      {authModalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">

          <div className="absolute inset-0 bg-black/50" onClick={handleCloseAuthModal} />

          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

            <button

              type="button"

              onClick={handleCloseAuthModal}

              className="absolute right-4 top-4 rounded-full p-2 text-gray-500 hover:bg-gray-100"

              disabled={authLoading || checkoutLoading}

            >

              <X className="h-5 w-5" />

            </button>



            <div className="space-y-5">

              <div>

                <h3 className="text-xl font-semibold text-gray-900">

                  {authStep === 'email' && t('modal.enterEmail', 'Enter your email to continue')}

                  {authStep === 'password' && t('modal.enterPassword', 'Enter your password')}

                  {authStep === 'signup' && t('modal.createAccount', 'Create your account')}

                </h3>

                <p className="mt-1 text-sm text-gray-600">

                  {authStep === 'email' && t('modal.emailSubtitle', 'We will check if you already have an account.')}

                  {authStep === 'password' && t('modal.passwordSubtitle', 'Sign in to continue to payment.')}

                  {authStep === 'signup' && t('modal.signupSubtitle', 'Quickly create an account to finish your booking.')}

                </p>

              </div>



              {authError && (

                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">

                  {authError}

                </div>

              )}



              {authStep === 'email' && (

                <form className="space-y-4" onSubmit={handleEmailSubmit}>

                  <label className="text-sm font-medium text-gray-700">

                    {t('modal.email', 'Email')}

                  </label>

                  <div className="flex items-center rounded-lg border border-gray-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">

                    <Mail className="mr-2 h-4 w-4 text-gray-400" />

                    <input

                      ref={emailInputRef}

                      type="email"

                      name="email"

                      value={authForm.email}

                      onChange={handleAuthInputChange}

                      className="w-full border-none text-gray-900 outline-none"

                      placeholder="you@example.com"

                      autoComplete="email"

                      required

                      disabled={authLoading}

                    />

                  </div>

                  <button

                    type="submit"

                    className="btn-primary w-full py-2"

                    disabled={authLoading}

                  >

                    {authLoading ? t('modal.checking', 'Checking...') : t('common.continue', 'Continue')}

                  </button>

                </form>

              )}



              {authStep === 'password' && (

                <form className="space-y-4" onSubmit={handlePasswordSubmit}>

                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">

                    {t('modal.signingInAs', 'Signing in as')} <span className="font-semibold">{authForm.email}</span>

                  </div>

                  <div className="flex items-center rounded-lg border border-gray-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">

                    <Lock className="mr-2 h-4 w-4 text-gray-400" />

                    <input

                      ref={passwordInputRef}

                      type="password"

                      name="password"

                      value={authForm.password}

                      onChange={handleAuthInputChange}

                      className="w-full border-none text-gray-900 outline-none"

                      placeholder={t('modal.passwordPlaceholder', 'Enter your password')}

                      autoComplete="current-password"

                      required

                      disabled={authLoading}

                    />

                  </div>

                  <div className="flex gap-3">

                    <button

                      type="button"

                      className="w-1/3 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"

                      onClick={() => {

                        setAuthStep('email');

                        setAuthError('');

                        setAuthForm((prev) => ({ ...prev, password: '' }));

                      }}

                      disabled={authLoading}

                    >

                      {t('common.back', 'Back')}

                    </button>

                    <button

                      type="submit"

                      className="w-2/3 btn-primary py-2"

                      disabled={authLoading}

                    >

                      {authLoading ? t('modal.signingIn', 'Signing in...') : t('modal.continueToPayment', 'Continue to payment')}

                    </button>

                  </div>

                </form>

              )}



              {authStep === 'signup' && (

                <form className="space-y-4" onSubmit={handleSignupSubmit}>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                    <div>

                      <label className="text-sm font-medium text-gray-700">

                        {t('modal.firstName', 'First name')}

                      </label>

                      <div className="flex items-center rounded-lg border border-gray-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">

                        <UserIcon className="mr-2 h-4 w-4 text-gray-400" />

                        <input

                          type="text"

                          name="firstName"

                          value={authForm.firstName}

                          onChange={handleAuthInputChange}

                          className="w-full border-none text-gray-900 outline-none"

                          placeholder="John"

                          autoComplete="given-name"

                          required

                          disabled={authLoading}

                        />

                      </div>

                    </div>

                    <div>

                      <label className="text-sm font-medium text-gray-700">

                        {t('modal.lastName', 'Last name')}

                      </label>

                      <div className="flex items-center rounded-lg border border-gray-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">

                        <UserIcon className="mr-2 h-4 w-4 text-gray-400" />

                        <input

                          type="text"

                          name="lastName"

                          value={authForm.lastName}

                          onChange={handleAuthInputChange}

                          className="w-full border-none text-gray-900 outline-none"

                          placeholder="Doe"

                          autoComplete="family-name"

                          required

                          disabled={authLoading}

                        />

                      </div>

                    </div>

                  </div>



                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">

                    {t('modal.creatingForEmail', 'Creating account for')} <span className="font-semibold">{authForm.email}</span>

                  </div>



                  <div className="space-y-3">

                    <div className="flex items-center rounded-lg border border-gray-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">

                      <Lock className="mr-2 h-4 w-4 text-gray-400" />

                      <input

                        type="password"

                        name="password"

                        value={authForm.password}

                        onChange={handleAuthInputChange}

                        className="w-full border-none text-gray-900 outline-none"

                        placeholder={t('modal.passwordPlaceholder', 'Enter your password')}

                        autoComplete="new-password"

                        required

                        disabled={authLoading}

                      />

                    </div>

                    <div className="flex items-center rounded-lg border border-gray-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">

                      <Lock className="mr-2 h-4 w-4 text-gray-400" />

                      <input

                        type="password"

                        name="confirmPassword"

                        value={authForm.confirmPassword}

                        onChange={handleAuthInputChange}

                        className="w-full border-none text-gray-900 outline-none"

                        placeholder={t('modal.confirmPasswordPlaceholder', 'Confirm password')}

                        autoComplete="new-password"

                        required

                        disabled={authLoading}

                      />

                    </div>

                  </div>



                  <div className="flex gap-3">

                    <button

                      type="button"

                      className="w-1/3 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"

                      onClick={() => {

                        setAuthStep('email');

                        setAuthError('');

                        setAuthForm((prev) => ({ ...prev, firstName: '', lastName: '', password: '', confirmPassword: '' }));

                      }}

                      disabled={authLoading}

                    >

                      {t('common.back', 'Back')}

                    </button>

                    <button

                      type="submit"

                      className="w-2/3 btn-primary py-2"

                      disabled={authLoading}

                    >

                      {authLoading ? t('modal.creatingAccount', 'Creating account...') : t('modal.signUpAndPay', 'Sign up & continue')}

                    </button>

                  </div>

                </form>

              )}

            </div>

          </div>

        </div>

      )}



      {/* QR Modal - at root level for proper rendering */}

      {qrOpen && (

        <div 

          data-qr-modal="true"

          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" 

          style={{ zIndex: 9999 }}

          onClick={() => {

            console.log('[QR Code] Modal backdrop clicked, closing');

            setQrOpen(false);

          }}

        >

          <div className="bg-white rounded-lg p-4 w-80 text-center max-w-[90vw] max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>

            <div className="text-lg font-semibold mb-2">{t('bookPage.scanOnYourPhone')}</div>

            {qrUrl ? (

              <>

                <img

                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}

                  alt="QR Code"

                  className="mx-auto mb-2"

                  onError={(e) => {

                    console.error('[QR Code] Failed to load QR code image');

                    e.target.style.display = 'none';

                  }}

                />

                <div className="text-xs break-all text-gray-600 mb-3">{qrUrl}</div>

              </>

            ) : (

              <div className="text-sm text-gray-500 mb-3">Loading QR code...</div>

            )}

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

                  onClick={()=>{ localStorage.setItem('qrPublicBaseUrl', qrBase); }}

                  className="flex-1 bg-blue-600 text-white py-1 rounded text-sm"

                >{t('common.save')}</button>

                <button

                  onClick={async ()=>{

                    const origin = (qrBase || window.location.origin).replace(/^http:/, 'https:').replace(/\/$/, '');

                    const returnTo = window.location.pathname + window.location.search;

                    let token = null;

                    if (isAuthenticated) {

                      try {

                        const tokenResponse = await fetch('/api/auth/session-token', {

                          method: 'GET',

                          credentials: 'include',

                          headers: {

                            'Accept': 'application/json',

                            'Content-Type': 'application/json'

                          }

                        });

                        if (tokenResponse.ok) {

                          const data = await tokenResponse.json();

                          token = data?.token || data?.data?.token;

                        }

                      } catch (error) {

                        console.warn('Failed to get token from session:', error);

                      }

                    }

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

    </>

  );

};



export default BookPage;
