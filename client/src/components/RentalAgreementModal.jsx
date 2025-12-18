/*
 * Rental Agreement Modal Component
 * Copyright (c) 2025 Alexander Orlov.
 */

import React, { useRef, useState, useEffect } from 'react';
import { X, FileText, Check } from 'lucide-react';
import { SignaturePad, ConsentCheckbox, getConsentTexts } from '../pages/RentalAgreementStep';

const RentalAgreementModal = ({
  isOpen,
  onClose,
  onConfirm,
  language = 'en',
  rentalInfo = {},
  formatPrice = (price) => `$${price?.toFixed(2) || '0.00'}`,
  consents = {
    terms: false,
    termsAcceptedAt: null,
    nonRefundable: false,
    nonRefundableAcceptedAt: null,
    damagePolicy: false,
    damagePolicyAcceptedAt: null,
    cardAuthorization: false,
    cardAuthorizationAcceptedAt: null,
  },
  setConsents,
  signatureData = null,
  setSignatureData,
  loading = false,
  viewMode = false, // If true, show read-only view
  agreementData = null, // For viewing existing agreements
  t = (key, defaultValue) => defaultValue,
}) => {
  const [localConsents, setLocalConsents] = useState(consents);
  const [localSignature, setLocalSignature] = useState(signatureData);

  const texts = getConsentTexts(language);

  // Sync with parent state
  useEffect(() => {
    if (!viewMode) {
      setLocalConsents(consents);
      setLocalSignature(signatureData);
    }
  }, [consents, signatureData, viewMode]);

  // If in view mode, use agreementData
  const displayConsents = viewMode && agreementData ? {
    terms: !!agreementData.consents?.termsAcceptedAt,
    nonRefundable: !!agreementData.consents?.nonRefundableAcceptedAt,
    damagePolicy: !!agreementData.consents?.damagePolicyAcceptedAt,
    cardAuthorization: !!agreementData.consents?.cardAuthorizationAcceptedAt,
  } : localConsents;

  const displaySignature = viewMode && agreementData?.signatureImage 
    ? agreementData.signatureImage 
    : localSignature;

  const handleConsentChange = (type, checked) => {
    if (viewMode) return; // Don't allow changes in view mode
    
    const now = checked ? new Date().toISOString() : null;
    const newConsents = {
      ...localConsents,
      [type]: checked,
      [`${type}AcceptedAt`]: now,
    };
    setLocalConsents(newConsents);
    if (setConsents) {
      setConsents(newConsents);
    }
  };

  const handleSignatureChange = (newSignature) => {
    if (viewMode) return; // Don't allow changes in view mode
    setLocalSignature(newSignature);
    if (setSignatureData) {
      setSignatureData(newSignature);
    }
  };

  const allConsentsAccepted = displayConsents.terms && 
    displayConsents.nonRefundable && 
    displayConsents.damagePolicy && 
    displayConsents.cardAuthorization;

  const canProceed = allConsentsAccepted && displaySignature;

  const handleConfirm = () => {
    if (viewMode) {
      onClose();
      return;
    }
    
    if (!canProceed) return;
    
    if (onConfirm) {
      onConfirm({
        signature: localSignature,
        consents: localConsents,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={viewMode ? onClose : undefined} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t('bookPage.agreementTitle', texts.agreementTitle)}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {viewMode 
                ? t('bookPage.viewAgreement', 'View Rental Agreement')
                : t('bookPage.agreementSubtitle', texts.agreementSubtitle)
              }
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
            disabled={loading}
            title={t('common.close', 'Close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Rental Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              {t('bookPage.rentalSummary', texts.rentalSummary)}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">{t('bookPage.vehicle', texts.vehicle)}:</span>
                <span className="ml-2 font-medium">{rentalInfo.vehicleName || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">{t('bookPage.pickupDate', texts.pickupDate)}:</span>
                <span className="ml-2 font-medium">{rentalInfo.pickupDate || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">{t('bookPage.returnDate', texts.returnDate)}:</span>
                <span className="ml-2 font-medium">{rentalInfo.returnDate || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">{t('bookPage.totalAmount', texts.totalAmount)}:</span>
                <span className="ml-2 font-medium">{formatPrice(rentalInfo.totalAmount || 0)}</span>
              </div>
              {rentalInfo.securityDeposit > 0 && (
                <div>
                  <span className="text-gray-600">{t('bookPage.securityDeposit', texts.securityDeposit)}:</span>
                  <span className="ml-2 font-medium">{formatPrice(rentalInfo.securityDeposit)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-4">
            <ConsentCheckbox
              id="consent-terms"
              checked={displayConsents.terms}
              onChange={(val) => handleConsentChange('terms', val)}
              title={texts.termsTitle}
              text={texts.termsText}
              disabled={loading || viewMode}
            />
            
            <ConsentCheckbox
              id="consent-nonrefundable"
              checked={displayConsents.nonRefundable}
              onChange={(val) => handleConsentChange('nonRefundable', val)}
              title={texts.nonRefundableTitle}
              text={texts.nonRefundableText}
              disabled={loading || viewMode}
            />
            
            <ConsentCheckbox
              id="consent-damage"
              checked={displayConsents.damagePolicy}
              onChange={(val) => handleConsentChange('damagePolicy', val)}
              title={texts.damagePolicyTitle}
              text={texts.damagePolicyText}
              disabled={loading || viewMode}
            />
            
            <ConsentCheckbox
              id="consent-card"
              checked={displayConsents.cardAuthorization}
              onChange={(val) => handleConsentChange('cardAuthorization', val)}
              title={texts.cardAuthorizationTitle}
              text={texts.cardAuthorizationText}
              disabled={loading || viewMode}
            />
          </div>

          {/* Signature Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('bookPage.signatureLabel', texts.signatureLabel)} {!viewMode && '*'}
            </label>
            <SignaturePad
              signatureData={displaySignature}
              onSignatureChange={handleSignatureChange}
              disabled={loading || viewMode}
            />
            {!viewMode && (
              <p className="text-xs text-gray-500">
                {t('bookPage.signatureHelper', texts.signatureHelper)}
              </p>
            )}
          </div>

          {/* Validation Messages */}
          {!viewMode && (
            <>
              {!allConsentsAccepted && (
                <p className="text-sm text-amber-600">
                  <Check className="h-4 w-4 inline mr-1" />
                  {t('bookPage.allConsentsRequired', texts.allConsentsRequired)}
                </p>
              )}
              {!displaySignature && (
                <p className="text-sm text-amber-600">
                  <Check className="h-4 w-4 inline mr-1" />
                  {t('bookPage.signatureRequired', texts.signatureRequired)}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            disabled={loading}
          >
            {viewMode ? t('common.close', 'Close') : t('common.cancel', 'Cancel')}
          </button>
          {!viewMode && (
            <button
              type="button"
              onClick={handleConfirm}
              className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                canProceed
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={loading || !canProceed}
            >
              {t('bookPage.confirmAgreement', 'Confirm & Continue')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RentalAgreementModal;

