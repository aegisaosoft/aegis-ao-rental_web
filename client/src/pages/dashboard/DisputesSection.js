/*
 * DisputesSection - Stripe dispute management for tenants
 * Shows list of disputes, detail view, evidence upload, and accept/submit actions
 *
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  RefreshCw,
  Upload,
  Download,
  FileText,
  ChevronLeft,
  Calendar,
  CreditCard,
  User,
  Car,
  MapPin,
  Image as ImageIcon,
} from 'lucide-react';
import { Card, LoadingSpinner } from '../../components/common';
import { translatedApiService as apiService } from '../../services/translatedApi';
import { useCompany } from '../../context/CompanyContext';

// === Constants ===

const DISPUTE_STATUS_LABELS = {
  needs_response: 'Needs Response',
  under_review: 'Under Review',
  won: 'Won',
  lost: 'Lost',
  warning_needs_response: 'Warning: Needs Response',
  warning_under_review: 'Warning: Under Review',
  warning_closed: 'Warning: Closed',
  charge_refunded: 'Charge Refunded',
};

const DISPUTE_REASON_LABELS = {
  duplicate: 'Duplicate',
  fraudulent: 'Fraudulent',
  subscription_canceled: 'Subscription Canceled',
  product_unacceptable: 'Product Unacceptable',
  product_not_received: 'Product Not Received',
  unrecognized: 'Unrecognized',
  credit_not_processed: 'Credit Not Processed',
  general: 'General',
  incorrect_account_details: 'Incorrect Account Details',
  insufficient_funds: 'Insufficient Funds',
  bank_cannot_process: 'Bank Cannot Process',
  debit_not_authorized: 'Debit Not Authorized',
  customer_initiated: 'Customer Initiated',
};

const AUTO_RESPONSE_STATUS_LABELS = {
  pending: 'Pending',
  preparing: 'Preparing',
  submitted: 'Submitted',
  failed: 'Failed',
  skipped: 'Skipped',
};

const EVIDENCE_TYPE_LABELS = {
  rental_agreement: 'Rental Agreement',
  dl_photos: 'Driver License Photos',
  toll_receipt: 'Toll Receipt / Report',
  customer_communication: 'Customer Communication',
  receipt: 'Receipt',
  service_documentation: 'Service Documentation',
  company_agreement: 'Company Agreement',
  uncategorized: 'Other Document',
};

const STATUS_COLORS = {
  needs_response: 'bg-red-100 text-red-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-gray-100 text-gray-800',
  warning_needs_response: 'bg-red-200 text-red-900',
  warning_under_review: 'bg-yellow-200 text-yellow-900',
  warning_closed: 'bg-gray-200 text-gray-700',
  charge_refunded: 'bg-blue-100 text-blue-800',
};

const TIMELINE_ICONS = {
  created: '📋',
  auto_response_started: '🤖',
  evidence_collected: '📎',
  evidence_uploaded_to_stripe: '☁️',
  auto_response_submitted: '✅',
  manual_evidence_added: '📄',
  manual_evidence_submitted: '📤',
  status_updated: '🔄',
  accepted: '🏳️',
  error: '❌',
};

// === Helper Functions ===

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'N/A';
  }
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(dateStr);
};

const getTimeRemaining = (evidenceDueBy) => {
  if (!evidenceDueBy) return null;
  const due = new Date(evidenceDueBy);
  const now = new Date();
  const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursLeft < 0) return 'Expired';
  if (hoursLeft < 24) return `${Math.round(hoursLeft)}h remaining`;
  return `${Math.round(hoursLeft / 24)}d remaining`;
};

// ============================================================
// DISPUTES LIST VIEW
// ============================================================

const DisputesList = ({ disputes, stats, isLoading, filters, setFilters, totalPages, onViewDispute, onSync, isSyncing, t }) => {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-red-600">{stats.needsResponseCount || 0}</div>
            <div className="text-sm text-gray-500 mt-1">{t('admin.disputes.needsResponse', 'Needs Response')}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-gray-900">
              ${(stats.totalOpenAmount || 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-500 mt-1">{t('admin.disputes.totalOpenAmount', 'Total Open Amount')}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.winRate90Days || 0}%</div>
            <div className="text-sm text-gray-500 mt-1">{t('admin.disputes.winRate', 'Win Rate (90 days)')}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card title={
        <div className="flex items-center justify-between w-full">
          <span>{t('admin.disputes.title', 'Disputes')}</span>
          <span className="text-sm font-normal text-gray-500">
            {disputes?.totalCount ?? 0} {t('admin.disputes.total', 'total')}
          </span>
        </div>
      }>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {t('admin.disputes.search', 'Search')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin.disputes.searchPlaceholder', 'Dispute ID, Charge ID...')}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {t('admin.disputes.status', 'Status')}
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('admin.disputes.allStatuses', 'All Statuses')}</option>
              {Object.entries(DISPUTE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {t('admin.disputes.from', 'From')}
            </label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {t('admin.disputes.to', 'To')}
            </label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">{t('admin.disputes.disputeId', 'Dispute ID')}</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">{t('admin.disputes.date', 'Date')}</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">{t('admin.disputes.amount', 'Amount')}</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">{t('admin.disputes.status', 'Status')}</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">{t('admin.disputes.reason', 'Reason')}</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">{t('admin.disputes.autoResponse', 'Auto Response')}</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">{t('admin.disputes.deadline', 'Deadline')}</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">{t('admin.disputes.driver', 'Driver')}</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500">{t('admin.disputes.action', 'Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes?.items?.map((dispute) => {
                    const timeRemaining = getTimeRemaining(dispute.evidenceDueBy);
                    const isUrgent =
                      dispute.evidenceDueBy &&
                      new Date(dispute.evidenceDueBy).getTime() - Date.now() < 24 * 60 * 60 * 1000;

                    return (
                      <tr
                        key={dispute.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => onViewDispute(dispute.id)}
                      >
                        <td className="py-3 px-2 font-mono text-xs">
                          {dispute.stripeDisputeId?.substring(0, 20)}...
                        </td>
                        <td className="py-3 px-2">{formatDate(dispute.createdAt)}</td>
                        <td className="py-3 px-2 text-right font-medium">
                          ${(dispute.amount || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[dispute.status] || 'bg-gray-100 text-gray-800'}`}>
                            {DISPUTE_STATUS_LABELS[dispute.status] || dispute.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs">
                          {DISPUTE_REASON_LABELS[dispute.reason] || dispute.reason}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            dispute.autoResponseStatus === 'submitted'
                              ? 'bg-green-100 text-green-700'
                              : dispute.autoResponseStatus === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {AUTO_RESPONSE_STATUS_LABELS[dispute.autoResponseStatus] || dispute.autoResponseStatus || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {timeRemaining && (
                            <span className={`text-xs font-medium ${isUrgent ? 'text-red-600' : 'text-gray-500'}`}>
                              {isUrgent && <AlertTriangle className="inline w-3 h-3 mr-1" />}
                              {timeRemaining}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-xs">{dispute.driverName || '-'}</td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDispute(dispute.id);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            {dispute.status === 'needs_response' ? t('admin.disputes.respond', 'Respond') : t('admin.disputes.view', 'View')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {(!disputes?.items || disputes.items.length === 0) && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500">
                        {t('admin.disputes.noDisputes', 'No disputes found')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {disputes && disputes.totalCount > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  {t('admin.disputes.showing', 'Showing')} {((filters.page - 1) * filters.pageSize) + 1}–{Math.min(filters.page * filters.pageSize, disputes.totalCount)} {t('admin.disputes.of', 'of')} {disputes.totalCount}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {t('admin.disputes.page', 'Page')} {filters.page} / {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
                        disabled={filters.page <= 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                      >
                        {t('admin.disputes.previous', 'Previous')}
                      </button>
                      <button
                        onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
                        disabled={filters.page >= totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                      >
                        {t('admin.disputes.next', 'Next')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

// ============================================================
// DISPUTE DETAIL VIEW
// ============================================================

const DisputeDetail = ({ disputeId, onBack, t }) => {
  const queryClient = useQueryClient();
  const { formatPrice } = useCompany();

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDLModal, setShowDLModal] = useState(null); // 'front' | 'back' | null
  const [additionalText, setAdditionalText] = useState('');
  const [uploadType, setUploadType] = useState('uncategorized');

  // Fetch dispute details
  const { data: detailData, isLoading, error } = useQuery(
    ['dispute', disputeId],
    async () => {
      const response = await apiService.getDispute(disputeId);
      return response?.data || response;
    },
    { enabled: !!disputeId }
  );

  // Fetch timeline
  const { data: timeline } = useQuery(
    ['disputeTimeline', disputeId],
    async () => {
      const response = await apiService.getDisputeTimeline(disputeId);
      return response?.data || response || [];
    },
    { enabled: !!disputeId }
  );

  // Mutations
  const acceptMutation = useMutation(
    () => apiService.acceptDispute(disputeId),
    {
      onSuccess: () => {
        toast.success(t('admin.disputes.disputeAccepted', 'Dispute accepted'));
        queryClient.invalidateQueries(['dispute', disputeId]);
        setShowAcceptModal(false);
      },
      onError: () => toast.error(t('admin.disputes.acceptFailed', 'Failed to accept dispute')),
    }
  );

  const uploadMutation = useMutation(
    ({ file, type }) => apiService.uploadDisputeDocument(disputeId, file, type),
    {
      onSuccess: () => {
        toast.success(t('admin.disputes.documentUploaded', 'Document uploaded'));
        queryClient.invalidateQueries(['dispute', disputeId]);
      },
      onError: () => toast.error(t('admin.disputes.uploadFailed', 'Failed to upload document')),
    }
  );

  const submitEvidenceMutation = useMutation(
    () => apiService.submitDisputeEvidence(disputeId, { uncategorizedText: additionalText || undefined }),
    {
      onSuccess: () => {
        toast.success(t('admin.disputes.evidenceSubmitted', 'Evidence submitted to Stripe'));
        setAdditionalText('');
        queryClient.invalidateQueries(['dispute', disputeId]);
      },
      onError: () => toast.error(t('admin.disputes.submitFailed', 'Failed to submit evidence')),
    }
  );

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate({ file, type: uploadType });
    }
    // Reset input
    e.target.value = '';
  }, [uploadType, uploadMutation]);

  if (isLoading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
  if (error || !detailData) {
    return (
      <div className="text-center py-8 text-red-500">
        {t('admin.disputes.loadFailed', 'Failed to load dispute')}
      </div>
    );
  }

  const { dispute, payment, companyOwner, driver, rental, tollTransactions, evidence } = detailData;
  if (!dispute) {
    return <div className="text-center py-8 text-red-500">{t('admin.disputes.loadFailed', 'Failed to load dispute')}</div>;
  }

  const hoursUntilDeadline = dispute.evidenceDueBy
    ? (new Date(dispute.evidenceDueBy).getTime() - Date.now()) / (1000 * 60 * 60)
    : null;
  const isUrgent = hoursUntilDeadline !== null && hoursUntilDeadline < 24 && hoursUntilDeadline > 0;
  const isPastDeadline = hoursUntilDeadline !== null && hoursUntilDeadline <= 0;
  const canRespond = dispute.status === 'needs_response' || dispute.status === 'warning_needs_response';

  const autoEvidence = evidence?.filter(e => e.source === 'auto') || [];
  const manualEvidence = evidence?.filter(e => e.source === 'manual') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('admin.disputes.disputeDetails', 'Dispute Details')}</h2>
          <p className="text-sm text-gray-500 font-mono">{dispute.stripeDisputeId}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[dispute.status] || 'bg-gray-100 text-gray-800'}`}>
            {dispute.status === 'needs_response' && <AlertTriangle className="w-4 h-4" />}
            {dispute.status === 'won' && <CheckCircle className="w-4 h-4" />}
            {dispute.status === 'lost' && <XCircle className="w-4 h-4" />}
            {dispute.status === 'under_review' && <Clock className="w-4 h-4" />}
            {DISPUTE_STATUS_LABELS[dispute.status] || dispute.status}
          </span>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('admin.disputes.backToList', 'Back')}
          </button>
        </div>
      </div>

      {/* Urgent Warning */}
      {isUrgent && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">{t('admin.disputes.urgentDeadline', 'Urgent: Evidence deadline approaching')}</p>
            <p className="text-sm text-red-600">
              {Math.round(hoursUntilDeadline)} {t('admin.disputes.hoursRemaining', 'hours remaining to submit evidence')}
            </p>
          </div>
        </div>
      )}
      {isPastDeadline && canRespond && (
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="w-6 h-6 text-gray-500 flex-shrink-0" />
          <p className="font-semibold text-gray-700">{t('admin.disputes.deadlinePassed', 'Evidence deadline has passed')}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dispute Info */}
          <Card title={
            <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> {t('admin.disputes.disputeInfo', 'Dispute Information')}</span>
          }>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">{t('admin.disputes.amount', 'Amount')}</span>
                <p className="font-semibold text-lg">${(dispute.amount || 0).toFixed(2)} {(dispute.currency || 'usd').toUpperCase()}</p>
              </div>
              <div>
                <span className="text-gray-500">{t('admin.disputes.reason', 'Reason')}</span>
                <p className="font-medium">{DISPUTE_REASON_LABELS[dispute.reason] || dispute.reason}</p>
                {dispute.networkReasonDescription && (
                  <p className="text-xs text-gray-400 mt-0.5">{dispute.networkReasonDescription}</p>
                )}
              </div>
              <div>
                <span className="text-gray-500">{t('admin.disputes.networkCode', 'Network Reason Code')}</span>
                <p className="font-mono text-xs">{dispute.networkReasonCode || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">{t('admin.disputes.evidenceDue', 'Evidence Due By')}</span>
                <p className={isPastDeadline ? 'text-gray-400 line-through' : isUrgent ? 'text-red-600 font-bold' : ''}>
                  {formatDateTime(dispute.evidenceDueBy)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">{t('admin.disputes.created', 'Created')}</span>
                <p>{formatDateTime(dispute.createdAt)}</p>
              </div>
              <div>
                <span className="text-gray-500">{t('admin.disputes.chargeId', 'Charge ID')}</span>
                <p className="font-mono text-xs break-all">{dispute.stripeChargeId}</p>
              </div>
              {dispute.acceptedAt && (
                <div className="col-span-2">
                  <span className="text-gray-500">{t('admin.disputes.acceptedAt', 'Accepted At')}</span>
                  <p className="text-red-600">{formatDateTime(dispute.acceptedAt)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Rental Details */}
          {rental && (
            <Card title={
              <span className="flex items-center gap-2"><Car className="w-4 h-4" /> {t('admin.disputes.rentalDetails', 'Rental / Booking Details')}</span>
            }>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('admin.disputes.agreementNumber', 'Agreement #')}</span>
                  <p className="font-medium">{rental.agreementNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t('admin.disputes.rentalPeriod', 'Rental Period')}</span>
                  {rental.startDate && rental.endDate ? (
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(rental.startDate)} — {formatDate(rental.endDate)}
                    </p>
                  ) : <p className="text-gray-400">N/A</p>}
                </div>
                <div>
                  <span className="text-gray-500">{t('admin.disputes.vehicle', 'Vehicle')}</span>
                  <p className="font-medium">{rental.vehicleDescription || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t('admin.disputes.licensePlate', 'License Plate')}</span>
                  <p className="font-mono font-medium">{rental.licensePlate || 'N/A'}</p>
                </div>
                {rental.rentalAgreementUrl && (
                  <div className="col-span-2">
                    <span className="text-gray-500">{t('admin.disputes.rentalAgreement', 'Rental Agreement')}</span>
                    <p>
                      <a
                        href={rental.rentalAgreementUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm"
                      >
                        <FileText className="w-3.5 h-3.5" /> {t('admin.disputes.viewAgreement', 'View Agreement PDF')}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Driver & Owner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {driver && (
              <Card title={
                <span className="flex items-center gap-2 text-sm"><User className="w-4 h-4" /> {t('admin.disputes.driverRenter', 'Driver / Renter')}</span>
              }>
                <div className="text-sm space-y-2">
                  <p><span className="text-gray-500">{t('admin.disputes.name', 'Name')}:</span> <span className="font-medium">{driver.firstName} {driver.lastName}</span></p>
                  {driver.email && <p><span className="text-gray-500">{t('admin.disputes.email', 'Email')}:</span> {driver.email}</p>}
                  {driver.phone && <p><span className="text-gray-500">{t('admin.disputes.phone', 'Phone')}:</span> {driver.phone}</p>}
                  {(driver.dlFrontImageUrl || driver.dlBackImageUrl) && (
                    <div className="pt-2 border-t border-gray-100 mt-2">
                      <p className="text-gray-500 text-xs mb-1.5">{t('admin.disputes.driverLicense', 'Driver License')}</p>
                      <div className="flex gap-2">
                        {driver.dlFrontImageUrl && (
                          <button
                            onClick={() => setShowDLModal('front')}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline px-2 py-1 border border-blue-200 rounded bg-blue-50"
                          >
                            <ImageIcon className="w-3 h-3" /> {t('admin.disputes.front', 'Front')}
                          </button>
                        )}
                        {driver.dlBackImageUrl && (
                          <button
                            onClick={() => setShowDLModal('back')}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline px-2 py-1 border border-blue-200 rounded bg-blue-50"
                          >
                            <ImageIcon className="w-3 h-3" /> {t('admin.disputes.back', 'Back')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {companyOwner && (
              <Card title={
                <span className="flex items-center gap-2 text-sm"><User className="w-4 h-4" /> {t('admin.disputes.companyOwner', 'Company Owner')}</span>
              }>
                <div className="text-sm space-y-2">
                  <p><span className="text-gray-500">{t('admin.disputes.name', 'Name')}:</span> <span className="font-medium">{companyOwner.name}</span></p>
                  {companyOwner.companyName && <p><span className="text-gray-500">{t('admin.disputes.company', 'Company')}:</span> {companyOwner.companyName}</p>}
                  {companyOwner.email && <p><span className="text-gray-500">{t('admin.disputes.email', 'Email')}:</span> {companyOwner.email}</p>}
                </div>
              </Card>
            )}
          </div>

          {/* Payment Info */}
          {payment && (
            <Card title={
              <span className="flex items-center gap-2 text-sm"><CreditCard className="w-4 h-4" /> {t('admin.disputes.paymentDetails', 'Payment Details')}</span>
            }>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('admin.disputes.amount', 'Amount')}</span>
                  <p className="font-medium">${(payment.amount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t('admin.disputes.description', 'Description')}</span>
                  <p>{payment.description || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t('admin.disputes.paymentIntent', 'Payment Intent')}</span>
                  <p className="font-mono text-xs break-all">{payment.paymentIntentId}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Toll Transactions */}
          {tollTransactions && tollTransactions.length > 0 && (
            <Card title={
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {t('admin.disputes.tollTransactions', 'Toll Transactions')} ({tollTransactions.length})</span>
            }>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 text-gray-500">{t('admin.disputes.date', 'Date')}</th>
                      <th className="text-left py-2 px-2 text-gray-500">{t('admin.disputes.tollSystem', 'Toll System')}</th>
                      <th className="text-right py-2 px-2 text-gray-500">{t('admin.disputes.amount', 'Amount')}</th>
                      <th className="text-left py-2 px-2 text-gray-500">{t('admin.disputes.details', 'Details')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tollTransactions.map((toll, idx) => (
                      <tr key={toll.id || idx} className="border-b border-gray-100">
                        <td className="py-2 px-2">{formatDate(toll.tollDate)}</td>
                        <td className="py-2 px-2">{toll.tollSystemName || 'N/A'}</td>
                        <td className="py-2 px-2 text-right font-medium">${(toll.amount || 0).toFixed(2)}</td>
                        <td className="py-2 px-2 text-xs text-gray-500">{toll.details}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan={2} className="py-2 px-2 font-semibold">{t('admin.disputes.total', 'Total')}</td>
                      <td className="py-2 px-2 text-right font-semibold">
                        ${tollTransactions.reduce((sum, toll) => sum + (toll.amount || 0), 0).toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}

          {/* Collected Evidence */}
          <Card title={
            <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> {t('admin.disputes.collectedEvidence', 'Collected Evidence')} ({evidence?.length || 0})</span>
          }>
            {evidence && evidence.length > 0 ? (
              <div className="space-y-4">
                {autoEvidence.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('admin.disputes.autoCollected', 'Auto-Collected')}</p>
                    <div className="space-y-2">
                      {autoEvidence.map((ev) => (
                        <div key={ev.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          {ev.stripeFileId ? (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {EVIDENCE_TYPE_LABELS[ev.evidenceType] || ev.evidenceType}
                            </p>
                            {ev.fileName && <p className="text-xs text-gray-400 truncate">{ev.fileName}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {ev.stripeFileId && (
                              <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{t('admin.disputes.uploadedToStripe', 'Uploaded to Stripe')}</span>
                            )}
                            {ev.blobUrl && (
                              <a href={ev.blobUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800" title="Download">
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {manualEvidence.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('admin.disputes.manuallyAdded', 'Manually Added')}</p>
                    <div className="space-y-2">
                      {manualEvidence.map((ev) => (
                        <div key={ev.id} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                          {ev.stripeFileId ? (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {EVIDENCE_TYPE_LABELS[ev.evidenceType] || ev.evidenceType}
                            </p>
                            {ev.fileName && <p className="text-xs text-gray-400 truncate">{ev.fileName}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {ev.stripeFileId && (
                              <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Stripe</span>
                            )}
                            {ev.blobUrl && (
                              <a href={ev.blobUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800" title="Download">
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t('admin.disputes.noEvidence', 'No evidence collected yet')}</p>
            )}
          </Card>

          {/* Submit Additional Evidence */}
          {canRespond && (
            <Card title={t('admin.disputes.submitEvidence', 'Submit Additional Evidence')}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.disputes.additionalExplanation', 'Additional Explanation')}
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder={t('admin.disputes.explanationPlaceholder', 'Add additional explanation text for the dispute...')}
                    value={additionalText}
                    onChange={(e) => setAdditionalText(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.disputes.uploadDocuments', 'Upload Additional Documents')}
                  </label>
                  <div className="flex items-center gap-3">
                    <select
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value)}
                    >
                      <option value="uncategorized">{t('admin.disputes.otherDocument', 'Other Document')}</option>
                      <option value="customer_communication">{t('admin.disputes.customerComm', 'Customer Communication')}</option>
                      <option value="receipt">{t('admin.disputes.receipt', 'Receipt')}</option>
                      <option value="service_documentation">{t('admin.disputes.serviceDoc', 'Service Documentation')}</option>
                      <option value="toll_receipt">{t('admin.disputes.tollReceipt', 'Toll Receipt')}</option>
                    </select>
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                      <Upload className="w-4 h-4" />
                      {t('admin.disputes.chooseFile', 'Choose File')}
                      <input type="file" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => submitEvidenceMutation.mutate()}
                    disabled={submitEvidenceMutation.isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitEvidenceMutation.isLoading ? t('admin.disputes.submitting', 'Submitting...') : t('admin.disputes.submitEvidenceBtn', 'Submit Additional Evidence')}
                  </button>
                  <button
                    onClick={() => setShowAcceptModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100"
                  >
                    {t('admin.disputes.acceptDispute', 'Accept Dispute (Concede)')}
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Auto Response Status */}
          <Card title={<span className="text-sm font-semibold">{t('admin.disputes.autoResponse', 'Auto Response')}</span>}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('admin.disputes.status', 'Status')}</span>
                <span className={`text-sm font-medium px-2 py-1 rounded ${
                  dispute.autoResponseStatus === 'submitted' ? 'bg-green-100 text-green-700'
                  : dispute.autoResponseStatus === 'failed' ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {AUTO_RESPONSE_STATUS_LABELS[dispute.autoResponseStatus] || dispute.autoResponseStatus || '-'}
                </span>
              </div>
              {dispute.autoResponseSubmittedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('admin.disputes.submittedAt', 'Submitted At')}</span>
                  <span className="text-sm">{formatDateTime(dispute.autoResponseSubmittedAt)}</span>
                </div>
              )}
              {dispute.manualOverride && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('admin.disputes.manualOverride', 'Manual Override')}</span>
                  <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{t('admin.disputes.yes', 'Yes')}</span>
                </div>
              )}
            </div>

            {/* Evidence Summary */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('admin.disputes.evidenceSummary', 'Evidence Summary')}</p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('admin.disputes.autoCollected', 'Auto-collected')}</span>
                  <span className="font-medium">{autoEvidence.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('admin.disputes.manual', 'Manual')}</span>
                  <span className="font-medium">{manualEvidence.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('admin.disputes.uploadedToStripe', 'Uploaded to Stripe')}</span>
                  <span className="font-medium text-green-600">
                    {evidence?.filter(e => e.stripeFileId).length || 0}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Timeline */}
          <Card title={<span className="text-sm font-semibold">{t('admin.disputes.timeline', 'Timeline')}</span>}>
            {timeline && timeline.length > 0 ? (
              <div className="space-y-3">
                {timeline.map((event, idx) => (
                  <div key={event.id || idx} className="flex gap-3 text-sm">
                    <span className="text-lg flex-shrink-0">
                      {TIMELINE_ICONS[event.eventType] || '📌'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-gray-800">{event.description}</p>
                      <p className="text-xs text-gray-400">{formatTimeAgo(event.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t('admin.disputes.noEvents', 'No events yet')}</p>
            )}
          </Card>
        </div>
      </div>

      {/* Accept Modal */}
      {showAcceptModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowAcceptModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('admin.disputes.acceptDisputeTitle', 'Accept Dispute?')}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('admin.disputes.acceptWarning', 'This will concede the dispute in favor of the cardholder. The disputed amount of')}
                {' '}<strong>${(dispute.amount || 0).toFixed(2)}</strong>{' '}
                {t('admin.disputes.acceptWarning2', 'will not be returned. This action cannot be undone.')}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAcceptModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('admin.disputes.cancel', 'Cancel')}
                </button>
                <button
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {acceptMutation.isLoading ? t('admin.disputes.accepting', 'Accepting...') : t('admin.disputes.confirmAccept', 'Accept Dispute')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Driver License Modal */}
      {showDLModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowDLModal(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('admin.disputes.driverLicense', 'Driver License')} — {showDLModal === 'front' ? t('admin.disputes.front', 'Front') : t('admin.disputes.back', 'Back')}
                </h3>
                <button onClick={() => setShowDLModal(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="flex justify-center">
                {showDLModal === 'front' && driver?.dlFrontImageUrl && (
                  <img src={driver.dlFrontImageUrl} alt="DL Front" className="max-w-full max-h-[60vh] rounded-lg border" />
                )}
                {showDLModal === 'back' && driver?.dlBackImageUrl && (
                  <img src={driver.dlBackImageUrl} alt="DL Back" className="max-w-full max-h-[60vh] rounded-lg border" />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================
// MAIN DISPUTES SECTION (Orchestrator)
// ============================================================

const DisputesSection = ({ currentCompanyId, isAuthenticated }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedDisputeId, setSelectedDisputeId] = useState(null);

  const [filters, setFilters] = useState({
    status: '',
    search: '',
    from: '',
    to: '',
    page: 1,
    pageSize: 20,
    sortBy: 'CreatedAt',
    sortDir: 'desc',
  });

  // Fetch disputes list
  const { data: disputesData, isLoading } = useQuery(
    ['disputes', filters, currentCompanyId],
    async () => {
      const response = await apiService.getDisputes({
        ...filters,
        companyOwnerId: currentCompanyId || undefined,
      });
      return response?.data || response;
    },
    {
      enabled: isAuthenticated && !selectedDisputeId,
      keepPreviousData: true,
    }
  );

  // Fetch stats
  const { data: stats } = useQuery(
    ['disputeStats', currentCompanyId],
    async () => {
      const response = await apiService.getDisputeStats(currentCompanyId || undefined);
      return response?.data || response;
    },
    { enabled: isAuthenticated }
  );

  const totalPages = disputesData ? Math.ceil((disputesData.totalCount || 0) / filters.pageSize) : 0;

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await apiService.syncDisputesFromStripe();
      // Wait for background processing
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await queryClient.invalidateQueries(['disputes']);
      await queryClient.invalidateQueries(['disputeStats']);
      toast.success(t('admin.disputes.syncComplete', 'Disputes synced from Stripe'));
    } catch (err) {
      console.error('Failed to sync disputes:', err);
      toast.error(t('admin.disputes.syncFailed', 'Failed to sync disputes from Stripe'));
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient, t]);

  // Detail view
  if (selectedDisputeId) {
    return (
      <DisputeDetail
        disputeId={selectedDisputeId}
        onBack={() => setSelectedDisputeId(null)}
        t={t}
      />
    );
  }

  // List view
  return (
    <div className="space-y-4">
      {/* Header with sync button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {t('admin.disputes.title', 'Disputes')}
        </h2>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? t('admin.disputes.syncing', 'Syncing...') : t('admin.disputes.refreshFromStripe', 'Refresh from Stripe')}
        </button>
      </div>

      <DisputesList
        disputes={disputesData}
        stats={stats}
        isLoading={isLoading}
        filters={filters}
        setFilters={setFilters}
        totalPages={totalPages}
        onViewDispute={(id) => setSelectedDisputeId(id)}
        onSync={handleSync}
        isSyncing={isSyncing}
        t={t}
      />
    </div>
  );
};

export default DisputesSection;
