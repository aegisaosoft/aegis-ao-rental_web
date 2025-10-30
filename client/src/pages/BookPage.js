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

import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Car, Shield, Clock, Star, ArrowLeft, CreditCard, Camera } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';

const BookPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Get filters from URL
  const categoryId = searchParams.get('category');
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  const companyId = searchParams.get('companyId') || localStorage.getItem('selectedCompanyId');

  const [selectedVehicleId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrSessionId, setQrSessionId] = useState('');
  const [qrUrl, setQrUrl] = useState('');
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

  // Prefill from localStorage if mobile scan placed data
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('scannedLicense');
      if (raw) {
        const d = JSON.parse(raw);
        setLicenseData(prev => ({
          ...prev,
          licenseNumber: d.licenseNumber || prev.licenseNumber,
          stateIssued: (d.issuingState || d.state || prev.stateIssued || '').toString().slice(0, 2).toUpperCase(),
          countryIssued: (d.issuingCountry || prev.countryIssued || 'US').toString().slice(0, 2).toUpperCase(),
          sex: (d.sex || prev.sex || '').toString().slice(0, 1).toUpperCase(),
          height: d.height || prev.height,
          eyeColor: d.eyeColor || prev.eyeColor,
          middleName: d.middleName || prev.middleName,
          issueDate: d.issueDate || prev.issueDate,
          expirationDate: d.expirationDate || prev.expirationDate,
          licenseAddress: d.address || prev.licenseAddress,
          licenseCity: d.city || prev.licenseCity,
          licenseState: d.state || prev.licenseState,
          licensePostalCode: d.postalCode || prev.licensePostalCode,
          licenseCountry: d.country || prev.licenseCountry,
        }));
        localStorage.removeItem('scannedLicense');
        toast.success('License data imported');
      }
    } catch {}
  }, []);

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
      toast.error(t('bookPage.loginToSaveLicense'));
      return;
    }

    // Validate required fields
    if (!licenseData.licenseNumber || !licenseData.stateIssued || !licenseData.expirationDate) {
      toast.error(t('bookPage.fillRequiredLicenseFields'));
      return;
    }

    saveLicenseMutation.mutate(licenseData);
  };

  // Microblink BlinkID: dynamic loader and prep
  const loadBlinkID = () => new Promise((resolve, reject) => {
    if (window.BlinkIDSDK) return resolve(window.BlinkIDSDK);
    const tryLoad = (srcs) => {
      if (!srcs.length) return reject(new Error('Failed to load BlinkID SDK'));
      const [src, ...rest] = srcs;
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve(window.BlinkIDSDK);
      script.onerror = () => {
        script.remove();
        tryLoad(rest);
      };
      document.body.appendChild(script);
    };
    tryLoad([
      'https://unpkg.com/@microblink/blinkid-in-browser-sdk@latest/dist/index.min.js',
      'https://cdn.jsdelivr.net/npm/@microblink/blinkid-in-browser-sdk@latest/dist/index.min.js'
    ]);
  });

  const handleScanLicense = async () => {
    try {
      setIsScanning(true);
      const BlinkIDSDK = await loadBlinkID();
      // Choose platform-specific license key if provided, otherwise use generic web key
      const ua = navigator.userAgent || navigator.vendor || '';
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
      const isAndroid = /android/i.test(ua);
      const licenseKey = (
        (isIOS && process.env.REACT_APP_BLINKID_LICENSE_KEY_IOS) ||
        (isAndroid && process.env.REACT_APP_BLINKID_LICENSE_KEY_ANDROID) ||
        process.env.REACT_APP_BLINKID_LICENSE_KEY ||
        ''
      );
      if (!licenseKey) {
        toast.error('BlinkID license key missing');
        setIsScanning(false);
        return;
      }
      // Load engine (required before scanning). Resources hosted on unpkg
      await BlinkIDSDK.loadWasmModule({
        licenseKey,
        engineLocation: 'https://unpkg.com/@microblink/blinkid-in-browser-sdk@latest/resources'
      });
      // At this point engine is ready; full camera scanning flow can be added next
      toast.success('Scanner ready');
    } catch (e) {
      console.error(e);
      toast.error('Failed to initialize scanner');
    } finally {
      setIsScanning(false);
    }
  };

  // Create QR for phone scan (Azure/full-web): opens /scan with session
  const handleScanOnPhone = async () => {
    try {
      const resp = await fetch('/api/scan/session', { method: 'POST' });
      if (!resp.ok) throw new Error('Failed to create session');
      const data = await resp.json();
      const sessionId = data.id;
      const origin = window.location.origin; // works on Azure and local
      const url = `${origin}/scan?sessionId=${encodeURIComponent(sessionId)}`;
      setQrSessionId(sessionId);
      setQrUrl(url);
      setQrOpen(true);
    } catch (e) {
      console.error(e);
      toast.error('Failed to start phone scan');
    }
  };

  // Poll scan result while QR modal is open
  React.useEffect(() => {
    if (!qrOpen || !qrSessionId) return undefined;
    let cancelled = false;
    const start = Date.now();
    const maxMs = 10 * 60 * 1000;
    const tick = async () => {
      if (cancelled) return;
      try {
        const r = await fetch(`/api/scan/session/${encodeURIComponent(qrSessionId)}`);
        if (r.ok) {
          const s = await r.json();
          if (s.status === 'completed' && s.result) {
            const d = s.result;
            setLicenseData(prev => ({
              ...prev,
              licenseNumber: d.licenseNumber || prev.licenseNumber,
              stateIssued: (d.issuingState || d.state || prev.stateIssued || '').toString().slice(0, 2).toUpperCase(),
              countryIssued: (d.issuingCountry || prev.countryIssued || 'US').toString().slice(0, 2).toUpperCase(),
              sex: (d.sex || prev.sex || '').toString().slice(0, 1).toUpperCase(),
              height: d.height || prev.height,
              eyeColor: d.eyeColor || prev.eyeColor,
              middleName: d.middleName || prev.middleName,
              issueDate: d.issueDate || prev.issueDate,
              expirationDate: d.expirationDate || prev.expirationDate,
              licenseAddress: d.address || prev.licenseAddress,
              licenseCity: d.city || prev.licenseCity,
              licenseState: d.state || prev.licenseState,
              licensePostalCode: d.postalCode || prev.licensePostalCode,
              licenseCountry: d.country || prev.licenseCountry,
            }));
            toast.success('License data received');
            setQrOpen(false);
            return; // stop polling
          }
        }
      } catch (e) {
        // ignore transient
      }
      if (Date.now() - start < maxMs) setTimeout(tick, 2000);
    };
    const handle = setTimeout(tick, 500);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [qrOpen, qrSessionId]);

  // QR-based phone scan flow removed to satisfy current lint and scope

  const calculateTotal = () => {
    if (!formData.pickupDate || !formData.returnDate || !selectedVehicle) return 0;
    
    const pickup = new Date(formData.pickupDate);
    const returnDate = new Date(formData.returnDate);
    const days = Math.max(1, Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24)));
    
    const dailyRate = selectedVehicle.daily_rate || selectedVehicle.dailyRate || 0;
    return days * dailyRate;
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
                      src={`/models/${(make || '').toUpperCase()}_${(model || '').toUpperCase().replace(/\s+/g, '_')}.png`}
                      alt={`${make} ${model}`}
                      className="w-full h-64 object-cover rounded-lg shadow-md"
                      onError={(e) => {
                        // Fallback to economy image if model image doesn't exist
                        // Only change if it's not already the default to prevent infinite loops
                        if (!e.target.src.includes('/economy.jpg')) {
                          e.target.src = '/economy.jpg';
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleScanLicense}
                      className="absolute top-3 right-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1 rounded shadow-md inline-flex items-center"
                      disabled={isScanning}
                      title="Scan driver license"
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      {isScanning ? 'Scanning...' : 'Scan License'}
                    </button>
                    <button
                      type="button"
                      onClick={handleScanOnPhone}
                      className="absolute top-3 right-40 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-1 rounded shadow-md"
                      title="Scan on phone via QR"
                    >
                      Scan on phone
                    </button>
                  </div>
                )}
                {/* Header Text */}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {t('bookPage.bookModel', { make, model })}
                  </h1>
                  <p className="text-gray-600">{t('bookPage.selectVehicleAndComplete')}</p>
                </div>
              </div>
            </div>

            {/* Driver License Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              {/* QR Modal */}
              {qrOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-4 w-80 text-center">
                    <div className="text-lg font-semibold mb-2">Scan on your phone</div>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
                      alt="QR"
                      className="mx-auto mb-2"
                    />
                    <div className="text-xs break-all text-gray-600 mb-3">{qrUrl}</div>
                    <button
                      onClick={()=>setQrOpen(false)}
                      className="w-full bg-gray-200 text-gray-800 py-2 rounded-md font-semibold"
                    >Close</button>
                  </div>
                </div>
              )}
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                {t('bookPage.driverLicenseInformation')}
                {customerLicense && (
                  <span className="ml-2 text-sm font-normal text-gray-500">{t('bookPage.editExisting')}</span>
                )}
                {!customerLicense && isAuthenticated && (
                  <span className="ml-2 text-sm font-normal text-gray-500">{t('bookPage.createNew')}</span>
                )}
              </h2>
              
              {!isAuthenticated ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">{t('bookPage.loginToEnterLicense')}</p>
                  <Link to="/login" className="btn-primary inline-block">
                    {t('bookPage.login')}
                  </Link>
                </div>
              ) : (
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

                  <button
                    type="submit"
                    className="w-full btn-primary py-2"
                    disabled={saveLicenseMutation.isLoading}
                  >
                    {saveLicenseMutation.isLoading 
                      ? t('bookPage.saving') 
                      : customerLicense 
                        ? t('bookPage.updateLicenseInformation') 
                        : t('bookPage.createLicenseInformation')}
                  </button>
                </form>
              )}
            </div>

          </div>

          {/* Right Part - Booking Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              {selectedVehicle ? (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('bookPage.bookingDetails')}</h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('booking.pickupDate')} *
                      </label>
                      <input
                        type="date"
                        name="pickupDate"
                        value={formData.pickupDate}
                        onChange={handleChange}
                        min={today}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('bookPage.returnDateLabel')} *
                      </label>
                      <input
                        type="date"
                        name="returnDate"
                        value={formData.returnDate}
                        onChange={handleChange}
                        min={formData.pickupDate || today}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

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
                            ${calculateTotal().toFixed(2)}
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
                <div className="text-center py-8">
                  <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">{t('bookPage.selectVehicleToContinue')}</p>
                </div>
              )}

              {/* Benefits */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('bookPage.whatsIncluded')}</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Shield className="h-4 w-4 mr-2 text-blue-600" />
                    {t('bookPage.comprehensiveInsurance')}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2 text-blue-600" />
                    {t('bookPage.roadsideAssistance')}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Star className="h-4 w-4 mr-2 text-blue-600" />
                    {t('bookPage.premiumService')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookPage;

