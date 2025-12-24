/*
 * AdminDashboard State Management
 * useReducer-based state management to replace 50+ useState hooks
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import { useReducer, useCallback } from 'react';

// ============== INITIAL STATE ==============

export const initialState = {
  // Navigation
  activeSection: 'company',
  activeTab: 'info',
  activeLocationSubTab: 'company',
  activeViolationsTab: 'list',
  
  // Company editing
  isEditingCompany: false,
  isEditingDeposit: false,
  isCreatingCompany: false,
  isCreatingStripeAccount: false,
  companyFormData: {},
  termsOfUseDraft: '',
  securityDepositDraft: '',
  isSecurityDepositMandatoryDraft: true,
  
  // Vehicles
  editingVehicle: null,
  vehicleEditForm: {},
  isCreatingVehicle: false,
  vehicleCreateForm: {},
  isLookingUpVin: false,
  vehiclePage: 0,
  vehiclePageSize: 10,
  vehicleSearchTerm: '',
  vehicleMakeFilter: '',
  vehicleModelFilter: '',
  vehicleYearFilter: '',
  vehicleLicensePlateFilter: '',
  vehicleLocationFilter: '',
  isImportingVehicles: false,
  expandedCategories: {},
  expandedMakes: {},
  dailyRateInputs: {},
  
  // CSV Import
  showFieldMappingModal: false,
  fieldMappingData: null,
  fieldMapping: {},
  pendingImportFile: null,
  
  // Locations
  isEditingLocation: false,
  editingLocationId: null,
  locationPage: 0,
  locationPageSize: 10,
  locationFormData: {
    name: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
    email: '',
    operatingHours: '',
    isPickupLocation: true,
    isDropoffLocation: true,
  },
  
  // Services
  isEditingService: false,
  editingServiceId: null,
  editingCompanyServiceId: null,
  editingServiceBaseInfo: null,
  serviceFormData: {
    name: '',
    description: '',
    price: '',
    pricingType: 'per_day',
    isMandatory: false,
    isActive: true,
  },
  servicePricingModal: {
    open: false,
    service: null,
    basePrice: 0,
    priceInput: '',
    isMandatory: false,
    submitting: false,
    error: null,
  },
  
  // Employees
  showAddEmployeeModal: false,
  
  // Bookings
  selectedBooking: null,
  showBookingDetailsModal: false,
  showCancelRefundModal: false,
  showSecurityDepositModal: false,
  showBookingPaymentModal: false,
  cancelReason: '',
  refundAmount: '',
  
  // Damage
  showDamageConfirmationModal: false,
  damageVehicleId: null,
  damageDescription: '',
  damageAmount: '',
  damageImages: [],
  
  // Reservation Wizard
  showReservationWizard: false,
  wizardStep: 1,
  wizardCustomerEmail: '',
  wizardCustomer: null,
  wizardSearchingCustomer: false,
  wizardCreatingCustomer: false,
  wizardPickupDate: null,
  wizardReturnDate: null,
  wizardSelectedLocation: null,
  wizardSelectedCategory: null,
  wizardSelectedMake: null,
  wizardSelectedModel: null,
  wizardModelsByMake: {},
  wizardExpandedMakes: new Set(),
  isLoadingWizardModels: false,
  wizardSelectedServices: [],
  wizardAdditionalServices: [],
  isLoadingWizardServices: false,
  
  // Sync
  showSyncConfirmModal: false,
  
  // Upload progress
  uploadProgress: {
    logo: 0,
    coverImage: 0,
    favicon: 0,
  },
  isUploading: {
    logo: false,
    coverImage: false,
    favicon: false,
  },
  
  // Violations
  selectedStates: new Set(),
  violationsFindingProgress: null,
  
  // Loading states
  isSavingTermsOfUse: false,
  isSavingDeposit: false,
};

// ============== ACTION TYPES ==============

export const ACTION_TYPES = {
  // Navigation
  SET_ACTIVE_SECTION: 'SET_ACTIVE_SECTION',
  SET_ACTIVE_TAB: 'SET_ACTIVE_TAB',
  SET_ACTIVE_LOCATION_SUB_TAB: 'SET_ACTIVE_LOCATION_SUB_TAB',
  SET_ACTIVE_VIOLATIONS_TAB: 'SET_ACTIVE_VIOLATIONS_TAB',
  
  // Company
  SET_EDITING_COMPANY: 'SET_EDITING_COMPANY',
  SET_COMPANY_FORM_DATA: 'SET_COMPANY_FORM_DATA',
  UPDATE_COMPANY_FIELD: 'UPDATE_COMPANY_FIELD',
  SET_TERMS_OF_USE_DRAFT: 'SET_TERMS_OF_USE_DRAFT',
  SET_SECURITY_DEPOSIT_DRAFT: 'SET_SECURITY_DEPOSIT_DRAFT',
  
  // Vehicles
  SET_EDITING_VEHICLE: 'SET_EDITING_VEHICLE',
  SET_VEHICLE_EDIT_FORM: 'SET_VEHICLE_EDIT_FORM',
  UPDATE_VEHICLE_FIELD: 'UPDATE_VEHICLE_FIELD',
  SET_VEHICLE_FILTERS: 'SET_VEHICLE_FILTERS',
  SET_VEHICLE_PAGE: 'SET_VEHICLE_PAGE',
  TOGGLE_CATEGORY_EXPAND: 'TOGGLE_CATEGORY_EXPAND',
  TOGGLE_MAKE_EXPAND: 'TOGGLE_MAKE_EXPAND',
  SET_DAILY_RATE_INPUT: 'SET_DAILY_RATE_INPUT',
  
  // CSV Import
  OPEN_FIELD_MAPPING_MODAL: 'OPEN_FIELD_MAPPING_MODAL',
  CLOSE_FIELD_MAPPING_MODAL: 'CLOSE_FIELD_MAPPING_MODAL',
  SET_FIELD_MAPPING: 'SET_FIELD_MAPPING',
  
  // Locations
  SET_EDITING_LOCATION: 'SET_EDITING_LOCATION',
  SET_LOCATION_FORM_DATA: 'SET_LOCATION_FORM_DATA',
  UPDATE_LOCATION_FIELD: 'UPDATE_LOCATION_FIELD',
  SET_LOCATION_PAGE: 'SET_LOCATION_PAGE',
  
  // Services
  SET_EDITING_SERVICE: 'SET_EDITING_SERVICE',
  SET_SERVICE_FORM_DATA: 'SET_SERVICE_FORM_DATA',
  OPEN_SERVICE_PRICING_MODAL: 'OPEN_SERVICE_PRICING_MODAL',
  CLOSE_SERVICE_PRICING_MODAL: 'CLOSE_SERVICE_PRICING_MODAL',
  UPDATE_SERVICE_PRICING_MODAL: 'UPDATE_SERVICE_PRICING_MODAL',
  
  // Employees
  SET_SHOW_ADD_EMPLOYEE_MODAL: 'SET_SHOW_ADD_EMPLOYEE_MODAL',
  
  // Bookings
  SET_SELECTED_BOOKING: 'SET_SELECTED_BOOKING',
  SET_SHOW_BOOKING_DETAILS_MODAL: 'SET_SHOW_BOOKING_DETAILS_MODAL',
  SET_SHOW_CANCEL_REFUND_MODAL: 'SET_SHOW_CANCEL_REFUND_MODAL',
  SET_SHOW_SECURITY_DEPOSIT_MODAL: 'SET_SHOW_SECURITY_DEPOSIT_MODAL',
  SET_SHOW_BOOKING_PAYMENT_MODAL: 'SET_SHOW_BOOKING_PAYMENT_MODAL',
  SET_CANCEL_REASON: 'SET_CANCEL_REASON',
  SET_REFUND_AMOUNT: 'SET_REFUND_AMOUNT',
  
  // Reservation Wizard
  OPEN_RESERVATION_WIZARD: 'OPEN_RESERVATION_WIZARD',
  CLOSE_RESERVATION_WIZARD: 'CLOSE_RESERVATION_WIZARD',
  SET_WIZARD_STEP: 'SET_WIZARD_STEP',
  SET_WIZARD_CUSTOMER: 'SET_WIZARD_CUSTOMER',
  SET_WIZARD_DATES: 'SET_WIZARD_DATES',
  SET_WIZARD_LOCATION: 'SET_WIZARD_LOCATION',
  SET_WIZARD_VEHICLE_SELECTION: 'SET_WIZARD_VEHICLE_SELECTION',
  SET_WIZARD_MODELS_BY_MAKE: 'SET_WIZARD_MODELS_BY_MAKE',
  SET_WIZARD_SERVICES: 'SET_WIZARD_SERVICES',
  TOGGLE_WIZARD_MAKE_EXPAND: 'TOGGLE_WIZARD_MAKE_EXPAND',
  
  // Upload
  SET_UPLOAD_PROGRESS: 'SET_UPLOAD_PROGRESS',
  SET_IS_UPLOADING: 'SET_IS_UPLOADING',
  
  // Violations
  SET_SELECTED_STATES: 'SET_SELECTED_STATES',
  SET_VIOLATIONS_PROGRESS: 'SET_VIOLATIONS_PROGRESS',
  
  // Loading states
  SET_LOADING: 'SET_LOADING',
  
  // Reset
  RESET_STATE: 'RESET_STATE',
};

// ============== REDUCER ==============

export function adminDashboardReducer(state, action) {
  switch (action.type) {
    // Navigation
    case ACTION_TYPES.SET_ACTIVE_SECTION:
      return { ...state, activeSection: action.payload };
    case ACTION_TYPES.SET_ACTIVE_TAB:
      return { ...state, activeTab: action.payload };
    case ACTION_TYPES.SET_ACTIVE_LOCATION_SUB_TAB:
      return { ...state, activeLocationSubTab: action.payload };
    case ACTION_TYPES.SET_ACTIVE_VIOLATIONS_TAB:
      return { ...state, activeViolationsTab: action.payload };
    
    // Company
    case ACTION_TYPES.SET_EDITING_COMPANY:
      return { ...state, isEditingCompany: action.payload };
    case ACTION_TYPES.SET_COMPANY_FORM_DATA:
      return { ...state, companyFormData: action.payload };
    case ACTION_TYPES.UPDATE_COMPANY_FIELD:
      return { 
        ...state, 
        companyFormData: { ...state.companyFormData, [action.payload.field]: action.payload.value } 
      };
    case ACTION_TYPES.SET_TERMS_OF_USE_DRAFT:
      return { ...state, termsOfUseDraft: action.payload };
    case ACTION_TYPES.SET_SECURITY_DEPOSIT_DRAFT:
      return { ...state, securityDepositDraft: action.payload };
    
    // Vehicles
    case ACTION_TYPES.SET_EDITING_VEHICLE:
      return { 
        ...state, 
        editingVehicle: action.payload,
        vehicleEditForm: action.payload || {},
      };
    case ACTION_TYPES.SET_VEHICLE_EDIT_FORM:
      return { ...state, vehicleEditForm: action.payload };
    case ACTION_TYPES.UPDATE_VEHICLE_FIELD:
      return { 
        ...state, 
        vehicleEditForm: { ...state.vehicleEditForm, [action.payload.field]: action.payload.value } 
      };
    case ACTION_TYPES.SET_VEHICLE_FILTERS:
      return { ...state, ...action.payload };
    case ACTION_TYPES.SET_VEHICLE_PAGE:
      return { ...state, vehiclePage: action.payload };
    case ACTION_TYPES.TOGGLE_CATEGORY_EXPAND:
      return {
        ...state,
        expandedCategories: {
          ...state.expandedCategories,
          [action.payload]: !state.expandedCategories[action.payload],
        },
      };
    case ACTION_TYPES.TOGGLE_MAKE_EXPAND:
      return {
        ...state,
        expandedMakes: {
          ...state.expandedMakes,
          [action.payload]: !state.expandedMakes[action.payload],
        },
      };
    case ACTION_TYPES.SET_DAILY_RATE_INPUT:
      return {
        ...state,
        dailyRateInputs: {
          ...state.dailyRateInputs,
          [action.payload.vehicleId]: action.payload.value,
        },
      };
    
    // CSV Import
    case ACTION_TYPES.OPEN_FIELD_MAPPING_MODAL:
      return {
        ...state,
        showFieldMappingModal: true,
        fieldMappingData: action.payload.data,
        pendingImportFile: action.payload.file,
        fieldMapping: action.payload.initialMapping || {},
      };
    case ACTION_TYPES.CLOSE_FIELD_MAPPING_MODAL:
      return {
        ...state,
        showFieldMappingModal: false,
        fieldMappingData: null,
        pendingImportFile: null,
        fieldMapping: {},
      };
    case ACTION_TYPES.SET_FIELD_MAPPING:
      return {
        ...state,
        fieldMapping: {
          ...state.fieldMapping,
          [action.payload.field]: action.payload.columnIndex,
        },
      };
    
    // Locations
    case ACTION_TYPES.SET_EDITING_LOCATION:
      return {
        ...state,
        isEditingLocation: !!action.payload,
        editingLocationId: action.payload?.id || null,
        locationFormData: action.payload || initialState.locationFormData,
      };
    case ACTION_TYPES.SET_LOCATION_FORM_DATA:
      return { ...state, locationFormData: action.payload };
    case ACTION_TYPES.UPDATE_LOCATION_FIELD:
      return {
        ...state,
        locationFormData: { ...state.locationFormData, [action.payload.field]: action.payload.value },
      };
    case ACTION_TYPES.SET_LOCATION_PAGE:
      return { ...state, locationPage: action.payload };
    
    // Services
    case ACTION_TYPES.SET_EDITING_SERVICE:
      return {
        ...state,
        isEditingService: !!action.payload,
        editingServiceId: action.payload?.id || null,
        serviceFormData: action.payload || initialState.serviceFormData,
      };
    case ACTION_TYPES.SET_SERVICE_FORM_DATA:
      return { ...state, serviceFormData: action.payload };
    case ACTION_TYPES.OPEN_SERVICE_PRICING_MODAL:
      return {
        ...state,
        servicePricingModal: {
          open: true,
          service: action.payload.service,
          basePrice: action.payload.basePrice || 0,
          priceInput: action.payload.currentPrice?.toString() || '',
          isMandatory: action.payload.isMandatory || false,
          submitting: false,
          error: null,
        },
      };
    case ACTION_TYPES.CLOSE_SERVICE_PRICING_MODAL:
      return {
        ...state,
        servicePricingModal: initialState.servicePricingModal,
      };
    case ACTION_TYPES.UPDATE_SERVICE_PRICING_MODAL:
      return {
        ...state,
        servicePricingModal: { ...state.servicePricingModal, ...action.payload },
      };
    
    // Employees
    case ACTION_TYPES.SET_SHOW_ADD_EMPLOYEE_MODAL:
      return { ...state, showAddEmployeeModal: action.payload };
    
    // Bookings
    case ACTION_TYPES.SET_SELECTED_BOOKING:
      return { ...state, selectedBooking: action.payload };
    case ACTION_TYPES.SET_SHOW_BOOKING_DETAILS_MODAL:
      return { ...state, showBookingDetailsModal: action.payload };
    case ACTION_TYPES.SET_SHOW_CANCEL_REFUND_MODAL:
      return { ...state, showCancelRefundModal: action.payload };
    case ACTION_TYPES.SET_SHOW_SECURITY_DEPOSIT_MODAL:
      return { ...state, showSecurityDepositModal: action.payload };
    case ACTION_TYPES.SET_SHOW_BOOKING_PAYMENT_MODAL:
      return { ...state, showBookingPaymentModal: action.payload };
    case ACTION_TYPES.SET_CANCEL_REASON:
      return { ...state, cancelReason: action.payload };
    case ACTION_TYPES.SET_REFUND_AMOUNT:
      return { ...state, refundAmount: action.payload };
    
    // Reservation Wizard
    case ACTION_TYPES.OPEN_RESERVATION_WIZARD:
      return {
        ...state,
        showReservationWizard: true,
        wizardStep: 1,
        wizardCustomerEmail: '',
        wizardCustomer: null,
      };
    case ACTION_TYPES.CLOSE_RESERVATION_WIZARD:
      return {
        ...state,
        showReservationWizard: false,
        wizardStep: 1,
        wizardCustomerEmail: '',
        wizardCustomer: null,
        wizardSelectedCategory: null,
        wizardSelectedMake: null,
        wizardSelectedModel: null,
        wizardModelsByMake: {},
        wizardExpandedMakes: new Set(),
        wizardSelectedServices: [],
        wizardAdditionalServices: [],
        wizardSelectedLocation: null,
      };
    case ACTION_TYPES.SET_WIZARD_STEP:
      return { ...state, wizardStep: action.payload };
    case ACTION_TYPES.SET_WIZARD_CUSTOMER:
      return {
        ...state,
        wizardCustomer: action.payload,
        wizardCustomerEmail: action.payload?.email || state.wizardCustomerEmail,
      };
    case ACTION_TYPES.SET_WIZARD_DATES:
      return {
        ...state,
        wizardPickupDate: action.payload.pickupDate,
        wizardReturnDate: action.payload.returnDate,
      };
    case ACTION_TYPES.SET_WIZARD_LOCATION:
      return { ...state, wizardSelectedLocation: action.payload };
    case ACTION_TYPES.SET_WIZARD_VEHICLE_SELECTION:
      return {
        ...state,
        wizardSelectedCategory: action.payload.category,
        wizardSelectedMake: action.payload.make,
        wizardSelectedModel: action.payload.model,
      };
    case ACTION_TYPES.SET_WIZARD_MODELS_BY_MAKE:
      return { ...state, wizardModelsByMake: action.payload };
    case ACTION_TYPES.SET_WIZARD_SERVICES:
      return {
        ...state,
        wizardSelectedServices: action.payload.selected || state.wizardSelectedServices,
        wizardAdditionalServices: action.payload.available || state.wizardAdditionalServices,
      };
    case ACTION_TYPES.TOGGLE_WIZARD_MAKE_EXPAND: {
      const newSet = new Set(state.wizardExpandedMakes);
      if (newSet.has(action.payload)) {
        newSet.delete(action.payload);
      } else {
        newSet.add(action.payload);
      }
      return { ...state, wizardExpandedMakes: newSet };
    }
    
    // Upload
    case ACTION_TYPES.SET_UPLOAD_PROGRESS:
      return {
        ...state,
        uploadProgress: { ...state.uploadProgress, [action.payload.key]: action.payload.value },
      };
    case ACTION_TYPES.SET_IS_UPLOADING:
      return {
        ...state,
        isUploading: { ...state.isUploading, [action.payload.key]: action.payload.value },
      };
    
    // Violations
    case ACTION_TYPES.SET_SELECTED_STATES:
      return { ...state, selectedStates: action.payload };
    case ACTION_TYPES.SET_VIOLATIONS_PROGRESS:
      return { ...state, violationsFindingProgress: action.payload };
    
    // Loading states
    case ACTION_TYPES.SET_LOADING:
      return { ...state, [action.payload.key]: action.payload.value };
    
    // Reset
    case ACTION_TYPES.RESET_STATE:
      return { ...initialState, ...action.payload };
    
    default:
      return state;
  }
}

// ============== CUSTOM HOOK ==============

export function useAdminDashboardState(initialTab = 'company') {
  const [state, dispatch] = useReducer(adminDashboardReducer, {
    ...initialState,
    activeSection: initialTab,
  });

  // Action creators
  const actions = {
    // Navigation
    setActiveSection: useCallback((section) => 
      dispatch({ type: ACTION_TYPES.SET_ACTIVE_SECTION, payload: section }), []),
    setActiveTab: useCallback((tab) => 
      dispatch({ type: ACTION_TYPES.SET_ACTIVE_TAB, payload: tab }), []),
    setActiveLocationSubTab: useCallback((tab) => 
      dispatch({ type: ACTION_TYPES.SET_ACTIVE_LOCATION_SUB_TAB, payload: tab }), []),
    setActiveViolationsTab: useCallback((tab) => 
      dispatch({ type: ACTION_TYPES.SET_ACTIVE_VIOLATIONS_TAB, payload: tab }), []),
    
    // Company
    setEditingCompany: useCallback((editing) => 
      dispatch({ type: ACTION_TYPES.SET_EDITING_COMPANY, payload: editing }), []),
    setCompanyFormData: useCallback((data) => 
      dispatch({ type: ACTION_TYPES.SET_COMPANY_FORM_DATA, payload: data }), []),
    updateCompanyField: useCallback((field, value) => 
      dispatch({ type: ACTION_TYPES.UPDATE_COMPANY_FIELD, payload: { field, value } }), []),
    
    // Vehicles
    setEditingVehicle: useCallback((vehicle) => 
      dispatch({ type: ACTION_TYPES.SET_EDITING_VEHICLE, payload: vehicle }), []),
    updateVehicleField: useCallback((field, value) => 
      dispatch({ type: ACTION_TYPES.UPDATE_VEHICLE_FIELD, payload: { field, value } }), []),
    setVehiclePage: useCallback((page) => 
      dispatch({ type: ACTION_TYPES.SET_VEHICLE_PAGE, payload: page }), []),
    toggleCategoryExpand: useCallback((category) => 
      dispatch({ type: ACTION_TYPES.TOGGLE_CATEGORY_EXPAND, payload: category }), []),
    toggleMakeExpand: useCallback((make) => 
      dispatch({ type: ACTION_TYPES.TOGGLE_MAKE_EXPAND, payload: make }), []),
    setDailyRateInput: useCallback((vehicleId, value) => 
      dispatch({ type: ACTION_TYPES.SET_DAILY_RATE_INPUT, payload: { vehicleId, value } }), []),
    
    // CSV Import
    openFieldMappingModal: useCallback((data, file, initialMapping) => 
      dispatch({ type: ACTION_TYPES.OPEN_FIELD_MAPPING_MODAL, payload: { data, file, initialMapping } }), []),
    closeFieldMappingModal: useCallback(() => 
      dispatch({ type: ACTION_TYPES.CLOSE_FIELD_MAPPING_MODAL }), []),
    setFieldMapping: useCallback((field, columnIndex) => 
      dispatch({ type: ACTION_TYPES.SET_FIELD_MAPPING, payload: { field, columnIndex } }), []),
    
    // Locations
    setEditingLocation: useCallback((location) => 
      dispatch({ type: ACTION_TYPES.SET_EDITING_LOCATION, payload: location }), []),
    updateLocationField: useCallback((field, value) => 
      dispatch({ type: ACTION_TYPES.UPDATE_LOCATION_FIELD, payload: { field, value } }), []),
    setLocationPage: useCallback((page) => 
      dispatch({ type: ACTION_TYPES.SET_LOCATION_PAGE, payload: page }), []),
    
    // Services
    setEditingService: useCallback((service) => 
      dispatch({ type: ACTION_TYPES.SET_EDITING_SERVICE, payload: service }), []),
    openServicePricingModal: useCallback((service, basePrice, currentPrice, isMandatory) => 
      dispatch({ type: ACTION_TYPES.OPEN_SERVICE_PRICING_MODAL, payload: { service, basePrice, currentPrice, isMandatory } }), []),
    closeServicePricingModal: useCallback(() => 
      dispatch({ type: ACTION_TYPES.CLOSE_SERVICE_PRICING_MODAL }), []),
    updateServicePricingModal: useCallback((updates) => 
      dispatch({ type: ACTION_TYPES.UPDATE_SERVICE_PRICING_MODAL, payload: updates }), []),
    
    // Employees
    setShowAddEmployeeModal: useCallback((show) => 
      dispatch({ type: ACTION_TYPES.SET_SHOW_ADD_EMPLOYEE_MODAL, payload: show }), []),
    
    // Bookings
    setSelectedBooking: useCallback((booking) => 
      dispatch({ type: ACTION_TYPES.SET_SELECTED_BOOKING, payload: booking }), []),
    setShowBookingDetailsModal: useCallback((show) => 
      dispatch({ type: ACTION_TYPES.SET_SHOW_BOOKING_DETAILS_MODAL, payload: show }), []),
    setShowCancelRefundModal: useCallback((show) => 
      dispatch({ type: ACTION_TYPES.SET_SHOW_CANCEL_REFUND_MODAL, payload: show }), []),
    setShowSecurityDepositModal: useCallback((show) => 
      dispatch({ type: ACTION_TYPES.SET_SHOW_SECURITY_DEPOSIT_MODAL, payload: show }), []),
    setShowBookingPaymentModal: useCallback((show) => 
      dispatch({ type: ACTION_TYPES.SET_SHOW_BOOKING_PAYMENT_MODAL, payload: show }), []),
    
    // Reservation Wizard
    openReservationWizard: useCallback(() => 
      dispatch({ type: ACTION_TYPES.OPEN_RESERVATION_WIZARD }), []),
    closeReservationWizard: useCallback(() => 
      dispatch({ type: ACTION_TYPES.CLOSE_RESERVATION_WIZARD }), []),
    setWizardStep: useCallback((step) => 
      dispatch({ type: ACTION_TYPES.SET_WIZARD_STEP, payload: step }), []),
    setWizardCustomer: useCallback((customer) => 
      dispatch({ type: ACTION_TYPES.SET_WIZARD_CUSTOMER, payload: customer }), []),
    setWizardDates: useCallback((pickupDate, returnDate) => 
      dispatch({ type: ACTION_TYPES.SET_WIZARD_DATES, payload: { pickupDate, returnDate } }), []),
    setWizardLocation: useCallback((location) => 
      dispatch({ type: ACTION_TYPES.SET_WIZARD_LOCATION, payload: location }), []),
    setWizardVehicleSelection: useCallback((category, make, model) => 
      dispatch({ type: ACTION_TYPES.SET_WIZARD_VEHICLE_SELECTION, payload: { category, make, model } }), []),
    toggleWizardMakeExpand: useCallback((make) => 
      dispatch({ type: ACTION_TYPES.TOGGLE_WIZARD_MAKE_EXPAND, payload: make }), []),
    
    // Upload
    setUploadProgress: useCallback((key, value) => 
      dispatch({ type: ACTION_TYPES.SET_UPLOAD_PROGRESS, payload: { key, value } }), []),
    setIsUploading: useCallback((key, value) => 
      dispatch({ type: ACTION_TYPES.SET_IS_UPLOADING, payload: { key, value } }), []),
    
    // Violations
    setSelectedStates: useCallback((states) => 
      dispatch({ type: ACTION_TYPES.SET_SELECTED_STATES, payload: states }), []),
    setViolationsProgress: useCallback((progress) => 
      dispatch({ type: ACTION_TYPES.SET_VIOLATIONS_PROGRESS, payload: progress }), []),
    
    // Loading
    setLoading: useCallback((key, value) => 
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: { key, value } }), []),
    
    // Reset
    resetState: useCallback((overrides) => 
      dispatch({ type: ACTION_TYPES.RESET_STATE, payload: overrides }), []),
  };

  return { state, actions, dispatch };
}

export default useAdminDashboardState;
