/*
 * ReservationsSection - Fully autonomous reservations/bookings management
 * Includes booking list, filters, pagination, modals, payment processing
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight, Plus,
  Eye, FileText
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Card, LoadingSpinner } from '../../components/common';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { translatedApiService as apiService } from '../../services/translatedApi';
import { useBookingsQuery, useBookingModals } from './hooks';
import {
  CancelRefundModal,
  SyncConfirmModal,
  SecurityDepositModal,
  BookingPaymentModal,
  DamageConfirmationModal,
  BookingDetailsModal,
} from './modals';

const ReservationsSection = ({
  currentCompanyId,
  isAuthenticated,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { formatPrice, currencyCode } = useCompany();
  const { user, restoreUser } = useAuth();

  // ============== FILTER STATE ==============
  
  const [bookingDateFrom, setBookingDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [bookingDateTo, setBookingDateTo] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });
  const [bookingStatusFilter, setBookingStatusFilter] = useState('');
  const [bookingCustomerFilter, setBookingCustomerFilter] = useState('');
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingPageSize, setBookingPageSize] = useState(10);

  // ============== MODAL STATE (from hook) ==============
  
  const {
    selectedBooking,
    setSelectedBooking,
    showBookingDetailsModal,
    setShowBookingDetailsModal,
    showSyncConfirmModal,
    setShowSyncConfirmModal,
    showCancelRefundModal,
    setShowCancelRefundModal,
    cancelRefundAmount,
    setCancelRefundAmount,
    cancelRefundReason,
    setCancelRefundReason,
    pendingCancelStatus,
    setPendingCancelStatus,
    showSecurityDepositModal,
    setShowSecurityDepositModal,
    pendingActiveStatus,
    setPendingActiveStatus,
    payingSecurityDeposit,
    setPayingSecurityDeposit,
    showBookingPaymentModal,
    setShowBookingPaymentModal,
    pendingConfirmedStatus,
    setPendingConfirmedStatus,
    payingBooking,
    setPayingBooking,
    paymentMethod,
    setPaymentMethod,
    showDamageConfirmationModal,
    setShowDamageConfirmationModal,
    hasDamage,
    setHasDamage,
    damageAmount,
    setDamageAmount,
    pendingCompletedStatus,
    setPendingCompletedStatus,
  } = useBookingModals();

  // ============== QUERIES ==============

  const { data: companyBookingsResponse, isLoading: isLoadingBookings } = useBookingsQuery({
    companyId: currentCompanyId,
    enabled: isAuthenticated,
    filters: {
      bookingStatusFilter,
      bookingCustomerFilter,
      bookingDateFrom,
      bookingDateTo,
      bookingPage,
      bookingPageSize,
    },
  });

  // Fetch company data for security deposit settings
  const { data: companyData } = useQuery(
    ['companyData', currentCompanyId],
    () => apiService.getCompanyById(currentCompanyId),
    { enabled: isAuthenticated && !!currentCompanyId }
  );

  const actualCompanyData = useMemo(() => {
    if (!companyData) return null;
    return companyData?.data || companyData;
  }, [companyData]);

  // ============== MUTATIONS ==============

  const updateBookingStatusMutation = useMutation(
    ({ bookingId, status, securityDepositDamageAmount }) => 
      apiService.updateBooking(bookingId, { status, securityDepositDamageAmount }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyBookings', currentCompanyId]);
        setShowBookingDetailsModal(false);
        setSelectedBooking(null);
      },
      onError: (error) => {
        console.error('Error updating booking status:', error);
        toast.error(error.response?.data?.message || t('admin.bookingUpdateError', 'Failed to update booking status'));
      }
    }
  );

  const refundPaymentMutation = useMutation(
    ({ bookingId, amount, reason }) => apiService.refundPayment(bookingId, amount, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyBookings', currentCompanyId]);
        setShowBookingDetailsModal(false);
        setSelectedBooking(null);
      },
      onError: (error) => {
        console.error('Error processing refund:', error);
        toast.error(error.response?.data?.message || t('admin.refundError', 'Failed to process refund'));
      }
    }
  );

  // ============== DATA PROCESSING ==============

  const bookingsData = useMemo(() => {
    const payload = companyBookingsResponse?.data || companyBookingsResponse;
    if (!payload) {
      return { items: [], totalCount: 0, page: bookingPage, pageSize: bookingPageSize };
    }

    if (payload.items && typeof payload.totalCount === 'number') {
      return {
        items: payload.items,
        totalCount: payload.totalCount,
        page: payload.page || bookingPage,
        pageSize: payload.pageSize || bookingPageSize,
      };
    }

    const items = Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []);
    const totalCount = payload?.totalCount || payload?.total || items.length;
    
    return { items, totalCount, page: bookingPage, pageSize: bookingPageSize };
  }, [companyBookingsResponse, bookingPage, bookingPageSize]);

  const filteredBookings = bookingsData.items || [];
  const totalBookings = bookingsData.totalCount || 0;
  const totalBookingPages = Math.ceil(totalBookings / bookingPageSize) || 1;

  // ============== EFFECTS ==============

  useEffect(() => {
    setBookingPage(1);
  }, [bookingStatusFilter, bookingCustomerFilter, bookingDateFrom, bookingDateTo]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeSuccess = urlParams.get('stripe_success');
    const stripeCancel = urlParams.get('stripe_cancel');

    if (stripeSuccess === 'true') {
      const wasStripeRedirect = sessionStorage.getItem('stripeRedirect') === 'true';
      if (wasStripeRedirect) {
        const userBackup = sessionStorage.getItem('stripeUserBackup');
        if (userBackup) {
          try {
            const userData = JSON.parse(userBackup);
            if (userData.role && restoreUser) {
              restoreUser(userData);
            }
          } catch (e) {
            console.error('Error restoring user:', e);
          }
        }
        sessionStorage.removeItem('stripeRedirect');
        sessionStorage.removeItem('stripeRedirectTime');
        sessionStorage.removeItem('stripeUserBackup');
      }
      
      toast.success(t('admin.paymentSuccessful', 'Payment processed successfully!'));
      queryClient.invalidateQueries(['companyBookings', currentCompanyId]);
      
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('stripe_success');
      window.history.replaceState({}, '', newUrl.toString());
    }

    if (stripeCancel === 'true') {
      toast.info(t('admin.paymentCanceled', 'Payment was canceled.'));
      sessionStorage.removeItem('stripeRedirect');
      sessionStorage.removeItem('stripeRedirectTime');
      sessionStorage.removeItem('stripeUserBackup');
      
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('stripe_cancel');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [t, queryClient, currentCompanyId, restoreUser]);

  useEffect(() => {
    const bookingIdParam = searchParams.get('bookingId');
    const paymentParam = searchParams.get('payment');
    
    if (bookingIdParam && paymentParam === 'true' && filteredBookings.length > 0) {
      const booking = filteredBookings.find(b => {
        const id = b.id || b.Id || b.bookingId || b.BookingId;
        return id === bookingIdParam || id?.toString() === bookingIdParam;
      });
      
      if (booking) {
        setSelectedBooking(booking);
        setShowBookingPaymentModal(true);
        
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('bookingId');
        newSearchParams.delete('payment');
        navigate(`/admin?${newSearchParams.toString()}`, { replace: true });
      }
    }
  }, [searchParams, filteredBookings, navigate, setSelectedBooking, setShowBookingPaymentModal]);

  useEffect(() => {
    const pendingUpdate = sessionStorage.getItem('pendingBookingStatusUpdate');
    if (pendingUpdate && selectedBooking) {
      try {
        const update = JSON.parse(pendingUpdate);
        const bookingId = selectedBooking.id || selectedBooking.Id || selectedBooking.bookingId || selectedBooking.BookingId;
        
        if (update.bookingId === bookingId || update.bookingId?.toString() === bookingId?.toString()) {
          const isPaid = 
            (selectedBooking.paymentStatus === 'Paid' || selectedBooking.paymentStatus === 'succeeded') ||
            !!selectedBooking.stripePaymentIntentId;
          
          if (isPaid && update.status === 'Confirmed') {
            updateBookingStatusMutation.mutate({ bookingId, status: 'Confirmed' });
            sessionStorage.removeItem('pendingBookingStatusUpdate');
            setPendingConfirmedStatus('');
          }
        }
      } catch (error) {
        console.error('Error parsing pending status update:', error);
        sessionStorage.removeItem('pendingBookingStatusUpdate');
      }
    }
  }, [selectedBooking, updateBookingStatusMutation, setPendingConfirmedStatus]);

  useEffect(() => {
    if (bookingPage > totalBookingPages) {
      setBookingPage(totalBookingPages || 1);
    }
  }, [bookingPage, totalBookingPages]);

  // ============== HELPERS ==============

  const formatDate = useCallback((value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString();
  }, []);

  const formatBookingStatus = useCallback((status) => {
    if (!status) return t('booking.statusPending', 'Pending');
    const lower = String(status).toLowerCase();
    switch (lower) {
      case 'pending': return t('booking.statusPending', 'Pending');
      case 'confirmed': return t('booking.statusConfirmed', 'Confirmed');
      case 'active': return t('booking.statusActive', 'Active');
      case 'completed': return t('booking.statusCompleted', 'Completed');
      case 'cancelled':
      case 'canceled': return t('booking.statusCancelled', 'Cancelled');
      default: return status;
    }
  }, [t]);

  const getBookingStatusColor = useCallback((status) => {
    const lower = String(status || '').toLowerCase();
    switch (lower) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled':
      case 'canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  // ============== HANDLERS ==============

  const handleViewContract = async (booking) => {
    try {
      const bookingId = booking.id || booking.Id || booking.bookingId || booking.BookingId;
      if (!bookingId) {
        toast.error(t('admin.bookingIdMissing', 'Booking ID is missing.'));
        return;
      }
      const response = await apiService.getRentalAgreement(bookingId);
      const data = response?.data || response;
      const pdfUrl = data?.pdfUrl || data?.PdfUrl;
      if (pdfUrl) {
        const url = `${window.location.origin}/api${pdfUrl}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        toast.info(t('admin.agreementPdfNotReady', 'Agreement PDF not generated yet.'));
      }
    } catch (error) {
      console.error('View contract error:', error);
      toast.error(t('admin.agreementFetchFailed', 'Failed to fetch rental agreement.'));
    }
  };

  const handleOpenBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setShowBookingDetailsModal(true);
  };

  const handleUpdateBookingStatus = () => {
    if (!selectedBooking) return;
    
    const currentStatus = selectedBooking.status || selectedBooking.Status || '';
    let nextStatus = '';
    
    if (currentStatus.toLowerCase() === 'pending') nextStatus = 'Confirmed';
    else if (currentStatus.toLowerCase() === 'confirmed') nextStatus = 'Active';
    else if (currentStatus.toLowerCase() === 'active') nextStatus = 'Completed';
    else {
      toast.info(t('admin.statusAlreadyFinal', 'Booking status cannot be changed further.'));
      return;
    }
    
    if (currentStatus.toLowerCase() === 'pending' && nextStatus === 'Confirmed') {
      const isAlreadyPaid = 
        (selectedBooking.paymentStatus === 'Paid' || selectedBooking.paymentStatus === 'succeeded') ||
        !!selectedBooking.stripePaymentIntentId;
      
      if (!isAlreadyPaid) {
        setPendingConfirmedStatus(nextStatus);
        setShowBookingPaymentModal(true);
        return;
      }
    }
    
    if (nextStatus === 'Active') {
      const isDepositMandatory = actualCompanyData?.isSecurityDepositMandatory ?? true;
      const bookingDepositAmount = parseFloat(selectedBooking.securityDeposit || 0);
      const companyDepositAmount = parseFloat(actualCompanyData?.securityDeposit || 0);
      const depositAmount = bookingDepositAmount > 0 ? bookingDepositAmount : companyDepositAmount;
      const isDepositAlreadyPaid = !!selectedBooking.securityDepositPaymentIntentId;
      
      if (isDepositMandatory && depositAmount > 0 && !isDepositAlreadyPaid) {
        setPendingActiveStatus(nextStatus);
        setShowSecurityDepositModal(true);
        return;
      }
    }
    
    if (nextStatus === 'Completed') {
      setPendingCompletedStatus(nextStatus);
      setHasDamage(false);
      setShowDamageConfirmationModal(true);
      return;
    }
    
    updateBookingStatusMutation.mutate({ bookingId: selectedBooking.id, status: nextStatus });
  };

  const handleDamageConfirmation = async () => {
    if (!selectedBooking) return;
    
    if (!hasDamage) {
      updateBookingStatusMutation.mutate({ bookingId: selectedBooking.id, status: pendingCompletedStatus });
      setShowDamageConfirmationModal(false);
      setHasDamage(false);
      setDamageAmount('');
      return;
    }
    
    if (!selectedBooking.securityDepositPaymentIntentId) {
      updateBookingStatusMutation.mutate({ bookingId: selectedBooking.id, status: pendingCompletedStatus });
      setShowDamageConfirmationModal(false);
      setHasDamage(false);
      setDamageAmount('');
      toast.info(t('admin.noSecurityDepositToCharge', 'No security deposit to charge.'));
      return;
    }
    
    const maxDeposit = parseFloat(selectedBooking.securityDeposit || actualCompanyData?.securityDeposit || 0);
    const chargeAmount = parseFloat(damageAmount) || 0;
    
    if (chargeAmount <= 0 || chargeAmount > maxDeposit) {
      toast.error(t('admin.invalidDamageAmount', 'Invalid damage amount.'));
      return;
    }
    
    setPayingSecurityDeposit(true);
    try {
      await updateBookingStatusMutation.mutateAsync({
        bookingId: selectedBooking.id,
        status: pendingCompletedStatus,
        securityDepositDamageAmount: chargeAmount
      });
      setShowDamageConfirmationModal(false);
      setHasDamage(false);
      setDamageAmount('');
    } catch (error) {
      toast.error(t('admin.bookingCompleteError', 'Failed to complete booking'));
    } finally {
      setPayingSecurityDeposit(false);
    }
  };

  const handleInitiatePayment = async () => {
    if (!selectedBooking || !paymentMethod) {
      toast.error(t('admin.selectPaymentMethod', 'Please select a payment method'));
      return;
    }
    
    setPayingSecurityDeposit(true);
    
    try {
      if (paymentMethod === 'checkout') {
        const response = await apiService.createSecurityDepositCheckout(selectedBooking.id, i18n.language);
        const { sessionUrl } = response.data;
        setShowSecurityDepositModal(false);
        setPaymentMethod('');
        sessionStorage.setItem('stripeRedirect', 'true');
        if (user) {
          sessionStorage.setItem('stripeUserBackup', JSON.stringify({
            id: user.id, email: user.email, role: user.role, companyId: user.companyId,
          }));
        }
        window.location.href = sessionUrl;
      } else {
        toast.info(t('admin.terminalNotImplemented', 'Terminal payment not yet implemented'));
      }
    } catch (error) {
      toast.error(t('admin.securityDepositError', 'Failed to initiate payment'));
    } finally {
      setPayingSecurityDeposit(false);
    }
  };

  const handleInitiateBookingPayment = async () => {
    if (!selectedBooking || !paymentMethod) {
      toast.error(t('admin.selectPaymentMethod', 'Please select a payment method'));
      return;
    }
    
    setPayingBooking(true);
    
    try {
      if (paymentMethod === 'checkout') {
        const response = await apiService.createCheckoutSession({
          customerId: selectedBooking.customerId,
          companyId: currentCompanyId,
          bookingId: selectedBooking.id,
          bookingNumber: selectedBooking.bookingNumber || '',
          amount: parseFloat(selectedBooking.totalAmount || 0),
          currency: (currencyCode || 'USD').toLowerCase(),
          description: `Booking payment - ${selectedBooking.bookingNumber || ''}`,
          language: i18n.language,
          successUrl: `${window.location.origin}/admin?tab=reservations`,
          cancelUrl: `${window.location.origin}/admin?tab=reservations`
        });
        const { url: sessionUrl } = response.data || response;
        setShowBookingPaymentModal(false);
        setPaymentMethod('');
        if (pendingConfirmedStatus === 'Confirmed') {
          sessionStorage.setItem('pendingBookingStatusUpdate', JSON.stringify({ bookingId: selectedBooking.id, status: 'Confirmed' }));
        }
        sessionStorage.setItem('stripeRedirect', 'true');
        if (user) {
          sessionStorage.setItem('stripeUserBackup', JSON.stringify({
            id: user.id, email: user.email, role: user.role, companyId: user.companyId,
          }));
        }
        window.location.href = sessionUrl;
      } else {
        toast.info(t('admin.terminalNotImplemented', 'Terminal payment not yet implemented'));
      }
    } catch (error) {
      toast.error(t('admin.bookingPaymentError', 'Failed to initiate payment'));
    } finally {
      setPayingBooking(false);
    }
  };

  const handleRefund = () => {
    if (!selectedBooking) return;
    if (window.confirm(t('admin.confirmRefund', 'Are you sure you want to process a refund?'))) {
      refundPaymentMutation.mutate({
        bookingId: selectedBooking.id,
        amount: selectedBooking.totalAmount,
        reason: 'Full refund via booking details'
      });
    }
  };

  const handleConfirmCancelRefund = async () => {
    if (!selectedBooking) return;
    
    const refundAmount = parseFloat(cancelRefundAmount);
    if (isNaN(refundAmount) || refundAmount <= 0 || refundAmount > parseFloat(selectedBooking.totalAmount || 0)) {
      toast.error(t('admin.invalidRefundAmount', 'Invalid refund amount'));
      return;
    }
    
    try {
      await refundPaymentMutation.mutateAsync({
        bookingId: selectedBooking.id,
        amount: refundAmount,
        reason: cancelRefundReason || 'Booking cancellation'
      });
      updateBookingStatusMutation.mutate({ bookingId: selectedBooking.id, status: pendingCancelStatus });
      setShowCancelRefundModal(false);
      setShowBookingDetailsModal(false);
      setCancelRefundAmount('');
      setCancelRefundReason('');
      setPendingCancelStatus('');
    } catch (error) {
      toast.error(t('admin.refundError', 'Failed to process refund'));
    }
  };

  const confirmSyncPayments = async () => {
    setShowSyncConfirmModal(false);
    let successCount = 0, failureCount = 0;
    for (const booking of filteredBookings) {
      try {
        const response = await apiService.syncPaymentFromStripe(booking.id);
        if (response.data.success) successCount++;
        else failureCount++;
      } catch (error) {
        const msg = error.response?.data?.message || '';
        if (!msg.toLowerCase().includes('no stripe payment found')) failureCount++;
      }
    }
    queryClient.invalidateQueries(['companyBookings', currentCompanyId]);
    toast.success(t('admin.syncComplete', `Sync: ${successCount} updated, ${failureCount} failed`));
  };

  // ============== RENDER ==============

  if (isLoadingBookings) {
    return <LoadingSpinner text={t('common.loading')} />;
  }

  return (
    <>
      <Card
        title={t('admin.reservations', 'Reservations')}
        headerAction={
          <button onClick={() => navigate('/admin/reservations/new')} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('admin.newReservation', 'New Reservation')}
          </button>
        }
      >
        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.status', 'Status')}</label>
            <select value={bookingStatusFilter} onChange={(e) => setBookingStatusFilter(e.target.value)} className="input-field w-full">
              <option value="">{t('common.all', 'All')}</option>
              <option value="Pending">{t('booking.statusPending', 'Pending')}</option>
              <option value="Confirmed">{t('booking.statusConfirmed', 'Confirmed')}</option>
              <option value="Active">{t('booking.statusActive', 'Active')}</option>
              <option value="Completed">{t('booking.statusCompleted', 'Completed')}</option>
              <option value="Cancelled">{t('booking.statusCancelled', 'Cancelled')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.customer', 'Customer')}</label>
            <input type="text" value={bookingCustomerFilter} onChange={(e) => setBookingCustomerFilter(e.target.value)} placeholder={t('admin.searchCustomer', 'Search...')} className="input-field w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.dateFrom', 'From')}</label>
            <input type="date" value={bookingDateFrom} onChange={(e) => setBookingDateFrom(e.target.value)} className="input-field w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.dateTo', 'To')}</label>
            <input type="date" value={bookingDateTo} onChange={(e) => setBookingDateTo(e.target.value)} className="input-field w-full" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.bookingNumber', 'Booking #')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.customer', 'Customer')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.vehicle', 'Vehicle')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.dates', 'Dates')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.total', 'Total')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.status', 'Status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t('admin.noBookings', 'No bookings found')}</td></tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{booking.bookingNumber || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{booking.customerName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{booking.vehicleName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(booking.pickupDate)} - {formatDate(booking.returnDate)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatPrice(booking.totalAmount || 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBookingStatusColor(booking.status)}`}>
                        {formatBookingStatus(booking.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenBookingDetails(booking)} className="text-blue-600 hover:text-blue-800" title={t('admin.viewDetails', 'View')}><Eye className="h-4 w-4" /></button>
                        <button onClick={() => handleViewContract(booking)} className="text-green-600 hover:text-green-800" title={t('admin.viewContract', 'Contract')}><FileText className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalBookings > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {t('admin.showingBookings', 'Showing {{from}}-{{to}} of {{total}}', {
                from: (bookingPage - 1) * bookingPageSize + 1,
                to: Math.min(bookingPage * bookingPageSize, totalBookings),
                total: totalBookings,
              })}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setBookingPage(1)} disabled={bookingPage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronsLeft className="h-5 w-5" /></button>
              <button onClick={() => setBookingPage(Math.max(1, bookingPage - 1))} disabled={bookingPage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronLeft className="h-5 w-5" /></button>
              <span className="text-sm">{t('admin.pageOf', 'Page {{page}} of {{total}}', { page: bookingPage, total: totalBookingPages })}</span>
              <button onClick={() => setBookingPage(Math.min(totalBookingPages, bookingPage + 1))} disabled={bookingPage === totalBookingPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronRight className="h-5 w-5" /></button>
              <button onClick={() => setBookingPage(totalBookingPages)} disabled={bookingPage === totalBookingPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronsRight className="h-5 w-5" /></button>
              <select value={bookingPageSize} onChange={(e) => { setBookingPageSize(Number(e.target.value)); setBookingPage(1); }} className="ml-2 input-field">
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* MODALS */}
      {showSyncConfirmModal && <SyncConfirmModal t={t} bookingsCount={filteredBookings.length} onClose={() => setShowSyncConfirmModal(false)} onConfirm={confirmSyncPayments} />}
      
      {showCancelRefundModal && selectedBooking && (
        <CancelRefundModal t={t} booking={selectedBooking} formatPrice={formatPrice} currencySymbol={currencyCode}
          onClose={() => { setShowCancelRefundModal(false); setCancelRefundAmount(''); setCancelRefundReason(''); setPendingCancelStatus(''); }}
          onConfirm={({ refundAmount, refundReason }) => { setCancelRefundAmount(refundAmount.toString()); setCancelRefundReason(refundReason); handleConfirmCancelRefund(); }}
          isProcessing={refundPaymentMutation.isLoading}
        />
      )}
      
      {showSecurityDepositModal && selectedBooking && (
        <SecurityDepositModal t={t} booking={selectedBooking} companySecurityDeposit={parseFloat(actualCompanyData?.securityDeposit || 0)} formatPrice={formatPrice}
          onClose={() => { setShowSecurityDepositModal(false); setPendingActiveStatus(''); setPaymentMethod(''); setPayingSecurityDeposit(false); }}
          onProcessPayment={({ paymentMethod: m }) => { setPaymentMethod(m); handleInitiatePayment(); }}
          isProcessing={payingSecurityDeposit}
        />
      )}
      
      {showBookingPaymentModal && selectedBooking && (
        <BookingPaymentModal t={t} booking={selectedBooking} formatPrice={formatPrice}
          onClose={() => { setShowBookingPaymentModal(false); setPendingConfirmedStatus(''); setPaymentMethod(''); setPayingBooking(false); }}
          onProcessPayment={({ paymentMethod: m }) => { setPaymentMethod(m); handleInitiateBookingPayment(); }}
          isProcessing={payingBooking}
        />
      )}
      
      {showDamageConfirmationModal && selectedBooking && (
        <DamageConfirmationModal t={t} booking={selectedBooking} formatPrice={formatPrice} companySecurityDeposit={parseFloat(actualCompanyData?.securityDeposit || 0)}
          onClose={() => { setShowDamageConfirmationModal(false); setHasDamage(false); setDamageAmount(''); setPendingCompletedStatus(''); }}
          onConfirm={({ hasDamage: d, damageAmount: a }) => { setHasDamage(d); setDamageAmount(a); handleDamageConfirmation(); }}
          isProcessing={payingSecurityDeposit}
        />
      )}

      {/* Booking Details Modal */}
      {showBookingDetailsModal && selectedBooking && (
        <BookingDetailsModal
          t={t}
          booking={selectedBooking}
          formatPrice={formatPrice}
          formatDate={formatDate}
          formatBookingStatus={formatBookingStatus}
          getBookingStatusColor={getBookingStatusColor}
          onClose={() => setShowBookingDetailsModal(false)}
          onRefund={handleRefund}
          onUpdateStatus={handleUpdateBookingStatus}
          isRefunding={refundPaymentMutation.isLoading}
          isUpdating={updateBookingStatusMutation.isLoading}
        />
      )}
    </>
  );
};

export default ReservationsSection;
