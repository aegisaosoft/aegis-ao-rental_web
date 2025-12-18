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

import { Car, ArrowLeft, CreditCard, X, Calendar, Mail, Lock, User as UserIcon, UserPlus, Check, ArrowRight, QrCode, Camera } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

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

  const { user, isAuthenticated, login: loginUser, register: registerUser, restoreUser } = useAuth();

  const queryClient = useQueryClient();



  // Get filters from URL

  const { companyConfig, formatPrice } = useCompany();

  // Priority: domain context only (no fallback)
  const companyId = companyConfig?.id || null;

  // Check if Stripe account exists for this company (public endpoint, no auth required)
  // This is used to determine if booking button should be available
  const { data: stripeAccountCheck, isLoading: isLoadingStripe } = useQuery(
    ['stripeAccountCheck', companyId],
    async () => {
      if (!companyId) {
        console.log('[BookPage] No companyId, skipping Stripe account check');
        return null;
      }
      
      try {
        console.log('[BookPage] Checking Stripe account for company:', companyId);
        const response = await apiService.checkStripeAccount(companyId);
        const responseData = response?.data || response;
        const checkData = responseData?.result || responseData;
        
        console.log('[BookPage] Stripe account check received:', {
          hasStripeAccount: checkData?.hasStripeAccount,
          fullResponse: checkData
        });
        
        return checkData;
      } catch (error) {
        console.error('[BookPage] Error checking Stripe account:', {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data
        });
        // Return false if error (assume no account)
        return { hasStripeAccount: false };
      }
    },
    {
      enabled: !!companyId,
      retry: false,
      refetchOnWindowFocus: false
    }
  );

  // Check if booking is available (requires Stripe account)
  // Use the public check-account endpoint result
  const isBookingAvailable = stripeAccountCheck?.hasStripeAccount === true;
  
  console.log('[BookPage] Booking availability check:', {
    isBookingAvailable,
    hasStripeAccount: stripeAccountCheck?.hasStripeAccount,
    isLoadingStripe
  });

  const categoryId = searchParams.get('category');

  const make = searchParams.get('make');

  const model = searchParams.get('model');



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

  // Wizard state for Create User
  const [isCreateUserWizardOpen, setIsCreateUserWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardFormData, setWizardFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    driverLicenseFront: null,
    driverLicenseBack: null,
  });
  const [wizardImagePreviews, setWizardImagePreviews] = useState({
    driverLicenseFront: null,
    driverLicenseBack: null,
  });
  const [uploadedLicenseImages, setUploadedLicenseImages] = useState({
    front: null,
    back: null,
  });
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardError, setWizardError] = useState('');
  const [showWizardQRCode, setShowWizardQRCode] = useState(false);
  const [wizardQRUrl, setWizardQRUrl] = useState('');
  
  // Mobile detection
  const isMobile = React.useMemo(() => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }, []);

  

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

  // Handle Stripe Checkout return - restore session if lost
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isStripeReturn = urlParams.get('session_id') !== null || // Stripe Checkout returns session_id
                          urlParams.get('booking') !== null; // Our success URL includes booking param
    
    // Also check if we have the stripeRedirect flag
    const wasStripeRedirect = sessionStorage.getItem('stripeRedirect') === 'true';
    
    if (isStripeReturn || wasStripeRedirect) {
      // Clear the flag
      sessionStorage.removeItem('stripeRedirect');
      sessionStorage.removeItem('stripeRedirectTime');
      
      // Always restore user data (including role) after Stripe redirect
      const restoreSession = async () => {
        try {
          // Always get profile to restore user data (including role) in AuthContext
          const profileResponse = await apiService.getProfile();
          const userData = profileResponse.data;
          
          // Restore user data in AuthContext - this ensures role and all user info is current
          if (userData) {
            restoreUser(userData);
            console.log('[BookPage] ✅ User data restored after Stripe return, role:', userData.role);
          }
        } catch (error) {
          if (error.response?.status === 401) {
            console.error('[BookPage] ❌ Session lost after Stripe redirect');
            
            // Try to restore from sessionStorage backup
            const storedUserData = sessionStorage.getItem('stripeUserBackup');
            if (storedUserData) {
              try {
                const userData = JSON.parse(storedUserData);
                console.log('[BookPage] Found user data backup, role:', userData.role);
                // User data will be restored when they log in again via auth modal
              } catch (parseError) {
                console.error('[BookPage] Failed to parse stored user data:', parseError);
              }
            }
            
            toast.error(t('bookPage.sessionExpired', 'Your session expired. Please sign in again.'));
            // Open auth modal to allow user to log back in
            setAuthModalOpen(true);
          }
        }
      };
      
      restoreSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

            console.warn('[QR Code] /session-token failed:', err.message);

            // NO fallback to profile endpoint - if /session-token fails, token is not available
            // This is acceptable - QR code can be generated without token if needed
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
    // User must be authenticated to proceed
    const currentUser = overrideUser || user;
    // If overrideUser is provided (from login/register), skip isAuthenticated check
    // since the user just authenticated and state might not be updated yet
    if (!currentUser || (!overrideUser && !isAuthenticated)) {
      toast.error('Please authenticate to continue with booking.');
      return;
    }

    // Check if booking is available (Stripe account must exist)
    if (!isBookingAvailable) {
      toast.error('Booking is currently unavailable. Please contact the company for assistance.');
      return;
    }

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

        // Store flag and user data backup before redirecting to Stripe (for session restoration on return)
        sessionStorage.setItem('stripeRedirect', 'true');
        sessionStorage.setItem('stripeRedirectTime', Date.now().toString());
        
        // Store user data (including role) as backup in case session is lost
        if (user) {
          sessionStorage.setItem('stripeUserBackup', JSON.stringify({
            id: user.id || user.customerId || user.customer_id,
            email: user.email,
            role: user.role,
            companyId: user.companyId || user.CompanyId,
            firstName: user.firstName,
            lastName: user.lastName
          }));
        }

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

    selectedLocationId,

    isAuthenticated,

    isBookingAvailable

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

      const loginResponse = await loginUser({

        email: authForm.email.trim().toLowerCase(),

        password: authForm.password

      });

      

      // Use user data directly from login response - NO profile call needed
      // User data is already in login response and stored in session
      const userData = loginResponse?.result?.user || loginResponse?.user || null;

      if (!userData) {
        console.error('[BookPage] ❌ No user data in login response');
        throw new Error('Login response missing user data');
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

      const registerResponse = await registerUser({

        email: authForm.email.trim().toLowerCase(),

        password: authForm.password,

        firstName: authForm.firstName,

        lastName: authForm.lastName

      });

      

      // Use user data directly from register response - NO profile call needed
      // User data is already in register response and stored in session
      const userData = registerResponse?.result?.user || registerResponse?.user || null;

      if (!userData) {
        console.error('[BookPage] ❌ No user data in register response');
        throw new Error('Register response missing user data');
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

  // Wizard handlers
  const handleWizardInputChange = (e) => {
    const { name, value } = e.target;
    setWizardFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setWizardError('');
  };

  const handleWizardFileChange = (e, fieldName) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!file.type.startsWith('image/')) {
        setWizardError(t('bookPage.invalidImageFile', 'Please upload an image file'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setWizardError(t('bookPage.fileTooLarge', 'File size must be less than 5MB'));
        return;
      }
      setWizardFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));
      const previewUrl = URL.createObjectURL(file);
      const previewKey = fieldName === 'driverLicenseFront' ? 'driverLicenseFront' : 'driverLicenseBack';
      setWizardImagePreviews(prev => ({
        ...prev,
        [previewKey]: previewUrl
      }));
      setWizardError('');
    }
  };

  const removeWizardImage = (fieldName) => {
    setWizardFormData(prev => ({
      ...prev,
      [fieldName]: null
    }));
    const previewKey = fieldName === 'driverLicenseFront' ? 'driverLicenseFront' : 'driverLicenseBack';
    if (wizardImagePreviews[previewKey]) {
      URL.revokeObjectURL(wizardImagePreviews[previewKey]);
    }
    setWizardImagePreviews(prev => ({
      ...prev,
      [previewKey]: null
    }));
  };

  const handleDeleteWizardImage = async (side) => {
    const currentWizardId = searchParams.get('wizardId');
    
    // Check if it's a server-uploaded image (uploadedLicenseImages) or local preview (wizardImagePreviews)
    const isServerImage = side === 'front' ? uploadedLicenseImages.front : uploadedLicenseImages.back;
    const isLocalPreview = side === 'front' ? wizardImagePreviews.driverLicenseFront : wizardImagePreviews.driverLicenseBack;
    
    try {
      // If it's a server image and we have wizardId, delete from server
      if (isServerImage && currentWizardId) {
        await apiService.deleteWizardLicenseImage(currentWizardId, side);
        
        // Trigger refresh event for booking page
        try {
          const channel = new BroadcastChannel('license_images_channel');
          channel.postMessage({ type: 'wizardImageDeleted', side, wizardId: currentWizardId });
          channel.close();
        } catch (e) {
          console.log('BroadcastChannel not available:', e);
        }
        
        // Clear from uploadedLicenseImages
        setUploadedLicenseImages(prev => ({
          ...prev,
          [side]: null
        }));
        
        toast.success(
          side === 'front'
            ? t('bookPage.frontPhotoDeleted', 'Front photo deleted successfully')
            : t('bookPage.backPhotoDeleted', 'Back photo deleted successfully')
        );
      } else if (isLocalPreview) {
        // If it's a local preview, just remove it
        const fieldName = side === 'front' ? 'driverLicenseFront' : 'driverLicenseBack';
        removeWizardImage(fieldName);
        toast.success(
          side === 'front'
            ? t('bookPage.frontPhotoRemoved', 'Front photo removed')
            : t('bookPage.backPhotoRemoved', 'Back photo removed')
        );
      }
    } catch (err) {
      console.error(`Error deleting ${side} image:`, err);
      const errorMessage = err.response?.data?.message || err.response?.data?.result?.message || err.message || t('bookPage.deleteError', 'Failed to delete image. Please try again.');
      toast.error(errorMessage);
    }
  };

  const handleWizardNext = () => {
    if (wizardStep === 2) {
      // Validate personal information
      if (!wizardFormData.firstName.trim()) {
        setWizardError(t('bookPage.firstNameRequired', 'First Name is required'));
        return;
      }
      if (!wizardFormData.lastName.trim()) {
        setWizardError(t('bookPage.lastNameRequired', 'Last Name is required'));
        return;
      }
      if (!wizardFormData.email.trim()) {
        setWizardError(t('bookPage.emailRequired', 'Email is required'));
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(wizardFormData.email)) {
        setWizardError(t('bookPage.invalidEmail', 'Please enter a valid email address'));
        return;
      }
      if (!wizardFormData.phoneNumber.trim()) {
        setWizardError(t('bookPage.phoneRequired', 'Phone Number is required'));
        return;
      }
      if (!wizardFormData.password) {
        setWizardError(t('bookPage.passwordRequired', 'Password is required'));
        return;
      }
      if (wizardFormData.password !== wizardFormData.confirmPassword) {
        setWizardError(t('bookPage.passwordMismatch', 'Passwords do not match'));
        return;
      }
    }
    if (wizardStep === 3) {
      // Validate driver license images
      if (!wizardFormData.driverLicenseFront) {
        setWizardError(t('bookPage.driverLicenseFrontRequired', 'Driver License Front Image is required'));
        return;
      }
      if (!wizardFormData.driverLicenseBack) {
        setWizardError(t('bookPage.driverLicenseBackRequired', 'Driver License Back Image is required'));
        return;
      }
    }
    setWizardStep(wizardStep + 1);
    setWizardError('');
  };

  const handleWizardPrevious = () => {
    setWizardStep(wizardStep - 1);
    setWizardError('');
  };

  const handleWizardSubmit = async (e) => {
    e.preventDefault();
    try {
      setWizardLoading(true);
      setWizardError('');

      // Register user
      const registerResponse = await registerUser({
        email: wizardFormData.email.trim().toLowerCase(),
        password: wizardFormData.password,
        firstName: wizardFormData.firstName.trim(),
        lastName: wizardFormData.lastName.trim()
      });

      const userData = registerResponse?.result?.user || registerResponse?.user || null;
      if (!userData) {
        throw new Error('Register response missing user data');
      }

      await handleAuthSuccess(userData);
      
      // Get customer ID from registered user
      const registeredCustomerId = userData?.customerId || userData?.id || userData?.userId || userData?.Id || userData?.UserId || userData?.sub || userData?.nameidentifier || '';
      
      // Upload driver license images if we have them
      if (registeredCustomerId && (wizardFormData.driverLicenseFront || wizardFormData.driverLicenseBack)) {
        try {
          if (wizardFormData.driverLicenseFront) {
            await apiService.uploadCustomerLicenseImage(
              registeredCustomerId,
              'front',
              wizardFormData.driverLicenseFront
            );
            toast.success(t('bookPage.frontPhotoSaved', 'Front photo saved!'));
          }
          if (wizardFormData.driverLicenseBack) {
            await apiService.uploadCustomerLicenseImage(
              registeredCustomerId,
              'back',
              wizardFormData.driverLicenseBack
            );
            toast.success(t('bookPage.backPhotoSaved', 'Back photo saved!'));
          }
        } catch (uploadError) {
          console.error('Error uploading license images:', uploadError);
          // Don't fail the registration if image upload fails, just log it
          toast.warning(t('bookPage.licenseUploadWarning', 'Account created but license images could not be uploaded. You can add them later.'));
        }
      }
      
      setIsCreateUserWizardOpen(false);
      setWizardStep(1);
      setWizardFormData({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        driverLicenseFront: null,
        driverLicenseBack: null,
      });
      
      // Clean up image previews
      if (wizardImagePreviews.driverLicenseFront) {
        URL.revokeObjectURL(wizardImagePreviews.driverLicenseFront);
      }
      if (wizardImagePreviews.driverLicenseBack) {
        URL.revokeObjectURL(wizardImagePreviews.driverLicenseBack);
      }
      setWizardImagePreviews({
        driverLicenseFront: null,
        driverLicenseBack: null,
      });
    } catch (error) {
      setWizardError(error.response?.data?.message || t('auth.registrationFailed') || 'Unable to create account.');
    } finally {
      setWizardLoading(false);
    }
  };

  const handleCloseWizard = () => {
    if (wizardLoading) return;
    setIsCreateUserWizardOpen(false);
    setWizardStep(1);
    setWizardError('');
    setShowWizardQRCode(false);
    setWizardFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      driverLicenseFront: null,
      driverLicenseBack: null,
    });
    // Clean up image previews
    if (wizardImagePreviews.driverLicenseFront) {
      URL.revokeObjectURL(wizardImagePreviews.driverLicenseFront);
    }
    if (wizardImagePreviews.driverLicenseBack) {
      URL.revokeObjectURL(wizardImagePreviews.driverLicenseBack);
    }
    setWizardImagePreviews({
      driverLicenseFront: null,
      driverLicenseBack: null,
    });
  };

  const handleShowWizardQRCode = () => {
    // Generate QR code URL for mobile camera upload
    const origin = window.location.origin;
    const wizardId = `wizard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get customer ID from user if available (user might have registered already)
    const customerId = user?.customerId || user?.id || user?.userId || user?.Id || user?.UserId || user?.sub || user?.nameidentifier || '';
    
    // Store wizard form data temporarily in sessionStorage for mobile page to retrieve
    sessionStorage.setItem(`wizardData-${wizardId}`, JSON.stringify({
      email: wizardFormData.email,
      firstName: wizardFormData.firstName,
      lastName: wizardFormData.lastName,
      customerId: customerId,
    }));
    
    // Create URL to DriverLicensePhoto page
    let qrUrl = `${origin}/driver-license-photo?wizardId=${wizardId}&returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    if (customerId) {
      qrUrl += `&customerId=${encodeURIComponent(customerId)}`;
    }
    setWizardQRUrl(qrUrl);
    setShowWizardQRCode(true);
  };

  // Listen for messages from mobile page (when images are uploaded)
  React.useEffect(() => {
    if (!isCreateUserWizardOpen || wizardStep !== 3) return;

    const checkForWizardImages = () => {
      // Check all sessionStorage keys for wizard images
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('wizardImage-')) {
          try {
            const imageData = JSON.parse(sessionStorage.getItem(key));
            
            if (imageData.side === 'front' && !wizardImagePreviews.driverLicenseFront) {
              // Convert base64 to blob
              fetch(imageData.dataUrl)
                .then(res => res.blob())
                .then(blob => {
                  const file = new File([blob], 'driver-license-front.jpg', { type: 'image/jpeg' });
                  const previewUrl = URL.createObjectURL(file);
                  setWizardFormData(prev => ({ ...prev, driverLicenseFront: file }));
                  setWizardImagePreviews(prev => ({ ...prev, driverLicenseFront: previewUrl }));
                  sessionStorage.removeItem(key);
                  
                  // Trigger server image refresh after a short delay (to allow upload to complete)
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('refreshLicenseImages'));
                  }, 500);
                });
            } else if (imageData.side === 'back' && !wizardImagePreviews.driverLicenseBack) {
              fetch(imageData.dataUrl)
                .then(res => res.blob())
                .then(blob => {
                  const file = new File([blob], 'driver-license-back.jpg', { type: 'image/jpeg' });
                  const previewUrl = URL.createObjectURL(file);
                  setWizardFormData(prev => ({ ...prev, driverLicenseBack: file }));
                  setWizardImagePreviews(prev => ({ ...prev, driverLicenseBack: previewUrl }));
                  sessionStorage.removeItem(key);
                  
                  // Trigger server image refresh after a short delay (to allow upload to complete)
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('refreshLicenseImages'));
                  }, 500);
                });
            }
          } catch (e) {
            console.error('Error parsing wizard image data:', e);
          }
        }
      }
    };

    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith('wizardImage-')) {
        checkForWizardImages();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Check periodically (storage event doesn't fire in same tab/window)
    const interval = setInterval(checkForWizardImages, 1000);

    // Initial check
    checkForWizardImages();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [isCreateUserWizardOpen, wizardStep, wizardImagePreviews]);

  // Fetch uploaded license images from server
  React.useEffect(() => {
    const fetchUploadedImages = async () => {
      // Get customer ID from user or wizard data
      let customerId = null;
      
      if (user) {
        customerId = user?.customerId || user?.id || user?.userId || user?.Id || user?.UserId || user?.sub || user?.nameidentifier;
      }
      
      // Try to get from URL params
      const customerIdParam = searchParams.get('customerId');
      if (customerIdParam) {
        customerId = customerIdParam;
      }
      
      // Try to get wizardId from URL params first
      let currentWizardId = searchParams.get('wizardId');
      
      // If not in URL, try to get from sessionStorage (from most recent wizard)
      if (!currentWizardId) {
        try {
          // Find the most recent wizardId from sessionStorage
          let mostRecentWizardId = null;
          let mostRecentTimestamp = 0;
          
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('wizardData-')) {
              const wizardIdFromKey = key.replace('wizardData-', '');
              // Extract timestamp from wizardId (format: wizard-{timestamp}-{random})
              const match = wizardIdFromKey.match(/wizard-(\d+)-/);
              if (match) {
                const timestamp = parseInt(match[1], 10);
                if (timestamp > mostRecentTimestamp) {
                  mostRecentTimestamp = timestamp;
                  mostRecentWizardId = wizardIdFromKey;
                }
              }
            }
          }
          
          if (mostRecentWizardId) {
            currentWizardId = mostRecentWizardId;
            console.log('[BookPage] Found wizardId from sessionStorage:', currentWizardId);
          }
        } catch (e) {
          console.error('Error finding wizardId from sessionStorage:', e);
        }
      }
      
      // Try to get customerId from wizard data if we have a wizardId
      if (!customerId && currentWizardId) {
        try {
          const wizardData = sessionStorage.getItem(`wizardData-${currentWizardId}`);
          if (wizardData) {
            const data = JSON.parse(wizardData);
            customerId = data.customerId;
          }
        } catch (e) {
          console.error('Error reading wizard data:', e);
        }
      }

      // Also check all wizard data in sessionStorage for customerId
      if (!customerId) {
        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('wizardData-')) {
              try {
                const wizardData = JSON.parse(sessionStorage.getItem(key));
                if (wizardData?.customerId) {
                  customerId = wizardData.customerId;
                  break;
                }
              } catch (e) {
                // Skip invalid entries
              }
            }
          }
        } catch (e) {
          console.error('Error checking wizard data:', e);
        }
      }

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
      
      // Check if images exist by trying to load them
      const checkImageExists = (url) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = url + '?t=' + Date.now(); // Add cache buster
        });
      };

      if (customerId) {
        // Customer exists, check customer license images
        const frontUrl = `${backendBaseUrl}/customers/${customerId}/licenses/front.jpg`;
        const backUrl = `${backendBaseUrl}/customers/${customerId}/licenses/back.jpg`;

        const [frontExists, backExists] = await Promise.all([
          checkImageExists(frontUrl),
          checkImageExists(backUrl)
        ]);

        setUploadedLicenseImages({
          front: frontExists ? frontUrl : null,
          back: backExists ? backUrl : null,
        });
      } else if (currentWizardId) {
        // No customerId but have wizardId, check wizard temporary images
        // Sanitize wizardId (same as backend - replace invalid filename chars with underscore)
        // Backend uses: string.Join("_", wizardId.Split(Path.GetInvalidFileNameChars()))
        // Invalid filename chars: < > : " / \ | ? * and control chars
        // Note: C# Path.GetInvalidFileNameChars() includes: < > : " / \ | ? * and control chars (0x00-0x1F)
        // Use character class without control chars directly - match them using character codes
        const invalidChars = /[<>:"/\\|?*]/g;
        // Also remove control characters (0x00-0x1F) by filtering them out
        let sanitizedWizardId = currentWizardId.replace(invalidChars, '\0'); // Replace with null char first
        // Remove control characters (0x00-0x1F) by filtering
        sanitizedWizardId = sanitizedWizardId.split('').filter(char => {
          const code = char.charCodeAt(0);
          return code >= 32 || code === 0; // Keep space (32) and above, or null char (0) for splitting
        }).join('');
        // Split by null char and join with underscore (matching C# behavior)
        sanitizedWizardId = sanitizedWizardId.split('\0').filter(part => part.length > 0).join('_');
        const frontUrl = `${backendBaseUrl}/wizard/${sanitizedWizardId}/licenses/front.jpg`;
        const backUrl = `${backendBaseUrl}/wizard/${sanitizedWizardId}/licenses/back.jpg`;
        
        console.log('[BookPage] Checking wizard images:', {
          wizardId: currentWizardId,
          sanitizedWizardId: sanitizedWizardId,
          frontUrl: frontUrl,
          backUrl: backUrl,
          backendBaseUrl: backendBaseUrl
        });

        const [frontExists, backExists] = await Promise.all([
          checkImageExists(frontUrl),
          checkImageExists(backUrl)
        ]);

        setUploadedLicenseImages({
          front: frontExists ? frontUrl : null,
          back: backExists ? backUrl : null,
        });
      } else {
        // No customerId and no wizardId, clear images
        setUploadedLicenseImages({
          front: null,
          back: null,
        });
      }
    };

    // Only fetch if we're on step 3 (license photos step)
    if (wizardStep === 3) {
      // Immediate fetch
      fetchUploadedImages();
      
      // Listen for storage events (when mobile page uploads images)
      const handleStorageChange = (e) => {
        if (e.key && (e.key.startsWith('wizardImage-') || e.key.startsWith('wizardData-') || e.key === 'licenseImageUploaded')) {
          // Trigger immediate refresh when images are uploaded
          setTimeout(fetchUploadedImages, 100);
        }
      };
      
      // Listen for custom refresh event
      const handleRefreshEvent = () => {
        fetchUploadedImages();
      };
      
      // Listen for BroadcastChannel messages (cross-tab communication)
      let broadcastChannel = null;
      let wizardBroadcastChannel = null;
      try {
        broadcastChannel = new BroadcastChannel('license-upload');
        broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'imageUploaded') {
            // Immediate refresh when image is uploaded
            setTimeout(fetchUploadedImages, 100);
          }
        };
        
        // Also listen for wizard image uploads
        wizardBroadcastChannel = new BroadcastChannel('license_images_channel');
        wizardBroadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'wizardImageUploaded') {
            // Immediate refresh when wizard image is uploaded
            setTimeout(fetchUploadedImages, 100);
          }
        };
      } catch (e) {
        console.log('BroadcastChannel not available:', e);
      }
      
      // Check localStorage for upload flags
      const checkUploadFlags = () => {
        try {
          const flag = localStorage.getItem('licenseImageUploaded');
          if (flag) {
            const data = JSON.parse(flag);
            // Check if flag is recent (within last 10 seconds)
            if (Date.now() - data.timestamp < 10000) {
              fetchUploadedImages();
            }
            // Clear old flags
            if (Date.now() - data.timestamp > 30000) {
              localStorage.removeItem('licenseImageUploaded');
            }
          }
          
          // Also check for wizard upload flags
          const wizardFlag = localStorage.getItem('licenseImagesUploaded');
          if (wizardFlag) {
            const data = JSON.parse(wizardFlag);
            // Check if flag is recent (within last 10 seconds)
            if (Date.now() - data.timestamp < 10000) {
              fetchUploadedImages();
            }
            // Clear old flags
            if (Date.now() - data.timestamp > 30000) {
              localStorage.removeItem('licenseImagesUploaded');
            }
          }
        } catch (e) {
          // Ignore errors
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('refreshLicenseImages', handleRefreshEvent);
      
      // Check upload flags periodically
      const flagCheckInterval = setInterval(checkUploadFlags, 300);
      
      // Also check periodically for faster updates (every 500ms for immediate feedback)
      const interval = setInterval(fetchUploadedImages, 500);
      
      return () => {
        clearInterval(interval);
        clearInterval(flagCheckInterval);
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('refreshLicenseImages', handleRefreshEvent);
        if (broadcastChannel) {
          broadcastChannel.close();
        }
        if (wizardBroadcastChannel) {
          wizardBroadcastChannel.close();
        }
      };
    }
  }, [wizardStep, user, searchParams]);



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



              {/* Create User section - shown when not authenticated */}
              {!isAuthenticated && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    {t('bookPage.createAccount', 'Create Account')}
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    {t('bookPage.createAccountHelper', 'Please create an account to complete your booking.')}
                  </p>
                  <button
                    onClick={() => setIsCreateUserWizardOpen(true)}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                  >
                    <UserPlus className="h-5 w-5" />
                    {t('bookPage.createUser', 'Create User')}
                  </button>
                </div>
              )}

              {/* TEMPORARILY HIDDEN: Driver License Information form */}
              {false && (
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
              )}

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

                      disabled={checkoutLoading || availableVehiclesCount === 0 || !isAuthenticated}

                      title={
                        !isAuthenticated 
                          ? t('bookPage.createAccountHelper', 'Please create an account to complete your booking.')
                          : availableVehiclesCount === 0 
                            ? t('bookPage.unavailable') || 'Unavailable' 
                            : ''
                      }

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

      {/* Create User Wizard Modal */}
      {isCreateUserWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseWizard} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={handleCloseWizard}
              className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
              disabled={wizardLoading}
              title={t('common.close', 'Close')}
            >
              <X className="h-5 w-5" />
            </button>

            {/* Progress Indicator */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                {[1, 2, 3, 4].map((step) => (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        wizardStep === step 
                          ? 'bg-blue-600 text-white' 
                          : wizardStep > step 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 text-gray-600'
                      }`}>
                        {wizardStep > step ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          step
                        )}
                      </div>
                      <span className="mt-2 text-xs text-gray-600">
                        {step === 1 ? t('bookPage.wizardStep1', 'Welcome') :
                         step === 2 ? t('bookPage.wizardStep2', 'Personal Info') :
                         step === 3 ? t('bookPage.wizardStep3', 'License Photos') :
                         t('bookPage.wizardStep4', 'Confirm')}
                      </span>
                    </div>
                    {step < 4 && (
                      <div className={`flex-1 h-1 mx-2 ${
                        wizardStep > step ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <form onSubmit={handleWizardSubmit} className="p-6">
              {wizardError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {wizardError}
                </div>
              )}

              {/* Step 1: Welcome */}
              {wizardStep === 1 && (
                <div className="text-center py-8">
                  <div className="mb-6">
                    <UserPlus className="h-16 w-16 text-blue-600 mx-auto" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {t('bookPage.wizardWelcome', 'Welcome!')}
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {t('bookPage.wizardWelcomeText', 'Thank you for choosing our service. We\'re excited to have you on board!')}
                  </p>
                  <p className="text-gray-700 mb-6">
                    {t('bookPage.wizardWelcomeInstruction', 'Before you start, please prepare your driver\'s license. You\'ll need to take photos of both the front and back sides.')}
                  </p>
                  <div className="space-y-3 text-left max-w-md mx-auto">
                    <div className="flex items-center gap-3 text-gray-700">
                      <Check className="h-5 w-5 text-green-500" />
                      <span>{t('bookPage.wizardCheck1', 'Have your driver\'s license ready')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <Check className="h-5 w-5 text-green-500" />
                      <span>{t('bookPage.wizardCheck2', 'Ensure good lighting for photos')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <Check className="h-5 w-5 text-green-500" />
                      <span>{t('bookPage.wizardCheck3', 'This will only take 2-3 minutes')}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-center mt-8">
                    <button
                      type="button"
                      onClick={handleCloseWizard}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                      disabled={wizardLoading}
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleWizardNext}
                      className="btn-primary px-8 py-3 flex items-center gap-2"
                      disabled={wizardLoading}
                    >
                      {t('bookPage.getStarted', 'Get Started')}
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Personal Information */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {t('bookPage.personalInformation', 'Personal Information')}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('bookPage.firstName', 'First Name')} *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={wizardFormData.firstName}
                        onChange={handleWizardInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('bookPage.lastName', 'Last Name')} *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={wizardFormData.lastName}
                        onChange={handleWizardInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('bookPage.phoneNumber', 'Phone Number')} *
                      </label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={wizardFormData.phoneNumber}
                        onChange={handleWizardInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="(123) 456-7890"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('bookPage.email', 'Email')} *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={wizardFormData.email}
                        onChange={handleWizardInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('bookPage.password', 'Password')} *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={wizardFormData.password}
                      onChange={handleWizardInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('bookPage.confirmPassword', 'Confirm Password')} *
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={wizardFormData.confirmPassword}
                      onChange={handleWizardInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleWizardPrevious}
                      className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      disabled={wizardLoading}
                    >
                      <ArrowLeft className="h-4 w-4 inline mr-2" />
                      {t('common.back', 'Back')}
                    </button>
                    <button
                      type="button"
                      onClick={handleWizardNext}
                      className="flex-1 btn-primary py-2"
                      disabled={wizardLoading}
                    >
                      {t('common.next', 'Next')}
                      <ArrowRight className="h-4 w-4 inline ml-2" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Driver License Photos */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {t('bookPage.driverLicensePhotos', 'Driver License Photos')}
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {isMobile 
                      ? t('bookPage.driverLicensePhotosHelper', 'Please upload clear photos of both sides of your driver\'s license')
                      : t('bookPage.driverLicensePhotosHelperDesktop', 'Use your phone to take photos. Scan the QR code below or use the button to upload from your computer.')
                    }
                  </p>

                  {/* Display uploaded images from server or sessionStorage */}
                  {(uploadedLicenseImages.front || uploadedLicenseImages.back || wizardImagePreviews.driverLicenseFront || wizardImagePreviews.driverLicenseBack) && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-green-800 mb-3">
                        {t('bookPage.uploadedImages', 'Uploaded Images')}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(uploadedLicenseImages.front || wizardImagePreviews.driverLicenseFront) && (
                          <div>
                            <label className="block text-xs font-medium text-green-700 mb-2">
                              {t('bookPage.driverLicenseFront', 'Driver License Front')} ({t('bookPage.uploaded', 'Uploaded')})
                            </label>
                            <div className="relative">
                              <img 
                                src={uploadedLicenseImages.front || wizardImagePreviews.driverLicenseFront} 
                                alt="Uploaded driver license front" 
                                className="w-full h-48 object-cover rounded-lg border-2 border-green-500"
                              />
                              <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                                ✓ {t('bookPage.uploaded', 'Uploaded')}
                              </div>
                              <button
                                onClick={() => handleDeleteWizardImage('front')}
                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
                                title={t('bookPage.deletePhoto', 'Delete photo')}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                        {(uploadedLicenseImages.back || wizardImagePreviews.driverLicenseBack) && (
                          <div>
                            <label className="block text-xs font-medium text-green-700 mb-2">
                              {t('bookPage.driverLicenseBack', 'Driver License Back')} ({t('bookPage.uploaded', 'Uploaded')})
                            </label>
                            <div className="relative">
                              <img 
                                src={uploadedLicenseImages.back || wizardImagePreviews.driverLicenseBack} 
                                alt="Uploaded driver license back" 
                                className="w-full h-48 object-cover rounded-lg border-2 border-green-500"
                              />
                              <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                                ✓ {t('bookPage.uploaded', 'Uploaded')}
                              </div>
                              <button
                                onClick={() => handleDeleteWizardImage('back')}
                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
                                title={t('bookPage.deletePhoto', 'Delete photo')}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Only show file inputs if the corresponding image is not already uploaded (max 2 images: front and back) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Front image input - only show if front is not uploaded */}
                    {!(uploadedLicenseImages.front || wizardImagePreviews.driverLicenseFront) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('bookPage.driverLicenseFront', 'Driver License Front')} *
                      </label>
                      {wizardImagePreviews.driverLicenseFront ? (
                        <div className="relative">
                          <img 
                            src={wizardImagePreviews.driverLicenseFront} 
                            alt="Driver license front" 
                            className="w-full h-48 object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => removeWizardImage('driverLicenseFront')}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className={`block w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 flex items-center justify-center ${!isMobile ? 'bg-gray-50' : ''}`}>
                          <input
                            type="file"
                            accept="image/*"
                            capture={isMobile ? "environment" : undefined}
                            onChange={(e) => handleWizardFileChange(e, 'driverLicenseFront')}
                            className="hidden"
                          />
                          <div className="text-center">
                            {isMobile ? (
                              <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            ) : (
                              <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            )}
                            <span className="text-sm text-gray-600">{isMobile ? t('bookPage.takePhoto', 'Take Photo') : t('bookPage.chooseFile', 'Choose File')}</span>
                          </div>
                        </label>
                      )}
                    </div>
                    )}

                    {/* Back image input - only show if back is not uploaded */}
                    {!(uploadedLicenseImages.back || wizardImagePreviews.driverLicenseBack) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('bookPage.driverLicenseBack', 'Driver License Back')} *
                      </label>
                      {wizardImagePreviews.driverLicenseBack ? (
                        <div className="relative">
                          <img 
                            src={wizardImagePreviews.driverLicenseBack} 
                            alt="Driver license back" 
                            className="w-full h-48 object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => removeWizardImage('driverLicenseBack')}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className={`block w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 flex items-center justify-center ${!isMobile ? 'bg-gray-50' : ''}`}>
                          <input
                            type="file"
                            accept="image/*"
                            capture={isMobile ? "environment" : undefined}
                            onChange={(e) => handleWizardFileChange(e, 'driverLicenseBack')}
                            className="hidden"
                          />
                          <div className="text-center">
                            {isMobile ? (
                              <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            ) : (
                              <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            )}
                            <span className="text-sm text-gray-600">{isMobile ? t('bookPage.takePhoto', 'Take Photo') : t('bookPage.chooseFile', 'Choose File')}</span>
                          </div>
                        </label>
                      )}
                    </div>
                    )}
                  </div>

                  {/* Desktop QR Code Button */}
                  {!isMobile && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <button
                        type="button"
                        onClick={handleShowWizardQRCode}
                        className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                      >
                        <QrCode className="h-5 w-5" />
                        {t('bookPage.usePhoneCamera', 'Use Phone Camera')}
                      </button>
                      <p className="text-xs text-gray-600 mt-2 text-center">
                        {t('bookPage.qrCodeHelper', 'Scan QR code with your phone to take photos with your camera')}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleWizardPrevious}
                      className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      disabled={wizardLoading}
                    >
                      <ArrowLeft className="h-4 w-4 inline mr-2" />
                      {t('common.back', 'Back')}
                    </button>
                    <button
                      type="button"
                      onClick={handleWizardNext}
                      className="flex-1 btn-primary py-2"
                      disabled={wizardLoading}
                    >
                      {t('common.next', 'Next')}
                      <ArrowRight className="h-4 w-4 inline ml-2" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Confirmation */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {t('bookPage.confirmRegistration', 'Confirm Your Registration')}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {t('bookPage.confirmRegistrationText', 'Please review your information before submitting.')}
                  </p>

                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t('bookPage.firstName', 'First Name')}:</span>
                      <p className="text-gray-900">{wizardFormData.firstName}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t('bookPage.lastName', 'Last Name')}:</span>
                      <p className="text-gray-900">{wizardFormData.lastName}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t('bookPage.email', 'Email')}:</span>
                      <p className="text-gray-900">{wizardFormData.email}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t('bookPage.phoneNumber', 'Phone Number')}:</span>
                      <p className="text-gray-900">{wizardFormData.phoneNumber}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t('bookPage.driverLicenseFront', 'Driver License Front')}:</span>
                      {wizardImagePreviews.driverLicenseFront && (
                        <img 
                          src={wizardImagePreviews.driverLicenseFront} 
                          alt="Driver license front" 
                          className="mt-2 w-32 h-20 object-cover rounded border border-gray-300"
                        />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t('bookPage.driverLicenseBack', 'Driver License Back')}:</span>
                      {wizardImagePreviews.driverLicenseBack && (
                        <img 
                          src={wizardImagePreviews.driverLicenseBack} 
                          alt="Driver license back" 
                          className="mt-2 w-32 h-20 object-cover rounded border border-gray-300"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseWizard}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                      disabled={wizardLoading}
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleWizardPrevious}
                      className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      disabled={wizardLoading}
                    >
                      <ArrowLeft className="h-4 w-4 inline mr-2" />
                      {t('common.back', 'Back')}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 btn-primary py-2"
                      disabled={wizardLoading}
                    >
                      {wizardLoading ? (
                        <>
                          <span className="animate-spin inline-block mr-2">⟳</span>
                          {t('bookPage.creatingAccount', 'Creating Account...')}
                        </>
                      ) : (
                        <>
                          {t('bookPage.submitRegistration', 'Submit Registration')}
                          <Check className="h-4 w-4 inline ml-2" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Wizard QR Code Modal */}
      {showWizardQRCode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowWizardQRCode(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <button
              type="button"
              onClick={() => setShowWizardQRCode(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-gray-500 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('bookPage.scanQRCode', 'Scan QR Code')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('bookPage.scanQRCodeHelper', 'Scan this QR code with your phone to take photos with your camera')}
              </p>
              
              <div className="flex justify-center mb-4 p-4 bg-white rounded-lg border border-gray-200">
                <QRCodeSVG value={wizardQRUrl} size={256} level="M" includeMargin={true} />
              </div>
              
              <p className="text-xs text-gray-500 mb-4">
                {t('bookPage.qrCodeNote', 'Open your phone camera and point it at the QR code, or use a QR code scanner app')}
              </p>
              
              <a
                href={wizardQRUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {t('bookPage.openLinkDirectly', 'Or open link directly')}
              </a>
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
