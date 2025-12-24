/*
 * DamageConfirmationModal - Modal for confirming damage on booking completion
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState } from 'react';

const DamageConfirmationModal = ({
  t,
  booking,
  companySecurityDeposit = 0,
  currencySymbol = '$',
  formatPrice,
  onClose,
  onConfirm,
  isProcessing = false,
}) => {
  const [hasDamage, setHasDamage] = useState(false);
  const [damageAmount, setDamageAmount] = useState('');

  const handleClose = () => {
    setHasDamage(false);
    setDamageAmount('');
    onClose();
  };

  const handleConfirm = () => {
    onConfirm({
      bookingId: booking.id,
      hasDamage,
      damageAmount: hasDamage ? parseFloat(damageAmount) || 0 : 0,
    });
  };

  if (!booking) return null;

  // Calculate max deposit amount
  const bookingDeposit = parseFloat(booking.securityDeposit || booking.SecurityDeposit || 0);
  const maxDeposit = bookingDeposit > 0 ? bookingDeposit : companySecurityDeposit;

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
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
            <div className="flex items-center">
              <svg className="h-6 w-6 text-white mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {t('admin.completeBooking', 'Complete Booking')}
                </h3>
                <p className="text-sm text-orange-100 mt-1">
                  {booking.bookingNumber}
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white px-6 py-4">
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium mb-3">
                  {t('admin.damageCheckQuestion', 'Was there any damage to the vehicle?')}
                </p>
                
                <div className="space-y-3">
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    !hasDamage 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-green-300 bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="hasDamage"
                      value="no"
                      checked={!hasDamage}
                      onChange={() => setHasDamage(false)}
                      className="w-5 h-5 text-green-600"
                    />
                    <div className="ml-3 flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        {t('admin.noDamage', 'No Damage')}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('admin.noDamageDesc', 'Vehicle returned in good condition')}
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    hasDamage 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-300 hover:border-red-300 bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="hasDamage"
                      value="yes"
                      checked={hasDamage}
                      onChange={() => setHasDamage(true)}
                      className="w-5 h-5 text-red-600"
                    />
                    <div className="ml-3 flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        {t('admin.hasDamage', 'Damage Found')}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('admin.hasDamageDesc', 'Vehicle has damage - security deposit will be charged')}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {hasDamage && booking.securityDepositPaymentIntentId && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-800">
                      {t('admin.securityDepositWillBeCharged', 'The security deposit will be charged due to damage.')}
                    </p>
                  </div>
                  
                  {/* Damage Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.damageAmount', 'Damage Amount to Charge')}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={damageAmount}
                        onChange={(e) => setDamageAmount(e.target.value)}
                        placeholder={formatPrice(maxDeposit)}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('admin.maxDepositAmount', 'Maximum:')} {formatPrice(maxDeposit)}
                    </p>
                  </div>
                </div>
              )}

              {hasDamage && !booking.securityDepositPaymentIntentId && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    {t('admin.noSecurityDepositToCharge', 'No security deposit was collected for this booking.')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing}
              className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-base font-medium text-white hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:w-auto transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('admin.completeBooking', 'Complete Booking')}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:w-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DamageConfirmationModal;
