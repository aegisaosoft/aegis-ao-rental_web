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
  // Legacy props (for backward compatibility)
  rentalInfo,
  consents,
  setConsents,
  signatureData,
  setSignatureData,
  loading,
  agreementData,
}) => {
  if (!isOpen) return null;

  // Get bookingId from various sources for backward compatibility
  const resolvedBookingId = bookingId || rentalInfo?.bookingId || agreementData?.bookingId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-5xl h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors bg-white shadow-md"
          title={t('common.close', 'Close')}
        >
          <X className="h-5 w-5" />
        </button>
        
        {/* Content */}
        <RentalAgreementView
          bookingId={resolvedBookingId}
          rentalInfo={rentalInfo}
          language={language}
          onConfirm={onConfirm}
          onClose={onClose}
          viewMode={viewMode}
          formatPrice={formatPrice}
          isPage={false}
          t={t}
        />
      </div>
    </div>
  );
};

export default RentalAgreementModal;
