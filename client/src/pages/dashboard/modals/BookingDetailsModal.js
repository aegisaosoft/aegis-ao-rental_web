/*
 * BookingDetailsModal - Display booking details with status update and refund actions
 *
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useEffect } from 'react';
import { X, FileText, ExternalLink, Loader2, Send, PenTool, CheckCircle, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../../services/api';

// ============== SEND METHOD DIALOG ==============
const SendMethodDialog = ({ t, isOpen, onClose, onSelect, isSending, booking }) => {
  if (!isOpen) return null;

  const hasPhone = !!booking?.customerPhone;
  const hasEmail = !!booking?.customerEmail;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {t('admin.sendAgreementTitle', 'Send Agreement')}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {t('admin.sendAgreementDescription', 'Choose how to send the agreement link to the customer:')}
        </p>

        <div className="space-y-2">
          {/* Email option */}
          <button
            onClick={() => onSelect('email')}
            disabled={isSending || !hasEmail}
            className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {t('admin.sendViaEmail', 'Email')}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {hasEmail ? booking.customerEmail : t('admin.noEmail', 'No email available')}
              </p>
            </div>
            {isSending === 'email' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
          </button>

          {/* SMS option */}
          <button
            onClick={() => onSelect('sms')}
            disabled={isSending || !hasPhone}
            className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {t('admin.sendViaSms', 'SMS')}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {hasPhone ? booking.customerPhone : t('admin.noPhone', 'No phone available')}
              </p>
            </div>
            {isSending === 'sms' && <Loader2 className="h-4 w-4 animate-spin text-green-600" />}
          </button>
        </div>

        <button
          onClick={onClose}
          disabled={!!isSending}
          className="mt-4 w-full px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {t('common.cancel', 'Cancel')}
        </button>
      </div>
    </div>
  );
};

// ============== MAIN MODAL ==============
const BookingDetailsModal = ({
  t,
  booking,
  formatPrice,
  formatDate,
  formatBookingStatus,
  getBookingStatusColor,
  onClose,
  onRefund,
  onUpdateStatus,
  onSignAgreement,
  isRefunding,
  isUpdating,
}) => {
  // State for PDF loading
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  // State for agreement status
  const [agreementStatus, setAgreementStatus] = useState('loading');
  const [agreementData, setAgreementData] = useState(null);

  // State for send method dialog
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendingMethod, setSendingMethod] = useState(false); // false | 'email' | 'sms'

  // Check agreement status on mount — must be before any conditional returns
  useEffect(() => {
    if (!booking?.id) return;

    const checkAgreement = async () => {
      setAgreementStatus('loading');
      try {
        const response = await api.getRentalAgreement(booking.id);
        const agreement = response.data;

        if (agreement?.pdfUrl && agreement?.signatureImage) {
          setAgreementStatus('signed');
          setAgreementData(agreement);
        } else {
          setAgreementStatus('unsigned');
          setAgreementData(agreement);
        }
      } catch (err) {
        setAgreementStatus('unsigned');
      }
    };

    checkAgreement();
  }, [booking?.id]);

  if (!booking) return null;

  const canRefund = booking.stripePaymentIntentId &&
    (booking.paymentStatus === 'Paid' || booking.paymentStatus === 'succeeded') &&
    !['Cancelled', 'Completed', 'cancelled', 'completed'].includes(booking.status) &&
    (!booking.refundRecords || booking.refundRecords.length === 0);

  const canUpdateStatus = !['Completed', 'completed', 'Cancelled', 'cancelled'].includes(booking.status);

  // Handler to fetch and open rental agreement PDF
  const handleShowPdf = async () => {
    setPdfLoading(true);
    setPdfError(null);

    try {
      if (agreementData?.pdfUrl) {
        window.open(agreementData.pdfUrl, '_blank', 'noopener,noreferrer');
      } else {
        const response = await api.getRentalAgreement(booking.id);
        const agreement = response.data;

        if (agreement?.pdfUrl) {
          window.open(agreement.pdfUrl, '_blank', 'noopener,noreferrer');
        } else {
          setPdfError(t('admin.pdfNotAvailable', 'Rental agreement PDF is not available for this booking'));
        }
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setPdfError(t('admin.noAgreementFound', 'No rental agreement found for this booking'));
      } else {
        setPdfError(t('admin.errorFetchingAgreement', 'Error fetching rental agreement'));
      }
    } finally {
      setPdfLoading(false);
    }
  };

  // Handler — open send method dialog
  const handleSendAgreementClick = () => {
    setShowSendDialog(true);
  };

  // Handler — send agreement via chosen method
  const handleSendMethodSelect = async (method) => {
    setSendingMethod(method);
    try {
      await api.sendAgreementLink(booking.id, { method });
      // Agreement link sent
      setShowSendDialog(false);
    } catch (err) {
      const errorMessage = err.response?.data?.message || t('admin.agreementSendFailed', 'Failed to send agreement link');
      toast.error(errorMessage);
    } finally {
      setSendingMethod(false);
    }
  };

  // Handler for sign agreement (opens signing modal)
  const handleSignAgreement = () => {
    if (onSignAgreement) {
      onSignAgreement(booking);
    }
  };

  // Agreement is signed?
  const isSigned = agreementStatus === 'signed';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {t('admin.bookingDetails', 'Booking Details')} - {booking.bookingNumber}
              </h3>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-4 space-y-4">
            {/* Customer Information */}
            <div className="border-b pb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {t('admin.customerInformation', 'Customer')}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">{t('admin.name', 'Name')}</p>
                  <p className="text-sm font-medium">{booking.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('admin.email', 'Email')}</p>
                  <p className="text-sm font-medium">{booking.customerEmail}</p>
                </div>
                {booking.customerPhone && (
                  <div>
                    <p className="text-xs text-gray-500">{t('admin.phone', 'Phone')}</p>
                    <p className="text-sm font-medium">{booking.customerPhone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle */}
            <div className="border-b pb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {t('admin.vehicle', 'Vehicle')}
              </h4>
              <p className="text-sm font-medium">{booking.vehicleName}</p>
              {booking.vehiclePlate && (
                <p className="text-xs text-gray-500">{booking.vehiclePlate}</p>
              )}
            </div>

            {/* Dates */}
            <div className="border-b pb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {t('admin.bookingDates', 'Dates')}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">{t('admin.pickupDate', 'Pickup')}</p>
                  <p className="text-sm font-medium">{formatDate(booking.pickupDate)}</p>
                  {booking.pickupLocation && (
                    <p className="text-xs text-gray-500">{booking.pickupLocation}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('admin.returnDate', 'Return')}</p>
                  <p className="text-sm font-medium">{formatDate(booking.returnDate)}</p>
                  {booking.returnLocation && (
                    <p className="text-xs text-gray-500">{booking.returnLocation}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="border-b pb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {t('admin.pricing', 'Pricing')}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">{t('admin.totalAmount', 'Total')}</p>
                  <p className="text-sm font-medium">{formatPrice(booking.totalAmount || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('admin.securityDeposit', 'Security Deposit')}</p>
                  <p className="text-sm font-medium">{formatPrice(booking.securityDeposit || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('admin.paymentStatus', 'Payment')}</p>
                  <p className="text-sm font-medium">
                    {booking.paymentStatus || t('admin.unpaid', 'Unpaid')}
                  </p>
                </div>
                {booking.paymentMethod && (
                  <div>
                    <p className="text-xs text-gray-500">{t('admin.paymentMethod', 'Method')}</p>
                    <p className="text-sm font-medium">{booking.paymentMethod}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Security Deposit Status */}
            {booking.securityDepositPaymentIntentId && (
              <div className="border-b pb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {t('admin.securityDepositStatus', 'Security Deposit Status')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">{t('admin.status', 'Status')}</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      booking.securityDepositStatus === 'captured'
                        ? 'bg-red-100 text-red-800'
                        : booking.securityDepositStatus === 'released'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {booking.securityDepositStatus || 'authorized'}
                    </span>
                  </div>
                  {booking.securityDepositChargedAmount > 0 && (
                    <div>
                      <p className="text-xs text-gray-500">{t('admin.chargedAmount', 'Charged')}</p>
                      <p className="text-sm font-medium text-red-600">
                        {formatPrice(booking.securityDepositChargedAmount)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Refund History */}
            {booking.refundRecords && booking.refundRecords.length > 0 && (
              <div className="border-b pb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {t('admin.refundHistory', 'Refund History')}
                </h4>
                <div className="space-y-2">
                  {booking.refundRecords.map((refund) => (
                    <div key={refund.id} className="bg-red-50 border border-red-200 rounded p-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-red-700">
                          {formatPrice(refund.amount)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(refund.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {refund.reason && (
                        <p className="text-xs text-gray-600 mt-1">{refund.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rental Agreement Section */}
            <div className="border-b pb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                <FileText className="h-4 w-4 inline mr-1" />
                {t('admin.rentalAgreement', 'Rental Agreement')}
              </h4>

              {agreementStatus === 'loading' ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('common.loading', 'Loading...')}
                </div>
              ) : isSigned ? (
                /* Agreement IS signed — show signed badge + Show PDF button */
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {t('admin.agreementSigned', 'Agreement signed')}
                    </span>
                    {agreementData?.signedAt && (
                      <span className="text-xs text-green-600 ml-auto">
                        {new Date(agreementData.signedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleShowPdf}
                    disabled={pdfLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pdfLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('common.loading', 'Loading...')}
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4" />
                        {t('admin.showAgreementPdf', 'Show Agreement PDF')}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Agreement NOT signed — show Send + Sign buttons */
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {t('admin.agreementNotSigned', 'Agreement not signed')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSendAgreementClick}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      {t('admin.sendAgreementToSign', 'Send Agreement to Sign')}
                    </button>
                    <button
                      onClick={handleSignAgreement}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <PenTool className="h-4 w-4" />
                      {t('admin.signAgreement', 'Sign Agreement')}
                    </button>
                  </div>
                </div>
              )}

              {pdfError && (
                <p className="text-sm text-amber-600 mt-2">{pdfError}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {t('admin.status', 'Status')}
              </h4>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getBookingStatusColor(booking.status)}`}>
                {formatBookingStatus(booking.status)}
              </span>
              {canUpdateStatus && !isSigned && agreementStatus !== 'loading' && (
                <p className="text-xs text-amber-600 mt-2">
                  {t('admin.signAgreementBeforeNext', 'Agreement must be signed before advancing status')}
                </p>
              )}
              {canUpdateStatus && isSigned && (
                <p className="text-xs text-gray-500 mt-2">
                  {t('admin.clickNextToAdvance', 'Click "Next" to advance booking status')}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between">
            <div>
              {canRefund && (
                <button
                  onClick={onRefund}
                  disabled={isRefunding}
                  className="btn-outline border-red-600 text-red-600 hover:bg-red-50"
                >
                  {isRefunding
                    ? t('admin.processing', 'Processing...')
                    : t('admin.refundPayment', 'Refund')}
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="btn-outline"
              >
                {t('common.close', 'Close')}
              </button>
              {canUpdateStatus && (
                <button
                  onClick={onUpdateStatus}
                  disabled={isUpdating || !isSigned}
                  className={`btn-primary ${!isSigned ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={!isSigned ? t('admin.signAgreementBeforeNext', 'Agreement must be signed before advancing status') : ''}
                >
                  {isUpdating
                    ? t('common.saving', 'Saving...')
                    : t('common.next', 'Next')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Send Method Dialog */}
      <SendMethodDialog
        t={t}
        isOpen={showSendDialog}
        onClose={() => setShowSendDialog(false)}
        onSelect={handleSendMethodSelect}
        isSending={sendingMethod}
        booking={booking}
      />
    </div>
  );
};

export default BookingDetailsModal;
