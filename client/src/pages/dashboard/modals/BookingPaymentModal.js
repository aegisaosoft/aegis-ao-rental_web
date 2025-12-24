/*
 * BookingPaymentModal - Modal for booking total payment
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState } from 'react';

const BookingPaymentModal = ({
  t,
  booking,
  formatPrice,
  onClose,
  onProcessPayment,
  isProcessing = false,
}) => {
  const [paymentMethod, setPaymentMethod] = useState('');

  const handleClose = () => {
    setPaymentMethod('');
    onClose();
  };

  const handleProcess = () => {
    onProcessPayment({
      bookingId: booking.id,
      paymentMethod,
    });
  };

  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={() => !isProcessing && handleClose()}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div className="flex items-center">
              <svg className="h-6 w-6 text-white mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {t('admin.payBooking', 'Pay Booking')}
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                  {booking.bookingNumber || booking.BookingNumber || ''}
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white px-6 py-4">
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  {t('admin.bookingPaymentRequired', 'Please select a payment method to complete the booking payment.')}
                </p>
              </div>

              {/* Payment Method Selection */}
              <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  {t('admin.selectPaymentMethod', 'Select Payment Method')}
                </h4>
                <div className="space-y-3">
                  {/* Card Reader Option */}
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'terminal' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-300 bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="bookingPaymentMethod"
                      value="terminal"
                      checked={paymentMethod === 'terminal'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">
                          {t('admin.cardReader', 'Card Reader (Stripe Terminal)')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 ml-7 mt-1">
                        {t('admin.cardReaderDesc', 'Customer taps/swipes card on physical reader')}
                      </p>
                    </div>
                  </label>

                  {/* Stripe Checkout Option */}
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'checkout' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-300 bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="bookingPaymentMethod"
                      value="checkout"
                      checked={paymentMethod === 'checkout'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">
                          {t('admin.stripeCheckout', 'Stripe Checkout Page')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 ml-7 mt-1">
                        {t('admin.stripeCheckoutDesc', 'Redirect to secure Stripe payment page to enter card')}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">{t('admin.customerName', 'Customer')}</span>
                  <span className="text-sm font-medium text-gray-900">{booking.customerName || booking.CustomerName}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">{t('admin.vehicleName', 'Vehicle')}</span>
                  <span className="text-sm font-medium text-gray-900">{booking.vehicleName || booking.VehicleName}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">{t('admin.bookingDates', 'Booking Dates')}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(booking.pickupDate || booking.PickupDate).toLocaleDateString()} - {new Date(booking.returnDate || booking.ReturnDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-600 mb-2">{t('admin.bookingTotalAmount', 'Booking Total Amount')}</p>
                <p className="text-4xl font-bold text-green-600">
                  {formatPrice(parseFloat(booking.totalAmount || booking.TotalAmount || 0))}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
            <button
              type="button"
              onClick={handleProcess}
              disabled={isProcessing || !paymentMethod}
              className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-base font-medium text-white hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!paymentMethod ? t('admin.selectPaymentMethodFirst', 'Please select a payment method first') : ''}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('common.processing', 'Processing...')}
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {t('admin.processPayment', 'Process Payment')}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPaymentModal;
