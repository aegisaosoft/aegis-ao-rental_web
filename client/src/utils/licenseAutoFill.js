/*
 * License Auto-Fill Utilities
 * Utilities for auto-filling forms from scanned driver license data
 *
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

/**
 * Get scanned license data from localStorage
 * @returns {Object|null} Parsed license data or null if not available
 */
export const getScannedLicenseData = () => {
  try {
    const data = localStorage.getItem('scannedLicenseData');
    if (!data) return null;

    const parsedData = JSON.parse(data);

    // Check if data extraction was successful
    const wasExtracted = localStorage.getItem('licenseDataExtracted') === 'true';
    if (!wasExtracted) return null;

    return parsedData;
  } catch (error) {
    return null;
  }
};

/**
 * Check if scanned license data is available for auto-fill
 * @returns {boolean} True if data is available and valid
 */
export const hasScannedLicenseData = () => {
  const data = getScannedLicenseData();
  if (!data) return false;

  // Check if we have at least some critical fields
  return !!(data.firstName || data.lastName || data.licenseNumber);
};

/**
 * Clear scanned license data from localStorage
 */
export const clearScannedLicenseData = () => {
  localStorage.removeItem('scannedLicenseData');
  localStorage.removeItem('licenseDataExtracted');
  localStorage.removeItem('licenseScanned');
  localStorage.removeItem('scannedLicenseFront');
  localStorage.removeItem('scannedLicenseBack');
};

/**
 * Get confidence score for the scanned data
 * @returns {number} Confidence score between 0 and 1
 */
export const getDataConfidence = () => {
  const data = getScannedLicenseData();
  if (!data) return 0;

  return data.confidence || 0;
};

/**
 * Get processing method used for the data
 * @returns {string} Processing method (pdf417_barcode, document_ai_ocr, etc.)
 */
export const getProcessingMethod = () => {
  const data = getScannedLicenseData();
  if (!data) return 'unknown';

  return data.processingMethod || data.primarySource || 'unknown';
};

/**
 * Auto-fill customer form data from scanned license
 * @param {Object} currentFormData - Current form data
 * @param {Object} options - Auto-fill options
 * @param {boolean} options.overwriteExisting - Whether to overwrite existing values
 * @param {string[]} options.excludeFields - Fields to exclude from auto-fill
 * @returns {Object} Updated form data
 */
export const autoFillCustomerForm = (currentFormData = {}, options = {}) => {
  const {
    overwriteExisting = false,
    excludeFields = []
  } = options;

  const scannedData = getScannedLicenseData();
  if (!scannedData) {
    return currentFormData;
  }


  const updatedData = { ...currentFormData };

  // Field mapping from scanned data to form fields
  const fieldMappings = {
    // Personal Information
    firstName: 'firstName',
    lastName: 'lastName',
    middleName: 'middleName',
    dateOfBirth: 'dateOfBirth',

    // Contact Information (if phone number can be extracted)
    // phone: 'phone', // Not typically on license
    email: 'email', // Not on license, but may be in scanned data

    // Address Information
    address: 'address',
    city: 'city',
    state: 'state',
    zipCode: 'zipCode',
    postalCode: 'zipCode', // Alternative field name

    // License Information
    licenseNumber: 'licenseNumber',
    issuingState: 'licenseState',
    licenseState: 'licenseState', // Alternative field name
    expirationDate: 'licenseExpiry',
    issueDate: 'licenseIssueDate',

    // Additional fields that might be used
    sex: 'sex',
    height: 'height',
    eyeColor: 'eyeColor'
  };

  // Apply auto-fill logic
  Object.entries(fieldMappings).forEach(([scannedField, formField]) => {
    // Skip excluded fields
    if (excludeFields.includes(formField)) return;

    const scannedValue = scannedData[scannedField];
    const currentValue = updatedData[formField];

    // Only fill if scanned value exists
    if (!scannedValue) return;

    // Only overwrite if explicitly allowed or current value is empty
    if (!overwriteExisting && currentValue && currentValue.trim()) return;

    // Validate and format the value before setting
    const formattedValue = formatFieldValue(formField, scannedValue);
    if (formattedValue !== null) {
      updatedData[formField] = formattedValue;
    }
  });

  // Add metadata about the auto-fill
  updatedData._autoFillMetadata = {
    processingMethod: getProcessingMethod(),
    confidence: getDataConfidence(),
    filledAt: new Date().toISOString(),
    excludedFields: excludeFields
  };

  return updatedData;
};

/**
 * Format field value based on field type
 * @param {string} fieldName - Name of the form field
 * @param {string} value - Raw value from scanned data
 * @returns {string|null} Formatted value or null if invalid
 */
const formatFieldValue = (fieldName, value) => {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  switch (fieldName) {
    case 'firstName':
    case 'lastName':
    case 'middleName':
      // Capitalize first letter, lowercase the rest
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();

    case 'city':
      // Title case for city names
      return trimmed.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    case 'state':
    case 'licenseState':
      // Uppercase state codes
      return trimmed.toUpperCase();

    case 'zipCode':
      // Format ZIP codes (12345 or 12345-6789)
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length === 5) return digits;
      if (digits.length === 9) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
      return trimmed; // Return as-is if not standard format

    case 'licenseNumber':
      // Uppercase license numbers
      return trimmed.toUpperCase();

    case 'dateOfBirth':
    case 'licenseExpiry':
    case 'licenseIssueDate':
      // Validate and format dates
      if (isValidDate(trimmed)) {
        const date = new Date(trimmed);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      return null;

    case 'email':
      // Basic email validation
      if (trimmed.includes('@') && trimmed.includes('.')) {
        return trimmed.toLowerCase();
      }
      return null;

    default:
      return trimmed;
  }
};

/**
 * Validate date string
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid date
 */
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Get auto-fill suggestions for user confirmation
 * @param {Object} currentFormData - Current form data
 * @param {Object} options - Options for suggestions
 * @returns {Object} Auto-fill suggestions with metadata
 */
export const getAutoFillSuggestions = (currentFormData = {}, options = {}) => {
  const scannedData = getScannedLicenseData();
  if (!scannedData) return null;

  const suggestions = {};
  const filledData = autoFillCustomerForm(currentFormData, {
    overwriteExisting: true,
    ...options
  });

  // Compare current data with auto-filled data to find changes
  Object.keys(filledData).forEach(field => {
    if (field.startsWith('_')) return; // Skip metadata fields

    const currentValue = currentFormData[field];
    const suggestedValue = filledData[field];

    if (suggestedValue && suggestedValue !== currentValue) {
      suggestions[field] = {
        current: currentValue || '',
        suggested: suggestedValue,
        confidence: getDataConfidence(),
        source: getProcessingMethod()
      };
    }
  });

  return {
    suggestions,
    metadata: {
      processingMethod: getProcessingMethod(),
      confidence: getDataConfidence(),
      scannedAt: scannedData.extractionTimestamp || new Date().toISOString()
    }
  };
};

/**
 * Validate auto-filled data for common issues
 * @param {Object} formData - Form data to validate
 * @returns {Object} Validation results with warnings and errors
 */
export const validateAutoFilledData = (formData) => {
  const warnings = [];
  const errors = [];
  const suggestions = [];

  // Check date of birth
  if (formData.dateOfBirth) {
    const dob = new Date(formData.dateOfBirth);
    const age = new Date().getFullYear() - dob.getFullYear();

    if (age < 18) {
      warnings.push({
        field: 'dateOfBirth',
        message: 'Driver appears to be under 18 years old',
        severity: 'warning'
      });
    }

    if (age > 100) {
      warnings.push({
        field: 'dateOfBirth',
        message: 'Driver appears to be over 100 years old',
        severity: 'warning'
      });
    }
  }

  // Check license expiration
  if (formData.licenseExpiry) {
    const expiry = new Date(formData.licenseExpiry);
    const now = new Date();

    if (expiry < now) {
      errors.push({
        field: 'licenseExpiry',
        message: 'Driver license appears to be expired',
        severity: 'error'
      });
    }

    const monthsUntilExpiry = (expiry - now) / (1000 * 60 * 60 * 24 * 30);
    if (monthsUntilExpiry < 2 && monthsUntilExpiry > 0) {
      warnings.push({
        field: 'licenseExpiry',
        message: 'Driver license expires soon',
        severity: 'warning'
      });
    }
  }

  // Check for missing critical fields
  const criticalFields = ['firstName', 'lastName', 'licenseNumber'];
  criticalFields.forEach(field => {
    if (!formData[field] || !formData[field].trim()) {
      errors.push({
        field,
        message: `${field} is required but was not detected`,
        severity: 'error'
      });
    }
  });

  // Check confidence score
  const confidence = getDataConfidence();
  if (confidence < 0.7) {
    suggestions.push({
      message: `Data confidence is low (${Math.round(confidence * 100)}%). Please verify all fields carefully.`,
      severity: 'info'
    });
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    suggestions,
    confidence: getDataConfidence(),
    processingMethod: getProcessingMethod()
  };
};