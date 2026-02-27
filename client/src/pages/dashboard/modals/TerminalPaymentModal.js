/*
 * TerminalPaymentModal - Modal for processing payments via Stripe Terminal card reader
 * Handles the full flow: discover readers → connect → collect payment → capture
 *
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useEffect } from 'react';
import { useStripeTerminal } from '../../../hooks/useStripeTerminal';

const TerminalPaymentModal = ({
  t,
  amount,
  currency = 'usd',
  description = '',
  bookingId = null,
  metadata = {},
  autoCapture = true,
  onSuccess,
  onError,
  onClose,
  title = '',
  subtitle = '',
}) => {
  const {
    reader,
    loading,
    discoveredReaders,
    discoverReaders,
    connectReader,
    disconnectReader,
    collectPayment,
    capturePayment,
    isConnected,
    isInitialized,
  } = useStripeTerminal({ bookingId });

  const [step, setStep] = useState('discover'); // discover, connecting, connected, collecting, authorized, captured, error
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Auto-discover readers on mount
  useEffect(() => {
    if (isInitialized && !isConnected) {
      handleDiscover();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  // Update step when reader connects
  useEffect(() => {
    if (isConnected && step === 'connecting') {
      setStep('connected');
    }
  }, [isConnected, step]);

  const handleDiscover = async () => {
    setIsDiscovering(true);
    setErrorMessage('');
    try {
      await discoverReaders();
    } catch (err) {
      setErrorMessage(err?.message || t('terminal.discoverError', 'Failed to discover readers'));
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleConnect = async (selectedReader) => {
    setStep('connecting');
    setErrorMessage('');
    try {
      const success = await connectReader(selectedReader);
      if (success) {
        setStep('connected');
      } else {
        setStep('discover');
        setErrorMessage(t('terminal.connectError', 'Failed to connect to reader'));
      }
    } catch (err) {
      setStep('discover');
      setErrorMessage(err?.message || t('terminal.connectError', 'Failed to connect to reader'));
    }
  };

  const handleCollectPayment = async () => {
    setStep('collecting');
    setErrorMessage('');
    try {
      const pi = await collectPayment(amount, {
        currency,
        description: description || t('terminal.defaultDescription', 'Payment'),
        bookingId,
        metadata: {
          ...metadata,
          source: 'terminal-modal',
          timestamp: new Date().toISOString(),
        },
        captureMethod: autoCapture ? 'automatic' : 'manual',
      });

      setPaymentIntent(pi);

      if (autoCapture) {
        setStep('captured');
        if (onSuccess) {
          onSuccess(pi);
        }
      } else {
        setStep('authorized');
      }
    } catch (err) {
      setStep('connected');
      setErrorMessage(err?.message || t('terminal.error', 'Payment failed'));
      if (onError) {
        onError(err);
      }
    }
  };

  const handleCapture = async () => {
    if (!paymentIntent?.id) return;
    setStep('collecting');
    setErrorMessage('');
    try {
      await capturePayment(paymentIntent.id);
      setStep('captured');
      if (onSuccess) {
        onSuccess({ ...paymentIntent, status: 'captured' });
      }
    } catch (err) {
      setStep('authorized');
      setErrorMessage(err?.message || t('terminal.captureError', 'Failed to capture payment'));
      if (onError) {
        onError(err);
      }
    }
  };

  const handleDisconnect = async () => {
    await disconnectReader();
    setStep('discover');
    setPaymentIntent(null);
  };

  const handleClose = () => {
    if (step !== 'collecting') {
      onClose();
    }
  };

  const formatAmount = (amountInCents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountInCents / 100);
  };

  const getStepNumber = () => {
    switch (step) {
      case 'discover': return 1;
      case 'connecting': return 1;
      case 'connected': return 2;
      case 'collecting': return 3;
      case 'authorized': return 3;
      case 'captured': return 4;
      default: return 1;
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-6 w-6 text-white mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {title || t('terminal.title', 'Stripe Terminal')}
                  </h3>
                  {subtitle && (
                    <p className="text-sm text-indigo-100 mt-0.5">{subtitle}</p>
                  )}
                </div>
              </div>
              {step !== 'collecting' && (
                <button onClick={handleClose} className="text-white hover:text-indigo-200 transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: t('terminal.stepConnect', 'Connect') },
                { num: 2, label: t('terminal.stepReady', 'Ready') },
                { num: 3, label: t('terminal.stepPayment', 'Payment') },
                { num: 4, label: t('terminal.stepDone', 'Done') },
              ].map((s, idx) => (
                <React.Fragment key={s.num}>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      getStepNumber() > s.num
                        ? 'bg-green-500 text-white'
                        : getStepNumber() === s.num
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {getStepNumber() > s.num ? '✓' : s.num}
                    </div>
                    <span className="text-xs text-gray-500 mt-1">{s.label}</span>
                  </div>
                  {idx < 3 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      getStepNumber() > s.num ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Amount Display */}
          <div className="px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('terminal.amount', 'Amount')}</span>
              <span className="text-2xl font-bold text-green-600">{formatAmount(amount)}</span>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white px-6 py-5">
            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                <svg className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            {/* Step: Discover Readers */}
            {(step === 'discover' || step === 'connecting') && (
              <div className="space-y-4">
                {!isInitialized ? (
                  <div className="text-center py-8">
                    <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-sm text-gray-500">{t('terminal.status_initializing', 'Initializing...')}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">
                        {t('terminal.selectReader', 'Select Card Reader')}
                      </h4>
                      <button
                        onClick={handleDiscover}
                        disabled={isDiscovering || loading}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        <svg className={`h-4 w-4 ${isDiscovering ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {t('terminal.refresh', 'Refresh')}
                      </button>
                    </div>

                    {discoveredReaders.length > 0 ? (
                      <div className="space-y-2">
                        {discoveredReaders.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => handleConnect(r)}
                            disabled={loading || step === 'connecting'}
                            className="w-full flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left disabled:opacity-50"
                          >
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{r.label || r.serial_number}</p>
                              <p className="text-xs text-gray-500">{r.device_type} • {r.status}</p>
                            </div>
                            {step === 'connecting' ? (
                              <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-lg">
                        <svg className="h-12 w-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-500 mb-1">{t('terminal.noReaders', 'No card readers found')}</p>
                        <p className="text-xs text-gray-400">
                          {t('terminal.ensureReaderOn', 'Ensure your card reader is powered on and connected to the internet.')}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step: Connected - Ready to Collect */}
            {step === 'connected' && (
              <div className="space-y-4">
                <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">
                      {t('terminal.connectedTo', 'Connected to')}: {reader?.label || reader?.serial_number}
                    </p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="text-xs text-gray-500 hover:text-red-600 underline"
                  >
                    {t('terminal.disconnect', 'Disconnect')}
                  </button>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-indigo-700 mb-1">
                    {t('terminal.readyToCollect', 'Reader is ready. Tap the button below to start payment collection.')}
                  </p>
                  <p className="text-xs text-indigo-500">
                    {t('terminal.customerTapCard', 'Customer will be prompted to tap, insert, or swipe their card.')}
                  </p>
                </div>

                <button
                  onClick={handleCollectPayment}
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  {t('terminal.collectPayment', 'Collect Payment')} — {formatAmount(amount)}
                </button>
              </div>
            )}

            {/* Step: Collecting Payment */}
            {step === 'collecting' && (
              <div className="text-center py-8">
                <div className="relative mx-auto w-16 h-16 mb-4">
                  <svg className="animate-spin h-16 w-16 text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-1">
                  {t('terminal.collectingPayment', 'Collecting payment...')}
                </p>
                <p className="text-sm text-gray-500">
                  {t('terminal.waitForCustomer', 'Waiting for customer to present their card on the reader...')}
                </p>
                <div className="mt-4 animate-pulse">
                  <svg className="h-12 w-12 text-indigo-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>
            )}

            {/* Step: Authorized (manual capture) */}
            {step === 'authorized' && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="h-8 w-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {t('terminal.authorized', 'Payment Authorized')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('terminal.capturePrompt', 'Payment has been authorized. Capture to complete.')}
                  </p>
                </div>

                <button
                  onClick={handleCapture}
                  disabled={loading}
                  className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('terminal.capturing', 'Capturing...')}
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('terminal.capture', 'Capture Payment')} — {formatAmount(amount)}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Step: Captured / Success */}
            {step === 'captured' && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="h-8 w-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-green-800 mb-1">
                  {t('terminal.paymentCompleted', 'Payment completed successfully!')}
                </p>
                <p className="text-3xl font-bold text-green-600 my-3">
                  {formatAmount(amount)}
                </p>
                {paymentIntent?.id && (
                  <p className="text-xs text-gray-400">
                    ID: {paymentIntent.id}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            {step === 'captured' ? (
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {t('common.done', 'Done')}
              </button>
            ) : step !== 'collecting' ? (
              <button
                onClick={handleClose}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalPaymentModal;
