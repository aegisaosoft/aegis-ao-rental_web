/*
 * License Auto-Fill Hook
 * React hook for managing license data auto-fill functionality
 *
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getScannedLicenseData,
  hasScannedLicenseData,
  clearScannedLicenseData,
  autoFillCustomerForm,
  getAutoFillSuggestions,
  validateAutoFilledData,
  getDataConfidence,
  getProcessingMethod
} from '../utils/licenseAutoFill';

/**
 * Hook for managing license data auto-fill functionality
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoFillOnMount - Automatically apply auto-fill when component mounts
 * @param {boolean} options.showSuggestions - Show suggestions UI instead of direct auto-fill
 * @param {string[]} options.excludeFields - Fields to exclude from auto-fill
 * @param {Function} options.onAutoFill - Callback when auto-fill is applied
 * @param {Function} options.onValidation - Callback when validation is performed
 * @returns {Object} Auto-fill state and functions
 */
export const useLicenseAutoFill = (options = {}) => {
  const {
    autoFillOnMount = false,
    showSuggestions = false,
    excludeFields = [],
    onAutoFill,
    onValidation
  } = options;

  // State
  const [isAvailable, setIsAvailable] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [processingMethod, setProcessingMethod] = useState('unknown');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize and check for available data
  useEffect(() => {
    const initializeAutoFill = () => {
      const available = hasScannedLicenseData();
      setIsAvailable(available);

      if (available) {
        const data = getScannedLicenseData();
        setScannedData(data);
        setConfidence(getDataConfidence());
        setProcessingMethod(getProcessingMethod());

        console.log('License auto-fill debug:', {
          confidence: getDataConfidence(),
          method: getProcessingMethod(),
          fields: Object.keys(data || {}).filter(key => !key.startsWith('_'))
        });
      }
    };

    initializeAutoFill();

    // Listen for storage changes (if license is scanned in another tab/window)
    const handleStorageChange = (event) => {
      if (event.key === 'licenseDataExtracted' || event.key === 'scannedLicenseData') {
        initializeAutoFill();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Apply auto-fill to form data
   */
  const applyAutoFill = useCallback((currentFormData, autoFillOptions = {}) => {
    if (!isAvailable) {
      return currentFormData;
    }

    setIsLoading(true);

    try {
      const updatedData = autoFillCustomerForm(currentFormData, {
        excludeFields,
        ...autoFillOptions
      });

      // Perform validation
      const validation = validateAutoFilledData(updatedData);
      setValidationResult(validation);

      console.log('Auto-fill update:', {
        fieldsUpdated: Object.keys(updatedData).filter(key =>
          !key.startsWith('_') && updatedData[key] !== currentFormData[key]
        ),
        validation: {
          isValid: validation.isValid,
          warnings: validation.warnings.length,
          errors: validation.errors.length
        }
      });

      // Call callbacks
      onAutoFill?.(updatedData, validation);
      onValidation?.(validation);

      return updatedData;
    } catch (error) {
      return currentFormData;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, excludeFields, onAutoFill, onValidation]);

  /**
   * Generate auto-fill suggestions
   */
  const generateSuggestions = useCallback((currentFormData, suggestionOptions = {}) => {
    if (!isAvailable) return null;

    setIsLoading(true);

    try {
      const result = getAutoFillSuggestions(currentFormData, {
        excludeFields,
        ...suggestionOptions
      });

      setSuggestions(result);

      console.log('Suggestions generated:', {
        suggestionsCount: result ? Object.keys(result.suggestions).length : 0,
        confidence: result?.metadata.confidence
      });

      return result;
    } catch (error) {
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, excludeFields]);

  /**
   * Apply specific suggestion
   */
  const applySuggestion = useCallback((fieldName, suggestedValue, currentFormData) => {
    if (!suggestions?.suggestions[fieldName]) {
      return currentFormData;
    }

    const updatedData = {
      ...currentFormData,
      [fieldName]: suggestedValue
    };


    return updatedData;
  }, [suggestions]);

  /**
   * Apply all suggestions
   */
  const applyAllSuggestions = useCallback((currentFormData) => {
    if (!suggestions) return currentFormData;

    const updatedData = { ...currentFormData };
    const appliedFields = [];

    Object.entries(suggestions.suggestions).forEach(([fieldName, suggestion]) => {
      updatedData[fieldName] = suggestion.suggested;
      appliedFields.push(fieldName);
    });


    // Perform validation on updated data
    const validation = validateAutoFilledData(updatedData);
    setValidationResult(validation);
    onValidation?.(validation);

    return updatedData;
  }, [suggestions, onValidation]);

  /**
   * Clear scanned data and reset state
   */
  const clearData = useCallback(() => {
    clearScannedLicenseData();
    setIsAvailable(false);
    setScannedData(null);
    setSuggestions(null);
    setValidationResult(null);
    setConfidence(0);
    setProcessingMethod('unknown');

  }, []);

  /**
   * Validate current form data against scanned data
   */
  const validateFormData = useCallback((formData) => {
    const validation = validateAutoFilledData(formData);
    setValidationResult(validation);
    onValidation?.(validation);
    return validation;
  }, [onValidation]);

  /**
   * Get summary of available data
   */
  const getDataSummary = useCallback(() => {
    if (!isAvailable || !scannedData) return null;

    const availableFields = Object.keys(scannedData)
      .filter(key => !key.startsWith('_') && scannedData[key])
      .sort();

    return {
      confidence,
      processingMethod,
      availableFields,
      scannedAt: scannedData.extractionTimestamp,
      summary: `${availableFields.length} fields available (${Math.round(confidence * 100)}% confidence)`
    };
  }, [isAvailable, scannedData, confidence, processingMethod]);

  // Auto-fill on mount if requested
  useEffect(() => {
    if (autoFillOnMount && isAvailable && !showSuggestions) {
      // This would need to be called by the parent component with actual form data
    }
  }, [autoFillOnMount, isAvailable, showSuggestions]);

  return {
    // State
    isAvailable,
    isLoading,
    scannedData,
    suggestions,
    validationResult,
    confidence,
    processingMethod,

    // Functions
    applyAutoFill,
    generateSuggestions,
    applySuggestion,
    applyAllSuggestions,
    validateFormData,
    clearData,
    getDataSummary,

    // Helper properties
    hasWarnings: validationResult?.warnings.length > 0,
    hasErrors: validationResult?.errors.length > 0,
    isHighConfidence: confidence >= 0.8,
    isMediumConfidence: confidence >= 0.6 && confidence < 0.8,
    isLowConfidence: confidence < 0.6,

    // Data source info
    isFromBarcode: processingMethod.includes('pdf417') || processingMethod.includes('barcode'),
    isFromOCR: processingMethod.includes('document_ai') || processingMethod.includes('ocr'),

    // Counts for UI
    suggestionsCount: suggestions ? Object.keys(suggestions.suggestions).length : 0,
    warningsCount: validationResult?.warnings.length || 0,
    errorsCount: validationResult?.errors.length || 0
  };
};