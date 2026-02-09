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

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import apiService from '../services/api';
import { useCompany } from '../context/CompanyContext';
import './StripeTerminal.css';

/**
 * Stripe Terminal Component for processing card-present payments
 * Requires @stripe/terminal-js package
 */
const StripeTerminal = ({ 
  amount, 
  currency = 'usd',
  bookingId = null,
  description = '',
  metadata = {},
  onSuccess,
  onError,
  onCancel
}) => {
  const { t } = useTranslation();
  const { companyConfig } = useCompany();
  const [terminal, setTerminal] = useState(null);
  const [readers, setReaders] = useState([]);
  const [selectedReader, setSelectedReader] = useState(null);
  const [status, setStatus] = useState('initializing');
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const terminalRef = useRef(null);

  // Initialize Stripe Terminal
  useEffect(() => {
    const initializeTerminal = async () => {
      try {
        // Load Stripe Terminal JS
        if (!window.StripeTerminal) {
          const script = document.createElement('script');
          script.src = 'https://js.stripe.com/terminal/v1/';
          script.async = true;
          document.body.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }

        const StripeTerminal = window.StripeTerminal;
        
        // Create terminal instance
        const terminal = StripeTerminal.create({
          onFetchConnectionToken: async () => {
            try {
              const response = await apiService.createConnectionToken(companyConfig?.id);
              return response.secret;
            } catch (error) {
              throw error;
            }
          },
          onUnexpectedReaderDisconnect: () => {
            setStatus('disconnected');
            toast.error(t('terminal.readerDisconnected', 'Card reader disconnected'));
          },
        });

        terminalRef.current = terminal;
        setTerminal(terminal);
        setStatus('ready');

        // Discover readers
        await discoverReaders(terminal);
      } catch (error) {
        setStatus('error');
        toast.error(t('terminal.initError', 'Failed to initialize terminal'));
        if (onError) onError(error);
      }
    };

    if (companyConfig?.id) {
      initializeTerminal();
    }

    return () => {
      // Cleanup
      if (terminalRef.current) {
        terminalRef.current.disconnectReader();
      }
    };
  }, [companyConfig?.id, t, onError]);

  // Discover available card readers
  const discoverReaders = async (terminalInstance = terminal) => {
    if (!terminalInstance) return;

    try {
      setLoading(true);
      const discoverResult = await terminalInstance.discoverReaders();
      
      if (discoverResult.error) {
        toast.error(t('terminal.discoverError', 'Failed to discover readers'));
      } else {
        setReaders(discoverResult.discoveredReaders || []);
        if (discoverResult.discoveredReaders?.length === 0) {
          toast.info(t('terminal.noReaders', 'No card readers found'));
        }
      }
    } catch (error) {
      toast.error(t('terminal.discoverError', 'Failed to discover readers'));
    } finally {
      setLoading(false);
    }
  };

  // Connect to a reader
  const connectReader = async (reader) => {
    if (!terminal) return;

    try {
      setLoading(true);
      setStatus('connecting');
      
      const connectResult = await terminal.connectReader(reader);
      
      if (connectResult.error) {
        toast.error(t('terminal.connectError', 'Failed to connect to reader'));
        setStatus('ready');
      } else {
        setSelectedReader(connectResult.reader);
        setStatus('connected');
      }
    } catch (error) {
      toast.error(t('terminal.connectError', 'Failed to connect to reader'));
      setStatus('ready');
    } finally {
      setLoading(false);
    }
  };

  // Disconnect from reader
  const disconnectReader = async () => {
    if (!terminal) return;

    try {
      setLoading(true);
      await terminal.disconnectReader();
      setSelectedReader(null);
      setStatus('ready');
      toast.info(t('terminal.disconnected', 'Reader disconnected'));
    } catch (error) {
      toast.error(t('terminal.disconnectError', 'Failed to disconnect reader'));
    } finally {
      setLoading(false);
    }
  };

  // Process payment
  const processPayment = async () => {
    if (!terminal || !selectedReader) {
      toast.error(t('terminal.noReader', 'Please connect a card reader first'));
      return;
    }

    try {
      setLoading(true);
      setStatus('processing');

      // Create payment intent
      const paymentIntentResponse = await apiService.createTerminalPaymentIntent(
        companyConfig?.id,
        amount,
        currency,
        {
          description,
          bookingId,
          metadata,
          captureMethod: 'manual' // For authorization without immediate capture
        }
      );

      setPaymentIntentId(paymentIntentResponse.id);

      // Collect payment method
      const result = await terminal.collectPaymentMethod(paymentIntentResponse.clientSecret);

      if (result.error) {
        toast.error(t('terminal.collectError', 'Payment collection failed'));
        setStatus('connected');
        if (onError) onError(result.error);
        return;
      }

      // Process payment
      const processResult = await terminal.processPayment(result.paymentIntent);

      if (processResult.error) {
        toast.error(t('terminal.processError', 'Payment processing failed'));
        setStatus('connected');
        if (onError) onError(processResult.error);
        return;
      }

      setStatus('authorized');
      if (onSuccess) onSuccess(processResult.paymentIntent);

    } catch (error) {
      toast.error(t('terminal.error', 'Payment failed'));
      setStatus('connected');
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  // Capture payment (for manual capture)
  const capturePayment = async () => {
    if (!paymentIntentId) {
      toast.error(t('terminal.noPaymentIntent', 'No payment to capture'));
      return;
    }

    try {
      setLoading(true);
      await apiService.capturePaymentIntent(companyConfig?.id, paymentIntentId);
      setStatus('completed');
      if (onSuccess) onSuccess({ id: paymentIntentId, status: 'captured' });
    } catch (error) {
      toast.error(t('terminal.captureError', 'Failed to capture payment'));
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  // Cancel payment
  const cancelPayment = async () => {
    if (!paymentIntentId) {
      if (onCancel) onCancel();
      return;
    }

    try {
      setLoading(true);
      await apiService.cancelPaymentIntent(companyConfig?.id, paymentIntentId);
      toast.info(t('terminal.cancelled', 'Payment cancelled'));
      setStatus('connected');
      setPaymentIntentId(null);
      if (onCancel) onCancel();
    } catch (error) {
      toast.error(t('terminal.cancelError', 'Failed to cancel payment'));
    } finally {
      setLoading(false);
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
    <div className="stripe-terminal">
      <h3>{t('terminal.title', 'Stripe Terminal')}</h3>
      
      {/* Status */}
      <div className="terminal-status">
        <strong>{t('terminal.status', 'Status')}:</strong>
        <span className={`status-badge status-${status}`}>
          {t(`terminal.status_${status}`, status)}
        </span>
      </div>

      {/* Amount */}
      <div className="terminal-amount">
        <strong>{t('terminal.amount', 'Amount')}:</strong>
        <span className="amount-display">{formatAmount(amount)}</span>
      </div>

      {/* Reader Selection */}
      {status === 'ready' && readers.length > 0 && (
        <div className="terminal-readers">
          <h4>{t('terminal.selectReader', 'Select Card Reader')}</h4>
          <div className="reader-list">
            {readers.map((reader) => (
              <button
                key={reader.id}
                onClick={() => connectReader(reader)}
                disabled={loading}
                className="reader-button"
              >
                {reader.label || reader.serialNumber}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Refresh readers */}
      {status === 'ready' && (
        <button
          onClick={() => discoverReaders()}
          disabled={loading}
          className="btn-secondary"
        >
          {t('terminal.refresh', 'Refresh Readers')}
        </button>
      )}

      {/* Connected reader info */}
      {selectedReader && (
        <div className="terminal-reader-info">
          <strong>{t('terminal.connectedReader', 'Connected Reader')}:</strong>
          <span>{selectedReader.label || selectedReader.serialNumber}</span>
          <button
            onClick={disconnectReader}
            disabled={loading || status === 'processing'}
            className="btn-link"
          >
            {t('terminal.disconnect', 'Disconnect')}
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="terminal-actions">
        {status === 'connected' && (
          <button
            onClick={processPayment}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? t('terminal.processing', 'Processing...') : t('terminal.charge', 'Charge Card')}
          </button>
        )}

        {status === 'authorized' && (
          <>
            <button
              onClick={capturePayment}
              disabled={loading}
              className="btn-success"
            >
              {loading ? t('terminal.capturing', 'Capturing...') : t('terminal.capture', 'Capture Payment')}
            </button>
            <button
              onClick={cancelPayment}
              disabled={loading}
              className="btn-danger"
            >
              {t('terminal.cancel', 'Cancel')}
            </button>
          </>
        )}

        {(status === 'processing' || status === 'authorized') && (
          <button
            onClick={cancelPayment}
            disabled={loading}
            className="btn-secondary"
          >
            {t('terminal.cancel', 'Cancel')}
          </button>
        )}
      </div>
    </div>
  );
};

export default StripeTerminal;

