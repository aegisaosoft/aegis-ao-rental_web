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
import { Car, ArrowLeft, CreditCard, X, Calendar } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';

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
                    {/* Header with title and buttons */}
                    <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <CreditCard className="h-6 w-6 mr-2" />
                        {t('bookPage.driverLicenseInformation')}
                      </h2>
                      <div className="flex items-center gap-2">
                        {/* Only show scan button if company has BlinkID key */}
                        {(companyConfig?.blinkKey || companyConfig?.BlinkKey || process.env.REACT_APP_BLINKID_LICENSE_KEY) && (
                          <button
                            type="button"
                            onClick={handleScanOnPhone}
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

