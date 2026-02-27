/*
 * TerminalSection - Stripe Terminal management dashboard section
 * Shows reader status, payment history, and refund capability
 *
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import {
  RefreshCw,
  CreditCard,
  Wifi,
  WifiOff,
  ArrowDownCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Smartphone,
  Settings,
  MapPin,
} from 'lucide-react';
import { Card, LoadingSpinner } from '../../components/common';
import { useCompany } from '../../context/CompanyContext';
import { translatedApiService as apiService } from '../../services/translatedApi';
import { useStripeTerminal } from '../../hooks/useStripeTerminal';
import TerminalSetupPanel from './TerminalSetupPanel';

// ============== PAYMENT HISTORY LIST ==============

const PaymentHistoryList = ({ t, currentCompanyId, isAuthenticated, formatPrice }) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch terminal payments
  const { data: paymentsResponse, isLoading } = useQuery(
    ['terminalPayments', currentCompanyId, statusFilter, searchFilter, page, pageSize],
    () => apiService.getTerminalPayments({
      companyId: currentCompanyId,
      status: statusFilter,
      search: searchFilter,
      page,
      pageSize,
    }),
    {
      enabled: isAuthenticated && !!currentCompanyId,
      keepPreviousData: true,
    }
  );

  const paymentsData = useMemo(() => {
    const payload = paymentsResponse?.data || paymentsResponse;
    if (!payload) return { items: [], totalCount: 0 };
    if (payload.items) return payload;
    if (Array.isArray(payload)) return { items: payload, totalCount: payload.length };
    return { items: [], totalCount: 0 };
  }, [paymentsResponse]);

  const totalPages = Math.ceil((paymentsData.totalCount || 0) / pageSize) || 1;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'succeeded' || s === 'captured') return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: t('terminal.history.succeeded', 'Succeeded') };
    if (s === 'requires_capture' || s === 'authorized') return { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: t('terminal.history.authorized', 'Authorized') };
    if (s === 'refunded') return { color: 'bg-purple-100 text-purple-800', icon: RotateCcw, label: t('terminal.history.refunded', 'Refunded') };
    if (s === 'partially_refunded') return { color: 'bg-indigo-100 text-indigo-800', icon: RotateCcw, label: t('terminal.history.partialRefund', 'Partial Refund') };
    if (s === 'canceled' || s === 'cancelled') return { color: 'bg-red-100 text-red-800', icon: XCircle, label: t('terminal.history.canceled', 'Canceled') };
    if (s === 'failed') return { color: 'bg-red-100 text-red-800', icon: XCircle, label: t('terminal.history.failed', 'Failed') };
    return { color: 'bg-gray-100 text-gray-800', icon: Clock, label: status || '—' };
  };

  if (isLoading) {
    return <LoadingSpinner text={t('common.loading', 'Loading...')} />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => { setSearchFilter(e.target.value); setPage(1); }}
            placeholder={t('terminal.history.searchPlaceholder', 'Search by booking #, customer...')}
            className="input-field w-full pl-9"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field w-full"
          >
            <option value="">{t('common.allStatuses', 'All Statuses')}</option>
            <option value="succeeded">{t('terminal.history.succeeded', 'Succeeded')}</option>
            <option value="requires_capture">{t('terminal.history.authorized', 'Authorized')}</option>
            <option value="refunded">{t('terminal.history.refunded', 'Refunded')}</option>
            <option value="canceled">{t('terminal.history.canceled', 'Canceled')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('terminal.history.date', 'Date')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('terminal.history.booking', 'Booking')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('terminal.history.customer', 'Customer')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('terminal.history.type', 'Type')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('terminal.history.amount', 'Amount')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('terminal.history.status', 'Status')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('terminal.history.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(!paymentsData.items || paymentsData.items.length === 0) ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {t('terminal.history.noPayments', 'No terminal payments found')}
                </td>
              </tr>
            ) : (
              paymentsData.items.map((payment) => {
                const badge = getStatusBadge(payment.status);
                const BadgeIcon = badge.icon;
                return (
                  <tr key={payment.id || payment.paymentIntentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(payment.createdAt || payment.created)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">{payment.bookingNumber || payment.metadata?.bookingNumber || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{payment.customerName || payment.metadata?.customerName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5" />
                        {payment.paymentType || payment.metadata?.paymentType || 'terminal'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatPrice ? formatPrice(payment.amount / 100) : `$${(payment.amount / 100).toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
                        <BadgeIcon className="h-3 w-3" />
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {(payment.status === 'succeeded' || payment.status === 'captured') && !payment.refunded && (
                        <RefundButton
                          t={t}
                          payment={payment}
                          currentCompanyId={currentCompanyId}
                          formatPrice={formatPrice}
                        />
                      )}
                      {payment.refundedAmount > 0 && (
                        <span className="text-xs text-purple-600">
                          {t('terminal.history.refundedAmount', 'Refunded')}: {formatPrice ? formatPrice(payment.refundedAmount / 100) : `$${(payment.refundedAmount / 100).toFixed(2)}`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paymentsData.totalCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {t('admin.showingBookings', 'Showing {{from}}-{{to}} of {{total}}', {
              from: (page - 1) * pageSize + 1,
              to: Math.min(page * pageSize, paymentsData.totalCount),
              total: paymentsData.totalCount,
            })}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(1)} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronsLeft className="h-5 w-5" /></button>
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronLeft className="h-5 w-5" /></button>
            <span className="text-sm">{t('admin.pageOf', 'Page {{page}} of {{total}}', { page, total: totalPages })}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronRight className="h-5 w-5" /></button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronsRight className="h-5 w-5" /></button>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="ml-2 input-field">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// ============== REFUND BUTTON ==============

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
                      className="input-field w-full pl-9"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">{t('terminal.refund.reason', 'Reason')}</label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="input-field w-full"
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

// ============== READER STATUS PANEL ==============

const ReaderStatusPanel = ({ t, locationId }) => {
  const {
    reader,
    loading,
    discoveredReaders,
    discoverReaders,
    connectReader,
    disconnectReader,
    isConnected,
    isInitialized,
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
            <div className="text-center py-6">
              <WifiOff className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-1">{t('terminal.noReaders', 'No card readers found')}</p>
              <p className="text-xs text-gray-400">{t('terminal.ensureReaderOn', 'Ensure your card reader is powered on and connected to the internet.')}</p>
              <button
                onClick={handleDiscover}
                disabled={isDiscovering}
                className="mt-3 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                {isDiscovering ? t('terminal.discovering', 'Discovering...') : t('terminal.discoverReaders', 'Discover Readers')}
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// ============== STATS CARDS ==============

const StatsCards = ({ t, currentCompanyId, isAuthenticated, formatPrice }) => {
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

// ============== MAIN TERMINAL SECTION ==============

const TerminalSection = ({ currentCompanyId, isAuthenticated }) => {
  const { t } = useTranslation();
  const { formatPrice } = useCompany();
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'setup'
  const [selectedLocationId, setSelectedLocationId] = useState('');

  // Fetch locations for the location selector on Payments tab
  const { data: locationsResponse } = useQuery(
    ['terminalLocations', currentCompanyId],
    async () => {
      const res = await apiService.getTerminalLocations(currentCompanyId);
      return res.data || res;
    },
    { enabled: isAuthenticated && !!currentCompanyId }
  );

  const locations = useMemo(() => {
    if (Array.isArray(locationsResponse)) return locationsResponse;
    return [];
  }, [locationsResponse]);

  const tabs = [
    { id: 'payments', label: t('terminal.tabs.payments', 'Payments'), icon: CreditCard },
    { id: 'setup', label: t('terminal.tabs.setup', 'Setup'), icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <>
          {/* Stats */}
          <StatsCards
            t={t}
            currentCompanyId={currentCompanyId}
            isAuthenticated={isAuthenticated}
            formatPrice={formatPrice}
          />

          {/* Location Selector + Reader Status */}
          {locations.length > 0 && (
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="input-field text-sm max-w-xs"
              >
                <option value="">{t('terminal.setup.allLocations', 'All Locations')}</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.displayName} — {loc.address?.city}, {loc.address?.state}
                  </option>
                ))}
              </select>
            </div>
          )}

          <ReaderStatusPanel t={t} locationId={selectedLocationId || null} />

          {/* Payment History */}
          <Card title={t('terminal.history.title', 'Terminal Payment History')}>
            <PaymentHistoryList
              t={t}
              currentCompanyId={currentCompanyId}
              isAuthenticated={isAuthenticated}
              formatPrice={formatPrice}
            />
          </Card>
        </>
      )}

      {/* Setup Tab */}
      {activeTab === 'setup' && (
        <TerminalSetupPanel
          currentCompanyId={currentCompanyId}
          isAuthenticated={isAuthenticated}
        />
      )}
    </div>
  );
};

export default TerminalSection;
