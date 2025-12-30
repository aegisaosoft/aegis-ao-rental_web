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

import RentalAgreementModal from '../components/RentalAgreementModal';
import BookingWizard from '../components/BookingWizard';
import { useRentalAgreement } from '../hooks/useRentalAgreement';



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
  const { data: stripeAccountCheck } = useQuery(
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
  
  // Removed excessive logging - only log when value changes
  // console.log('[BookPage] Booking availability check:', {
  //   isBookingAvailable,
  //   hasStripeAccount: stripeAccountCheck?.hasStripeAccount,
  //   isLoadingStripe
  // });

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
  const [userSelectedLocation, setUserSelectedLocation] = useState(false);



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
  
  // Debug: Log when wizard state changes
  React.useEffect(() => {
    console.log('[BookPage] isCreateUserWizardOpen changed to:', isCreateUserWizardOpen);
  }, [isCreateUserWizardOpen]);
  const [wizardInitialEmail, setWizardInitialEmail] = useState(null); // Email to pre-fill wizard when opened from auth modal
  
  // Uploaded license images (shared between wizard and main page)
  const [uploadedLicenseImages, setUploadedLicenseImages] = useState({
    front: null,
    back: null,
  });
  
  // Rental Agreement state - managed by custom hook
  const {
    isRentalAgreementModalOpen,
    setIsRentalAgreementModalOpen,
    agreementSignature,
    setAgreementSignature,
    agreementConsents,
    setAgreementConsents,
    openAgreementModal,
    buildAgreementData,
    getAgreementDebugInfo,
  } = useRentalAgreement(i18n.language || companyConfig?.language || 'en');
  
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

    const makeUpper = (make || '').toUpperCase();

    const modelUpper = (model || '').toUpperCase().replace(/\s+/g, '_');

    if (!makeUpper || !modelUpper) {

      setModelImageSrc('/economy.jpg');

      return;

    }

    // Set URL directly - let img onError handle fallback (avoids CORS issues)
    const url = `https://aegisaorentalstorage.blob.core.windows.net/models/${makeUpper}_${modelUpper}.png`;
    setModelImageSrc(url);

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
  const allCompanyLocations = React.useMemo(() => {
    return Array.isArray(pickupLocationsData) ? pickupLocationsData : [];
  }, [pickupLocationsData]);
  
  // State to track which locations have available vehicles
  const [locationsWithVehicles, setLocationsWithVehicles] = React.useState(new Set());
  const [isCheckingAvailability, setIsCheckingAvailability] = React.useState(false);
  
  // Check availability for each location
  React.useEffect(() => {
    if (allCompanyLocations.length <= 1 || !companyId) {
      // If 1 or fewer locations, mark all as available
      if (allCompanyLocations.length > 0) {
        const locationIds = allCompanyLocations.map(loc => {
          const id = loc.id || loc.Id || loc.locationId || loc.LocationId;
          return id ? String(id) : null;
        }).filter(Boolean);
        setLocationsWithVehicles(new Set(locationIds));
        setIsCheckingAvailability(false);
      }
      return;
    }
    
    // Check availability for each location
    const checkAvailability = async () => {
      setIsCheckingAvailability(true);
      const availableLocationIds = new Set();
      
      // Check each location in parallel
      const availabilityChecks = allCompanyLocations.map(async (location) => {
        const locationId = location.id || location.Id || location.locationId || location.LocationId;
        if (!locationId) return null;
        
        try {
          const response = await apiService.getModelsGroupedByCategory(
            companyId,
            locationId,
            formData.pickupDate || null,
            formData.returnDate || null
          );
          
          const modelsData = response?.data || response;
          const categories = Array.isArray(modelsData) ? modelsData : [];
          
          // Check if the SPECIFIC make/model is available at this location
          // If make/model are specified, only check for that specific vehicle
          let totalAvailable = 0;
          let hasSpecificModel = false;
          
          for (const category of categories) {
            const models = category.models || category.Models || [];
            for (const modelItem of models) {
              const modelMake = (modelItem.make || modelItem.Make || '').toLowerCase();
              const modelName = (modelItem.modelName || modelItem.ModelName || '').toLowerCase();
              const availableCount = modelItem.availableCount || modelItem.available_count || 0;
              totalAvailable += availableCount;
              
              // If make/model are specified, only check for that specific make/model
              if (make && model) {
                const searchMake = (make || '').toLowerCase().trim();
                const searchModel = (model || '').toLowerCase().trim();
                
                // Debug logging
                if (modelMake === searchMake && modelName === searchModel) {
                  console.log(`[BookPage] Found matching make/model at location ${locationId}: ${modelMake} ${modelName}, availableCount: ${availableCount}`);
                }
                
                if (modelMake === searchMake && modelName === searchModel && availableCount > 0) {
                  hasSpecificModel = true;
                  return String(locationId); // This location has the specific make/model available
                }
              } else {
                // If no specific make/model, check for any available vehicles
                if (availableCount > 0) {
                  console.log(`[BookPage] Location ${locationId} has ${availableCount} available vehicles in model ${modelItem.make || ''} ${modelItem.modelName || ''}`);
                  return String(locationId); // This location has available vehicles
                }
              }
            }
          }
          
          if (make && model && !hasSpecificModel) {
            console.log(`[BookPage] Location ${locationId} has no available ${make} ${model} vehicles (total checked: ${totalAvailable})`);
          } else {
            console.log(`[BookPage] Location ${locationId} has no available vehicles (total checked: ${totalAvailable})`);
          }
          
          return null; // No available vehicles
        } catch (error) {
          console.warn(`Error checking availability for location ${locationId}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(availabilityChecks);
      results.forEach(locationId => {
        if (locationId) {
          availableLocationIds.add(locationId);
        }
      });
      
      console.log('[BookPage] Locations with available vehicles:', Array.from(availableLocationIds));
      setLocationsWithVehicles(availableLocationIds);
      
      // Clear selected location if it doesn't have vehicles available
      // Do not clear if user explicitly picked a location (avoid bouncing selection)
      if (selectedLocationId && !userSelectedLocation) {
        const currentLocationIdStr = String(selectedLocationId);
        if (!availableLocationIds.has(currentLocationIdStr)) {
          console.log(`[BookPage] Clearing selected location ${currentLocationIdStr} - no vehicles available`);
          setSelectedLocationId('');
        }
      }
      
      setIsCheckingAvailability(false);
    };
    
    checkAvailability();
  }, [allCompanyLocations, companyId, formData.pickupDate, formData.returnDate, make, model, selectedLocationId, userSelectedLocation]);
  
  // Filter locations to only show those with available vehicles
  const companyLocations = React.useMemo(() => {
    if (allCompanyLocations.length <= 1) {
      return allCompanyLocations; // If 1 or fewer locations, show all
    }
    
    // If we're still checking availability, return empty array (will show loading state)
    if (isCheckingAvailability) {
      return [];
    }
    
    // If no locations have vehicles after check completed, show all (fallback)
    if (locationsWithVehicles.size === 0) {
      console.warn('[BookPage] No locations with vehicles found, showing all locations as fallback');
      return allCompanyLocations;
    }
    
    // Filter to only locations with available vehicles
    const filtered = allCompanyLocations.filter(location => {
      const locationId = location.id || location.Id || location.locationId || location.LocationId;
      if (!locationId) return false;
      
      // Convert both to strings for comparison (in case one is GUID and one is string)
      const locationIdStr = String(locationId);
      const hasVehicle = locationsWithVehicles.has(locationIdStr);
      
      if (!hasVehicle) {
        console.log(`[BookPage] Filtering out location ${locationIdStr} - no vehicles available`);
      }
      
      return hasVehicle;
    });
    
    console.log(`[BookPage] Filtered ${filtered.length} locations with vehicles out of ${allCompanyLocations.length} total`);
    
    // If filtering resulted in no locations, show all (fallback)
    // This handles edge cases where availability check failed
    return filtered.length > 0 ? filtered : allCompanyLocations;
  }, [allCompanyLocations, locationsWithVehicles, isCheckingAvailability]);
  
  const showLocationDropdown = companyLocations.length > 1; // Show dropdown if multiple locations with vehicles exist
  
  // Get the selected location details for display
  const selectedLocation = React.useMemo(() => {
    if (!selectedLocationId) return null;
    return allCompanyLocations.find(location => {
      const locationId = location.id || location.Id || location.locationId || location.LocationId;
      return locationId && String(locationId) === String(selectedLocationId);
    });
  }, [selectedLocationId, allCompanyLocations]);
  
  // Auto-select first available location when locations with vehicles are found
  React.useEffect(() => {
    // Only auto-select if we have filtered locations (locations with vehicles) and no location is selected
    // AND availability check is complete
    if (companyLocations.length > 0 && !selectedLocationId && !isCheckingAvailability && locationsWithVehicles.size > 0) {
      // Find the first location that has vehicles available (must be in locationsWithVehicles set)
      const firstLocationWithVehicles = companyLocations.find(location => {
        const locationId = location.id || location.Id || location.locationId || location.LocationId;
        if (!locationId) return false;
        const locationIdStr = String(locationId);
        const hasVehicles = locationsWithVehicles.has(locationIdStr);
        console.log(`[BookPage] Checking location ${locationIdStr} for auto-select: ${hasVehicles ? 'HAS VEHICLES' : 'NO VEHICLES'}`);
        return hasVehicles;
      });
      
      if (firstLocationWithVehicles) {
        const firstLocationId = firstLocationWithVehicles.id || firstLocationWithVehicles.Id || firstLocationWithVehicles.locationId || firstLocationWithVehicles.LocationId;
        if (firstLocationId) {
          setSelectedLocationId(String(firstLocationId));
          setUserSelectedLocation(false);
        }
      } else {
        console.warn('[BookPage] ⚠️ No locations with vehicles found in filtered list, cannot auto-select');
      }
    } else if (companyLocations.length > 0 && !selectedLocationId && !isCheckingAvailability && locationsWithVehicles.size === 0) {
      console.warn('[BookPage] ⚠️ Availability check complete but no locations have vehicles available');
    }
  }, [companyLocations, selectedLocationId, isCheckingAvailability, locationsWithVehicles]);

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

      let baseUrl = `${origin.replace(/\/$/, '')}/driver-license-photo?returnTo=${encodeURIComponent(returnTo)}`;

      if (currentCompanyId) {

        baseUrl += `&companyId=${encodeURIComponent(currentCompanyId)}`;

      }

      if (currentUserId) {
        baseUrl += `&customerId=${encodeURIComponent(currentUserId)}`;
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

      const fallbackUrl = `${origin.replace(/\/$/, '')}/driver-license-photo?returnTo=${encodeURIComponent(returnTo)}`;

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

  // Cache for DL image checks to prevent excessive requests
  const dlImageCheckCache = React.useRef(new Map());
  
  // Helper function to check if DL images exist
  const checkDriverLicenseImagesExist = React.useCallback(async (customerId) => {
    if (!customerId) return false;
    
    // Check cache first (valid for 30 seconds)
    const cacheKey = customerId;
    const cached = dlImageCheckCache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.result;
    }
    
    try {
      // Check sequentially and stop early when found
      // Use the new API endpoint to get actual image filenames and URLs
      console.log('[BookPage] checkDriverLicenseImagesExist - Checking images for customer:', customerId);
      
      const response = await apiService.getCustomerLicenseImages(customerId);
      const imageData = response?.data || response;
      
      console.log('[BookPage] checkDriverLicenseImagesExist - API response:', imageData);
      
      // Construct frontend URLs using window.location.origin (frontend server)
      const frontendBaseUrl = window.location.origin;
      
      let hasFront = false;
      let hasBack = false;
      let frontUrl = null;
      let backUrl = null;
      
      if (imageData.frontUrl && imageData.front) {
        hasFront = true;
        // Use API endpoint for direct file serving (more reliable than static files)
        frontUrl = `${frontendBaseUrl}/api/Media/customers/${customerId}/licenses/file/${imageData.front}`;
        console.log('[BookPage] checkDriverLicenseImagesExist - Static URL (fallback):', `${frontendBaseUrl}${imageData.frontUrl}`);
      } else {
        console.log('[BookPage] checkDriverLicenseImagesExist - ❌ No front image found');
      }
      
      if (imageData.backUrl && imageData.back) {
        hasBack = true;
        // Use API endpoint for direct file serving (more reliable than static files)
        backUrl = `${frontendBaseUrl}/api/Media/customers/${customerId}/licenses/file/${imageData.back}`;
        console.log('[BookPage] checkDriverLicenseImagesExist - ✅ Back image URL (API):', backUrl);
        console.log('[BookPage] checkDriverLicenseImagesExist - Static URL (fallback):', `${frontendBaseUrl}${imageData.backUrl}`);
      } else {
        console.log('[BookPage] checkDriverLicenseImagesExist - ❌ No back image found');
      }
      
      // Update state with found URLs
      if (frontUrl) {
        setUploadedLicenseImages(prev => ({ ...prev, front: frontUrl }));
      } else if (uploadedLicenseImages.front) {
        console.log('[BookPage] checkDriverLicenseImagesExist - Clearing invalid front image URL from state');
        setUploadedLicenseImages(prev => ({ ...prev, front: null }));
      }
      
      if (backUrl) {
        setUploadedLicenseImages(prev => ({ ...prev, back: backUrl }));
      } else if (uploadedLicenseImages.back) {
        console.log('[BookPage] checkDriverLicenseImagesExist - Clearing invalid back image URL from state');
        setUploadedLicenseImages(prev => ({ ...prev, back: null }));
      }
      
      const result = hasFront && hasBack;
      
      // Log the results explicitly
      console.log('[BookPage] checkDriverLicenseImagesExist - hasFront:', hasFront, 'hasBack:', hasBack);
      console.log('[BookPage] checkDriverLicenseImagesExist - frontUrl:', frontUrl || 'NOT FOUND');
      console.log('[BookPage] checkDriverLicenseImagesExist - backUrl:', backUrl || 'NOT FOUND');
      
      // Cache the result
      dlImageCheckCache.current.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
      
      console.log('[BookPage] checkDriverLicenseImagesExist - Returning:', result);
      return result;
    } catch (error) {
      // If there's an error checking images, assume they don't exist
      // This will prompt user to upload them via wizard
      console.warn('[BookPage] Error checking DL images:', error);
      return false;
    }
  }, [uploadedLicenseImages.front, uploadedLicenseImages.back, setUploadedLicenseImages]);

  const proceedToCheckout = useCallback(async (overrideUser = null) => {
    // User must be authenticated to proceed
    const currentUser = overrideUser || user;
    // If overrideUser is provided (from login/register), skip isAuthenticated check
    // since the user just authenticated and state might not be updated yet
    if (!currentUser || (!overrideUser && !isAuthenticated)) {
      toast.error('Please authenticate to continue with booking.');
      return;
    }

    // Get customerId
    const customerId = currentUser?.id || currentUser?.customer_id || currentUser?.customerId || currentUser?.CustomerId || currentUser?.customer?.id || null;
    
    // Simple flow:
    // 1. If user doesn't exist → wizard will show from page 1 (handled elsewhere)
    // 2. If user exists but images don't exist → show wizard from page 3
    // 3. If user exists and images exist → don't show wizard
    if (customerId) {
      try {
        // Always check server to ensure images actually exist (don't trust state alone)
        // State might have invalid URLs from previous checks
        console.log('[BookPage] proceedToCheckout - Checking images in state:', { 
          front: uploadedLicenseImages.front || 'null',
          back: uploadedLicenseImages.back || 'null'
        });
        
        // Clear cache to ensure we get fresh data
        if (dlImageCheckCache.current) {
          dlImageCheckCache.current.delete(customerId);
          console.log('[BookPage] proceedToCheckout - Cleared cache for customer:', customerId);
        }
        
        // Always check server - don't trust state (state might have invalid URLs)
        console.log('[BookPage] proceedToCheckout - Calling checkDriverLicenseImagesExist for customer:', customerId);
        const hasDLImages = await checkDriverLicenseImagesExist(customerId);
        console.log('[BookPage] proceedToCheckout - checkDriverLicenseImagesExist returned:', hasDLImages);
        console.log('[BookPage] proceedToCheckout - Server check result:', hasDLImages ? '✅ IMAGES EXIST' : '❌ IMAGES NOT FOUND');
        
        if (!hasDLImages) {
          // User exists but images don't exist → show wizard from page 3
          console.log('[BookPage] proceedToCheckout - ❌ No DL images found, opening wizard');
          console.log('[BookPage] proceedToCheckout - hasDLImages is:', hasDLImages);
          console.log('[BookPage] proceedToCheckout - Setting isCreateUserWizardOpen to TRUE');
          setIsCreateUserWizardOpen(true);
          
          // Verify the state was set
          setTimeout(() => {
            console.log('[BookPage] proceedToCheckout - Verifying wizard state after setting...');
          }, 100);
          
          console.log('[BookPage] proceedToCheckout - Wizard should now be open - returning early');
          return;
        } else {
          console.log('[BookPage] proceedToCheckout - hasDLImages is:', hasDLImages);
        }
        
        // User exists and images exist → don't show wizard, proceed to next step
        
        // DL exists - check if agreement is signed
        if (!agreementSignature) {
          // DL exists but Agreement not signed - show rental agreement modal
          openAgreementModal();
          return;
        }
      } catch (error) {
        // If there's an error checking DL images, proceed with booking
        // User can still complete booking even if check fails
        console.warn('[BookPage] Error checking wizard requirements, proceeding with booking:', error);
      }
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

    // Location is auto-selected, no need to validate

    // Use overrideUser if provided (from login response), otherwise use user from state
    const userToUse = overrideUser || user;



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

        locationId: selectedLocationId || null,

        // Rental agreement data
        agreementData: buildAgreementData(i18n.language || companyConfig?.language || 'en')
      };

      // Log agreement data for debugging
      const debugInfo = getAgreementDebugInfo();
      console.log('[BookPage] Sending booking with agreement data:', {
        ...debugInfo,
        agreementData: bookingData.agreementData ? {
          hasSignature: !!bookingData.agreementData.signatureImage,
          signatureLength: bookingData.agreementData.signatureImage?.length || 0,
          language: bookingData.agreementData.language,
          hasConsents: !!bookingData.agreementData.consents,
          consents: bookingData.agreementData.consents,
          consentTexts: bookingData.agreementData.consentTexts ? {
            hasTerms: !!bookingData.agreementData.consentTexts.termsText,
            hasNonRefundable: !!bookingData.agreementData.consentTexts.nonRefundableText,
            hasDamagePolicy: !!bookingData.agreementData.consentTexts.damagePolicyText,
            hasCardAuthorization: !!bookingData.agreementData.consentTexts.cardAuthorizationText,
          } : null,
        } : null
      });
      
      // Warn if agreement signature exists but agreementData is null
      if (agreementSignature && !bookingData.agreementData) {
        console.error('[BookPage] ⚠️ WARNING: agreementSignature exists but agreementData is null! This should not happen.');
      }



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

    companyConfig?.language,

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

    selectedLocationId,

    isAuthenticated,

    isBookingAvailable,

    agreementSignature,

    uploadedLicenseImages.front,

    uploadedLicenseImages.back,

    dlImageCheckCache,

    checkDriverLicenseImagesExist,

    openAgreementModal,

    buildAgreementData,

    getAgreementDebugInfo

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

      // User exists - proceed to password step for authentication
      setAuthStep('password');

    } catch (error) {

      if (error.response?.status === 404) {

        // User doesn't exist - show wizard from page 1
        const normalizedEmail = authForm.email.trim().toLowerCase();
        setAuthModalOpen(false);
        // Store email to pre-fill wizard (will be used when wizard opens)
        setWizardInitialEmail(normalizedEmail);
        setIsCreateUserWizardOpen(true);

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

      // Get customerId
      const customerId = userData?.customerId || userData?.id || userData?.userId || userData?.Id || userData?.UserId || userData?.sub || userData?.nameidentifier || null;
      
      if (customerId) {
        // Simple flow:
        // 1. User exists (we have customerId)
        // 2. Check if images exist
        // 3. If images don't exist → show wizard from page 3
        // 4. If images exist → don't show wizard, proceed to checkout
        
        // Check if both images exist
        const hasImagesInState = uploadedLicenseImages.front && uploadedLicenseImages.back;
        let hasDLImages = hasImagesInState;
        
        // If not in state, check server
        if (!hasDLImages) {
          if (dlImageCheckCache.current) {
            dlImageCheckCache.current.delete(customerId);
          }
          hasDLImages = await checkDriverLicenseImagesExist(customerId);
        }
        
        if (!hasDLImages) {
          // User exists but images don't exist → show wizard from page 3
          setAuthModalOpen(false);
          resetAuthModal();
          setIsCreateUserWizardOpen(true);
          setAuthLoading(false);
          return;
        }
        
        // User exists and images exist → don't show wizard, proceed to checkout
        
        // DL exists - check if agreement is signed
        // Check if agreement signature exists (they haven't signed yet)
        if (!agreementSignature) {
          // DL exists but Agreement not signed - show rental agreement modal
          setAuthModalOpen(false);
          resetAuthModal();
          setIsRentalAgreementModalOpen(true);
          setAuthLoading(false);
          return;
        }
      }

      // DL exists (and optionally agreement signed) - proceed to booking
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

  // Wizard handlers - MOVED TO BookingWizard component
  // All wizard logic is now in the BookingWizard component
  
  // Note: All wizard-related handlers have been moved to BookingWizard component
  // The following functions are kept for reference but are not used:
  // - handleDeleteCustomerLicenseImage
  // - handleWizardFileChange
  // - removeWizardImage
  // - handleDeleteWizardImage
  // - handleWizardNext
  // - handleWizardPrevious
  // - handleWizardSubmit
  // - handleCloseWizard

  // Delete customer license image (used outside wizard too, e.g., on QR code page)
  // This function is no longer used - image deletion is handled in BookingWizard
  // Keeping for potential future use outside wizard context
  // const handleDeleteCustomerLicenseImage = async (side) => {};

  // Old wizard handlers - MOVED TO BookingWizard component
  // These functions are no longer used as wizard logic has been moved to BookingWizard
  // Keeping stubs for reference but they should not be called

  // Fetch uploaded license images from server
  React.useEffect(() => {
    const fetchUploadedImages = async () => {
      // Get customer ID from user, wizardFormData, or URL params
      let customerId = null;
      
      if (user) {
        customerId = user?.customerId || user?.id || user?.userId || user?.Id || user?.UserId || user?.sub || user?.nameidentifier;
      }
      
      // Try to get from URL params
      const customerIdParam = searchParams.get('customerId');
      if (customerIdParam) {
        customerId = customerIdParam;
      }

      // Use /api proxy to avoid CORS issues (goes through Node.js proxy with CORS enabled)
      const apiBaseUrl = window.location.origin;
      
      // Check if images exist using HEAD request through /api proxy (avoids CORS errors)
      const checkImageExists = async (url) => {
        try {
          // Use HEAD request through /api proxy to avoid CORS errors
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1000); // 1-second timeout
          
          const response = await fetch(url + '?t=' + Date.now(), {
            method: 'HEAD',
            cache: 'no-cache',
            signal: controller.signal,
            credentials: 'include' // Include cookies for session
          });
          
          clearTimeout(timeoutId);
          return response.ok;
        } catch (error) {
          // Silently handle 404s and other errors (expected when images don't exist)
          return false;
        }
      };

      if (customerId) {
        // Customer exists, check customer license images
        // Try multiple extensions since backend saves with original file extension
        const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        
        const checkImageWithExtensions = async (side, currentUrl) => {
          // If we already have a URL for this side, normalize it to use /api proxy and verify it still exists
          if (currentUrl) {
            // Normalize URL to use /api proxy path (convert direct backend URLs to proxy URLs)
            let normalizedUrl = currentUrl;
            // If URL contains direct backend path like /customers/... or https://localhost:7163/customers/...
            // Convert it to use /api proxy path
            const directBackendPattern = /(https?:\/\/[^/]+)?\/customers\/([^/]+)\/licenses\/(front|back)(\.\w+)?/;
            const match = currentUrl.match(directBackendPattern);
            if (match) {
              // Extract customer ID and side from the URL
              const urlCustomerId = match[2];
              const urlSide = match[3];
              const urlExt = match[4] || '.png';
              // Reconstruct using /api proxy path
              normalizedUrl = `${apiBaseUrl}/customers/${urlCustomerId}/licenses/${urlSide}${urlExt}`;
            }
            
            const stillExists = await checkImageExists(normalizedUrl);
            if (stillExists) {
              return normalizedUrl; // Image still exists, return normalized URL
            }
          }
          
          // Check extensions sequentially and stop early when found (use /api proxy path)
          for (const ext of extensions) {
            const url = `${apiBaseUrl}/customers/${customerId}/licenses/${side}${ext}`;
            const exists = await checkImageExists(url);
            if (exists) {
              return url;
            }
          }
          return null;
        };

        // Get current URLs to avoid unnecessary checks
        const currentFront = uploadedLicenseImages.front;
        const currentBack = uploadedLicenseImages.back;
        
        // Only check for missing images (check both in parallel if both are missing, otherwise check only the missing one)
        let frontUrl = currentFront;
        let backUrl = currentBack;
        
        if (!currentFront && !currentBack) {
          // Both missing - check in parallel
          [frontUrl, backUrl] = await Promise.all([
            checkImageWithExtensions('front', null),
            checkImageWithExtensions('back', null)
          ]);
        } else if (!currentFront) {
          // Only front missing
          frontUrl = await checkImageWithExtensions('front', null);
          // Verify back still exists
          backUrl = await checkImageWithExtensions('back', currentBack);
        } else if (!currentBack) {
          // Only back missing
          backUrl = await checkImageWithExtensions('back', null);
          // Verify front still exists
          frontUrl = await checkImageWithExtensions('front', currentFront);
        } else {
          // Both exist - just verify they still exist (quick check)
          [frontUrl, backUrl] = await Promise.all([
            checkImageWithExtensions('front', currentFront),
            checkImageWithExtensions('back', currentBack)
          ]);
        }

        // Only update state if something changed
        setUploadedLicenseImages(prev => {
          if (prev.front === frontUrl && prev.back === backUrl) {
            return prev; // No change, don't update
          }
          return {
            front: frontUrl || null,
            back: backUrl || null,
          };
        });
      } else {
        // No customerId, clear images
        setUploadedLicenseImages({
          front: null,
          back: null,
        });
      }
    };

    // Fetch uploaded images when wizard is open (handled by BookingWizard component now)
    // This effect is kept for non-wizard image display (QR code page)
    if (isCreateUserWizardOpen) {
      // Wizard handles its own image fetching
      return;
    }
    
    // Fetch images for main page display
    if (user) {
      // Check if both images already exist - if so, don't poll
      const hasBothImages = uploadedLicenseImages.front && uploadedLicenseImages.back;
      
      // Immediate fetch only if we don't have both images
      if (!hasBothImages) {
        fetchUploadedImages();
      }
      
      // Listen for storage events (when mobile page uploads images)
      const handleStorageChange = (e) => {
        if (e.key && e.key === 'licenseImagesUploaded') {
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
      try {
        broadcastChannel = new BroadcastChannel('license_images_channel');
        broadcastChannel.onmessage = (event) => {
          if (event.data && (event.data.type === 'licenseImageUploaded' || event.data.type === 'licenseImageDeleted')) {
            // Immediate refresh when image is uploaded or deleted
            setTimeout(fetchUploadedImages, 100);
          }
        };
      } catch (e) {
        console.log('BroadcastChannel not available:', e);
      }
      
      // Check localStorage for upload flags
      const checkUploadFlags = () => {
        try {
          const flag = localStorage.getItem('licenseImagesUploaded');
          if (flag) {
            // Check if flag is recent (within last 10 seconds)
            const timestamp = parseInt(flag, 10);
            if (Date.now() - timestamp < 10000) {
              fetchUploadedImages();
            }
            // Clear old flags
            if (Date.now() - timestamp > 30000) {
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
      
      // Only poll if we don't have both images (count < 2)
      // Stop polling once both images are found
      let interval = null;
      if (!hasBothImages) {
        interval = setInterval(() => {
          // Check current state by reading from the state setter callback
          // We'll check inside fetchUploadedImages and stop there if both found
          fetchUploadedImages();
        }, 3000); // Check every 3 seconds
      }
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
        clearInterval(flagCheckInterval);
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('refreshLicenseImages', handleRefreshEvent);
        if (broadcastChannel) {
          broadcastChannel.close();
        }
      };
    }
    // Note: When uploadedLicenseImages changes and both images are found, the effect re-runs
    // and hasBothImages will be true, preventing a new interval from being created
  }, [user, searchParams, uploadedLicenseImages.front, uploadedLicenseImages.back, isCreateUserWizardOpen]);



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

                    onError={(e) => {
                      if (e.target.src !== window.location.origin + '/economy.jpg') {
                        e.target.src = '/economy.jpg';
                      }
                    }}

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

                {/* Location Dropdown - Show only locations with available vehicles */}
                {showLocationDropdown && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('booking.selectLocation') || 'Select Location'}
                    </label>
                    <select
                      value={selectedLocationId}
                      onChange={(e) => { setSelectedLocationId(e.target.value); setUserSelectedLocation(true); }}
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
                
                {/* Display selected location (read-only) if only one location with vehicles */}
                {!showLocationDropdown && selectedLocation && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-blue-800">
                        {t('booking.availableAt') || 'Available at:'}
                      </span>
                      <span className="text-sm font-semibold text-blue-900">
                        {selectedLocation.locationName || selectedLocation.location_name || selectedLocation.LocationName || 'Selected Location'}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Show message if checking availability */}
                {isCheckingAvailability && (
                  <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-sm text-gray-600">
                      {t('booking.checkingAvailability') || 'Checking availability...'}
                    </div>
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

                      disabled={
                        checkoutLoading || 
                        availableVehiclesCount === 0 ||
                        (showLocationDropdown && !selectedLocationId)
                      }

                      title={
                        availableVehiclesCount === 0 
                          ? t('bookPage.unavailable') || 'Unavailable'
                          : (showLocationDropdown && !selectedLocationId)
                          ? t('booking.selectLocationRequired') || 'Please select a location'
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
      <BookingWizard
        isOpen={isCreateUserWizardOpen}
        onClose={() => {
          setIsCreateUserWizardOpen(false);
          setWizardInitialEmail(null); // Clear initial email when wizard closes
          // Do not reset rental agreement here; user may proceed to booking and needs the signature
        }}
        initialEmail={wizardInitialEmail} // Pre-fill email from auth modal
        onComplete={handleAuthSuccess}
        user={user}
        loginUser={loginUser}
        registerUser={registerUser}
        handleAuthSuccess={handleAuthSuccess}
        isMobile={isMobile}
        dlImageCheckCache={dlImageCheckCache}
        agreementSignature={agreementSignature}
        setAgreementSignature={setAgreementSignature}
        agreementConsents={agreementConsents}
        setAgreementConsents={setAgreementConsents}
        uploadedLicenseImages={uploadedLicenseImages}
        setUploadedLicenseImages={setUploadedLicenseImages}
      />

      {/* Rental Agreement Modal */}
      {console.log('RentalAgreementModal props:', {
        modelDailyRate,
        pickupDate: formData.pickupDate,
        returnDate: formData.returnDate,
        calculateTotal: calculateTotal(),
        calculateGrandTotal: calculateGrandTotal(),
        selectedVehicle: selectedVehicle?.make,
      })}
      <RentalAgreementModal
        isOpen={isRentalAgreementModalOpen}
        onClose={() => {
          setIsRentalAgreementModalOpen(false);
        }}
        onConfirm={() => {
          // After agreement is signed, proceed with booking
          setIsRentalAgreementModalOpen(false);
          // The agreement signature and consents are already set via the hook
          // Proceed to checkout if user is authenticated
          if (user && isAuthenticated) {
            // Use setTimeout to ensure modal closes before proceeding
            setTimeout(() => {
              proceedToCheckout();
            }, 100);
          }
        }}
        language={i18n.language || companyConfig?.language || 'en'}
        rentalInfo={{
          // Renter info
          renter: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            phone: user?.phone || user?.phoneNumber || '',
            driverLicense: user?.driverLicense || '',
            state: user?.state || '',
            licenseExp: user?.licenseExpiration || '',
            dob: user?.dateOfBirth || '',
            address: user?.address || '',
          },
          // Vehicle info
          vehicle: {
            type: selectedVehicle?.vehicleType || selectedVehicle?.type || '',
            makeModel: (selectedVehicle?.make || make || '') && (selectedVehicle?.model || model || '')
              ? `${selectedVehicle?.make || make || ''} ${selectedVehicle?.model || model || ''}`.trim()
              : (selectedVehicle?.vehicleName || selectedVehicle?.name || ''),
            yearColorLicense: [
              selectedVehicle?.year,
              selectedVehicle?.color,
              selectedVehicle?.licensePlate || selectedVehicle?.plateNumber
            ].filter(Boolean).join(' / ') || '',
            vin: selectedVehicle?.vin || '',
            odometer: selectedVehicle?.odometer || selectedVehicle?.mileage || '',
          },
          // Rental period
          vehicleName: (selectedVehicle?.make || make || '') && (selectedVehicle?.model || model || '')
            ? `${selectedVehicle?.make || make || ''} ${selectedVehicle?.model || model || ''}`.trim()
            : (selectedVehicle?.vehicleName || selectedVehicle?.name || ''),
          pickupDate: formData.pickupDate,
          returnDate: formData.returnDate,
          startTime: '',
          returnTime: '',
          // Rates - calculated values
          rates: (() => {
            // Calculate number of days
            const numDays = formData.pickupDate && formData.returnDate
              ? Math.max(1, Math.ceil((new Date(formData.returnDate) - new Date(formData.pickupDate)) / (1000 * 60 * 60 * 24)) + 1)
              : 1;
            
            // Get daily rate from multiple sources
            const dailyRate = modelDailyRate 
              || selectedVehicle?.daily_rate 
              || selectedVehicle?.dailyRate 
              || modelData?.dailyRate 
              || modelData?.daily_rate
              || 0;
            
            // Calculate daily total
            const dailyTotal = dailyRate * numDays || calculateTotal() || 0;
            
            // Calculate services total
            const servicesTotal = calculateServicesTotal() || 0;
            
            return {
              ratePerDay: dailyRate,
              numberOfDays: numDays,
              dailyTotal: dailyTotal,
              weeklyTotal: 0,
              numberOfWeeks: 0,
              surchargeTax: 0,
              pickupDropoff: 0,
              cdw: 0,
              gps: 0,
              childSeat: 0,
              driverUnder25: 0,
              additionalDriver: 0,
              creditCardFee: 0,
              servicesTotal: servicesTotal,
              subtotal: dailyTotal + servicesTotal,
              vehicleStateTax: 0,
              totalCharges: calculateGrandTotal(),
            };
          })(),
          // Selected services for display
          selectedServices: (() => {
            const numDays = formData.pickupDate && formData.returnDate
              ? Math.max(1, Math.ceil((new Date(formData.returnDate) - new Date(formData.pickupDate)) / (1000 * 60 * 60 * 24)) + 1)
              : 1;
            return selectedServices.map(s => {
              const svc = s.service || s;
              const serviceName = svc.serviceName || svc.ServiceName || svc.name || svc.Name || '';
              const dailyPrice = svc.servicePrice || svc.ServicePrice || svc.price || svc.Price || 0;
              const totalPrice = dailyPrice * numDays * (s.quantity || 1);
              return {
                name: `${serviceName} (${formatPrice(dailyPrice)}/day × ${numDays})`,
                price: totalPrice,
              };
            });
          })(),
          totalAmount: calculateGrandTotal(),
          securityDeposit: companyConfig?.securityDeposit ?? 0,
        }}
        formatPrice={formatPrice}
        consents={agreementConsents}
        setConsents={setAgreementConsents}
        signatureData={agreementSignature}
        setSignatureData={setAgreementSignature}
        t={t}
      />

      {/* Old Wizard Code - REMOVED - Now handled by BookingWizard component */}



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

                    let url = `${origin}/driver-license-photo?returnTo=${encodeURIComponent(returnTo)}`;

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
