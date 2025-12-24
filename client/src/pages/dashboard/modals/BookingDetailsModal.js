/*
 * BookingDetailsModal - Display booking details with status update and refund actions
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React from 'react';
import { X } from 'lucide-react';

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
  isRefunding,
  isUpdating,
}) => {
  if (!booking) return null;

  const canRefund = booking.stripePaymentIntentId && 
    (booking.paymentStatus === 'Paid' || booking.paymentStatus === 'succeeded') && 
    !['Cancelled', 'Completed', 'cancelled', 'completed'].includes(booking.status) &&
    (!booking.refundRecords || booking.refundRecords.length === 0);

  const canUpdateStatus = !['Completed', 'completed', 'Cancelled', 'cancelled'].includes(booking.status);

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

            {/* Status */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {t('admin.status', 'Status')}
              </h4>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getBookingStatusColor(booking.status)}`}>
                {formatBookingStatus(booking.status)}
              </span>
              {canUpdateStatus && (
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
                  disabled={isUpdating} 
                  className="btn-primary"
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
    </div>
  );
};

export default BookingDetailsModal;
