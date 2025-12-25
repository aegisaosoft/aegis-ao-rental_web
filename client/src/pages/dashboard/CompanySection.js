/*
 * CompanySection - Self-contained company management section
 * All state, queries, mutations and handlers are inside this component
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Building2, MapPin, Save, X, ChevronLeft, ChevronsLeft, ChevronsRight, CreditCard } from 'lucide-react';
import { ChevronRight as ChevronRightIcon } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Card, LoadingSpinner } from '../../components/common';
import MultiLanguageTipTapEditor from '../../components/MultiLanguageTipTapEditor';
import VehicleLocations from '../VehicleLocations';
import { translatedApiService as apiService } from '../../services/translatedApi';

// Countries data for dropdown
const countriesByContinent = {
  'North America': ['United States', 'Canada', 'Mexico'],
  'Europe': ['United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Poland', 'Portugal', 'Ireland', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Greece', 'Czech Republic', 'Romania', 'Hungary'],
  'South America': ['Brazil', 'Argentina', 'Colombia', 'Chile', 'Peru', 'Venezuela', 'Ecuador', 'Bolivia', 'Paraguay', 'Uruguay'],
  'Asia': ['Japan', 'China', 'South Korea', 'India', 'Singapore', 'Hong Kong', 'Taiwan', 'Thailand', 'Malaysia', 'Indonesia', 'Philippines', 'Vietnam', 'Israel', 'United Arab Emirates', 'Saudi Arabia', 'Turkey'],
  'Oceania': ['Australia', 'New Zealand'],
  'Africa': ['South Africa', 'Egypt', 'Morocco', 'Nigeria', 'Kenya'],
};

const initialLocationFormData = {
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
  isOffice: false,
  openingHours: '',
  isActive: true,
};

const CompanySection = ({
  currentCompanyId,
  isAuthenticated,
  canAccessDashboard,
  isAdmin,
  isMainAdmin,
  companyConfig,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Define tabs internally
  const tabs = useMemo(() => [
    { id: 'info', label: t('admin.companyInfo', 'Company Info') },
    { id: 'design', label: t('admin.design', 'Design') },
    { id: 'locations', label: t('admin.locations', 'Locations') },
  ], [t]);

  // ============== STATE ==============
  
  // Tab navigation
  const [activeTab, setActiveTab] = useState('info');
  const [activeLocationSubTab, setActiveLocationSubTab] = useState('company');
  
  // Company editing
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({});
  
  // Security deposit
  const [, setIsEditingDeposit] = useState(false);
  const [securityDepositDraft, setSecurityDepositDraft] = useState('');
  const [isSecurityDepositMandatoryDraft, setIsSecurityDepositMandatoryDraft] = useState(true);
  const [, setIsSavingDeposit] = useState(false);
  
  // Terms of use
  const [termsOfUseDraft, setTermsOfUseDraft] = useState('');
  const [isSavingTermsOfUse, setIsSavingTermsOfUse] = useState(false);
  
  // Stripe
  const [isCreatingStripeAccount, setIsCreatingStripeAccount] = useState(false);
  
  // Locations
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [locationFormData, setLocationFormData] = useState(initialLocationFormData);
  const [locationPage, setLocationPage] = useState(0);
  const [locationPageSize, setLocationPageSize] = useState(10);
  
  // Upload
  const [uploadProgress, setUploadProgress] = useState({ logo: 0, coverImage: 0, favicon: 0 });
  const [isUploading, setIsUploading] = useState({ logo: false, coverImage: false, favicon: false });

  // ============== QUERIES ==============
  
  // Fetch company data
  const { data: companyData, isLoading: isLoadingCompany, error: companyError } = useQuery(
    ['company', currentCompanyId],
    () => apiService.getCompany(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId,
      onSuccess: (data) => {
        const companyInfo = data?.data || data;
        if (companyInfo && (companyInfo.securityDeposit === undefined || companyInfo.securityDeposit === null)) {
          companyInfo.securityDeposit = 1000;
        }
        setCompanyFormData(companyInfo);
        const termsOfUse = companyInfo?.termsOfUse || companyInfo?.TermsOfUse || '';
        setTermsOfUseDraft(termsOfUse);
      },
      onError: (error) => {
        console.error('Error loading company:', error);
        toast.error(t('admin.companyLoadFailed'), { position: 'top-center', autoClose: 3000 });
      }
    }
  );

  // Get actual company data
  const actualCompanyData = useMemo(() => {
    if (!companyData) return null;
    return companyData?.data || companyData;
  }, [companyData]);

  // Fetch Stripe status
  const { data: stripeStatusData, isLoading: isLoadingStripeStatus } = useQuery(
    ['stripeStatus', currentCompanyId],
    async () => {
      try {
        const response = await apiService.getStripeAccountStatus(currentCompanyId);
        const responseData = response?.data || response;
        return responseData?.result || responseData;
      } catch (error) {
        console.error('[CompanySection] Error fetching Stripe status:', error);
        if (error.response?.status === 401 || error.response?.status === 404 || error.response?.status === 503) {
          return { chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false, accountStatus: 'not_started' };
        }
        return { chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false, accountStatus: 'not_started' };
      }
    },
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const stripeStatus = stripeStatusData || {};

  // Fetch company locations
  const { data: companyLocationsData, isLoading: isLoadingCompanyLocations } = useQuery(
    ['companyLocations', currentCompanyId],
    () => apiService.getCompanyLocations({ companyId: currentCompanyId }),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId && activeTab === 'locations' && activeLocationSubTab === 'company',
      onError: (error) => {
        console.error('Error loading company locations:', error);
        toast.error(t('admin.locationsLoadFailed'), { position: 'top-center', autoClose: 3000 });
      }
    }
  );

  // Fetch pickup locations
  const { data: pickupLocationsData, isLoading: isLoadingPickupLocations } = useQuery(
    ['pickupLocations', currentCompanyId],
    () => apiService.getPickupLocations(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId && (activeTab === 'locations'),
      onError: (error) => {
        console.error('Error loading pickup locations:', error);
        toast.error(t('admin.locationsLoadFailed'), { position: 'top-center', autoClose: 3000 });
      }
    }
  );

  // Process locations
  const companyLocations = Array.isArray(companyLocationsData) ? companyLocationsData : [];
  const pickupLocations = Array.isArray(pickupLocationsData) ? pickupLocationsData : [];
  const locations = activeLocationSubTab === 'company' ? companyLocations : pickupLocations;
  const isLoadingLocations = activeLocationSubTab === 'company' ? isLoadingCompanyLocations : isLoadingPickupLocations;

  // ============== MUTATIONS ==============
  
  const updateCompanyMutation = useMutation(
    (data) => apiService.updateCompany(currentCompanyId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['company', currentCompanyId]);
      },
      onError: (error) => {
        console.error('Error updating company:', error);
        const errorMessage = error.response?.data?.message || error.response?.data || t('admin.companyUpdateFailed');
        toast.error(typeof errorMessage === 'string' ? errorMessage : t('admin.companyUpdateFailed'), { position: 'top-center', autoClose: 5000 });
      }
    }
  );

  const createLocationMutation = useMutation(
    (data) => apiService.createLocation(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['locations', currentCompanyId]);
        queryClient.invalidateQueries(['companyLocations', currentCompanyId]);
        queryClient.invalidateQueries(['pickupLocations', currentCompanyId]);
        setIsEditingLocation(false);
        setEditingLocationId(null);
        setLocationFormData(initialLocationFormData);
      },
      onError: (error) => {
        console.error('Error creating location:', error);
        toast.error(error.response?.data?.message || t('admin.locationCreateFailed') || 'Failed to create location');
      }
    }
  );

  const updateLocationMutation = useMutation(
    ({ locationId, data }) => apiService.updateLocation(locationId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['locations', currentCompanyId]);
        queryClient.invalidateQueries(['companyLocations', currentCompanyId]);
        queryClient.invalidateQueries(['pickupLocations', currentCompanyId]);
        setIsEditingLocation(false);
        setEditingLocationId(null);
        setLocationFormData(initialLocationFormData);
      },
      onError: (error) => {
        console.error('Error updating location:', error);
        toast.error(error.response?.data?.message || t('admin.locationUpdateFailed') || 'Failed to update location');
      }
    }
  );

  const deleteLocationMutation = useMutation(
    (locationId) => apiService.deleteLocation(locationId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['locations', currentCompanyId]);
        queryClient.invalidateQueries(['companyLocations', currentCompanyId]);
        queryClient.invalidateQueries(['pickupLocations', currentCompanyId]);
      },
      onError: (error) => {
        console.error('Error deleting location:', error);
        toast.error(t('admin.locationDeleteFailed'), { position: 'top-center', autoClose: 3000 });
      }
    }
  );

  const createCompanyLocationMutation = useMutation(
    (data) => apiService.createCompanyLocation(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyLocations', currentCompanyId]);
        setIsEditingLocation(false);
        setEditingLocationId(null);
        setLocationFormData(initialLocationFormData);
      },
      onError: (error) => {
        console.error('Error creating company location:', error);
        toast.error(error.response?.data?.message || t('admin.locationCreateFailed') || 'Failed to create location');
      }
    }
  );

  const updateCompanyLocationMutation = useMutation(
    ({ locationId, data }) => apiService.updateCompanyLocation(locationId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyLocations', currentCompanyId]);
        setIsEditingLocation(false);
        setEditingLocationId(null);
        setLocationFormData(initialLocationFormData);
      },
      onError: (error) => {
        console.error('Error updating company location:', error);
        toast.error(error.response?.data?.message || t('admin.locationUpdateFailed') || 'Failed to update location');
      }
    }
  );

  const deleteCompanyLocationMutation = useMutation(
    (locationId) => apiService.deleteCompanyLocation(locationId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyLocations', currentCompanyId]);
      },
      onError: (error) => {
        console.error('Error deleting company location:', error);
        toast.error(error.response?.data?.message || t('admin.locationDeleteFailed') || 'Failed to delete location');
      }
    }
  );

  // ============== HANDLERS ==============
  
  const handleCompanyInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'securityDeposit') {
      const numericValue = parseFloat(value);
      setCompanyFormData(prev => ({
        ...prev,
        securityDeposit: value === '' || Number.isNaN(numericValue) ? '' : numericValue
      }));
    } else {
      setCompanyFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  }, []);

  const handleSaveCompany = useCallback(async (e) => {
    e.preventDefault();
    
    const originalSubdomain = companyConfig?.subdomain || actualCompanyData?.subdomain;
    
    const data = {
      companyName: companyFormData.companyName,
      email: companyFormData.email || null,
      website: companyFormData.website || null,
      taxId: companyFormData.taxId || null,
      logoLink: companyFormData.logoLink || null,
      bannerLink: companyFormData.bannerLink || null,
      videoLink: companyFormData.videoLink || null,
      backgroundLink: companyFormData.backgroundLink || null,
      about: companyFormData.about || null,
      termsOfUse: companyFormData.termsOfUse || companyFormData.TermsOfUse || null,
      bookingIntegrated: companyFormData.bookingIntegrated || null,
      companyPath: companyFormData.companyPath || null,
      ...(originalSubdomain ? {} : { subdomain: companyFormData.subdomain?.trim() || null }),
      primaryColor: companyFormData.primaryColor || null,
      secondaryColor: companyFormData.secondaryColor || null,
      logoUrl: companyFormData.logoUrl || null,
      faviconUrl: companyFormData.faviconUrl || null,
      customCss: companyFormData.customCss || null,
      country: companyFormData.country || null,
      securityDeposit: companyFormData.securityDeposit === '' || companyFormData.securityDeposit == null
        ? null : Number(companyFormData.securityDeposit)
    };
    
    // Auto-add https://
    if (data.website && !data.website.match(/^https?:\/\//i)) {
      data.website = 'https://' + data.website;
    }
    if (data.logoLink && !data.logoLink.match(/^https?:\/\//i)) {
      data.logoLink = 'https://' + data.logoLink;
    }
    if (data.bannerLink && !data.bannerLink.match(/^https?:\/\//i)) {
      data.bannerLink = 'https://' + data.bannerLink;
    }
    if (data.videoLink && !data.videoLink.match(/^https?:\/\//i)) {
      data.videoLink = 'https://' + data.videoLink;
    }
    
    if (!currentCompanyId) {
      setIsCreatingCompany(true);
      try {
        const response = await apiService.createCompany(data);
        const newCompanyId = response?.data?.companyId || response?.data?.id;
        setIsCreatingCompany(false);
        queryClient.invalidateQueries('companies');
        if (newCompanyId) {
          queryClient.invalidateQueries(['company', newCompanyId]);
        }
      } catch (error) {
        console.error('Error creating company:', error);
        setIsCreatingCompany(false);
        toast.error(error.response?.data?.message || t('admin.companyCreateFailed') || 'Failed to create company');
      }
    } else {
      updateCompanyMutation.mutate(data);
    }
  }, [companyFormData, companyConfig, actualCompanyData, currentCompanyId, updateCompanyMutation, queryClient, t]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingCompany(false);
    if (actualCompanyData) {
      setCompanyFormData(actualCompanyData);
    }
  }, [actualCompanyData]);

  // NOTE: These security deposit edit functions are defined for future use
  // eslint-disable-next-line no-unused-vars
  const beginSecurityDepositEdit = useCallback(() => {
    if (isEditingCompany || !currentCompanyId) return;
    const currentDeposit = companyFormData.securityDeposit ?? actualCompanyData?.securityDeposit ?? 1000;
    setSecurityDepositDraft(currentDeposit != null ? currentDeposit.toString() : '');
    const currentMandatory = companyFormData.isSecurityDepositMandatory ?? actualCompanyData?.isSecurityDepositMandatory ?? true;
    setIsSecurityDepositMandatoryDraft(currentMandatory);
    setIsEditingDeposit(true);
  }, [isEditingCompany, currentCompanyId, companyFormData, actualCompanyData]);

  // eslint-disable-next-line no-unused-vars
  const cancelSecurityDepositEdit = useCallback(() => {
    setIsEditingDeposit(false);
    setSecurityDepositDraft('');
    setIsSecurityDepositMandatoryDraft(true);
    setIsSavingDeposit(false);
  }, []);

  // eslint-disable-next-line no-unused-vars
  const handleSecurityDepositSave = useCallback(async () => {
    const numericValue = parseFloat(securityDepositDraft);
    if (Number.isNaN(numericValue) || numericValue < 0) {
      toast.error(t('admin.invalidSecurityDeposit', 'Please enter a valid non-negative amount.'));
      return;
    }
    setIsSavingDeposit(true);
    try {
      await apiService.updateCompany(currentCompanyId, {
        securityDeposit: numericValue,
        isSecurityDepositMandatory: isSecurityDepositMandatoryDraft,
      });
      queryClient.invalidateQueries(['company', currentCompanyId]);
      setIsEditingDeposit(false);
      toast.success(t('admin.securityDepositSaved', 'Security deposit saved successfully.'));
    } catch (error) {
      console.error('Error saving security deposit:', error);
      toast.error(t('admin.securityDepositSaveError', 'Failed to save security deposit.'));
    } finally {
      setIsSavingDeposit(false);
    }
  }, [securityDepositDraft, isSecurityDepositMandatoryDraft, currentCompanyId, queryClient, t]);

  const handleTermsOfUseSave = useCallback(async () => {
    setIsSavingTermsOfUse(true);
    try {
      await apiService.updateCompany(currentCompanyId, { termsOfUse: termsOfUseDraft });
      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success(t('admin.termsOfUseSaved', 'Terms of Use saved successfully.'));
    } catch (error) {
      console.error('Error saving terms of use:', error);
      toast.error(t('admin.termsOfUseSaveError', 'Failed to save Terms of Use.'));
    } finally {
      setIsSavingTermsOfUse(false);
    }
  }, [termsOfUseDraft, currentCompanyId, queryClient, t]);

  const handleCreateStripeAccount = useCallback(async () => {
    if (!currentCompanyId) return;
    setIsCreatingStripeAccount(true);
    try {
      const response = await apiService.createStripeConnectAccount(currentCompanyId);
      const onboardingUrl = response?.data?.url || response?.url;
      if (onboardingUrl) {
        window.location.href = onboardingUrl;
      } else {
        toast.error(t('admin.stripeOnboardingError', 'Could not get Stripe onboarding URL'));
        setIsCreatingStripeAccount(false);
      }
    } catch (error) {
      console.error('Error creating Stripe account:', error);
      toast.error(error.response?.data?.message || t('admin.stripeAccountCreateFailed', 'Failed to create Stripe account'));
      setIsCreatingStripeAccount(false);
    }
  }, [currentCompanyId, t]);

  // Location handlers
  const handleLocationInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setLocationFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const handleAddLocation = useCallback(() => {
    setIsEditingLocation(true);
    setEditingLocationId(null);
    setLocationFormData(initialLocationFormData);
  }, []);

  const handleEditLocation = useCallback((location) => {
    setIsEditingLocation(true);
    const locId = location.companyLocationId || location.locationId || location.id;
    setEditingLocationId(locId);
    setLocationFormData({
      locationName: location.locationName || location.name || '',
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      country: location.country || '',
      postalCode: location.postalCode || location.zipCode || '',
      phone: location.phone || '',
      email: location.email || '',
      latitude: location.latitude || '',
      longitude: location.longitude || '',
      isPickupLocation: location.isPickupLocation ?? true,
      isReturnLocation: location.isReturnLocation ?? true,
      isOffice: location.isOffice ?? false,
      openingHours: location.openingHours || '',
      isActive: location.isActive ?? true,
    });
  }, []);

  const handleSaveLocation = useCallback(() => {
    const data = {
      ...locationFormData,
      companyId: currentCompanyId,
    };
    
    if (activeLocationSubTab === 'company') {
      if (editingLocationId) {
        updateCompanyLocationMutation.mutate({ locationId: editingLocationId, data });
      } else {
        createCompanyLocationMutation.mutate(data);
      }
    } else {
      if (editingLocationId) {
        updateLocationMutation.mutate({ locationId: editingLocationId, data });
      } else {
        createLocationMutation.mutate(data);
      }
    }
  }, [locationFormData, currentCompanyId, activeLocationSubTab, editingLocationId, updateCompanyLocationMutation, createCompanyLocationMutation, updateLocationMutation, createLocationMutation]);

  const handleCancelLocationEdit = useCallback(() => {
    setIsEditingLocation(false);
    setEditingLocationId(null);
    setLocationFormData(initialLocationFormData);
  }, []);

  const handleDeleteLocation = useCallback((locationId) => {
    if (!window.confirm(t('admin.confirmDeleteLocation', 'Are you sure you want to delete this location?'))) {
      return;
    }
    if (activeLocationSubTab === 'company') {
      deleteCompanyLocationMutation.mutate(locationId);
    } else {
      deleteLocationMutation.mutate(locationId);
    }
  }, [activeLocationSubTab, deleteCompanyLocationMutation, deleteLocationMutation, t]);

  // File upload handlers
  const handleFileUpload = useCallback(async (file, type) => {
    if (!file || !currentCompanyId) return;
    
    setIsUploading(prev => ({ ...prev, [type]: true }));
    setUploadProgress(prev => ({ ...prev, [type]: 0 }));
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const response = await apiService.uploadCompanyImage(currentCompanyId, formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => ({ ...prev, [type]: progress }));
        }
      });
      
      const url = response?.data?.url || response?.url;
      if (url) {
        const fieldName = type === 'logo' ? 'logoLink' : type === 'banner' ? 'bannerLink' : 'videoLink';
        setCompanyFormData(prev => ({ ...prev, [fieldName]: url }));
        queryClient.invalidateQueries(['company', currentCompanyId]);
        toast.success(t('admin.uploadSuccess', 'File uploaded successfully'));
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(t('admin.uploadError', 'Failed to upload file'));
    } finally {
      setIsUploading(prev => ({ ...prev, [type]: false }));
      setUploadProgress(prev => ({ ...prev, [type]: 0 }));
    }
  }, [currentCompanyId, queryClient, t]);

  const handleLogoUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'logo');
  }, [handleFileUpload]);

  const handleBannerUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'banner');
  }, [handleFileUpload]);

  // eslint-disable-next-line no-unused-vars
  const handleVideoUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'video');
  }, [handleFileUpload]);

  const handleLogoDelete = useCallback(async () => {
    if (!window.confirm(t('admin.confirmDeleteLogo', 'Are you sure you want to delete the logo?'))) return;
    try {
      await apiService.updateCompany(currentCompanyId, { logoLink: null });
      setCompanyFormData(prev => ({ ...prev, logoLink: null }));
      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success(t('admin.logoDeleted', 'Logo deleted successfully'));
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast.error(t('admin.logoDeleteError', 'Failed to delete logo'));
    }
  }, [currentCompanyId, queryClient, t]);

  const handleBannerDelete = useCallback(async () => {
    if (!window.confirm(t('admin.confirmDeleteBanner', 'Are you sure you want to delete the banner?'))) return;
    try {
      await apiService.updateCompany(currentCompanyId, { bannerLink: null });
      setCompanyFormData(prev => ({ ...prev, bannerLink: null }));
      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success(t('admin.bannerDeleted', 'Banner deleted successfully'));
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error(t('admin.bannerDeleteError', 'Failed to delete banner'));
    }
  }, [currentCompanyId, queryClient, t]);

  // eslint-disable-next-line no-unused-vars
  const handleVideoDelete = useCallback(async () => {
    if (!window.confirm(t('admin.confirmDeleteVideo', 'Are you sure you want to delete the video?'))) return;
    try {
      await apiService.updateCompany(currentCompanyId, { videoLink: null });
      setCompanyFormData(prev => ({ ...prev, videoLink: null }));
      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success(t('admin.videoDeleted', 'Video deleted successfully'));
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error(t('admin.videoDeleteError', 'Failed to delete video'));
    }
  }, [currentCompanyId, queryClient, t]);

  // ============== LOCATION TABLE ==============
  
  const locationColumns = useMemo(() => [
    {
      accessorKey: 'locationName',
      header: t('admin.locationName', 'Location Name'),
      cell: ({ row }) => row.original.locationName || row.original.name || '-',
    },
    {
      accessorKey: 'address',
      header: t('admin.address', 'Address'),
      cell: ({ row }) => {
        const loc = row.original;
        const parts = [loc.address, loc.city, loc.state, loc.country].filter(Boolean);
        return parts.join(', ') || '-';
      },
    },
    {
      accessorKey: 'phone',
      header: t('admin.phone', 'Phone'),
      cell: ({ row }) => row.original.phone || '-',
    },
    {
      id: 'actions',
      header: t('admin.actions', 'Actions'),
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleEditLocation(row.original)}
            className="text-blue-600 hover:text-blue-800"
          >
            {t('common.edit', 'Edit')}
          </button>
          <button
            type="button"
            onClick={() => handleDeleteLocation(row.original.companyLocationId || row.original.locationId || row.original.id)}
            className="text-red-600 hover:text-red-800"
          >
            {t('common.delete', 'Delete')}
          </button>
        </div>
      ),
    },
  ], [t, handleEditLocation, handleDeleteLocation]);

  const locationTable = useReactTable({
    data: locations,
    columns: locationColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination: { pageIndex: locationPage, pageSize: locationPageSize },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newState = updater({ pageIndex: locationPage, pageSize: locationPageSize });
        setLocationPage(newState.pageIndex);
        setLocationPageSize(newState.pageSize);
      }
    },
  });

  // ============== RENDER ==============
  
  return (
    <Card
      title={
        <div className="flex items-center">
          {activeTab === 'locations' ? (
            <>
              <MapPin className="h-6 w-6 text-blue-600 mr-2" />
              <span>{t('admin.locations', 'Locations')}</span>
            </>
          ) : (
            <>
              <Building2 className="h-6 w-6 text-blue-600 mr-2" />
              <span>
                {!currentCompanyId && isEditingCompany
                  ? t('admin.createCompany') || 'Create Company'
                  : t('admin.companyProfile')}
              </span>
            </>
          )}
        </div>
      }
    >
      <div>
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

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
        ) : activeTab === 'locations' ? (
          /* Locations Tab */
          <div className="space-y-6">
            {/* Sub-tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  type="button"
                  onClick={() => setActiveLocationSubTab('company')}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                    activeLocationSubTab === 'company'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t('admin.companyLocations', 'Company Locations')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLocationSubTab('pickup')}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                    activeLocationSubTab === 'pickup'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t('admin.pickupLocations', 'Pickup Locations')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLocationSubTab('management')}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                    activeLocationSubTab === 'management'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t('admin.manageLocations', 'Manage Locations')}
                </button>
              </nav>
            </div>

            {/* Add Location Button */}
            {!isEditingLocation && isAdmin && activeLocationSubTab !== 'management' && (
              <div className="flex justify-end">
                <button type="button" onClick={handleAddLocation} className="btn-primary">
                  + {t('admin.addLocation')}
                </button>
              </div>
            )}

            {/* Management Tab */}
            {activeLocationSubTab === 'management' ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    {t('admin.manageLocationsDescription', 'Assign vehicles to locations by dragging and dropping.')}
                  </p>
                </div>
                <VehicleLocations embedded={true} />
              </div>
            ) : (
              <>
                {/* Location Form */}
                {isEditingLocation && (
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
                      <div>
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
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button type="button" onClick={handleSaveLocation} className="btn-primary">
                        <Save className="h-4 w-4 mr-2" />
                        {t('common.save')}
                      </button>
                      <button type="button" onClick={handleCancelLocationEdit} className="btn-secondary">
                        <X className="h-4 w-4 mr-2" />
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Location Table */}
                {isLoadingLocations ? (
                  <LoadingSpinner text={t('common.loading')} />
                ) : locations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">{t('admin.noLocations', 'No locations found')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        {locationTable.getHeaderGroups().map(headerGroup => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                              <th key={header.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {locationTable.getRowModel().rows.map(row => (
                          <tr key={row.id}>
                            {row.getVisibleCells().map(cell => (
                              <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => locationTable.setPageIndex(0)}
                          disabled={!locationTable.getCanPreviousPage()}
                          className="p-1 disabled:opacity-50"
                        >
                          <ChevronsLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => locationTable.previousPage()}
                          disabled={!locationTable.getCanPreviousPage()}
                          className="p-1 disabled:opacity-50"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="text-sm text-gray-700">
                          {t('common.page')} {locationTable.getState().pagination.pageIndex + 1} {t('common.of')} {locationTable.getPageCount()}
                        </span>
                        <button
                          type="button"
                          onClick={() => locationTable.nextPage()}
                          disabled={!locationTable.getCanNextPage()}
                          className="p-1 disabled:opacity-50"
                        >
                          <ChevronRightIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => locationTable.setPageIndex(locationTable.getPageCount() - 1)}
                          disabled={!locationTable.getCanNextPage()}
                          className="p-1 disabled:opacity-50"
                        >
                          <ChevronsRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeTab === 'info' ? (
          /* Info Tab - Company Form */
          <form onSubmit={handleSaveCompany} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.companyName')} *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={companyFormData.companyName || ''}
                  onChange={handleCompanyInputChange}
                  className="input-field"
                  required
                  disabled={!isEditingCompany && !isAdmin}
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
                  disabled={!isEditingCompany && !isAdmin}
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
                  placeholder="https://example.com"
                  disabled={!isEditingCompany && !isAdmin}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.country')}
                </label>
                <select
                  name="country"
                  value={companyFormData.country || ''}
                  onChange={handleCompanyInputChange}
                  className="input-field"
                  disabled={!isEditingCompany && !isAdmin}
                >
                  <option value="">{t('admin.selectCountry', 'Select country')}</option>
                  {Object.entries(countriesByContinent).map(([continent, countries]) => (
                    <optgroup key={continent} label={continent}>
                      {countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.securityDeposit')}
                </label>
                <input
                  type="number"
                  name="securityDeposit"
                  value={companyFormData.securityDeposit ?? ''}
                  onChange={handleCompanyInputChange}
                  className="input-field"
                  min="0"
                  step="0.01"
                  disabled={!isEditingCompany && !isAdmin}
                />
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
                  disabled={!!companyConfig?.subdomain || (!isEditingCompany && !isAdmin)}
                />
              </div>
            </div>

            {/* Stripe Status */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                {t('admin.stripeConnect', 'Stripe Connect')}
              </h3>
              {isLoadingStripeStatus ? (
                <LoadingSpinner text={t('common.loading')} />
              ) : stripeStatus?.chargesEnabled ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">
                    ✓ {t('admin.stripeConnected', 'Stripe account connected and active')}
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 mb-3">
                    {t('admin.stripeNotConnected', 'Connect your Stripe account to accept payments')}
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateStripeAccount}
                    disabled={isCreatingStripeAccount}
                    className="btn-primary"
                  >
                    {isCreatingStripeAccount ? t('common.loading') : t('admin.connectStripe', 'Connect Stripe')}
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {(isEditingCompany || isAdmin) && (
              <div className="flex gap-3 pt-4 border-t">
                <button type="submit" className="btn-primary" disabled={updateCompanyMutation.isLoading || isCreatingCompany}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateCompanyMutation.isLoading || isCreatingCompany ? t('common.saving') : t('common.save')}
                </button>
                {isEditingCompany && (
                  <button type="button" onClick={handleCancelEdit} className="btn-secondary">
                    <X className="h-4 w-4 mr-2" />
                    {t('common.cancel')}
                  </button>
                )}
              </div>
            )}
          </form>
        ) : activeTab === 'design' ? (
          /* Design Tab */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.primaryColor', 'Primary Color')}
                </label>
                <input
                  type="color"
                  name="primaryColor"
                  value={companyFormData.primaryColor || '#3B82F6'}
                  onChange={handleCompanyInputChange}
                  className="h-10 w-full rounded border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.secondaryColor', 'Secondary Color')}
                </label>
                <input
                  type="color"
                  name="secondaryColor"
                  value={companyFormData.secondaryColor || '#1E40AF'}
                  onChange={handleCompanyInputChange}
                  className="h-10 w-full rounded border border-gray-300"
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.logo', 'Logo')}
              </label>
              <div className="flex items-center gap-4">
                {companyFormData.logoLink && (
                  <img src={companyFormData.logoLink} alt="Logo" className="h-16 w-16 object-contain" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="input-field"
                  disabled={isUploading.logo}
                />
                {companyFormData.logoLink && (
                  <button type="button" onClick={handleLogoDelete} className="text-red-600 hover:text-red-800">
                    {t('common.delete')}
                  </button>
                )}
              </div>
              {isUploading.logo && (
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${uploadProgress.logo}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Banner Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.banner', 'Banner')}
              </label>
              <div className="flex items-center gap-4">
                {companyFormData.bannerLink && (
                  <img src={companyFormData.bannerLink} alt="Banner" className="h-16 w-32 object-cover" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="input-field"
                  disabled={isUploading.banner}
                />
                {companyFormData.bannerLink && (
                  <button type="button" onClick={handleBannerDelete} className="text-red-600 hover:text-red-800">
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </div>

            {/* Terms of Use */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {t('admin.termsOfUse', 'Terms of Use')}
              </h3>
              <MultiLanguageTipTapEditor
                value={termsOfUseDraft}
                onChange={setTermsOfUseDraft}
                placeholder={t('admin.termsOfUsePlaceholder', 'Enter your terms of use...')}
              />
              <button
                type="button"
                onClick={handleTermsOfUseSave}
                disabled={isSavingTermsOfUse}
                className="btn-primary mt-4"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSavingTermsOfUse ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
};

export default CompanySection;
