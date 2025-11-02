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
import { Building2, Save, X, LayoutDashboard, Car, Users, TrendingUp, Calendar, ChevronDown, ChevronRight, Plus, Edit, Trash2, ChevronLeft, ChevronsLeft, ChevronRight as ChevronRightIcon, ChevronsRight } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { PageContainer, PageHeader, Card, EmptyState, LoadingSpinner } from '../components/common';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({});
  const [currentCompanyId, setCurrentCompanyId] = useState(null);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'design', or 'locations'
  const [activeSection, setActiveSection] = useState('company'); // 'company', 'vehicles', 'reservations', 'bookingSettings', 'customers', 'reports', etc.
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
  
  // State for daily rate inputs
  const [dailyRateInputs, setDailyRateInputs] = useState({});
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);

  // Get company ID from user or localStorage
  const getCompanyId = useCallback(() => {
    // First try user's companyId
    if (user?.companyId) {
      return user.companyId;
    }
    // Fallback to selected company from localStorage
    const selectedCompanyId = localStorage.getItem('selectedCompanyId');
    return selectedCompanyId || null;
  }, [user]);

  // Initialize and watch for company changes
  useEffect(() => {
    const companyId = getCompanyId();
    setCurrentCompanyId(companyId);

    // Listen for storage changes (when company is changed in navbar)
    const handleStorageChange = (e) => {
      if (e.key === 'selectedCompanyId' || e.key === null) {
        const newCompanyId = getCompanyId();
        setCurrentCompanyId(newCompanyId);
        // Invalidate and refetch company data
        queryClient.invalidateQueries(['company']);
        queryClient.invalidateQueries(['modelsGroupedByCategory']);
      }
    };

    // Listen for custom event (more reliable for same-tab changes)
    const handleCompanyChange = (e) => {
      const newCompanyId = getCompanyId();
      setCurrentCompanyId(newCompanyId);
      // Invalidate and refetch company data
      queryClient.invalidateQueries(['company']);
      queryClient.invalidateQueries(['vehiclesCount']);
      queryClient.invalidateQueries(['modelsGroupedByCategory']);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('companyChanged', handleCompanyChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('companyChanged', handleCompanyChange);
    };
  }, [user, queryClient, getCompanyId]);

  // Fetch current user's company data
  const { data: companyData, isLoading: isLoadingCompany, error: companyError } = useQuery(
    ['company', currentCompanyId],
    () => apiService.getCompany(currentCompanyId),
    {
      enabled: isAuthenticated && isAdmin && !!currentCompanyId,
      onSuccess: (data) => {
        // Handle both axios response format and direct data
        const companyInfo = data?.data || data;
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

  // Fetch models grouped by category for vehicle fleet
  const { data: modelsGroupedData, isLoading: isLoadingModels } = useQuery(
    ['modelsGroupedByCategory', currentCompanyId],
    () => apiService.getModelsGroupedByCategory(currentCompanyId),
    {
      enabled: isAuthenticated && isAdmin && !!currentCompanyId && activeSection === 'vehicles',
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  const modelsGrouped = modelsGroupedData?.data || modelsGroupedData || [];

  // Fetch vehicles list for vehicle management
  const { data: vehiclesListData, isLoading: isLoadingVehiclesList } = useQuery(
    ['vehicles', currentCompanyId, vehiclePage, vehiclePageSize],
    () => apiService.getVehicles({
      companyId: currentCompanyId,
      page: vehiclePage + 1, // API expects 1-based page
      pageSize: vehiclePageSize
    }),
    {
      enabled: isAuthenticated && isAdmin && !!currentCompanyId && activeSection === 'vehicleManagement',
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  const vehiclesList = vehiclesListData?.Vehicles || vehiclesListData?.data?.Vehicles || vehiclesListData?.data || [];

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

  const allAdditionalServices = allAdditionalServicesResponse?.data || allAdditionalServicesResponse || [];
  const companyServices = companyServicesResponse?.data || companyServicesResponse || [];
  
  // Create a Set of service IDs that are assigned to the company for quick lookup
  const assignedServiceIds = new Set(
    companyServices.map(cs => cs.additionalServiceId || cs.AdditionalServiceId || cs.additional_service_id)
  );

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
    setCompanyFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    
    // Only send fields that the API expects (exclude read-only and navigation properties)
    const updateData = {
      companyName: companyFormData.companyName,
      email: companyFormData.email || null,
      website: companyFormData.website || null,
      taxId: companyFormData.taxId || null,
      logoLink: companyFormData.logoLink || null,
      bannerLink: companyFormData.bannerLink || null,
      videoLink: companyFormData.videoLink || null,
      invitation: companyFormData.invitation || null,
      motto: companyFormData.motto || null,
      mottoDescription: companyFormData.mottoDescription || null,
      texts: companyFormData.texts || null,
      backgroundLink: companyFormData.backgroundLink || null,
      about: companyFormData.about || null,
      bookingIntegrated: companyFormData.bookingIntegrated || null,
      companyPath: companyFormData.companyPath || null,
      subdomain: companyFormData.subdomain || null,
      primaryColor: companyFormData.primaryColor || null,
      secondaryColor: companyFormData.secondaryColor || null,
      logoUrl: companyFormData.logoUrl || null,
      faviconUrl: companyFormData.faviconUrl || null,
      customCss: companyFormData.customCss || null
    };
    
    // Auto-add https:// to URLs if missing
    if (updateData.website && !updateData.website.match(/^https?:\/\//i)) {
      updateData.website = 'https://' + updateData.website;
    }
    
    if (updateData.logoLink && !updateData.logoLink.match(/^https?:\/\//i)) {
      updateData.logoLink = 'https://' + updateData.logoLink;
    }
    
    if (updateData.bannerLink && !updateData.bannerLink.match(/^https?:\/\//i)) {
      updateData.bannerLink = 'https://' + updateData.bannerLink;
    }
    
    if (updateData.videoLink && !updateData.videoLink.match(/^https?:\/\//i)) {
      updateData.videoLink = 'https://' + updateData.videoLink;
    }
    
    updateCompanyMutation.mutate(updateData);
  };

  const handleCancelEdit = () => {
    // Handle both axios response format and direct data
    const companyInfo = companyData?.data || companyData;
    setCompanyFormData(companyInfo);
    setIsEditingCompany(false);
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
    const isAssigned = assignedServiceIds.has(serviceId);
    
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
    const currentValue = service[field] !== undefined ? service[field] : (service[field.charAt(0).toUpperCase() + field.slice(1)] !== undefined ? service[field.charAt(0).toUpperCase() + field.slice(1)] : false);
    const newValue = !currentValue;

    try {
      // Check if service is assigned to this company
      const isAssigned = assignedServiceIds.has(serviceId);
      
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
    const serviceId = service.id || service.Id;
    const isAssigned = assignedServiceIds.has(serviceId);

    try {
      if (isAssigned) {
        // Remove service from company
        await apiService.removeServiceFromCompany(currentCompanyId, serviceId);
        toast.success(t('admin.serviceRemovedFromCompany'), {
          position: 'top-center',
          autoClose: 2000,
        });
      } else {
        // Add service to company - require price and mandatory input
        const basePrice = service.price || service.Price || 0;
        const baseMandatory = service.isMandatory || service.IsMandatory || false;
        
        // Prompt for price
        const priceInput = window.prompt(
          t('admin.enterServicePrice', { basePrice: basePrice.toFixed(2) }),
          basePrice.toFixed(2)
        );
        
        if (priceInput === null) {
          // User cancelled
          return;
        }
        
        const price = parseFloat(priceInput);
        if (isNaN(price) || price < 0) {
          toast.error(t('admin.invalidPrice'), {
            position: 'top-center',
            autoClose: 3000,
          });
          return;
        }
        
        // Prompt for mandatory status
        const isMandatory = window.confirm(
          baseMandatory 
            ? t('admin.confirmMandatoryService')
            : t('admin.confirmOptionalService')
        );
        
        // Add service to company with price and mandatory
        await apiService.addServiceToCompany({
          companyId: currentCompanyId,
          additionalServiceId: serviceId,
          price: price,
          isMandatory: isMandatory,
          isActive: true
        });
        toast.success(t('admin.serviceAddedToCompany'), {
          position: 'top-center',
          autoClose: 2000,
        });
      }
      queryClient.invalidateQueries(['companyServices', currentCompanyId]);
    } catch (error) {
      console.error('Error toggling service assignment:', error);
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
      header: t('vehicles.year'),
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
      header: t('vehicles.dailyRate'),
      accessorFn: row => row.DailyRate || row.dailyRate || 0,
      cell: ({ getValue }) => `$${getValue()?.toFixed(2) || '0.00'}`
    },
    {
      header: t('common.actions'),
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {/* TODO: Edit vehicle */}}
            className="text-blue-600 hover:text-blue-900"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => {/* TODO: Delete vehicle */}}
            className="text-red-600 hover:text-red-900"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ], [t]);

  // Vehicle table configuration
  const vehicleTable = useReactTable({
    data: vehiclesList,
    columns: vehicleColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true, // Server-side pagination
    pageCount: Math.ceil((vehiclesListData?.TotalCount || vehiclesListData?.totalCount || 0) / vehiclePageSize),
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
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center ${
                  activeSection === 'company'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Building2 className="h-5 w-5 mr-2" />
                {t('admin.companyProfile')}
              </button>
              <button
                onClick={() => setActiveSection('vehicles')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center ${
                  activeSection === 'vehicles'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isEditing}
              >
                <Car className="h-5 w-5 mr-2" />
                {t('vehicles.title')}
              </button>
              <button
                onClick={() => setActiveSection('vehicleManagement')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center ${
                  activeSection === 'vehicleManagement'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isEditing}
              >
                <Car className="h-5 w-5 mr-2" />
                {t('admin.vehicles')}
              </button>
              <button
                onClick={() => setActiveSection('reservations')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center ${
                  activeSection === 'reservations'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isEditing}
              >
                <Calendar className="h-5 w-5 mr-2" />
                {t('admin.reservations')}
              </button>
              <button
                onClick={() => setActiveSection('customers')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center ${
                  activeSection === 'customers'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isEditing}
              >
                <Users className="h-5 w-5 mr-2" />
                {t('admin.customers')}
              </button>
              <button
                onClick={() => setActiveSection('bookingSettings')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center ${
                  activeSection === 'bookingSettings'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isEditing}
              >
                <Calendar className="h-5 w-5 mr-2" />
                {t('admin.bookingSettings')}
              </button>
              <button
                onClick={() => setActiveSection('reports')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center ${
                  activeSection === 'reports'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isEditing}
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                {t('admin.viewReports')}
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
                  <span>{t('admin.companyProfile')}</span>
                </div>
              }
              headerActions={
                !isEditingCompany && (
                  <button
                    onClick={() => setIsEditingCompany(true)}
                    className="btn-primary text-sm"
                  >
                    {t('common.edit')}
                  </button>
                )
              }
            >
          <div>
          {isLoadingCompany ? (
            <LoadingSpinner text={t('common.loading')} />
          ) : companyError ? (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium">{t('admin.companyLoadFailed')}</p>
              <p className="text-sm text-gray-600 mt-2">{companyError.message}</p>
                </div>
          ) : !companyData ? (
            <div className="text-center py-8">
              <p className="text-gray-600">{t('admin.noCompanyData')}</p>
              </div>
          ) : isEditingCompany ? (
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

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.taxId')}
                    </label>
                    <input
                      type="text"
                      name="taxId"
                      value={companyFormData.taxId || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                    />
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

                  {/* Marketing Content */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-800 mb-4 mt-4">
                      {t('admin.marketingContent')}
                    </h4>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.invitation')}
                    </label>
                    <input
                      type="text"
                      name="invitation"
                      value={companyFormData.invitation || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="Find & Book a Great Deal Today"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.motto')}
                    </label>
                    <input
                      type="text"
                      name="motto"
                      value={companyFormData.motto || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="Meet our newest fleet yet"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.mottoDescription')}
                    </label>
                    <input
                      type="text"
                      name="mottoDescription"
                      value={companyFormData.mottoDescription || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="New rental cars. No lines. Let's go!"
                    />
                  </div>

                  {/* Texts JSONB field */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-800 mb-4 mt-4">
                      {t('admin.textsData')}
                    </h4>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.texts')}
                      <span className="text-xs text-gray-500 ml-2">(JSON format)</span>
                    </label>
                    <textarea
                      name="texts"
                      value={companyFormData.texts || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      rows="4"
                      placeholder='{"key1": "value1", "key2": "value2"}'
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('admin.textsHelp')}
                    </p>
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
                  <button
                    type="submit"
                    disabled={updateCompanyMutation.isLoading}
                    className="btn-primary flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateCompanyMutation.isLoading ? t('common.saving') : t('common.save')}
                  </button>
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

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.website')}</p>
                  <p className="text-base text-gray-900">
                    {actualCompanyData?.website ? (
                      <a href={actualCompanyData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {actualCompanyData.website}
                      </a>
                    ) : '-'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-600">{t('admin.taxId')}</p>
                  <p className="text-base text-gray-900">{actualCompanyData?.taxId || '-'}</p>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">{t('admin.marketingContent')}</p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-600">{t('admin.invitation')}</p>
                  <p className="text-base text-gray-900">{actualCompanyData?.invitation || '-'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.motto')}</p>
                  <p className="text-base text-gray-900">{actualCompanyData?.motto || '-'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.mottoDescription')}</p>
                  <p className="text-base text-gray-900">{actualCompanyData?.mottoDescription || '-'}</p>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">{t('admin.textsData')}</p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-600">{t('admin.texts')}</p>
                  <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
                    {actualCompanyData?.texts ? (() => {
                      try {
                        return JSON.stringify(JSON.parse(actualCompanyData.texts), null, 2);
                      } catch (e) {
                        return actualCompanyData.texts;
                      }
                    })() : '-'}
                  </pre>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">{t('admin.mediaLinks')}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.logoLink')}</p>
                  <p className="text-base text-gray-900">
                    {actualCompanyData?.logoLink ? (
                      <a href={actualCompanyData.logoLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {t('admin.viewLogo')}
                      </a>
                    ) : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.bannerLink')}</p>
                  <p className="text-base text-gray-900">
                    {actualCompanyData?.bannerLink ? (
                      <a href={actualCompanyData.bannerLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {t('admin.viewBanner')}
                      </a>
                    ) : '-'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-600">{t('admin.videoLink')}</p>
                  <p className="text-base text-gray-900">
                    {actualCompanyData?.videoLink ? (
                      <a href={actualCompanyData.videoLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {t('admin.viewVideo')}
                      </a>
                    ) : '-'}
                  </p>
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
                                {categoryDisplayRate !== 'different' ? `$${categoryDisplayRate?.toFixed(2)}` : categoryDisplayRate}
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
                                          {makeDisplayRate !== 'different' ? `$${makeDisplayRate?.toFixed(2)}` : makeDisplayRate}
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
                                                {modelDisplayRate !== 'different' ? `$${modelDisplayRate?.toFixed(2)}` : modelDisplayRate}
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
                                                    {yearRate != null && yearRate !== '' ? `$${yearRate}` : '—'}
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
            <Card title={t('admin.reservations')}>
              <p className="text-gray-500 text-center py-4">{t('admin.reservationsComingSoon')}</p>
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
                              {t('admin.servicePrice')} ({t('admin.companyPrice')})
                            </label>
                            <input
                              type="number"
                              name="price"
                              value={serviceFormData.price}
                              onChange={handleServiceInputChange}
                              className="input-field"
                              step="0.01"
                              min="0"
                              placeholder={editingServiceBaseInfo ? `Base: $${(editingServiceBaseInfo.price || editingServiceBaseInfo.Price || 0).toFixed(2)}` : ''}
                            />
                            <p className="text-xs text-gray-500 mt-1">{t('admin.companyPriceHint')}</p>
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
                              {editingServiceId && !editingCompanyServiceId ? `${t('admin.default')} ` : ''}{t('admin.servicePrice')} *
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
                              const serviceId = service.id || service.Id;
                              const isAssigned = assignedServiceIds.has(serviceId);
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
                                    ${(service.price || service.Price || 0).toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {service.maxQuantity || service.MaxQuantity || 1}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <label className="flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={service.isMandatory || service.IsMandatory || false}
                                      onChange={() => handleToggleServiceField(service, 'isMandatory')}
                                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                      title={t('admin.isMandatory')}
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                      {service.isMandatory || service.IsMandatory ? t('common.yes') : t('common.no')}
                                    </span>
                                  </label>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <label className="flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={service.isActive !== undefined ? service.isActive : (service.IsActive !== undefined ? service.IsActive : true)}
                                      onChange={() => handleToggleServiceField(service, 'isActive')}
                                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                      title={t('admin.isActive')}
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                      {service.isActive !== undefined ? service.isActive : (service.IsActive !== undefined ? service.IsActive : true)
                                        ? t('status.active') 
                                        : t('status.inactive')}
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
              <button
                onClick={() => {/* TODO: Add vehicle creation modal */}}
                className="btn-primary text-sm"
              >
                <Plus className="h-4 w-4 mr-2 inline" />
                {t('admin.addVehicle')}
              </button>
            }>
              {isLoadingVehiclesList ? (
                <div className="text-center py-12">
                  <LoadingSpinner />
                  <p className="mt-4 text-gray-600">{t('common.loading')}</p>
                </div>
              ) : vehiclesList.length === 0 ? (
                <p className="text-gray-500 text-center py-4">{t('vehicles.noVehicles')}</p>
              ) : (
                <div className="space-y-4">
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
                        {t('common.previous')}
                      </button>
                      <button
                        onClick={() => vehicleTable.nextPage()}
                        disabled={!vehicleTable.getCanNextPage()}
                        className="btn-secondary ml-3"
                      >
                        {t('common.next')}
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          {t('admin.showing')} <span className="font-medium">{vehiclePage * vehiclePageSize + 1}</span> {t('admin.to')} <span className="font-medium">{Math.min((vehiclePage + 1) * vehiclePageSize, vehiclesListData?.TotalCount || vehiclesListData?.totalCount || 0)}</span> {t('admin.of')} <span className="font-medium">{vehiclesListData?.TotalCount || vehiclesListData?.totalCount || 0}</span> {t('common.results')}
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
    </PageContainer>
  );
};

export default AdminDashboard;
