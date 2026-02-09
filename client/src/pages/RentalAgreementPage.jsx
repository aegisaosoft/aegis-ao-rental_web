/*
 * Rental Agreement Page
 * Standalone page for viewing/signing rental agreements
 * URL: /rental-agreement/:bookingId
 * Copyright (c) 2025 Alexander Orlov.
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RentalAgreementView from '../components/RentalAgreementView';
import { useRentalAgreement } from '../hooks/useRentalAgreement';
import api from '../services/api';
import { toast } from 'react-toastify';

const RentalAgreementPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Use rental agreement hook for state management
  const {
    agreementSignature,
    setAgreementSignature,
    agreementConsents,
    setAgreementConsents,
  } = useRentalAgreement(i18n.language || 'en');

  const handleConfirm = async ({ signature, consents }) => {
    try {
      // Build consent texts
      const consentTexts = {};
      Object.keys(consents).forEach(key => {
        if (!key.endsWith('AcceptedAt') && consents[key]) {
          consentTexts[key] = true;
        }
      });

      const agreementData = {
        signatureImage: signature,
        language: i18n.language || 'en',
        consents: consents,
        consentTexts: consentTexts,
        signedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      console.log('Signing agreement:', {
        bookingId,
        hasSignature: !!agreementData.signatureImage,
        signatureLength: agreementData.signatureImage?.length || 0,
        language: agreementData.language,
        consents: agreementData.consents,
        consentTexts: agreementData.consentTexts,
        signedAt: agreementData.signedAt
      });

      await api.signBookingAgreement(bookingId, agreementData);



      // Reload page to show PDF
      window.location.reload();
      
    } catch (error) {
      console.error('Agreement signing error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        bookingId
      });

      if (error.response?.status === 404) {
      } else if (error.response?.status === 400) {
      } else if (error.response?.status === 500) {
      }

      toast.error(t('bookPage.agreementSignError', 'Error signing agreement. Please try again.'));
    }
  };

  const handleClose = () => {
    navigate(-1); // Go back
  };

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t('common.error', 'Error')}
          </h2>
          <p className="text-gray-600">
            {t('bookPage.noBookingId', 'Booking ID is required')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('common.goHome', 'Go Home')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <RentalAgreementView
      bookingId={bookingId}
      language={i18n.language || 'en'}
      onConfirm={handleConfirm}
      onClose={handleClose}
      isPage={true}
      t={t}
      signatureData={agreementSignature}
      setSignatureData={setAgreementSignature}
      consents={agreementConsents}
      setConsents={setAgreementConsents}
    />
  );
};

export default RentalAgreementPage;
