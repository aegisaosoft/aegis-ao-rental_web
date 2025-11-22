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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { translateCategory } from '../i18n/translateHelpers';
import { Building2, Save, X, LayoutDashboard, Car, Users, TrendingUp, Calendar, ChevronDown, ChevronRight, Plus, Edit, Trash2, ChevronLeft, ChevronsLeft, ChevronRight as ChevronRightIcon, ChevronsRight, Search, Upload, Pencil, Trash, MapPin } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { PageContainer, PageHeader, Card, EmptyState, LoadingSpinner } from '../components/common';
import { getStatesForCountry } from '../utils/statesByCountry';
import MultiLanguageTipTapEditor from '../components/MultiLanguageTipTapEditor';
import VehicleLocations from './VehicleLocations';
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
  const { t: i18nT, i18n } = useTranslation();
  const translate = useCallback(
    (key, fallback) => {
      if (!key) return String(fallback ?? '');
      
      try {
        const normalizedKey = key.startsWith('vehicles.') ? key.slice('vehicles.'.length) : key;

        let translation = i18nT(normalizedKey);

        if (!translation || translation === normalizedKey) {
          translation = i18nT(key);
        }

        // Check if translation is invalid
        if (!translation || translation === key || translation === normalizedKey) {
          return String(fallback ?? '');
        }

        // Ensure we always return a string, not an object
        if (typeof translation === 'object' || translation === null) {
          console.warn(`Translation for "${key}" returned an object instead of string. Using fallback.`);
          return String(fallback ?? '');
        }

        // Force string conversion
        const result = String(translation);
        
        // Validate the result is actually a string
        if (typeof result !== 'string' || result === '[object Object]') {
          console.warn(`Translation for "${key}" resulted in invalid string. Using fallback.`);
          return String(fallback ?? '');
        }

        return result;
      } catch (error) {
        console.error(`Error translating "${key}":`, error);
        return String(fallback ?? '');
      }
    },
    [i18nT]
  );

  const t = translate;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isAdmin, isMainAdmin, canAccessDashboard, restoreUser } = useAuth();
  const { companyConfig, formatPrice, currencySymbol, currencyCode, isSubdomainAccess } = useCompany();
  const queryClient = useQueryClient();
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isEditingDeposit, setIsEditingDeposit] = useState(false);
  const [termsOfUseDraft, setTermsOfUseDraft] = useState('');
  const [isSavingTermsOfUse, setIsSavingTermsOfUse] = useState(false);
  const [securityDepositDraft, setSecurityDepositDraft] = useState('');
  const [isSecurityDepositMandatoryDraft, setIsSecurityDepositMandatoryDraft] = useState(true);
  const [isSavingDeposit, setIsSavingDeposit] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({});
  const [currentCompanyId, setCurrentCompanyId] = useState(null);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  
  // Get initial tab from URL parameter, default to 'company' for activeSection
  const initialTab = searchParams.get('tab') || 'company';
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'design', or 'locations'
  const [activeLocationSubTab, setActiveLocationSubTab] = useState('company'); // 'company', 'pickup', or 'management'
  const [activeSection, setActiveSection] = useState(initialTab); // 'company', 'vehicles', 'reservations', 'additionalServices', 'employees', 'reports', etc.
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
    isOffice: false,
    openingHours: '',
    isActive: true
  });

  // State for vehicle fleet tree
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedMakes, setExpandedMakes] = useState({});
  
  // State for vehicle management pagination
  const [vehiclePage, setVehiclePage] = useState(0);
  const [vehiclePageSize, setVehiclePageSize] = useState(10);
  
  // State for locations pagination
  const [locationPage, setLocationPage] = useState(0);
  const [locationPageSize, setLocationPageSize] = useState(10);
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [vehicleMakeFilter, setVehicleMakeFilter] = useState('');
  const [vehicleModelFilter, setVehicleModelFilter] = useState('');
  const [vehicleYearFilter, setVehicleYearFilter] = useState('');
  const [vehicleLicensePlateFilter, setVehicleLicensePlateFilter] = useState('');
  const [vehicleLocationFilter, setVehicleLocationFilter] = useState('');
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
  const [bookingDateFrom, setBookingDateFrom] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [bookingDateTo, setBookingDateTo] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingPageSize, setBookingPageSize] = useState(10);
  const [syncingPayments, setSyncingPayments] = useState(false);
  const [showSyncConfirmModal, setShowSyncConfirmModal] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  
  // Reservation wizard state
  const [showReservationWizard, setShowReservationWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardCustomerEmail, setWizardCustomerEmail] = useState('');
  const [wizardCustomer, setWizardCustomer] = useState(null);
  const [wizardSearchingCustomer, setWizardSearchingCustomer] = useState(false);
  const [wizardCreatingCustomer, setWizardCreatingCustomer] = useState(false);
  const [wizardPickupDate, setWizardPickupDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [wizardReturnDate, setWizardReturnDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [wizardSelectedLocation, setWizardSelectedLocation] = useState(null);
  const [wizardSelectedCategory, setWizardSelectedCategory] = useState(null);
  const [wizardSelectedMake, setWizardSelectedMake] = useState(null);
  const [wizardSelectedModel, setWizardSelectedModel] = useState(null);
  const [wizardModelsByMake, setWizardModelsByMake] = useState({}); // { make: [models] }
  const [wizardExpandedMakes, setWizardExpandedMakes] = useState(new Set()); // Track which makes are expanded in wizard
  const [isLoadingWizardModels, setIsLoadingWizardModels] = useState(false);
  const [wizardSelectedServices, setWizardSelectedServices] = useState([]); // Selected additional services
  const [wizardAdditionalServices, setWizardAdditionalServices] = useState([]); // Available additional services
  const [isLoadingWizardServices, setIsLoadingWizardServices] = useState(false);
  
  // State for booking details modal
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  
  // State for refund modal (when canceling booking)
  const [showCancelRefundModal, setShowCancelRefundModal] = useState(false);
  const [cancelRefundAmount, setCancelRefundAmount] = useState('');
  const [cancelRefundReason, setCancelRefundReason] = useState('');
  const [pendingCancelStatus, setPendingCancelStatus] = useState('');
  
  // State for security deposit payment modal
  const [showSecurityDepositModal, setShowSecurityDepositModal] = useState(false);
  const [showBookingPaymentModal, setShowBookingPaymentModal] = useState(false); // Modal for booking total payment
  const [pendingActiveStatus, setPendingActiveStatus] = useState('');
  const [pendingConfirmedStatus, setPendingConfirmedStatus] = useState(''); // Track pending status update after payment
  const [payingSecurityDeposit, setPayingSecurityDeposit] = useState(false);
  const [payingBooking, setPayingBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(''); // 'terminal' or 'checkout'
  
  // State for damage confirmation modal when completing booking
  const [showDamageConfirmationModal, setShowDamageConfirmationModal] = useState(false);
  const [hasDamage, setHasDamage] = useState(false);
  const [damageAmount, setDamageAmount] = useState('');
  const [pendingCompletedStatus, setPendingCompletedStatus] = useState('');
  
  // State for employees
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState(20);
  const [customerSearch, setCustomerSearch] = useState('');
  
  // State for Add/Edit Employee modal
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [employeeSearchEmail, setEmployeeSearchEmail] = useState('');
  const [foundCustomers, setFoundCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedRole, setSelectedRole] = useState('worker');
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [isSettingEmployee, setIsSettingEmployee] = useState(false);

  useEffect(() => {
    setBookingPage(1);
  }, [bookingStatusFilter, bookingCustomerFilter, bookingDateFrom, bookingDateTo]);

  // Handle Stripe Checkout return (success/cancel)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isStripeReturn = urlParams.get('deposit_success') === 'true' || 
                          urlParams.get('deposit_cancelled') === 'true' ||
                          urlParams.get('session_id') !== null; // Stripe Checkout returns session_id
    
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
            console.log('[AdminDashboard] ✅ User data restored after Stripe return, role:', userData.role);
          }
        } catch (error) {
          if (error.response?.status === 401) {
            console.error('[AdminDashboard] ❌ Session lost after Stripe redirect');
            
            // Try to restore from sessionStorage backup
            const storedUserData = sessionStorage.getItem('stripeUserBackup');
            if (storedUserData) {
              try {
                const userData = JSON.parse(storedUserData);
                console.log('[AdminDashboard] Attempting to restore user data from backup');
                
                // Try to restore session using stored token if available
                const storedToken = sessionStorage.getItem('stripeTokenBackup');
                if (storedToken) {
                  try {
                    await apiService.setSessionToken(storedToken, userData.companyId, userData.id);
                    // After restoring token, get profile to restore full user data
                    const profileResponse = await apiService.getProfile();
                    restoreUser(profileResponse.data);
                    console.log('[AdminDashboard] ✅ Session restored from backup');
                    // Clean up backups
                    sessionStorage.removeItem('stripeUserBackup');
                    sessionStorage.removeItem('stripeTokenBackup');
                    return;
                  } catch (restoreError) {
                    console.error('[AdminDashboard] Failed to restore session:', restoreError);
                  }
                }
              } catch (parseError) {
                console.error('[AdminDashboard] Failed to parse stored user data:', parseError);
              }
            }
            
            toast.error(t('admin.sessionExpired', 'Your session expired. Please log in again.'));
            // Redirect to login after a short delay
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
            return;
          }
        }
      };
      
      restoreSession();
    }
    
    if (urlParams.get('deposit_success') === 'true') {
      const bookingId = urlParams.get('booking_id');
      console.log('✅ Security deposit payment successful for booking:', bookingId);
      // Clean up URL
      window.history.replaceState({}, '', '/admin-dashboard?tab=reservations');
      // Refresh bookings list
      setTimeout(() => {
        queryClient.invalidateQueries(['companyBookings', currentCompanyId]);
      }, 1000);
    } else if (urlParams.get('deposit_cancelled') === 'true') {
      toast.warning(t('admin.securityDepositCancelled', 'Security deposit payment was cancelled.'));
      console.log('⚠️ Security deposit payment cancelled');
      // Clean up URL
      window.history.replaceState({}, '', '/admin-dashboard?tab=reservations');
    }
  }, [t, queryClient, currentCompanyId, restoreUser]);

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
  // Prohibit company switching when accessing via subdomain
  useEffect(() => {
    const companyId = getCompanyId();
    
    // If accessing via subdomain, lock to this company only
    if (isSubdomainAccess && companyId) {
      setCurrentCompanyId(companyId);
    } else {
      // Otherwise allow normal company selection
      setCurrentCompanyId(companyId);
    }
    
    // Invalidate queries when company changes
    if (companyId) {
      queryClient.invalidateQueries(['company']);
      queryClient.invalidateQueries(['vehiclesCount']);
      queryClient.invalidateQueries(['modelsGroupedByCategory']);
    }
  }, [companyConfig?.id, queryClient, getCompanyId, isSubdomainAccess]);

  // Debug: Monitor security deposit modal state
  useEffect(() => {
    console.log('🔍 Security Deposit Modal State Changed:', showSecurityDepositModal);
    if (showSecurityDepositModal) {
      console.log('📋 Selected Booking:', selectedBooking);
      console.log('💰 Security Deposit Amount (camelCase):', selectedBooking?.securityDeposit);
      console.log('💰 Security Deposit Amount (PascalCase):', selectedBooking?.SecurityDeposit);
    }
  }, [showSecurityDepositModal, selectedBooking]);

  // Fetch current user's company data
  const { data: companyData, isLoading: isLoadingCompany, error: companyError } = useQuery(
    ['company', currentCompanyId],
    () => apiService.getCompany(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId,
      onSuccess: (data) => {
        // Handle both axios response format and direct data
        const companyInfo = data?.data || data;
        if (companyInfo && (companyInfo.securityDeposit === undefined || companyInfo.securityDeposit === null)) {
          companyInfo.securityDeposit = 1000;
        }
        setCompanyFormData(companyInfo);
        // Initialize Terms of Use draft with current value
        const termsOfUse = companyInfo?.termsOfUse || companyInfo?.TermsOfUse || '';
        setTermsOfUseDraft(termsOfUse);
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
  const { data: companyLocationsData, isLoading: isLoadingCompanyLocations } = useQuery(
    ['companyLocations', currentCompanyId],
    () => apiService.getCompanyLocations({ companyId: currentCompanyId }),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId && activeTab === 'locations' && activeLocationSubTab === 'company',
      onError: (error) => {
        console.error('Error loading company locations:', error);
        toast.error(t('admin.locationsLoadFailed'), {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    }
  );

  // Fetch pickup locations (needed for both locations tab and vehicle edit form)
  const { data: pickupLocationsData, isLoading: isLoadingPickupLocations } = useQuery(
    ['pickupLocations', currentCompanyId],
    () => apiService.getPickupLocations(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId && (activeTab === 'locations' || activeTab === 'vehicles'),
      onError: (error) => {
        console.error('Error loading pickup locations:', error);
        toast.error(t('admin.locationsLoadFailed'), {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    }
  );

  // Ensure locations are always arrays
  // translatedApiService methods now return data directly, not axios response
  const companyLocations = Array.isArray(companyLocationsData) ? companyLocationsData : [];
  const pickupLocations = Array.isArray(pickupLocationsData) ? pickupLocationsData : [];
  const locations = activeLocationSubTab === 'company' ? companyLocations : pickupLocations;
  const isLoadingLocations = activeLocationSubTab === 'company' ? isLoadingCompanyLocations : isLoadingPickupLocations;

  // Vehicle update mutation
  const updateVehicleMutation = useMutation(
    ({ vehicleId, data }) => apiService.updateVehicle(vehicleId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vehicles', currentCompanyId]);
        setEditingVehicle(null);
        setVehicleEditForm({});
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
      },
      onError: (error) => {
        console.error('Error creating vehicle:', error);
        toast.error(error.response?.data?.message || t('vehicles.createError') || 'Failed to create vehicle');
      }
    }
  );

  // Booking status update mutation
  const updateBookingStatusMutation = useMutation(
    ({ bookingId, status, securityDepositDamageAmount }) => apiService.updateBooking(bookingId, { status, securityDepositDamageAmount }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyBookings', currentCompanyId]);
        setShowBookingDetailsModal(false);
        setSelectedBooking(null);
      },
      onError: (error) => {
        console.error('Error updating booking status:', error);
        toast.error(error.response?.data?.message || t('admin.bookingUpdateError', 'Failed to update booking status'));
      }
    }
  );

  // Refund payment mutation
  const refundPaymentMutation = useMutation(
    ({ bookingId, amount, reason }) => apiService.refundPayment(bookingId, amount, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyBookings', currentCompanyId]);
        setShowBookingDetailsModal(false);
        setSelectedBooking(null);
      },
      onError: (error) => {
        console.error('Error processing refund:', error);
        toast.error(error.response?.data?.message || t('admin.refundError', 'Failed to process refund'));
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
      location: vehicle.Location || vehicle.location || '',
      locationId: vehicle.LocationId || vehicle.locationId || vehicle.location_id || ''
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
      features: vehicleCreateForm.features ? (Array.isArray(vehicleCreateForm.features) ? vehicleCreateForm.features : vehicleCreateForm.features.split(',').map(f => f.trim())) : null
    };

    createVehicleMutation.mutate(createData);
  };

  const collectVinFields = (root) => {
    const fields = new Map();
    const queue = [];
    const visited = new Set();

    const enqueue = (value) => {
      if (!value) return;
      if (typeof value !== 'object') return;
      if (visited.has(value)) return;
      visited.add(value);
      queue.push(value);
    };

    if (Array.isArray(root)) {
      root.forEach(enqueue);
    } else if (root && typeof root === 'object') {
      enqueue(root);
    }

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') continue;

      Object.entries(current).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          const normalizedKey = String(key).toLowerCase();
          if (!fields.has(normalizedKey)) {
            fields.set(normalizedKey, value);
          }

          if (Array.isArray(value)) {
            value.forEach(enqueue);
          } else if (typeof value === 'object') {
            enqueue(value);
          }
        }
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[VIN Lookup] Flattened fields:', Array.from(fields.entries()));
    }

    return fields;
  };

  const mapVinDataToFormUpdates = (vehicleData) => {
    if (!vehicleData) {
      return {};
    }

    const fields = collectVinFields(vehicleData);
    if (fields.size === 0) {
      return {};
    }

    const getFirstValue = (keys, transform = (value) => value) => {
      for (const key of keys) {
        const normalizedKey = key.toLowerCase();
        if (fields.has(normalizedKey)) {
          return transform(fields.get(normalizedKey));
        }
      }
      return undefined;
    };

    const toStringValue = (value) => {
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.map(toStringValue).join(', ');
      return String(value);
    };

    const updates = {};
    const makeValue = getFirstValue(['make', 'manufacturer', 'make_name', 'brand']);
    if (makeValue !== undefined) {
      updates.make = toStringValue(makeValue);
    }

    const modelValue = getFirstValue(['model', 'modelname', 'model_name']);
    if (modelValue !== undefined) {
      updates.model = toStringValue(modelValue);
    }

    const yearValue = getFirstValue(['year', 'modelyear', 'vehicle_year'], (value) => {
      const numeric = parseInt(value, 10);
      if (!Number.isNaN(numeric) && numeric >= 1900 && numeric <= 2100) {
        return numeric.toString();
      }
      return toStringValue(value);
    });
    if (yearValue !== undefined) {
      updates.year = yearValue;
    }

    const colorValue = getFirstValue(['color', 'exteriorcolor']);
    if (colorValue !== undefined) {
      updates.color = toStringValue(colorValue);
    }

    const transmissionValue = getFirstValue(['transmission', 'drivetype', 'transmissiontype']);
    if (transmissionValue !== undefined) {
      updates.transmission = toStringValue(transmissionValue);
    }

    const seatsValue = getFirstValue(['seats', 'seatcount', 'passengercapacity'], (value) => {
      const numeric = parseInt(value, 10);
      if (!Number.isNaN(numeric) && numeric > 0) {
        return numeric.toString();
      }
      return toStringValue(value);
    });
    if (seatsValue !== undefined) {
      updates.seats = seatsValue;
    }

    return updates;
  };

  const lookupVinAndPopulateForm = async (vin, updateForm) => {
    const normalizedVin = vin?.trim().toUpperCase();

    if (!normalizedVin || normalizedVin.length !== 17) {
      toast.error(t('vehicles.invalidVin') || 'Please enter a valid 17-character VIN');
      return;
    }

    setIsLookingUpVin(true);
    try {
      const response = await apiService.lookupVehicleByVin(normalizedVin);
      const rawPayload = response?.data?.data ?? response?.data ?? response;
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[VIN Lookup] Raw payload:', rawPayload);
      }
      const updates = mapVinDataToFormUpdates(rawPayload);

      updateForm((prev) => ({
        ...prev,
        vin: normalizedVin,
        ...updates,
      }));
    } catch (error) {
      console.error('[AdminDashboard] VIN lookup error:', error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t('vehicles.vinLookupError') ||
        'Failed to lookup VIN information';
      toast.error(message);
    } finally {
      setIsLookingUpVin(false);
    }
  };

  const handleVinLookup = () => lookupVinAndPopulateForm(vehicleEditForm.vin, setVehicleEditForm);
  const handleCreateVinLookup = () => lookupVinAndPopulateForm(vehicleCreateForm.vin, setVehicleCreateForm);

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
    if (vehicleEditForm.locationId !== undefined) {
      // Send locationId as-is if it's a valid value, or null if empty
      updateData.locationId = vehicleEditForm.locationId && vehicleEditForm.locationId !== '' ? vehicleEditForm.locationId : null;
    }

    console.log('[AdminDashboard] Saving vehicle with updateData:', updateData);
    console.log('[AdminDashboard] locationId value:', updateData.locationId);
    console.log('[AdminDashboard] locationId type:', typeof updateData.locationId);

    updateVehicleMutation.mutate({ vehicleId, data: updateData });
  };

  // Fetch models grouped by category for vehicle fleet
  // Load on dashboard open (not just when vehicles section is active) so filters have data
  const { data: modelsGroupedData, isLoading: isLoadingModels } = useQuery(
    ['modelsGroupedByCategory', currentCompanyId],
    () => apiService.getModelsGroupedByCategory(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId,
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
  // Use query parameters: /vehicles?companyId=xxx&page=1&pageSize=20&make=xxx&model=xxx&year=xxx&licensePlate=xxx&locationId=xxx
  const { data: vehiclesListData, isLoading: isLoadingVehiclesList } = useQuery(
    ['vehicles', currentCompanyId, vehiclePage, vehiclePageSize, vehicleMakeFilter, vehicleModelFilter, vehicleYearFilter, vehicleLicensePlateFilter, vehicleLocationFilter],
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
      
      // Add location filter if selected
      if (vehicleLocationFilter) {
        params.locationId = vehicleLocationFilter;
      }
      
      return apiService.getVehicles(params);
    },
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId,
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

  // Extract unique makes and models from both models table AND actual vehicles
  // This ensures filter includes all makes/models that exist in vehicles, even if not in models table
  const { uniqueMakes, uniqueModels, makeModelMap } = useMemo(() => {
    const makes = new Set();
    const models = new Set();
    const makeToModels = new Map(); // Map of make -> Set of models
    
    // Extract from modelsGrouped (all models in database)
    if (modelsGrouped && Array.isArray(modelsGrouped)) {
      modelsGrouped.forEach(categoryGroup => {
        if (categoryGroup.models && Array.isArray(categoryGroup.models)) {
          categoryGroup.models.forEach(model => {
            const make = model.make || model.Make;
            const modelName = model.modelName || model.ModelName || model.model || model.Model;
            
            if (make) {
              makes.add(make);
              if (!makeToModels.has(make)) {
                makeToModels.set(make, new Set());
              }
              if (modelName) {
                makeToModels.get(make).add(modelName);
              }
            }
            if (modelName) {
              models.add(modelName);
            }
          });
        }
      });
    }
    
    // Also extract from actual vehicles list to catch any makes/models not in models table
    if (vehiclesList && Array.isArray(vehiclesList)) {
      vehiclesList.forEach(vehicle => {
        const make = vehicle.Make || vehicle.make;
        const modelName = vehicle.Model || vehicle.model;
        
        if (make) {
          makes.add(make);
          if (!makeToModels.has(make)) {
            makeToModels.set(make, new Set());
          }
          if (modelName) {
            makeToModels.get(make).add(modelName);
          }
        }
        if (modelName) {
          models.add(modelName);
        }
      });
    }
    
    return {
      uniqueMakes: Array.from(makes).sort(),
      uniqueModels: Array.from(models).sort(),
      makeModelMap: makeToModels
    };
  }, [modelsGrouped, vehiclesList]);

  // Filter models based on selected make
  const filteredModels = useMemo(() => {
    if (!vehicleMakeFilter) {
      return uniqueModels; // Show all models if no make is selected
    }
    
    // Get models for the selected make
    const modelsForMake = makeModelMap.get(vehicleMakeFilter);
    return modelsForMake ? Array.from(modelsForMake).sort() : [];
  }, [vehicleMakeFilter, uniqueModels, makeModelMap]);

  // Reset page when filters change
  useEffect(() => {
    setVehiclePage(0);
  }, [vehicleMakeFilter, vehicleModelFilter, vehicleYearFilter, vehicleLicensePlateFilter, vehicleLocationFilter]);

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
      await apiService.importVehicles(formData);
      queryClient.invalidateQueries(['vehicles', currentCompanyId]);
      
      event.target.value = ''; // Reset file input
    } catch (error) {
      console.error('Error importing vehicles:', error);
      console.error('Full error response:', JSON.stringify(error.response?.data, null, 2));
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.response?.data?.message);
      console.error('Error object:', error.response?.data?.error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error?.message || 
                          error.message || 
                          t('vehicles.importError') || 
                          'Failed to import vehicles';
      toast.error(errorMessage);
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
        // Keep form in edit mode for admins/mainadmins
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

  // Update customer mutation (for setting employee role and company)
  const updateCustomerMutation = useMutation(
    ({ customerId, data }) => apiService.updateCustomer(customerId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['customers', currentCompanyId]);
        setShowAddEmployeeModal(false);
        setEditingEmployeeId(null);
        setSelectedCustomer(null);
        setEmployeeSearchEmail('');
        setFoundCustomers([]);
        setSelectedRole('worker');
      },
      onError: (error) => {
        console.error('Error updating customer:', error);
        toast.error(
          error.response?.data?.message ||
            error.response?.data?.error ||
            t('admin.employeeUpdateFailed', 'Failed to update employee.'),
          {
            position: 'top-center',
            autoClose: 5000,
          }
        );
      },
    }
  );

  // Find customers by email/name
  const handleFindCustomers = async () => {
    if (!employeeSearchEmail.trim()) {
      toast.error(t('admin.enterEmailOrName', 'Please enter an email or name to search.'));
      return;
    }

    setIsSearchingCustomers(true);
    try {
      const response = await apiService.getCustomers({
        search: employeeSearchEmail.trim(),
        page: 1,
        pageSize: 50, // Get more results for selection
      });
      
      const data = response?.data || response;
      const customers = data?.items || data || [];
      setFoundCustomers(customers);
      
      if (customers.length === 0) {
        toast.info(t('admin.noCustomersFound', 'No customers found matching your search.'));
      }
    } catch (error) {
      console.error('Error finding customers:', error);
      toast.error(
        error.response?.data?.message ||
          t('admin.customerSearchFailed', 'Failed to search for customers.')
      );
      setFoundCustomers([]);
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  // Handle edit employee
  const handleEditEmployee = (customer) => {
    const customerId = customer.customerId || customer.id || customer.CustomerId;
    let role = customer.role || customer.Role || 'worker';
    // Normalize mainadmin and customer roles to worker (since they're not available in dropdown)
    if (role === 'mainadmin' || role === 'customer') {
      role = 'worker';
    }
    setEditingEmployeeId(customerId);
    setSelectedCustomer(customer);
    setSelectedRole(role);
    setEmployeeSearchEmail('');
    setFoundCustomers([]);
    setShowAddEmployeeModal(true);
  };

  // Handle delete employee (sets role to customer and companyId to null)
  const handleDeleteEmployee = async (customer) => {
    const customerId = customer.customerId || customer.id || customer.CustomerId;
    const customerName = `${customer.firstName || customer.FirstName} ${customer.lastName || customer.LastName}`;
    
    if (!window.confirm(t('admin.confirmDeleteEmployee', `Are you sure you want to remove ${customerName} as an employee? This will set their role to "customer" and set their company ID to null, removing them from this company.`))) {
      return;
    }

    try {
      // Set role to "customer" - backend will automatically set companyId to null when role is "customer"
      await updateCustomerMutation.mutateAsync({
        customerId,
        data: {
          role: 'customer',
          // Note: We don't send companyId here. When role is set to "customer",
          // the backend automatically sets companyId to null (see CustomersController.cs line 451-454)
        },
      });
    } catch (error) {
      console.error('Error removing employee:', error);
      // Error is handled by mutation's onError
    }
  };

  // Set employee (update role and companyId)
  const handleSetEmployee = async () => {
    if (!selectedCustomer) {
      toast.error(t('admin.selectCustomer', 'Please select a customer.'));
      return;
    }

    if (!selectedRole) {
      toast.error(t('admin.selectRole', 'Please select a role.'));
      return;
    }

    // Validate companyId for employee roles
    if (selectedRole !== 'customer' && !currentCompanyId) {
      toast.error(t('admin.companyIdRequired', 'Company ID is required for employee roles.'));
      return;
    }

    setIsSettingEmployee(true);
    try {
      const customerId = editingEmployeeId || (selectedCustomer.customerId || selectedCustomer.id || selectedCustomer.CustomerId);
      if (!customerId) {
        toast.error(t('admin.invalidCustomerId', 'Invalid customer ID.'));
        setIsSettingEmployee(false);
        return;
      }

      const updateData = {
        role: selectedRole,
      };
      
      // Only include companyId if role is not customer
      // The backend will automatically set companyId to null when role is "customer"
      if (selectedRole !== 'customer') {
        if (!currentCompanyId) {
          toast.error(t('admin.companyIdRequired', 'Company ID is required for employee roles.'));
          setIsSettingEmployee(false);
          return;
        }
        updateData.companyId = currentCompanyId;
      }
      // Don't send companyId when role is "customer" - backend handles it automatically

      console.log('[AdminDashboard] Updating customer:', customerId, 'with data:', updateData);
      await updateCustomerMutation.mutateAsync({ customerId, data: updateData });
    } catch (error) {
      // Error is handled by mutation's onError
      console.error('Error setting employee:', error);
    } finally {
      setIsSettingEmployee(false);
    }
  };

  // Location mutations - for pickup locations (regular locations)
  const createLocationMutation = useMutation(
    (data) => apiService.createLocation(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['locations', currentCompanyId]);
        queryClient.invalidateQueries(['companyLocations', currentCompanyId]);
        queryClient.invalidateQueries(['pickupLocations', currentCompanyId]);
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
          isOffice: false,
          openingHours: '',
          isActive: true
        });
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
          isOffice: false,
          openingHours: '',
          isActive: true
        });
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
        toast.error(t('admin.locationDeleteFailed'), {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    }
  );

  // Company Location mutations (same pattern as vehicles)
  const createCompanyLocationMutation = useMutation(
    (data) => apiService.createCompanyLocation(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyLocations', currentCompanyId]);
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
          isOffice: false,
          openingHours: '',
          isActive: true
        });
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
          isOffice: false,
          openingHours: '',
          isActive: true
        });
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

  // Fetch all additional services (not filtered by company - to show full list)
  const { data: allAdditionalServicesResponse, isLoading: isLoadingAllServices } = useQuery(
    ['allAdditionalServices'],
    () => apiService.getAdditionalServices({}),
    {
      enabled: isAuthenticated && canAccessDashboard && activeSection === 'additionalServices',
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
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId && activeSection === 'additionalServices',
      onError: (error) => {
        console.error('Error loading company services:', error);
      }
    }
  );

  // Fetch company locations for reservation wizard
  const { data: wizardLocationsResponse } = useQuery(
    ['companyLocations', currentCompanyId],
    () => apiService.getLocationsByCompany(currentCompanyId),
    {
      enabled: showReservationWizard && !!currentCompanyId
    }
  );
  const wizardLocations = useMemo(() => {
    const data = wizardLocationsResponse?.data || wizardLocationsResponse;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.locations)) return data.locations;
    return [];
  }, [wizardLocationsResponse]);

  // Fetch categories for reservation wizard (filtered by availability)
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useQuery(
    ['vehicleCategories', currentCompanyId, wizardPickupDate, wizardReturnDate, wizardSelectedLocation?.locationId || wizardSelectedLocation?.id],
    () => {
      const locationId = wizardSelectedLocation?.locationId || wizardSelectedLocation?.id || null;
      return apiService.getModelsGroupedByCategory(currentCompanyId, locationId, wizardPickupDate, wizardReturnDate);
    },
    {
      enabled: showReservationWizard && wizardStep === 2 && !!currentCompanyId && !!wizardPickupDate && !!wizardReturnDate
    }
  );
  const categories = useMemo(() => {
    const data = categoriesResponse?.data || categoriesResponse;
    if (Array.isArray(data)) {
      // Extract categories from grouped data - each item is a ModelsGroupedByCategoryDto
      // Only include categories that have available models
      const categoryMap = new Map();
      data.forEach(group => {
        const categoryId = group.categoryId || group.CategoryId;
        const categoryName = group.categoryName || group.CategoryName;
        const models = group.models || group.Models || [];
        
        // Only include categories that have at least one available model
        const hasAvailableModels = models.some(model => {
          const availableCount = model.availableCount || model.AvailableCount || 0;
          return availableCount > 0;
        });
        
        if (categoryId && categoryName && hasAvailableModels && !categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            categoryId: categoryId,
            id: categoryId,
            Id: categoryId,
            categoryName: categoryName,
            name: categoryName,
            Name: categoryName,
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

  // Fetch models grouped by make when category is selected (for step 3)
  useEffect(() => {
    if (wizardSelectedCategory && wizardStep >= 3 && currentCompanyId && wizardPickupDate && wizardReturnDate) {
      setIsLoadingWizardModels(true);
      const categoryId = wizardSelectedCategory.categoryId || wizardSelectedCategory.id || wizardSelectedCategory.Id;
      const locationId = wizardSelectedLocation?.locationId || wizardSelectedLocation?.id || null;
      
      apiService.getModelsGroupedByCategory(currentCompanyId, locationId, wizardPickupDate, wizardReturnDate)
        .then(response => {
          const data = response?.data || response;
          const groups = Array.isArray(data) ? data : (data?.items || []);
          
          // Find the category group - category info is directly on the group object
          const categoryGroup = groups.find(group => {
            const groupCategoryId = group.categoryId || group.CategoryId;
            return groupCategoryId === categoryId;
          });
          
          if (!categoryGroup) {
            console.log('Category group not found for categoryId:', categoryId);
            setWizardModelsByMake({});
            setIsLoadingWizardModels(false);
            return;
          }
          
          // Extract all models from this category - models are directly in group.models
          const models = categoryGroup.models || categoryGroup.Models || [];
          
          // Filter to only models with available vehicles
          const availableModels = models.filter(model => {
            const availableCount = model.availableCount || model.AvailableCount || 0;
            return availableCount > 0;
          });
          
          console.log('Available models for category:', availableModels.length);
          console.log('Sample model structure:', availableModels[0]);
          
          // Group models by make (normalize make names to uppercase, trimmed)
          const groupedByMake = availableModels.reduce((acc, model) => {
            const make = (model.make || model.Make || '').toUpperCase().trim();
            const modelName = model.modelName || model.ModelName || model.model || model.Model || '';
            const modelId = model.id || model.Id || model.modelId || model.ModelId;
            
            if (!make || !modelName) {
              console.warn('Skipping model - missing make or modelName:', model);
              return acc;
            }
            
            if (!modelId) {
              console.warn('Model missing ID:', model);
            }
            
            if (!acc[make]) {
              acc[make] = [];
            }
            
            // Check if model already exists (by ID first, then by name)
            const existingModel = acc[make].find(m => {
              const mId = m.id || m.Id || m.modelId || m.ModelId;
              if (modelId && mId && mId === modelId) return true;
              const mName = (m.modelName || m.ModelName || m.model || m.Model || '').toUpperCase().trim();
              return mName === modelName.toUpperCase().trim();
            });
            
            if (!existingModel) {
              acc[make].push(model);
            }
            
            return acc;
          }, {});
          
          console.log('Grouped by make:', Object.keys(groupedByMake).map(make => ({ make, count: groupedByMake[make].length })));
          
          // Sort models within each make by model name and remove makes with no models
          Object.keys(groupedByMake).forEach(make => {
            groupedByMake[make].sort((a, b) => {
              const nameA = (a.modelName || a.ModelName || a.model || a.Model || '').toUpperCase();
              const nameB = (b.modelName || b.ModelName || b.model || b.Model || '').toUpperCase();
              return nameA.localeCompare(nameB);
            });
            
            // Remove makes that have no models after filtering
            if (groupedByMake[make].length === 0) {
              delete groupedByMake[make];
            }
          });
          
          setWizardModelsByMake(groupedByMake);
          
          // Auto-expand first make if only one make exists
          const makeKeys = Object.keys(groupedByMake);
          if (makeKeys.length === 1) {
            setWizardExpandedMakes(new Set([makeKeys[0]]));
          } else {
            setWizardExpandedMakes(new Set());
          }
        })
        .catch(error => {
          console.error('Error fetching models:', error);
          toast.error('Failed to load vehicle models');
        })
        .finally(() => setIsLoadingWizardModels(false));
    } else {
      setWizardModelsByMake({});
      setWizardSelectedMake(null);
      setWizardSelectedModel(null);
      setWizardExpandedMakes(new Set());
    }
  }, [wizardSelectedCategory, wizardStep, currentCompanyId, wizardPickupDate, wizardReturnDate, wizardSelectedLocation]);

  // Fetch additional services when step 4 is reached
  useEffect(() => {
    if (wizardStep === 4 && currentCompanyId) {
      setIsLoadingWizardServices(true);
      apiService.getCompanyServices(currentCompanyId, { isActive: true })
        .then(response => {
          const data = response?.data || response;
          const services = Array.isArray(data) ? data : (data?.items || []);
          setWizardAdditionalServices(services);
          console.log('Additional services loaded:', services.length);
        })
        .catch(error => {
          console.error('Error fetching additional services:', error);
          toast.error('Failed to load additional services');
          setWizardAdditionalServices([]);
        })
        .finally(() => setIsLoadingWizardServices(false));
    } else if (wizardStep < 4) {
      setWizardAdditionalServices([]);
      setWizardSelectedServices([]);
    }
  }, [wizardStep, currentCompanyId]);

  // Calculate pricing for wizard
  const calculateWizardDays = useMemo(() => {
    if (!wizardPickupDate || !wizardReturnDate) return 1;
    const pickup = new Date(wizardPickupDate);
    const returnDate = new Date(wizardReturnDate);
    return Math.max(1, Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24)) + 1);
  }, [wizardPickupDate, wizardReturnDate]);

  const calculateWizardVehicleTotal = useMemo(() => {
    if (!wizardSelectedModel) return 0;
    const dailyRate = wizardSelectedModel.dailyRate || wizardSelectedModel.DailyRate || wizardSelectedModel.daily_rate || 0;
    return dailyRate * calculateWizardDays;
  }, [wizardSelectedModel, calculateWizardDays]);

  const calculateWizardServicesTotal = useMemo(() => {
    return wizardSelectedServices.reduce((total, selectedService) => {
      const service = selectedService.service || selectedService;
      const price = service.servicePrice || service.ServicePrice || service.price || service.Price || 0;
      return total + (price * calculateWizardDays * (selectedService.quantity || 1));
    }, 0);
  }, [wizardSelectedServices, calculateWizardDays]);

  const calculateWizardGrandTotal = useMemo(() => {
    return calculateWizardVehicleTotal + calculateWizardServicesTotal;
  }, [calculateWizardVehicleTotal, calculateWizardServicesTotal]);

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

  // Fetch employees (customers with companyId and role != 'customer')
  const { data: customersResponse, isLoading: isLoadingCustomers, error: customersError } = useQuery(
    ['customers', currentCompanyId, customerPage, customerPageSize, customerSearch],
    () =>
      apiService.getCustomers({
        search: customerSearch || undefined,
        companyId: currentCompanyId,
        excludeRole: 'customer',
        page: customerPage,
        pageSize: customerPageSize,
      }),
    {
      enabled: isAuthenticated && !!currentCompanyId && activeSection === 'employees',
      keepPreviousData: true,
      onError: (error) => {
        console.error('Error loading employees:', error);
      },
    }
  );

  const customersData = useMemo(() => {
    const payload = customersResponse?.data || customersResponse;
    if (!payload) {
      return { items: [], totalCount: 0, page: customerPage, pageSize: customerPageSize };
    }

    // Backend now returns { items, totalCount, page, pageSize, totalPages }
    if (payload.items && typeof payload.totalCount === 'number') {
      return {
        items: payload.items,
        totalCount: payload.totalCount,
        page: payload.page || customerPage,
        pageSize: payload.pageSize || customerPageSize,
      };
    }

    // Fallback for old format
    const items = Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []);
    const totalCount = payload?.totalCount || payload?.total || items.length;
    
    return {
      items,
      totalCount,
      page: customerPage,
      pageSize: customerPageSize,
    };
  }, [customersResponse, customerPage, customerPageSize]);

  const customers = customersData.items || [];
  const totalCustomers = customersData.totalCount || 0;
  const totalCustomerPages = Math.ceil(totalCustomers / customerPageSize) || 1;


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

  // Handle URL params to open payment modal after reservation creation
  useEffect(() => {
    const bookingIdParam = searchParams.get('bookingId');
    const paymentParam = searchParams.get('payment');
    
    if (bookingIdParam && paymentParam === 'true') {
      // If bookings are loaded, find and open modal
      if (filteredBookings.length > 0) {
        const booking = filteredBookings.find(b => {
          const id = b.id || b.Id || b.bookingId || b.BookingId;
          return id === bookingIdParam || id?.toString() === bookingIdParam;
        });
        
        if (booking) {
          // Select the booking and open booking payment modal (for total amount)
          setSelectedBooking(booking);
          setShowBookingPaymentModal(true);
          
          // Clean up URL params
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('bookingId');
          newSearchParams.delete('payment');
          navigate(`/admin?${newSearchParams.toString()}`, { replace: true });
        }
      } else {
        // If bookings not loaded yet, wait for them to load
        // The query will refetch when activeSection changes to 'reservations'
      }
    }
  }, [searchParams, filteredBookings, navigate]);

  // Handle pending status update after returning from Stripe Checkout
  useEffect(() => {
    const pendingUpdate = sessionStorage.getItem('pendingBookingStatusUpdate');
    if (pendingUpdate && selectedBooking) {
      try {
        const update = JSON.parse(pendingUpdate);
        const bookingId = selectedBooking.id || selectedBooking.Id || selectedBooking.bookingId || selectedBooking.BookingId;
        
        // Check if this is the same booking
        if (update.bookingId === bookingId || update.bookingId?.toString() === bookingId?.toString()) {
          // Check if payment was successful (booking should have payment intent or paid status)
          const isPaid = 
            (selectedBooking.paymentStatus === 'Paid' || selectedBooking.paymentStatus === 'succeeded') ||
            !!selectedBooking.stripePaymentIntentId;
          
          if (isPaid && update.status === 'Confirmed') {
            console.log('✅ Payment confirmed via webhook, updating booking status to Confirmed');
            updateBookingStatusMutation.mutate({
              bookingId: bookingId,
              status: 'Confirmed'
            });
            // Clear the pending update
            sessionStorage.removeItem('pendingBookingStatusUpdate');
            setPendingConfirmedStatus('');
          }
        }
      } catch (error) {
        console.error('Error parsing pending status update:', error);
        sessionStorage.removeItem('pendingBookingStatusUpdate');
      }
    }
  }, [selectedBooking, updateBookingStatusMutation]);

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
    const { name, value, type, checked } = e.target;

    if (name === 'securityDeposit') {
      const numericValue = value === '' ? '' : parseFloat(value);
      setCompanyFormData(prev => ({
        ...prev,
        securityDeposit: value === '' || Number.isNaN(numericValue) ? '' : numericValue
      }));
      return;
    }

    // Handle checkboxes
    if (type === 'checkbox') {
      setCompanyFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }

    setCompanyFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle open booking details
  const handleOpenBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setShowBookingDetailsModal(true);
  };

  // Handle update booking status
  const handleUpdateBookingStatus = () => {
    if (!selectedBooking) return;
    
    // Automatically determine next status based on current status
    const currentStatus = selectedBooking.status || selectedBooking.Status || '';
    let nextStatus = '';
    
    // Determine next status: Pending -> Confirmed -> Active -> Completed
    if (currentStatus.toLowerCase() === 'pending') {
      nextStatus = 'Confirmed';
    } else if (currentStatus.toLowerCase() === 'confirmed') {
      nextStatus = 'Active';
    } else if (currentStatus.toLowerCase() === 'active') {
      nextStatus = 'Completed';
    } else {
      // If already completed or cancelled, don't allow progression
      toast.info(t('admin.statusAlreadyFinal', 'Booking status cannot be changed further.'));
      return;
    }
    
    console.log('Updating booking status from:', currentStatus, 'to:', nextStatus);
    console.log('Current payment status:', selectedBooking.paymentStatus);
    console.log('Has payment intent:', !!selectedBooking.stripePaymentIntentId);
    
    // If changing from Pending to Confirmed, show payment modal first
    if (currentStatus.toLowerCase() === 'pending' && nextStatus === 'Confirmed') {
      // Check if booking has already been paid
      const isAlreadyPaid = 
        (selectedBooking.paymentStatus === 'Paid' || selectedBooking.paymentStatus === 'succeeded') ||
        !!selectedBooking.stripePaymentIntentId;
      
      if (!isAlreadyPaid) {
        // Show payment modal to collect booking payment
        console.log('✅ Opening booking payment modal for pending booking');
        setPendingConfirmedStatus(nextStatus);
        setShowBookingPaymentModal(true);
        return;
      } else {
        // Already paid, proceed with status update
        console.log('✅ Booking already paid, updating status directly');
      }
    }
    
    // If changing to Active, check if security deposit is mandatory and unpaid
    if (nextStatus === 'Active') {
      console.log('=== Security Deposit Check ===');
      console.log('Company data:', actualCompanyData);
      
      const isDepositMandatory = 
        actualCompanyData?.isSecurityDepositMandatory ?? 
        actualCompanyData?.IsSecurityDepositMandatory ?? 
        true;
      
      console.log('Is deposit mandatory?', isDepositMandatory);
      
      // Check booking's security deposit first, then fall back to company default
      let bookingDepositAmount = parseFloat(
        selectedBooking.securityDeposit || 
        selectedBooking.SecurityDeposit || 
        0
      );
      
      // If booking has no deposit set, use company's default deposit
      const companyDepositAmount = parseFloat(
        actualCompanyData?.securityDeposit || 
        actualCompanyData?.SecurityDeposit || 
        0
      );
      
      // Use company deposit if booking deposit is 0
      const depositAmount = bookingDepositAmount > 0 ? bookingDepositAmount : companyDepositAmount;
      
      console.log('Booking deposit amount:', bookingDepositAmount);
      console.log('Company deposit amount:', companyDepositAmount);
      console.log('Final deposit amount to collect:', depositAmount);
      console.log('selectedBooking.securityDeposit:', selectedBooking.securityDeposit);
      console.log('selectedBooking.SecurityDeposit:', selectedBooking.SecurityDeposit);
      console.log('actualCompanyData.securityDeposit:', actualCompanyData?.securityDeposit);
      console.log('actualCompanyData.SecurityDeposit:', actualCompanyData?.SecurityDeposit);
      
      // Check if security deposit has already been paid
      const isDepositAlreadyPaid = !!selectedBooking.securityDepositPaymentIntentId;
      console.log('Is deposit already paid?', isDepositAlreadyPaid);
      console.log('Security Deposit Payment Intent ID:', selectedBooking.securityDepositPaymentIntentId);
      
      // Check if security deposit is unpaid
      // Only show modal if deposit is mandatory, amount > 0, AND not already paid
      if (isDepositMandatory && depositAmount > 0 && !isDepositAlreadyPaid) {
        console.log('✅ Opening security deposit modal with amount:', depositAmount);
        setPendingActiveStatus(nextStatus);
        setShowSecurityDepositModal(true);
        return;
      } else {
        console.log('❌ Not opening modal - isDepositMandatory:', isDepositMandatory, 'depositAmount:', depositAmount, 'isDepositAlreadyPaid:', isDepositAlreadyPaid);
      }
    }
    
    // If changing to Completed, ask about damage first
    if (nextStatus === 'Completed' || nextStatus === 'completed') {
      setPendingCompletedStatus(nextStatus);
      setHasDamage(false);
      setShowDamageConfirmationModal(true);
      return;
    }
    
    // For other status changes (Pending -> Confirmed, Confirmed -> Active), update directly
    updateBookingStatusMutation.mutate({
      bookingId: selectedBooking.id,
      status: nextStatus
    });
  };
  
  // Handle damage confirmation and charge security deposit if needed
  const handleDamageConfirmation = async () => {
    if (!selectedBooking) return;
    
    // If no damage, just update status to Completed
    if (!hasDamage) {
      updateBookingStatusMutation.mutate({
        bookingId: selectedBooking.id,
        status: pendingCompletedStatus
      });
      setShowDamageConfirmationModal(false);
      setHasDamage(false);
      setDamageAmount('');
      return;
    }
    
    // If damage exists, check if security deposit payment intent exists (was authorized)
    const hasSecurityDepositPaymentIntent = !!selectedBooking.securityDepositPaymentIntentId;
    
    if (!hasSecurityDepositPaymentIntent) {
      // No security deposit was collected, just mark as completed
      updateBookingStatusMutation.mutate({
        bookingId: selectedBooking.id,
        status: pendingCompletedStatus
      });
      setShowDamageConfirmationModal(false);
      setHasDamage(false);
      setDamageAmount('');
      toast.info(t('admin.noSecurityDepositToCharge', 'No security deposit to charge. Booking marked as completed.'));
      return;
    }
    
    // Validate damage amount
    const bookingDepositAmount = parseFloat(
      selectedBooking.securityDeposit || 
      selectedBooking.SecurityDeposit || 
      0
    );
    
    const companyDepositAmount = parseFloat(
      actualCompanyData?.securityDeposit || 
      actualCompanyData?.SecurityDeposit || 
      0
    );
    
    const maxDepositAmount = bookingDepositAmount > 0 ? bookingDepositAmount : companyDepositAmount;
    const chargeAmount = parseFloat(damageAmount) || 0;
    
    if (chargeAmount <= 0) {
      toast.error(t('admin.invalidDamageAmount', 'Please enter a valid damage amount.'));
      return;
    }
    
    if (chargeAmount > maxDepositAmount) {
      toast.error(t('admin.damageAmountExceedsDeposit', 'Damage amount cannot exceed security deposit of {{amount}}.').replace('{{amount}}', formatPrice(maxDepositAmount)));
      return;
    }
    
    // Security deposit exists, charge the specified amount
    setPayingSecurityDeposit(true);
    try {
      // Update booking status to Completed with damage amount
      // The backend will capture the specified amount from the security deposit
      await updateBookingStatusMutation.mutateAsync({
        bookingId: selectedBooking.id,
        status: pendingCompletedStatus,
        securityDepositDamageAmount: chargeAmount
      });
      
      setShowDamageConfirmationModal(false);
      setHasDamage(false);
      setDamageAmount('');
      setPayingSecurityDeposit(false);
      
    } catch (error) {
      console.error('Error completing booking:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to complete booking';
      toast.error(t('admin.bookingCompleteError', errorMessage));
      setPayingSecurityDeposit(false);
    }
  };


  // Handle creating Stripe Checkout Session or Terminal payment
  const handleInitiatePayment = async () => {
    if (!selectedBooking || !paymentMethod) {
      toast.error(t('admin.selectPaymentMethod', 'Please select a payment method'));
      return;
    }
    
    setPayingSecurityDeposit(true);
    
    try {
      if (paymentMethod === 'terminal') {
        // Card Reader payment (Stripe Terminal)
        console.log(`Creating payment intent for terminal:`, selectedBooking.id);
        
        const response = await apiService.createSecurityDepositPaymentIntent(selectedBooking.id);
        console.log('Payment Intent created:', response.data);
        
        toast.info(t('admin.connectCardReader', 'Please connect card reader and have customer tap/swipe card'));
        
        // TODO: Integrate with useStripeTerminal hook
        toast.warning(t('admin.terminalIntegrationPending', 'Stripe Terminal integration will be completed in next step'));
        
        // For terminal, simulate and complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update booking status
        await updateBookingStatusMutation.mutateAsync({
          bookingId: selectedBooking.id,
          status: pendingActiveStatus
        });
        
        setShowSecurityDepositModal(false);
        setPaymentMethod('');
        
      } else if (paymentMethod === 'checkout') {
        // Stripe Checkout - hosted payment page
        console.log(`Creating Stripe Checkout session for booking:`, selectedBooking.id);
        
        const response = await apiService.createSecurityDepositCheckout(selectedBooking.id, i18n.language);
        console.log('Checkout session created:', response.data);
        
        const { sessionUrl } = response.data;
        
        // Close modal and redirect to Stripe's hosted checkout page
        setShowSecurityDepositModal(false);
        setPaymentMethod('');
        
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
        
        // Redirect to Stripe Checkout (opens in same tab)
        // The user will be redirected back to admin dashboard after payment
        window.location.href = sessionUrl;
      }
      
    } catch (error) {
      console.error('Error initiating payment:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to initiate payment';
      toast.error(t('admin.securityDepositError', errorMessage));
      setPayingSecurityDeposit(false);
    }
  };

  // Handle creating payment for booking total amount
  const handleInitiateBookingPayment = async () => {
    if (!selectedBooking || !paymentMethod) {
      toast.error(t('admin.selectPaymentMethod', 'Please select a payment method'));
      return;
    }
    
    setPayingBooking(true);
    
    try {
      const bookingTotal = parseFloat(selectedBooking.totalAmount || selectedBooking.TotalAmount || 0);
      const currency = currencyCode || 'USD';
      
      if (paymentMethod === 'terminal') {
        // Card Reader payment (Stripe Terminal)
        console.log(`Creating payment intent for booking total:`, selectedBooking.id, bookingTotal);
        
        const response = await apiService.createTerminalPaymentIntent(
          currentCompanyId,
          bookingTotal,
          currency.toLowerCase(),
          {
            bookingId: selectedBooking.id,
            description: `Booking payment - ${selectedBooking.bookingNumber || selectedBooking.BookingNumber || ''}`
          }
        );
        
        console.log('Payment Intent created:', response.data);
        
        toast.info(t('admin.connectCardReader', 'Please connect card reader and have customer tap/swipe card'));
        
        // TODO: Integrate with useStripeTerminal hook
        toast.warning(t('admin.terminalIntegrationPending', 'Stripe Terminal integration will be completed in next step'));
        
        // For terminal, simulate and complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setShowBookingPaymentModal(false);
        setPaymentMethod('');
        setPayingBooking(false);
        
        // If we were waiting to update status to Confirmed after payment, do it now
        if (pendingConfirmedStatus === 'Confirmed') {
          console.log('✅ Payment successful, updating booking status to Confirmed');
          updateBookingStatusMutation.mutate({
            bookingId: selectedBooking.id,
            status: 'Confirmed'
          });
          setPendingConfirmedStatus('');
        }
        
        // Refresh bookings list
        queryClient.invalidateQueries(['companyBookings', currentCompanyId]);
        
      } else if (paymentMethod === 'checkout') {
        // Stripe Checkout - hosted payment page
        console.log(`Creating Stripe Checkout session for booking total:`, selectedBooking.id);
        
        const response = await apiService.createCheckoutSession({
          customerId: selectedBooking.customerId || selectedBooking.CustomerId,
          companyId: currentCompanyId,
          bookingId: selectedBooking.id,
          bookingNumber: selectedBooking.bookingNumber || selectedBooking.BookingNumber || '',
          amount: bookingTotal,
          currency: currency.toLowerCase(),
          description: `Booking payment - ${selectedBooking.bookingNumber || selectedBooking.BookingNumber || ''}`,
          language: i18n.language,
          successUrl: `${window.location.origin}/admin?tab=reservations&bookingId=${selectedBooking.id}`,
          cancelUrl: `${window.location.origin}/admin?tab=reservations`
        });
        
        console.log('Checkout session created:', response.data);
        const { url: sessionUrl } = response.data || response;
        
        // Close modal and redirect to Stripe's hosted checkout page
        setShowBookingPaymentModal(false);
        setPaymentMethod('');
        setPayingBooking(false);
        
        // Store pending status in sessionStorage so we can update after redirect
        if (pendingConfirmedStatus === 'Confirmed') {
          sessionStorage.setItem('pendingBookingStatusUpdate', JSON.stringify({
            bookingId: selectedBooking.id,
            status: 'Confirmed'
          }));
        }
        
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
        
        // Redirect to Stripe Checkout (opens in same tab)
        window.location.href = sessionUrl;
      }
      
    } catch (error) {
      console.error('Error initiating booking payment:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to initiate payment';
      toast.error(t('admin.bookingPaymentError', errorMessage));
      setPayingBooking(false);
    }
  };

  // Handle refund payment
  const handleRefund = () => {
    if (!selectedBooking) return;
    
    const confirmRefund = window.confirm(
      t('admin.confirmRefund', 'Are you sure you want to process a refund for this booking?') + 
      `\n\n${t('admin.amount', 'Amount')}: ${formatPrice(selectedBooking.totalAmount || 0)}`
    );
    
    if (!confirmRefund) return;
    
    refundPaymentMutation.mutate({
      bookingId: selectedBooking.id,
      amount: selectedBooking.totalAmount,
      reason: 'Full refund via booking details'
    });
  };

  // Handle confirm refund when canceling booking
  const handleConfirmCancelRefund = async () => {
    if (!selectedBooking) return;
    
    const refundAmount = parseFloat(cancelRefundAmount);
    const maxAmount = parseFloat(selectedBooking.totalAmount || 0);
    
    // Validate refund amount
    if (isNaN(refundAmount) || refundAmount <= 0) {
      toast.error(t('admin.invalidRefundAmount', 'Please enter a valid refund amount'));
      return;
    }
    
    if (refundAmount > maxAmount) {
      toast.error(t('admin.refundExceedsPayment', `Refund amount cannot exceed payment amount of ${formatPrice(maxAmount)}`));
      return;
    }
    
    console.log('[Refund] Processing refund - Requested Amount:', refundAmount, 'Max Amount:', maxAmount, 'Input Value:', cancelRefundAmount, 'Booking ID:', selectedBooking.id);
    
    // Process refund first
    try {
      const refundResult = await refundPaymentMutation.mutateAsync({
        bookingId: selectedBooking.id,
        amount: refundAmount,
        reason: cancelRefundReason || 'Booking cancellation'
      });
      
      console.log('[Refund] Refund successful - Amount refunded:', refundResult?.data?.amount || refundResult?.amount, 'Currency:', refundResult?.data?.currency || refundResult?.currency, 'Status:', refundResult?.data?.status || refundResult?.status);
      
      // If refund successful, update booking status to Canceled
      updateBookingStatusMutation.mutate({
        bookingId: selectedBooking.id,
        status: pendingCancelStatus
      });
      
      // Close modals
      setShowCancelRefundModal(false);
      setShowBookingDetailsModal(false);
      setCancelRefundAmount('');
      setCancelRefundReason('');
      setPendingCancelStatus('');
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error(t('admin.refundError', 'Failed to process refund'));
    }
  };

  const handleSyncPaymentsFromStripe = async () => {
    if (!filteredBookings || filteredBookings.length === 0) {
      toast.error(t('admin.noBookingsToSync', 'No bookings to sync'));
      return;
    }

    setShowSyncConfirmModal(true);
  };

  const confirmSyncPayments = async () => {
    setShowSyncConfirmModal(false);
    setSyncingPayments(true);

    const bookingIds = filteredBookings.map(b => b.id);
    const totalBookings = bookingIds.length;
    setSyncProgress({ current: 0, total: totalBookings });

    let successCount = 0;
    let failureCount = 0;
    const results = [];

    try {
      console.log('Starting async sync for', totalBookings, 'bookings');

      // Process bookings one by one to avoid timeout
      for (let i = 0; i < bookingIds.length; i++) {
        const bookingId = bookingIds[i];
        
        try {
          const response = await apiService.syncPaymentFromStripe(bookingId);
          
          if (response.data.success) {
            successCount++;
            results.push({
              bookingId,
              success: true,
              status: response.data.status
            });
          } else {
            failureCount++;
            results.push({
              bookingId,
              success: false,
              error: 'Sync failed'
            });
          }
        } catch (error) {
          // Check if error is due to no payment found in Stripe (skip silently)
          const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || '';
          const isNoPaymentFound = errorMessage.toLowerCase().includes('no stripe payment found');
          
          if (isNoPaymentFound) {
            // Skip this booking silently - it wasn't paid via Stripe
            console.log(`Skipping booking ${bookingId}: No Stripe payment found`);
          } else {
            // Real error - count as failure
            failureCount++;
            results.push({
              bookingId,
              success: false,
              error: errorMessage
            });
            console.error(`Error syncing booking ${bookingId}:`, error);
          }
        }

        // Update progress
        setSyncProgress({ current: i + 1, total: totalBookings });
      }

      // Show final results
      console.log(
        `✅ ${t('admin.syncPaymentsSuccess', 
          `Synced ${successCount} of ${totalBookings} bookings`)}` +
        (failureCount > 0 
          ? `\n⚠️ ${t('admin.syncPaymentsFailed', `${failureCount} failed`)}` 
          : '')
      );

      console.log('Sync completed:', { successCount, failureCount, results });

      // Refresh bookings list
      queryClient.invalidateQueries(['companyBookings', currentCompanyId]);

    } catch (error) {
      console.error('Error in sync process:', error);
      toast.error(`❌ ${t('admin.syncPaymentsError', 'Failed to sync payments from Stripe')}`);
    } finally {
      setSyncingPayments(false);
      setSyncProgress({ current: 0, total: 0 });
    }
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
      termsOfUse: companyFormData.termsOfUse || companyFormData.TermsOfUse || null,
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
        setIsCreatingCompany(false);
        // Keep form in edit mode for admins/mainadmins
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
    const currentMandatory =
      companyFormData.isSecurityDepositMandatory ??
      companyFormData.IsSecurityDepositMandatory ??
      actualCompanyData?.isSecurityDepositMandatory ??
      actualCompanyData?.IsSecurityDepositMandatory ??
      true;
    setIsSecurityDepositMandatoryDraft(currentMandatory);
    setIsEditingDeposit(true);
  };

  const cancelSecurityDepositEdit = () => {
    setIsEditingDeposit(false);
    setSecurityDepositDraft('');
    setIsSecurityDepositMandatoryDraft(true);
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
    
    const updateData = { 
      securityDeposit: numericValue,
      isSecurityDepositMandatory: isSecurityDepositMandatoryDraft
    };
    
    console.log('[AdminDashboard] Saving security deposit:', updateData);
    
    updateCompanyMutation.mutate(
      updateData,
      {
        onSuccess: async () => {
          // Update local form data immediately (handle both casings)
          setCompanyFormData((prev) => ({
            ...prev,
            securityDeposit: numericValue,
            SecurityDeposit: numericValue,
            isSecurityDepositMandatory: isSecurityDepositMandatoryDraft,
            IsSecurityDepositMandatory: isSecurityDepositMandatoryDraft,
          }));
          // Invalidate and refetch company data to ensure UI is updated
          await queryClient.invalidateQueries(['company', currentCompanyId]);
          await queryClient.refetchQueries(['company', currentCompanyId]);
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


  const handleTermsOfUseSave = async () => {
    if (!currentCompanyId) return;
    setIsSavingTermsOfUse(true);
    try {
      // Use the separate API endpoint for updating terms of use
      await apiService.updateTermsOfUse(currentCompanyId, {
        termsOfUse: termsOfUseDraft || null
      });
      
      // Update local form data immediately
      setCompanyFormData((prev) => ({
        ...prev,
        termsOfUse: termsOfUseDraft,
        TermsOfUse: termsOfUseDraft,
      }));
      
      
      // Invalidate and refetch company data to ensure UI is updated
      await queryClient.invalidateQueries(['company', currentCompanyId]);
      await queryClient.refetchQueries(['company', currentCompanyId]);
    } catch (error) {
      console.error('Error updating terms of use:', error);
      toast.error(
        error.response?.data?.message ||
          t('admin.termsOfUseUpdateFailed', 'Failed to update Terms of Use.')
      );
    } finally {
      setIsSavingTermsOfUse(false);
    }
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
      isReturnLocation: activeLocationSubTab === 'company',
      openingHours: '',
      isActive: true
    });
  };

  const handleEditLocation = useCallback((location) => {
    // Prohibit editing locations with CompanyId in pickup locations tab
    const hasCompanyId = !!(location.companyId || location.CompanyId);
    if (activeLocationSubTab === 'pickup' && hasCompanyId) {
      toast.error(t('admin.locationManagedByCompany', 'This location is managed via Company Locations tab. Please edit it from the Company Locations tab.'));
      return;
    }
    
    setIsEditingLocation(true);
    const locationId = location.locationId || location.id || location.Id || location.LocationId;
    setEditingLocationId(locationId);
    setLocationFormData({
      locationName: location.locationName || location.LocationName || '',
      address: location.address || location.Address || '',
      city: location.city || location.City || '',
      state: location.state || location.State || '',
      country: location.country || location.Country || '',
      postalCode: location.postalCode || location.PostalCode || '',
      phone: location.phone || location.Phone || '',
      email: location.email || location.Email || '',
      latitude: location.latitude || location.Latitude || '',
      longitude: location.longitude || location.Longitude || '',
      isPickupLocation: location.isPickupLocation !== undefined ? location.isPickupLocation : (location.IsPickupLocation !== undefined ? location.IsPickupLocation : true),
      isReturnLocation: location.isReturnLocation !== undefined ? location.isReturnLocation : (location.IsReturnLocation !== undefined ? location.IsReturnLocation : true),
      isOffice: location.isOffice !== undefined ? location.isOffice : (location.IsOffice !== undefined ? location.IsOffice : false),
      openingHours: location.openingHours || location.OpeningHours || '',
      isActive: location.isActive !== undefined ? location.isActive : (location.IsActive !== undefined ? location.IsActive : true)
    });
  }, [activeLocationSubTab, t]);

  const handleSaveLocation = (e) => {
    e.preventDefault();
    
    if (activeLocationSubTab === 'company') {
      // Use company location endpoints (same pattern as vehicles)
      if (!currentCompanyId) {
        toast.error(t('admin.noCompanySelected') || 'Please select a company first');
        return;
      }

      // Validate required fields
      if (!locationFormData.locationName || !locationFormData.locationName.trim()) {
        toast.error(t('admin.locationNameRequired') || 'Location name is required');
        return;
      }

      // Prepare location data (same pattern as vehicles)
      const locationData = {
        companyId: currentCompanyId,
        locationName: locationFormData.locationName.trim(),
        address: locationFormData.address || null,
        city: locationFormData.city || null,
        state: locationFormData.state || null,
        country: locationFormData.country || 'USA',
        postalCode: locationFormData.postalCode || null,
        phone: locationFormData.phone || null,
        email: locationFormData.email || null,
        latitude: locationFormData.latitude ? parseFloat(locationFormData.latitude) : null,
        longitude: locationFormData.longitude ? parseFloat(locationFormData.longitude) : null,
        isPickupLocation: locationFormData.isPickupLocation !== undefined ? locationFormData.isPickupLocation : true,
        isReturnLocation: locationFormData.isReturnLocation !== undefined ? locationFormData.isReturnLocation : true,
        isOffice: locationFormData.isOffice !== undefined ? locationFormData.isOffice : false,
        openingHours: locationFormData.openingHours || null,
        isActive: locationFormData.isActive !== undefined ? locationFormData.isActive : true
      };

      if (editingLocationId) {
        updateCompanyLocationMutation.mutate({ locationId: editingLocationId, data: locationData });
      } else {
        createCompanyLocationMutation.mutate(locationData);
      }
    } else {
      // Use regular location endpoints (same pattern as vehicles)
      if (!currentCompanyId) {
        toast.error(t('admin.noCompanySelected') || 'Please select a company first');
        return;
      }

      // Validate required fields
      if (!locationFormData.locationName || !locationFormData.locationName.trim()) {
        toast.error(t('admin.locationNameRequired') || 'Location name is required');
        return;
      }

      // Prepare location data (same pattern as vehicles)
      // Note: Regular locations don't have isOffice field, only company locations do
      const locationData = {
        companyId: currentCompanyId,
        locationName: locationFormData.locationName.trim(),
        address: locationFormData.address || null,
        city: locationFormData.city || null,
        state: locationFormData.state || null,
        country: locationFormData.country || 'USA',
        postalCode: locationFormData.postalCode || null,
        phone: locationFormData.phone || null,
        email: locationFormData.email || null,
        latitude: locationFormData.latitude ? parseFloat(locationFormData.latitude) : null,
        longitude: locationFormData.longitude ? parseFloat(locationFormData.longitude) : null,
        isPickupLocation: locationFormData.isPickupLocation !== undefined ? locationFormData.isPickupLocation : true,
        isReturnLocation: locationFormData.isReturnLocation !== undefined ? locationFormData.isReturnLocation : true,
        // isOffice is NOT included for regular locations - only for company locations
        openingHours: locationFormData.openingHours || null,
        isActive: locationFormData.isActive !== undefined ? locationFormData.isActive : true
      };

      if (editingLocationId) {
        updateLocationMutation.mutate({ locationId: editingLocationId, data: locationData });
      } else {
        createLocationMutation.mutate(locationData);
      }
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
      isOffice: false,
      openingHours: '',
      isActive: true
    });
  };

  const handleDeleteLocation = useCallback((locationId) => {
    // Find the location in the current list to check if it has a CompanyId
    const location = locations.find(l => 
      (l.locationId || l.id || l.Id || l.LocationId) === locationId
    );
    
    // Prohibit deleting locations with CompanyId in pickup locations tab
    const hasCompanyId = location && !!(location.companyId || location.CompanyId);
    if (activeLocationSubTab === 'pickup' && hasCompanyId) {
      toast.error(t('admin.locationManagedByCompany', 'This location is managed via Company Locations tab. Please delete it from the Company Locations tab.'));
      return;
    }
    
    if (window.confirm(t('admin.confirmDeleteLocation'))) {
      if (activeLocationSubTab === 'company') {
        deleteCompanyLocationMutation.mutate(locationId);
      } else {
        deleteLocationMutation.mutate(locationId);
      }
    }
  }, [activeLocationSubTab, locations, t, deleteCompanyLocationMutation, deleteLocationMutation]);

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
      id: 'licensePlate',
      header: t('vehicles.licensePlate', 'License Plate'),
      accessorFn: row => row.LicensePlate || row.licensePlate || '',
      cell: info => info.getValue(),
    },
    {
      id: 'make',
      header: t('vehicles.make', 'Make'),
      accessorFn: row => row.Make || row.make || '',
      cell: info => info.getValue(),
    },
    {
      id: 'model',
      header: t('vehicles.model', 'Model'),
      accessorFn: row => row.Model || row.model || '',
      cell: info => info.getValue(),
    },
    {
      id: 'year',
      header: t('vehicles.year', 'Year'),
      accessorFn: row => row.Year || row.year || '',
      cell: info => info.getValue(),
    },
    {
      id: 'color',
      header: t('vehicles.color', 'Color'),
      accessorFn: row => row.Color || row.color || 'N/A',
      cell: info => info.getValue() || 'N/A',
    },
    {
      id: 'status',
      header: t('admin.status', 'Status'),
      accessorFn: row => row.Status || row.status || '',
      cell: info => info.getValue(),
    },
    {
      header: t('actions'),
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {/* Edit and Delete buttons - Admin only */}
          {isAdmin && (
            <>
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
            </>
          )}
          {/* Workers see view-only indicator */}
          {!isAdmin && (
            <span className="text-xs text-gray-500 italic">{t('common.viewOnly', 'View Only')}</span>
          )}
        </div>
      ),
    },
  ], [t, handleEditVehicle, handleDeleteVehicle, deleteVehicleMutation.isLoading, isAdmin]);

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

  // Location table columns
  const locationColumns = useMemo(() => [
    {
      id: 'locationName',
      header: t('admin.locationName', 'Location Name'),
      accessorFn: row => row.LocationName || row.locationName || '',
      cell: info => info.getValue(),
    },
    {
      id: 'address',
      header: t('admin.address', 'Address'),
      accessorFn: row => row.Address || row.address || '-',
      cell: info => info.getValue() || '-',
    },
    {
      id: 'city',
      header: t('admin.city', 'City'),
      accessorFn: row => row.City || row.city || '-',
      cell: info => info.getValue() || '-',
    },
    {
      id: 'state',
      header: t('admin.state', 'State'),
      accessorFn: row => row.State || row.state || '-',
      cell: info => info.getValue() || '-',
    },
    {
      id: 'phone',
      header: t('admin.phone', 'Phone'),
      accessorFn: row => row.Phone || row.phone || '-',
      cell: info => info.getValue() || '-',
    },
    {
      id: 'status',
      header: t('admin.status', 'Status'),
      accessorFn: row => {
        const isActive = row.isActive !== false && row.IsActive !== false;
        return isActive ? 'active' : 'inactive';
      },
      cell: ({ row }) => {
        const isActive = row.original.isActive !== false && row.original.IsActive !== false;
        return isActive ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {t('status.active', 'Active')}
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {t('status.inactive', 'Inactive')}
          </span>
        );
      },
    },
    ...(activeLocationSubTab === 'company' ? [{
      id: 'type',
      header: t('admin.type', 'Type'),
      cell: ({ row }) => {
        const location = row.original;
        const isPickup = location.isPickupLocation || location.IsPickupLocation;
        const isReturn = location.isReturnLocation || location.IsReturnLocation;
        const isOffice = location.isOffice || location.IsOffice;
        return (
          <div className="flex flex-wrap gap-1">
            {isPickup && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {t('admin.pickup', 'Pickup')}
              </span>
            )}
            {isReturn && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {t('admin.return', 'Return')}
              </span>
            )}
            {isOffice && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {t('admin.office', 'Office')}
              </span>
            )}
          </div>
        );
      },
    }] : []),
    {
      header: t('common.actions', 'Actions'),
      id: 'actions',
      cell: ({ row }) => {
        const location = row.original;
        const locationId = location.locationId || location.id || location.Id || location.LocationId;
        // Check if location has a CompanyId - these cannot be edited/deleted via pickup locations tab
        const hasCompanyId = !!(location.companyId || location.CompanyId);
        const isDisabled = activeLocationSubTab === 'pickup' && hasCompanyId;
        const disabledTitle = isDisabled 
          ? t('admin.locationManagedByCompany', 'This location is managed via Company Locations tab')
          : '';
        return (
          <div className="flex justify-end items-center gap-3">
            {/* Edit and Delete buttons - Admin only */}
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => handleEditLocation(location)}
                  disabled={isDisabled}
                  className={`transition-colors ${
                    isDisabled 
                      ? 'text-gray-400 cursor-not-allowed opacity-50' 
                      : 'text-blue-600 hover:text-blue-900'
                  }`}
                  title={disabledTitle || t('common.edit', 'Edit')}
                >
                  <Pencil className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteLocation(locationId)}
                  disabled={isDisabled}
                  className={`transition-colors ${
                    isDisabled 
                      ? 'text-gray-400 cursor-not-allowed opacity-50' 
                      : 'text-red-600 hover:text-red-900'
                  }`}
                  title={disabledTitle || t('common.delete', 'Delete')}
                >
                  <Trash className="h-5 w-5" />
                </button>
              </>
            )}
            {/* Workers see view-only indicator */}
            {!isAdmin && (
              <span className="text-xs text-gray-500 italic">{t('common.viewOnly', 'View Only')}</span>
            )}
          </div>
        );
      },
    },
  ], [t, activeLocationSubTab, handleEditLocation, handleDeleteLocation, isAdmin]);

  // Location table configuration
  const locationTable = useReactTable({
    data: locations,
    columns: locationColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false, // Client-side pagination
    pageCount: Math.ceil(locations.length / locationPageSize),
    state: {
      pagination: {
        pageIndex: locationPage,
        pageSize: locationPageSize,
      },
    },
    onPaginationChange: (updater) => {
      const newState = typeof updater === 'function' 
        ? updater({ pageIndex: locationPage, pageSize: locationPageSize })
        : updater;
      setLocationPage(newState.pageIndex);
      setLocationPageSize(newState.pageSize);
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

  if (!canAccessDashboard) {
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

  // Company-based access control: Admins and workers can only access their own company
  // Main admins can access all companies
  // Simply don't render dashboard if user is trying to access another company
  const userCompanyId = user?.companyId || user?.CompanyId;
  if (!isMainAdmin && userCompanyId && currentCompanyId && currentCompanyId !== userCompanyId) {
    return null;
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen text={t('common.loading')} />;
  }

  return (
    <PageContainer>
      <PageHeader
        title={`${companyConfig?.companyName || 'Company'} Dashboard`}
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
              {/* Company Profile - Admin only */}
              {isAdmin && (
                <button
                  onClick={() => {
                    setActiveSection('company');
                    setActiveTab('info');
                  }}
                  className={`w-full px-4 py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${
                    activeSection === 'company' && (activeTab === 'info' || activeTab === 'design')
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={t('admin.companyProfile')}
                  aria-label={t('admin.companyProfile')}
                >
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                  <span className="text-xs">{t('admin.companyProfile')}</span>
                </button>
              )}
              
              {/* Reservations - All roles can see and edit */}
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
              
              {/* Vehicles (Daily Rates) - All roles can see (workers: view only) */}
              <button
                onClick={() => setActiveSection('vehicles')}
                className={`w-full px-4 py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${
                  activeSection === 'vehicles'
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isEditing}
                title={t('admin.dailyRates', 'Daily Rates')}
                aria-label={t('admin.dailyRates', 'Daily Rates')}
              >
                <Car className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs text-center">{t('admin.dailyRates', 'Daily Rates')}</span>
              </button>
              
              {/* Locations - Admin only */}
              {isAdmin && (
                <button
                  onClick={() => {
                    setActiveSection('company');
                    setActiveTab('locations');
                  }}
                  className={`w-full px-4 py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${
                    activeSection === 'company' && activeTab === 'locations'
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  disabled={isEditing}
                  title={t('admin.locations', 'Locations')}
                  aria-label={t('admin.locations', 'Locations')}
                >
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                  <span className="text-xs text-center">{t('admin.locations', 'Locations')}</span>
                </button>
              )}
              
              
              {/* Employees - Admin only */}
              {isAdmin && (
                <button
                  onClick={() => setActiveSection('employees')}
                  className={`w-full px-4 py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${
                    activeSection === 'employees'
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  disabled={isEditing}
                  title={t('admin.employees', 'Employees')}
                  aria-label={t('admin.employees', 'Employees')}
                >
                  <Users className="h-5 w-5" aria-hidden="true" />
                  <span className="text-xs text-center">{t('admin.employees', 'Employees')}</span>
                </button>
              )}
              
              {/* Additional Services - Admin only */}
              {isAdmin && (
                <button
                  onClick={() => setActiveSection('additionalServices')}
                  className={`w-full px-4 py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${
                    activeSection === 'additionalServices'
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  disabled={isEditing}
                  title={t('admin.additionalServices')}
                  aria-label={t('admin.additionalServices')}
                >
                  <Calendar className="h-5 w-5" aria-hidden="true" />
                  <span className="text-xs text-center">{t('admin.additionalServices')}</span>
                </button>
              )}
              
              {/* Reports - Admin only */}
              {isAdmin && (
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
              )}
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
                          : t('admin.companyProfile')
                        }
                      </span>
                    </>
                  )}
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
          ) : activeTab === 'locations' ? (
              // Locations Tab - Always show locations content
              <div className="space-y-6">
                {/* Sub-tab Navigation */}
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8" aria-label="Sub-tabs">
                    <button
                      type="button"
                      onClick={() => setActiveLocationSubTab('company')}
                      className={`
                        whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm
                        ${activeLocationSubTab === 'company'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      {t('admin.companyLocations', 'Company Locations')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLocationSubTab('pickup')}
                      className={`
                        whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm
                        ${activeLocationSubTab === 'pickup'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      {t('admin.pickupLocations', 'Pickup Locations')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLocationSubTab('management')}
                      className={`
                        whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm
                        ${activeLocationSubTab === 'management'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      {t('admin.manageLocations', 'Manage Locations')}
                    </button>
                  </nav>
                </div>

                {/* Add Location Button - Admin only (only show for company and pickup tabs) */}
                {!isEditingLocation && isAdmin && activeLocationSubTab !== 'management' && (
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

                {/* Management Tab - Vehicle Location Assignment */}
                {activeLocationSubTab === 'management' ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        {t('admin.manageLocationsDescription', 'Assign vehicles to locations by dragging and dropping. This helps organize your fleet across different pickup and return locations.')}
                      </p>
                    </div>
                    <VehicleLocations embedded={true} />
                  </div>
                ) : (
                  <>
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
                        {activeLocationSubTab === 'pickup' && (
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
                        )}

                        {activeLocationSubTab === 'company' && (
                          <>
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
                                name="isOffice"
                                checked={locationFormData.isOffice}
                                onChange={handleLocationInputChange}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700">{t('admin.isOffice') || 'Is Office'}</span>
                            </label>
                          </>
                        )}

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
                  /* Locations Table */
                  <div className="overflow-x-auto">
                    {isLoadingLocations ? (
                      <div className="text-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : locations.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-600">{t('admin.noLocations')}</p>
                      </div>
                    ) : (
                      <>
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            {locationTable.getHeaderGroups().map(headerGroup => (
                              <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                  <th
                                    key={header.id}
                                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                                      header.id === 'actions' ? 'text-right' : ''
                                    }`}
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
                            {locationTable.getRowModel().rows.map(row => (
                              <tr key={row.id} className="hover:bg-gray-50">
                                {row.getVisibleCells().map(cell => (
                                  <td
                                    key={cell.id}
                                    className={`px-6 py-4 whitespace-nowrap ${
                                      cell.column.id === 'actions' ? 'text-right text-sm font-medium' : ''
                                    }`}
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
                          <div className="flex flex-1 justify-between sm:hidden">
                            <button
                              onClick={() => locationTable.previousPage()}
                              disabled={!locationTable.getCanPreviousPage()}
                              className="btn-secondary"
                            >
                              {t('previous')}
                            </button>
                            <button
                              onClick={() => locationTable.nextPage()}
                              disabled={!locationTable.getCanNextPage()}
                              className="btn-secondary ml-3"
                            >
                              {t('next')}
                            </button>
                          </div>
                          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm text-gray-700">
                                {t('admin.showing')} <span className="font-medium">{locationPage * locationPageSize + 1}</span> {t('admin.to')} <span className="font-medium">{Math.min((locationPage + 1) * locationPageSize, locations.length)}</span> {t('admin.of')} <span className="font-medium">{locations.length}</span> {t('results')}
                              </p>
                            </div>
                            <div>
                              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                  onClick={() => locationTable.setPageIndex(0)}
                                  disabled={!locationTable.getCanPreviousPage()}
                                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                  <ChevronsLeft className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => locationTable.previousPage()}
                                  disabled={!locationTable.getCanPreviousPage()}
                                  className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                  <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => locationTable.nextPage()}
                                  disabled={!locationTable.getCanNextPage()}
                                  className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                  <ChevronRightIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => locationTable.setPageIndex(locationTable.getPageCount() - 1)}
                                  disabled={!locationTable.getCanNextPage()}
                                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                  <ChevronsRight className="h-5 w-5" />
                                </button>
                              </nav>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
                </>
                )}
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
                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="isTestCompany"
                        checked={companyFormData.isTestCompany ?? true}
                        disabled
                        readOnly
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-not-allowed opacity-60"
                      />
                      <span className="block text-sm font-medium text-gray-700">
                        {t('admin.isTestCompany', 'Test Company')}
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      {t('admin.isTestCompanyHelp', 'Mark this company as a test company')} (Read-only)
                    </p>
                  </div>

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

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.termsOfUse', 'Terms of Use')}
                    </label>
                    <MultiLanguageTipTapEditor
                      content={companyFormData.termsOfUse || companyFormData.TermsOfUse || ''}
                      onChange={(jsonString) => {
                        setCompanyFormData(prev => ({
                          ...prev,
                          termsOfUse: jsonString,
                          TermsOfUse: jsonString
                        }));
                      }}
                      placeholder="Enter terms of use. You can paste formatted text from clipboard..."
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {t('admin.termsOfUseHelp', 'Use the editor to format your terms of use in 5 languages (English, Spanish, Portuguese, French, German). You can paste formatted text from your clipboard. Switch between language tabs to edit each version.')}
                    </p>
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

                {/* Locations Tab - Removed duplicate, now handled at top level */}

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
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="flex items-center gap-2">
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
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={isSecurityDepositMandatoryDraft}
                          onChange={(e) => setIsSecurityDepositMandatoryDraft(e.target.checked)}
                          disabled={isSavingDeposit}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span>{t('admin.isSecurityDepositMandatory', 'Security deposit is mandatory')}</span>
                      </label>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="flex items-center gap-3">
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
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className={(actualCompanyData?.isSecurityDepositMandatory ?? actualCompanyData?.IsSecurityDepositMandatory ?? true) ? 'text-green-600 font-medium' : 'text-gray-500'}>
                          {(actualCompanyData?.isSecurityDepositMandatory ?? actualCompanyData?.IsSecurityDepositMandatory ?? true)
                            ? t('admin.mandatory', 'Mandatory') 
                            : t('admin.optional', 'Optional')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Terms of Use Section - Always Editable for Admins */}
                {(isAdmin || isMainAdmin) && currentCompanyId && (
                  <div className="md:col-span-2 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-700">
                        {t('admin.termsOfUse', 'Terms of Use')}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <MultiLanguageTipTapEditor
                        content={termsOfUseDraft || actualCompanyData?.termsOfUse || actualCompanyData?.TermsOfUse || companyFormData?.termsOfUse || companyFormData?.TermsOfUse || ''}
                        onChange={(jsonString) => {
                          setTermsOfUseDraft(jsonString);
                        }}
                        placeholder="Enter terms of use. You can paste formatted text from clipboard..."
                      />
                      <div className="flex justify-end space-x-4 pt-2">
                        <button
                          type="button"
                          onClick={handleTermsOfUseSave}
                          disabled={isSavingTermsOfUse}
                          className="btn-primary px-4 py-2 text-sm"
                        >
                          {isSavingTermsOfUse 
                            ? t('common.saving') || 'Saving…' 
                            : t('common.save', 'Save Terms')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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
                      
                      // Group models by make first, then by modelName
                      // Normalize make and model names: uppercase and trim spaces for grouping
                      const makeGroups = {};
                      (categoryGroup.models || categoryGroup.Models || []).forEach(model => {
                        const make = (model.make || model.Make || '').toString().toUpperCase().trim();
                        const modelName = (model.modelName || model.model_name || model.ModelName || '').toString().toUpperCase().trim();
                        
                        // Group by make
                        if (!makeGroups[make]) {
                          makeGroups[make] = {
                            make,
                            models: {} // Will contain model groups
                          };
                        }
                        
                        // Group by model within make
                        if (!makeGroups[make].models[modelName]) {
                          makeGroups[make].models[modelName] = {
                            modelName,
                            models: [] // Store full model objects
                          };
                        }
                        
                        makeGroups[make].models[modelName].models.push(model);
                      });
                      
                      // Sort years descending in each model group
                      Object.values(makeGroups).forEach(makeGroup => {
                        Object.values(makeGroup.models).forEach(modelGroup => {
                          modelGroup.models.sort((a, b) => (b.year || 0) - (a.year || 0));
                        });
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
                                  {translateCategory(t, categoryName)}
                                </h3>
                      </div>
                              <span className="text-sm text-gray-600 ml-2">
                                {Object.keys(makeGroups).length} {Object.keys(makeGroups).length === 1 ? 'make' : 'makes'}
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
                                    await apiService.bulkUpdateModelDailyRate({
                                      dailyRate: parseFloat(rate),
                                      categoryId: categoryId,
                                      companyId: currentCompanyId
                                    });
                                    queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
                                    setDailyRateInputs(prev => ({ ...prev, [`category_${categoryId}`]: '' }));
                                  } catch (error) {
                                    console.error('Error updating models:', error);
                                    const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update models';
                                    toast.error(errorMessage);
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
                              {Object.entries(makeGroups).map(([make, makeGroup]) => {
                                const makeExpandedKey = `${categoryId}_${make}`;
                                const isMakeExpanded = expandedMakes[makeExpandedKey];
                                
                                // Calculate rates for all models in this make
                                const allMakeModels = Object.values(makeGroup.models).flatMap(mg => mg.models);
                                const makeRates = allMakeModels.map(m => m.dailyRate).filter(r => r != null && r !== undefined && r !== '');
                                const isMakeUniform = makeRates.length > 0 && makeRates.every(r => r === makeRates[0]);
                                const makeDisplayRate = isMakeUniform ? makeRates[0] : 'different';
                                
                                // Count total models
                                const totalModels = Object.keys(makeGroup.models).length;
                                
                                return (
                                  <div key={make} className="border border-gray-200 rounded-lg">
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
                                            {make}
                                          </span>
                                        </div>
                                        <span className="text-sm text-gray-600 ml-2">
                                          {totalModels} {totalModels === 1 ? 'model' : 'models'}
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
                                              await apiService.bulkUpdateModelDailyRate({
                                                dailyRate: parseFloat(rate),
                                                categoryId: categoryId,
                                                make: makeGroup.make,
                                                companyId: currentCompanyId
                                              });
                                              queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
                                              setDailyRateInputs(prev => ({ ...prev, [`make_${makeExpandedKey}`]: '' }));
                                            } catch (error) {
                                              console.error('Error updating models:', error);
                                              const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update models';
                                              toast.error(errorMessage);
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
                                    
                                    {/* Make Content - Show all models */}
                                    {isMakeExpanded && (
                                      <div className="p-4 space-y-2">
                                        {Object.entries(makeGroup.models).map(([modelName, modelGroup]) => {
                                          const modelExpandedKey = `${makeExpandedKey}_${modelName}`;
                                          
                                          // Calculate rates for this model
                                          const modelRates = modelGroup.models.map(m => m.dailyRate).filter(r => r != null && r !== undefined && r !== '');
                                          const isModelUniform = modelRates.length > 0 && modelRates.every(r => r === modelRates[0]);
                                          const modelDisplayRate = isModelUniform ? modelRates[0] : 'different';
                                          
                                          return (
                                            <div key={modelName} className="border border-gray-200 rounded-lg">
                                              {/* Model Header */}
                                              <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                                                <span className="font-medium text-gray-800">{modelGroup.modelName}</span>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm font-medium text-gray-700 min-w-[60px] text-right">
                                                    {modelDisplayRate !== 'different' ? formatRate(modelDisplayRate) : modelDisplayRate}
                                                  </span>
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Daily Rate"
                                                    value={dailyRateInputs[`model_${modelExpandedKey}`] || ''}
                                                    onChange={(e) => setDailyRateInputs(prev => ({
                                                      ...prev,
                                                      [`model_${modelExpandedKey}`]: e.target.value
                                                    }))}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                                    disabled={isUpdatingRate}
                                                  />
                                                  <button
                                                    onClick={async () => {
                                                      const rate = dailyRateInputs[`model_${modelExpandedKey}`];
                                                      if (!rate) {
                                                        toast.error('Please enter a daily rate');
                                                        return;
                                                      }
                                                      setIsUpdatingRate(true);
                                                      try {
                                                        await apiService.bulkUpdateModelDailyRate({
                                                          dailyRate: parseFloat(rate),
                                                          categoryId: categoryId,
                                                          make: makeGroup.make,
                                                          modelName: modelGroup.modelName,
                                                          companyId: currentCompanyId
                                                        });
                                                        queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
                                                        setDailyRateInputs(prev => ({ ...prev, [`model_${modelExpandedKey}`]: '' }));
                                                      } catch (error) {
                                                        console.error('Error updating models:', error);
                                                        const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update models';
                                                        toast.error(errorMessage);
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
                                                  {modelGroup.models.map(model => {
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
                                                          value={dailyRateInputs[`year_${year}_${modelExpandedKey}`] || ''}
                                                          onChange={(e) => setDailyRateInputs(prev => ({
                                                            ...prev,
                                                            [`year_${year}_${modelExpandedKey}`]: e.target.value
                                                          }))}
                                                          className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs"
                                                          disabled={isUpdatingRate}
                                                        />
                                                        <button
                                                          onClick={async () => {
                                                            const rate = dailyRateInputs[`year_${year}_${modelExpandedKey}`];
                                                            if (!rate) {
                                                              toast.error('Please enter a daily rate');
                                                              return;
                                                            }
                                                            setIsUpdatingRate(true);
                                                            try {
                                                              await apiService.bulkUpdateModelDailyRate({
                                                                dailyRate: parseFloat(rate),
                                                                categoryId: categoryId,
                                                                make: makeGroup.make,
                                                                modelName: modelGroup.modelName,
                                                                year: year,
                                                                companyId: currentCompanyId
                                                              });
                                                              queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
                                                              setDailyRateInputs(prev => ({ ...prev, [`year_${year}_${modelExpandedKey}`]: '' }));
                                                            } catch (error) {
                                                              console.error('Error updating models:', error);
                                                              const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update models';
                                                              toast.error(errorMessage);
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
                                          );
                                        })}
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
                      placeholder={t('admin.employeeSearch', 'Employee name or email')}
                      value={bookingCustomerFilter}
                      onChange={(e) => setBookingCustomerFilter(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-gray-600">
                    {t('admin.bookingCount', { count: totalBookings })}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        setBookingStatusFilter('');
                        setBookingCustomerFilter('');
                        const today = new Date();
                        setBookingDateFrom(today.toISOString().split('T')[0]);
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        setBookingDateTo(tomorrow.toISOString().split('T')[0]);
                      }}
                    >
                      {t('admin.resetFilters', 'Reset Filters')}
                    </button>
                    {/* Temporarily hidden */}
                    {false && (
                      <button
                        type="button"
                        className="btn-primary relative"
                        onClick={handleSyncPaymentsFromStripe}
                        disabled={syncingPayments || !filteredBookings || filteredBookings.length === 0}
                      >
                        {syncingPayments ? (
                          <>
                            <span className="animate-spin inline-block mr-2">⟳</span>
                            {t('admin.syncingPayments', 'Syncing...')}
                            {syncProgress.total > 0 && (
                              <span className="ml-2 text-xs opacity-75">
                                ({syncProgress.current}/{syncProgress.total})
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="mr-2">🔄</span>
                            {t('admin.syncPayments', 'Sync Payments from Stripe')}
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setShowReservationWizard(true);
                        setWizardStep(1);
                        setWizardCustomerEmail('');
                        setWizardCustomer(null);
                        setWizardSelectedCategory(null);
                        setWizardSelectedMake(null);
                        setWizardSelectedModel(null);
                        setWizardPickupDate(() => {
                          const today = new Date();
                          return today.toISOString().split('T')[0];
                        });
                        setWizardReturnDate(() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          return tomorrow.toISOString().split('T')[0];
                        });
                        setWizardSelectedCategory(null);
                        setWizardSelectedMake(null);
                        setWizardSelectedModel(null);
                      }}
                    >
                      {t('admin.createReservation', 'Create Reservation')}
                    </button>
                  </div>
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
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => handleOpenBookingDetails(booking)}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                              {booking.bookingNumber}
                            </button>
                          </td>
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
                        ? `Showing ${(bookingPage - 1) * bookingPageSize + 1}-${Math.min(bookingPage * bookingPageSize, totalBookings)} of ${totalBookings}`
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

          {/* Employees Section */}
          {activeSection === 'employees' && (
            <Card title={t('admin.employees', 'Employees')}>
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <input
                    type="text"
                    className="input-field border border-gray-300"
                    placeholder={t('admin.employeeSearch', 'Search by name or email')}
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCustomerPage(1);
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-primary flex items-center gap-2"
                      onClick={() => setShowAddEmployeeModal(true)}
                    >
                      <Plus className="h-4 w-4" />
                      {t('admin.addEmployee', 'Add Employee')}
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        setCustomerSearch('');
                        setCustomerPage(1);
                      }}
                      disabled={!customerSearch}
                    >
                      {t('admin.resetFilters', 'Reset Filters')}
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {`${totalCustomers} ${totalCustomers === 1 ? 'employee' : 'employees'}`}
                </div>
              </div>

              {isLoadingCustomers ? (
                <div className="py-8 text-center text-gray-500">
                  <LoadingSpinner />
                </div>
              ) : customersError ? (
                <div className="py-8 text-center text-red-500">
                  {t('admin.employeesLoadError', 'Unable to load employees.')}
                </div>
              ) : !customers.length ? (
                <div className="py-8 text-center text-gray-500">
                  {t('admin.noEmployeesFound', 'No employees found.')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.name', 'Name')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.email', 'Email')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.phone', 'Phone')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.location', 'Location')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.verified', 'Verified')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.role', 'Role')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.createdAt', 'Created')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.actions', 'Actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customers.map((customer) => {
                        const role = customer.role || customer.Role || 'customer';
                        return (
                          <tr key={customer.customerId || customer.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {customer.firstName || customer.FirstName} {customer.lastName || customer.LastName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {customer.email || customer.Email}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {customer.phone || customer.Phone || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {customer.city || customer.City || '-'}
                              {(customer.state || customer.State) && `, ${customer.state || customer.State}`}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  customer.isVerified || customer.IsVerified
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {customer.isVerified || customer.IsVerified
                                  ? t('admin.verified', 'Verified')
                                  : t('admin.notVerified', 'Not Verified')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  role === 'admin' || role === 'mainadmin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : role === 'worker'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {customer.createdAt || customer.CreatedAt
                                ? new Date(customer.createdAt || customer.CreatedAt).toLocaleDateString()
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditEmployee(customer)}
                                  className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                                  title={t('admin.editEmployee', 'Edit Employee')}
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEmployee(customer)}
                                  className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                                  title={t('admin.deleteEmployee', 'Remove Employee')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
                    <div className="text-sm text-gray-600">
                      {totalCustomers > 0
                        ? `Showing ${(customerPage - 1) * customerPageSize + 1}-${Math.min(customerPage * customerPageSize, totalCustomers)} of ${totalCustomers}`
                        : t('admin.showingRangeEmpty', 'No employees to display.')}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{t('admin.pageSize', 'Page Size')}</span>
                      <select
                        value={customerPageSize}
                        onChange={(e) => {
                          setCustomerPageSize(Number(e.target.value) || 20);
                          setCustomerPage(1);
                        }}
                        className="input-field w-24"
                      >
                        {[10, 20, 50, 100].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomerPage(1)}
                        disabled={customerPage <= 1}
                        className="btn-outline px-2 py-1 disabled:opacity-50"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerPage((prev) => Math.max(prev - 1, 1))}
                        disabled={customerPage <= 1}
                        className="btn-outline px-2 py-1 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm text-gray-600">
                        {customerPage} / {totalCustomerPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomerPage((prev) => Math.min(prev + 1, totalCustomerPages))}
                        disabled={customerPage >= totalCustomerPages}
                        className="btn-outline px-2 py-1 disabled:opacity-50"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerPage(totalCustomerPages)}
                        disabled={customerPage >= totalCustomerPages}
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

          {/* Additional Services Section */}
          {activeSection === 'additionalServices' && (
            <Card 
              title={t('admin.additionalServices')}
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
                {/* Import and Add buttons - Admin only */}
                {isAdmin && (
                  <>
                    <label className={`btn-secondary text-sm ${isImportingVehicles ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`} style={{ margin: 0 }}>
                      {isImportingVehicles ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2 inline-block"></div>
                          {t('vehicles.importing') || 'Importing...'}
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2 inline" />
                          {t('admin.importVehicles', 'Import Vehicles')}
                        </>
                      )}
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
                          features: null
                        });
                      }}
                      className="btn-primary text-sm"
                    >
                      <Plus className="h-4 w-4 mr-2 inline" />
                      {t('admin.addVehicle')}
                    </button>
                  </>
                )}
                {/* Manage Locations - All roles */}
                <button
                  onClick={() => navigate(`/vehicle-locations?companyId=${currentCompanyId}`)}
                  className="btn-outline text-sm flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  {t('admin.manageLocations', 'Manage Locations')}
                </button>
              </div>
            }>
              {/* Filters: Make, Model, Year, License Plate, and Location (if > 1) - Always visible */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Make Filter */}
                    <div className={pickupLocations.length > 1 ? "md:col-span-2" : "md:col-span-3"}>
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
                        <option value="">{t('vehicles.allMakes') || 'All Makes'}</option>
                        {uniqueMakes.map((make) => (
                          <option key={make} value={make}>
                            {make}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Model Filter */}
                    <div className={pickupLocations.length > 1 ? "md:col-span-2" : "md:col-span-3"}>
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
                        disabled={vehicleMakeFilter && filteredModels.length === 0}
                      >
                        <option value="">
                          {vehicleMakeFilter 
                            ? (filteredModels.length === 0 
                                ? t('vehicles.noModelsForMake', `No models for ${vehicleMakeFilter}`)
                                : t('vehicles.allModels', 'All Models'))
                            : t('vehicles.allModels', 'All Models')
                          }
                        </option>
                        {filteredModels.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Year Filter - Editable Input Field */}
                    <div className={pickupLocations.length > 1 ? "md:col-span-2" : "md:col-span-3"}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('vehicles.year') || 'Year'}
                      </label>
                      <input
                        type="text"
                        placeholder={t('vehicles.yearPlaceholder') || 'Year (e.g. 2025)'}
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
                    <div className={pickupLocations.length > 1 ? "md:col-span-2" : "md:col-span-3"}>
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

                    {/* Location Filter - Only show if company has more than 1 location */}
                    {pickupLocations.length > 1 && (
                      <div className="md:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('admin.location') || 'Location'}
                        </label>
                        <select
                          value={vehicleLocationFilter}
                          onChange={(e) => {
                            console.log('[AdminDashboard] Location filter changed to:', e.target.value);
                            setVehicleLocationFilter(e.target.value);
                            setVehiclePage(0);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">{t('admin.allLocations') || 'All Locations'}</option>
                          {pickupLocations.map((location) => {
                            const locationId = location.LocationId || location.locationId || location.id || location.Id;
                            const locationName = location.LocationName || location.locationName || location.location_name || '';
                            return (
                              <option key={locationId} value={locationId}>
                                {locationName}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                  </div>
                  
                  {/* Clear Filters Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setVehicleMakeFilter('');
                        setVehicleModelFilter('');
                        setVehicleYearFilter('');
                        setVehicleLicensePlateFilter('');
                        setVehicleLocationFilter('');
                        setVehicleSearchTerm('');
                        setVehiclePage(0);
                      }}
                      disabled={!vehicleMakeFilter && !vehicleModelFilter && !vehicleYearFilter && !vehicleLicensePlateFilter && !vehicleLocationFilter && !vehicleSearchTerm}
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
                {t('vehicleDetail.editVehicle', 'Edit Vehicle')}
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
                      {t('vehicles.make', 'Make')}
                    </label>
                    <input
                      type="text"
                      value={vehicleEditForm.make || ''}
                      onChange={(e) => setVehicleEditForm(prev => ({ ...prev, make: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={100}
                      placeholder={t('vehicles.make', 'Vehicle Make')}
                    />
                  </div>

                  {/* Model */}
                  <div className="col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('vehicles.model', 'Model')}
                    </label>
                    <input
                      type="text"
                      value={vehicleEditForm.model || ''}
                      onChange={(e) => setVehicleEditForm(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={100}
                      placeholder={t('vehicles.model', 'Vehicle Model')}
                    />
                  </div>

                  {/* Year */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('vehicles.year', 'Year')}
                    </label>
                    <input
                      type="number"
                      value={vehicleEditForm.year || ''}
                      onChange={(e) => setVehicleEditForm(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1900"
                      max="2100"
                      placeholder={t('vehicles.yearPlaceholder', 'Year')}
                    />
                  </div>
                </div>

                {/* License Plate and State in one row */}
                <div className="grid grid-cols-12 gap-4">
                  {/* License Plate */}
                  <div className="col-span-9">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('vehicles.licensePlate', 'License Plate')}
                    </label>
                    <input
                      type="text"
                      value={vehicleEditForm.licensePlate || ''}
                      onChange={(e) => setVehicleEditForm(prev => ({ ...prev, licensePlate: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={50}
                      placeholder={t('vehicles.licensePlate', 'License Plate')}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>

                  {/* State */}
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('vehicles.state', 'State')}
                    </label>
                    <select
                      value={vehicleEditForm.state || ''}
                      onChange={(e) => setVehicleEditForm(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!companyCountry || statesForCompanyCountry.length === 0}
                    >
                      <option value="">
                        {!companyCountry 
                          ? t('vehicles.selectStateNoCountry', 'Select State (No country set)')
                          : statesForCompanyCountry.length === 0 
                            ? t('vehicles.noStatesForCountry', `No states for ${companyCountry}`)
                            : t('vehicles.selectState', 'Select State')
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
                  {t('vehicles.color', 'Color')}
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
                  {t('vehicles.vin', 'VIN')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={vehicleEditForm.vin || ''}
                    onChange={(e) => setVehicleEditForm(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={17}
                    placeholder={t('vehicles.vinPlaceholder', '17-character VIN')}
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
                        {t('vehicles.lookingUp', 'Looking up...')}
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        {t('vehicles.lookupVin', 'Lookup VIN')}
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t('vehicles.vinLookupHint', 'Enter 17-character VIN and click Lookup to auto-fill vehicle information')}
                </p>
              </div>

              {/* Mileage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.mileage', 'Mileage')}
                </label>
                <input
                  type="number"
                  value={vehicleEditForm.mileage || 0}
                  onChange={(e) => setVehicleEditForm(prev => ({ ...prev, mileage: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>

              {/* Transmission and Seats */}
              <div className="grid grid-cols-2 gap-4">
                {/* Transmission */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.transmission', 'Transmission')}
                  </label>
                  <select
                    value={vehicleEditForm.transmission || ''}
                    onChange={(e) => setVehicleEditForm(prev => ({ ...prev, transmission: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('common.select', 'Select')}</option>
                    <option value="Automatic">{t('transmission.automatic', 'Automatic')}</option>
                    <option value="Manual">{t('transmission.manual', 'Manual')}</option>
                    <option value="CVT">CVT</option>
                  </select>
                </div>

                {/* Seats */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('vehicles.seats', 'Seats')}
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
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.status', 'Status')}
                </label>
                <select
                  value={vehicleEditForm.status || 'Available'}
                  onChange={(e) => setVehicleEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Available">{t('status.available', 'Available')}</option>
                  <option value="Rented">{t('status.rented', 'Rented')}</option>
                  <option value="Maintenance">{t('status.maintenance', 'Maintenance')}</option>
                  <option value="OutOfService">{t('status.retired', 'Out of Service')}</option>
                  <option value="Cleaning">{t('status.cleaning', 'Cleaning')}</option>
                </select>
              </div>

              {/* Location - Show combobox if company has more than 1 location, otherwise show text input */}
              {pickupLocations.length > 1 ? (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.location', 'Location')}
                    </label>
                    <select
                      value={vehicleEditForm.locationId || ''}
                      onChange={(e) => {
                        console.log('[AdminDashboard] Location selected:', e.target.value);
                        console.log('[AdminDashboard] Available locations:', pickupLocations);
                        const selectedLocation = pickupLocations.find(loc => 
                          (loc.LocationId || loc.locationId || loc.id || loc.Id) === e.target.value
                        );
                        console.log('[AdminDashboard] Found location:', selectedLocation);
                        const locationName = selectedLocation 
                          ? (selectedLocation.LocationName || selectedLocation.locationName || selectedLocation.location_name || '')
                          : '';
                        setVehicleEditForm(prev => ({ 
                          ...prev, 
                          locationId: e.target.value,
                          location: locationName
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">{t('home.selectLocation', 'Select Location')}</option>
                      {pickupLocations.map((location) => {
                        const locationId = location.LocationId || location.locationId || location.id || location.Id;
                        const locationName = location.LocationName || location.locationName || location.location_name || '';
                        return (
                          <option key={locationId} value={locationId}>
                            {locationName}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.location', 'Location')}
                    </label>
                    <input
                      type="text"
                      value={vehicleEditForm.location || ''}
                      onChange={(e) => setVehicleEditForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={255}
                      placeholder={t('vehicles.locationPlaceholder', 'Enter vehicle location')}
                    />
                  </div>
                )}

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
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleSaveVehicle}
                  disabled={updateVehicleMutation.isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {updateVehicleMutation.isLoading 
                    ? t('common.saving', 'Saving...') 
                    : t('common.save', 'Save')}
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
                {t('vehicles.createVehicle', 'Create Vehicle')}
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
                      {t('vehicles.year') || 'Year'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={vehicleCreateForm.year || ''}
                      onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1900"
                      max="2100"
                      placeholder={t('vehicles.yearPlaceholder') || 'Year'}
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={vehicleCreateForm.vin || ''}
                    onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={17}
                    placeholder="17-character VIN"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateVinLookup}
                    disabled={isLookingUpVin || !vehicleCreateForm.vin || vehicleCreateForm.vin.length !== 17}
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
                        {t('vehicles.lookupVin', 'Lookup Vin')}
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
                  value={vehicleCreateForm.mileage || 0}
                  onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, mileage: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>

              {/* Transmission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.transmission') || 'Transmission'}
                </label>
                <select
                  value={vehicleCreateForm.transmission || ''}
                  onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, transmission: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('common.select') || 'Select'}</option>
                  <option value="Automatic">{t('transmission.automatic') || 'Automatic'}</option>
                  <option value="Manual">{t('transmission.manual') || 'Manual'}</option>
                  <option value="CVT">CVT</option>
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
                  {t('admin.status') || 'Status'}
                </label>
                <select
                  value={vehicleCreateForm.status || 'Available'}
                  onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Available">{t('status.available') || 'Available'}</option>
                  <option value="Rented">{t('status.rented') || 'Rented'}</option>
                  <option value="Maintenance">{t('status.maintenance') || 'Maintenance'}</option>
                  <option value="OutOfService">{t('status.retired') || 'Out of Service'}</option>
                  <option value="Cleaning">{t('status.cleaning') || 'Cleaning'}</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.location') || 'Location'}
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

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.features') || 'Features'}
                </label>
                <textarea
                  value={vehicleCreateForm.features || ''}
                  onChange={(e) => setVehicleCreateForm(prev => ({ ...prev, features: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Enter vehicle features separated by commas"
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
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleCreateVehicle}
                  disabled={createVehicleMutation.isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {createVehicleMutation.isLoading 
                    ? t('vehicles.creating', 'Creating...') 
                    : t('vehicles.create', 'Create')}
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

      {/* Add/Edit Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingEmployeeId ? t('admin.editEmployee', 'Edit Employee') : t('admin.addEmployee', 'Add Employee')}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEmployeeModal(false);
                    setEditingEmployeeId(null);
                    setSelectedCustomer(null);
                    setEmployeeSearchEmail('');
                    setFoundCustomers([]);
                    setSelectedRole('worker');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Show current employee info when editing */}
                {editingEmployeeId && selectedCustomer && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="font-medium text-gray-900 mb-1">
                      {selectedCustomer.firstName || selectedCustomer.FirstName} {selectedCustomer.lastName || selectedCustomer.LastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedCustomer.email || selectedCustomer.Email}
                    </div>
                    {selectedCustomer.phone || selectedCustomer.Phone ? (
                      <div className="text-xs text-gray-500 mt-1">
                        {selectedCustomer.phone || selectedCustomer.Phone}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Search Section - only show when adding (not editing) */}
                {!editingEmployeeId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.searchByEmailOrName', 'Search by Email or Name')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="input-field flex-1"
                        placeholder={t('admin.enterEmailOrName', 'Enter email, first name, or last name')}
                        value={employeeSearchEmail}
                        onChange={(e) => setEmployeeSearchEmail(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleFindCustomers();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleFindCustomers}
                        disabled={isSearchingCustomers || !employeeSearchEmail.trim()}
                        className="btn-primary px-4 py-2 disabled:opacity-50"
                      >
                        {isSearchingCustomers ? t('common.searching') || 'Searching...' : t('common.find') || 'Find'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Found Customers List - only show when adding (not editing) */}
                {!editingEmployeeId && foundCustomers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.selectCustomer', 'Select Customer')}
                    </label>
                    <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                      {foundCustomers.map((customer) => {
                        const customerId = customer.customerId || customer.id || customer.CustomerId;
                        const isSelected = selectedCustomer && (
                          (selectedCustomer.customerId || selectedCustomer.id || selectedCustomer.CustomerId) === customerId
                        );
                        return (
                          <div
                            key={customerId}
                            onClick={() => setSelectedCustomer(customer)}
                            className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                              isSelected ? 'bg-blue-50 border-blue-300' : ''
                            }`}
                          >
                            <div className="font-medium text-gray-900">
                              {customer.firstName || customer.FirstName} {customer.lastName || customer.LastName}
                            </div>
                            <div className="text-sm text-gray-600">
                              {customer.email || customer.Email}
                            </div>
                            {customer.phone || customer.Phone ? (
                              <div className="text-xs text-gray-500">
                                {customer.phone || customer.Phone}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Role Selection */}
                {selectedCustomer && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.role', 'Role')}
                    </label>
                    <select
                      value={selectedRole === 'mainadmin' || selectedRole === 'customer' ? 'worker' : selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="input-field w-full"
                    >
                      <option value="worker">{t('admin.roleWorker', 'Worker')}</option>
                      <option value="admin">{t('admin.roleAdmin', 'Admin')}</option>
                    </select>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddEmployeeModal(false);
                      setEditingEmployeeId(null);
                      setSelectedCustomer(null);
                      setEmployeeSearchEmail('');
                      setFoundCustomers([]);
                      setSelectedRole('worker');
                    }}
                    className="btn-outline px-4 py-2"
                    disabled={isSettingEmployee}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSetEmployee}
                    disabled={!selectedCustomer || isSettingEmployee}
                    className="btn-primary px-4 py-2 disabled:opacity-50"
                  >
                    {isSettingEmployee
                      ? t('common.saving') || 'Saving...'
                      : editingEmployeeId
                      ? t('admin.updateEmployee', 'Update Employee')
                      : t('admin.setEmployee', 'Set Employee')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Payments Confirmation Modal */}
      {showSyncConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowSyncConfirmModal(false)}
            />

            {/* Modal content */}
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl bg-white bg-opacity-20">
                    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-bold text-white">
                      {t('admin.syncPayments', 'Sync Payments from Stripe')}
                    </h3>
                    <p className="text-sm text-blue-100 mt-1">
                      {filteredBookings?.length || 0} {t('admin.bookingsSelected', 'booking(s) selected')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="bg-white px-6 py-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100">
                      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-base font-medium text-gray-900 mb-3">
                      {t('admin.confirmSyncPayments', 
                        `Sync payment information from Stripe for ${filteredBookings?.length || 0} filtered booking(s)?`)}
                    </p>
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3 space-y-1">
                          <p className="text-sm text-blue-700">
                            {t('admin.syncPaymentsNote', 'This will fetch the latest payment status from Stripe and update your database.')}
                          </p>
                          <p className="text-xs text-blue-600 font-medium">
                            ⏱️ {t('admin.syncMayTakeTime', 'This may take a few minutes for multiple bookings.')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={confirmSyncPayments}
                  className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-base font-medium text-white hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto transition-all transform hover:scale-105"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('common.ok', 'OK')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSyncConfirmModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Refund Modal */}
      {showCancelRefundModal && selectedBooking && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowCancelRefundModal(false)}
            />

            {/* Modal content */}
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl bg-white bg-opacity-20">
                    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentWidth">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-bold text-white">
                      {t('admin.cancelBookingRefund', 'Cancel Booking & Process Refund')}
                    </h3>
                    <p className="text-sm text-red-100 mt-1">
                      {selectedBooking.bookingNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="bg-white px-6 py-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-yellow-100">
                        <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentWidth">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-base font-medium text-gray-900 mb-2">
                        {t('admin.cancelBookingMessage', 'This booking will be canceled and a refund will be processed.')}
                      </p>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        {t('admin.paymentAmount', 'Payment Amount')}
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(selectedBooking.totalAmount || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Refund Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.refundAmount', 'Refund Amount')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">{currencySymbol}</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={parseFloat(selectedBooking.totalAmount || 0)}
                        value={cancelRefundAmount}
                        onChange={(e) => setCancelRefundAmount(e.target.value)}
                        className="block w-full pl-7 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm"
                        placeholder="0.00"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 sm:text-sm">
                          / {formatPrice(selectedBooking.totalAmount || 0)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {t('admin.refundAmountNote', 'Enter an amount up to the payment total. This action cannot be undone.')}
                    </p>
                  </div>

                  {/* Refund Reason Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.refundReason', 'Refund Reason')} <span className="text-gray-400">({t('common.optional', 'Optional')})</span>
                    </label>
                    <textarea
                      rows={3}
                      value={cancelRefundReason}
                      onChange={(e) => setCancelRefundReason(e.target.value)}
                      className="block w-full py-3 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm"
                      placeholder={t('admin.refundReasonPlaceholder', 'e.g., Customer requested cancellation, Change of plans, etc.')}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={handleConfirmCancelRefund}
                  disabled={refundPaymentMutation.isLoading}
                  className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-base font-medium text-white hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {refundPaymentMutation.isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('common.processing', 'Processing...')}
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentWidth">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('admin.processRefund', 'Process Refund & Cancel')}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelRefundModal(false);
                    setCancelRefundAmount('');
                    setCancelRefundReason('');
                    setPendingCancelStatus('');
                  }}
                  disabled={refundPaymentMutation.isLoading}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:w-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Deposit Payment Modal */}
      {showSecurityDepositModal && selectedBooking && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => !payingSecurityDeposit && setShowSecurityDepositModal(false)}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <div className="flex items-center">
                  <svg className="h-6 w-6 text-white mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {t('admin.paySecurityDeposit', 'Pay Security Deposit')}
                    </h3>
                    <p className="text-sm text-blue-100 mt-1">
                      {selectedBooking.bookingNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="bg-white px-6 py-4">
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      {t('admin.securityDepositRequired', 'A security deposit is required to activate this booking.')}
                    </p>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      {t('admin.selectPaymentMethod', 'Select Payment Method')}
                    </h4>
                    <div className="space-y-3">
                      {/* Card Reader Option */}
                      <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === 'terminal' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-blue-300 bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="terminal"
                          checked={paymentMethod === 'terminal'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900">
                              {t('admin.cardReader', 'Card Reader (Stripe Terminal)')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 ml-7 mt-1">
                            {t('admin.cardReaderDesc', 'Customer taps/swipes card on physical reader')}
                          </p>
                        </div>
                      </label>

                      {/* Stripe Checkout Option */}
                      <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === 'checkout' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-blue-300 bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="checkout"
                          checked={paymentMethod === 'checkout'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900">
                              {t('admin.stripeCheckout', 'Stripe Checkout Page')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 ml-7 mt-1">
                            {t('admin.stripeCheckoutDesc', 'Redirect to secure Stripe payment page to enter card')}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{t('admin.customerName', 'Customer')}</span>
                      <span className="text-sm font-medium text-gray-900">{selectedBooking.customerName}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{t('admin.vehicleName', 'Vehicle')}</span>
                      <span className="text-sm font-medium text-gray-900">{selectedBooking.vehicleName}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{t('admin.bookingDates', 'Booking Dates')}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(selectedBooking.pickupDate).toLocaleDateString()} - {new Date(selectedBooking.returnDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-600 mb-2">{t('admin.securityDepositAmount', 'Security Deposit Amount')}</p>
                    <p className="text-4xl font-bold text-green-600">
                      {(() => {
                        const bookingDeposit = parseFloat(selectedBooking.securityDeposit || selectedBooking.SecurityDeposit || 0);
                        const companyDeposit = parseFloat(actualCompanyData?.securityDeposit || actualCompanyData?.SecurityDeposit || 0);
                        const finalDeposit = bookingDeposit > 0 ? bookingDeposit : companyDeposit;
                        return formatPrice(finalDeposit);
                      })()}
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                      <svg className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-yellow-800">
                        {t('admin.securityDepositNote', 'The security deposit will be refunded upon vehicle return in good condition.')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={handleInitiatePayment}
                  disabled={payingSecurityDeposit || !paymentMethod}
                  className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-base font-medium text-white hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!paymentMethod ? t('admin.selectPaymentMethodFirst', 'Please select a payment method first') : ''}
                >
                  {payingSecurityDeposit ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('common.processing', 'Processing...')}
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {t('admin.processPayment', 'Process Payment')}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSecurityDepositModal(false);
                    setPendingActiveStatus('');
                    setPaymentMethod('');
                    setPayingSecurityDeposit(false);
                  }}
                  disabled={payingSecurityDeposit}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Payment Modal - for booking total amount */}
      {showBookingPaymentModal && selectedBooking && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => !payingBooking && setShowBookingPaymentModal(false)}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <div className="flex items-center">
                  <svg className="h-6 w-6 text-white mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {t('admin.payBooking', 'Pay Booking')}
                    </h3>
                    <p className="text-sm text-blue-100 mt-1">
                      {selectedBooking.bookingNumber || selectedBooking.BookingNumber || ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="bg-white px-6 py-4">
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      {t('admin.bookingPaymentRequired', 'Please select a payment method to complete the booking payment.')}
                    </p>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      {t('admin.selectPaymentMethod', 'Select Payment Method')}
                    </h4>
                    <div className="space-y-3">
                      {/* Card Reader Option */}
                      <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === 'terminal' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-blue-300 bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="bookingPaymentMethod"
                          value="terminal"
                          checked={paymentMethod === 'terminal'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900">
                              {t('admin.cardReader', 'Card Reader (Stripe Terminal)')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 ml-7 mt-1">
                            {t('admin.cardReaderDesc', 'Customer taps/swipes card on physical reader')}
                          </p>
                        </div>
                      </label>

                      {/* Stripe Checkout Option */}
                      <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === 'checkout' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-blue-300 bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="bookingPaymentMethod"
                          value="checkout"
                          checked={paymentMethod === 'checkout'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center">
                            <svg className="w-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900">
                              {t('admin.stripeCheckout', 'Stripe Checkout Page')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 ml-7 mt-1">
                            {t('admin.stripeCheckoutDesc', 'Redirect to secure Stripe payment page to enter card')}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{t('admin.customerName', 'Customer')}</span>
                      <span className="text-sm font-medium text-gray-900">{selectedBooking.customerName || selectedBooking.CustomerName}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{t('admin.vehicleName', 'Vehicle')}</span>
                      <span className="text-sm font-medium text-gray-900">{selectedBooking.vehicleName || selectedBooking.VehicleName}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{t('admin.bookingDates', 'Booking Dates')}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(selectedBooking.pickupDate || selectedBooking.PickupDate).toLocaleDateString()} - {new Date(selectedBooking.returnDate || selectedBooking.ReturnDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-600 mb-2">{t('admin.bookingTotalAmount', 'Booking Total Amount')}</p>
                    <p className="text-4xl font-bold text-green-600">
                      {formatPrice(parseFloat(selectedBooking.totalAmount || selectedBooking.TotalAmount || 0))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={handleInitiateBookingPayment}
                  disabled={payingBooking || !paymentMethod}
                  className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-base font-medium text-white hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!paymentMethod ? t('admin.selectPaymentMethodFirst', 'Please select a payment method first') : ''}
                >
                  {payingBooking ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('common.processing', 'Processing...')}
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {t('admin.processPayment', 'Process Payment')}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingPaymentModal(false);
                    setPaymentMethod('');
                    setPayingBooking(false);
                    // Clear pending status if user cancels payment
                    if (pendingConfirmedStatus) {
                      setPendingConfirmedStatus('');
                    }
                  }}
                  disabled={payingBooking}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Damage Confirmation Modal */}
      {showDamageConfirmationModal && selectedBooking && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => !payingSecurityDeposit && setShowDamageConfirmationModal(false)}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                <div className="flex items-center">
                  <svg className="h-6 w-6 text-white mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {t('admin.completeBooking', 'Complete Booking')}
                    </h3>
                    <p className="text-sm text-orange-100 mt-1">
                      {selectedBooking.bookingNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="bg-white px-6 py-4">
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 font-medium mb-3">
                      {t('admin.damageCheckQuestion', 'Was there any damage to the vehicle?')}
                    </p>
                    
                    <div className="space-y-3">
                      <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        !hasDamage 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-300 hover:border-green-300 bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="hasDamage"
                          value="no"
                          checked={!hasDamage}
                          onChange={() => setHasDamage(false)}
                          className="w-5 h-5 text-green-600"
                        />
                        <div className="ml-3 flex-1">
                          <span className="text-sm font-medium text-gray-900">
                            {t('admin.noDamage', 'No Damage')}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {t('admin.noDamageDesc', 'Vehicle returned in good condition')}
                          </p>
                        </div>
                      </label>

                      <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        hasDamage 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-300 hover:border-red-300 bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="hasDamage"
                          value="yes"
                          checked={hasDamage}
                          onChange={() => setHasDamage(true)}
                          className="w-5 h-5 text-red-600"
                        />
                        <div className="ml-3 flex-1">
                          <span className="text-sm font-medium text-gray-900">
                            {t('admin.hasDamage', 'Damage Found')}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {t('admin.hasDamageDesc', 'Vehicle has damage - security deposit will be charged')}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {hasDamage && selectedBooking.securityDepositPaymentIntentId && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
                      <div className="flex">
                        <svg className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-red-800">
                          {t('admin.securityDepositWillBeCharged', 'The security deposit will be charged due to damage.')}
                        </p>
                      </div>
                      
                      {/* Damage Amount Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('admin.damageAmount', 'Damage Amount to Charge')}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            {currencySymbol}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={damageAmount}
                            onChange={(e) => setDamageAmount(e.target.value)}
                            placeholder={(() => {
                              const bookingDeposit = parseFloat(selectedBooking.securityDeposit || selectedBooking.SecurityDeposit || 0);
                              const companyDeposit = parseFloat(actualCompanyData?.securityDeposit || actualCompanyData?.SecurityDeposit || 0);
                              const maxDeposit = bookingDeposit > 0 ? bookingDeposit : companyDeposit;
                              return formatPrice(maxDeposit);
                            })()}
                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {t('admin.maxDepositAmount', 'Maximum:')} {(() => {
                            const bookingDeposit = parseFloat(selectedBooking.securityDeposit || selectedBooking.SecurityDeposit || 0);
                            const companyDeposit = parseFloat(actualCompanyData?.securityDeposit || actualCompanyData?.SecurityDeposit || 0);
                            const maxDeposit = bookingDeposit > 0 ? bookingDeposit : companyDeposit;
                            return formatPrice(maxDeposit);
                          })()}
                        </p>
                      </div>
                    </div>
                  )}

                  {hasDamage && !selectedBooking.securityDepositPaymentIntentId && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600">
                        {t('admin.noSecurityDepositToCharge', 'No security deposit was collected for this booking.')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={handleDamageConfirmation}
                  disabled={payingSecurityDeposit}
                  className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-base font-medium text-white hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:w-auto transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {payingSecurityDeposit ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('common.processing', 'Processing...')}
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('admin.completeBooking', 'Complete Booking')}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDamageConfirmationModal(false);
                    setHasDamage(false);
                    setDamageAmount('');
                    setPendingCompletedStatus('');
                  }}
                  disabled={payingSecurityDeposit}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:w-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {showBookingDetailsModal && selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowBookingDetailsModal(false)}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              {/* Header */}
              <div className="bg-blue-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    {t('admin.bookingDetails', 'Booking Details')} - {selectedBooking.bookingNumber}
                  </h3>
                  <button
                    onClick={() => setShowBookingDetailsModal(false)}
                    className="text-white hover:text-gray-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="bg-white px-6 py-4">
                <div className="space-y-4">
                  {/* Customer Information */}
                  <div className="border-b border-gray-200 pb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      {t('admin.customerInformation', 'Customer Information')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">{t('admin.name', 'Name')}</p>
                        <p className="text-sm font-medium text-gray-900">{selectedBooking.customerName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('admin.email', 'Email')}</p>
                        <p className="text-sm font-medium text-gray-900">{selectedBooking.customerEmail}</p>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div className="border-b border-gray-200 pb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      {t('admin.vehicleInformation', 'Vehicle Information')}
                    </h4>
                    <div>
                      <p className="text-xs text-gray-500">{t('admin.vehicle', 'Vehicle')}</p>
                      <p className="text-sm font-medium text-gray-900">{selectedBooking.vehicleName}</p>
                    </div>
                  </div>

                  {/* Booking Dates */}
                  <div className="border-b border-gray-200 pb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      {t('admin.bookingDates', 'Booking Dates')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">{t('admin.pickupDate', 'Pickup Date')}</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(selectedBooking.pickupDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('admin.returnDate', 'Return Date')}</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(selectedBooking.returnDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="border-b border-gray-200 pb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      {t('admin.pricing', 'Pricing')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">{t('admin.totalAmount', 'Total Amount')}</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatPrice(selectedBooking.totalAmount || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('admin.securityDeposit', 'Security Deposit')}</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatPrice(selectedBooking.securityDeposit || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="border-b border-gray-200 pb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      {t('admin.paymentInformation', 'Payment Information')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">{t('admin.paymentMethod', 'Payment Method')}</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedBooking.paymentMethod || t('admin.notAvailable', 'N/A')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('admin.paymentStatus', 'Payment Status')}</p>
                        <p className="text-sm font-medium text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedBooking.paymentStatus === 'Paid' || selectedBooking.paymentStatus === 'succeeded'
                              ? 'bg-green-100 text-green-800' 
                              : selectedBooking.paymentStatus === 'Refunded' || selectedBooking.paymentStatus === 'refunded'
                              ? 'bg-gray-100 text-gray-800'
                              : selectedBooking.paymentStatus === 'Pending' || selectedBooking.paymentStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedBooking.paymentStatus === 'succeeded' 
                              ? t('admin.paid', 'Paid') 
                              : selectedBooking.paymentStatus || t('admin.unpaid', 'Unpaid')}
                          </span>
                        </p>
                      </div>
                      {selectedBooking.stripePaymentIntentId && (
                        <>
                          <div>
                            <p className="text-xs text-gray-500">{t('admin.paymentIntentId', 'Payment Intent ID')}</p>
                            <p className="text-xs font-mono text-gray-700 break-all">
                              {selectedBooking.stripePaymentIntentId}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">{t('admin.transactionDate', 'Transaction Date')}</p>
                            <p className="text-sm font-medium text-gray-900">
                              {selectedBooking.paymentDate 
                                ? new Date(selectedBooking.paymentDate).toLocaleString() 
                                : t('admin.notAvailable', 'N/A')}
                            </p>
                          </div>
                        </>
                      )}
                      {selectedBooking.refundAmount && parseFloat(selectedBooking.refundAmount) > 0 && (
                        <div>
                          <p className="text-xs text-gray-500">{t('admin.refundAmount', 'Refund Amount')}</p>
                          <p className="text-sm font-medium text-red-600">
                            {formatPrice(selectedBooking.refundAmount)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Security Deposit Information */}
                  {selectedBooking.securityDepositPaymentIntentId && (
                    <div className="border-b border-gray-200 pb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        {t('admin.securityDepositInfo', 'Security Deposit Information')}
                      </h4>
                      <div className={`rounded-lg p-4 ${
                        selectedBooking.securityDepositStatus === 'captured' 
                          ? 'bg-red-50 border border-red-200'
                          : selectedBooking.securityDepositStatus === 'released' 
                          ? 'bg-gray-50 border border-gray-200'
                          : 'bg-blue-50 border border-blue-200'
                      }`}>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">{t('admin.depositAmount', 'Deposit Amount')}</p>
                            <p className={`text-lg font-bold ${
                              selectedBooking.securityDepositStatus === 'captured' 
                                ? 'text-red-600' 
                                : selectedBooking.securityDepositStatus === 'released'
                                ? 'text-gray-600'
                                : 'text-blue-600'
                            }`}>
                              {formatPrice(
                                selectedBooking.securityDepositChargedAmount || 
                                selectedBooking.securityDeposit || 
                                actualCompanyData?.securityDeposit || 
                                0
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">{t('admin.depositStatus', 'Status')}</p>
                            <p className="text-sm font-medium text-gray-900">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                selectedBooking.securityDepositStatus === 'captured' 
                                  ? 'bg-red-100 text-red-800'
                                  : selectedBooking.securityDepositStatus === 'released'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {selectedBooking.securityDepositStatus === 'captured' 
                                  ? t('admin.captured', 'Captured (Charged)')
                                  : selectedBooking.securityDepositStatus === 'released'
                                  ? t('admin.released', 'Released (Not Charged)')
                                  : t('admin.authorized', 'Authorized (Not Charged)')}
                              </span>
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">{t('admin.depositPaymentIntentId', 'Deposit Payment Intent ID')}</p>
                            <p className="text-xs font-mono text-gray-700 break-all">
                              {selectedBooking.securityDepositPaymentIntentId}
                            </p>
                          </div>
                          {selectedBooking.securityDepositAuthorizedAt && (
                            <div>
                              <p className="text-xs text-gray-500">{t('admin.authorizedAt', 'Authorized At')}</p>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(selectedBooking.securityDepositAuthorizedAt).toLocaleString()}
                              </p>
                            </div>
                          )}
                          {selectedBooking.securityDepositCapturedAt && (
                            <div>
                              <p className="text-xs text-gray-500">{t('admin.capturedAt', 'Captured At')}</p>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(selectedBooking.securityDepositCapturedAt).toLocaleString()}
                              </p>
                            </div>
                          )}
                          {selectedBooking.securityDepositReleasedAt && (
                            <div>
                              <p className="text-xs text-gray-500">{t('admin.releasedAt', 'Released At')}</p>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(selectedBooking.securityDepositReleasedAt).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className={`mt-3 pt-3 border-t ${
                          selectedBooking.securityDepositStatus === 'captured' 
                            ? 'border-red-300'
                            : selectedBooking.securityDepositStatus === 'released'
                            ? 'border-gray-300'
                            : 'border-blue-300'
                        }`}>
                          <div className="flex items-start">
                            <svg className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${
                              selectedBooking.securityDepositStatus === 'captured'
                                ? 'text-red-500'
                                : selectedBooking.securityDepositStatus === 'released'
                                ? 'text-gray-500'
                                : 'text-blue-500'
                            }`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <p className={`text-xs ${
                              selectedBooking.securityDepositStatus === 'captured'
                                ? 'text-red-800'
                                : selectedBooking.securityDepositStatus === 'released'
                                ? 'text-gray-800'
                                : 'text-blue-800'
                            }`}>
                              {selectedBooking.securityDepositStatus === 'captured'
                                ? t('admin.depositCapturedNote', 'Security deposit has been captured and charged to the customer\'s card.')
                                : selectedBooking.securityDepositStatus === 'released'
                                ? t('admin.depositReleasedNote', 'Security deposit authorization has been released. No charge was made.')
                                : t('admin.depositNote', 'Security deposit has been authorized on the customer\'s card but not charged. It will be automatically released after 7 days or can be manually captured/released in Stripe Dashboard.')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Refund Records */}
                  {selectedBooking.refundRecords && selectedBooking.refundRecords.length > 0 && (
                    <div className="border-b border-gray-200 pb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        {t('admin.refundHistory', 'Refund History')}
                      </h4>
                      <div className="space-y-3">
                        {selectedBooking.refundRecords.map((refund) => (
                          <div key={refund.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-gray-500">{t('admin.refundAmount', 'Refund Amount')}</p>
                                <p className="text-sm font-bold text-red-600">
                                  {formatPrice(refund.amount)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">{t('admin.refundDate', 'Refund Date')}</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {new Date(refund.createdAt).toLocaleString()}
                                </p>
                              </div>
                              {refund.reason && (
                                <div className="col-span-2">
                                  <p className="text-xs text-gray-500">{t('admin.refundReason', 'Reason')}</p>
                                  <p className="text-sm text-gray-900">{refund.reason}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-gray-500">{t('admin.refundId', 'Refund ID')}</p>
                                <p className="text-xs font-mono text-gray-700 break-all">
                                  {refund.stripeRefundId}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">{t('admin.refundStatus', 'Status')}</p>
                                <p className="text-sm font-medium text-gray-900">
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                    {refund.status || 'succeeded'}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Booking Status - Read-only (auto-progresses with Next button) */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      {t('admin.bookingStatus', 'Booking Status')}
                    </h4>
                    {selectedBooking.refundRecords && selectedBooking.refundRecords.length > 0 ? (
                      <div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                          <p className="text-sm text-yellow-800">
                            {t('admin.statusChangeProhibited', 'Status cannot be changed because this booking has been refunded.')}
                          </p>
                        </div>
                        <input
                          type="text"
                          value={formatBookingStatus(selectedBooking.status || selectedBooking.Status || '')}
                          disabled
                          className="input-field w-full border border-gray-300 bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                    ) : (
                      <div>
                        <input
                          type="text"
                          value={formatBookingStatus(selectedBooking.status || selectedBooking.Status || '')}
                          disabled
                          readOnly
                          className="input-field w-full border border-gray-300 bg-gray-50 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {(() => {
                            const currentStatus = (selectedBooking.status || selectedBooking.Status || '').toLowerCase();
                            if (currentStatus === 'pending') {
                              return t('admin.nextStatusWillBe', 'Next status will be: {{status}}', { status: t('booking.statusConfirmed', 'Confirmed') });
                            } else if (currentStatus === 'confirmed') {
                              return t('admin.nextStatusWillBe', 'Next status will be: {{status}}', { status: t('booking.statusActive', 'Active') });
                            } else if (currentStatus === 'active') {
                              return t('admin.nextStatusWillBe', 'Next status will be: {{status}}', { status: t('booking.statusCompleted', 'Completed') });
                            } else {
                              return t('admin.statusFinal', 'Status is final and cannot be changed');
                            }
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
                {/* Refund button on the left */}
                <div>
                  {selectedBooking.stripePaymentIntentId && 
                   (selectedBooking.paymentStatus === 'Paid' || selectedBooking.paymentStatus === 'succeeded') && 
                   selectedBooking.status !== 'Cancelled' &&
                   selectedBooking.status !== 'Completed' &&
                   selectedBooking.status !== 'completed' &&
                   (!selectedBooking.refundRecords || selectedBooking.refundRecords.length === 0) && (
                    <button
                      type="button"
                      onClick={handleRefund}
                      disabled={refundPaymentMutation.isLoading}
                      className="btn-outline border-red-600 text-red-600 hover:bg-red-50"
                    >
                      {refundPaymentMutation.isLoading 
                        ? t('admin.processing', 'Processing...') 
                        : t('admin.refundPayment', 'Refund Payment')}
                    </button>
                  )}
                </div>
                
                {/* Action buttons on the right */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBookingDetailsModal(false)}
                    className="btn-outline"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateBookingStatus}
                    disabled={
                      updateBookingStatusMutation.isLoading || 
                      (selectedBooking.refundRecords && selectedBooking.refundRecords.length > 0) ||
                      (selectedBooking.status && ['Completed', 'completed', 'Cancelled', 'cancelled'].includes(selectedBooking.status))
                    }
                    className="btn-primary"
                  >
                    {updateBookingStatusMutation.isLoading 
                      ? t('common.saving', 'Saving...') 
                      : t('common.next', 'Next')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Wizard Modal */}
      {showReservationWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {t('admin.createReservation', 'Create Reservation')}
                </h2>
                <button
                  onClick={() => {
                    setShowReservationWizard(false);
                    setWizardStep(1);
                    setWizardCustomerEmail('');
                    setWizardCustomer(null);
                    setWizardSelectedCategory(null);
                    setWizardSelectedMake(null);
                    setWizardSelectedModel(null);
                    setWizardModelsByMake({});
                    setWizardExpandedMakes(new Set());
                    setWizardSelectedLocation(null);
                    setWizardSelectedServices([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center mb-6 overflow-x-auto">
                <div className={`flex items-center ${wizardStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${wizardStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                    1
                  </div>
                  <span className="ml-2 font-medium whitespace-nowrap">{t('admin.datesAndCategory', 'Dates & Customer')}</span>
                </div>
                <div className={`flex-1 h-1 mx-2 ${wizardStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center ${wizardStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${wizardStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                    2
                  </div>
                  <span className="ml-2 font-medium whitespace-nowrap">Category</span>
                </div>
                <div className={`flex-1 h-1 mx-2 ${wizardStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center ${wizardStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${wizardStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                    3
                  </div>
                  <span className="ml-2 font-medium whitespace-nowrap">Make & Model</span>
                </div>
                <div className={`flex-1 h-1 mx-2 ${wizardStep >= 4 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center ${wizardStep >= 4 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${wizardStep >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                    4
                  </div>
                  <span className="ml-2 font-medium whitespace-nowrap">{t('admin.bookingSummary', 'Booking Summary')}</span>
                </div>
              </div>

              {/* Step 1: Customer, Dates, and Location */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('admin.pickupDate', 'Pickup Date')}
                      </label>
                      <input
                        type="date"
                        value={wizardPickupDate}
                        onChange={(e) => setWizardPickupDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('admin.returnDate', 'Return Date')}
                      </label>
                      <input
                        type="date"
                        value={wizardReturnDate}
                        onChange={(e) => setWizardReturnDate(e.target.value)}
                        min={wizardPickupDate || new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Location Selector (only if more than 1 location) */}
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
                            <option key={locId} value={locId}>
                              {locName}
                            </option>
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
                        disabled={wizardSearchingCustomer || wizardCreatingCustomer}
                      />
                      <button
                        type="button"
                        onClick={async () => {
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
                              // Customer not found, silently create new one
                              throw new Error('Customer not found');
                            }
                          } catch (error) {
                            // Silently handle 404 - customer not found, create new one
                            // Don't show error for 404, it's expected behavior
                            const isNotFound = error.response?.status === 404 || error.message?.includes('not found');
                            
                            if (!isNotFound) {
                              // Only log non-404 errors for debugging, but don't show to user
                              console.warn('Customer lookup error (non-404):', error);
                            }
                            
                            // Customer not found, create new one silently
                            setWizardCreatingCustomer(true);
                            try {
                              const newCustomer = await apiService.createCustomer({
                                email: wizardCustomerEmail,
                                firstName: '',
                                lastName: '',
                                phone: ''
                                // Note: Empty password - backend should send invitation email
                              });
                              const customer = newCustomer?.data || newCustomer;
                              setWizardCustomer(customer);
                              setTimeout(() => setWizardStep(2), 500);
                            } catch (createError) {
                              // Only show error if customer creation fails
                              console.error('Error creating customer:', createError);
                              toast.error(createError.response?.data?.message || t('admin.customerCreateError', 'Failed to create customer'));
                            } finally {
                              setWizardCreatingCustomer(false);
                            }
                          } finally {
                            setWizardSearchingCustomer(false);
                          }
                        }}
                        disabled={wizardSearchingCustomer || wizardCreatingCustomer || !wizardCustomerEmail || !wizardPickupDate || !wizardReturnDate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {wizardSearchingCustomer 
                          ? t('admin.searching', 'Searching...')
                          : wizardCreatingCustomer
                          ? t('admin.creating', 'Creating...')
                          : t('admin.findOrCreate', 'Find or Create')}
                      </button>
                    </div>
                  </div>
                  {wizardCustomer && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        {t('admin.customerSelected', 'Customer selected')}: {wizardCustomer.email}
                        {wizardCustomer.firstName && ` (${wizardCustomer.firstName} ${wizardCustomer.lastName})`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Category Selection */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.selectCategory', 'Select Category')}
                    </label>
                    {isLoadingCategories ? (
                      <div className="text-center py-4 text-gray-500">
                        {t('common.loading', 'Loading...')}
                      </div>
                    ) : categories && categories.length > 0 ? (
                      <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                        {categories.map((category) => {
                          const categoryId = category.categoryId || category.id || category.Id;
                          const categoryName = category.categoryName || category.name || category.Name || '';
                          return (
                            <button
                              key={categoryId}
                              type="button"
                              onClick={() => {
                                setWizardSelectedCategory(category);
                                setWizardSelectedMake(null);
                                setWizardSelectedModel(null);
                                setTimeout(() => setWizardStep(3), 300);
                              }}
                              className={`w-full text-left px-4 py-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 ${
                                wizardSelectedCategory?.categoryId === categoryId || 
                                wizardSelectedCategory?.id === categoryId
                                  ? 'bg-blue-50 border-blue-200' 
                                  : ''
                              }`}
                            >
                              <div className="font-medium text-gray-900">{categoryName}</div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        {t('admin.noCategoriesFound', 'No categories found')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Make and Model Selection (Tree Structure) */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.selectMakeAndModel', 'Select Make and Model')}
                    </label>
                    {isLoadingWizardModels ? (
                      <div className="text-center py-4 text-gray-500">
                        {t('common.loading', 'Loading...')}
                      </div>
                    ) : Object.keys(wizardModelsByMake).length > 0 ? (
                      <div className="border border-gray-300 rounded-lg max-h-96 overflow-y-auto">
                        {Object.entries(wizardModelsByMake)
                          .sort(([makeA], [makeB]) => makeA.localeCompare(makeB))
                          .map(([make, models]) => {
                            const isExpanded = wizardExpandedMakes.has(make);
                            return (
                              <div key={make} className="border-b border-gray-200 last:border-b-0">
                                {/* Make Header (Expandable) */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newExpanded = new Set(wizardExpandedMakes);
                                    if (isExpanded) {
                                      newExpanded.delete(make);
                                      setWizardSelectedMake(null);
                                      setWizardSelectedModel(null);
                                    } else {
                                      newExpanded.add(make);
                                    }
                                    setWizardExpandedMakes(newExpanded);
                                  }}
                                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between ${
                                    wizardSelectedMake === make ? 'bg-blue-50' : ''
                                  }`}
                                >
                                  <div className="flex items-center">
                                    <ChevronRight 
                                      className={`h-5 w-5 mr-2 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                                    />
                                    <span className="font-semibold text-gray-900">{make}</span>
                                    <span className="ml-2 text-sm text-gray-500">
                                      ({models.length} {models.length === 1 ? 'model' : 'models'})
                                    </span>
                                  </div>
                                </button>
                                
                                {/* Models under this make */}
                                {isExpanded && models && models.length > 0 && (
                                  <div className="bg-gray-50" onClick={(e) => e.stopPropagation()}>
                                    {models.map((model) => {
                                      const modelId = model.id || model.Id || model.modelId || model.ModelId;
                                      const modelName = model.modelName || model.ModelName || model.model || model.Model || '';
                                      const isSelected = wizardSelectedModel?.id === modelId || 
                                                        wizardSelectedModel?.Id === modelId ||
                                                        wizardSelectedModel?.modelId === modelId ||
                                                        wizardSelectedModel?.ModelId === modelId;
                                      
                                      if (!modelId) {
                                        console.warn('Model missing ID:', model);
                                        return null;
                                      }
                                      
                                      return (
                                        <button
                                          key={modelId}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            console.log('Model clicked:', modelId, modelName, model);
                                            setWizardSelectedMake(make);
                                            setWizardSelectedModel(model);
                                            setTimeout(() => setWizardStep(4), 300);
                                          }}
                                          className={`w-full text-left px-8 py-2 hover:bg-gray-100 border-b border-gray-200 last:border-b-0 cursor-pointer ${
                                            isSelected ? 'bg-blue-100 border-blue-300' : ''
                                          }`}
                                        >
                                          <div className="flex items-center">
                                            <span className="text-gray-700">{modelName}</span>
                                            {model.year && (
                                              <span className="ml-2 text-sm text-gray-500">({model.year})</span>
                                            )}
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
                      <div className="text-center py-4 text-gray-500">
                        {t('admin.noModelsFound', 'No models found for this category')}
                      </div>
                    )}
                  </div>
                  
                  {wizardSelectedModel && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        {t('admin.modelSelected', 'Model selected')}: {wizardSelectedMake} - {wizardSelectedModel.modelName || wizardSelectedModel.ModelName || wizardSelectedModel.model || wizardSelectedModel.Model || ''}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Booking Summary & Pricing */}
              {wizardStep === 4 && (
                <div className="space-y-6">
                  {/* Booking Details Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('admin.pickupDate', 'Pickup Date')}:</span>
                      <span className="text-sm font-medium text-gray-900">{wizardPickupDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('admin.returnDate', 'Return Date')}:</span>
                      <span className="text-sm font-medium text-gray-900">{wizardReturnDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('admin.customer', 'Customer')}:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {wizardCustomer?.email || wizardCustomerEmail}
                      </span>
                    </div>
                    {wizardSelectedModel && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('admin.vehicle', 'Vehicle')}:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {wizardSelectedMake} - {wizardSelectedModel.modelName || wizardSelectedModel.ModelName || wizardSelectedModel.model || wizardSelectedModel.Model}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Daily Rate */}
                  {wizardSelectedModel && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">{t('admin.ratePerDay', 'Rate per Day')}:</span>
                        <span className="text-lg font-bold text-blue-600">
                          {formatPrice(wizardSelectedModel.dailyRate || wizardSelectedModel.DailyRate || wizardSelectedModel.daily_rate || 0)} / {t('admin.day', 'day')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Additional Services */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {t('admin.additionalOptions', 'Additional Options')}
                    </label>
                    {isLoadingWizardServices ? (
                      <div className="text-center py-4 text-gray-500">
                        {t('common.loading', 'Loading...')}
                      </div>
                    ) : wizardAdditionalServices && wizardAdditionalServices.length > 0 ? (
                      <div className="space-y-2">
                        {wizardAdditionalServices.map((service) => {
                          const serviceId = service.additionalServiceId || service.AdditionalServiceId || service.id || service.Id;
                          const serviceName = service.serviceName || service.ServiceName || service.name || service.Name || '';
                          const servicePrice = service.servicePrice || service.ServicePrice || service.price || service.Price || 0;
                          const isMandatory = service.serviceIsMandatory || service.ServiceIsMandatory || false;
                          const isSelected = wizardSelectedServices.some(s => {
                            const sId = s.service?.additionalServiceId || s.service?.AdditionalServiceId || s.service?.id || s.service?.Id || s.id;
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
                                        const sId = s.service?.additionalServiceId || s.service?.AdditionalServiceId || s.service?.id || s.service?.Id || s.id;
                                        return sId !== serviceId;
                                      });
                                    } else {
                                      return [...prev, { id: serviceId, service: service, quantity: 1 }];
                                    }
                                  });
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                        {calculateWizardDays} {calculateWizardDays === 1 ? t('admin.day', 'day') : t('admin.days', 'days')}
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
              <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    if (wizardStep > 1) {
                      setWizardStep(wizardStep - 1);
                    } else {
                      setShowReservationWizard(false);
                    }
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  {wizardStep > 1 ? t('common.back', 'Back') : t('common.exit', 'Exit')}
                </button>
                {wizardStep === 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardSelectedCategory) {
                        setWizardStep(3);
                      }
                    }}
                    disabled={!wizardSelectedCategory}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {t('common.next', 'Next')}
                  </button>
                )}
                {wizardStep === 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardSelectedModel) {
                        setWizardStep(4);
                      }
                    }}
                    disabled={!wizardSelectedModel}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {t('common.next', 'Next')}
                  </button>
                )}
                {wizardStep === 4 && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!wizardCustomer || !wizardCustomer.customerId) {
                        toast.error(t('admin.customerRequired', 'Customer is required'));
                        return;
                      }
                      
                      if (!wizardSelectedModel) {
                        toast.error(t('admin.modelRequired', 'Model is required'));
                        return;
                      }
                      
                      try {
                        // Find an available vehicle for the selected model
                        const modelName = wizardSelectedModel.modelName || wizardSelectedModel.ModelName || wizardSelectedModel.model || wizardSelectedModel.Model || '';
                        const make = wizardSelectedMake || wizardSelectedModel.make || wizardSelectedModel.Make || '';
                        const locationId = wizardSelectedLocation?.locationId || wizardSelectedLocation?.id || null;
                        
                        console.log('🔍 Searching for vehicle:', { make, modelName, locationId, pickupDate: wizardPickupDate, returnDate: wizardReturnDate });
                        
                        // First, try with status filter
                        let vehicleParams = {
                          companyId: currentCompanyId,
                          make: make,
                          model: modelName,
                          status: 'Available',
                          availableFrom: wizardPickupDate,
                          availableTo: wizardReturnDate,
                          pageSize: 50
                        };
                        
                        if (locationId) {
                          vehicleParams.locationId = locationId;
                        }
                        
                        console.log('📋 Vehicle search params:', vehicleParams);
                        
                        let vehiclesResponse = await apiService.getVehicles(vehicleParams);
                        console.log('📦 Raw API response:', vehiclesResponse);
                        
                        // Parse response structure - same as BookPage and AdminDashboard vehicles list
                        // API returns: { Vehicles: [...], TotalCount: ..., Page: ..., PageSize: ..., TotalPages: ... }
                        const payload = vehiclesResponse?.data?.result || vehiclesResponse?.data || vehiclesResponse;
                        let vehicles = [];
                        
                        // Check for Vehicles property (capital V) first - this is what the API returns
                        if (Array.isArray(payload?.Vehicles)) {
                          vehicles = payload.Vehicles;
                        } else if (Array.isArray(payload?.vehicles)) {
                          vehicles = payload.vehicles;
                        } else if (Array.isArray(payload?.items)) {
                          vehicles = payload.items;
                        } else if (Array.isArray(payload?.data)) {
                          vehicles = payload.data;
                        } else if (Array.isArray(payload)) {
                          vehicles = payload;
                        } else if (Array.isArray(vehiclesResponse)) {
                          vehicles = vehiclesResponse;
                        }
                        
                        console.log('🚗 Found vehicles (with status filter):', vehicles.length, vehicles);
                        
                        // If no vehicles found with status filter, try without status filter
                        // (the API filters by availability dates anyway)
                        if (vehicles.length === 0) {
                          console.log('⚠️ No vehicles with Available status, trying without status filter...');
                          vehicleParams = {
                            companyId: currentCompanyId,
                            make: make,
                            model: modelName,
                            availableFrom: wizardPickupDate,
                            availableTo: wizardReturnDate,
                            pageSize: 50
                          };
                          
                          if (locationId) {
                            vehicleParams.locationId = locationId;
                          }
                          
                          vehiclesResponse = await apiService.getVehicles(vehicleParams);
                          console.log('📦 Raw API response (retry):', vehiclesResponse);
                          
                          // Parse response structure - same as BookPage and AdminDashboard vehicles list
                          const payload = vehiclesResponse?.data?.result || vehiclesResponse?.data || vehiclesResponse;
                          vehicles = [];
                          
                          // Check for Vehicles property (capital V) first - this is what the API returns
                          if (Array.isArray(payload?.Vehicles)) {
                            vehicles = payload.Vehicles;
                          } else if (Array.isArray(payload?.vehicles)) {
                            vehicles = payload.vehicles;
                          } else if (Array.isArray(payload?.items)) {
                            vehicles = payload.items;
                          } else if (Array.isArray(payload?.data)) {
                            vehicles = payload.data;
                          } else if (Array.isArray(payload)) {
                            vehicles = payload;
                          } else if (Array.isArray(vehiclesResponse)) {
                            vehicles = vehiclesResponse;
                          }
                          
                          console.log('🚗 Found vehicles (without status filter):', vehicles.length, vehicles);
                        }
                        
                        if (vehicles.length === 0) {
                          console.error('❌ No vehicles found. Response structure:', vehiclesResponse);
                          toast.error(t('admin.noVehiclesAvailableForDates', 'No vehicles available for the selected dates and location'));
                          return;
                        }
                        
                        const selectedVehicle = vehicles[0];
                        const vehicleId = selectedVehicle.vehicleId || selectedVehicle.id || selectedVehicle.Id || selectedVehicle.VehicleId;
                        const dailyRate = wizardSelectedModel.dailyRate || wizardSelectedModel.DailyRate || wizardSelectedModel.daily_rate || 0;
                        
                        // Create booking
                        const bookingData = {
                          customerId: wizardCustomer.customerId || wizardCustomer.id,
                          vehicleId: vehicleId,
                          companyId: currentCompanyId,
                          pickupDate: wizardPickupDate,
                          returnDate: wizardReturnDate,
                          pickupLocation: wizardSelectedLocation?.name || wizardSelectedLocation?.locationName || null,
                          returnLocation: wizardSelectedLocation?.name || wizardSelectedLocation?.locationName || null,
                          dailyRate: dailyRate,
                          taxAmount: 0,
                          insuranceAmount: 0,
                          additionalFees: calculateWizardServicesTotal
                        };
                        
                        const bookingResponse = await apiService.createBooking(bookingData);
                        const booking = bookingResponse?.data || bookingResponse;
                        const bookingId = booking.id || booking.Id || booking.bookingId || booking.BookingId;
                        
                        // Add selected services to the booking
                        if (wizardSelectedServices.length > 0 && bookingId) {
                          for (const selectedService of wizardSelectedServices) {
                            const service = selectedService.service || selectedService;
                            const serviceId = service.additionalServiceId || service.AdditionalServiceId || service.id || service.Id;
                            
                            try {
                              await apiService.addServiceToBooking({
                                bookingId: bookingId,
                                additionalServiceId: serviceId,
                                quantity: selectedService.quantity || 1
                              });
                            } catch (serviceError) {
                              console.error('Error adding service to booking:', serviceError);
                              // Continue with other services even if one fails
                            }
                          }
                        }
                        
                        // Close wizard and reset state
                        setShowReservationWizard(false);
                        setWizardStep(1);
                        setWizardCustomerEmail('');
                        setWizardCustomer(null);
                        setWizardSelectedCategory(null);
                        setWizardSelectedMake(null);
                        setWizardSelectedModel(null);
                        setWizardSelectedServices([]);
                        setWizardModelsByMake({});
                        setWizardExpandedMakes(new Set());
                        setWizardSelectedLocation(null);
                        
                        // Refresh bookings list
                        queryClient.invalidateQueries(['companyBookings', currentCompanyId]);
                        
                        // Redirect to payment page with booking ID
                        // Switch to reservations section and navigate with payment param
                        setActiveSection('reservations');
                        navigate(`/admin?tab=reservations&bookingId=${bookingId}&payment=true`);
                      } catch (error) {
                        console.error('Error creating reservation:', error);
                        toast.error(error.response?.data?.message || t('admin.reservationCreateError', 'Failed to create reservation'));
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {t('admin.createReservation', 'Create Reservation')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default AdminDashboard;
