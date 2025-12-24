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
import { Building2, Save, X, LayoutDashboard, Car, Users, TrendingUp, Calendar, ChevronDown, ChevronRight, Plus, Edit, Trash2, ChevronLeft, ChevronsLeft, ChevronRight as ChevronRightIcon, ChevronsRight, Search, Upload, Pencil, Trash, MapPin, CreditCard, AlertTriangle, RefreshCw } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { PageContainer, PageHeader, Card, EmptyState, LoadingSpinner } from '../components/common';
import { getStatesForCountry } from '../utils/statesByCountry';
import MultiLanguageTipTapEditor from '../components/MultiLanguageTipTapEditor';
import VehicleLocations from './VehicleLocations';
import {
  ReportsSection,
  ViolationsSection,
  VehiclesSection,
  ReservationsSection,
  EmployeesSection,
  AdditionalServicesSection,
  VehicleManagementSection,
  CompanySection,
  MetaSection,
} from './dashboard';
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
  
  // Check if company is in USA - violations are only available for USA companies
  const isUSCompany = useMemo(() => {
    const country = (companyConfig?.country || '').toLowerCase();
    return country === 'united states' || country === 'usa' || country === 'us';
  }, [companyConfig?.country]);
  
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
  const [isCreatingStripeAccount, setIsCreatingStripeAccount] = useState(false);
  
  // Get initial tab from URL parameter, default to 'company' for activeSection
  const initialTab = searchParams.get('tab') || 'company';
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'design', or 'locations'
  const [activeLocationSubTab, setActiveLocationSubTab] = useState('company'); // 'company', 'pickup', or 'management'
  const [activeViolationsTab, setActiveViolationsTab] = useState('list'); // 'list', 'finders', or 'payment'
  const [selectedStates, setSelectedStates] = useState(new Set()); // Selected state codes for violation finders
  const [violationsFindingProgress, setViolationsFindingProgress] = useState(null); // { progress: 0-100, status: 'pending'|'processing'|'completed'|'error' }
  const [activeSection, setActiveSection] = useState(initialTab); // 'company', 'vehicles', 'reservations', 'additionalServices', 'employees', 'reports', etc.
  
  // Redirect away from violations section if company is not in USA
  useEffect(() => {
    const country = (companyConfig?.country || '').toLowerCase();
    const isUSA = country === 'united states' || country === 'usa' || country === 'us';
    if (activeSection === 'violations' && !isUSA) {
      setActiveSection('company');
    }
  }, [activeSection, companyConfig?.country]);

  // Handle Meta OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const metaSuccess = params.get('meta_success');
    const metaError = params.get('meta_error');

    if (metaSuccess === 'true') {
      toast.success(t('meta.connected', 'Connected to Facebook successfully'));
      queryClient.invalidateQueries(['metaStatus', currentCompanyId]);
      setActiveSection('meta');
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (metaError) {
      toast.error(metaError);
      setActiveSection('meta');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [currentCompanyId, queryClient, t]);

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
  const [showFieldMappingModal, setShowFieldMappingModal] = useState(false);
  const [fieldMappingData, setFieldMappingData] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({});
  const [pendingImportFile, setPendingImportFile] = useState(null);
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

  // State for violations
  const [violationsDateFrom, setViolationsDateFrom] = useState(() => {
    const today = new Date();
    today.setMonth(today.getMonth() - 1); // Default to last month
    return today.toISOString().split('T')[0];
  });
  const [violationsDateTo, setViolationsDateTo] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [violationsPage, setViolationsPage] = useState(0);
  const [violationsPageSize, setViolationsPageSize] = useState(10);
  const [violationsSearchTrigger, setViolationsSearchTrigger] = useState(0);

  useEffect(() => {
    setBookingPage(1);
  }, [bookingStatusFilter, bookingCustomerFilter, bookingDateFrom, bookingDateTo]);

  useEffect(() => {
    setViolationsPage(0); // Reset to first page when filters change
  }, [violationsDateFrom, violationsDateTo, violationsSearchTrigger]);

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

  // Fetch Stripe account status - using same pattern as admin app
  const { data: stripeStatusData, isLoading: isLoadingStripeStatus, refetch: refetchStripeStatus } = useQuery(
    ['stripeStatus', currentCompanyId],
    async () => {
      try {
        // Use EXACT same API function as admin app
        // Admin app uses: api.get(`/companies/${companyId}/stripe/status`)
        const response = await apiService.getStripeAccountStatus(currentCompanyId);
        
        // Match admin app's EXACT unwrapping logic: response.data.result || response.data
        // apiService methods return the axios response, so we need to unwrap it
        const responseData = response?.data || response;
        const statusData = responseData?.result || responseData;
        
        return statusData;
      } catch (error) {
        console.error('[AdminDashboard] Error fetching Stripe status:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        
        // If 401, 404, or 503, the company might not have a Stripe account yet, user lacks permission, or service is unavailable
        // Handle these gracefully without losing auth
        if (error.response?.status === 401 || error.response?.status === 404 || error.response?.status === 503) {
          return {
            stripeAccountId: undefined,
            StripeAccountId: undefined,
            chargesEnabled: false,
            ChargesEnabled: false,
            payoutsEnabled: false,
            PayoutsEnabled: false,
            detailsSubmitted: false,
            DetailsSubmitted: false,
            onboardingCompleted: false,
            OnboardingCompleted: false,
            accountStatus: 'not_started',
            AccountStatus: 'not_started',
            requirementsCurrentlyDue: [],
            RequirementsCurrentlyDue: [],
            requirementsPastDue: [],
            RequirementsPastDue: [],
          };
        }
        
        // Return default status for any other error
        return {
          stripeAccountId: undefined,
          StripeAccountId: undefined,
          chargesEnabled: false,
          ChargesEnabled: false,
          payoutsEnabled: false,
          PayoutsEnabled: false,
          detailsSubmitted: false,
          DetailsSubmitted: false,
          onboardingCompleted: false,
          OnboardingCompleted: false,
          accountStatus: 'not_started',
          AccountStatus: 'not_started',
          requirementsCurrentlyDue: [],
          RequirementsCurrentlyDue: [],
          requirementsPastDue: [],
          RequirementsPastDue: [],
        };
      }
    },
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId,
      retry: false,
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('[AdminDashboard] Stripe status query error:', error);
      },
      // Allow all authenticated users to see status, but backend will enforce admin privileges for actions
    }
  );

  // Extract Stripe status - data is already unwrapped from the query function
  const stripeStatus = stripeStatusData || {};

  // Meta Integration queries and mutations
  const { data: metaConnectionStatus, isLoading: isLoadingMetaStatus, error: metaStatusError } = useQuery(
    ['metaStatus', currentCompanyId],
    async () => {
      const response = await apiService.getMetaConnectionStatus(currentCompanyId);
      return response;
    },
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId && activeSection === 'meta',
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const { data: metaAvailablePages } = useQuery(
    ['metaPages', currentCompanyId],
    () => apiService.getMetaAvailablePages(currentCompanyId),
    {
      enabled: isAuthenticated && canAccessDashboard && !!currentCompanyId && metaConnectionStatus?.isConnected,
      retry: false,
    }
  );

  const connectMetaMutation = useMutation(
    () => {
      // Redirect to OAuth - use the proxy server endpoint
      const lang = document.documentElement.lang || 'en';
      window.location.href = `/api/meta/oauth/connect/${currentCompanyId}?lang=${lang}`;
      return Promise.resolve();
    }
  );

  const disconnectMetaMutation = useMutation(
    () => apiService.disconnectMeta(currentCompanyId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['metaStatus', currentCompanyId]);
        toast.success(t('meta.disconnected', 'Disconnected from Facebook'));
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || t('meta.disconnectError', 'Failed to disconnect'));
      },
    }
  );

  const selectMetaPageMutation = useMutation(
    (pageId) => apiService.selectMetaPage(currentCompanyId, pageId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['metaStatus', currentCompanyId]);
        toast.success(t('meta.pageSelected', 'Page selected successfully'));
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || t('meta.pageSelectError', 'Failed to select page'));
      },
    }
  );

  const refreshInstagramMutation = useMutation(
    () => apiService.refreshInstagram(currentCompanyId),
    {
      onSuccess: (result) => {
        if (result.success) {
          queryClient.invalidateQueries(['metaStatus', currentCompanyId]);
          toast.success(t('meta.instagramRefreshed', `Instagram @${result.instagramUsername} connected!`));
        } else {
          toast.error(result.message || t('meta.instagramNotFound', 'Instagram not found'));
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || t('meta.refreshError', 'Failed to refresh Instagram'));
      },
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
        queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
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
        queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
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
        queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
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

  // Handle vehicle import with field mapping
  const handleVehicleImportWithMapping = async (mapping) => {
    if (!pendingImportFile) return;
    
    setIsImportingVehicles(true);
    setShowFieldMappingModal(false);
    
    try {
      const formData = new FormData();
      // IMPORTANT: Append fieldMapping BEFORE the file
      // Some multipart parsers (like multer) may not parse fields that come after files
      // Convert mapping to JSON string and append to form data FIRST
      const mappingJson = JSON.stringify(mapping);
      formData.append('fieldMapping', mappingJson);
      formData.append('companyId', currentCompanyId || '');
      // Append file LAST to ensure fieldMapping is parsed first
      formData.append('file', pendingImportFile);
      
      // Call vehicle import API endpoint with mapping
      const response = await apiService.importVehicles(formData);
      
      // Process response same as regular import
      const responseData = response?.data || response;
      let result = responseData;
      if (responseData && typeof responseData === 'object') {
        if ('result' in responseData && responseData.result !== undefined) {
          result = responseData.result;
        } else if ('original' in responseData && responseData.original?.result) {
          result = responseData.original.result;
        }
      }
      
      const errors = Array.isArray(result?.errors) ? result.errors : [];
      const ignoredCount = Number(result?.ignoredCount ?? errors.length ?? 0);
      
      
      // toast.success(
      //   totalLines > 0
      //     ? `${t('vehicles.importSuccess', 'Import completed')}: ${totalLines} ${t('vehicles.totalProcessed', 'total')} - ${breakdownParts.join(', ')}`
      //     : `${t('vehicles.importSuccess', 'Import completed')}: ${breakdownParts.join(', ')}`,
      //   { autoClose: 8000 }
      // );
      
      // Show error details if any
      if (ignoredCount > 0 && errors.length > 0) {
        const failedCars = [];
        errors.forEach(error => {
          const licensePlateMatch = error.match(/license plate\s+([A-Z0-9]+)/i);
          const lineMatch = error.match(/Line\s+(\d+)/i);
          const licensePlate = licensePlateMatch ? licensePlateMatch[1] : null;
          const lineNumber = lineMatch ? lineMatch[1] : null;
          
          if (licensePlate) {
            failedCars.push({ licensePlate, lineNumber, error });
          } else if (lineNumber) {
            const missingMatch = error.match(/licenseplate:\s*([A-Z0-9]+)/i);
            if (missingMatch) {
              failedCars.push({ licensePlate: missingMatch[1], lineNumber, error });
            } else {
              failedCars.push({ licensePlate: `Line ${lineNumber}`, lineNumber, error });
            }
          } else {
            failedCars.push({ licensePlate: 'Unknown', lineNumber: null, error });
          }
        });
        
        if (failedCars.length > 0) {
          const licensePlates = failedCars
            .map(car => car.licensePlate)
            .filter((plate, index, self) => self.indexOf(plate) === index)
            .slice(0, 10);
          
          let errorSummary = `${ignoredCount} ${t('vehicles.carsNotLoaded', 'car(s) not loaded')}`;
          if (licensePlates.length > 0 && licensePlates.length <= 10) {
            errorSummary += `: ${licensePlates.join(', ')}`;
            if (failedCars.length > 10) {
              errorSummary += ` (+${failedCars.length - 10} more)`;
            }
          }
          
          toast.warning(errorSummary, { autoClose: 10000 });
          console.group('🚫 Failed to Load Vehicles');
          failedCars.forEach((car, index) => {
            console.log(`${index + 1}. ${car.licensePlate}${car.lineNumber ? ` (Line ${car.lineNumber})` : ''}: ${car.error}`);
          });
          console.groupEnd();
        }
      }
      
      queryClient.invalidateQueries(['vehicles', currentCompanyId]);
      queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
      
      setPendingImportFile(null);
      setFieldMapping({});
    } catch (error) {
      console.error('Error importing vehicles with mapping:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error?.message || 
                          error.message || 
                          t('vehicles.importError') || 
                          'Failed to import vehicles';
      toast.error(errorMessage);
    } finally {
      setIsImportingVehicles(false);
    }
  };

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
      // Verify file exists
      if (!file) {
        toast.error(t('vehicles.noFileSelected', 'No file selected'));
        return;
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', currentCompanyId || '');

      // Call vehicle import API endpoint
      const response = await apiService.importVehicles(formData);
      
      // Extract response data - interceptor already unwraps standardized format
      // So response.data should be the actual data object
      const responseData = response?.data || response;
      
      // Handle both wrapped (if not unwrapped) and direct responses
      let result = responseData;
      if (responseData && typeof responseData === 'object') {
        // If still wrapped in standardized format (has 'result' property)
        if ('result' in responseData && responseData.result !== undefined) {
          result = responseData.result;
        }
        // Also check for original property (interceptor might have saved it)
        else if ('original' in responseData && responseData.original?.result) {
          result = responseData.original.result;
        }
      }
      
      // Check if field mapping is required
      if (result?.requiresMapping === true) {
        setIsImportingVehicles(false);
        const headers = result.headers || [];
        const availableFields = result.availableFields || [];
        
        // Auto-map columns by matching names (case-insensitive)
        const autoMapping = {};
        headers.forEach((header, index) => {
          const headerLower = header.toLowerCase().trim();
          
          // Try to find matching field
          availableFields.forEach(field => {
            const fieldNameLower = field.field.toLowerCase();
            const fieldLabelLower = (field.label || '').toLowerCase();
            
            // Check if header matches field name or label
            if (headerLower === fieldNameLower || 
                headerLower === fieldLabelLower ||
                headerLower.replace(/[_\s-]/g, '') === fieldNameLower.replace(/[_\s-]/g, '') ||
                headerLower.replace(/[_\s-]/g, '') === fieldLabelLower.replace(/[_\s-]/g, '')) {
              // Only set if not already mapped (first match wins)
              if (!autoMapping[field.field]) {
                autoMapping[field.field] = index;
              }
            }
          });
          
          // Special cases for common variations
          if (headerLower.includes('license') && headerLower.includes('plate')) {
            if (!autoMapping['license_plate']) autoMapping['license_plate'] = index;
          }
          if (headerLower.includes('seats') || headerLower.includes('seat')) {
            if (!autoMapping['number_of_seats']) autoMapping['number_of_seats'] = index;
          }
          if (headerLower.includes('fuel')) {
            if (!autoMapping['fuel_type']) autoMapping['fuel_type'] = index;
          }
        });
        
        // Verify we have the actual CSV headers
        setFieldMappingData({
          headers: headers,
          availableFields: availableFields
        });
        setFieldMapping(autoMapping); // Set auto-detected mapping
        setPendingImportFile(file);
        setShowFieldMappingModal(true);
        event.target.value = ''; // Reset file input
        return;
      }
      
      // Get import statistics - try multiple possible field names
      const errors = Array.isArray(result?.errors) ? result.errors : [];
      const ignoredCount = Number(result?.ignoredCount ?? errors.length ?? 0);
      
      
      // Build and show a success message if needed (omitted to reduce noise)
      
      // Show error details if any
      if (ignoredCount > 0 && errors.length > 0) {
        console.warn('Import errors:', errors);
        
        // Parse errors to extract license plates and create a summary
        const failedCars = [];
        errors.forEach(error => {
          // Try to extract license plate from error message
          // Error formats: "Line X: Vehicle with license plate ABC123...", "Line X: Missing required fields...", etc.
          const licensePlateMatch = error.match(/license plate\s+([A-Z0-9]+)/i);
          const lineMatch = error.match(/Line\s+(\d+)/i);
          const licensePlate = licensePlateMatch ? licensePlateMatch[1] : null;
          const lineNumber = lineMatch ? lineMatch[1] : null;
          
          if (licensePlate) {
            failedCars.push({ licensePlate, lineNumber, error });
          } else if (lineNumber) {
            // Try to extract from "Missing required fields" errors
            const missingMatch = error.match(/licenseplate:\s*([A-Z0-9]+)/i);
            if (missingMatch) {
              failedCars.push({ licensePlate: missingMatch[1], lineNumber, error });
            } else {
              failedCars.push({ licensePlate: `Line ${lineNumber}`, lineNumber, error });
            }
          } else {
            failedCars.push({ licensePlate: 'Unknown', lineNumber: null, error });
          }
        });
        
        // Show summary with failed cars
        if (failedCars.length > 0) {
          const licensePlates = failedCars
            .map(car => car.licensePlate)
            .filter((plate, index, self) => self.indexOf(plate) === index) // unique
            .slice(0, 10); // First 10 unique plates
          
          let errorSummary = `${ignoredCount} ${t('vehicles.carsNotLoaded', 'car(s) not loaded')}`;
          if (licensePlates.length > 0 && licensePlates.length <= 10) {
            errorSummary += `: ${licensePlates.join(', ')}`;
            if (failedCars.length > 10) {
              errorSummary += ` (+${failedCars.length - 10} more)`;
            }
          }
          
          toast.warning(errorSummary, {
            autoClose: 10000,
          });
          
          // Show detailed errors in console with better formatting
          console.group('🚫 Failed to Load Vehicles');
          failedCars.forEach((car, index) => {
            console.log(`${index + 1}. ${car.licensePlate}${car.lineNumber ? ` (Line ${car.lineNumber})` : ''}: ${car.error}`);
          });
          console.groupEnd();
          
          // If there are only a few errors, show them individually
          if (failedCars.length <= 3) {
            failedCars.forEach((car, index) => {
              setTimeout(() => {
                const shortError = car.error.length > 80 ? car.error.substring(0, 80) + '...' : car.error;
                toast.warning(`${car.licensePlate}: ${shortError}`, { autoClose: 5000 });
              }, (index + 1) * 400);
            });
          } else {
            // Show message to check console for all details
            setTimeout(() => {
              toast.info(`${failedCars.length} ${t('vehicles.errorsDetails', 'error details')} in console (F12)`, {
                autoClose: 5000,
              });
            }, 1000);
          }
        } else {
          // Fallback if we couldn't parse license plates
          toast.warning(`${ignoredCount} ${t('vehicles.lineIgnored', 'line(s) ignored')} due to errors. Check console for details.`, {
            autoClose: 5000,
          });
        }
      }
      
      queryClient.invalidateQueries(['vehicles', currentCompanyId]);
      queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
      
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

  // Fetch violations
  const { data: violationsResponse, isLoading: isLoadingViolations, error: violationsError } = useQuery(
    [
      'violations',
      currentCompanyId,
      violationsDateFrom,
      violationsDateTo,
      violationsPage,
      violationsPageSize,
      violationsSearchTrigger,
      activeSection,
    ],
    () =>
      apiService.getViolations({
        companyId: currentCompanyId,
        dateFrom: violationsDateFrom || undefined,
        dateTo: violationsDateTo || undefined,
        page: violationsPage + 1, // Backend uses 1-based pagination
        pageSize: violationsPageSize,
      }),
    {
      enabled: isAuthenticated && !!currentCompanyId && activeSection === 'violations' && activeViolationsTab === 'list' && isUSCompany,
      keepPreviousData: true,
      onError: (error) => {
        console.error('Error loading violations:', error);
        toast.error(t('admin.violationsLoadError', 'Failed to load violations'));
      },
    }
  );

  // Load finders list configuration - load it when on violations section (any tab) so we can use it for Find Violations button
  const { data: findersListData, isLoading: isLoadingFindersList } = useQuery(
    ['findersList', currentCompanyId, activeSection],
    () =>
      apiService.getFindersList({
        companyId: currentCompanyId,
      }),
    {
      enabled: isAuthenticated && !!currentCompanyId && activeSection === 'violations' && isUSCompany,
      onError: (error) => {
        console.error('Error loading finders list:', error);
        // Don't show error toast - empty list is acceptable
      },
    }
  );

  // Update selectedStates whenever findersListData changes
  useEffect(() => {
    if (findersListData) {
      // Try multiple possible property names
      const findersList = findersListData?.findersList || 
                         findersListData?.FindersList || 
                         findersListData?.data?.findersList ||
                         findersListData?.data?.FindersList ||
                         [];
      
      console.log('[Finders List] Loaded data:', {
        findersListData,
        findersList,
        isArray: Array.isArray(findersList),
        length: Array.isArray(findersList) ? findersList.length : 0,
        rawData: JSON.stringify(findersListData)
      });
      
      if (Array.isArray(findersList) && findersList.length > 0) {
        console.log('[Finders List] Setting selected states:', findersList);
        const statesSet = new Set(findersList);
        console.log('[Finders List] States set created:', Array.from(statesSet));
        setSelectedStates(statesSet);
      } else if (Array.isArray(findersList) && findersList.length === 0) {
        // Explicitly clear if empty array is returned
        console.log('[Finders List] Clearing selected states (empty array)');
        setSelectedStates(new Set());
      } else {
        console.warn('[Finders List] Invalid data format:', findersList);
      }
    } else {
      console.log('[Finders List] No data available yet');
    }
  }, [findersListData]);


  // Mutation for finding violations from external API - runs in background
  const findViolationsMutation = useMutation(
    async ({ companyId, states, dateFrom, dateTo }) => {
      // This starts the violation collection process in background
      try {
        const response = await apiService.findViolations(companyId, states, dateFrom, dateTo);
        // Success response: { requestId, companyId, findersCount, message }
        return { success: true, response, isAlreadyRunning: false };
      } catch (error) {
        // Check if it's the "already in progress" error - this is actually info, not an error
        const errorData = error.response?.data || error.data || {};
        const errorMessage = (errorData?.error || errorData?.message || '').toLowerCase();
        const statusCode = error.response?.status;
        const isAlreadyRunning = statusCode === 409 ||
                                errorMessage.includes('already in progress') ||
                                errorMessage.includes('collection is already') ||
                                errorMessage.includes('already running');
        
        if (isAlreadyRunning) {
          // Process already running - extract info and treat as success (not error)
          // Error response format: { error, companyId, requestId, progress, status, startedAt }
          console.log('Violations finding already in progress - treating as info:', { progress: errorData.progress, status: errorData.status });
          return { 
            success: true, 
            response: { 
              data: { 
                progress: errorData.progress || 0,
                status: errorData.status || 'processing',
                startedAt: errorData.startedAt
              } 
            }, 
            isAlreadyRunning: true 
          };
        }
        
        // Real error - not "already running"
        return { success: false, error: error.message || 'Unknown error', isAlreadyRunning: false };
      }
    },
    {
      onSuccess: (result) => {
        if (!result.success) {
          // Real error occurred
          console.error('Violations finding request failed:', result.error);
          toast.error(t('admin.findViolationsError', 'Failed to start violations finding. Please try again.'));
          return;
        }
        
        // Start background processing (job is running in background)
        // Extract progress info if available
        const progress = result.response?.data?.progress || 0;
        const status = result.response?.data?.status || '';
        
        // Determine the UI status: if we have status text or progress > 0, it's processing
        // If result.isAlreadyRunning, it's definitely processing (collection is active)
        const isProcessing = result.isAlreadyRunning || progress > 0 || (status && status.toLowerCase() !== 'completed' && status.toLowerCase() !== 'error');
        
        setViolationsFindingProgress({ 
          progress: Math.min(100, Math.max(0, progress)), 
          status: isProcessing ? 'processing' : 'pending' 
        });
        
        if (result.isAlreadyRunning) {
          // Process already in progress - show info message
          toast.info(t('admin.violationsFindingAlreadyRunning', 'Violations finding is already in progress. Progress will be shown below.'));
        } else {
          // New process started
          toast.info(t('admin.violationsFindingStarted', 'Violations finding started in background. Progress will be shown below.'));
        }
      },
      onError: (error) => {
        // This should not happen now since we catch errors in the mutation function
        // But keep as fallback
        console.error('Unexpected error in violations finding mutation:', error);
      },
    }
  );

  // Check if collection has started when violations section opens
  useEffect(() => {
    if (activeSection === 'violations' && currentCompanyId && isUSCompany && !violationsFindingProgress) {
      // Check if there's an active collection when violations page opens
      const checkActiveCollection = async () => {
        try {
          const response = await apiService.getViolationsProgress(currentCompanyId);
          const progressData = response?.data || response;
          
          // Check if there's an active collection (has progress/status but not completed)
          const progress = progressData?.progress ?? progressData?.Progress ?? progressData?.ProgressPercentage ?? 0;
          const status = progressData?.status ?? progressData?.Status ?? progressData?.state ?? '';
          
          const isComplete = status?.toLowerCase() === 'completed' || status?.toLowerCase() === 'complete' || progress >= 100;
          const isError = status?.toLowerCase() === 'error' || status?.toLowerCase() === 'failed' || status?.toLowerCase() === 'failure';
          
          // If there's progress data and it's not completed/error, collection is active
          if ((progress > 0 || status) && !isComplete && !isError) {
            console.log('Active violations collection found on page open:', { progress, status });
            setViolationsFindingProgress({
              progress: Math.min(100, Math.max(0, progress)),
              status: 'processing',
            });
          } else if (status && !isComplete && !isError) {
            // Has status but no progress yet - collection might be starting
            console.log('Violations collection status found on page open (pending):', { status });
            setViolationsFindingProgress({
              progress: 0,
              status: 'processing', // Set to processing if we have status (collection is active)
            });
          }
        } catch (error) {
          // Check if it's a timeout or network error - these are common when collection is running
          // Different browsers may report timeouts differently
          const errorMessage = (error.message || '').toLowerCase();
          const isTimeout = error.code === 'ECONNABORTED' ||
                           error.code === 'ETIMEDOUT' ||
                           error.response?.status === 408 ||
                           error.response?.status === 504 ||
                           errorMessage.includes('timeout') ||
                           errorMessage.includes('network error') ||
                           errorMessage.includes('networkerror');
          
          // Also check for 409 (conflict) which might indicate collection is running
          const isConflict = error.response?.status === 409;
          
          if (isTimeout || isConflict) {
            // Timeout or conflict on initial check - assume collection might be running
            // Set pending state so polling will check and UI shows progress bar + disabled button
            console.log('Timeout/conflict checking for active collection on page open - assuming active and will poll to confirm:', { 
              isTimeout, 
              isConflict, 
              status: error.response?.status,
              message: error.message 
            });
            setViolationsFindingProgress({
              progress: 0,
              status: 'pending', // Start with pending, polling will update to processing if confirmed
            });
          } else {
            // Other error (not timeout) - might be 404 (no collection) or other error
            // Only log, don't set progress state (no active collection)
            console.log('No active violations collection found (or error):', { 
              status: error.response?.status, 
              message: error.message 
            });
          }
        }
      };
      
      checkActiveCollection();
    }
  }, [activeSection, currentCompanyId, isUSCompany, violationsFindingProgress]);

  // Poll for progress when violations section is active - runs in background
  useEffect(() => {
    // Start polling if we're in violations section and have companyId
    // We check progress by companyId
    if (activeSection !== 'violations' || !currentCompanyId || !isUSCompany) return;

    let intervalId;
    let isMounted = true;
    let consecutiveErrors = 0;
    let consecutiveNoData = 0; // Track consecutive responses with no data (resets when we get data)
    const MAX_CONSECUTIVE_ERRORS = 5; // Stop polling after 5 consecutive errors (not timeouts)
    const MAX_CONSECUTIVE_NO_DATA = 3; // Stop polling after 3 consecutive responses with no data (if not pending status)

    const pollProgress = async () => {
      if (!isMounted) return;

      try {
        const response = await apiService.getViolationsProgress(currentCompanyId);
        consecutiveErrors = 0; // Reset error counter on success
        
        const progressData = response?.data;
        const progress = progressData?.progress ?? progressData?.Progress ?? progressData?.ProgressPercentage ?? 0;
        const status = progressData?.status ?? progressData?.Status ?? progressData?.state ?? 'processing';
        const isComplete = status?.toLowerCase() === 'completed' || status?.toLowerCase() === 'complete' || progress >= 100;
        const isError = status?.toLowerCase() === 'error' || status?.toLowerCase() === 'failed' || status?.toLowerCase() === 'failure';

        if (isMounted) {
          // Update progress if we have data
          const hasProgressData = progress > 0 || status;
          
          if (hasProgressData) {
            // We have progress data - update it and reset no-data counter
            consecutiveNoData = 0;
            setViolationsFindingProgress({
              progress: Math.min(100, Math.max(0, progress)),
              status: isComplete ? 'completed' : isError ? 'error' : 'processing',
            });
          } else {
            // No progress data in response
            consecutiveNoData++;
            
            // Check if we should stop polling based on consecutive no-data responses
            if (consecutiveNoData >= MAX_CONSECUTIVE_NO_DATA) {
              // No data after multiple checks - stop polling and clear progress
              console.log('No active violations collection found after multiple checks');
              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
              setViolationsFindingProgress(null);
              return;
            }
            
            // Continue polling - if status is pending, it will be handled by checking progress
            // No need to update state here, just continue polling
          }
        }

        if (isComplete) {
          // Progress complete
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          if (isMounted) {
            // toast.success(t('admin.violationsFound', 'Violations found successfully'));
            setViolationsSearchTrigger(prev => prev + 1);
            // Clear progress
            setTimeout(() => {
              if (isMounted) {
                setViolationsFindingProgress(null);
              }
            }, 3000);
          }
        } else if (isError) {
          // Error occurred
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          if (isMounted) {
            toast.error(t('admin.findViolationsError', 'Failed to find violations. Please try again.'));
            setTimeout(() => {
              if (isMounted) {
                setViolationsFindingProgress(null);
              }
            }, 3000);
          }
        }
      } catch (error) {
        // Check if it's a timeout or network error - don't count these as errors, just continue polling
        // Different browsers may report these differently
        const errorMessage = (error.message || '').toLowerCase();
        const isTimeout = error.code === 'ECONNABORTED' || 
                         error.code === 'ETIMEDOUT' ||
                         errorMessage.includes('timeout') ||
                         errorMessage.includes('network error') ||
                         errorMessage.includes('networkerror') ||
                         error.response?.status === 408 ||
                         error.response?.status === 504;
        
        if (isTimeout) {
          // Timeout - just log and continue polling (don't count as error)
          // Timeouts are expected when collection is running (API might be slow)
          // Use functional update to check current state without needing it in dependencies
          if (isMounted) {
            setViolationsFindingProgress(prev => {
              const currentStatus = prev?.status;
              // If we already have pending/processing status, keep it
              if (currentStatus === 'pending' || currentStatus === 'processing') {
                return prev; // Return unchanged - collection is likely still running
              }
              // No progress state yet but we got timeout - might be starting, set pending
              return prev || { progress: 0, status: 'pending' };
            });
          }
          consecutiveErrors = 0; // Reset error counter on timeout - don't treat as error
          consecutiveNoData = 0; // Don't count timeouts as no-data
          return; // Continue polling
        }
        
        consecutiveErrors++;
        console.warn(`Error checking violations progress (attempt ${consecutiveErrors}):`, error);
        
        // Stop polling after too many consecutive errors (but not timeouts)
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.warn('Too many consecutive errors (not timeouts), stopping progress polling');
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          if (isMounted) {
            // Don't show error toast - background job might still be running
            console.log('Progress polling stopped, but background job may still be running');
            // Keep progress bar visible but mark as uncertain
            setViolationsFindingProgress(prev => prev ? { ...prev, status: 'uncertain' } : null);
          }
        }
      }
    };

    // Poll every 3 seconds (longer interval to reduce timeout issues)
    intervalId = setInterval(pollProgress, 3000);
    // Initial poll after a short delay to allow backend to initialize
    setTimeout(pollProgress, 1000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
    // violationsFindingProgress is intentionally excluded from dependencies
    // Including it would cause the effect to restart on every progress update, resetting the polling interval
    // We use functional updates (setState with callback) to access current state values instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, currentCompanyId, isUSCompany, t]);

  // Mutation for saving finders list
  const saveFindersListMutation = useMutation(
    async (stateCodes) => {
      return await apiService.saveFindersList({
        companyId: currentCompanyId,
        findersList: stateCodes,
      });
    },
    {
      onSuccess: () => {
        // Silently update the cache
        queryClient.setQueryData(['findersList', currentCompanyId, activeSection], (oldData) => ({
          ...oldData,
          findersList: Array.from(selectedStates),
        }));
      },
      onError: (error) => {
        console.error('Error saving finders list:', error);
        toast.error(t('admin.findersListSaveError', 'Failed to save finders list'));
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

  const handleViewContract = async (booking) => {
    try {
      const bookingId = booking.id || booking.Id || booking.bookingId || booking.BookingId;
      if (!bookingId) {
        toast.error(t('admin.bookingIdMissing', 'Booking ID is missing.'));
        return;
      }
      const response = await apiService.getRentalAgreement(bookingId);
      const data = response?.data || response;
      const pdfUrl = data?.pdfUrl || data?.PdfUrl;
      if (pdfUrl) {
        // Open via Node proxy so it works in dev and production
        const url = `${window.location.origin}/api${pdfUrl}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        toast.info(t('admin.agreementPdfNotReady', 'Agreement PDF not generated yet. Please try again shortly.'));
      }
    } catch (error) {
      console.error('[AdminDashboard] View contract error:', error);
      toast.error(error.response?.data?.message || t('admin.agreementFetchFailed', 'Failed to fetch rental agreement.'));
    }
  };

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
        `${t('admin.syncPaymentsSuccess', 
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
    
    // Get the original subdomain from companyConfig (if company already has one)
    const originalSubdomain = companyConfig?.subdomain || actualCompanyData?.subdomain;
    
    // If company already has a subdomain, completely prohibit updating it
    // Don't include subdomain in the update request at all
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
      // Only include subdomain if company doesn't have one yet (for new companies)
      // If company already has a subdomain, exclude it from the update request
      ...(originalSubdomain ? {} : { subdomain: companyFormData.subdomain?.trim() || null }),
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

  const handleCreateStripeAccount = async () => {
    if (!currentCompanyId) {
      toast.error(t('admin.noCompanySelected', 'Please select a company first.'));
      return;
    }
    
    // Check if Stripe account already exists
    const hasStripeAccount = stripeStatus?.StripeAccountId || stripeStatus?.stripeAccountId;
    
    setIsCreatingStripeAccount(true);
    try {
      if (hasStripeAccount) {
        // Account exists - get onboarding link (reauth) - same as admin app
        const response = await apiService.getStripeOnboardingLink(currentCompanyId);
        // apiService returns axios response, so unwrap like admin app does
        const data = response?.data || response;
        
        // The API wraps responses in { result: data, reason: 0 }
        // Try multiple ways to extract the URL (same as admin app)
        let url = null;
        
        // Check if data is already the URL string
        if (typeof data === 'string' && data.startsWith('http')) {
          url = data;
        }
        // Check if wrapped in result
        else if (data?.result) {
          const result = data.result;
          url = result?.url || result?.onboardingUrl || (typeof result === 'string' ? result : null);
        }
        // Check if direct properties
        else if (data) {
          url = data.url || data.onboardingUrl || (typeof data === 'string' ? data : null);
        }
        
        if (url) {
          // Redirect to Stripe onboarding in the same window
          window.location.href = url;
          // Invalidate queries to refresh status
          await queryClient.invalidateQueries(['stripeStatus', currentCompanyId]);
          await queryClient.invalidateQueries(['company', currentCompanyId]);
        } else {
          console.warn('[AdminDashboard] No URL found in response. Full data:', JSON.stringify(data, null, 2));
          toast.error(t('admin.stripeOnboardingLinkFailed', 'Failed to get Stripe onboarding link.'));
        }
      } else {
        // No account - create new account
        // Use same API function as admin app: api.post(`/companies/${companyId}/stripe/setup`)
        const response = await apiService.setupStripeAccount(currentCompanyId);
        // apiService returns axios response, so unwrap like admin app does
        const data = response?.data || response;
        
        if (data?.onboardingUrl) {
          // toast.success(t('admin.stripeAccountCreated', 'Stripe account created successfully!'));
          // Redirect to Stripe onboarding in the same window
          window.location.href = data.onboardingUrl;
        } else {
          // toast.success(t('admin.stripeAccountCreated', 'Stripe account created successfully!'));
        }
        
        // Invalidate queries to refresh company data and Stripe status
        await queryClient.invalidateQueries(['company', currentCompanyId]);
        await queryClient.invalidateQueries(['stripeStatus', currentCompanyId]);
        // Refetch Stripe status immediately
        setTimeout(() => {
          refetchStripeStatus();
        }, 1000);
      }
    } catch (error) {
      console.error('Error with Stripe account:', error);
      const errorData = error.response?.data;
      let errorMessage = hasStripeAccount 
        ? t('admin.stripeOnboardingLinkFailed', 'Failed to get Stripe onboarding link.')
        : t('admin.stripeAccountCreationFailed', 'Failed to create Stripe account.');
      
      if (errorData) {
        // Combine error and message fields for better user feedback (same as admin app)
        const parts = [];
        if (errorData.error) parts.push(errorData.error);
        if (errorData.message && errorData.message !== errorData.error) {
          parts.push(errorData.message);
        }
        errorMessage = parts.length > 0 ? parts.join(': ') : errorData.message || errorData.error || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsCreatingStripeAccount(false);
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
  const companyCountry = actualCompanyData?.country || actualCompanyData?.Country || companyConfig?.country || '';
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
          {/* Edit and Delete buttons - Admin and MainAdmin */}
          {(isAdmin || isMainAdmin) && (
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
          {!(isAdmin || isMainAdmin) && (
            <span className="text-xs text-gray-500 italic">{t('common.viewOnly', 'View Only')}</span>
          )}
        </div>
      ),
    },
  ], [t, handleEditVehicle, handleDeleteVehicle, deleteVehicleMutation.isLoading, isAdmin, isMainAdmin]);

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

  // Violations data extraction
  const violationsData = useMemo(() => {
    let data = violationsResponse;
    if (data?.data) {
      data = data.data;
    }
    if (data?.result) {
      data = data.result;
    }
    // Handle PaginatedResult format (Items with capital I) or standard format (items/data)
    if (data?.Items || data?.items || data?.data) {
      return Array.isArray(data.Items || data.items || data.data) ? (data.Items || data.items || data.data) : [];
    }
    return Array.isArray(data) ? data : [];
  }, [violationsResponse]);

  const violationsTotalCount = useMemo(() => {
    let data = violationsResponse;
    if (data?.data) {
      data = data.data;
    }
    if (data?.result) {
      data = data.result;
    }
    // Handle PaginatedResult format (TotalCount with capital T) or standard format
    return data?.TotalCount || data?.totalCount || data?.total || data?.Total || 0;
  }, [violationsResponse]);

  // Violations table columns
  const violationsColumns = useMemo(() => [
    {
      id: 'violationNumber',
      header: t('admin.violationNumber', 'Violation #'),
      accessorFn: row => {
        // Use computed ViolationNumber from DTO, or fallback to citation/notice number
        return row.violationNumber || row.ViolationNumber || 
               row.citationNumber || row.CitationNumber || 
               row.noticeNumber || row.NoticeNumber || 
               (row.id ? row.id.substring(0, 8) : '-');
      },
      cell: ({ row }) => {
        const violationNumber = row.original.violationNumber || row.original.ViolationNumber || 
                                row.original.citationNumber || row.original.CitationNumber || 
                                row.original.noticeNumber || row.original.NoticeNumber || 
                                (row.original.id ? row.original.id.substring(0, 8) : '-');
        const link = row.original.link || row.original.Link;
        
        const handleClick = async (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Copy to clipboard
          try {
            await navigator.clipboard.writeText(violationNumber);
            // toast.success(t('admin.violationNumberCopied', 'Violation number copied to clipboard'));
          } catch (err) {
            console.error('Failed to copy:', err);
            toast.error(t('admin.copyFailed', 'Failed to copy to clipboard'));
          }
          
          // Navigate to link if available
          if (link) {
            // Replace {DatasetId} placeholder with violation number if present
            let finalLink = link;
            if (link.includes('{DatasetId}') && violationNumber && violationNumber !== '-') {
              finalLink = link.replace(/{DatasetId}/g, violationNumber);
            }
            window.open(finalLink, '_blank', 'noopener,noreferrer');
          }
        };
        
        if (violationNumber && violationNumber !== '-') {
          return (
            <button
              type="button"
              onClick={handleClick}
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1"
              title={link ? t('admin.clickToCopyAndOpen', 'Click to copy violation number and open link') : t('admin.clickToCopy', 'Click to copy violation number')}
            >
              {violationNumber}
            </button>
          );
        }
        
        return <span className="text-gray-400">-</span>;
      },
    },
    {
      id: 'date',
      header: t('admin.date', 'Date'),
      accessorFn: row => {
        // Use computed ViolationDate from DTO, or fallback to issue_date/start_date
        const date = row.violationDate || row.ViolationDate || 
                     row.issueDate || row.IssueDate || 
                     row.startDate || row.StartDate ||
                     row.createdAt || row.CreatedAt;
        if (!date) return '-';
        try {
          return new Date(date).toLocaleDateString();
        } catch {
          return date;
        }
      },
      cell: info => info.getValue(),
    },
    {
      id: 'licensePlate',
      header: t('admin.licensePlate', 'License Plate'),
      accessorFn: row => {
        // Combine tag (license plate) and state
        const tag = row.tag || row.Tag || '';
        const state = row.state || row.State || '';
        if (tag && state) {
          return `${tag} ${state}`;
        } else if (tag) {
          return tag;
        } else if (state) {
          return state;
        }
        return '-';
      },
      cell: info => {
        const value = info.getValue();
        return value && value !== '-' ? (
          <span className="font-mono text-sm">{value}</span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      id: 'description',
      header: t('admin.description', 'Description'),
      accessorFn: row => {
        // Use computed Description from DTO, or fallback to note/address
        return row.description || row.Description || 
               row.note || row.Note || 
               row.address || row.Address || '-';
      },
      cell: info => {
        const value = info.getValue();
        return value && value !== '-' && value.length > 50 ? `${value.substring(0, 50)}...` : value;
      },
    },
    {
      id: 'amount',
      header: t('admin.amount', 'Amount'),
      accessorFn: row => row.amount || row.Amount || 0,
      cell: ({ row }) => {
        const amount = row.original.amount || row.original.Amount || 0;
        return formatPrice(amount);
      },
    },
    {
      id: 'status',
      header: t('admin.status', 'Status'),
      accessorFn: row => {
        // Use computed Status from DTO, or convert payment_status to string
        if (row.status || row.Status) {
          return (row.status || row.Status).toLowerCase();
        }
        // Convert payment_status integer to string
        const paymentStatus = row.paymentStatus ?? row.PaymentStatus ?? 0;
        const statusMap = { 0: 'pending', 1: 'paid', 2: 'overdue', 3: 'cancelled' };
        return statusMap[paymentStatus] || 'pending';
      },
      cell: ({ row }) => {
        const status = (row.original.status || row.original.Status || 'pending').toLowerCase();
        const statusColors = {
          paid: 'bg-green-100 text-green-800',
          pending: 'bg-yellow-100 text-yellow-800',
          overdue: 'bg-red-100 text-red-800',
          cancelled: 'bg-gray-100 text-gray-800',
        };
        const colorClass = statusColors[status] || statusColors.pending;
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
    },
  ], [t, formatPrice]);

  // Violations table configuration
  const violationsTable = useReactTable({
    data: violationsData,
    columns: violationsColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true, // Server-side pagination
    pageCount: Math.ceil(violationsTotalCount / violationsPageSize),
    state: {
      pagination: {
        pageIndex: violationsPage,
        pageSize: violationsPageSize,
      },
    },
    onPaginationChange: (updater) => {
      const newState = typeof updater === 'function' 
        ? updater({ pageIndex: violationsPage, pageSize: violationsPageSize })
        : updater;
      setViolationsPage(newState.pageIndex);
      setViolationsPageSize(newState.pageSize);
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
    <>
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
              
              {/* Violations - Only visible for USA companies */}
              {isUSCompany && (
                <button
                  onClick={() => setActiveSection('violations')}
                  className={`w-full px-4 py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${
                    activeSection === 'violations'
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  disabled={isEditing}
                  title={t('admin.violations', 'Violations')}
                  aria-label={t('admin.violations', 'Violations')}
                >
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                  <span className="text-xs text-center">{t('admin.violations', 'Violations')}</span>
                </button>
              )}
              
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
              
              {/* Vehicle Management - Admin and MainAdmin */}
              {(isAdmin || isMainAdmin) && (
                <button
                  onClick={() => setActiveSection('vehicleManagement')}
                  className={`w-full px-4 py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${
                    activeSection === 'vehicleManagement'
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  disabled={isEditing}
                  title={t('vehicles.vehicleManagement', 'Vehicle Management')}
                  aria-label={t('vehicles.vehicleManagement', 'Vehicle Management')}
                >
                  <Car className="h-5 w-5" aria-hidden="true" />
                  <span className="text-xs text-center">{t('vehicles.vehicleManagement', 'Vehicles')}</span>
                </button>
              )}
              
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
              
              {/* Meta Integration - Admin and MainAdmin only */}
              {(isAdmin || isMainAdmin) && (
                <button
                  onClick={() => setActiveSection('meta')}
                  className={`w-full px-4 py-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 ${
                    activeSection === 'meta'
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  disabled={isEditing}
                  title={t('admin.metaIntegration', 'Meta')}
                  aria-label={t('admin.metaIntegration', 'Meta')}
                >
                  <svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z"/>
                  </svg>
                  <span className="text-xs text-center">{t('admin.metaIntegration', 'Meta')}</span>
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Right Side - Content (4/5 width) */}
        <div className="col-span-4">
          {/* Company Profile Section */}
          {activeSection === 'company' && (
            <CompanySection
              t={t}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              activeLocationSubTab={activeLocationSubTab}
              setActiveLocationSubTab={setActiveLocationSubTab}
              currentCompanyId={currentCompanyId}
              isLoadingCompany={isLoadingCompany}
              companyError={companyError}
              companyData={companyData}
              actualCompanyData={actualCompanyData}
              companyConfig={companyConfig}
              isEditingCompany={isEditingCompany}
              isCreatingCompany={isCreatingCompany}
              companyFormData={companyFormData}
              setCompanyFormData={setCompanyFormData}
              handleCompanyInputChange={handleCompanyInputChange}
              handleSaveCompany={handleSaveCompany}
              handleCancelEdit={handleCancelEdit}
              isAdmin={isAdmin}
              isMainAdmin={isMainAdmin}
              isEditingLocation={isEditingLocation}
              editingLocationId={editingLocationId}
              locationFormData={locationFormData}
              handleLocationInputChange={handleLocationInputChange}
              handleSaveLocation={handleSaveLocation}
              handleCancelLocationEdit={handleCancelLocationEdit}
              handleAddLocation={handleAddLocation}
              handleEditLocation={handleEditLocation}
              handleDeleteLocation={handleDeleteLocation}
              isLoadingLocations={isLoadingLocations}
              locations={locations}
              pickupLocations={pickupLocations}
              locationTable={locationTable}
              locationPage={locationPage}
              locationPageSize={locationPageSize}
              handleLogoUpload={handleLogoUpload}
              handleLogoDelete={handleLogoDelete}
              handleBannerUpload={handleBannerUpload}
              handleBannerDelete={handleBannerDelete}
              handleVideoUpload={handleVideoUpload}
              handleVideoDelete={handleVideoDelete}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              securityDepositDraft={securityDepositDraft}
              setSecurityDepositDraft={setSecurityDepositDraft}
              isSecurityDepositMandatoryDraft={isSecurityDepositMandatoryDraft}
              setIsSecurityDepositMandatoryDraft={setIsSecurityDepositMandatoryDraft}
              isEditingDeposit={isEditingDeposit}
              beginSecurityDepositEdit={beginSecurityDepositEdit}
              cancelSecurityDepositEdit={cancelSecurityDepositEdit}
              handleSecurityDepositSave={handleSecurityDepositSave}
              isSavingDeposit={isSavingDeposit}
              termsOfUseDraft={termsOfUseDraft}
              setTermsOfUseDraft={setTermsOfUseDraft}
              handleTermsOfUseSave={handleTermsOfUseSave}
              isSavingTermsOfUse={isSavingTermsOfUse}
              isLoadingStripeStatus={isLoadingStripeStatus}
              stripeStatus={stripeStatus}
              isCreatingStripeAccount={isCreatingStripeAccount}
              handleCreateStripeAccount={handleCreateStripeAccount}
              updateCompanyMutation={updateCompanyMutation}
              tabCaptions={tabCaptions}
              isAuthenticated={isAuthenticated}
              canAccessDashboard={canAccessDashboard}
              countriesByContinent={countriesByContinent}
            />
          )}

          {/* Violations Section - Only show for USA companies */}
          {/* Violations Section - Only show for USA companies */}
          {activeSection === 'violations' && isUSCompany && (
            <ViolationsSection
              t={t}
              activeViolationsTab={activeViolationsTab}
              setActiveViolationsTab={setActiveViolationsTab}
              violationsDateFrom={violationsDateFrom}
              setViolationsDateFrom={setViolationsDateFrom}
              violationsDateTo={violationsDateTo}
              setViolationsDateTo={setViolationsDateTo}
              setViolationsSearchTrigger={setViolationsSearchTrigger}
              isLoadingViolations={isLoadingViolations}
              violationsError={violationsError}
              violationsData={violationsData}
              violationsTable={violationsTable}
              violationsPageSize={violationsPageSize}
              violationsTotalCount={violationsTotalCount}
              findViolationsMutation={findViolationsMutation}
              violationsFindingProgress={violationsFindingProgress}
              setViolationsFindingProgress={setViolationsFindingProgress}
              currentCompanyId={currentCompanyId}
              findersListData={findersListData}
              selectedStates={selectedStates}
              apiService={apiService}
              companyConfig={companyConfig}
              isLoadingFindersList={isLoadingFindersList}
              setSelectedStates={setSelectedStates}
              saveFindersListMutation={saveFindersListMutation}
            />
          )}

          {/* Vehicles Section */}
          {/* Vehicles Section */}
          {activeSection === 'vehicles' && (
            <VehiclesSection
              t={t}
              vehicleCount={vehicleCount}
              availableCount={availableCount}
              isLoadingModels={isLoadingModels}
              modelsGrouped={modelsGrouped}
              expandedCategories={expandedCategories}
              setExpandedCategories={setExpandedCategories}
              expandedMakes={expandedMakes}
              setExpandedMakes={setExpandedMakes}
              dailyRateInputs={dailyRateInputs}
              setDailyRateInputs={setDailyRateInputs}
              isUpdatingRate={isUpdatingRate}
              setIsUpdatingRate={setIsUpdatingRate}
              formatRate={formatRate}
              apiService={apiService}
              queryClient={queryClient}
              currentCompanyId={currentCompanyId}
            />
          )}

          {/* Reservations Section */}
          {/* Reservations Section */}
          {activeSection === 'reservations' && (
            <ReservationsSection
              t={t}
              filteredBookings={filteredBookings}
              totalBookings={totalBookings}
              isLoadingBookings={isLoadingBookings}
              bookingsError={bookingsError}
              bookingDateFrom={bookingDateFrom}
              setBookingDateFrom={setBookingDateFrom}
              bookingDateTo={bookingDateTo}
              setBookingDateTo={setBookingDateTo}
              bookingStatusFilter={bookingStatusFilter}
              setBookingStatusFilter={setBookingStatusFilter}
              bookingCustomerFilter={bookingCustomerFilter}
              setBookingCustomerFilter={setBookingCustomerFilter}
              bookingPage={bookingPage}
              setBookingPage={setBookingPage}
              bookingPageSize={bookingPageSize}
              setBookingPageSize={setBookingPageSize}
              totalBookingPages={totalBookingPages}
              setShowReservationWizard={setShowReservationWizard}
              setWizardStep={setWizardStep}
              setWizardCustomerEmail={setWizardCustomerEmail}
              setWizardCustomer={setWizardCustomer}
              setWizardSelectedCategory={setWizardSelectedCategory}
              setWizardSelectedMake={setWizardSelectedMake}
              setWizardSelectedModel={setWizardSelectedModel}
              setWizardPickupDate={setWizardPickupDate}
              setWizardReturnDate={setWizardReturnDate}
              handleOpenBookingDetails={handleOpenBookingDetails}
              handleViewContract={handleViewContract}
              formatDate={formatDate}
              formatPrice={formatPrice}
              getBookingStatusColor={getBookingStatusColor}
              formatBookingStatus={formatBookingStatus}
            />
          )}

          {/* Employees Section */}
          {activeSection === 'employees' && (
            <EmployeesSection
              t={t}
              customers={customers}
              totalCustomers={totalCustomers}
              isLoadingCustomers={isLoadingCustomers}
              customersError={customersError}
              customerSearch={customerSearch}
              setCustomerSearch={setCustomerSearch}
              customerPage={customerPage}
              setCustomerPage={setCustomerPage}
              customerPageSize={customerPageSize}
              setCustomerPageSize={setCustomerPageSize}
              totalCustomerPages={totalCustomerPages}
              setShowAddEmployeeModal={setShowAddEmployeeModal}
              handleEditEmployee={handleEditEmployee}
              handleDeleteEmployee={handleDeleteEmployee}
            />
          )}

          {/* Additional Services Section */}
          {activeSection === 'additionalServices' && (
            <AdditionalServicesSection
              t={t}
              isEditingService={isEditingService}
              editingServiceId={editingServiceId}
              editingCompanyServiceId={editingCompanyServiceId}
              editingServiceBaseInfo={editingServiceBaseInfo}
              serviceFormData={serviceFormData}
              allAdditionalServices={allAdditionalServices}
              assignedServiceIds={assignedServiceIds}
              assignmentOverrides={assignmentOverrides}
              companyServicesMap={companyServicesMap}
              isLoadingServices={isLoadingAllServices || isLoadingCompanyServices}
              handleAddService={handleAddService}
              handleSaveService={handleSaveService}
              handleServiceInputChange={handleServiceInputChange}
              handleCancelServiceEdit={handleCancelServiceEdit}
              handleToggleServiceAssignment={handleToggleServiceAssignment}
              handleToggleServiceField={handleToggleServiceField}
              handleEditService={handleEditService}
              handleDeleteService={handleDeleteService}
              getServiceIdentifier={getServiceIdentifier}
              formatRate={formatRate}
              currencySymbol={currencySymbol}
              currencyCode={currencyCode}
            />
          )}

          {/* Vehicle Management Section */}
          {activeSection === 'vehicleManagement' && (
            <VehicleManagementSection
              t={t}
              isAdmin={isAdmin}
              isMainAdmin={isMainAdmin}
              isImportingVehicles={isImportingVehicles}
              handleVehicleImport={handleVehicleImport}
              setIsCreatingVehicle={setIsCreatingVehicle}
              setVehicleCreateForm={setVehicleCreateForm}
              navigate={navigate}
              currentCompanyId={currentCompanyId}
              pickupLocations={pickupLocations}
              vehicleMakeFilter={vehicleMakeFilter}
              setVehicleMakeFilter={setVehicleMakeFilter}
              vehicleModelFilter={vehicleModelFilter}
              setVehicleModelFilter={setVehicleModelFilter}
              vehicleYearFilter={vehicleYearFilter}
              setVehicleYearFilter={setVehicleYearFilter}
              vehicleLicensePlateFilter={vehicleLicensePlateFilter}
              setVehicleLicensePlateFilter={setVehicleLicensePlateFilter}
              vehicleLocationFilter={vehicleLocationFilter}
              setVehicleLocationFilter={setVehicleLocationFilter}
              vehicleSearchTerm={vehicleSearchTerm}
              setVehicleSearchTerm={setVehicleSearchTerm}
              uniqueMakes={uniqueMakes}
              filteredModels={filteredModels}
              vehiclePage={vehiclePage}
              setVehiclePage={setVehiclePage}
              vehiclePageSize={vehiclePageSize}
              vehiclesTotalCount={vehiclesTotalCount}
              isLoadingVehiclesList={isLoadingVehiclesList}
              vehiclesList={vehiclesList}
              filteredVehiclesList={filteredVehiclesList}
              vehicleTable={vehicleTable}
            />
          )}

          {activeSection === 'reports' && (
            <ReportsSection t={t} />
          )}

          {/* Meta Integration Section */}
          {activeSection === 'meta' && (
            <MetaSection
              t={t}
              currentCompanyId={currentCompanyId}
              metaConnectionStatus={metaConnectionStatus}
              isLoadingMetaStatus={isLoadingMetaStatus}
              metaStatusError={metaStatusError}
              connectMetaMutation={connectMetaMutation}
              disconnectMetaMutation={disconnectMetaMutation}
              selectMetaPageMutation={selectMetaPageMutation}
              refreshInstagramMutation={refreshInstagramMutation}
              availablePages={metaAvailablePages}
              apiService={apiService}
              queryClient={queryClient}
            />
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
    {showFieldMappingModal && fieldMappingData && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{t('vehicles.mapFields', 'Map CSV Columns to Fields')}</h2>
            <button
              onClick={() => {
                setShowFieldMappingModal(false);
                setFieldMappingData(null);
                setPendingImportFile(null);
                setFieldMapping({});
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <p className="text-gray-600 mb-6">
            {t('vehicles.mapFieldsDescription', 'Please map each CSV column to the corresponding field. Mandatory fields are marked with *.')}
          </p>
          
          <div className="space-y-4">
            {fieldMappingData.availableFields.map((field) => {
              const currentMapping = fieldMapping[field.field];
              // Check if mapped (0 is a valid column index)
              const isMapped = currentMapping !== undefined && currentMapping !== null && currentMapping !== '';
              const isMandatoryUnmapped = field.mandatory && !isMapped;
              
              return (
                <div key={field.field} className={`flex items-center gap-4 ${isMandatoryUnmapped ? 'bg-red-50 p-3 rounded border border-red-200' : ''}`}>
                  <label className={`w-48 font-medium ${isMandatoryUnmapped ? 'text-red-600' : ''}`}>
                    {field.label}
                    {field.mandatory && <span className="text-red-500 ml-1">*</span>}
                    {field.defaultValue && (
                      <span className="text-gray-500 text-sm ml-2">({t('vehicles.default', 'default')}: {field.defaultValue})</span>
                    )}
                    {isMandatoryUnmapped && (
                      <span className="text-red-600 text-sm ml-2 font-normal">({t('vehicles.required', 'required')})</span>
                    )}
                  </label>
                  <select
                    value={currentMapping === undefined || currentMapping === null ? '' : currentMapping}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFieldMapping(prev => ({
                        ...prev,
                        [field.field]: value === '' ? undefined : parseInt(value, 10)
                      }));
                    }}
                    className={`flex-1 border rounded px-3 py-2 ${
                      isMandatoryUnmapped 
                        ? 'border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-500' 
                        : 'border-gray-300'
                    }`}
                    required={field.mandatory}
                  >
                    <option value="">{t('vehicles.selectColumn', 'Select CSV column...')}</option>
                    {fieldMappingData.headers.map((header, index) => (
                      <option key={index} value={index}>
                        {header} (Column {index + 1})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              onClick={() => {
                setShowFieldMappingModal(false);
                setFieldMappingData(null);
                setPendingImportFile(null);
                setFieldMapping({});
              }}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              onClick={() => {
                // Validate mandatory fields are mapped
                const mandatoryFields = fieldMappingData.availableFields.filter(f => f.mandatory);
                const missingMandatory = mandatoryFields.some(f => {
                  const value = fieldMapping[f.field];
                  // Field is missing if value is undefined, null, empty string, or NaN
                  return value === undefined || value === null || value === '' || isNaN(Number(value));
                });
                
                if (missingMandatory) {
                  const unmappedFields = mandatoryFields.filter(f => {
                    const value = fieldMapping[f.field];
                    return value === undefined || value === null || value === '' || isNaN(Number(value));
                  }).map(f => f.label).join(', ');
                  toast.error(t('vehicles.mapAllMandatoryFields', 'Please map all mandatory fields') + `: ${unmappedFields}`);
                  return;
                }
                
                // Create mapping object with field names as keys and column indices as values
                const mapping = {};
                Object.keys(fieldMapping).forEach(field => {
                  const value = fieldMapping[field];
                  // Only include if value is a valid number (0 is valid)
                  if (value !== undefined && value !== null && value !== '' && !isNaN(Number(value))) {
                    mapping[field] = Number(value);
                  }
                });
                
                handleVehicleImportWithMapping(mapping);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {t('vehicles.importWithMapping', 'Import with Mapping')}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default AdminDashboard;
