/*
 * TerminalReaderPanel - Card reader status panel + stats cards
 *
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import {
  RefreshCw,
  CreditCard,
  Wifi,
  WifiOff,
  ArrowDownCircle,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Smartphone,
} from 'lucide-react';
import { Card } from '../../components/common';
import { translatedApiService as apiService } from '../../services/translatedApi';
import { useStripeTerminal } from '../../hooks/useStripeTerminal';

// ============== READER STATUS PANEL ==============

export const ReaderStatusPanel = ({ t, locationId, locationsCount = 0 }) => {
  const {
    reader,
    loading,
    discoveredReaders,
    discoverReaders,
    connectReader,
    disconnectReader,
    isConnected,
    isInitialized,
    discoverStatus,
    discoverMessage,
  } = useStripeTerminal({ locationId });

  const [isDiscovering, setIsDiscovering] = useState(false);

  const handleDiscover = async () => {
    setIsDiscovering(true);
    try {
      await discoverReaders();
    } finally {
      setIsDiscovering(false);
    }
  };

  return (
    <Card
      title={t('terminal.readerStatus', 'Card Reader Status')}
      headerActions={
        <button
          onClick={handleDiscover}
          disabled={isDiscovering || loading || !isInitialized}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isDiscovering ? 'animate-spin' : ''}`} />
          {t('terminal.refresh', 'Refresh')}
        </button>
      }
    >
      {!isInitialized ? (
        <div className="text-center py-6">
          <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-gray-500">{t('terminal.status_initializing', 'Initializing terminal...')}</p>
        </div>
      ) : isConnected ? (
        <div className="space-y-3">
          <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <Wifi className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">{t('terminal.status_connected', 'Connected')}</p>
              <p className="text-xs text-green-600">{reader?.label || reader?.serial_number}</p>
            </div>
            <button
              onClick={disconnectReader}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {t('terminal.disconnect', 'Disconnect')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {discoveredReaders.length > 0 ? (
            discoveredReaders.map((r) => (
              <button
                key={r.id}
                onClick={() => connectReader(r)}
                disabled={loading}
                className="w-full flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                  <Smartphone className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{r.label || r.serial_number}</p>
                  <p className="text-xs text-gray-500">{r.device_type} • {r.status}</p>
                </div>
                <span className="text-xs text-indigo-600 font-medium">{t('terminal.tapToConnect', 'Connect')}</span>
              </button>
            ))
          ) : (
            <div className="py-4">
              {/* Диагностика: чеклист что настроено, а что нет */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {t('terminal.diagnosticTitle', 'Terminal Setup Checklist')}
                </p>

                {/* 1. Locations check */}
                <div className="flex items-start gap-2.5">
                  {locationsCount > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm ${locationsCount > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {locationsCount > 0
                        ? t('terminal.diagLocOk', 'Location configured ({{count}})', { count: locationsCount })
                        : t('terminal.diagLocMissing', 'No locations configured')
                      }
                    </p>
                    {locationsCount === 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t('terminal.diagLocHint', 'Go to the Setup tab → Create a terminal location first.')}
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Readers check */}
                <div className="flex items-start gap-2.5">
                  {discoveredReaders.length > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm ${discoveredReaders.length > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {discoveredReaders.length > 0
                        ? t('terminal.diagReadersOk', 'Readers found ({{count}})', { count: discoveredReaders.length })
                        : t('terminal.diagReadersMissing', 'No readers found')
                      }
                    </p>
                    {discoveredReaders.length === 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {locationsCount > 0
                          ? t('terminal.diagReadersHintReg', 'Go to the Setup tab → Register a reader using its pairing code. Make sure the reader is powered on and connected to Wi-Fi.')
                          : t('terminal.diagReadersHintLoc', 'Create a location first, then register a reader.')
                        }
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Connection status */}
                <div className="flex items-start gap-2.5">
                  {isInitialized ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  )}
                  <p className={`text-sm ${isInitialized ? 'text-green-700' : 'text-amber-700'}`}>
                    {isInitialized
                      ? t('terminal.diagSdkOk', 'Stripe Terminal SDK connected')
                      : t('terminal.diagSdkInit', 'Stripe Terminal SDK initializing...')
                    }
                  </p>
                </div>

                {/* Stripe error details (если есть) */}
                {discoverStatus && discoverMessage && (
                  <div className="flex items-start gap-2.5 pt-2 border-t border-gray-200">
                    <WifiOff className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">
                        {t('terminal.diagStripeResponse', 'Stripe response:')}
                      </p>
                      <p className="text-xs text-gray-400 italic mt-0.5">
                        {discoverMessage}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center mt-3">
                <button
                  onClick={handleDiscover}
                  disabled={isDiscovering}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
                >
                  {isDiscovering ? t('terminal.discovering', 'Scanning...') : t('terminal.discoverReaders', 'Scan for Readers')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// ============== STATS CARDS ==============

export const StatsCards = ({ t, currentCompanyId, isAuthenticated, formatPrice }) => {
  const { data: statsResponse } = useQuery(
    ['terminalStats', currentCompanyId],
    () => apiService.getTerminalStats(currentCompanyId),
    {
      enabled: isAuthenticated && !!currentCompanyId,
    }
  );

  const stats = useMemo(() => {
    const data = statsResponse?.data || statsResponse || {};
    return {
      totalPayments: data.totalPayments || 0,
      totalAmount: data.totalAmount || 0,
      totalRefunds: data.totalRefunds || 0,
      refundedAmount: data.refundedAmount || 0,
    };
  }, [statsResponse]);

  const cards = [
    {
      title: t('terminal.stats.totalPayments', 'Total Payments'),
      value: stats.totalPayments,
      icon: CreditCard,
      color: 'blue',
    },
    {
      title: t('terminal.stats.totalAmount', 'Total Amount'),
      value: formatPrice ? formatPrice(stats.totalAmount / 100) : `$${(stats.totalAmount / 100).toFixed(2)}`,
      icon: DollarSign,
      color: 'green',
    },
    {
      title: t('terminal.stats.totalRefunds', 'Total Refunds'),
      value: stats.totalRefunds,
      icon: RotateCcw,
      color: 'purple',
    },
    {
      title: t('terminal.stats.refundedAmount', 'Refunded Amount'),
      value: formatPrice ? formatPrice(stats.refundedAmount / 100) : `$${(stats.refundedAmount / 100).toFixed(2)}`,
      icon: ArrowDownCircle,
      color: 'red',
    },
  ];

  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.title} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase">{card.title}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[card.color]}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
};
