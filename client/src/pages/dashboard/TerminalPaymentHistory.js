/*
 * TerminalPaymentHistory - Payment history table with search and pagination
 *
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import {
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { LoadingSpinner } from '../../components/common';
import { translatedApiService as apiService } from '../../services/translatedApi';
import RefundButton from './modals/TerminalRefundModal';

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
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors placeholder-gray-400"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
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
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="ml-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
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

export default PaymentHistoryList;
