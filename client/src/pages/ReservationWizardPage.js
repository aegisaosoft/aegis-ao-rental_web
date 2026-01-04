/*
 * ReservationWizardPage - Standalone page for creating reservations
 * Multi-step wizard: Customer → Category → Model → Summary & Confirm
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';
import { PageContainer, LoadingSpinner } from '../components/common';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { translateCategory } from '../i18n/translateHelpers';
import AdminCustomerWizard from '../components/AdminCustomerWizard';

const ReservationWizardPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { companyConfig, formatPrice } = useCompany();

  // Helper: Convert 24h time to AM/PM format
  const formatTimeAmPm = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  // Get current company ID
  const currentCompanyId = useMemo(() => {
    return companyConfig?.id || user?.companyId || null;
  }, [companyConfig?.id, user?.companyId]);

  // ============== WIZARD STATE ==============
  
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardCustomerEmail, setWizardCustomerEmail] = useState('');
  const [wizardCustomer, setWizardCustomer] = useState(null);
  const [wizardSearchingCustomer, setWizardSearchingCustomer] = useState(false);
  const [showCustomerWizard, setShowCustomerWizard] = useState(false);
  const [wizardPickupDate, setWizardPickupDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [wizardReturnDate, setWizardReturnDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [wizardPickupTime, setWizardPickupTime] = useState('09:00');
  const [wizardReturnTime, setWizardReturnTime] = useState('17:00');
  const [wizardSelectedLocation, setWizardSelectedLocation] = useState(null);
  const [wizardSelectedCategory, setWizardSelectedCategory] = useState(null);
  const [wizardSelectedMake, setWizardSelectedMake] = useState(null);
  const [wizardSelectedModel, setWizardSelectedModel] = useState(null);
  const [wizardModelsByMake, setWizardModelsByMake] = useState({});
  const [wizardExpandedMakes, setWizardExpandedMakes] = useState(new Set());
  const [isLoadingWizardModels, setIsLoadingWizardModels] = useState(false);
  const [wizardSelectedServices, setWizardSelectedServices] = useState([]);
  const [wizardAdditionalServices, setWizardAdditionalServices] = useState([]);
  const [isLoadingWizardServices, setIsLoadingWizardServices] = useState(false);
  const [isCreatingReservation, setIsCreatingReservation] = useState(false);

  // ============== QUERIES ==============

  // Fetch company locations
  const { data: wizardLocationsResponse } = useQuery(
    ['companyLocations', currentCompanyId],
    () => apiService.getLocationsByCompany(currentCompanyId),
    {
      enabled: !!currentCompanyId
    }
  );
  
  const wizardLocations = useMemo(() => {
    const data = wizardLocationsResponse?.data || wizardLocationsResponse;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.locations)) return data.locations;
    return [];
  }, [wizardLocationsResponse]);

  // Fetch categories (filtered by availability)
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useQuery(
    ['vehicleCategories', currentCompanyId, wizardPickupDate, wizardReturnDate, wizardPickupTime, wizardReturnTime, wizardSelectedLocation?.locationId || wizardSelectedLocation?.id],
    () => {
      const locationId = wizardSelectedLocation?.locationId || wizardSelectedLocation?.id || null;
      return apiService.getModelsGroupedByCategory(currentCompanyId, locationId, wizardPickupDate, wizardReturnDate, wizardPickupTime, wizardReturnTime);
    },
    {
      enabled: wizardStep === 2 && !!currentCompanyId && !!wizardPickupDate && !!wizardReturnDate
    }
  );

  const categories = useMemo(() => {
    const data = categoriesResponse?.data || categoriesResponse;
    if (Array.isArray(data)) {
      const categoryMap = new Map();
      data.forEach(group => {
        const categoryId = group.categoryId || group.CategoryId;
        const categoryName = group.categoryName || group.CategoryName;
        const models = group.models || group.Models || [];
        
        const hasAvailableModels = models.some(model => {
          const availableCount = model.availableCount || model.AvailableCount || 0;
          return availableCount > 0;
        });
        
        if (categoryId && categoryName && hasAvailableModels && !categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            categoryId: categoryId,
            id: categoryId,
            categoryName: categoryName,
            name: categoryName,
            description: group.categoryDescription || group.CategoryDescription
          });
        }
      });
      return Array.from(categoryMap.values());
    }
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.categories)) return data.categories;
    return [];
  }, [categoriesResponse]);

  // ============== EFFECTS ==============

  // Fetch models grouped by make when category is selected (for step 3)
  useEffect(() => {
    if (wizardSelectedCategory && wizardStep >= 3 && currentCompanyId && wizardPickupDate && wizardReturnDate) {
      setIsLoadingWizardModels(true);
      const categoryId = wizardSelectedCategory.categoryId || wizardSelectedCategory.id;
      const locationId = wizardSelectedLocation?.locationId || wizardSelectedLocation?.id || null;
      
      apiService.getModelsGroupedByCategory(currentCompanyId, locationId, wizardPickupDate, wizardReturnDate, wizardPickupTime, wizardReturnTime)
        .then(response => {
          const data = response?.data || response;
          const groups = Array.isArray(data) ? data : (data?.items || []);
          
          const categoryGroup = groups.find(group => {
            const groupCategoryId = group.categoryId || group.CategoryId;
            return groupCategoryId === categoryId;
          });
          
          if (!categoryGroup) {
            setWizardModelsByMake({});
            setIsLoadingWizardModels(false);
            return;
          }
          
          const models = categoryGroup.models || categoryGroup.Models || [];
          // Filter to only show models with available vehicles
          const availableModels = models.filter(model => {
            const availableCount = model.availableCount || model.AvailableCount || 0;
            return availableCount > 0;
          });
          
          console.log('Available models in category:', availableModels.length);
          
          const groupedByMake = availableModels.reduce((acc, model) => {
            const make = (model.make || model.Make || '').toUpperCase().trim();
            const modelName = model.modelName || model.ModelName || model.model || model.Model || '';
            const modelId = model.id || model.Id || model.modelId || model.ModelId;
            
            if (!make || !modelName) return acc;
            
            if (!acc[make]) acc[make] = [];
            
            const existingModel = acc[make].find(m => {
              const mId = m.id || m.Id || m.modelId || m.ModelId;
              if (modelId && mId && mId === modelId) return true;
              const mName = (m.modelName || m.ModelName || m.model || m.Model || '').toUpperCase().trim();
              return mName === modelName.toUpperCase().trim();
            });
            
            if (!existingModel) acc[make].push(model);
            return acc;
          }, {});
          
          Object.keys(groupedByMake).forEach(make => {
            groupedByMake[make].sort((a, b) => {
              const nameA = (a.modelName || a.ModelName || a.model || a.Model || '').toUpperCase();
              const nameB = (b.modelName || b.ModelName || b.model || b.Model || '').toUpperCase();
              return nameA.localeCompare(nameB);
            });
            if (groupedByMake[make].length === 0) delete groupedByMake[make];
          });
          
          setWizardModelsByMake(groupedByMake);
          
          const makeKeys = Object.keys(groupedByMake);
          if (makeKeys.length === 1) {
            setWizardExpandedMakes(new Set([makeKeys[0]]));
          } else {
            setWizardExpandedMakes(new Set());
          }
        })
        .catch(error => {
          console.error('Error fetching models:', error);
          toast.error(t('admin.modelsLoadError', 'Failed to load vehicle models'));
        })
        .finally(() => setIsLoadingWizardModels(false));
    } else {
      setWizardModelsByMake({});
      setWizardSelectedMake(null);
      setWizardSelectedModel(null);
      setWizardExpandedMakes(new Set());
    }
  }, [wizardSelectedCategory, wizardStep, currentCompanyId, wizardPickupDate, wizardReturnDate, wizardPickupTime, wizardReturnTime, wizardSelectedLocation, t]);

  // Load additional services for step 4
  useEffect(() => {
    if (wizardStep === 4 && currentCompanyId) {
      setIsLoadingWizardServices(true);
      apiService.getCompanyServices(currentCompanyId)
        .then(response => {
          const data = response?.data || response;
          const services = Array.isArray(data) ? data : (data?.items || []);
          setWizardAdditionalServices(services);
          
          // Auto-select mandatory services
          const mandatoryServices = services.filter(s => s.isMandatory || s.IsMandatory);
          if (mandatoryServices.length > 0) {
            setWizardSelectedServices(prev => {
              const existing = [...prev];
              mandatoryServices.forEach(service => {
                const serviceId = service.additionalServiceId || service.id;
                if (!existing.find(s => (s.service?.additionalServiceId || s.service?.id) === serviceId)) {
                  existing.push({ id: serviceId, service, quantity: 1 });
                }
              });
              return existing;
            });
          }
        })
        .catch(error => {
          console.error('Error loading services:', error);
        })
        .finally(() => setIsLoadingWizardServices(false));
    }
  }, [wizardStep, currentCompanyId]);

  // ============== CALCULATIONS ==============

  const calculateWizardDays = useMemo(() => {
    if (!wizardPickupDate || !wizardReturnDate) return 0;
    const pickup = new Date(wizardPickupDate);
    const returnD = new Date(wizardReturnDate);
    const diffTime = Math.abs(returnD - pickup);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 1);
  }, [wizardPickupDate, wizardReturnDate]);

  const calculateWizardVehicleTotal = useMemo(() => {
    if (!wizardSelectedModel) return 0;
    const dailyRate = wizardSelectedModel.dailyRate || wizardSelectedModel.DailyRate || 0;
    return dailyRate * calculateWizardDays;
  }, [wizardSelectedModel, calculateWizardDays]);

  const calculateWizardServicesTotal = useMemo(() => {
    if (wizardSelectedServices.length === 0) return 0;
    return wizardSelectedServices.reduce((total, item) => {
      const service = item.service || item;
      const price = service.basePrice || service.BasePrice || service.price || 0;
      const quantity = item.quantity || 1;
      const pricingType = service.pricingType || service.PricingType || 'PerRental';
      if (pricingType === 'PerDay') {
        return total + (price * calculateWizardDays * quantity);
      }
      return total + (price * quantity);
    }, 0);
  }, [wizardSelectedServices, calculateWizardDays]);

  const calculateWizardGrandTotal = useMemo(() => {
    return calculateWizardVehicleTotal + calculateWizardServicesTotal;
  }, [calculateWizardVehicleTotal, calculateWizardServicesTotal]);

  // ============== HANDLERS ==============

  const handleFindOrCreateCustomer = useCallback(async () => {
    if (!wizardCustomerEmail || !wizardCustomerEmail.includes('@')) {
      toast.error(t('admin.invalidEmail', 'Please enter a valid email address'));
      return;
    }
    
    if (!wizardPickupDate || !wizardReturnDate) {
      toast.error(t('admin.selectDates', 'Please select pickup and return dates'));
      return;
    }
    
    if (new Date(wizardReturnDate) <= new Date(wizardPickupDate)) {
      toast.error(t('admin.invalidDateRange', 'Return date must be after pickup date'));
      return;
    }
    
    setWizardSearchingCustomer(true);
    try {
      const response = await apiService.getCustomerByEmail(wizardCustomerEmail);
      const customer = response?.data || response;
      if (customer && customer.customerId) {
        setWizardCustomer(customer);
        setTimeout(() => setWizardStep(2), 500);
      } else {
        throw new Error('Customer not found');
      }
    } catch (error) {
      const isNotFound = error.response?.status === 404 || error.message?.includes('not found');
      if (!isNotFound) {
        console.warn('Customer lookup error:', error);
      }
      // Show customer creation wizard
      setShowCustomerWizard(true);
    } finally {
      setWizardSearchingCustomer(false);
    }
  }, [wizardCustomerEmail, wizardPickupDate, wizardReturnDate, t]);

  // Callback when customer is created from AdminCustomerWizard
  const handleCustomerCreated = useCallback((customer) => {
    setWizardCustomer(customer);
    setWizardCustomerEmail(customer.email || '');
    setTimeout(() => setWizardStep(2), 500);
  }, []);

  const handleCreateReservation = useCallback(async () => {
    if (!wizardCustomer || !wizardCustomer.customerId) {
      toast.error(t('admin.customerRequired', 'Customer is required'));
      return;
    }
    
    if (!wizardSelectedModel) {
      toast.error(t('admin.modelRequired', 'Model is required'));
      return;
    }
    
    setIsCreatingReservation(true);
    try {
      const make = wizardSelectedMake || wizardSelectedModel.make || wizardSelectedModel.Make || '';
      const model = wizardSelectedModel.modelName || wizardSelectedModel.ModelName || '';
      const dailyRate = wizardSelectedModel.dailyRate || wizardSelectedModel.DailyRate || 0;
      const locationId = wizardSelectedLocation?.locationId || wizardSelectedLocation?.id || null;
      
      // Get first available vehicle (same approach as BookPage)
      let vehicleId = null;
      try {
        const response = await apiService.getFirstAvailableVehicle({
          make,
          model,
          companyId: currentCompanyId,
          status: 'Available',
          pageSize: 1
        });
        
        const data = response?.data?.result || response?.data || response;
        let list = [];
        
        if (Array.isArray(data?.items)) list = data.items;
        else if (Array.isArray(data?.data)) list = data.data;
        else if (Array.isArray(data?.vehicles)) list = data.vehicles;
        else if (Array.isArray(data?.Vehicles)) list = data.Vehicles;
        else if (Array.isArray(data)) list = data;
        
        const firstVehicle = list[0];
        if (firstVehicle) {
          vehicleId = firstVehicle.vehicle_id || firstVehicle.vehicleId || firstVehicle.id || firstVehicle.VehicleId || firstVehicle.Id;
        }
      } catch (error) {
        console.error('Error fetching first available vehicle:', error);
      }
      
      if (!vehicleId) {
        toast.error(t('admin.noVehiclesAvailable', 'No vehicles available for this model on selected dates'));
        setIsCreatingReservation(false);
        return;
      }
      
      console.log('Creating reservation:', { 
        vehicleId,
        make,
        model,
        locationId, 
        pickupDate: wizardPickupDate, 
        returnDate: wizardReturnDate 
      });
      
      const bookingData = {
        customerId: wizardCustomer.customerId || wizardCustomer.id,
        vehicleId: vehicleId,
        companyId: currentCompanyId,
        pickupDate: wizardPickupDate,
        returnDate: wizardReturnDate,
        pickupTime: wizardPickupTime,
        returnTime: wizardReturnTime,
        pickupLocation: wizardSelectedLocation?.name || wizardSelectedLocation?.locationName || null,
        returnLocation: wizardSelectedLocation?.name || wizardSelectedLocation?.locationName || null,
        locationId: locationId,
        dailyRate: dailyRate,
        taxAmount: 0,
        insuranceAmount: 0,
        additionalFees: calculateWizardServicesTotal
      };
      
      console.log('Booking data:', bookingData);
      
      const bookingResponse = await apiService.createBooking(bookingData);
      const booking = bookingResponse?.data || bookingResponse;
      const bookingId = booking.id || booking.bookingId;
      
      // Add selected services
      if (wizardSelectedServices.length > 0 && bookingId) {
        for (const selectedService of wizardSelectedServices) {
          const service = selectedService.service || selectedService;
          const serviceId = service.additionalServiceId || service.id;
          
          try {
            await apiService.addServiceToBooking({
              bookingId: bookingId,
              additionalServiceId: serviceId,
              quantity: selectedService.quantity || 1
            });
          } catch (serviceError) {
            console.error('Error adding service:', serviceError);
          }
        }
      }
      
      queryClient.invalidateQueries(['companyBookings', currentCompanyId]);
      queryClient.invalidateQueries(['vehicleCategories']);
      toast.success(t('admin.reservationCreated', 'Reservation created successfully'));
      navigate(`/admin?tab=reservations&bookingId=${bookingId}&payment=true`);
      
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error(error.response?.data?.message || t('admin.reservationCreateError', 'Failed to create reservation'));
    } finally {
      setIsCreatingReservation(false);
    }
  }, [wizardCustomer, wizardSelectedModel, wizardSelectedMake, wizardSelectedLocation, 
      currentCompanyId, wizardPickupDate, wizardReturnDate, wizardPickupTime, wizardReturnTime,
      wizardSelectedServices, calculateWizardServicesTotal, queryClient, navigate, t]);

  const handleBack = useCallback(() => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    } else {
      navigate('/admin?tab=reservations');
    }
  }, [wizardStep, navigate]);

  // ============== RENDER ==============

  if (!isAuthenticated || !currentCompanyId) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-gray-600">{t('common.loading', 'Loading...')}</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/admin?tab=reservations')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('admin.createReservation', 'Create Reservation')}
          </h1>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center mb-8 overflow-x-auto pb-2">
          {[
            { step: 1, label: t('admin.customerAndDates', 'Customer & Dates') },
            { step: 2, label: t('admin.category', 'Category') },
            { step: 3, label: t('admin.makeAndModel', 'Make & Model') },
            { step: 4, label: t('admin.summary', 'Summary') },
          ].map(({ step, label }, index) => (
            <React.Fragment key={step}>
              <div className={`flex items-center ${wizardStep >= step ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  wizardStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}>
                  {step}
                </div>
                <span className="ml-2 font-medium whitespace-nowrap hidden sm:inline">{label}</span>
              </div>
              {index < 3 && (
                <div className={`flex-1 h-1 mx-2 min-w-[20px] ${wizardStep > step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          
          {/* Step 1: Customer, Dates, Location */}
          {wizardStep === 1 && (
            <div className="space-y-6">
              {/* Pickup Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.pickupDate', 'Pickup Date')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={wizardPickupDate}
                      onChange={(e) => setWizardPickupDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      value={wizardPickupTime}
                      onChange={(e) => setWizardPickupTime(e.target.value)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="08:00">8:00 AM</option>
                      <option value="08:30">8:30 AM</option>
                      <option value="09:00">9:00 AM</option>
                      <option value="09:30">9:30 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="10:30">10:30 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="11:30">11:30 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="12:30">12:30 PM</option>
                      <option value="13:00">1:00 PM</option>
                      <option value="13:30">1:30 PM</option>
                      <option value="14:00">2:00 PM</option>
                      <option value="14:30">2:30 PM</option>
                      <option value="15:00">3:00 PM</option>
                      <option value="15:30">3:30 PM</option>
                      <option value="16:00">4:00 PM</option>
                      <option value="16:30">4:30 PM</option>
                      <option value="17:00">5:00 PM</option>
                      <option value="17:30">5:30 PM</option>
                      <option value="18:00">6:00 PM</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.returnDate', 'Return Date')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={wizardReturnDate}
                      onChange={(e) => setWizardReturnDate(e.target.value)}
                      min={wizardPickupDate || new Date().toISOString().split('T')[0]}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      value={wizardReturnTime}
                      onChange={(e) => setWizardReturnTime(e.target.value)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="08:00">8:00 AM</option>
                      <option value="08:30">8:30 AM</option>
                      <option value="09:00">9:00 AM</option>
                      <option value="09:30">9:30 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="10:30">10:30 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="11:30">11:30 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="12:30">12:30 PM</option>
                      <option value="13:00">1:00 PM</option>
                      <option value="13:30">1:30 PM</option>
                      <option value="14:00">2:00 PM</option>
                      <option value="14:30">2:30 PM</option>
                      <option value="15:00">3:00 PM</option>
                      <option value="15:30">3:30 PM</option>
                      <option value="16:00">4:00 PM</option>
                      <option value="16:30">4:30 PM</option>
                      <option value="17:00">5:00 PM</option>
                      <option value="17:30">5:30 PM</option>
                      <option value="18:00">6:00 PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Location */}
              {wizardLocations && wizardLocations.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.location', 'Location')}
                  </label>
                  <select
                    value={wizardSelectedLocation?.locationId || wizardSelectedLocation?.id || ''}
                    onChange={(e) => {
                      const locationId = e.target.value;
                      const location = wizardLocations.find(loc => 
                        (loc.locationId || loc.id) === locationId
                      );
                      setWizardSelectedLocation(location || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('admin.allLocations', 'All Locations')}</option>
                    {wizardLocations.map((location) => {
                      const locId = location.locationId || location.id;
                      const locName = location.locationName || location.name || location.address || '';
                      return (
                        <option key={locId} value={locId}>{locName}</option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Customer Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.customerEmail', 'Customer Email')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={wizardCustomerEmail}
                    onChange={(e) => setWizardCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={wizardSearchingCustomer}
                  />
                  <button
                    type="button"
                    onClick={handleFindOrCreateCustomer}
                    disabled={wizardSearchingCustomer || !wizardCustomerEmail || !wizardPickupDate || !wizardReturnDate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {wizardSearchingCustomer 
                      ? t('admin.searching', 'Searching...')
                      : t('admin.findCustomer', 'Find Customer')}
                  </button>
                </div>
              </div>

              {wizardCustomer && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✓ {t('admin.customerSelected', 'Customer selected')}: {wizardCustomer.email}
                    {wizardCustomer.firstName && ` (${wizardCustomer.firstName} ${wizardCustomer.lastName})`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Category Selection */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.selectCategory', 'Select Category')}
              </label>
              {isLoadingCategories ? (
                <div className="text-center py-8">
                  <LoadingSpinner />
                </div>
              ) : categories && categories.length > 0 ? (
                <div className="border border-gray-300 rounded-lg max-h-80 overflow-y-auto">
                  {categories.map((category) => {
                    const categoryId = category.categoryId || category.id;
                    const categoryName = category.categoryName || category.name || '';
                    const isSelected = wizardSelectedCategory?.categoryId === categoryId || wizardSelectedCategory?.id === categoryId;
                    return (
                      <button
                        key={categoryId}
                        type="button"
                        onClick={() => setWizardSelectedCategory(category)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 ${
                          isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                      >
                        <span className="font-medium">{translateCategory(t, categoryName)}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  {t('admin.noCategoriesAvailable', 'No categories available for the selected dates')}
                </p>
              )}
            </div>
          )}

          {/* Step 3: Make & Model Selection */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.selectMakeAndModel', 'Select Make & Model')}
              </label>
              {isLoadingWizardModels ? (
                <div className="text-center py-8">
                  <LoadingSpinner />
                </div>
              ) : Object.keys(wizardModelsByMake).length > 0 ? (
                <div className="border border-gray-300 rounded-lg max-h-96 overflow-y-auto">
                  {Object.entries(wizardModelsByMake).map(([make, models]) => {
                    const isExpanded = wizardExpandedMakes.has(make);
                    return (
                      <div key={make} className="border-b border-gray-200 last:border-b-0">
                        <button
                          type="button"
                          onClick={() => {
                            setWizardExpandedMakes(prev => {
                              const next = new Set(prev);
                              if (next.has(make)) {
                                next.delete(make);
                              } else {
                                next.add(make);
                              }
                              return next;
                            });
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
                        >
                          <span className="font-semibold">{make}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{models.length} models</span>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="bg-white">
                            {models.map((model) => {
                              const modelId = model.id || model.modelId;
                              const modelName = model.modelName || model.ModelName || model.model || '';
                              const dailyRate = model.dailyRate || model.DailyRate || 0;
                              const availableCount = model.availableCount || model.AvailableCount || 0;
                              const isSelected = wizardSelectedModel?.id === modelId || wizardSelectedModel?.modelId === modelId;
                              
                              return (
                                <button
                                  key={modelId}
                                  type="button"
                                  onClick={() => {
                                    console.log('Selected model full object:', JSON.stringify(model, null, 2));
                                    setWizardSelectedMake(make);
                                    setWizardSelectedModel(model);
                                  }}
                                  className={`w-full text-left px-6 py-3 border-b border-gray-100 last:border-b-0 hover:bg-blue-50 ${
                                    isSelected ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''
                                  }`}
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <span className="font-medium">{modelName}</span>
                                      <span className="ml-2 text-sm text-gray-500">({availableCount} available)</span>
                                    </div>
                                    <span className="font-semibold text-blue-600">{formatPrice(dailyRate)}/day</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  {t('admin.noModelsAvailable', 'No models available for this category')}
                </p>
              )}
            </div>
          )}

          {/* Step 4: Summary & Additional Services */}
          {wizardStep === 4 && (
            <div className="space-y-6">
              {/* Booking Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">{t('admin.bookingSummary', 'Booking Summary')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('admin.customer', 'Customer')}:</span>
                    <span className="font-medium">{wizardCustomer?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('admin.dates', 'Dates')}:</span>
                    <span className="font-medium">{wizardPickupDate} {formatTimeAmPm(wizardPickupTime)} → {wizardReturnDate} {formatTimeAmPm(wizardReturnTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('admin.vehicle', 'Vehicle')}:</span>
                    <span className="font-medium">{wizardSelectedMake} {wizardSelectedModel?.modelName || wizardSelectedModel?.ModelName}</span>
                  </div>
                  {wizardSelectedLocation && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('admin.location', 'Location')}:</span>
                      <span className="font-medium">{wizardSelectedLocation.locationName || wizardSelectedLocation.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Services */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('admin.additionalServices', 'Additional Services')}</h3>
                {isLoadingWizardServices ? (
                  <div className="text-center py-4">
                    <LoadingSpinner />
                  </div>
                ) : wizardAdditionalServices.length > 0 ? (
                  <div className="space-y-2">
                    {wizardAdditionalServices.map((service) => {
                      const serviceId = service.additionalServiceId || service.id;
                      const serviceName = service.serviceName || service.name || '';
                      const servicePrice = service.basePrice || service.price || 0;
                      const isMandatory = service.isMandatory || service.IsMandatory;
                      const isSelected = wizardSelectedServices.some(s => {
                        const sId = s.service?.additionalServiceId || s.service?.id || s.id;
                        return sId === serviceId;
                      });
                      
                      return (
                        <label
                          key={serviceId}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                          } ${isMandatory ? 'bg-yellow-50 border-yellow-300' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected || isMandatory}
                            disabled={isMandatory}
                            onChange={() => {
                              if (isMandatory) return;
                              setWizardSelectedServices(prev => {
                                if (isSelected) {
                                  return prev.filter(s => {
                                    const sId = s.service?.additionalServiceId || s.service?.id || s.id;
                                    return sId !== serviceId;
                                  });
                                } else {
                                  return [...prev, { id: serviceId, service, quantity: 1 }];
                                }
                              });
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-900">
                                {serviceName}
                                {isMandatory && (
                                  <span className="ml-2 text-xs text-yellow-600">({t('admin.mandatory', 'Mandatory')})</span>
                                )}
                              </span>
                              <span className="text-sm font-medium text-gray-700">
                                {formatPrice(servicePrice)} / {t('admin.day', 'day')}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{t('admin.noAdditionalServices', 'No additional services available')}</p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {calculateWizardDays} {calculateWizardDays === 1 ? t('admin.day', 'day') : t('admin.days', 'days')} × {formatPrice(wizardSelectedModel?.dailyRate || 0)}
                  </span>
                  <span className="font-medium text-blue-600">
                    {formatPrice(calculateWizardVehicleTotal)}
                  </span>
                </div>
                {calculateWizardServicesTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('admin.additionalServices', 'Additional Services')}:</span>
                    <span className="font-medium text-blue-600">
                      {formatPrice(calculateWizardServicesTotal)}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-300 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-semibold text-gray-900">{t('admin.total', 'Total')}:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatPrice(calculateWizardGrandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-between mt-8 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              {wizardStep > 1 ? t('common.back', 'Back') : t('common.cancel', 'Cancel')}
            </button>
            
            {wizardStep === 2 && (
              <button
                type="button"
                onClick={() => wizardSelectedCategory && setWizardStep(3)}
                disabled={!wizardSelectedCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {t('common.next', 'Next')}
              </button>
            )}
            
            {wizardStep === 3 && (
              <button
                type="button"
                onClick={() => wizardSelectedModel && setWizardStep(4)}
                disabled={!wizardSelectedModel}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {t('common.next', 'Next')}
              </button>
            )}
            
            {wizardStep === 4 && (
              <button
                type="button"
                onClick={handleCreateReservation}
                disabled={isCreatingReservation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isCreatingReservation ? t('common.creating', 'Creating...') : t('admin.createReservation', 'Create Reservation')}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Admin Customer Creation Wizard */}
      <AdminCustomerWizard
        isOpen={showCustomerWizard}
        onClose={() => setShowCustomerWizard(false)}
        onComplete={handleCustomerCreated}
        initialEmail={wizardCustomerEmail}
        companyId={currentCompanyId}
      />
    </PageContainer>
  );
};

export default ReservationWizardPage;
