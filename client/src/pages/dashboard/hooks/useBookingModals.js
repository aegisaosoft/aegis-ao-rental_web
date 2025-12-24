/*
 * useBookingModals - Hook for managing booking modal state
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import { useState, useCallback } from 'react';

/**
 * Hook for managing all booking-related modal state
 * @returns {Object} Modal state and handlers
 */
const useBookingModals = () => {
  // Selected booking for modals
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  
  // Sync modal
  const [showSyncConfirmModal, setShowSyncConfirmModal] = useState(false);
  
  // Cancel/Refund modal
  const [showCancelRefundModal, setShowCancelRefundModal] = useState(false);
  const [cancelRefundAmount, setCancelRefundAmount] = useState('');
  const [cancelRefundReason, setCancelRefundReason] = useState('');
  const [pendingCancelStatus, setPendingCancelStatus] = useState('');
  
  // Security deposit modal
  const [showSecurityDepositModal, setShowSecurityDepositModal] = useState(false);
  const [pendingActiveStatus, setPendingActiveStatus] = useState('');
  const [payingSecurityDeposit, setPayingSecurityDeposit] = useState(false);
  
  // Booking payment modal
  const [showBookingPaymentModal, setShowBookingPaymentModal] = useState(false);
  const [pendingConfirmedStatus, setPendingConfirmedStatus] = useState('');
  const [payingBooking, setPayingBooking] = useState(false);
  
  // Payment method (shared)
  const [paymentMethod, setPaymentMethod] = useState('');
  
  // Damage confirmation modal
  const [showDamageConfirmationModal, setShowDamageConfirmationModal] = useState(false);
  const [hasDamage, setHasDamage] = useState(false);
  const [damageAmount, setDamageAmount] = useState('');
  const [pendingCompletedStatus, setPendingCompletedStatus] = useState('');

  // Open booking details
  const openBookingDetails = useCallback((booking) => {
    setSelectedBooking(booking);
    setShowBookingDetailsModal(true);
  }, []);

  // Close booking details
  const closeBookingDetails = useCallback(() => {
    setSelectedBooking(null);
    setShowBookingDetailsModal(false);
  }, []);

  // Open cancel/refund modal
  const openCancelRefundModal = useCallback((status = '') => {
    setPendingCancelStatus(status);
    setShowCancelRefundModal(true);
  }, []);

  // Close cancel/refund modal
  const closeCancelRefundModal = useCallback(() => {
    setShowCancelRefundModal(false);
    setCancelRefundAmount('');
    setCancelRefundReason('');
    setPendingCancelStatus('');
  }, []);

  // Open security deposit modal
  const openSecurityDepositModal = useCallback((status = '') => {
    setPendingActiveStatus(status);
    setShowSecurityDepositModal(true);
  }, []);

  // Close security deposit modal
  const closeSecurityDepositModal = useCallback(() => {
    setShowSecurityDepositModal(false);
    setPendingActiveStatus('');
    setPaymentMethod('');
    setPayingSecurityDeposit(false);
  }, []);

  // Open booking payment modal
  const openBookingPaymentModal = useCallback((status = '') => {
    setPendingConfirmedStatus(status);
    setShowBookingPaymentModal(true);
  }, []);

  // Close booking payment modal
  const closeBookingPaymentModal = useCallback(() => {
    setShowBookingPaymentModal(false);
    setPendingConfirmedStatus('');
    setPaymentMethod('');
    setPayingBooking(false);
  }, []);

  // Open damage confirmation modal
  const openDamageConfirmationModal = useCallback((status = '') => {
    setPendingCompletedStatus(status);
    setShowDamageConfirmationModal(true);
  }, []);

  // Close damage confirmation modal
  const closeDamageConfirmationModal = useCallback(() => {
    setShowDamageConfirmationModal(false);
    setHasDamage(false);
    setDamageAmount('');
    setPendingCompletedStatus('');
  }, []);

  // Reset all modals
  const resetAllModals = useCallback(() => {
    setSelectedBooking(null);
    setShowBookingDetailsModal(false);
    setShowSyncConfirmModal(false);
    closeCancelRefundModal();
    closeSecurityDepositModal();
    closeBookingPaymentModal();
    closeDamageConfirmationModal();
  }, [closeCancelRefundModal, closeSecurityDepositModal, closeBookingPaymentModal, closeDamageConfirmationModal]);

  return {
    // Selected booking
    selectedBooking,
    setSelectedBooking,
    
    // Booking details modal
    showBookingDetailsModal,
    setShowBookingDetailsModal,
    openBookingDetails,
    closeBookingDetails,
    
    // Sync modal
    showSyncConfirmModal,
    setShowSyncConfirmModal,
    
    // Cancel/Refund modal
    showCancelRefundModal,
    setShowCancelRefundModal,
    cancelRefundAmount,
    setCancelRefundAmount,
    cancelRefundReason,
    setCancelRefundReason,
    pendingCancelStatus,
    setPendingCancelStatus,
    openCancelRefundModal,
    closeCancelRefundModal,
    
    // Security deposit modal
    showSecurityDepositModal,
    setShowSecurityDepositModal,
    pendingActiveStatus,
    setPendingActiveStatus,
    payingSecurityDeposit,
    setPayingSecurityDeposit,
    openSecurityDepositModal,
    closeSecurityDepositModal,
    
    // Booking payment modal
    showBookingPaymentModal,
    setShowBookingPaymentModal,
    pendingConfirmedStatus,
    setPendingConfirmedStatus,
    payingBooking,
    setPayingBooking,
    openBookingPaymentModal,
    closeBookingPaymentModal,
    
    // Payment method (shared)
    paymentMethod,
    setPaymentMethod,
    
    // Damage confirmation modal
    showDamageConfirmationModal,
    setShowDamageConfirmationModal,
    hasDamage,
    setHasDamage,
    damageAmount,
    setDamageAmount,
    pendingCompletedStatus,
    setPendingCompletedStatus,
    setPendingCompletedStatus,
    openDamageConfirmationModal,
    closeDamageConfirmationModal,
    
    // Reset all
    resetAllModals,
  };
};

export default useBookingModals;
