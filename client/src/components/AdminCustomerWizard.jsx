/*
 * Admin Customer Creation Wizard Component
 * For creating customers from admin panel (ReservationWizardPage)
 * Uses reusable components: CustomerBasicForm, LicensePhotosStep
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, UserPlus, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { CustomerInfoFields, LicenseInfoFields } from './common/CustomerBasicForm';
import LicensePhotosStep from './common/LicensePhotosStep';
import { useLicenseAutoFill } from '../hooks/useLicenseAutoFill';
import LicenseAutoFillBanner from './common/LicenseAutoFillBanner';
import { BatchFieldSuggestions } from './common/FieldSuggestion';

const AdminCustomerWizard = ({
  isOpen,
  onClose,
  onComplete, // Callback when customer is created successfully, receives customer object
  initialEmail = '',
  companyId,
}) => {
  const { t } = useTranslation();
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    dateOfBirth: '',
    // License fields
    licenseNumber: '',
    licenseState: '',
    licenseCountry: 'US',
    licenseExpiry: '',
    licenseIssueDate: '',
  });
  
  // Created customer (after step 1)
  const [createdCustomer, setCreatedCustomer] = useState(null);
  
  // License images state
  const [uploadedImages, setUploadedImages] = useState({ front: null, back: null });
  const [localPreviews, setLocalPreviews] = useState({ front: null, back: null });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // License auto-fill functionality
  const {
    isAvailable: hasLicenseData,
    confidence: dataConfidence,
    processingMethod,
    suggestions,
    validationResult,
    applyAutoFill,
    generateSuggestions,
    applySuggestion,
    applyAllSuggestions,
    clearData: clearLicenseData,
    isHighConfidence,
    hasErrors,
    hasWarnings
  } = useLicenseAutoFill({
    showSuggestions: true,
    onAutoFill: (updatedData, validation) => {
      if (validation.warnings.length > 0 || validation.errors.length > 0) {
        toast.warning('Please review the auto-filled data carefully');
      }
    }
  });
  
  // Reset form when wizard opens and check for auto-fill data
  useEffect(() => {
    if (isOpen) {
      setWizardStep(1);

      // Start with clean form data
      const cleanFormData = {
        email: initialEmail || '',
        firstName: '',
        lastName: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US',
        dateOfBirth: '',
        licenseNumber: '',
        licenseState: '',
        licenseCountry: 'US',
        licenseExpiry: '',
        licenseIssueDate: '',
      };

      // Check if we have license data to auto-fill
      if (hasLicenseData && isHighConfidence) {
        // Automatically apply auto-fill for high confidence data
        const autoFilledData = applyAutoFill(cleanFormData, {
          overwriteExisting: true
        });
        setFormData(autoFilledData);

        toast.success(
          `Auto-filled form from scanned license (${Math.round(dataConfidence * 100)}% confidence)`,
          { autoClose: 4000 }
        );
      } else {
        setFormData(cleanFormData);

        // Generate suggestions for manual review if data is available
        if (hasLicenseData) {
          setTimeout(() => generateSuggestions(cleanFormData), 500);
        }
      }

      setCreatedCustomer(null);
      setUploadedImages({ front: null, back: null });
      setLocalPreviews({ front: null, back: null });
      setError('');
    }
  }, [isOpen, initialEmail, hasLicenseData, isHighConfidence, dataConfidence, applyAutoFill, generateSuggestions]);
  
  // Handle form field changes
  const handleFieldChange = useCallback((name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Handle auto-fill application
  const handleApplyAutoFill = useCallback(async () => {
    try {
      const updatedData = applyAutoFill(formData, {
        overwriteExisting: false // Don't overwrite existing values
      });
      setFormData(updatedData);
    } catch (error) {
      toast.error('Failed to apply license data');
    }
  }, [applyAutoFill, formData]);

  // Handle suggestions generation
  const handleGenerateSuggestions = useCallback(() => {
    generateSuggestions(formData);
  }, [generateSuggestions, formData]);

  // Handle individual suggestion application
  const handleApplySuggestion = useCallback((fieldName, suggestedValue) => {
    const updatedData = applySuggestion(fieldName, suggestedValue, formData);
    setFormData(updatedData);
  }, [applySuggestion, formData]);

  // Handle applying all suggestions
  const handleApplyAllSuggestions = useCallback(() => {
    const updatedData = applyAllSuggestions(formData);
    setFormData(updatedData);
  }, [applyAllSuggestions, formData]);

  // Handle rejecting all suggestions
  const handleRejectAllSuggestions = useCallback(() => {
    generateSuggestions({}); // Clear suggestions
    toast.info('Rejected all suggestions');
  }, [generateSuggestions]);
  
  // Validate and create customer on step 1
  const validateAndCreateCustomer = useCallback(async () => {
    // Validate fields
    if (!formData.email || !formData.email.includes('@')) {
      setError(t('admin.invalidEmail', 'Please enter a valid email address'));
      return false;
    }
    if (!formData.firstName.trim()) {
      setError(t('customer.firstNameRequired', 'First name is required'));
      return false;
    }
    if (!formData.lastName.trim()) {
      setError(t('customer.lastNameRequired', 'Last name is required'));
      return false;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // First check if customer already exists
      try {
        const existingResponse = await apiService.getCustomerByEmail(formData.email.trim().toLowerCase());
        const existingCustomer = existingResponse?.data || existingResponse;
        if (existingCustomer && existingCustomer.customerId) {
          setError(t('admin.customerAlreadyExists', 'Customer with this email already exists'));
          setLoading(false);
          return false;
        }
      } catch (checkError) {
        // 404 is expected if customer doesn't exist - continue with creation
        if (checkError.response?.status !== 404) {
        }
      }
      
      // Create customer data
      const customerData = {
        email: formData.email.trim().toLowerCase(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        country: formData.country,
        dateOfBirth: formData.dateOfBirth || null,
      };
      
      if (companyId) {
        customerData.companyId = companyId;
      }
      
      // Create customer
      const response = await apiService.createCustomer(customerData);
      const customer = response?.data || response;
      
      if (!customer || !customer.customerId) {
        throw new Error('Failed to create customer');
      }
      
      setCreatedCustomer(customer);
      return true;
      
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || t('admin.customerCreateError', 'Failed to create customer');
      
      // Check if it's a duplicate email error
      if (errorMsg.toLowerCase().includes('exist') || errorMsg.toLowerCase().includes('duplicate')) {
        setError(t('admin.customerAlreadyExists', 'Customer with this email already exists'));
      } else {
        setError(errorMsg);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [formData, companyId, t]);
  
  // Update customer with license info (step 2 -> step 3)
  const updateCustomerLicenseInfo = useCallback(async () => {
    if (!createdCustomer || !createdCustomer.customerId) return true;
    
    // If no license info entered, skip update
    if (!formData.licenseNumber.trim() && !formData.licenseState.trim()) {
      return true;
    }
    
    setLoading(true);
    try {
      await apiService.updateCustomer(createdCustomer.customerId, {
        driversLicense: formData.licenseNumber.trim(),
        driversLicenseState: formData.licenseState.trim(),
        driversLicenseExpiry: formData.licenseExpiry || null,
      });
      return true;
    } catch (err) {
      // Don't block progression for license update errors
      toast.warning(t('admin.licenseUpdateFailed', 'Could not save license information'));
      return true;
    } finally {
      setLoading(false);
    }
  }, [createdCustomer, formData, t]);
  
  // Handle next step
  const handleNext = useCallback(async () => {
    if (wizardStep === 1) {
      const success = await validateAndCreateCustomer();
      if (success) {
        setWizardStep(2);
      }
    } else if (wizardStep === 2) {
      const success = await updateCustomerLicenseInfo();
      if (success) {
        setWizardStep(3);
      }
    }
  }, [wizardStep, validateAndCreateCustomer, updateCustomerLicenseInfo]);
  
  // Handle previous step
  const handleBack = useCallback(() => {
    if (wizardStep === 2) {
      // Can go back to step 1, but customer is already created
      // Just allow editing license info
      setWizardStep(1);
      setError('');
    }
    // Can't go back from step 3 (photos) - customer already created
  }, [wizardStep]);
  
  // Complete wizard
  const handleComplete = useCallback(() => {
    if (createdCustomer) {
      onComplete(createdCustomer);
      onClose();
    }
  }, [createdCustomer, onComplete, onClose]);
  
  // Handle photo error
  const handlePhotoError = useCallback((errorMsg) => {
    toast.error(errorMsg);
  }, []);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-3">
            <UserPlus className="h-6 w-6" />
            <h2 className="text-xl font-bold">
              {t('admin.createNewCustomer', 'Create New Customer')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: t('customer.basicInfo', 'Basic Information') },
              { num: 2, label: t('license.info', "Driver's License Information") },
              { num: 3, label: t('license.photos', 'Driver License Photos') },
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    wizardStep > step.num
                      ? 'bg-green-500 text-white'
                      : wizardStep === step.num
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {wizardStep > step.num ? <Check className="h-5 w-5" /> : step.num}
                  </div>
                  <span className={`ml-2 text-sm hidden sm:inline ${
                    wizardStep >= step.num ? 'text-gray-900 font-medium' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < 2 && (
                  <div className={`flex-1 h-1 mx-4 rounded ${
                    wizardStep > step.num ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          {/* Step 1: Basic Info */}
          {wizardStep === 1 && (
            <div>
              {createdCustomer && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  ✓ {t('admin.customerCreated', 'Customer created successfully')}
                </div>
              )}

              {/* Auto-fill banner - show if license data is available */}
              {hasLicenseData && !createdCustomer && (
                <LicenseAutoFillBanner
                  isAvailable={hasLicenseData}
                  confidence={dataConfidence}
                  processingMethod={processingMethod}
                  suggestionsCount={suggestions ? Object.keys(suggestions.suggestions || {}).length : 0}
                  validationResult={validationResult}
                  onApplyAutoFill={handleApplyAutoFill}
                  onGenerateSuggestions={handleGenerateSuggestions}
                  onDismiss={clearLicenseData}
                  variant={suggestions ? 'suggestions' : 'suggestions'}
                  className="mb-4"
                />
              )}

              {/* Batch suggestions - show if available */}
              {suggestions && Object.keys(suggestions.suggestions).length > 0 && !createdCustomer && (
                <div className="mb-4">
                  <BatchFieldSuggestions
                    suggestions={suggestions.suggestions}
                    fieldLabels={{
                      firstName: t('customer.firstName', 'First Name'),
                      lastName: t('customer.lastName', 'Last Name'),
                      middleName: t('customer.middleName', 'Middle Name'),
                      dateOfBirth: t('customer.dateOfBirth', 'Date of Birth'),
                      address: t('customer.address', 'Address'),
                      city: t('customer.city', 'City'),
                      state: t('customer.state', 'State'),
                      zipCode: t('customer.zipCode', 'Zip Code'),
                      licenseNumber: t('license.number', 'License Number'),
                      licenseState: t('license.state', 'License State'),
                      licenseExpiry: t('license.expiry', 'License Expiry')
                    }}
                    onAcceptAll={handleApplyAllSuggestions}
                    onRejectAll={handleRejectAllSuggestions}
                    onAcceptField={handleApplySuggestion}
                    onRejectField={(fieldName) => {
                      // Remove suggestion for this field
                    }}
                    disabled={loading}
                  />
                </div>
              )}

              {/* Validation warnings/errors */}
              {validationResult && (hasErrors || hasWarnings) && !createdCustomer && (
                <LicenseAutoFillBanner
                  isAvailable={true}
                  confidence={dataConfidence}
                  processingMethod={processingMethod}
                  validationResult={validationResult}
                  variant="validation"
                  showDetails={true}
                  className="mb-4"
                />
              )}

              {/* Email field - locked if passed from parent */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('customer.email', 'Email')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${initialEmail ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="customer@example.com"
                  disabled={loading || !!createdCustomer || !!initialEmail}
                  readOnly={!!initialEmail}
                />
                {initialEmail && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('admin.emailFromSearch', 'Email from search cannot be changed')}
                  </p>
                )}
              </div>

              <CustomerInfoFields
                data={formData}
                onChange={handleFieldChange}
                disabled={loading || !!createdCustomer}
                showEmail={false}
                showPhone={true}
                showAddress={true}
                showDateOfBirth={true}
              />
            </div>
          )}
          
          {/* Step 2: License Info */}
          {wizardStep === 2 && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                {t('license.optional', "Driver's license information is optional but recommended for rental agreements.")}
              </p>

              {/* Auto-fill banner for license fields if not already filled */}
              {hasLicenseData && (!formData.licenseNumber || !formData.licenseState) && (
                <LicenseAutoFillBanner
                  isAvailable={hasLicenseData}
                  confidence={dataConfidence}
                  processingMethod={processingMethod}
                  suggestionsCount={0}
                  onApplyAutoFill={() => {
                    // Apply only license-specific fields
                    const licenseSpecificData = applyAutoFill(formData, {
                      overwriteExisting: false,
                      includeFields: ['licenseNumber', 'licenseState', 'licenseExpiry', 'licenseIssueDate']
                    });
                    setFormData(licenseSpecificData);
                  }}
                  variant="suggestions"
                  className="mb-4"
                />
              )}

              <LicenseInfoFields
                data={formData}
                onChange={handleFieldChange}
                disabled={loading}
                showIssueDate={true}
                showCountry={true}
              />
            </div>
          )}
          
          {/* Step 3: License Photos */}
          {wizardStep === 3 && createdCustomer && (
            <LicensePhotosStep
              customerId={createdCustomer.customerId}
              customerEmail={createdCustomer.email}
              uploadedImages={uploadedImages}
              setUploadedImages={setUploadedImages}
              localPreviews={localPreviews}
              setLocalPreviews={setLocalPreviews}
              loading={loading}
              setLoading={setLoading}
              onError={handlePhotoError}
              required={false}
              showSkipButton={false}
            />
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          {wizardStep < 3 ? (
            <>
              <button
                type="button"
                onClick={wizardStep === 1 ? onClose : handleBack}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4" />
                {wizardStep === 1 ? t('common.cancel', 'Cancel') : t('common.back', 'Back')}
              </button>
              
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                disabled={loading || (wizardStep === 1 && createdCustomer)}
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    {wizardStep === 1 ? t('admin.creating', 'Creating...') : t('common.loading', 'Loading...')}
                  </>
                ) : (
                  <>
                    {t('common.next', 'Next')}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleComplete}
                className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                {t('license.skipForNow', 'Skip photos')}
              </button>
              
              <button
                type="button"
                onClick={handleComplete}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    {t('common.loading', 'Loading...')}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {t('admin.done', 'Done')}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCustomerWizard;
