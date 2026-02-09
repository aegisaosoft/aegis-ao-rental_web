/*
 * Rental Agreement Modal Component
 * Modal wrapper for RentalAgreementView
 * Copyright (c) 2025 Alexander Orlov.
 */

import React from 'react';
import { X } from 'lucide-react';
import RentalAgreementView from './RentalAgreementView';

const RentalAgreementModal = ({
  isOpen,
  onClose,
  onConfirm,
  language = 'en',
  bookingId = null,
  viewMode = false,
  t = (key, defaultValue) => defaultValue,
  formatPrice = (price) => `$${price?.toFixed(2) || '0.00'}`,
  // State management props
  consents,
  setConsents,
  signatureData,
  setSignatureData,
  loading,
  // All data now loads from database via bookingId
}) => {
  if (!isOpen) return null;

  // Validate required bookingId
  if (!bookingId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative bg-white rounded-2xl p-8 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-red-600 mb-4">Error</h3>
          <p className="text-gray-700 mb-4">Unable to load rental agreement: Missing booking ID</p>
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Debug props
  console.log('RentalAgreementModal props:', {
    isOpen,
    hasOnConfirm: !!onConfirm,
    bookingId,
    hasConsents: !!consents,
    hasSetConsents: !!setConsents,
    hasSignatureData: !!signatureData,
    hasSetSignatureData: !!setSignatureData,
    viewMode,
    language
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Background overlay - no onClick to prevent closing by clicking outside */}
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-5xl h-[90vh] rounded-2xl bg-white shadow-2xl border-2 border-blue-200 flex flex-col overflow-hidden">
        {/* Cancel button (renamed from Close) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors bg-white shadow-md"
          title={t('common.cancel', 'Cancel')}
        >
          <X className="h-5 w-5" />
        </button>
        
        {/* Content */}
        <RentalAgreementView
          bookingId={bookingId}
          language={language}
          onConfirm={onConfirm}
          onClose={onClose}
          viewMode={viewMode}
          formatPrice={formatPrice}
          isPage={false}
          t={t}
          consents={consents}
          setConsents={setConsents}
          signatureData={signatureData}
          setSignatureData={setSignatureData}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default RentalAgreementModal;
