/*
 * Customer Basic Form Component
 * Reusable component for customer information fields
 * Used in: AdminCustomerWizard, BookingWizard
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Basic customer info fields (name, email, phone, address)
 */
export const CustomerInfoFields = ({
  data,
  onChange,
  disabled = false,
  showEmail = true,
  emailRequired = true,
  showPhone = true,
  showAddress = true,
  showDateOfBirth = false,
  compact = false, // Single column layout
}) => {
  const { t } = useTranslation();
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };
  
  const gridClass = compact ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4';
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100";
  
  return (
    <div className={gridClass}>
      {/* Email */}
      {showEmail && (
        <div className={compact ? '' : 'md:col-span-2'}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('customer.email', 'Email')} {emailRequired && <span className="text-red-500">*</span>}
          </label>
          <input
            type="email"
            name="email"
            value={data.email || ''}
            onChange={handleChange}
            className={inputClass}
            placeholder="customer@example.com"
            disabled={disabled}
            required={emailRequired}
          />
        </div>
      )}
      
      {/* First Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('customer.firstName', 'First Name')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="firstName"
          value={data.firstName || ''}
          onChange={handleChange}
          className={inputClass}
          disabled={disabled}
          required
        />
      </div>
      
      {/* Last Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('customer.lastName', 'Last Name')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="lastName"
          value={data.lastName || ''}
          onChange={handleChange}
          className={inputClass}
          disabled={disabled}
          required
        />
      </div>
      
      {/* Phone */}
      {showPhone && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('customer.phone', 'Phone')}
          </label>
          <input
            type="tel"
            name="phone"
            value={data.phone || ''}
            onChange={handleChange}
            className={inputClass}
            placeholder="+1 (555) 123-4567"
            disabled={disabled}
          />
        </div>
      )}
      
      {/* Date of Birth */}
      {showDateOfBirth && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('customer.dateOfBirth', 'Date of Birth')}
          </label>
          <input
            type="date"
            name="dateOfBirth"
            value={data.dateOfBirth || ''}
            onChange={handleChange}
            className={inputClass}
            disabled={disabled}
          />
        </div>
      )}
      
      {/* Address */}
      {showAddress && (
        <>
          <div className={compact ? '' : 'md:col-span-2'}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('customer.address', 'Address')}
            </label>
            <input
              type="text"
              name="address"
              value={data.address || ''}
              onChange={handleChange}
              className={inputClass}
              placeholder="123 Main St"
              disabled={disabled}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('customer.city', 'City')}
            </label>
            <input
              type="text"
              name="city"
              value={data.city || ''}
              onChange={handleChange}
              className={inputClass}
              disabled={disabled}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('customer.state', 'State')}
            </label>
            <input
              type="text"
              name="state"
              value={data.state || ''}
              onChange={handleChange}
              className={inputClass}
              placeholder="NY"
              maxLength={2}
              disabled={disabled}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('customer.zipCode', 'Zip Code')}
            </label>
            <input
              type="text"
              name="zipCode"
              value={data.zipCode || ''}
              onChange={handleChange}
              className={inputClass}
              placeholder="10001"
              disabled={disabled}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('customer.country', 'Country')}
            </label>
            <select
              name="country"
              value={data.country || 'US'}
              onChange={handleChange}
              className={inputClass}
              disabled={disabled}
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="MX">Mexico</option>
              <option value="BR">Brazil</option>
              <option value="GB">United Kingdom</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="ES">Spain</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * License info fields (number, state, expiry, etc.)
 */
export const LicenseInfoFields = ({
  data,
  onChange,
  disabled = false,
  showIssueDate = true,
  showCountry = true,
  compact = false,
}) => {
  const { t } = useTranslation();
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };
  
  const gridClass = compact ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4';
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100";
  
  return (
    <div className={gridClass}>
      {/* License Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('license.number', 'License Number')}
        </label>
        <input
          type="text"
          name="licenseNumber"
          value={data.licenseNumber || ''}
          onChange={handleChange}
          className={inputClass}
          placeholder="DL12345678"
          disabled={disabled}
        />
      </div>
      
      {/* License State */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('license.state', 'Issuing State')}
        </label>
        <input
          type="text"
          name="licenseState"
          value={data.licenseState || ''}
          onChange={handleChange}
          className={inputClass}
          placeholder="NY"
          maxLength={2}
          disabled={disabled}
        />
      </div>
      
      {/* License Country */}
      {showCountry && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('license.country', 'Issuing Country')}
          </label>
          <select
            name="licenseCountry"
            value={data.licenseCountry || 'US'}
            onChange={handleChange}
            className={inputClass}
            disabled={disabled}
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="MX">Mexico</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      )}
      
      {/* Expiry Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('license.expiry', 'Expiry Date')}
        </label>
        <input
          type="date"
          name="licenseExpiry"
          value={data.licenseExpiry || ''}
          onChange={handleChange}
          className={inputClass}
          disabled={disabled}
        />
      </div>
      
      {/* Issue Date */}
      {showIssueDate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('license.issueDate', 'Issue Date')}
          </label>
          <input
            type="date"
            name="licenseIssueDate"
            value={data.licenseIssueDate || ''}
            onChange={handleChange}
            className={inputClass}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Combined customer form with all sections
 */
const CustomerBasicForm = ({
  data,
  onChange,
  disabled = false,
  showEmail = true,
  showLicenseInfo = true,
  showAddress = true,
  showDateOfBirth = false,
  compact = false,
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      {/* Basic Info Section */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          {t('customer.basicInfo', 'Basic Information')}
        </h4>
        <CustomerInfoFields
          data={data}
          onChange={onChange}
          disabled={disabled}
          showEmail={showEmail}
          showPhone={true}
          showAddress={showAddress}
          showDateOfBirth={showDateOfBirth}
          compact={compact}
        />
      </div>
      
      {/* License Info Section */}
      {showLicenseInfo && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            {t('license.info', "Driver's License Information")}
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            {t('license.optional', 'Optional but recommended for rental agreements')}
          </p>
          <LicenseInfoFields
            data={data}
            onChange={onChange}
            disabled={disabled}
            compact={compact}
          />
        </div>
      )}
    </div>
  );
};

export default CustomerBasicForm;
