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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { Building2, Save, X, LayoutDashboard, Car, Users, TrendingUp, Calendar, ChevronDown, ChevronRight, Plus, Edit, Trash2, ChevronLeft, ChevronsLeft, ChevronRight as ChevronRightIcon, ChevronsRight, Search, Upload } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { PageContainer, PageHeader, Card, EmptyState, LoadingSpinner } from '../components/common';
import { getStatesForCountry } from '../utils/statesByCountry';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';

const initialServicePricingModalState = {
  open: false,
  service: null,
  basePrice: 0,
  priceInput: '',
  isMandatory: false,
  submitting: false,
  error: null,
};

const getServiceIdentifier = (service) =>
  service?.additionalServiceId ||
  service?.AdditionalServiceId ||
  service?.additional_service_id ||
  service?.id ||
  service?.Id ||
  service?.serviceId ||
  service?.ServiceId ||
  null;

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isAdmin, isMainAdmin } = useAuth();
  const { companyConfig, formatPrice, currencySymbol, currencyCode } = useCompany();
  const queryClient = useQueryClient();
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isEditingDeposit, setIsEditingDeposit] = useState(false);
  const [securityDepositDraft, setSecurityDepositDraft] = useState('');
  const [isSavingDeposit, setIsSavingDeposit] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({});
  const [currentCompanyId, setCurrentCompanyId] = useState(null);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'design', or 'locations'
  const [activeSection, setActiveSection] = useState('company'); // 'company', 'vehicles', 'reservations', 'bookingSettings', 'customers', 'reports', etc.
  const tabCaptions = useMemo(
    () => ({
      info: t(
        'admin.tabCaptionInfo',
        'Manage core company details, contact information, and financial defaults.'
      ),
      design: t(
        'admin.tabCaptionDesign',
        'Configure branding assets, imagery, and styling used across customer experiences.'
      ),
      locations: t(
        'admin.tabCaptionLocations',
        'Add or edit pickup and return locations that customers can select during booking.'
      ),
    }),
    [t]
  );

  const [uploadProgress, setUploadProgress] = useState({
    video: 0,
    banner: 0,
    logo: 0
  });
  const [isUploading, setIsUploading] = useState({
    video: false,
    banner: false,
    logo: false
  });
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [isEditingService, setIsEditingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editingCompanyServiceId, setEditingCompanyServiceId] = useState(null);
  const [editingServiceBaseInfo, setEditingServiceBaseInfo] = useState(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    description: '',
    price: '',
    serviceType: 'Other',
    isMandatory: false,
    maxQuantity: 1,
    isActive: true
  });
  const [locationFormData, setLocationFormData] = useState({
    locationName: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    phone: '',
    email: '',
    latitude: '',
    longitude: '',
    isPickupLocation: true,
    isReturnLocation: true,
    openingHours: '',
    isActive: true
  });

  // State for vehicle fleet tree
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedMakes, setExpandedMakes] = useState({});
  
  // State for vehicle management pagination
  const [vehiclePage, setVehiclePage] = useState(0);
  const [vehiclePageSize, setVehiclePageSize] = useState(10);
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [vehicleMakeFilter, setVehicleMakeFilter] = useState('');
  const [vehicleModelFilter, setVehicleModelFilter] = useState('');
  const [vehicleYearFilter, setVehicleYearFilter] = useState('');
  const [vehicleLicensePlateFilter, setVehicleLicensePlateFilter] = useState('');
  const [isImportingVehicles, setIsImportingVehicles] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleEditForm, setVehicleEditForm] = useState({});
  const [isCreatingVehicle, setIsCreatingVehicle] = useState(false);
  const [vehicleCreateForm, setVehicleCreateForm] = useState({});
  const [isLookingUpVin, setIsLookingUpVin] = useState(false);
  
  // State for daily rate inputs
  const [dailyRateInputs, setDailyRateInputs] = useState({});
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [servicePricingModal, setServicePricingModal] = useState(initialServicePricingModalState);

  // Bookings filters & pagination
  const [bookingStatusFilter, setBookingStatusFilter] = useState('');
  const [bookingCustomerFilter, setBookingCustomerFilter] = useState('');
  const [bookingDateFrom, setBookingDateFrom] = useState('');
  const [bookingDateTo, setBookingDateTo] = useState('');
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingPageSize, setBookingPageSize] = useState(10);

  useEffect(() => {
    setBookingPage(1);
  }, [bookingStatusFilter, bookingCustomerFilter, bookingDateFrom, bookingDateTo]);

  const formatRate = useCallback(
    (value, options = {}) => {
      if (value === null || value === undefined || value === '') return '—';
      if (typeof value === 'string' && value.toLowerCase() === 'different') return value;
      const numeric = Number(value);
      if (Number.isNaN(numeric)) return value;
      const {
        minimumFractionDigits = 2,
        maximumFractionDigits = 2,
        ...rest
      } = options || {};
      return formatPrice(numeric, { minimumFractionDigits, maximumFractionDigits, ...rest });
    },
    [formatPrice]
  );

  const formatDate = useCallback((value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString();
  }, []);

  const formatBookingStatus = useCallback(
    (status) => {
      if (!status) return t('booking.statusPending', 'Pending');
      const normalized = status.toLowerCase();
      switch (normalized) {
        case 'pending':
          return t('booking.statusPending', 'Pending');
        case 'confirmed':
          return t('booking.statusConfirmed', 'Confirmed');
        case 'active':
          return t('booking.statusActive', 'Active');
        case 'completed':
          return t('booking.statusCompleted', 'Completed');
        case 'cancelled':
        case 'canceled':
          return t('booking.statusCancelled', 'Cancelled');
        default:
          return status;
      }
    },
    [t]
  );

  const getBookingStatusColor = useCallback((status) => {
    if (!status) return 'bg-yellow-100 text-yellow-700';
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-700';
      case 'active':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
      case 'canceled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  }, []);

  const resetServicePricingModal = useCallback(() => {
    setServicePricingModal(initialServicePricingModalState);
  }, []);

  const handleServicePricingInputChange = useCallback((event) => {
    const { value } = event.target;
    setServicePricingModal((prev) => ({
      ...prev,
      priceInput: value,
      error: null,
    }));
  }, []);

  const handleServicePricingMandatoryToggle = useCallback((event) => {
    const { checked } = event.target;
    setServicePricingModal((prev) => ({
      ...prev,
      isMandatory: checked,
    }));
  }, []);

  const submitServicePricingModal = useCallback(async () => {
    if (!servicePricingModal.service) {
      resetServicePricingModal();
      return;
    }

    const parsedPrice = parseFloat(servicePricingModal.priceInput);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setServicePricingModal((prev) => ({
        ...prev,
        error: t('admin.servicePriceModalInvalid'),
      }));
      return;
    }

    try {
      setServicePricingModal((prev) => ({
        ...prev,
        submitting: true,
        error: null,
      }));

      const serviceId = getServiceIdentifier(servicePricingModal.service);

      console.debug('[AdminDashboard] Submitting service pricing modal', {
        companyId: currentCompanyId,
        serviceId,
        parsedPrice,
        isMandatory: servicePricingModal.isMandatory,
      });
      const response = await apiService.addServiceToCompany({
        companyId: currentCompanyId,
        additionalServiceId: serviceId,
        price: parsedPrice,
        isMandatory: servicePricingModal.isMandatory,
        isActive: true,
      });
      const addedService = response?.data || response;
      console.debug('[AdminDashboard] Add service response', addedService);

      setAssignmentOverrides((prev) => ({
        ...prev,
        [serviceId]: true,
      }));

      queryClient.setQueryData(['companyServices', currentCompanyId], (prev) => {
        if (!prev) return prev;

        const normalizeList = (list) => {
          if (!Array.isArray(list)) return list;
          const exists = list.some(
            (item) =>
              (item.additionalServiceId ||
                item.AdditionalServiceId ||
                item.additional_service_id) === serviceId
          );
          if (exists) return list;
          return [...list, addedService];
        };

        if (Array.isArray(prev)) {
          return normalizeList(prev);
        }

        if (prev?.data) {
          return {
            ...prev,
            data: normalizeList(prev.data),
          };
        }

        return prev;
      });

      toast.success(t('admin.serviceAddedToCompany'), {
        position: 'top-center',
        autoClose: 2000,
      });

      resetServicePricingModal();
      queryClient.invalidateQueries(['companyServices', currentCompanyId]);
      queryClient.invalidateQueries(['allAdditionalServices']);
    } catch (error) {
      console.error('Error adding service to company:', error);
      const message = error.response?.data?.message || t('admin.serviceAssignmentFailed');
      setServicePricingModal((prev) => ({
        ...prev,
        error: message,
      }));
    } finally {
      setServicePricingModal((prev) => ({
        ...prev,
        submitting: false,
      }));
    }
  }, [currentCompanyId, queryClient, resetServicePricingModal, servicePricingModal, t]);

  // Get company ID - use only from domain context
  const getCompanyId = useCallback(() => {
    // Only use company from domain context
    return companyConfig?.id || null;
  }, [companyConfig]);

  // Initialize and sync with company from domain context
  useEffect(() => {
    const companyId = getCompanyId();
    setCurrentCompanyId(companyId);
    
    // Invalidate queries when company changes
    if (companyId) {
      queryClient.invalidateQueries(['company']);
      queryClient.invalidateQueries(['vehiclesCount']);
      queryClient.invalidateQueries(['modelsGroupedByCategory']);
    }
  }, [companyConfig?.id, queryClient, getCompanyId]);

  // Fetch current user's company data
  const { data: companyData, isLoading: isLoadingCompany, error: companyError } = useQuery(
    ['company', currentCompanyId],
    () => apiService.getCompany(currentCompanyId),
    {
      enabled: isAuthenticated && isAdmin && !!currentCompanyId,
      onSuccess: (data) => {
        // Handle both axios response format and direct data
        const companyInfo = data?.data || data;
        if (companyInfo && (companyInfo.securityDeposit === undefined || companyInfo.securityDeposit === null)) {
          companyInfo.securityDeposit = 1000;
        }
        setCompanyFormData(companyInfo);
      },
      onError: (error) => {
        console.error('Error loading company:', error);
        toast.error(t('admin.companyLoadFailed'), {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    }
  );

  // Fetch company locations
  const { data: locationsData, isLoading: isLoadingLocations } = useQuery(
    ['locations', currentCompanyId],
    () => apiService.getLocationsByCompany(currentCompanyId),
    {
      enabled: isAuthenticated && isAdmin && !!currentCompanyId && activeTab === 'locations',
      onError: (error) => {
        console.error('Error loading locations:', error);
        toast.error(t('admin.locationsLoadFailed'), {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    }
  );

  const locations = locationsData?.data || locationsData || [];

  // Vehicle update mutation
  const updateVehicleMutation = useMutation(
    ({ vehicleId, data }) => apiService.updateVehicle(vehicleId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vehicles', currentCompanyId]);
        setEditingVehicle(null);
        setVehicleEditForm({});
        toast.success(t('vehicles.updateSuccess') || 'Vehicle updated successfully');
      },
      onError: (error) => {
        console.error('Error updating vehicle:', error);
        toast.error(error.response?.data?.message || t('vehicles.updateError') || 'Failed to update vehicle');
      }
    }
  );

  // Vehicle delete mutation
  const deleteVehicleMutation = useMutation(
    (vehicleId) => apiService.deleteVehicle(vehicleId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vehicles', currentCompanyId]);
        toast.success(t('vehicles.deleteSuccess') || 'Vehicle deleted successfully');
      },
      onError: (error) => {
        console.error('Error deleting vehicle:', error);
        toast.error(error.response?.data?.message || t('vehicles.deleteError') || 'Failed to delete vehicle');
      }
    }
  );

  // Vehicle create mutation
  const createVehicleMutation = useMutation(
    (data) => apiService.createVehicle(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vehicles', currentCompanyId]);
        setIsCreatingVehicle(false);
        setVehicleCreateForm({});
        toast.success(t('vehicles.createSuccess') || 'Vehicle created successfully');
      },
      onError: (error) => {
        console.error('Error creating vehicle:', error);
        toast.error(error.response?.data?.message || t('vehicles.createError') || 'Failed to create vehicle');
      }
    }
  );

  // Handle edit vehicle
  const handleEditVehicle = useCallback((vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleEditForm({
      make: vehicle.Make || vehicle.make || '',
      model: vehicle.Model || vehicle.model || '',
      year: vehicle.Year || vehicle.year || '',
      licensePlate: vehicle.LicensePlate || vehicle.licensePlate || '',
      state: vehicle.State || vehicle.state || '',
      color: vehicle.Color || vehicle.color || '',
      vin: vehicle.Vin || vehicle.vin || '',
      mileage: vehicle.Mileage || vehicle.mileage || 0,
      transmission: vehicle.Transmission || vehicle.transmission || '',
      seats: vehicle.Seats || vehicle.seats || '',
      status: vehicle.Status || vehicle.status || 'Available',
      location: vehicle.Location || vehicle.location || ''
    });
  }, []);

  // Handle delete vehicle
  const handleDeleteVehicle = useCallback((vehicle) => {
    const vehicleId = vehicle.VehicleId || vehicle.vehicleId || vehicle.id || vehicle.Id;
    const licensePlate = vehicle.LicensePlate || vehicle.licensePlate || 'this vehicle';
    
    if (!vehicleId) {
      toast.error(t('vehicles.invalidVehicle') || 'Invalid vehicle ID');
      return;
    }

    if (window.confirm(t('vehicles.confirmDelete') || `Are you sure you want to delete vehicle with license plate ${licensePlate}? This action cannot be undone.`)) {
      deleteVehicleMutation.mutate(vehicleId);
    }
  }, [t, deleteVehicleMutation]);

  // Handle create vehicle
  const handleCreateVehicle = () => {
    if (!currentCompanyId) {
      toast.error(t('vehicles.noCompanySelected') || 'Please select a company first');
      return;
    }

    // Validate required fields
    if (!vehicleCreateForm.make || !vehicleCreateForm.model || !vehicleCreateForm.year || !vehicleCreateForm.licensePlate || !vehicleCreateForm.dailyRate) {
      toast.error(t('vehicles.fillRequiredFields') || 'Please fill in all required fields: Make, Model, Year, License Plate, and Daily Rate');
      return;
    }

    // Prepare create data
    const createData = {
      companyId: currentCompanyId,
      make: vehicleCreateForm.make,
      model: vehicleCreateForm.model,
      year: parseInt(vehicleCreateForm.year) || 0,
      licensePlate: vehicleCreateForm.licensePlate,
      dailyRate: parseFloat(vehicleCreateForm.dailyRate) || 0,
      color: vehicleCreateForm.color || null,
      vin: vehicleCreateForm.vin || null,
      mileage: parseInt(vehicleCreateForm.mileage) || 0,
      transmission: vehicleCreateForm.transmission || null,
      seats: vehicleCreateForm.seats ? parseInt(vehicleCreateForm.seats) : null,
      status: vehicleCreateForm.status || 'Available',
      state: vehicleCreateForm.state || null,
      location: vehicleCreateForm.location || null,
      imageUrl: vehicleCreateForm.imageUrl || null,
      features: vehicleCreateForm.features ? (Array.isArray(vehicleCreateForm.features) ? vehicleCreateForm.features : vehicleCreateForm.features.split(',').map(f => f.trim())) : null
    };

    createVehicleMutation.mutate(createData);
  };

  // Handle VIN lookup
  const handleVinLookup = async () => {
    const vin = vehicleEditForm.vin?.trim().toUpperCase();
    
    if (!vin || vin.length !== 17) {
      toast.error(t('vehicles.invalidVin') || 'Please enter a valid 17-character VIN');
      return;
    }

    setIsLookingUpVin(true);
    try {
      const response = await apiService.lookupVehicleByVin(vin);
      const vehicleData = response.data;
      
      // Auto-populate form fields from VIN lookup response
      setVehicleEditForm(prev => ({
        ...prev,
        // Map make, model, year from API response (case-insensitive)
        ...(vehicleData.make && { make: vehicleData.make }),
        ...(vehicleData.Make && { make: vehicleData.Make }),
        ...(vehicleData.model && { model: vehicleData.model }),
        ...(vehicleData.Model && { model: vehicleData.Model }),
        ...(vehicleData.modelName && { model: vehicleData.modelName }),
        ...(vehicleData.ModelName && { model: vehicleData.ModelName }),
        ...(vehicleData.year && { year: vehicleData.year }),
        ...(vehicleData.Year && { year: vehicleData.Year }),
        // Map other fields
        ...(vehicleData.color && { color: vehicleData.color }),
        ...(vehicleData.Color && { color: vehicleData.Color }),
        ...(vehicleData.transmission && { transmission: vehicleData.transmission }),
        ...(vehicleData.Transmission && { transmission: vehicleData.Transmission }),
        ...(vehicleData.seats && { seats: vehicleData.seats }),
        ...(vehicleData.Seats && { seats: vehicleData.Seats }),
      }));
      
      toast.success(t('vehicles.vinLookupSuccess') || 'Vehicle information retrieved successfully');
    } catch (error) {
      console.error('VIN lookup error:', error);
      toast.error(error.response?.data?.message || t('vehicles.vinLookupError') || 'Failed to lookup VIN information');
    } finally {
      setIsLookingUpVin(false);
    }
  };

  // Handle save vehicle changes
  const handleSaveVehicle = () => {
    if (!editingVehicle) return;

    const vehicleId = editingVehicle.VehicleId || editingVehicle.vehicleId || editingVehicle.id || editingVehicle.Id;
    if (!vehicleId) {
      toast.error(t('vehicles.invalidVehicle') || 'Invalid vehicle ID');
      return;
    }

    const updateData = {};
    
    // Only include fields that have changed or are provided
    if (vehicleEditForm.make !== undefined) updateData.make = vehicleEditForm.make || null;
    if (vehicleEditForm.model !== undefined) updateData.model = vehicleEditForm.model || null;
    if (vehicleEditForm.year !== undefined) updateData.year = parseInt(vehicleEditForm.year) || null;
    if (vehicleEditForm.licensePlate !== undefined) updateData.licensePlate = vehicleEditForm.licensePlate || null;
    if (vehicleEditForm.state !== undefined) {
      // Ensure we save only the 2-letter code, not the full name
      // If it's longer than 2 characters, try to find the code from states list
      let stateCode = vehicleEditForm.state || null;
      if (stateCode && stateCode.length > 2 && statesForCompanyCountry.length > 0) {
        // Try to find matching state by name and get its code
        const matchingState = statesForCompanyCountry.find(s => 
          s.name.toLowerCase() === stateCode.toLowerCase() || 
          s.code.toLowerCase() === stateCode.toLowerCase()
        );
        if (matchingState) {
          stateCode = matchingState.code;
        } else {
          // If no match found and it's longer than 2 chars, use first 2 chars uppercase
          stateCode = stateCode.substring(0, 2).toUpperCase();
        }
      } else if (stateCode && stateCode.length === 2) {
        // Ensure it's uppercase
        stateCode = stateCode.toUpperCase();
      }
      updateData.state = stateCode || null;
    }
    if (vehicleEditForm.color !== undefined) updateData.color = vehicleEditForm.color || null;
    if (vehicleEditForm.vin !== undefined) updateData.vin = vehicleEditForm.vin || null;
    if (vehicleEditForm.mileage !== undefined) updateData.mileage = parseInt(vehicleEditForm.mileage) || null;
    if (vehicleEditForm.transmission !== undefined) updateData.transmission = vehicleEditForm.transmission || null;
    if (vehicleEditForm.seats !== undefined) updateData.seats = parseInt(vehicleEditForm.seats) || null;
    if (vehicleEditForm.status !== undefined) updateData.status = vehicleEditForm.status;
    if (vehicleEditForm.location !== undefined) updateData.location = vehicleEditForm.location || null;

    updateVehicleMutation.mutate({ vehicleId, data: updateData });
  };

  // Fetch models grouped by category for vehicle fleet
  // Load on dashboard open (not just when vehicles section is active) so filters have data
  const { data: modelsGroupedData, isLoading: isLoadingModels } = useQuery(
    ['modelsGroupedByCategory', currentCompanyId],
    () => apiService.getModelsGroupedByCategory(currentCompanyId),
    {
      enabled: isAuthenticated && isAdmin && !!currentCompanyId,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  // Wrap modelsGrouped in useMemo to fix ESLint exhaustive-deps warning
  const modelsGrouped = useMemo(() => {
    // Handle different response structures
    let allModels = modelsGroupedData;
    
    // If response has a data property
    if (allModels?.data) {
      allModels = allModels.data;
    }
    
    // If still wrapped in result property (standardized API response)
    if (allModels?.result) {
      allModels = allModels.result;
    }
    
    // Ensure it's an array
    if (!Array.isArray(allModels)) {
      return [];
    }
    
    return allModels;
  }, [modelsGroupedData]);

  // Fetch vehicles list for vehicle management - load on dashboard open
  // Use query parameters: /vehicles?companyId=xxx&page=1&pageSize=20&make=xxx&model=xxx&year=xxx&licensePlate=xxx
  const { data: vehiclesListData, isLoading: isLoadingVehiclesList } = useQuery(
    ['vehicles', currentCompanyId, vehiclePage, vehiclePageSize, vehicleMakeFilter, vehicleModelFilter, vehicleYearFilter, vehicleLicensePlateFilter],
    () => {
      const params = {
        companyId: currentCompanyId,  // Query parameter: ?companyId=xxx
        page: vehiclePage + 1,       // Query parameter: &page=1
        pageSize: vehiclePageSize    // Query parameter: &pageSize=20
      };
      
      // Add make filter if selected
      if (vehicleMakeFilter) {
        params.make = vehicleMakeFilter;
      }
      
      // Add model filter if selected
      if (vehicleModelFilter) {
        params.model = vehicleModelFilter;
      }
      
      // Add year filter if selected
      if (vehicleYearFilter) {
        params.year = vehicleYearFilter;
      }
      
      // Add license plate filter if entered
      if (vehicleLicensePlateFilter) {
        params.licensePlate = vehicleLicensePlateFilter;
      }
      
      return apiService.getVehicles(params);
    },
    {
      enabled: isAuthenticated && isAdmin && !!currentCompanyId,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  // Extract vehicles list - handle both standardized response and direct response
  const vehiclesList = useMemo(() => {
    let data = vehiclesListData;
    
    // If response has a data property (axios response)
    if (data?.data) {
      data = data.data;
    }
    
    // If still wrapped in result property (standardized API response)
    if (data?.result) {
      data = data.result;
    }
    
    // Extract vehicles array from the response structure
    const vehicles = data?.Vehicles || data?.vehicles || (Array.isArray(data) ? data : []);
    
    return Array.isArray(vehicles) ? vehicles : [];
  }, [vehiclesListData]);

  // Extract unique makes and models from ALL models (not just current vehicles)
  // Use modelsGrouped to get all available makes and models from the models table
  const { uniqueMakes, uniqueModels } = useMemo(() => {
    const makes = new Set();
    const models = new Set();
    
    // Extract from modelsGrouped (all models in database)
    if (modelsGrouped && Array.isArray(modelsGrouped)) {
      modelsGrouped.forEach(categoryGroup => {
        if (categoryGroup.models && Array.isArray(categoryGroup.models)) {
          categoryGroup.models.forEach(model => {
            const make = model.make || model.Make;
            const modelName = model.modelName || model.ModelName || model.model || model.Model;
            
            if (make) {
              makes.add(make);
            }
            if (modelName) {
              models.add(modelName);
            }
          });
        }
      });
    }
    
    return {
      uniqueMakes: Array.from(makes).sort(),
      uniqueModels: Array.from(models).sort()
    };
  }, [modelsGrouped]);

  // Reset page when filters change
  useEffect(() => {
    setVehiclePage(0);
  }, [vehicleMakeFilter, vehicleModelFilter, vehicleYearFilter, vehicleLicensePlateFilter]);

  // Reset model filter when make filter changes
  useEffect(() => {
    if (vehicleMakeFilter) {
      setVehicleModelFilter('');
    }
  }, [vehicleMakeFilter]);

  // Handle vehicle import from file
  const handleVehicleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type (CSV or Excel)
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      toast.error(t('vehicles.invalidImportFile') || 'Invalid file type. Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      event.target.value = '';
      return;
    }

    // Validate file size (10 MB)
    if (file.size > 10_485_760) {
      toast.error(t('vehicles.fileTooLarge') || 'File size exceeds 10 MB limit');
      event.target.value = '';
      return;
    }

    setIsImportingVehicles(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', currentCompanyId || '');

      // Call vehicle import API endpoint
      const response = await apiService.importVehicles(formData);
      const importedCount = response.data?.count || response.data?.result?.count || 0;
      toast.success(t('vehicles.importSuccess') || `Successfully imported ${importedCount} vehicles`);
      queryClient.invalidateQueries(['vehicles', currentCompanyId]);
      
      event.target.value = ''; // Reset file input
    } catch (error) {
      console.error('Error importing vehicles:', error);
      toast.error(error.response?.data?.message || t('vehicles.importError') || 'Failed to import vehicles');
    } finally {
      setIsImportingVehicles(false);
      event.target.value = ''; // Reset file input
    }
  };

  // Filter vehicles based on search term (case-insensitive)
  const filteredVehiclesList = useMemo(() => {
    if (!vehicleSearchTerm.trim()) {
      return vehiclesList;
    }
    
    // Convert search term to lowercase for case-insensitive matching
    const searchLower = vehicleSearchTerm.toLowerCase().trim();
    
    return vehiclesList.filter(vehicle => {
      // Convert all fields to lowercase for case-insensitive comparison
      const licensePlate = (vehicle.LicensePlate || vehicle.licensePlate || '').toLowerCase();
      const make = (vehicle.Make || vehicle.make || '').toLowerCase();
      const model = (vehicle.Model || vehicle.model || '').toLowerCase();
      const color = (vehicle.Color || vehicle.color || '').toLowerCase();
      const status = (vehicle.Status || vehicle.status || '').toLowerCase();
      const year = String(vehicle.Year || vehicle.year || '').toLowerCase();
      
      // Search in individual fields (case-insensitive)
      const matchesIndividual = licensePlate.includes(searchLower) ||
                               make.includes(searchLower) ||
                               model.includes(searchLower) ||
                               color.includes(searchLower) ||
                               status.includes(searchLower) ||
                               year.includes(searchLower);
      
      // Also search for "make model" combinations (e.g., "Honda Civic", "Toyota Corolla")
      // Both combinations checked for flexibility
      const makeModel = `${make} ${model}`.toLowerCase();
      const modelMake = `${model} ${make}`.toLowerCase();
      const matchesCombined = makeModel.includes(searchLower) || 
                             modelMake.includes(searchLower);
      
      return matchesIndividual || matchesCombined;
    });
  }, [vehiclesList, vehicleSearchTerm]);

  // Calculate total vehicle count and available count from models
  const { vehicleCount, availableCount } = useMemo(() => {
    let totalVehicles = 0;
    let totalAvailable = 0;
    
    if (modelsGrouped && Array.isArray(modelsGrouped)) {
      modelsGrouped.forEach(categoryGroup => {
        if (categoryGroup.models && Array.isArray(categoryGroup.models)) {
          categoryGroup.models.forEach(model => {
            const vCount = (model.vehicleCount || model.VehicleCount || 0);
            const aCount = (model.availableCount || model.AvailableCount || 0);
            totalVehicles += vCount;
            totalAvailable += aCount;
          });
        }
      });
    }
    
    return { vehicleCount: totalVehicles, availableCount: totalAvailable };
  }, [modelsGrouped]);

  // Check if currently editing - this will disable other actions
  const isEditing = isEditingCompany;

  // Update company mutation
  const updateCompanyMutation = useMutation(
    (data) => apiService.updateCompany(currentCompanyId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['company', currentCompanyId]);
        toast.success(t('admin.companyUpdated'), {
          position: 'top-center',
          autoClose: 3000,
        });
        setIsEditingCompany(false);
      },
      onError: (error) => {
        console.error('Error updating company:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        console.error('Error message:', error.message);
        
        const errorMessage = error.response?.data?.message 
          || error.response?.data 
          || t('admin.companyUpdateFailed');
          
        toast.error(typeof errorMessage === 'string' ? errorMessage : t('admin.companyUpdateFailed'), {
          position: 'top-center',
          autoClose: 5000,
        });
      }
    }
  );

  // Location mutations
  const createLocationMutation = useMutation(
    (data) => apiService.createLocation({ ...data, companyId: currentCompanyId }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['locations', currentCompanyId]);
        toast.success(t('admin.locationCreated'), {
          position: 'top-center',
          autoClose: 3000,
        });
        setIsEditingLocation(false);
        setEditingLocationId(null);
        setLocationFormData({
          locationName: '',
          address: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
          phone: '',
          email: '',
          latitude: '',
          longitude: '',
          isPickupLocation: true,
          isReturnLocation: true,
          openingHours: '',
          isActive: true
        });
      },
      onError: (error) => {
        console.error('Error creating location:', error);
        toast.error(t('admin.locationCreateFailed'), {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    }
  );

  const updateLocationMutation = useMutation(
    (data) => apiService.updateLocation(editingLocationId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['locations', currentCompanyId]);
        toast.success(t('admin.locationUpdated'), {
          position: 'top-center',
          autoClose: 3000,
        });
        setIsEditingLocation(false);
        setEditingLocationId(null);
        setLocationFormData({
          locationName: '',
          address: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
          phone: '',
          email: '',
          latitude: '',
          longitude: '',
          isPickupLocation: true,
          isReturnLocation: true,
          openingHours: '',
          isActive: true
        });
      },
      onError: (error) => {
        console.error('Error updating location:', error);
        toast.error(t('admin.locationUpdateFailed'), {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    }
  );

  const deleteLocationMutation = useMutation(
    (locationId) => apiService.deleteLocation(locationId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['locations', currentCompanyId]);
        toast.success(t('admin.locationDeleted'), {
          position: 'top-center',
          autoClose: 3000,
        });
      },
      onError: (error) => {
        console.error('Error deleting location:', error);
        toast.error(t('admin.locationDeleteFailed'), {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    }
  );

  // Fetch all additional services (not filtered by company - to show full list)
  const { data: allAdditionalServicesResponse, isLoading: isLoadingAllServices } = useQuery(
    ['allAdditionalServices'],
    () => apiService.getAdditionalServices({}),
    {
      enabled: isAuthenticated && isAdmin && activeSection === 'bookingSettings',
      onError: (error) => {
        console.error('Error loading all additional services:', error);
      }
    }
  );

  // Fetch company services for current company (to know which services are assigned)
  const { data: companyServicesResponse, isLoading: isLoadingCompanyServices } = useQuery(
    ['companyServices', currentCompanyId],
    () => apiService.getCompanyServices(currentCompanyId),
    {
      enabled: isAuthenticated && isAdmin && !!currentCompanyId && activeSection === 'bookingSettings',
      onError: (error) => {
        console.error('Error loading company services:', error);
      }
    }
  );

  const { data: companyBookingsResponse, isLoading: isLoadingBookings, error: bookingsError } = useQuery(
    [
      'companyBookings',
      currentCompanyId,
      bookingStatusFilter,
      bookingCustomerFilter,
      bookingDateFrom,
      bookingDateTo,
      bookingPage,
      bookingPageSize,
      activeSection,
    ],
    () =>
      apiService.getCompanyBookings(currentCompanyId, {
        status: bookingStatusFilter || undefined,
        customer: bookingCustomerFilter || undefined,
        pickupStart: bookingDateFrom || undefined,
        pickupEnd: bookingDateTo || undefined,
        page: bookingPage,
        pageSize: bookingPageSize,
      }),
    {
      enabled: isAuthenticated && !!currentCompanyId && activeSection === 'reservations',
      keepPreviousData: true,
      onError: (error) => {
        console.error('Error loading company bookings:', error);
      },
    }
  );

  const allAdditionalServices = allAdditionalServicesResponse?.data || allAdditionalServicesResponse || [];
  const companyServices = useMemo(() => {
    const raw = companyServicesResponse?.data || companyServicesResponse || [];
    return Array.isArray(raw) ? raw : [];
  }, [companyServicesResponse]);

  const bookingsData = useMemo(() => {
    const payload = companyBookingsResponse?.data || companyBookingsResponse;
    if (!payload) {
      return { items: [], totalCount: 0, page: bookingPage, pageSize: bookingPageSize };
    }

    const items = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.Bookings)
        ? payload.Bookings
        : Array.isArray(payload?.bookings)
          ? payload.bookings
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];

    const totalCount = payload?.totalCount ?? payload?.TotalCount ?? items.length;
    const pageValue = payload?.page ?? payload?.Page ?? bookingPage;
    const pageSizeValue = payload?.pageSize ?? payload?.PageSize ?? bookingPageSize;

    return {
      items,
      totalCount,
      page: pageValue,
      pageSize: pageSizeValue,
    };
  }, [companyBookingsResponse, bookingPage, bookingPageSize]);

  const filteredBookings = bookingsData.items;
  const totalBookings = bookingsData.totalCount;
  const totalBookingPages = bookingsData.pageSize
    ? Math.max(1, Math.ceil(totalBookings / bookingsData.pageSize))
    : 1;

  useEffect(() => {
    if (bookingPage > totalBookingPages) {
      setBookingPage(totalBookingPages || 1);
    }
  }, [bookingPage, totalBookingPages]);

  const [assignmentOverrides, setAssignmentOverrides] = useState({});

  useEffect(() => {
    setAssignmentOverrides({});
  }, [companyServicesResponse, currentCompanyId]);
  
  // Create a Set of service IDs that are assigned to the company for quick lookup
  const assignedServiceIds = new Set(
    companyServices.map(cs => cs.additionalServiceId || cs.AdditionalServiceId || cs.additional_service_id)
  );

  const companyServicesMap = useMemo(() => {
    const map = new Map();
    const duplicates = new Set();

    companyServices.forEach((cs) => {
      const id = cs.additionalServiceId || cs.AdditionalServiceId || cs.additional_service_id;
      if (id === undefined || id === null) return;

      if (map.has(id)) {
        duplicates.add(id);
        return;
      }

      map.set(id, cs);
    });

    if (duplicates.size > 0) {
      console.warn('[AdminDashboard] Multiple company service entries found for additionalServiceIds:', Array.from(duplicates));
    }

    return map;
  }, [companyServices]);

  // Additional Service mutations (for creating new services)
  const createServiceMutation = useMutation(
    (data) => apiService.createAdditionalService({ ...data, companyId: currentCompanyId }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['allAdditionalServices']);
        toast.success(t('admin.serviceCreated'), {
          position: 'top-center',
          autoClose: 2000,
        });
        setIsEditingService(false);
        setEditingServiceId(null);
        setServiceFormData({
          name: '',
          description: '',
          price: '',
          serviceType: 'Other',
          isMandatory: false,
          maxQuantity: 1,
          isActive: true
        });
      },
      onError: (error) => {
        console.error('Error creating service:', error);
        toast.error(error.response?.data?.message || t('admin.serviceCreateFailed'), {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    }
  );

  // Update Additional Service mutation (for editing base services)
  const updateAdditionalServiceMutation = useMutation(
    ({ serviceId, data }) => apiService.updateAdditionalService(serviceId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['allAdditionalServices']);
        queryClient.invalidateQueries(['additionalServices', currentCompanyId]);
        setIsEditingService(false);
        setEditingServiceId(null);
        setEditingCompanyServiceId(null);
        setEditingServiceBaseInfo(null);
        setServiceFormData({
          name: '',
          description: '',
          price: '',
          serviceType: 'Other',
          isMandatory: false,
          maxQuantity: 1,
          isActive: true
        });
        toast.success(t('admin.serviceUpdated'), {
          position: 'top-center',
          autoClose: 2000,
        });
      },
      onError: (error) => {
        console.error('Error updating additional service:', error);
        toast.error(error.response?.data?.message || t('admin.serviceUpdateFailed'), {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    }
  );

  // Company Service mutation (for editing company-specific settings)
  const updateCompanyServiceMutation = useMutation(
    ({ companyId, serviceId, data }) => apiService.updateCompanyService(companyId, serviceId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyServices', currentCompanyId]);
        queryClient.invalidateQueries(['allAdditionalServices']);
        setIsEditingService(false);
        setEditingServiceId(null);
        setEditingCompanyServiceId(null);
        setEditingServiceBaseInfo(null);
        setServiceFormData({
          name: '',
          description: '',
          price: '',
          serviceType: 'Other',
          isMandatory: false,
          maxQuantity: 1,
          isActive: true
        });
        toast.success(t('admin.serviceUpdated'), {
          position: 'top-center',
          autoClose: 2000,
        });
      },
      onError: (error) => {
        console.error('Error updating company service:', error);
        toast.error(error.response?.data?.message || t('admin.serviceUpdateFailed'), {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    }
  );

  const deleteServiceMutation = useMutation(
    (serviceId) => apiService.deleteAdditionalService(serviceId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['additionalServices', currentCompanyId]);
        toast.success(t('admin.serviceDeleted'), {
          position: 'top-center',
          autoClose: 3000,
        });
      },
      onError: (error) => {
        console.error('Error deleting service:', error);
        toast.error(t('admin.serviceDeleteFailed'), {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    }
  );

  // const { data: dashboardData, isLoading } = useQuery(
  //   'adminDashboard',
  //   () => apiService.getAdminDashboard(),
  //   {
  //     enabled: isAuthenticated && isAdmin
  //   }
  // );

  // Temporary defaults while API endpoint is not implemented
  const isLoading = false;

  const handleCompanyInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'securityDeposit') {
      const numericValue = value === '' ? '' : parseFloat(value);
      setCompanyFormData(prev => ({
        ...prev,
        securityDeposit: value === '' || Number.isNaN(numericValue) ? '' : numericValue
      }));
      return;
    }

    setCompanyFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    
    // Only send fields that the API expects (exclude read-only and navigation properties)
    const companyData = {
      companyName: companyFormData.companyName,
      email: companyFormData.email || null,
      website: companyFormData.website || null,
      taxId: companyFormData.taxId || null,
      logoLink: companyFormData.logoLink || null,
      bannerLink: companyFormData.bannerLink || null,
      videoLink: companyFormData.videoLink || null,
      backgroundLink: companyFormData.backgroundLink || null,
      about: companyFormData.about || null,
      bookingIntegrated: companyFormData.bookingIntegrated || null,
      companyPath: companyFormData.companyPath || null,
      subdomain: companyFormData.subdomain || null,
      primaryColor: companyFormData.primaryColor || null,
      secondaryColor: companyFormData.secondaryColor || null,
      logoUrl: companyFormData.logoUrl || null,
      faviconUrl: companyFormData.faviconUrl || null,
      customCss: companyFormData.customCss || null,
      country: companyFormData.country || null,
      securityDeposit:
        companyFormData.securityDeposit === '' || companyFormData.securityDeposit == null
          ? null
          : Number(companyFormData.securityDeposit)
    };
    
    // Auto-add https:// to URLs if missing
    if (companyData.website && !companyData.website.match(/^https?:\/\//i)) {
      companyData.website = 'https://' + companyData.website;
    }
    
    if (companyData.logoLink && !companyData.logoLink.match(/^https?:\/\//i)) {
      companyData.logoLink = 'https://' + companyData.logoLink;
    }
    
    if (companyData.bannerLink && !companyData.bannerLink.match(/^https?:\/\//i)) {
      companyData.bannerLink = 'https://' + companyData.bannerLink;
    }
    
    if (companyData.videoLink && !companyData.videoLink.match(/^https?:\/\//i)) {
      companyData.videoLink = 'https://' + companyData.videoLink;
    }
    
    // If no currentCompanyId, create new company; otherwise update
    if (!currentCompanyId) {
      // Create new company
      setIsCreatingCompany(true);
      try {
        const response = await apiService.createCompany(companyData);
        const newCompanyId = response?.data?.companyId || response?.data?.id;
        toast.success(t('admin.companyCreated') || 'Company created successfully');
        setIsEditingCompany(false);
        setIsCreatingCompany(false);
        // Refresh companies list and set the new company as current
        queryClient.invalidateQueries('companies');
        if (newCompanyId) {
          setCurrentCompanyId(newCompanyId);
          queryClient.invalidateQueries(['company', newCompanyId]);
        }
      } catch (error) {
        console.error('Error creating company:', error);
        setIsCreatingCompany(false);
        toast.error(error.response?.data?.message || t('admin.companyCreateFailed') || 'Failed to create company');
      }
    } else {
      // Update existing company
      updateCompanyMutation.mutate(companyData);
    }
  };

  const beginSecurityDepositEdit = () => {
    if (isEditingCompany || !currentCompanyId) return;
    const currentDeposit =
      companyFormData.securityDeposit ??
      actualCompanyData?.securityDeposit ??
      1000;
    setSecurityDepositDraft(
      currentDeposit != null ? currentDeposit.toString() : ''
    );
    setIsEditingDeposit(true);
  };

  const cancelSecurityDepositEdit = () => {
    setIsEditingDeposit(false);
    setSecurityDepositDraft('');
    setIsSavingDeposit(false);
  };

  const handleSecurityDepositSave = () => {
    const numericValue = parseFloat(securityDepositDraft);
    if (Number.isNaN(numericValue) || numericValue < 0) {
      toast.error(
        t('admin.invalidSecurityDeposit', 'Please enter a valid non-negative amount.')
      );
      return;
    }
    setIsSavingDeposit(true);
    updateCompanyMutation.mutate(
      { securityDeposit: numericValue },
      {
        onSuccess: () => {
          setCompanyFormData((prev) => ({
            ...prev,
            securityDeposit: numericValue,
          }));
          cancelSecurityDepositEdit();
        },
        onError: (error) => {
          console.error('Error updating security deposit:', error);
          toast.error(
            error.response?.data?.message ||
              t('admin.securityDepositUpdateFailed', 'Failed to update security deposit.')
          );
        },
        onSettled: () => {
          setIsSavingDeposit(false);
        },
      }
    );
  };

  const handleCancelEdit = () => {
    // If creating new company (no currentCompanyId), reset form
    if (!currentCompanyId) {
      setCompanyFormData({});
      setIsEditingCompany(false);
      setIsCreatingCompany(false);
    } else {
      // If editing existing company, reset to original data
      const companyInfo = companyData?.data || companyData;
      setCompanyFormData(companyInfo);
      setIsEditingCompany(false);
    }
    cancelSecurityDepositEdit();
  };

  // Location handlers
  const handleLocationInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLocationFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddLocation = () => {
    setIsEditingLocation(true);
    setEditingLocationId(null);
    setLocationFormData({
      locationName: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      phone: '',
      email: '',
      latitude: '',
      longitude: '',
      isPickupLocation: true,
      isReturnLocation: true,
      openingHours: '',
      isActive: true
    });
  };

  const handleEditLocation = (location) => {
    setIsEditingLocation(true);
    setEditingLocationId(location.locationId);
    setLocationFormData({
      locationName: location.locationName || '',
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      country: location.country || '',
      postalCode: location.postalCode || '',
      phone: location.phone || '',
      email: location.email || '',
      latitude: location.latitude || '',
      longitude: location.longitude || '',
      isPickupLocation: location.isPickupLocation,
      isReturnLocation: location.isReturnLocation,
      openingHours: location.openingHours || '',
      isActive: location.isActive
    });
  };

  const handleSaveLocation = (e) => {
    e.preventDefault();
    
    const locationData = {
      locationName: locationFormData.locationName,
      address: locationFormData.address || null,
      city: locationFormData.city || null,
      state: locationFormData.state || null,
      country: locationFormData.country || null,
      postalCode: locationFormData.postalCode || null,
      phone: locationFormData.phone || null,
      email: locationFormData.email || null,
      latitude: locationFormData.latitude ? parseFloat(locationFormData.latitude) : null,
      longitude: locationFormData.longitude ? parseFloat(locationFormData.longitude) : null,
      isPickupLocation: locationFormData.isPickupLocation,
      isReturnLocation: locationFormData.isReturnLocation,
      openingHours: locationFormData.openingHours || null,
      isActive: locationFormData.isActive
    };

    if (editingLocationId) {
      updateLocationMutation.mutate(locationData);
    } else {
      createLocationMutation.mutate(locationData);
    }
  };

  const handleCancelLocationEdit = () => {
    setIsEditingLocation(false);
    setEditingLocationId(null);
    setLocationFormData({
      locationName: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      phone: '',
      email: '',
      latitude: '',
      longitude: '',
      isPickupLocation: true,
      isReturnLocation: true,
      openingHours: '',
      isActive: true
    });
  };

  const handleDeleteLocation = (locationId) => {
    if (window.confirm(t('admin.confirmDeleteLocation'))) {
      deleteLocationMutation.mutate(locationId);
    }
  };

  // Additional Service handlers
  const handleServiceInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setServiceFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? '' : parseFloat(value)) : value)
    }));
  };

  const handleAddService = () => {
    setIsEditingService(true);
    setEditingServiceId(null);
    setServiceFormData({
      name: '',
      description: '',
      price: '',
      serviceType: 'Other',
      isMandatory: false,
      maxQuantity: 1,
      isActive: true
    });
  };

  const handleEditService = (service) => {
    const serviceId = service.id || service.Id;
    const baseAssigned = assignedServiceIds.has(serviceId);
    const hasOverride = Object.prototype.hasOwnProperty.call(assignmentOverrides, serviceId);
    const isAssigned = hasOverride ? assignmentOverrides[serviceId] : baseAssigned;
    
    if (isAssigned) {
      // Editing company service - only company-specific fields
    const companyService = companyServices.find(
      cs => (cs.additionalServiceId || cs.AdditionalServiceId || cs.additional_service_id) === serviceId
    );
    
    if (!companyService) {
      toast.error(t('admin.companyServiceNotFound'), {
        position: 'top-center',
        autoClose: 3000,
      });
      return;
    }
    
    // Set editing state for company service
    setEditingServiceId(serviceId);
    setEditingCompanyServiceId(serviceId);
    setEditingServiceBaseInfo(service); // Store base service info for display
    setIsEditingService(true);
    
    // Set form data with company-specific values
    setServiceFormData({
      name: service.name || service.Name || '', // Read-only display
      description: service.description || service.Description || '', // Read-only display
      price: companyService.price !== undefined && companyService.price !== null 
        ? companyService.price 
        : (companyService.Price !== undefined && companyService.Price !== null 
          ? companyService.Price 
          : (service.price || service.Price || '')),
      serviceType: service.serviceType || service.ServiceType || 'Other', // Read-only display
      isMandatory: companyService.isMandatory !== undefined && companyService.isMandatory !== null
        ? companyService.isMandatory
        : (companyService.IsMandatory !== undefined && companyService.IsMandatory !== null
          ? companyService.IsMandatory
          : (service.isMandatory || service.IsMandatory || false)),
      maxQuantity: service.maxQuantity || service.MaxQuantity || 1, // Read-only display
      isActive: companyService.isActive !== undefined 
        ? companyService.isActive 
        : (companyService.IsActive !== undefined 
          ? companyService.IsActive 
          : true)
    });
    } else {
      // Editing base additional service - all fields editable
      setEditingServiceId(serviceId);
      setEditingCompanyServiceId(null);
      setEditingServiceBaseInfo(null);
      setIsEditingService(true);
      
      // Set form data with all service values
      setServiceFormData({
        name: service.name || service.Name || '',
        description: service.description || service.Description || '',
        price: service.price !== undefined && service.price !== null 
          ? service.price 
          : (service.Price !== undefined && service.Price !== null 
            ? service.Price 
            : ''),
        serviceType: service.serviceType || service.ServiceType || 'Other',
        isMandatory: service.isMandatory || service.IsMandatory || false,
        maxQuantity: service.maxQuantity || service.MaxQuantity || 1,
        isActive: service.isActive !== undefined 
          ? service.isActive 
          : (service.IsActive !== undefined 
            ? service.IsActive 
            : true)
      });
    }
  };

  const handleSaveService = (e) => {
    e.preventDefault();
    
    if (editingCompanyServiceId) {
      // Editing company service - only update company-specific fields
      const companyServiceData = {
        price: serviceFormData.price !== '' ? parseFloat(serviceFormData.price) : null,
        isMandatory: serviceFormData.isMandatory,
        isActive: serviceFormData.isActive
      };
      
      updateCompanyServiceMutation.mutate({
        companyId: currentCompanyId,
        serviceId: editingCompanyServiceId,
        data: companyServiceData
      });
    } else if (editingServiceId) {
      // Editing base additional service - only if not assigned to company
      const serviceData = {
        name: serviceFormData.name,
        description: serviceFormData.description || null,
        price: parseFloat(serviceFormData.price) || 0,
        serviceType: serviceFormData.serviceType,
        isMandatory: serviceFormData.isMandatory,
        maxQuantity: parseInt(serviceFormData.maxQuantity) || 1,
        isActive: serviceFormData.isActive
      };
      updateAdditionalServiceMutation.mutate({
        serviceId: editingServiceId,
        data: serviceData
      });
    } else {
      // Creating new additional service
      const serviceData = {
        name: serviceFormData.name,
        description: serviceFormData.description || null,
        price: parseFloat(serviceFormData.price) || 0,
        serviceType: serviceFormData.serviceType,
        isMandatory: serviceFormData.isMandatory,
        maxQuantity: parseInt(serviceFormData.maxQuantity) || 1,
        isActive: serviceFormData.isActive
      };
      createServiceMutation.mutate(serviceData);
    }
  };

  const handleCancelServiceEdit = () => {
    setIsEditingService(false);
    setEditingServiceId(null);
    setEditingCompanyServiceId(null);
    setEditingServiceBaseInfo(null);
    setServiceFormData({
      name: '',
      description: '',
      price: '',
      serviceType: 'Other',
      isMandatory: false,
      maxQuantity: 1,
      isActive: true
    });
  };

  const handleDeleteService = (serviceId) => {
    if (window.confirm(t('admin.confirmDeleteService'))) {
      deleteServiceMutation.mutate(serviceId);
    }
  };

  // Handle quick toggle of service isActive or isMandatory
  const handleToggleServiceField = async (service, field) => {
    const serviceId = service.id || service.Id;
    const isAssigned = assignedServiceIds.has(serviceId);
    let currentValue;

    if (isAssigned) {
      const companyService = companyServicesMap.get(serviceId) || {};
      currentValue = companyService[field];
      if (currentValue === undefined) {
        const altKey = field.charAt(0).toUpperCase() + field.slice(1);
        currentValue = companyService[altKey];
      }
    } else {
      currentValue = service[field];
      if (currentValue === undefined) {
        const altKey = field.charAt(0).toUpperCase() + field.slice(1);
        currentValue = service[altKey];
      }
    }

    const newValue = !currentValue;

    try {
      // Check if service is assigned to this company
      if (isAssigned) {
        // Update company service (only allowed fields: isMandatory, isActive)
        if (field === 'isMandatory' || field === 'isActive') {
          await apiService.updateCompanyService(currentCompanyId, serviceId, {
            [field]: newValue
          });
        } else {
          toast.error(t('admin.cannotUpdateBaseService'), {
            position: 'top-center',
            autoClose: 3000,
          });
          return;
        }
        queryClient.invalidateQueries(['companyServices', currentCompanyId]);
      } else {
        // Update base additional service
      await apiService.updateAdditionalService(serviceId, {
        [field]: newValue
      });
      }
      
      queryClient.invalidateQueries(['additionalServices', currentCompanyId]);
      queryClient.invalidateQueries(['allAdditionalServices']);
      toast.success(t('admin.serviceUpdated'), {
        position: 'top-center',
        autoClose: 2000,
      });
    } catch (error) {
      console.error(`Error updating service ${field}:`, error);
      toast.error(error.response?.data?.message || t('admin.serviceUpdateFailed'), {
        position: 'top-center',
        autoClose: 3000,
      });
    }
  };

  // Handle toggle service assignment to company
  const handleToggleServiceAssignment = async (service) => {
    const serviceId = getServiceIdentifier(service);
    const baseAssigned = assignedServiceIds.has(serviceId);
    const hasOverride = Object.prototype.hasOwnProperty.call(assignmentOverrides, serviceId);
    const isAssigned = hasOverride ? assignmentOverrides[serviceId] : baseAssigned;
    console.debug('[AdminDashboard] Toggle service assignment', {
      serviceId,
      baseAssigned,
      hasOverride,
      isAssigned,
    });

    try {
      if (isAssigned) {
        setAssignmentOverrides((prev) => ({
          ...prev,
          [serviceId]: false,
        }));

        console.debug('[AdminDashboard] Removing service from company via API', {
          companyId: currentCompanyId,
          serviceId,
        });

        await apiService.removeServiceFromCompany(currentCompanyId, serviceId);
        console.debug('[AdminDashboard] Remove service completed successfully');

        queryClient.setQueryData(['companyServices', currentCompanyId], (prev) => {
          if (!prev) return prev;

          const filterList = (list) => {
            if (!Array.isArray(list)) return list;
            return list.filter(
              (item) =>
                (item.additionalServiceId ||
                  item.AdditionalServiceId ||
                  item.additional_service_id) !== serviceId
            );
          };

          if (Array.isArray(prev)) {
            return filterList(prev);
          }

          if (prev?.data) {
            return {
              ...prev,
              data: filterList(prev.data),
            };
          }

          return prev;
        });

        toast.success(t('admin.serviceRemovedFromCompany'), {
          position: 'top-center',
          autoClose: 2000,
        });
        queryClient.invalidateQueries(['companyServices', currentCompanyId]);
        queryClient.invalidateQueries(['allAdditionalServices']);
        console.debug('[AdminDashboard] Invalidated companyServices & allAdditionalServices caches');
      } else {
        const basePrice = service.price || service.Price || 0;
        const baseMandatory = service.isMandatory || service.IsMandatory || false;

        console.debug('[AdminDashboard] Opening pricing modal for service', {
          serviceId,
          basePrice,
          baseMandatory,
        });

        setServicePricingModal({
          open: true,
          service,
          basePrice,
          priceInput: Number.isFinite(basePrice) ? basePrice.toFixed(2) : '0.00',
          isMandatory: baseMandatory,
          submitting: false,
          error: null,
        });
      }
    } catch (error) {
      setAssignmentOverrides((prev) => {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      });
      console.error('Error toggling service assignment:', error);
      if (error.response) {
        console.error('[AdminDashboard] Error response payload:', error.response.data);
      }
      toast.error(error.response?.data?.message || t('admin.serviceAssignmentFailed'), {
        position: 'top-center',
        autoClose: 3000,
      });
    }
  };

  // Video upload handler
  const handleVideoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm', 'video/mkv'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a video file (MP4, AVI, MOV, WMV, WebM, MKV)');
      return;
    }

    // Validate file size (500 MB)
    if (file.size > 524_288_000) {
      toast.error('File size exceeds 500 MB limit');
      return;
    }

    setIsUploading(prev => ({ ...prev, video: true }));
    setUploadProgress(prev => ({ ...prev, video: 0 }));

    try {
      const response = await apiService.uploadCompanyVideo(
        currentCompanyId,
        file,
        (progress) => setUploadProgress(prev => ({ ...prev, video: progress }))
      );

      // Update company data with new video link
      setCompanyFormData(prev => ({
        ...prev,
        videoLink: response.data.videoUrl
      }));

      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success('Video uploaded successfully!');
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error(error.response?.data?.message || 'Failed to upload video');
    } finally {
      setIsUploading(prev => ({ ...prev, video: false }));
      setUploadProgress(prev => ({ ...prev, video: 0 }));
      event.target.value = ''; // Reset file input
    }
  };

  // Video delete handler
  const handleVideoDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      await apiService.deleteCompanyVideo(currentCompanyId);

      // Update company data
      setCompanyFormData(prev => ({
        ...prev,
        videoLink: null
      }));

      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success('Video deleted successfully!');
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    }
  };

  // Banner upload handler
  const handleBannerUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image file (JPG, PNG, GIF, WebP)');
      return;
    }

    if (file.size > 10_485_760) {
      toast.error('File size exceeds 10 MB limit');
      return;
    }

    setIsUploading(prev => ({ ...prev, banner: true }));
    setUploadProgress(prev => ({ ...prev, banner: 0 }));

    try {
      const response = await apiService.uploadCompanyBanner(
        currentCompanyId,
        file,
        (progress) => setUploadProgress(prev => ({ ...prev, banner: progress }))
      );

      setCompanyFormData(prev => ({
        ...prev,
        bannerLink: response.data.bannerUrl
      }));

      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success('Banner uploaded successfully!');
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error(error.response?.data?.message || 'Failed to upload banner');
    } finally {
      setIsUploading(prev => ({ ...prev, banner: false }));
      setUploadProgress(prev => ({ ...prev, banner: 0 }));
      event.target.value = '';
    }
  };

  const handleBannerDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this banner?')) {
      return;
    }

    try {
      await apiService.deleteCompanyBanner(currentCompanyId);
      setCompanyFormData(prev => ({ ...prev, bannerLink: null }));
      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success('Banner deleted successfully!');
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error('Failed to delete banner');
    }
  };

  // Logo upload handler
  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image file (JPG, PNG, SVG, WebP)');
      return;
    }

    if (file.size > 5_242_880) {
      toast.error('File size exceeds 5 MB limit');
      return;
    }

    setIsUploading(prev => ({ ...prev, logo: true }));
    setUploadProgress(prev => ({ ...prev, logo: 0 }));

    try {
      const response = await apiService.uploadCompanyLogo(
        currentCompanyId,
        file,
        (progress) => setUploadProgress(prev => ({ ...prev, logo: progress }))
      );

      setCompanyFormData(prev => ({
        ...prev,
        logoLink: response.data.logoUrl
      }));

      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    } finally {
      setIsUploading(prev => ({ ...prev, logo: false }));
      setUploadProgress(prev => ({ ...prev, logo: 0 }));
      event.target.value = '';
    }
  };

  const handleLogoDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this logo?')) {
      return;
    }

    try {
      await apiService.deleteCompanyLogo(currentCompanyId);
      setCompanyFormData(prev => ({ ...prev, logoLink: null }));
      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success('Logo deleted successfully!');
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast.error('Failed to delete logo');
    }
  };

  // Extract actual company data from response
  const actualCompanyData = companyData?.data || companyData;

  // Get states for company's country (for vehicle state dropdown)
  const companyCountry = actualCompanyData?.country || actualCompanyData?.Country || '';
  const statesForCompanyCountry = useMemo(() => {
    return getStatesForCountry(companyCountry);
  }, [companyCountry]);

  // Countries grouped by continent, sorted alphabetically within each group
  const countriesByContinent = useMemo(() => {
    const northAmerica = [
      'Anguilla', 'Antigua and Barbuda', 'Bahamas', 'Barbados', 'Belize', 'Bermuda',
      'British Virgin Islands', 'Canada', 'Cayman Islands', 'Costa Rica',
      'Cuba', 'Dominica', 'Dominican Republic', 'El Salvador', 'Greenland',
      'Grenada', 'Guatemala', 'Haiti', 'Honduras', 'Jamaica', 'Mexico',
      'Montserrat', 'Nicaragua', 'Panama', 'Puerto Rico', 'Saint Kitts and Nevis',
      'Saint Lucia', 'Saint Pierre and Miquelon', 'Saint Vincent and the Grenadines',
      'Trinidad and Tobago', 'Turks and Caicos Islands', 'United States',
      'US Virgin Islands'
    ];
    
    const southAmerica = [
      'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador',
      'French Guiana', 'Guyana', 'Paraguay', 'Peru', 'Suriname',
      'Uruguay', 'Venezuela'
    ];

    return {
      'North America': northAmerica.sort(),
      'South America': southAmerica.sort()
    };
  }, []);

  // Vehicle table columns
  const vehicleColumns = useMemo(() => [
    {
      header: t('vehicles.licensePlate'),
      accessorFn: row => row.LicensePlate || row.licensePlate || '',
    },
    {
      header: t('vehicles.make'),
      accessorFn: row => row.Make || row.make || '',
    },
    {
      header: t('vehicles.model'),
      accessorFn: row => row.Model || row.model || '',
    },
    {
      header: t('year'),
      accessorFn: row => row.Year || row.year || '',
    },
    {
      header: t('vehicles.color'),
      accessorFn: row => row.Color || row.color || 'N/A',
    },
    {
      header: t('vehicles.status'),
      accessorFn: row => row.Status || row.status || '',
    },
    {
      header: t('actions'),
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditVehicle(row.original)}
            className="text-blue-600 hover:text-blue-900"
            title={t('edit') || 'Edit'}
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteVehicle(row.original)}
            className="text-red-600 hover:text-red-900"
            title={t('delete') || 'Delete'}
            disabled={deleteVehicleMutation.isLoading}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ], [t, handleEditVehicle, handleDeleteVehicle, deleteVehicleMutation.isLoading]);

  // Extract total count for pagination
  const vehiclesTotalCount = useMemo(() => {
    let data = vehiclesListData;
    
    // If response has a data property (axios response)
    if (data?.data) {
      data = data.data;
    }
    
    // If still wrapped in result property (standardized API response)
    if (data?.result) {
      data = data.result;
    }
    
    // Extract total count from the response structure
    return data?.TotalCount || data?.totalCount || 0;
  }, [vehiclesListData]);

  // Vehicle table configuration
  // Use client-side pagination when filtering, server-side when not filtering
  const vehicleTable = useReactTable({
    data: filteredVehiclesList,
    columns: vehicleColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: !vehicleSearchTerm, // Server-side pagination only when not searching
    pageCount: vehicleSearchTerm 
      ? Math.ceil(filteredVehiclesList.length / vehiclePageSize) 
      : Math.ceil(vehiclesTotalCount / vehiclePageSize),
    state: {
      pagination: {
        pageIndex: vehiclePage,
        pageSize: vehiclePageSize,
      },
    },
    onPaginationChange: (updater) => {
      const newState = typeof updater === 'function' 
        ? updater({ pageIndex: vehiclePage, pageSize: vehiclePageSize })
        : updater;
      setVehiclePage(newState.pageIndex);
      setVehiclePageSize(newState.pageSize);
    },
  });

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <EmptyState
          title={t('admin.pleaseLogin')}
          message={t('admin.needLogin')}
        />
      </PageContainer>
    );
  }

  if (!isAdmin) {
    return (
      <PageContainer>
        <EmptyState
          title={t('admin.accessDenied')}
          message={t('admin.noPermission')}
        />
      </PageContainer>
    );
  }

  if (!currentCompanyId) {
    return (
      <PageContainer>
        <EmptyState
          title={t('admin.noCompany')}
          message={t('admin.noCompanyMessage')}
        />
      </PageContainer>
    );
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen text={t('common.loading')} />;
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('admin.title')}
        subtitle={
          isEditing 
            ? t('admin.editingMode') 
            : `${t('admin.welcome')}, ${user?.firstName}!`
        }
        icon={<LayoutDashboard className="h-8 w-8" />}
      />

      {/* Editing Overlay Notice */}
      {isEditing && (
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
        </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700 font-medium">
                {t('admin.editingInProgress')}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {t('admin.editingNotice')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Two Column Layout (1/5 left, 4/5 right) */}
      <div className="grid grid-cols-5 gap-8">
        {/* Left Sidebar - Navigation (1/5 width) */}
        <div className="col-span-1">
          <Card title={t('admin.navigation')} className="sticky top-4">
            <div className="space-y-2">
              <button
                onClick={() => setActiveSection('company')}
                className={`w-full px-4 py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${
                  activeSection === 'company'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={t('admin.companyProfile')}
                aria-label={t('admin.companyProfile')}
              >
                <Building2 className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs">{t('admin.companyProfile')}</span>
              </button>
              <button
                onClick={() => setActiveSection('vehicles')}
                className={`w-full px-4 py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${
                  activeSection === 'vehicles'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isEditing}
                title={t('vehicles.title')}
                aria-label={t('vehicles.title')}
              >
                <Car className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs text-center">{t('vehicles.title')}</span>
              </button>
              <button
                onClick={() => setActiveSection('vehicleManagement')}
                className={`w-full px-4 py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${
                  activeSection === 'vehicleManagement'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isEditing}
                title={t('admin.vehicles')}
                aria-label={t('admin.vehicles')}
              >
                <Car className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs text-center">{t('admin.vehicles')}</span>
              </button>
              <button
                onClick={() => setActiveSection('reservations')}
                className={`w-full px-4 py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${
                  activeSection === 'reservations'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isEditing}
                title={t('admin.reservations')}
                aria-label={t('admin.reservations')}
              >
                <Calendar className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs text-center">{t('admin.reservations')}</span>
              </button>
              <button
                onClick={() => setActiveSection('customers')}
                className={`w-full px-4 py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${
                  activeSection === 'customers'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isEditing}
                title={t('admin.customers')}
                aria-label={t('admin.customers')}
              >
                <Users className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs text-center">{t('admin.customers')}</span>
              </button>
              <button
                onClick={() => setActiveSection('bookingSettings')}
                className={`w-full px-4 py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${
                  activeSection === 'bookingSettings'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isEditing}
                title={t('admin.bookingSettings')}
                aria-label={t('admin.bookingSettings')}
              >
                <Calendar className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs text-center">{t('admin.bookingSettings')}</span>
              </button>
              <button
                onClick={() => setActiveSection('reports')}
                className={`w-full px-4 py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${
                  activeSection === 'reports'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isEditing}
                title={t('admin.viewReports')}
                aria-label={t('admin.viewReports')}
              >
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs text-center">{t('admin.viewReports')}</span>
              </button>
            </div>
          </Card>
        </div>

        {/* Right Side - Content (4/5 width) */}
        <div className="col-span-4">
          {/* Company Profile Section */}
          {activeSection === 'company' && (
            <Card
              title={
              <div className="flex items-center">
                  <Building2 className="h-6 w-6 text-blue-600 mr-2" />
                  <span>
                    {!currentCompanyId && isEditingCompany 
                      ? t('admin.createCompany') || 'Create Company'
                      : t('admin.companyProfile')
                    }
                  </span>
                </div>
              }
            >
          <div>
          {isLoadingCompany && currentCompanyId ? (
            <LoadingSpinner text={t('common.loading')} />
          ) : companyError && currentCompanyId ? (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium">{t('admin.companyLoadFailed')}</p>
              <p className="text-sm text-gray-600 mt-2">{companyError.message}</p>
                </div>
          ) : (!companyData && currentCompanyId) ? (
            <div className="text-center py-8">
              <p className="text-gray-600">{t('admin.noCompanyData')}</p>
              </div>
          ) : isEditingCompany || (!currentCompanyId && isMainAdmin) ? (
              <form onSubmit={handleSaveCompany} className="space-y-6">
                {/* Tab Navigation */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('info')}
                      className={`
                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                        ${activeTab === 'info'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      {t('admin.companyInfo')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('design')}
                      className={`
                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                        ${activeTab === 'design'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      {t('admin.design')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('locations')}
                      className={`
                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                        ${activeTab === 'locations'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      {t('admin.locations')}
                    </button>
                  </nav>
            </div>
                <p className="text-sm text-gray-500 mb-6">
                  {tabCaptions[activeTab]}
                </p>

                {/* Company Info Tab */}
                {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.companyName')}
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={companyFormData.companyName || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      required
                    />
        </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.email')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={companyFormData.email || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      required
                    />
            </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.website')}
                    </label>
                    <input
                      type="text"
                      name="website"
                      value={companyFormData.website || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="www.example.com or https://example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Protocol (https://) will be added automatically if not provided
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.country') || 'Country'}
                    </label>
                    <select
                      name="country"
                      value={companyFormData.country || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                    >
                      <option value="">Select Country</option>
                      {Object.entries(countriesByContinent).map(([continent, countries]) => (
                        <optgroup key={continent} label={continent}>
                          {countries.map((country) => (
                            <option key={country} value={country}>
                              {country}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.securityDeposit', 'Security Deposit')}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="securityDeposit"
                        min="0"
                        step="0.01"
                        value={
                          companyFormData.securityDeposit === '' ||
                          companyFormData.securityDeposit == null
                            ? ''
                            : companyFormData.securityDeposit
                        }
                        onChange={handleCompanyInputChange}
                        className="input-field pr-14"
                        placeholder="1000"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
                        {companyFormData.currency || 'USD'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {t(
                        'admin.securityDepositHelp',
                        'Default deposit amount required for bookings created under this company.'
                      )}
                    </p>
                  </div>

                  {/* Media Links */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-800 mb-4 mt-4">
                      {t('admin.mediaLinks')}
                    </h4>
                  </div>

                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.logoLink')}
                    </label>
                    {companyFormData.logoLink ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <img 
                            src={companyFormData.logoLink} 
                            alt="Logo" 
                            className="h-20 w-20 object-contain border border-gray-300 rounded"
                          />
                          <button
                            type="button"
                            onClick={handleLogoDelete}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                          disabled={isUploading.logo}
                        />
                        {isUploading.logo && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress.logo}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{uploadProgress.logo}%</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Max 5 MB (JPG, PNG, SVG, WebP)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Banner Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.bannerLink')}
                    </label>
                    {companyFormData.bannerLink ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <img 
                            src={companyFormData.bannerLink} 
                            alt="Banner" 
                            className="h-20 w-40 object-cover border border-gray-300 rounded"
                          />
                          <button
                            type="button"
                            onClick={handleBannerDelete}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                          disabled={isUploading.banner}
                        />
                        {isUploading.banner && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress.banner}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{uploadProgress.banner}%</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Max 10 MB (JPG, PNG, GIF, WebP)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Video Upload */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.videoLink')}
                    </label>
                    {companyFormData.videoLink ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <video 
                            src={companyFormData.videoLink} 
                            className="h-32 w-56 border border-gray-300 rounded"
                            controls
                          />
                          <button
                            type="button"
                            onClick={handleVideoDelete}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoUpload}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                          disabled={isUploading.video}
                        />
                        {isUploading.video && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress.video}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{uploadProgress.video}%</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Max 500 MB (MP4, AVI, MOV, WMV, WebM, MKV)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Additional Content Fields */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-800 mb-4 mt-4">
                      {t('admin.additionalContent')}
                    </h4>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.about')}
                    </label>
                    <textarea
                      name="about"
                      value={companyFormData.about || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      rows="5"
                      placeholder="Tell us about your company..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.backgroundLink')}
                    </label>
                    <input
                      type="text"
                      name="backgroundLink"
                      value={companyFormData.backgroundLink || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="https://example.com/background.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.companyPath')}
                    </label>
                    <input
                      type="text"
                      name="companyPath"
                      value={companyFormData.companyPath || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="my-company"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.bookingIntegrated')}
                    </label>
                    <textarea
                      name="bookingIntegrated"
                      value={companyFormData.bookingIntegrated || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      rows="3"
                      placeholder="Booking integration code or information..."
                    />
                  </div>

                </div>
                )}

                {/* Design Tab */}
                {activeTab === 'design' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Branding Fields */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-800 mb-4">
                      {t('admin.branding')}
                    </h4>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.subdomain')}
                    </label>
                    <input
                      type="text"
                      name="subdomain"
                      value={companyFormData.subdomain || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="mycompany"
                      maxLength="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used for: [subdomain].aegis-rental.com
                    </p>
                  </div>

                  <div className="md:col-span-2"></div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.primaryColor')}
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        name="primaryColor"
                        value={companyFormData.primaryColor || '#3B82F6'}
                        onChange={handleCompanyInputChange}
                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        name="primaryColor"
                        value={companyFormData.primaryColor || ''}
                        onChange={handleCompanyInputChange}
                        className="input-field flex-1"
                        placeholder="#FF5733"
                        maxLength="7"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.secondaryColor')}
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        name="secondaryColor"
                        value={companyFormData.secondaryColor || '#10B981'}
                        onChange={handleCompanyInputChange}
                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        name="secondaryColor"
                        value={companyFormData.secondaryColor || ''}
                        onChange={handleCompanyInputChange}
                        className="input-field flex-1"
                        placeholder="#33C1FF"
                        maxLength="7"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.logoUrl')}
                    </label>
                    <input
                      type="text"
                      name="logoUrl"
                      value={companyFormData.logoUrl || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.faviconUrl')}
                    </label>
                    <input
                      type="text"
                      name="faviconUrl"
                      value={companyFormData.faviconUrl || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="https://example.com/favicon.ico"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.customCss')}
                    </label>
                    <textarea
                      name="customCss"
                      value={companyFormData.customCss || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field font-mono text-sm"
                      rows="6"
                      placeholder=".custom-class { color: #FF5733; }"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Add custom CSS styles for your company's branding
                    </p>
                  </div>
                </div>
                )}

                {/* Locations Tab */}
                {activeTab === 'locations' && (
                <div className="space-y-6">
                  {/* Add Location Button */}
                  {!isEditingLocation && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddLocation}
                        className="btn-primary"
                      >
                        + {t('admin.addLocation')}
                      </button>
                    </div>
                  )}

                  {/* Location Form */}
                  {isEditingLocation ? (
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">
                        {editingLocationId ? t('admin.editLocation') : t('admin.addLocation')}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.locationName')} *
                          </label>
                          <input
                            type="text"
                            name="locationName"
                            value={locationFormData.locationName}
                            onChange={handleLocationInputChange}
                            className="input-field"
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.address')}
                          </label>
                          <input
                            type="text"
                            name="address"
                            value={locationFormData.address}
                            onChange={handleLocationInputChange}
                            className="input-field"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.city')}
                          </label>
                          <input
                            type="text"
                            name="city"
                            value={locationFormData.city}
                            onChange={handleLocationInputChange}
                            className="input-field"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.state')}
                          </label>
                          <input
                            type="text"
                            name="state"
                            value={locationFormData.state}
                            onChange={handleLocationInputChange}
                            className="input-field"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.country')}
                          </label>
                          <input
                            type="text"
                            name="country"
                            value={locationFormData.country}
                            onChange={handleLocationInputChange}
                            className="input-field"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.postalCode')}
                          </label>
                          <input
                            type="text"
                            name="postalCode"
                            value={locationFormData.postalCode}
                            onChange={handleLocationInputChange}
                            className="input-field"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.phone')}
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={locationFormData.phone}
                            onChange={handleLocationInputChange}
                            className="input-field"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.email')}
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={locationFormData.email}
                            onChange={handleLocationInputChange}
                            className="input-field"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.latitude')}
                          </label>
                          <input
                            type="number"
                            step="any"
                            name="latitude"
                            value={locationFormData.latitude}
                            onChange={handleLocationInputChange}
                            className="input-field"
                            placeholder="40.7128"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.longitude')}
                          </label>
                          <input
                            type="number"
                            step="any"
                            name="longitude"
                            value={locationFormData.longitude}
                            onChange={handleLocationInputChange}
                            className="input-field"
                            placeholder="-74.0060"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.openingHours')}
                          </label>
                          <textarea
                            name="openingHours"
                            value={locationFormData.openingHours}
                            onChange={handleLocationInputChange}
                            className="input-field"
                            rows="3"
                            placeholder='{"Mon": "9-5", "Tue": "9-5"}'
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            JSON format optional
                          </p>
                        </div>

                        <div className="md:col-span-2 flex items-center space-x-6">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              name="isPickupLocation"
                              checked={locationFormData.isPickupLocation}
                              onChange={handleLocationInputChange}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">{t('admin.isPickupLocation')}</span>
                          </label>

                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              name="isReturnLocation"
                              checked={locationFormData.isReturnLocation}
                              onChange={handleLocationInputChange}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">{t('admin.isReturnLocation')}</span>
                          </label>

                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              name="isActive"
                              checked={locationFormData.isActive}
                              onChange={handleLocationInputChange}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">{t('admin.isActive')}</span>
                          </label>
                        </div>

                        <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
                          <button
                            type="button"
                            onClick={handleCancelLocationEdit}
                            className="btn-outline"
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveLocation}
                            className="btn-primary"
                          >
                            {t('common.save')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Locations List */
                    <div className="space-y-4">
                      {isLoadingLocations ? (
                        <div className="text-center py-8">
                          <LoadingSpinner />
                        </div>
                      ) : locations.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-gray-600">{t('admin.noLocations')}</p>
                        </div>
                      ) : (
                        locations.map((location) => (
                          <div key={location.locationId} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-lg font-semibold text-gray-900">{location.locationName}</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {[location.address, location.city, location.state, location.postalCode, location.country]
                                    .filter(Boolean)
                                    .join(', ') || '-'}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {location.isPickupLocation && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {t('admin.pickup')}
                                    </span>
                                  )}
                                  {location.isReturnLocation && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      {t('admin.return')}
                                    </span>
                                  )}
                                  {location.isActive ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      {t('status.active')}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      {t('status.inactive')}
                                    </span>
                                  )}
                                </div>
                                {location.phone && (
                                  <p className="text-sm text-gray-600 mt-2">
                                    {t('admin.phone')}: {location.phone}
                                  </p>
                                )}
                                {location.email && (
                                  <p className="text-sm text-gray-600">
                                    {t('admin.email')}: {location.email}
                                  </p>
                                )}
                              </div>
                              <div className="flex space-x-2 ml-4">
                                <button
                                  type="button"
                                  onClick={() => handleEditLocation(location)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  {t('common.edit')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLocation(location.locationId)}
                                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                                >
                                  {t('common.delete')}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                )}

                {/* Action Buttons */}
                {activeTab !== 'locations' && (
                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="btn-outline flex items-center"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('common.cancel')}
                  </button>
                  {/* Show save button if: creating new company (main admin only) OR updating existing company */}
                  {((!currentCompanyId && isEditingCompany && isMainAdmin) || currentCompanyId) && (
                    <button
                      type="submit"
                      disabled={updateCompanyMutation.isLoading || isCreatingCompany}
                      className="btn-primary flex items-center"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {(updateCompanyMutation.isLoading || isCreatingCompany) 
                        ? t('common.saving') || 'Saving...' 
                        : (!currentCompanyId ? t('admin.createCompany') || 'Create Company' : t('common.save'))
                      }
                    </button>
                  )}
                </div>
                )}
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Display Mode */}
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.companyName')}</p>
                  <p className="text-base text-gray-900">{actualCompanyData?.companyName || '-'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.email')}</p>
                  <p className="text-base text-gray-900">{actualCompanyData?.email || '-'}</p>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    {t('admin.financialSettings', 'Financial Settings')}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t('admin.currency', 'Currency')}
                  </p>
                  <p className="text-base text-gray-900">
                    {(actualCompanyData?.currency || 'USD').toUpperCase()}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t('admin.securityDeposit', 'Security Deposit')}
                  </p>
                  {isEditingDeposit ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={securityDepositDraft}
                        onChange={(e) => setSecurityDepositDraft(e.target.value)}
                        className="input-field h-10"
                        disabled={isSavingDeposit}
                      />
                      <button
                        type="button"
                        onClick={handleSecurityDepositSave}
                        disabled={isSavingDeposit}
                        className="btn-primary px-3 py-2 text-sm"
                      >
                        {isSavingDeposit ? t('common.saving') || 'Saving…' : t('common.save')}
                      </button>
                      <button
                        type="button"
                        onClick={cancelSecurityDepositEdit}
                        disabled={isSavingDeposit}
                        className="btn-outline px-3 py-2 text-sm"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-base text-gray-900">
                        {actualCompanyData?.securityDeposit != null
                          ? new Intl.NumberFormat(undefined, {
                              style: 'currency',
                              currency: (actualCompanyData?.currency || 'USD').toUpperCase(),
                              minimumFractionDigits: 0,
                            }).format(actualCompanyData.securityDeposit)
                          : '-'}
                      </span>
                      <button
                        type="button"
                        onClick={beginSecurityDepositEdit}
                        disabled={isEditingCompany}
                        className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                      >
                        {t('common.edit')}
                      </button>
                    </div>
                  )}
                </div>

              </div>
          )}
        </div>
            </Card>
          )}

          {/* Vehicles Section */}
          {activeSection === 'vehicles' && (
            <div className="space-y-8">
              <Card title={t('vehicles.title')} headerActions={
                <span className="text-sm font-normal text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {vehicleCount} / {availableCount}
                </span>
              }>
                {isLoadingModels ? (
                  <div className="text-center py-12">
                    <LoadingSpinner />
                    <p className="mt-4 text-gray-600">{t('home.loadingModels')}</p>
                  </div>
                ) : !modelsGrouped || modelsGrouped.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">{t('vehicles.noVehicles')}</p>
                ) : (
                  <div className="space-y-2">
                    {modelsGrouped.map((categoryGroup) => {
                      const categoryId = categoryGroup.categoryId || categoryGroup.category_id;
                      const categoryName = categoryGroup.categoryName || categoryGroup.category_name || 'Uncategorized';
                      const isCategoryExpanded = expandedCategories[categoryId];
                      
                      // Group models by make and modelName with full data
                      const makeModelGroups = {};
                      (categoryGroup.models || []).forEach(model => {
                        const make = (model.make || '').toUpperCase();
                        const modelName = (model.modelName || model.model_name || '').toUpperCase();
                        const makeModelKey = `${make}_${modelName}`;
                        
                        if (!makeModelGroups[makeModelKey]) {
                          makeModelGroups[makeModelKey] = {
                            make,
                            modelName,
                            models: [] // Store full model objects
                          };
                        }
                        
                        makeModelGroups[makeModelKey].models.push(model);
                      });
                      
                      // Sort years descending in each group
                      Object.values(makeModelGroups).forEach(group => {
                        group.models.sort((a, b) => (b.year || 0) - (a.year || 0));
                      });
                      
                      // Calculate rates for category display
                      const allModelsInCategory = (categoryGroup.models || []);
                      const categoryRates = allModelsInCategory
                        .map(m => m.dailyRate)
                        .filter(r => r != null && r !== undefined && r !== '');
                      const isCategoryUniform = categoryRates.length > 0 && 
                        categoryRates.every(r => r === categoryRates[0]);
                      const categoryDisplayRate = isCategoryUniform ? categoryRates[0] : 'different';
                      
                      return (
                        <div key={categoryId} className="border border-gray-200 rounded-lg">
                          {/* Category Header */}
                          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                            <button
                              onClick={() => setExpandedCategories(prev => ({
                                ...prev,
                                [categoryId]: !prev[categoryId]
                              }))}
                              className="flex items-center flex-1"
                            >
                              <div className="flex items-center">
                                {isCategoryExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-gray-600 mr-2" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-gray-600 mr-2" />
                                )}
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {t(`categories.${categoryName.toLowerCase().replace(/\s+/g, '-')}`) || categoryName}
                                </h3>
                      </div>
                              <span className="text-sm text-gray-600 ml-2">
                                {Object.keys(makeModelGroups).length} {Object.keys(makeModelGroups).length === 1 ? 'make' : 'makes'}
                      </span>
                            </button>
                            <div className="flex items-center gap-2 ml-4">
                              <span className="text-sm font-medium text-gray-700 min-w-[80px] text-right">
                                {categoryDisplayRate !== 'different' ? formatRate(categoryDisplayRate) : categoryDisplayRate}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Daily Rate"
                                value={dailyRateInputs[`category_${categoryId}`] || ''}
                                onChange={(e) => setDailyRateInputs(prev => ({
                                  ...prev,
                                  [`category_${categoryId}`]: e.target.value
                                }))}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                disabled={isUpdatingRate}
                              />
                              <button
                                onClick={async () => {
                                  const rate = dailyRateInputs[`category_${categoryId}`];
                                  if (!rate) {
                                    toast.error('Please enter a daily rate');
                                    return;
                                  }
                                  if (!categoryId) {
                                    toast.error('Invalid category');
                                    console.error('categoryId is null/undefined');
                                    return;
                                  }
                                  setIsUpdatingRate(true);
                                  try {
                                    const response = await apiService.bulkUpdateModelDailyRate({
                                      dailyRate: parseFloat(rate),
                                      categoryId: categoryId,
                                      companyId: currentCompanyId
                                    });
                                    
                                    toast.success(`Updated ${response.data?.Count || 0} models in category`);
                                    queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
                                    setDailyRateInputs(prev => ({ ...prev, [`category_${categoryId}`]: '' }));
                                  } catch (error) {
                                    console.error('Error updating models:', error);
                                    toast.error(error.response?.data?.message || 'Failed to update models');
                                  } finally {
                                    setIsUpdatingRate(false);
                                  }
                                }}
                                disabled={isUpdatingRate || !categoryId}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
                              >
                                Update
                              </button>
                    </div>
                </div>
                          
                          {/* Category Content */}
                          {isCategoryExpanded && (
                            <div className="p-4 space-y-2">
                              {Object.entries(makeModelGroups).map(([makeModelKey, group]) => {
                                const makeExpandedKey = `${categoryId}_${makeModelKey}`;
                                const isMakeExpanded = expandedMakes[makeExpandedKey];
                                
                                // Calculate rates for this make
                                const makeRates = group.models.map(m => m.dailyRate).filter(r => r != null && r !== undefined && r !== '');
                                const isMakeUniform = makeRates.length > 0 && makeRates.every(r => r === makeRates[0]);
                                const makeDisplayRate = isMakeUniform ? makeRates[0] : 'different';
                                
                                // Calculate rates for this model
                                const modelRates = group.models.map(m => m.dailyRate).filter(r => r != null && r !== undefined && r !== '');
                                const isModelUniform = modelRates.length > 0 && modelRates.every(r => r === modelRates[0]);
                                const modelDisplayRate = isModelUniform ? modelRates[0] : 'different';
                                
                                return (
                                  <div key={makeModelKey} className="border border-gray-200 rounded-lg">
                                    {/* Make Header */}
                                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors">
                                      <button
                                        onClick={() => setExpandedMakes(prev => ({
                                          ...prev,
                                          [makeExpandedKey]: !prev[makeExpandedKey]
                                        }))}
                                        className="flex items-center flex-1"
                                      >
                                        <div className="flex items-center">
                                          {isMakeExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-gray-600 mr-2" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4 text-gray-600 mr-2" />
                                          )}
                                          <span className="font-medium text-gray-800">
                                            {group.make}
                                          </span>
                                        </div>
                                        <span className="text-sm text-gray-600 ml-2">
                                          {group.models.length} {group.models.length === 1 ? 'year' : 'years'}
                                        </span>
                                      </button>
                                      <div className="flex items-center gap-2 ml-4">
                                        <span className="text-sm font-medium text-gray-700 min-w-[60px] text-right">
                                          {makeDisplayRate !== 'different' ? formatRate(makeDisplayRate) : makeDisplayRate}
                                        </span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          placeholder="Daily Rate"
                                          value={dailyRateInputs[`make_${makeExpandedKey}`] || ''}
                                          onChange={(e) => setDailyRateInputs(prev => ({
                                            ...prev,
                                            [`make_${makeExpandedKey}`]: e.target.value
                                          }))}
                                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                          disabled={isUpdatingRate}
                                        />
                                        <button
                                          onClick={async () => {
                                            const rate = dailyRateInputs[`make_${makeExpandedKey}`];
                                            if (!rate) {
                                              toast.error('Please enter a daily rate');
                                              return;
                                            }
                                            setIsUpdatingRate(true);
                                            try {
                                              const response = await apiService.bulkUpdateModelDailyRate({
                                                dailyRate: parseFloat(rate),
                                                make: group.make,
                                                companyId: currentCompanyId
                                              });
                                              
                                              toast.success(`Updated ${response.data?.Count || 0} models for ${group.make}`);
                                              queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
                                              setDailyRateInputs(prev => ({ ...prev, [`make_${makeExpandedKey}`]: '' }));
                                            } catch (error) {
                                              console.error('Error updating models:', error);
                                              toast.error('Failed to update models');
                                            } finally {
                                              setIsUpdatingRate(false);
                                            }
                                          }}
                                          disabled={isUpdatingRate}
                                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400"
                                        >
                                          Update
                  </button>
            </div>
                                    </div>
                                    
                                    {/* Make Content */}
                                    {isMakeExpanded && (
                                      <div className="p-4 space-y-2">
                                        <div className="border border-gray-200 rounded-lg">
                                          {/* Model Header */}
                                          <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                                            <span className="font-medium text-gray-800">{group.modelName}</span>
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium text-gray-700 min-w-[60px] text-right">
                                                {modelDisplayRate !== 'different' ? formatRate(modelDisplayRate) : modelDisplayRate}
                                              </span>
                                              <input
                                                type="number"
                                                step="0.01"
                                                placeholder="Daily Rate"
                                                value={dailyRateInputs[`model_${makeExpandedKey}`] || ''}
                                                onChange={(e) => setDailyRateInputs(prev => ({
                                                  ...prev,
                                                  [`model_${makeExpandedKey}`]: e.target.value
                                                }))}
                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                                disabled={isUpdatingRate}
                                              />
                                              <button
                                                onClick={async () => {
                                                  const rate = dailyRateInputs[`model_${makeExpandedKey}`];
                                                  if (!rate) {
                                                    toast.error('Please enter a daily rate');
                                                    return;
                                                  }
                                                  setIsUpdatingRate(true);
                                                  try {
                                                    const response = await apiService.bulkUpdateModelDailyRate({
                                                      dailyRate: parseFloat(rate),
                                                      make: group.make,
                                                      modelName: group.modelName,
                                                      companyId: currentCompanyId
                                                    });
                                                    
                                                    toast.success(`Updated ${response.data?.Count || 0} models for ${group.make} ${group.modelName}`);
                                                    queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
                                                    setDailyRateInputs(prev => ({ ...prev, [`model_${makeExpandedKey}`]: '' }));
                                                  } catch (error) {
                                                    console.error('Error updating models:', error);
                                                    toast.error('Failed to update models');
                                                  } finally {
                                                    setIsUpdatingRate(false);
                                                  }
                                                }}
                                                disabled={isUpdatingRate}
                                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400"
                                              >
                                                Update
                                              </button>
                                            </div>
                                          </div>
                                          
                                          {/* Years */}
                                          <div className="p-4">
                                            <div className="flex flex-wrap gap-2">
                                              {group.models.map(model => {
                                                const year = model.year || 0;
                                                const yearRate = model.dailyRate;
                                                const vehicleCount = model.vehicleCount || 0;
                                                return (
                                                <div key={model.id || year} className="flex items-center gap-1">
                                                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                                                    {year} ({vehicleCount})
                                                  </span>
                                                  <span className="text-xs font-medium text-gray-600 min-w-[45px]">
                                                    {yearRate != null && yearRate !== '' ? formatRate(yearRate, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                                  </span>
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Rate"
                                                    value={dailyRateInputs[`year_${year}_${makeExpandedKey}`] || ''}
                                                    onChange={(e) => setDailyRateInputs(prev => ({
                                                      ...prev,
                                                      [`year_${year}_${makeExpandedKey}`]: e.target.value
                                                    }))}
                                                    className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs"
                                                    disabled={isUpdatingRate}
                                                  />
                                                  <button
                                                    onClick={async () => {
                                                      const rate = dailyRateInputs[`year_${year}_${makeExpandedKey}`];
                                                      if (!rate) {
                                                        toast.error('Please enter a daily rate');
                                                        return;
                                                      }
                                                      setIsUpdatingRate(true);
                                                      try {
                                                        const response = await apiService.bulkUpdateModelDailyRate({
                                                          dailyRate: parseFloat(rate),
                                                          make: group.make,
                                                          modelName: group.modelName,
                                                          year: year,
                                                          companyId: currentCompanyId
                                                        });
                                                        
                                                        toast.success(`Updated ${response.data?.Count || 0} models for ${group.make} ${group.modelName} ${year}`);
                                                        queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
                                                        setDailyRateInputs(prev => ({ ...prev, [`year_${year}_${makeExpandedKey}`]: '' }));
                                                      } catch (error) {
                                                        console.error('Error updating models:', error);
                                                        toast.error('Failed to update models');
                                                      } finally {
                                                        setIsUpdatingRate(false);
                                                      }
                                                    }}
                                                    disabled={isUpdatingRate}
                                                    className="px-1 py-0.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400"
                                                  >
                                                    ✓
                                                  </button>
                                                </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
          </div>
          )}

          {/* Reservations Section */}
          {activeSection === 'reservations' && (
            <Card title={t('admin.bookings', 'Bookings')}>
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <input
                      type="date"
                      className="input-field border border-gray-300"
                      value={bookingDateFrom}
                      onChange={(e) => setBookingDateFrom(e.target.value)}
                    />
                    <input
                      type="date"
                      className="input-field border border-gray-300"
                      value={bookingDateTo}
                      onChange={(e) => setBookingDateTo(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <select
                      value={bookingStatusFilter}
                      onChange={(e) => setBookingStatusFilter(e.target.value)}
                      className="input-field border border-gray-300"
                    >
                      <option value="">{t('admin.allStatuses', 'All statuses')}</option>
                      <option value="Pending">{t('booking.statusPending', 'Pending')}</option>
                      <option value="Confirmed">{t('booking.statusConfirmed', 'Confirmed')}</option>
                      <option value="Active">{t('booking.statusActive', 'Active')}</option>
                      <option value="Completed">{t('booking.statusCompleted', 'Completed')}</option>
                      <option value="Cancelled">{t('booking.statusCancelled', 'Cancelled')}</option>
                    </select>
                    <input
                      type="text"
                      className="input-field border border-gray-300"
                      placeholder={t('admin.customerSearch', 'Customer name or email')}
                      value={bookingCustomerFilter}
                      onChange={(e) => setBookingCustomerFilter(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-gray-600">
                    {t('admin.bookingCount', { count: totalBookings })}
                  </div>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      setBookingStatusFilter('');
                      setBookingCustomerFilter('');
                      setBookingDateFrom('');
                      setBookingDateTo('');
                    }}
                  >
                    {t('admin.resetFilters', 'Reset Filters')}
                  </button>
                </div>
              </div>

              {isLoadingBookings ? (
                <div className="py-8 text-center text-gray-500">
                  {t('common.loading')}
                </div>
              ) : bookingsError ? (
                <div className="py-8 text-center text-red-500">
                  {t('admin.bookingsLoadError', 'Unable to load bookings.')}
                </div>
              ) : !filteredBookings.length ? (
                <div className="py-8 text-center text-gray-500">
                  {t('admin.noBookingsFound', 'No bookings found for the selected filters.')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.bookingNumber', 'Booking #')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.customer', 'Customer')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.vehicle', 'Vehicle')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.pickupDate', 'Pickup Date')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.returnDate', 'Return Date')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.totalAmount', 'Total')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.securityDeposit', 'Security Deposit')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.status', 'Status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBookings.map((booking) => (
                        <tr key={booking.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{booking.bookingNumber}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {booking.customerName}
                            <div className="text-xs text-gray-500">{booking.customerEmail}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{booking.vehicleName}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(booking.pickupDate)}
                            <div className="text-xs text-gray-500">{booking.pickupLocation}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(booking.returnDate)}
                            <div className="text-xs text-gray-500">{booking.returnLocation}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatPrice(booking.totalAmount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatPrice(booking.securityDeposit)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBookingStatusColor(
                                booking.status || ''
                              )}`}
                            >
                              {formatBookingStatus(booking.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
                    <div className="text-sm text-gray-600">
                      {totalBookings > 0
                        ? t('admin.showingRange', {
                            start: (bookingPage - 1) * bookingPageSize + 1,
                            end: Math.min(bookingPage * bookingPageSize, totalBookings),
                            total: totalBookings,
                          })
                        : t('admin.showingRangeEmpty', 'No bookings to display.')}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{t('admin.pageSize', 'Page Size')}</span>
                      <select
                        value={bookingPageSize}
                        onChange={(e) => {
                          setBookingPageSize(Number(e.target.value) || 10);
                          setBookingPage(1);
                        }}
                        className="input-field w-24"
                      >
                        {[10, 25, 50].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBookingPage(1)}
                        disabled={bookingPage <= 1}
                        className="btn-outline px-2 py-1 disabled:opacity-50"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingPage((prev) => Math.max(prev - 1, 1))}
                        disabled={bookingPage <= 1}
                        className="btn-outline px-2 py-1 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm text-gray-600">
                        {bookingPage} / {totalBookingPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setBookingPage((prev) => Math.min(prev + 1, totalBookingPages))}
                        disabled={bookingPage >= totalBookingPages}
                        className="btn-outline px-2 py-1 disabled:opacity-50"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingPage(totalBookingPages)}
                        disabled={bookingPage >= totalBookingPages}
                        className="btn-outline px-2 py-1 disabled:opacity-50"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Customers Section */}
          {activeSection === 'customers' && (
            <Card title={t('admin.customers')}>
              <p className="text-gray-500 text-center py-4">{t('admin.customersComingSoon')}</p>
            </Card>
          )}

          {/* Booking Settings Section */}
          {activeSection === 'bookingSettings' && (
            <Card 
              title={t('admin.bookingSettings')}
              headerActions={
                !isEditingService && (
                  <button
                    onClick={handleAddService}
                    className="btn-primary text-sm"
                  >
                    + {t('admin.addService')}
                  </button>
                )
              }
            >
              <div className="space-y-6">
                {isEditingService ? (
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      {editingServiceId ? t('admin.editService') : t('admin.addService')}
                    </h3>
                    <form onSubmit={handleSaveService} className="space-y-4">
                      {editingCompanyServiceId ? (
                        // Editing company service - show base info as read-only, only edit company-specific fields
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('admin.serviceName')}
                            </label>
                            <input
                              type="text"
                              value={serviceFormData.name}
                              className="input-field bg-gray-100"
                              readOnly
                              disabled
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('admin.serviceDescription')}
                            </label>
                            <textarea
                              value={serviceFormData.description}
                              className="input-field bg-gray-100"
                              rows="3"
                              readOnly
                              disabled
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('admin.serviceType')}
                            </label>
                            <input
                              type="text"
                              value={serviceFormData.serviceType}
                              className="input-field bg-gray-100"
                              readOnly
                              disabled
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('admin.maxQuantity')}
                            </label>
                            <input
                              type="number"
                              value={serviceFormData.maxQuantity}
                              className="input-field bg-gray-100"
                              readOnly
                              disabled
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('admin.servicePrice')} ({t('admin.companyPrice')} · {currencySymbol}{currencyCode})
                            </label>
                            <input
                              type="number"
                              name="price"
                              value={serviceFormData.price}
                              onChange={handleServiceInputChange}
                              className="input-field"
                              step="0.01"
                              min="0"
                              placeholder={editingServiceBaseInfo ? `Base: ${formatRate(editingServiceBaseInfo.price || editingServiceBaseInfo.Price || 0, { currency: 'USD' })}` : ''}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {t('admin.companyPriceHint')} ({currencySymbol}{currencyCode})
                            </p>
                          </div>
                        </div>
                      ) : (
                        // Creating new additional service - show all fields
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('admin.serviceName')} *
                            </label>
                            <input
                              type="text"
                              name="name"
                              value={serviceFormData.name}
                              onChange={handleServiceInputChange}
                              className="input-field"
                              required
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('admin.serviceDescription')}
                            </label>
                            <textarea
                              name="description"
                              value={serviceFormData.description}
                              onChange={handleServiceInputChange}
                              className="input-field"
                              rows="3"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {editingServiceId && !editingCompanyServiceId ? `${t('admin.default')} ` : ''}{t('admin.servicePrice')} * (USD)
                            </label>
                            <input
                              type="number"
                              name="price"
                              value={serviceFormData.price}
                              onChange={handleServiceInputChange}
                              className="input-field"
                              step="0.01"
                              min="0"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('admin.serviceType')} *
                            </label>
                            <select
                              name="serviceType"
                              value={serviceFormData.serviceType}
                              onChange={handleServiceInputChange}
                              className="input-field"
                              required
                            >
                              <option value="Insurance">{t('admin.serviceTypeInsurance')}</option>
                              <option value="GPS">{t('admin.serviceTypeGPS')}</option>
                              <option value="ChildSeat">{t('admin.serviceTypeChildSeat')}</option>
                              <option value="AdditionalDriver">{t('admin.serviceTypeAdditionalDriver')}</option>
                              <option value="FuelPrepay">{t('admin.serviceTypeFuelPrepay')}</option>
                              <option value="Cleaning">{t('admin.serviceTypeCleaning')}</option>
                              <option value="Delivery">{t('admin.serviceTypeDelivery')}</option>
                              <option value="Other">{t('admin.serviceTypeOther')}</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('admin.maxQuantity')} *
                            </label>
                            <input
                              type="number"
                              name="maxQuantity"
                              value={serviceFormData.maxQuantity}
                              onChange={handleServiceInputChange}
                              className="input-field"
                              min="1"
                              required
                            />
                          </div>
                        </div>
                      )}

                      <div className="md:col-span-2 flex items-center space-x-6">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="isMandatory"
                            checked={serviceFormData.isMandatory}
                            onChange={handleServiceInputChange}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">
                            {editingServiceId && !editingCompanyServiceId ? `${t('admin.default')} ` : ''}{t('admin.isMandatory')} {editingCompanyServiceId ? `(${t('admin.forCompany')})` : ''}
                          </span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="isActive"
                            checked={serviceFormData.isActive}
                            onChange={handleServiceInputChange}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">
                            {t('admin.isActive')} {editingCompanyServiceId ? `(${t('admin.forCompany')})` : ''}
                          </span>
                        </label>
                      </div>

                      <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
                        <button
                          type="button"
                          onClick={handleCancelServiceEdit}
                          className="btn-outline"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={createServiceMutation.isLoading || updateCompanyServiceMutation.isLoading || updateAdditionalServiceMutation.isLoading}
                        >
                          {(createServiceMutation.isLoading || updateCompanyServiceMutation.isLoading || updateAdditionalServiceMutation.isLoading)
                            ? t('common.saving') 
                            : t('common.save')}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.additionalServices')}</h3>
                    {(isLoadingAllServices || isLoadingCompanyServices) ? (
                      <div className="text-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : allAdditionalServices.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-600">{t('admin.noServices')}</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                                {t('admin.inCompany')}
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t('admin.serviceName')}
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t('admin.serviceType')}
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t('admin.servicePrice')}
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t('admin.maxQuantity')}
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t('admin.isMandatory')}
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t('admin.isActive')}
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t('common.actions')}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {allAdditionalServices.map((service) => {
                              const serviceId = getServiceIdentifier(service);
                              const baseAssigned = assignedServiceIds.has(serviceId);
                              const hasOverride = Object.prototype.hasOwnProperty.call(
                                assignmentOverrides,
                                serviceId
                              );
                              const isAssigned = hasOverride
                                ? assignmentOverrides[serviceId]
                                : baseAssigned;
                              const companyServiceRaw = companyServicesMap.get(serviceId);
                              const companyService = isAssigned ? companyServiceRaw : null;
                              const basePrice =
                                service.price !== undefined && service.price !== null
                                  ? service.price
                                  : service.Price ?? 0;
                              const companyPrice =
                                companyService &&
                                (companyService.price ?? companyService.Price ?? basePrice);
                              const displayPrice = isAssigned ? companyPrice ?? basePrice : basePrice;
                              const formattedPrice = isAssigned
                                ? formatRate(displayPrice)
                                : formatRate(displayPrice, { currency: 'USD' });
                              const displayMaxQuantity = isAssigned
                                ? companyService?.maxQuantity ??
                                  companyService?.MaxQuantity ??
                                  service.maxQuantity ??
                                  service.MaxQuantity ??
                                  1
                                : service.maxQuantity || service.MaxQuantity || 1;
                              const isMandatory = isAssigned
                                ? companyService?.isMandatory ??
                                  companyService?.IsMandatory ??
                                  false
                                : service.isMandatory ?? service.IsMandatory ?? false;
                              const isActive = isAssigned
                                ? companyService?.isActive ??
                                  companyService?.IsActive ??
                                  true
                                : service.isActive ?? service.IsActive ?? true;
                              return (
                              <tr key={serviceId} className={`hover:bg-gray-50 ${isAssigned ? 'bg-green-50' : ''}`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <label className="flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isAssigned}
                                      onChange={() => handleToggleServiceAssignment(service)}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                      title={isAssigned ? t('admin.removeFromCompany') : t('admin.addToCompany')}
                                    />
                                  </label>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {service.name || service.Name}
                                    </div>
                                    {service.description || service.Description ? (
                                      <div className="text-sm text-gray-500 truncate max-w-xs">
                                        {service.description || service.Description}
                                      </div>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {service.serviceType || service.ServiceType}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm font-medium text-gray-900">
                                    {formattedPrice}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {displayMaxQuantity}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <label className="flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={!!isMandatory}
                                      onChange={() => handleToggleServiceField(service, 'isMandatory')}
                                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                      title={t('admin.isMandatory')}
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                      {isMandatory ? t('common.yes') : t('common.no')}
                                    </span>
                                  </label>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <label className="flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={!!isActive}
                                      onChange={() => handleToggleServiceField(service, 'isActive')}
                                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                      title={t('admin.isActive')}
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                      {isActive ? t('status.active') : t('status.inactive')}
                                    </span>
                                  </label>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => handleEditService(service)}
                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                  >
                                    {t('common.edit')}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteService(service.id || service.Id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    {t('common.delete')}
                                  </button>
                                </td>
                              </tr>
                            );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Vehicle Management Section */}
          {activeSection === 'vehicleManagement' && (
            <Card title={t('admin.vehicles')} headerActions={
              <div className="flex gap-2">
                <label className="btn-secondary text-sm cursor-pointer" style={{ margin: 0 }}>
                  <Upload className="h-4 w-4 mr-2 inline" />
                  {isImportingVehicles ? (t('vehicles.importing') || 'Importing...') : (t('admin.importVehicles') || 'Import Vehicles')}
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleVehicleImport}
                    disabled={isImportingVehicles}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => {
                    setIsCreatingVehicle(true);
                    setVehicleCreateForm({
                      make: '',
                      model: '',
                      year: '',
                      licensePlate: '',
                      color: '',
                      vin: '',
                      mileage: 0,
                      transmission: '',
                      seats: '',
                      dailyRate: '',
                      status: 'Available',
                      state: '',
                      location: '',
                      imageUrl: '',
                      features: null
                    });
                  }}
                  className="btn-primary text-sm"
                >
                  <Plus className="h-4 w-4 mr-2 inline" />
                  {t('admin.addVehicle')}
                </button>
              </div>
            }>
              {/* Filters: Make, Model, Year, and License Plate - Always visible */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Make Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('vehicles.make') || 'Make'}
                      </label>
                      <select
                        value={vehicleMakeFilter}
                        onChange={(e) => {
                          setVehicleMakeFilter(e.target.value);
                          setVehiclePage(0);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">{t('all') || 'All Makes'}</option>
                        {uniqueMakes.map((make) => (
                          <option key={make} value={make}>
                            {make}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Model Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('vehicles.model') || 'Model'}
                      </label>
                      <select
                        value={vehicleModelFilter}
                        onChange={(e) => {
                          setVehicleModelFilter(e.target.value);
                          setVehiclePage(0);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">{t('all') || 'All Models'}</option>
                        {uniqueModels.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Year Filter - Editable Input Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('year') || 'Year'}
                      </label>
                      <input
                        type="text"
                        placeholder={t('year') || 'Year (e.g. 2025)'}
                        value={vehicleYearFilter}
                        onChange={(e) => {
                          // Allow only numbers
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setVehicleYearFilter(value);
                          setVehiclePage(0);
                        }}
                        onBlur={(e) => {
                          // Validate year range (reasonable years)
                          const year = parseInt(e.target.value);
                          if (e.target.value && (year < 1900 || year > 2100)) {
                            // Reset if invalid
                            setVehicleYearFilter('');
                            toast.error(t('vehicles.invalidYear') || 'Please enter a valid year (1900-2100)');
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* License Plate Filter - Text Input Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('vehicles.licensePlate') || 'License Plate'}
                      </label>
                      <input
                        type="text"
                        placeholder={t('vehicles.licensePlate') || 'License Plate'}
                        value={vehicleLicensePlateFilter}
                        onChange={(e) => {
                          setVehicleLicensePlateFilter(e.target.value);
                          setVehiclePage(0);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  {/* Clear Filters Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setVehicleMakeFilter('');
                        setVehicleModelFilter('');
                        setVehicleYearFilter('');
                        setVehicleLicensePlateFilter('');
                        setVehicleSearchTerm('');
                        setVehiclePage(0);
                      }}
                      disabled={!vehicleMakeFilter && !vehicleModelFilter && !vehicleYearFilter && !vehicleLicensePlateFilter && !vehicleSearchTerm}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      {t('clearFilters') || 'Clear Filters'}
                    </button>
                  </div>

                  {/* Search Field */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t('search') || 'Search vehicles...'}
                      value={vehicleSearchTerm}
                      onChange={(e) => {
                        setVehicleSearchTerm(e.target.value);
                        setVehiclePage(0); // Reset to first page when searching
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {vehicleSearchTerm && (
                      <button
                        onClick={() => {
                          setVehicleSearchTerm('');
                          setVehiclePage(0);
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
              </div>

              {isLoadingVehiclesList ? (
                <div className="text-center py-12">
                  <LoadingSpinner />
                  <p className="mt-4 text-gray-600">{t('loading')}</p>
                </div>
              ) : vehiclesList.length === 0 ? (
                <p className="text-gray-500 text-center py-4">{t('vehicles.noVehicles')}</p>
              ) : filteredVehiclesList.length === 0 && (vehicleSearchTerm || vehicleMakeFilter || vehicleModelFilter || vehicleYearFilter || vehicleLicensePlateFilter) ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">{t('noResults') || 'No vehicles found matching your filters'}</p>
                  <button
                    onClick={() => {
                      setVehicleMakeFilter('');
                      setVehicleModelFilter('');
                      setVehicleYearFilter('');
                      setVehicleLicensePlateFilter('');
                      setVehicleSearchTerm('');
                      setVehiclePage(0);
                    }}
                    className="btn-secondary"
                  >
                    {t('clearSearch') || 'Clear Filters'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Show filtered count */}
                  {(vehicleSearchTerm || vehicleMakeFilter || vehicleModelFilter || vehicleYearFilter || vehicleLicensePlateFilter) && (
                    <p className="text-sm text-gray-600">
                      {t('admin.showing')} {filteredVehiclesList.length} {t('admin.of')} {vehiclesList.length} {t('vehicles')}
                    </p>
                  )}
                  
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        {vehicleTable.getHeaderGroups().map(headerGroup => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                              <th
                                key={header.id}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {vehicleTable.getRowModel().rows.map(row => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            {row.getVisibleCells().map(cell => (
                              <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        onClick={() => vehicleTable.previousPage()}
                        disabled={!vehicleTable.getCanPreviousPage()}
                        className="btn-secondary"
                      >
                        {t('previous')}
                      </button>
                      <button
                        onClick={() => vehicleTable.nextPage()}
                        disabled={!vehicleTable.getCanNextPage()}
                        className="btn-secondary ml-3"
                      >
                        {t('next')}
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          {vehicleSearchTerm ? (
                            <>
                              {t('admin.showing')} <span className="font-medium">{Math.min(vehiclePage * vehiclePageSize + 1, filteredVehiclesList.length)}</span> {t('admin.to')} <span className="font-medium">{Math.min((vehiclePage + 1) * vehiclePageSize, filteredVehiclesList.length)}</span> {t('admin.of')} <span className="font-medium">{filteredVehiclesList.length}</span> {t('results')}
                            </>
                          ) : (
                            <>
                              {t('admin.showing')} <span className="font-medium">{vehiclePage * vehiclePageSize + 1}</span> {t('admin.to')} <span className="font-medium">{Math.min((vehiclePage + 1) * vehiclePageSize, vehiclesTotalCount)}</span> {t('admin.of')} <span className="font-medium">{vehiclesTotalCount}</span> {t('results')}
                            </>
                          )}
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                          <button
                            onClick={() => vehicleTable.setPageIndex(0)}
                            disabled={!vehicleTable.getCanPreviousPage()}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                          >
                            <ChevronsLeft className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => vehicleTable.previousPage()}
                            disabled={!vehicleTable.getCanPreviousPage()}
                            className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => vehicleTable.nextPage()}
                            disabled={!vehicleTable.getCanNextPage()}
                            className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                          >
                            <ChevronRightIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => vehicleTable.setPageIndex(vehicleTable.getPageCount() - 1)}
                            disabled={!vehicleTable.getCanNextPage()}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                          >
                            <ChevronsRight className="h-5 w-5" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Reports Section */}
          {activeSection === 'reports' && (
            <Card title={t('admin.viewReports')}>
              <p className="text-gray-500 text-center py-4">{t('admin.reportsComingSoon')}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {t('vehicles.editVehicle') || 'Edit Vehicle'}
              </h2>
              <button
                onClick={() => {
                  setEditingVehicle(null);
                  setVehicleEditForm({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Vehicle Info - Editable Fields */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-4">
                {/* Make, Model, Year in one row */}
                <div className="grid grid-cols-12 gap-4">
                  {/* Make */}
                  <div className="col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('vehicles.make') || 'Make'}
                    </label>
                    <input
                      type="text"
                      value={vehicleEditForm.make || ''}
                      onChange={(e) => setVehicleEditForm(prev => ({ ...prev, make: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={100}
                      placeholder={t('vehicles.make') || 'Vehicle Make'}
                    />
                  </div>

                  {/* Model */}
                  <div className="col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('vehicles.model') || 'Model'}
                    </label>
                    <input
                      type="text"
                      value={vehicleEditForm.model || ''}
                      onChange={(e) => setVehicleEditForm(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={100}
                      placeholder={t('vehicles.model') || 'Vehicle Model'}
                    />
                  </div>

                  {/* Year */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('year') || 'Year'}
                    </label>
                    <input
                      type="number"
                      value={vehicleEditForm.year || ''}
                      onChange={(e) => setVehicleEditForm(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1900"
                      max="2100"
                      placeholder={t('year') || 'Year'}
                    />
                  </div>
                </div>

                {/* License Plate and State in one row */}
                <div className="grid grid-cols-12 gap-4">
                  {/* License Plate */}
                  <div className="col-span-9">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('vehicles.licensePlate') || 'License Plate'}
                    </label>
                    <input
                      type="text"
                      value={vehicleEditForm.licensePlate || ''}
                      onChange={(e) => setVehicleEditForm(prev => ({ ...prev, licensePlate: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={50}
                      placeholder={t('vehicles.licensePlate') || 'License Plate'}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>

                  {/* State */}
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <select
                      value={vehicleEditForm.state || ''}
                      onChange={(e) => setVehicleEditForm(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!companyCountry || statesForCompanyCountry.length === 0}
                    >
                      <option value="">
                        {!companyCountry 
                          ? 'Select State (No country set)' 
                          : statesForCompanyCountry.length === 0 
                            ? `No states for ${companyCountry}`
                            : 'Select State'
                        }
                      </option>
                      {companyCountry && statesForCompanyCountry.length > 0 && (
                        <optgroup label={companyCountry}>
                          {statesForCompanyCountry.map((state) => (
                            <option key={state.code} value={state.code}>
                              {state.name} ({state.code})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.color') || 'Color'}
                </label>
                <input
                  type="text"
                  value={vehicleEditForm.color || ''}
                  onChange={(e) => setVehicleEditForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={50}
                />
              </div>

              {/* VIN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.vin') || 'VIN'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={vehicleEditForm.vin || ''}
                    onChange={(e) => setVehicleEditForm(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={17}
                    placeholder="17-character VIN"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <button
                    type="button"
                    onClick={handleVinLookup}
                    disabled={isLookingUpVin || !vehicleEditForm.vin || vehicleEditForm.vin.length !== 17}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isLookingUpVin ? (
                      <>
                        <LoadingSpinner />
                        {t('vehicles.lookingUp') || 'Looking up...'}
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        {t('vehicles.lookupVin') || 'VIN Lookup'}
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t('vehicles.vinLookupHint') || 'Enter 17-character VIN and click Lookup to auto-fill vehicle information'}
                </p>
              </div>

              {/* Mileage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.mileage') || 'Mileage'}
                </label>
                <input
                  type="number"
                  value={vehicleEditForm.mileage || 0}
                  onChange={(e) => setVehicleEditForm(prev => ({ ...prev, mileage: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>

              {/* Transmission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.transmission') || 'Transmission'}
                </label>
                <select
                  value={vehicleEditForm.transmission || ''}
                  onChange={(e) => setVehicleEditForm(prev => ({ ...prev, transmission: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('select') || 'Select'}</option>
                  <option value="Automatic">{t('vehicles.automatic') || 'Automatic'}</option>
                  <option value="Manual">{t('vehicles.manual') || 'Manual'}</option>
                  <option value="CVT">{t('vehicles.cvt') || 'CVT'}</option>
                </select>
              </div>

              {/* Seats */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.seats') || 'Seats'}
                </label>
                <input
                  type="number"
                  value={vehicleEditForm.seats || ''}
                  onChange={(e) => setVehicleEditForm(prev => ({ ...prev, seats: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="20"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.status') || 'Status'}
                </label>
                <select
                  value={vehicleEditForm.status || 'Available'}
                  onChange={(e) => setVehicleEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Available">{t('vehicles.statusAvailable') || 'Available'}</option>
                  <option value="Rented">{t('vehicles.statusRented') || 'Rented'}</option>
                  <option value="Maintenance">{t('vehicles.statusMaintenance') || 'Maintenance'}</option>
                  <option value="OutOfService">{t('vehicles.statusOutOfService') || 'Out of Service'}</option>
                  <option value="Cleaning">{t('vehicles.statusCleaning') || 'Cleaning'}</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.location') || 'Location'}
                </label>
                <input
                  type="text"
                  value={vehicleEditForm.location || ''}
                  onChange={(e) => setVehicleEditForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={255}
                  placeholder={t('vehicles.locationPlaceholder') || 'Enter vehicle location'}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setEditingVehicle(null);
                    setVehicleEditForm({});
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={updateVehicleMutation.isLoading}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  onClick={handleSaveVehicle}
                  disabled={updateVehicleMutation.isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {updateVehicleMutation.isLoading 
                    ? (t('saving') || 'Saving...') 
                    : (t('save') || 'Save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Vehicle Modal */}
      {isCreatingVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {t('vehicles.createVehicle') || 'Create New Vehicle'}
              </h2>
              <button
                onClick={() => {
                  setIsCreatingVehicle(false);
                  setVehicleCreateForm({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Vehicle Info - Required Fields */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-4">
                {/* Make, Model, Year in one row */}
                <div className="grid grid-cols-12 gap-4">
                  {/* Make */}
                  <div className="col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('vehicles.make') || 'Make'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vehicleCreateForm.make || ''}
                      onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, make: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={100}
                      placeholder={t('vehicles.make') || 'Vehicle Make'}
                      required
                    />
                  </div>

                  {/* Model */}
                  <div className="col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('vehicles.model') || 'Model'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vehicleCreateForm.model || ''}
                      onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={100}
                      placeholder={t('vehicles.model') || 'Vehicle Model'}
                      required
                    />
                  </div>

                  {/* Year */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('year') || 'Year'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={vehicleCreateForm.year || ''}
                      onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1900"
                      max="2100"
                      placeholder={t('year') || 'Year'}
                      required
                    />
                  </div>
                </div>

                {/* License Plate and State in one row */}
                <div className="grid grid-cols-12 gap-4">
                  {/* License Plate */}
                  <div className="col-span-9">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('vehicles.licensePlate') || 'License Plate'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vehicleCreateForm.licensePlate || ''}
                      onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, licensePlate: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={50}
                      placeholder={t('vehicles.licensePlate') || 'License Plate'}
                      style={{ textTransform: 'uppercase' }}
                      required
                    />
                  </div>

                  {/* State */}
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <select
                      value={vehicleCreateForm.state || ''}
                      onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!companyCountry || statesForCompanyCountry.length === 0}
                    >
                      <option value="">
                        {!companyCountry 
                          ? 'Select State (No country set)' 
                          : statesForCompanyCountry.length === 0 
                            ? `No states for ${companyCountry}`
                            : 'Select State'
                        }
                      </option>
                      {companyCountry && statesForCompanyCountry.length > 0 && (
                        <optgroup label={companyCountry}>
                          {statesForCompanyCountry.map((state) => (
                            <option key={state.code} value={state.code}>
                              {state.name} ({state.code})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                </div>

                {/* Daily Rate - Required */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('vehicles.dailyRate') || 'Daily Rate'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={vehicleCreateForm.dailyRate || ''}
                    onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, dailyRate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.color') || 'Color'}
                </label>
                <input
                  type="text"
                  value={vehicleCreateForm.color || ''}
                  onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={50}
                />
              </div>

              {/* VIN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.vin') || 'VIN'}
                </label>
                <input
                  type="text"
                  value={vehicleCreateForm.vin || ''}
                  onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={17}
                  placeholder="17-character VIN"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              {/* Mileage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.mileage') || 'Mileage'}
                </label>
                <input
                  type="number"
                  value={vehicleCreateForm.mileage || 0}
                  onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, mileage: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>

              {/* Transmission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.transmission') || 'Transmission'}
                </label>
                <select
                  value={vehicleCreateForm.transmission || ''}
                  onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, transmission: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('select') || 'Select'}</option>
                  <option value="Automatic">{t('vehicles.automatic') || 'Automatic'}</option>
                  <option value="Manual">{t('vehicles.manual') || 'Manual'}</option>
                  <option value="CVT">{t('vehicles.cvt') || 'CVT'}</option>
                </select>
              </div>

              {/* Seats */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.seats') || 'Seats'}
                </label>
                <input
                  type="number"
                  value={vehicleCreateForm.seats || ''}
                  onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, seats: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="20"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.status') || 'Status'}
                </label>
                <select
                  value={vehicleCreateForm.status || 'Available'}
                  onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Available">{t('vehicles.statusAvailable') || 'Available'}</option>
                  <option value="Rented">{t('vehicles.statusRented') || 'Rented'}</option>
                  <option value="Maintenance">{t('vehicles.statusMaintenance') || 'Maintenance'}</option>
                  <option value="OutOfService">{t('vehicles.statusOutOfService') || 'Out of Service'}</option>
                  <option value="Cleaning">{t('vehicles.statusCleaning') || 'Cleaning'}</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.location') || 'Location'}
                </label>
                <input
                  type="text"
                  value={vehicleCreateForm.location || ''}
                  onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={255}
                  placeholder={t('vehicles.locationPlaceholder') || 'Enter vehicle location'}
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.imageUrl') || 'Image URL'}
                </label>
                <input
                  type="url"
                  value={vehicleCreateForm.imageUrl || ''}
                  onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsCreatingVehicle(false);
                    setVehicleCreateForm({});
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={createVehicleMutation.isLoading}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  onClick={handleCreateVehicle}
                  disabled={createVehicleMutation.isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {createVehicleMutation.isLoading 
                    ? (t('creating') || 'Creating...') 
                    : (t('create') || 'Create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {servicePricingModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-5">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {t('admin.servicePriceModalTitle')}
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                {t('admin.servicePriceModalDescription', {
                  serviceName:
                    servicePricingModal.service?.name ||
                    servicePricingModal.service?.Name ||
                    '',
                })}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.servicePriceModalLabel')} ({currencySymbol}
                  {currencyCode})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={servicePricingModal.priceInput}
                  onChange={handleServicePricingInputChange}
                  placeholder={t('admin.servicePriceModalPlaceholder', {
                    basePrice: formatRate(servicePricingModal.basePrice, {
                      currency: 'USD',
                    }),
                  })}
                  className="input-field"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('admin.servicePriceModalPlaceholder', {
                    basePrice: formatRate(servicePricingModal.basePrice, {
                      currency: 'USD',
                    }),
                  })}
                </p>
              </div>

              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={servicePricingModal.isMandatory}
                  onChange={handleServicePricingMandatoryToggle}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span>{t('admin.servicePriceModalMandatoryLabel')}</span>
              </label>
            </div>

            {servicePricingModal.error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {servicePricingModal.error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetServicePricingModal}
                className="btn-outline"
                disabled={servicePricingModal.submitting}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={submitServicePricingModal}
                disabled={servicePricingModal.submitting}
                className="btn-primary"
              >
                {servicePricingModal.submitting
                  ? t('common.saving')
                  : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default AdminDashboard;
