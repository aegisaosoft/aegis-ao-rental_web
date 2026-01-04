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
  
  // Created customer (after step 2, before photos)
  const [createdCustomer, setCreatedCustomer] = useState(null);
  
  // License images state
  const [uploadedImages, setUploadedImages] = useState({ front: null, back: null });
  const [localPreviews, setLocalPreviews] = useState({ front: null, back: null });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Reset form when wizard opens
  useEffect(() => {
    if (isOpen) {
      setWizardStep(1);
      setFormData({
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
      });
      setCreatedCustomer(null);
      setUploadedImages({ front: null, back: null });
      setLocalPreviews({ front: null, back: null });
      setError('');
    }
  }, [isOpen, initialEmail]);
  
  // Handle form field changes
  const handleFieldChange = useCallback((name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);
  
  // Validate step 1 (basic info)
  const validateStep1 = useCallback(() => {
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
    setError('');
    return true;
  }, [formData, t]);
  
  // Create customer and move to step 3
  const handleCreateAndContinue = useCallback(async () => {
    if (wizardStep === 1 && !validateStep1()) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
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
        driversLicense: formData.licenseNumber.trim(),
        driversLicenseState: formData.licenseState.trim(),
        driversLicenseExpiry: formData.licenseExpiry || null,
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
      setWizardStep(3); // Go to photos step
      
    } catch (err) {
      console.error('Error creating customer:', err);
      setError(err.response?.data?.message || err.message || t('admin.customerCreateError', 'Failed to create customer'));
    } finally {
      setLoading(false);
    }
  }, [formData, companyId, wizardStep, validateStep1, t]);
  
  // Handle next step
  const handleNext = useCallback(() => {
    if (wizardStep === 1 && validateStep1()) {
      setWizardStep(2);
    } else if (wizardStep === 2) {
      // Create customer and go to step 3
      handleCreateAndContinue();
    }
  }, [wizardStep, validateStep1, handleCreateAndContinue]);
  
  // Handle previous step
  const handleBack = useCallback(() => {
    if (wizardStep > 1 && wizardStep < 3) {
      setWizardStep(wizardStep - 1);
      setError('');
    }
  }, [wizardStep]);
  
  // Complete wizard (after photos or skip)
  const handleComplete = useCallback(() => {
    if (createdCustomer) {
      toast.success(t('admin.customerCreated', 'Customer created successfully'));
      onComplete(createdCustomer);
      onClose();
    }
  }, [createdCustomer, onComplete, onClose, t]);
  
  // Skip photos step
  const handleSkipPhotos = useCallback(() => {
    handleComplete();
  }, [handleComplete]);
  
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
              { num: 3, label: t('license.photos', 'License Photos') },
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
            <CustomerInfoFields
              data={formData}
              onChange={handleFieldChange}
              disabled={loading}
              showEmail={true}
              showPhone={true}
              showAddress={true}
              showDateOfBirth={true}
            />
          )}
          
          {/* Step 2: License Info */}
          {wizardStep === 2 && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                {t('license.optional', "Driver's license information is optional but recommended for rental agreements.")}
              </p>
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
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    {wizardStep === 2 ? t('admin.creating', 'Creating...') : t('common.loading', 'Loading...')}
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
                onClick={handleSkipPhotos}
                className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                {t('license.skipForNow', 'Skip for now')}
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
