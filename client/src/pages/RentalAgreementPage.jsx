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
import api from '../services/api';
import { toast } from 'react-toastify';

const RentalAgreementPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

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

      await api.signBookingAgreement(bookingId, agreementData);
      
      toast.success(t('bookPage.agreementSigned', 'Agreement signed successfully!'));
      
      // Reload page to show PDF
      window.location.reload();
      
    } catch (error) {
      console.error('Error signing agreement:', error);
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
    />
  );
};

export default RentalAgreementPage;
