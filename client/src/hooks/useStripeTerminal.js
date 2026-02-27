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

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadStripeTerminal } from '@stripe/terminal-js';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import apiService from '../services/api';
import { useCompany } from '../context/CompanyContext';

/**
 * Custom hook for Stripe Terminal integration
 * Handles terminal initialization, reader discovery, connection, and payment processing
 */
export const useStripeTerminal = (options = {}) => {
  const { t } = useTranslation();
  const { companyConfig } = useCompany();
  const [terminal, setTerminal] = useState(null);
  const terminalRef = useRef(null);
  const [reader, setReader] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [discoveredReaders, setDiscoveredReaders] = useState([]);

  // DEV ONLY: const isDevelopment = process.env.NODE_ENV === 'development';

  const {
    simulated = false, // DEV ONLY: change to isDevelopment to auto-enable simulated mode
    locationId = null, // Stripe location ID (optional)
    onReaderDisconnect = null,
    onError: onErrorCallback = null
  } = options;

  // Initialize Stripe Terminal
  useEffect(() => {
    const initTerminal = async () => {
      try {
        setLoading(true);
        setError(null);

        const StripeTerminal = await loadStripeTerminal();

        const terminalInstance = StripeTerminal.create({
          onFetchConnectionToken: async () => {
            try {
              const response = await apiService.createConnectionToken(companyConfig?.id);
              const secret = response?.data?.secret || response?.secret;
              console.log('[Terminal] Connection token fetched:', secret ? 'pst_***' : 'EMPTY');
              return secret;
            } catch (error) {
              toast.error(t('terminal.initError', 'Failed to fetch connection token'));
              throw error;
            }
          },
          onUnexpectedReaderDisconnect: () => {
            setReader(null);
            toast.error(t('terminal.readerDisconnected', 'Card reader disconnected'));
            if (onReaderDisconnect) {
              onReaderDisconnect();
            }
          },
        });

        terminalRef.current = terminalInstance;
        setTerminal(terminalInstance);
      } catch (err) {
        setError(err);
        toast.error(t('terminal.initError', 'Failed to initialize terminal'));
        if (onErrorCallback) {
          onErrorCallback(err);
        }
      } finally {
        setLoading(false);
      }
    };

    if (companyConfig?.id) {
      initTerminal();
    }

    // Cleanup on unmount
    return () => {
      if (terminalRef.current) {
        terminalRef.current.disconnectReader().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyConfig?.id]);

  // Discover available readers
  const [discoverStatus, setDiscoverStatus] = useState(null); // null | 'no_readers' | 'error'
  const [discoverMessage, setDiscoverMessage] = useState('');

  const discoverReaders = useCallback(async () => {
    if (!terminal) {
      return [];
    }

    setLoading(true);
    setError(null);
    setDiscoverStatus(null);
    setDiscoverMessage('');

    try {
      console.log('[Terminal] Discovering readers...', { simulated, locationId });
      const discoverResult = await terminal.discoverReaders({
        simulated: simulated,
        ...(locationId && { location: locationId })
      });

      if (discoverResult.error) {
        console.warn('[Terminal] discoverReaders returned error:', discoverResult.error);
        const errorCode = discoverResult.error.code || '';
        const errorMessage = discoverResult.error.message || '';

        // Не показываем красную ошибку — показываем информативный статус
        setError(discoverResult.error);
        setDiscoverStatus('no_readers');
        setDiscoverMessage(errorMessage || errorCode);
        setDiscoveredReaders([]);

        if (onErrorCallback) {
          onErrorCallback(discoverResult.error);
        }
        return [];
      }

      const readers = discoverResult.discoveredReaders || [];
      setDiscoveredReaders(readers);

      if (readers.length === 0) {
        setDiscoverStatus('no_readers');
        setDiscoverMessage(t('terminal.noReadersHint', 'No readers are registered or online for this account.'));
      } else {
        setDiscoverStatus(null);
        setDiscoverMessage('');
      }

      return readers;
    } catch (err) {
      console.error('[Terminal] discoverReaders exception:', err);
      setError(err);
      setDiscoverStatus('error');
      setDiscoverMessage(err.message || 'Unknown error');
      if (onErrorCallback) {
        onErrorCallback(err);
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [terminal, simulated, locationId, t, onErrorCallback]);

  // Connect to a specific reader
  const connectReader = useCallback(async (selectedReader) => {
    if (!terminal) {
      const err = new Error('Terminal not initialized');
      setError(err);
      toast.error(t('terminal.initError', 'Terminal not initialized'));
      if (onErrorCallback) {
        onErrorCallback(err);
      }
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const connectResult = await terminal.connectReader(selectedReader);

      if (connectResult.error) {
        setError(connectResult.error);
        toast.error(t('terminal.connectError', 'Failed to connect to reader'));
        if (onErrorCallback) {
          onErrorCallback(connectResult.error);
        }
        return false;
      }

      setReader(connectResult.reader);
      return true;
    } catch (err) {
      setError(err);
      toast.error(t('terminal.connectError', 'Failed to connect to reader'));
      if (onErrorCallback) {
        onErrorCallback(err);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [terminal, t, onErrorCallback]);

  // Disconnect from current reader
  const disconnectReader = useCallback(async () => {
    if (!terminal) {
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await terminal.disconnectReader();
      setReader(null);
      toast.info(t('terminal.disconnected', 'Reader disconnected'));
      return true;
    } catch (err) {
      setError(err);
      toast.error(t('terminal.disconnectError', 'Failed to disconnect reader'));
      if (onErrorCallback) {
        onErrorCallback(err);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [terminal, t, onErrorCallback]);

  // Collect payment from card reader
  const collectPayment = useCallback(async (amount, paymentOptions = {}) => {
    if (!terminal || !reader) {
      const err = new Error('Terminal or reader not connected');
      setError(err);
      toast.error(t('terminal.noReader', 'Please connect a card reader first'));
      if (onErrorCallback) {
        onErrorCallback(err);
      }
      throw err;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        currency = 'usd',
        description = '',
        bookingId = null,
        metadata = {},
        captureMethod = 'manual'
      } = paymentOptions;

      // 1. Create Payment Intent
      const paymentIntentResponse = await apiService.createTerminalPaymentIntent(
        companyConfig?.id,
        amount,
        currency,
        {
          description,
          bookingId,
          metadata,
          captureMethod
        }
      );

      // DEV ONLY: configure simulator with test card
      // if (isDevelopment && simulated) {
      //   await terminal.setSimulatorConfiguration({
      //     testCardNumber: '4242424242424242',
      //   });
      // }

      // 3. Collect payment method from card reader
      const collectResult = await terminal.collectPaymentMethod(
        paymentIntentResponse.clientSecret
      );

      if (collectResult.error) {
        setError(collectResult.error);
        toast.error(t('terminal.collectError', 'Payment collection failed'));
        if (onErrorCallback) {
          onErrorCallback(collectResult.error);
        }
        throw collectResult.error;
      }

      // 4. Process payment
      const processResult = await terminal.processPayment(collectResult.paymentIntent);

      if (processResult.error) {
        setError(processResult.error);
        toast.error(t('terminal.processError', 'Payment processing failed'));
        if (onErrorCallback) {
          onErrorCallback(processResult.error);
        }
        throw processResult.error;
      }

      // 5. Save card info to booking if bookingId provided
      if (bookingId && processResult.paymentIntent?.id) {
        try {
          await apiService.captureTerminalBooking(
            processResult.paymentIntent.id,
            bookingId
          );
        } catch (captureErr) {
          console.error('[Terminal] Failed to save card info to booking:', captureErr);
          // Don't throw — payment succeeded, capture is secondary
        }
      }

      return processResult.paymentIntent;
    } catch (err) {
      setError(err);
      toast.error(t('terminal.error', 'Payment failed'));
      if (onErrorCallback) {
        onErrorCallback(err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [terminal, reader, companyConfig?.id, t, onErrorCallback]);

  // Capture payment (for manual capture)
  const capturePayment = useCallback(async (paymentIntentId, amountToCapture = null) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.capturePaymentIntent(
        companyConfig?.id,
        paymentIntentId,
        amountToCapture
      );

      return response;
    } catch (err) {
      setError(err);
      toast.error(t('terminal.captureError', 'Failed to capture payment'));
      if (onErrorCallback) {
        onErrorCallback(err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyConfig?.id, t, onErrorCallback]);

  // Cancel payment
  const cancelPayment = useCallback(async (paymentIntentId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.cancelPaymentIntent(
        companyConfig?.id,
        paymentIntentId
      );

      toast.info(t('terminal.cancelled', 'Payment cancelled'));
      return response;
    } catch (err) {
      setError(err);
      toast.error(t('terminal.cancelError', 'Failed to cancel payment'));
      if (onErrorCallback) {
        onErrorCallback(err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyConfig?.id, t, onErrorCallback]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
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
    isConnected: !!reader,
    isInitialized: !!terminal,
    discoverStatus,
    discoverMessage,
  };
};

export default useStripeTerminal;

