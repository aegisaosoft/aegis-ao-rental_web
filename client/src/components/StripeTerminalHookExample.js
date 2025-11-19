/*
 *
 * Copyright (c) 2025 Alexander Orlov.
 * 34 Middletown Ave Atlantic Highlands NJ 07716
 *
 * THIS SOFTWARE IS THE CONFIDENTIAL AND PROPRIETARY INFORMATION OF
 * Alexander Orlov. ("CONFIDENTIAL INFORMATION"). YOU SHALL NOT DISCLOSE
 * SUCH CONFIDENTIAL INFORMATION AND SHALL USE IT ONLY IN ACCORDANCE
 * WITH THE TERMS OF THE LICENSE AGREEMENT YOU ENTERED INTO WITH
 * Alexander Orlov.
 *
 * Author: Alexander Orlov
 *
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStripeTerminal } from '../hooks/useStripeTerminal';
import './StripeTerminal.css';

/**
 * Example component demonstrating how to use the useStripeTerminal hook
 * This can be integrated into BookPage.js, AdminDashboard.js, or any payment page
 */
const StripeTerminalHookExample = ({ 
  amount, 
  currency = 'usd',
  bookingId = null,
  description = '',
  onPaymentSuccess,
  onPaymentCancel 
}) => {
  const { t } = useTranslation();
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, discovering, connected, processing, authorized, completed

  const {
    terminal,
    reader,
    loading,
    error,
    discoveredReaders,
    discoverReaders,
    connectReader,
    disconnectReader,
    collectPayment,
    capturePayment,
    cancelPayment,
    clearError,
    isConnected,
    isInitialized
  } = useStripeTerminal({
    simulated: false, // Set to true for testing
    locationId: null, // Optional: Stripe location ID
    onReaderDisconnect: () => {
      setStatus('idle');
    },
    onError: (err) => {
      console.error('Terminal error:', err);
    }
  });

  // Auto-discover readers when terminal is initialized
  useEffect(() => {
    if (isInitialized && status === 'idle') {
      handleDiscoverReaders();
    }
  }, [isInitialized]);

  const handleDiscoverReaders = async () => {
    setStatus('discovering');
    await discoverReaders();
    setStatus('ready');
  };

  const handleConnectReader = async (selectedReader) => {
    const success = await connectReader(selectedReader);
    if (success) {
      setStatus('connected');
    }
  };

  const handleDisconnectReader = async () => {
    await disconnectReader();
    setStatus('ready');
  };

  const handleProcessPayment = async () => {
    try {
      setStatus('processing');
      const paymentIntent = await collectPayment(amount, {
        currency,
        description,
        bookingId,
        metadata: {
          source: 'terminal',
          timestamp: new Date().toISOString()
        },
        captureMethod: 'manual' // or 'automatic'
      });

      setPaymentIntentId(paymentIntent.id);
      setStatus('authorized');
    } catch (err) {
      setStatus('connected');
      console.error('Payment error:', err);
    }
  };

  const handleCapturePayment = async () => {
    try {
      await capturePayment(paymentIntentId);
      setStatus('completed');
      if (onPaymentSuccess) {
        onPaymentSuccess({ paymentIntentId, status: 'captured' });
      }
    } catch (err) {
      console.error('Capture error:', err);
    }
  };

  const handleCancelPayment = async () => {
    try {
      if (paymentIntentId) {
        await cancelPayment(paymentIntentId);
      }
      setPaymentIntentId(null);
      setStatus('connected');
      if (onPaymentCancel) {
        onPaymentCancel();
      }
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  // Format amount for display
  const formatAmount = (amountInCents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amountInCents / 100);
  };

  return (
    <div className="stripe-terminal-hook-example">
      <h3>{t('terminal.title', 'Stripe Terminal Payment')}</h3>

      {/* Status Display */}
      <div className="terminal-status">
        <strong>{t('terminal.status', 'Status')}:</strong>
        <span className={`status-badge status-${status}`}>
          {t(`terminal.status_${status}`, status)}
        </span>
      </div>

      {/* Amount Display */}
      <div className="terminal-amount">
        <strong>{t('terminal.amount', 'Amount')}:</strong>
        <span className="amount-display">{formatAmount(amount)}</span>
      </div>

      {/* Error Display */}
      {error && (
        <div className="terminal-error">
          <span className="error-message">{error.message}</span>
          <button onClick={clearError} className="btn-link">
            {t('common.dismiss', 'Dismiss')}
          </button>
        </div>
      )}

      {/* Initialization Status */}
      {!isInitialized && (
        <div className="terminal-initializing">
          <p>{t('terminal.status_initializing', 'Initializing terminal...')}</p>
        </div>
      )}

      {/* Reader Discovery */}
      {isInitialized && !isConnected && discoveredReaders.length === 0 && status === 'idle' && (
        <div className="terminal-discover">
          <button 
            onClick={handleDiscoverReaders} 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? t('terminal.discovering', 'Discovering...') : t('terminal.discoverReaders', 'Discover Readers')}
          </button>
        </div>
      )}

      {/* Reader Selection */}
      {discoveredReaders.length > 0 && !isConnected && (
        <div className="terminal-readers">
          <h4>{t('terminal.selectReader', 'Select Card Reader')}</h4>
          <div className="reader-list">
            {discoveredReaders.map((r) => (
              <button
                key={r.id}
                onClick={() => handleConnectReader(r)}
                disabled={loading}
                className="reader-button"
              >
                <div className="reader-label">{r.label || r.serial_number}</div>
                <div className="reader-status">{r.status}</div>
              </button>
            ))}
          </div>
          <button 
            onClick={handleDiscoverReaders} 
            disabled={loading}
            className="btn-secondary"
          >
            {t('terminal.refresh', 'Refresh')}
          </button>
        </div>
      )}

      {/* Connected Reader Info */}
      {isConnected && reader && (
        <div className="terminal-reader-info">
          <strong>{t('terminal.connectedReader', 'Connected Reader')}:</strong>
          <span>{reader.label || reader.serial_number}</span>
          <button
            onClick={handleDisconnectReader}
            disabled={loading || status === 'processing'}
            className="btn-link"
          >
            {t('terminal.disconnect', 'Disconnect')}
          </button>
        </div>
      )}

      {/* Payment Actions */}
      <div className="terminal-actions">
        {/* Process Payment */}
        {status === 'connected' && (
          <button
            onClick={handleProcessPayment}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? t('terminal.processing', 'Processing...') : t('terminal.charge', 'Charge Card')}
          </button>
        )}

        {/* Authorized - Show Capture and Cancel */}
        {status === 'authorized' && (
          <>
            <button
              onClick={handleCapturePayment}
              disabled={loading}
              className="btn-success"
            >
              {loading ? t('terminal.capturing', 'Capturing...') : t('terminal.capture', 'Capture Payment')}
            </button>
            <button
              onClick={handleCancelPayment}
              disabled={loading}
              className="btn-danger"
            >
              {t('terminal.cancel', 'Cancel Payment')}
            </button>
          </>
        )}

        {/* Processing - Show Cancel */}
        {status === 'processing' && (
          <button
            onClick={handleCancelPayment}
            disabled={loading}
            className="btn-secondary"
          >
            {t('terminal.cancel', 'Cancel')}
          </button>
        )}

        {/* Completed */}
        {status === 'completed' && (
          <div className="terminal-completed">
            <p className="success-message">
              {t('terminal.paymentCompleted', 'Payment completed successfully!')}
            </p>
            <button
              onClick={() => setStatus('connected')}
              className="btn-primary"
            >
              {t('terminal.newPayment', 'New Payment')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StripeTerminalHookExample;

