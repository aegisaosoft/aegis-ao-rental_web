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

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStripeTerminal } from '../hooks/useStripeTerminal';
import './CardReaderPayment.css';

/**
 * Simplified Card Reader Payment Component
 * A streamlined interface for processing card-present payments
 * Perfect for quick integrations in admin dashboard or booking pages
 */
export const CardReaderPayment = ({ 
  defaultAmount = 5000, 
  currency = 'usd',
  onPaymentComplete = null,
  onPaymentError = null,
  showAmountInput = false,
  autoCapture = false,
  description = '',
  bookingId = null
}) => {
  const { t } = useTranslation();
  const {
    reader,
    loading,
    discoveredReaders,
    discoverReaders,
    connectReader,
    collectPayment,
    capturePayment,
    disconnectReader,
    isConnected
  } = useStripeTerminal();

  const [paymentStatus, setPaymentStatus] = useState('');
  const [customAmount, setCustomAmount] = useState(defaultAmount);
  const [lastPaymentIntentId, setLastPaymentIntentId] = useState(null);

  const handleDiscover = async () => {
    setPaymentStatus('');
    await discoverReaders();
  };

  const handleConnect = async (selectedReader) => {
    setPaymentStatus(t('terminal.connecting', 'Connecting...'));
    const success = await connectReader(selectedReader);
    if (success) {
      setPaymentStatus(t('terminal.connected', 'Reader connected successfully'));
    } else {
      setPaymentStatus(t('terminal.connectError', 'Failed to connect to reader'));
    }
  };

  const handleDisconnect = async () => {
    await disconnectReader();
    setPaymentStatus('');
    setLastPaymentIntentId(null);
  };

  const handlePayment = async (amount = customAmount) => {
    try {
      setPaymentStatus(t('terminal.collectingPayment', 'Collecting payment...'));
      setLastPaymentIntentId(null);

      const paymentIntent = await collectPayment(amount, {
        currency,
        description: description || t('terminal.defaultDescription', 'Payment'),
        bookingId,
        metadata: {
          source: 'card-reader',
          timestamp: new Date().toISOString()
        },
        captureMethod: autoCapture ? 'automatic' : 'manual'
      });

      setLastPaymentIntentId(paymentIntent.id);

      if (autoCapture) {
        setPaymentStatus(t('terminal.paymentCompleted', 'Payment completed successfully!'));
        if (onPaymentComplete) {
          onPaymentComplete(paymentIntent);
        }
      } else {
        setPaymentStatus(
          t('terminal.paymentAuthorized', 'Payment authorized! Tap capture or it will auto-capture.')
        );
      }

      return paymentIntent;
    } catch (error) {
      const errorMessage = error?.message || t('terminal.error', 'Payment failed');
      setPaymentStatus(`${t('common.error', 'Error')}: ${errorMessage}`);
      if (onPaymentError) {
        onPaymentError(error);
      }
    }
  };

  const handleCapture = async () => {
    if (!lastPaymentIntentId) {
      setPaymentStatus(t('terminal.noPaymentIntent', 'No payment to capture'));
      return;
    }

    try {
      setPaymentStatus(t('terminal.capturing', 'Capturing payment...'));
      await capturePayment(lastPaymentIntentId);
      setPaymentStatus(t('terminal.captured', 'Payment captured successfully!'));
      
      if (onPaymentComplete) {
        onPaymentComplete({ id: lastPaymentIntentId, status: 'captured' });
      }
      
      setLastPaymentIntentId(null);
    } catch (error) {
      const errorMessage = error?.message || t('terminal.captureError', 'Failed to capture payment');
      setPaymentStatus(`${t('common.error', 'Error')}: ${errorMessage}`);
      if (onPaymentError) {
        onPaymentError(error);
      }
    }
  };

  const formatAmount = (amountInCents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amountInCents / 100);
  };

  return (
    <div className="card-reader-payment">
      <h2 className="card-reader-title">
        {t('terminal.title', 'Stripe Terminal Payment')}
      </h2>

      {/* Not Connected State */}
      {!isConnected ? (
        <div className="reader-setup">
          <button 
            onClick={handleDiscover} 
            disabled={loading}
            className="btn-primary btn-discover"
          >
            {loading 
              ? t('terminal.discovering', 'Discovering...') 
              : t('terminal.discoverReaders', 'Discover Readers')
            }
          </button>

          {/* Available Readers List */}
          {discoveredReaders.length > 0 && (
            <div className="readers-list">
              <h3>{t('terminal.availableReaders', 'Available Readers')}:</h3>
              <div className="readers-grid">
                {discoveredReaders.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleConnect(r)}
                    disabled={loading}
                    className="reader-card"
                  >
                    <div className="reader-icon">📱</div>
                    <div className="reader-info">
                      <div className="reader-label">{r.label || r.serial_number}</div>
                      <div className="reader-status">{r.status}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Readers Found */}
          {!loading && discoveredReaders.length === 0 && paymentStatus && (
            <div className="no-readers-message">
              <p>{t('terminal.noReaders', 'No card readers found')}</p>
              <p className="hint">
                {t('terminal.ensureReaderOn', 'Ensure your card reader is powered on and connected to the internet.')}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Connected State */
        <div className="reader-connected">
          <div className="connected-info">
            <span className="check-icon">✓</span>
            <span className="connected-text">
              {t('terminal.connectedTo', 'Connected to')}: <strong>{reader.label || reader.serial_number}</strong>
            </span>
            <button 
              onClick={handleDisconnect} 
              disabled={loading}
              className="btn-disconnect"
            >
              {t('terminal.disconnect', 'Disconnect')}
            </button>
          </div>

          {/* Amount Input (Optional) */}
          {showAmountInput && (
            <div className="amount-input-group">
              <label htmlFor="payment-amount">
                {t('terminal.amount', 'Amount')}:
              </label>
              <input
                id="payment-amount"
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(parseInt(e.target.value) || 0)}
                min="0"
                step="100"
                className="amount-input"
                disabled={loading || lastPaymentIntentId}
              />
              <span className="amount-display">{formatAmount(customAmount)}</span>
            </div>
          )}

          {/* Payment Action Buttons */}
          <div className="payment-actions">
            {!lastPaymentIntentId ? (
              <button
                onClick={() => handlePayment(showAmountInput ? customAmount : defaultAmount)}
                disabled={loading}
                className="btn-primary btn-collect"
              >
                {loading 
                  ? t('terminal.processing', 'Processing...') 
                  : `${t('terminal.collect', 'Collect')} ${formatAmount(showAmountInput ? customAmount : defaultAmount)}`
                }
              </button>
            ) : (
              !autoCapture && (
                <button
                  onClick={handleCapture}
                  disabled={loading}
                  className="btn-success btn-capture"
                >
                  {loading 
                    ? t('terminal.capturing', 'Capturing...') 
                    : t('terminal.capture', 'Capture Payment')
                  }
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Payment Status Display */}
      {paymentStatus && (
        <div className={`payment-status ${
          paymentStatus.includes('Error') || paymentStatus.includes('Failed') 
            ? 'status-error' 
            : paymentStatus.includes('success') || paymentStatus.includes('captured')
            ? 'status-success'
            : 'status-info'
        }`}>
          <p>{paymentStatus}</p>
        </div>
      )}
    </div>
  );
};

export default CardReaderPayment;

