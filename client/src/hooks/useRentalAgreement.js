/*
 * useRentalAgreement Hook
 * Copyright (c) 2025 Alexander Orlov.
 * 
 * Custom hook to manage rental agreement state and logic
 */

import { useState, useCallback } from 'react';
import { getConsentTexts } from '../pages/RentalAgreementStep';

const RULE_KEYS = [
  'ruleProhibitedDriver',
  'ruleUnder25',
  'ruleAlcohol',
  'ruleNoSmoking',
  'ruleLostKeys',
  'rulePassengerCapacity',
  'ruleCleaningFee',
  'ruleTires',
  'ruleTickets',
  'rule24Hour',
  'ruleNoCellPhone',
  'ruleCardAuthorization',
  'ruleSmsConsent',
  'ruleTermsAgreement',
];

const INITIAL_CONSENTS = RULE_KEYS.reduce((acc, key) => {
  acc[key] = false;
  acc[`${key}AcceptedAt`] = null;
  return acc;
}, {});

/**
 * Custom hook for managing rental agreement state and operations
 * @param {string} language - Current language for consent texts
 * @returns {Object} Rental agreement state and functions
 */
export const useRentalAgreement = (language = 'en') => {
  // Modal state
  const [isRentalAgreementModalOpen, setIsRentalAgreementModalOpen] = useState(false);

  // Agreement signature (base64 image)
  const [agreementSignature, setAgreementSignature] = useState(null);

  // Agreement consents
  const [agreementConsents, setAgreementConsents] = useState(INITIAL_CONSENTS);

  /**
   * Reset agreement state to initial values
   */
  const resetAgreement = useCallback(() => {
    setAgreementSignature(null);
    setAgreementConsents(INITIAL_CONSENTS);
  }, []);

  /**
   * Open the rental agreement modal
   */
  const openAgreementModal = useCallback(() => {
    setIsRentalAgreementModalOpen(true);
  }, []);

  /**
   * Close the rental agreement modal
   */
  const closeAgreementModal = useCallback(() => {
    setIsRentalAgreementModalOpen(false);
  }, []);

  /**
   * Build agreement data object for booking API
   * @param {string} currentLanguage - Current language (defaults to hook language)
   * @returns {Object|null} Agreement data object or null if no signature
   */
  const buildAgreementData = useCallback((currentLanguage = language) => {
    if (!agreementSignature) {
      return null;
    }

    // Build consents object using actual rule keys
    const consents = {};
    RULE_KEYS.forEach(key => {
      const acceptedAtKey = `${key}AcceptedAt`;
      if (agreementConsents[acceptedAtKey]) {
        consents[acceptedAtKey] = agreementConsents[acceptedAtKey];
      }
    });

    return {
      signatureImage: agreementSignature,
      language: currentLanguage,
      consents: consents,
      consentTexts: getConsentTexts(currentLanguage),
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      signedAt: new Date().toISOString(),
    };
  }, [agreementSignature, agreementConsents, language]);

  /**
   * Check if agreement is signed
   * @returns {boolean} True if agreement signature exists
   */
  const isAgreementSigned = useCallback(() => {
    return !!agreementSignature;
  }, [agreementSignature]);

  /**
   * Get agreement data for logging/debugging
   * @returns {Object} Debug information about agreement state
   */
  const getAgreementDebugInfo = useCallback(() => {
    const hasConsents = {};
    RULE_KEYS.forEach(key => {
      const acceptedAtKey = `${key}AcceptedAt`;
      hasConsents[key] = !!agreementConsents[acceptedAtKey];
    });

    return {
      hasAgreementSignature: !!agreementSignature,
      agreementSignatureLength: agreementSignature?.length || 0,
      hasConsents,
      totalConsents: RULE_KEYS.length,
      acceptedConsents: Object.values(hasConsents).filter(Boolean).length,
    };
  }, [agreementSignature, agreementConsents]);

  return {
    // State
    isRentalAgreementModalOpen,
    agreementSignature,
    agreementConsents,
    
    // Setters
    setIsRentalAgreementModalOpen,
    setAgreementSignature,
    setAgreementConsents,
    
    // Functions
    resetAgreement,
    openAgreementModal,
    closeAgreementModal,
    buildAgreementData,
    isAgreementSigned,
    getAgreementDebugInfo,
  };
};

export default useRentalAgreement;
