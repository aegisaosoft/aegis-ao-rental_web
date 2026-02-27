/*
 * TerminalRefundModal - Refund button + modal for terminal payments
 *
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { RotateCcw, DollarSign } from 'lucide-react';
import { translatedApiService as apiService } from '../../../services/translatedApi';

const RefundButton = ({ t, payment, currentCompanyId, formatPrice }) => {
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const queryClient = useQueryClient();

  const refundMutation = useMutation(
    (data) => apiService.refundTerminalPayment(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['terminalPayments']);
        setShowRefundModal(false);
        setRefundAmount('');
        setRefundReason('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('terminal.refund.error', 'Failed to process refund'));
      },
    }
  );

  const maxRefundAmount = (payment.amount - (payment.refundedAmount || 0)) / 100;

  const handleRefund = () => {
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > maxRefundAmount) {
      toast.error(t('terminal.refund.invalidAmount', 'Invalid refund amount'));
      return;
    }

    refundMutation.mutate({
      paymentIntentId: payment.paymentIntentId || payment.id,
      amount: Math.round(amount * 100),
      reason: refundReason || 'requested_by_customer',
      companyId: currentCompanyId,
    });
  };

  return (
    <>
      <button
        onClick={() => {
          setRefundAmount(maxRefundAmount.toFixed(2));
          setShowRefundModal(true);
        }}
        className="text-purple-600 hover:text-purple-800 text-xs font-medium flex items-center gap-1"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {t('terminal.refund.button', 'Refund')}
      </button>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => !refundMutation.isLoading && setShowRefundModal(false)}></div>
            <div className="relative inline-block bg-white rounded-lg text-left shadow-xl transform transition-all sm:max-w-md sm:w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 rounded-t-lg">
                <div className="flex items-center">
                  <RotateCcw className="h-5 w-5 text-white mr-3" />
                  <h3 className="text-lg font-semibold text-white">
                    {t('terminal.refund.title', 'Process Refund')}
                  </h3>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-4 space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm text-purple-800">
                    {t('terminal.refund.description', 'Enter the amount to refund to the customer\'s card.')}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-medium text-gray-700">{t('terminal.refund.amount', 'Refund Amount')}</label>
                    <span className="text-xs text-gray-500">
                      {t('terminal.refund.maxAmount', 'Max')}: {formatPrice ? formatPrice(maxRefundAmount) : `$${maxRefundAmount.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      min="0.01"
                      max={maxRefundAmount}
                      step="0.01"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">{t('terminal.refund.reason', 'Reason')}</label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  >
                    <option value="requested_by_customer">{t('terminal.refund.reasonCustomer', 'Requested by customer')}</option>
                    <option value="duplicate">{t('terminal.refund.reasonDuplicate', 'Duplicate charge')}</option>
                    <option value="fraudulent">{t('terminal.refund.reasonFraudulent', 'Fraudulent')}</option>
                    <option value="other">{t('terminal.refund.reasonOther', 'Other')}</option>
                  </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex">
                    <svg className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-yellow-700">
                      {t('terminal.refund.warning', 'Refunds are processed back to the original payment method. This action cannot be undone.')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
                <button
                  onClick={() => setShowRefundModal(false)}
                  disabled={refundMutation.isLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleRefund}
                  disabled={refundMutation.isLoading || !refundAmount}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {refundMutation.isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('common.processing', 'Processing...')}
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      {t('terminal.refund.process', 'Process Refund')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RefundButton;
