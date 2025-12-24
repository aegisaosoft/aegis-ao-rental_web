/*
 *
 * Copyright (c) 2025 Alexander Orlov.
 * 34 Middletown Ave Atlantic Highlands NJ 07716
 *
 * THIS SOFTWARE IS THE CONFIDENTIAL AND PROPRIETARY INFORMATION OF
 * Alexander Orlov. ("CONFIDENTIAL INFORMATION").
 *
 * Author: Alexander Orlov Aegis AO Soft
 *
 */

import React from 'react';
import { ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Card } from '../../components/common';

const ReservationsSection = ({
  t,
  // Data
  filteredBookings,
  totalBookings,
  isLoadingBookings,
  bookingsError,
  // Filters
  bookingDateFrom,
  setBookingDateFrom,
  bookingDateTo,
  setBookingDateTo,
  bookingStatusFilter,
  setBookingStatusFilter,
  bookingCustomerFilter,
  setBookingCustomerFilter,
  // Pagination
  bookingPage,
  setBookingPage,
  bookingPageSize,
  setBookingPageSize,
  totalBookingPages,
  // Wizard handlers
  setShowReservationWizard,
  setWizardStep,
  setWizardCustomerEmail,
  setWizardCustomer,
  setWizardSelectedCategory,
  setWizardSelectedMake,
  setWizardSelectedModel,
  setWizardPickupDate,
  setWizardReturnDate,
  // Booking handlers
  handleOpenBookingDetails,
  handleViewContract,
  // Formatters
  formatDate,
  formatPrice,
  getBookingStatusColor,
  formatBookingStatus,
}) => {
  return (
    <Card title={t('admin.bookings', 'Bookings')}>
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="date"
              className="input-field border border-gray-300"
              value={bookingDateFrom}
              onChange={(e) => setBookingDateFrom(e.target.value)}
            />
            <input
              type="date"
              className="input-field border border-gray-300"
              value={bookingDateTo}
              onChange={(e) => setBookingDateTo(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <select
              value={bookingStatusFilter}
              onChange={(e) => setBookingStatusFilter(e.target.value)}
              className="input-field border border-gray-300"
            >
              <option value="">{t('admin.allStatuses', 'All statuses')}</option>
              <option value="Pending">{t('booking.statusPending', 'Pending')}</option>
              <option value="Confirmed">{t('booking.statusConfirmed', 'Confirmed')}</option>
              <option value="Active">{t('booking.statusActive', 'Active')}</option>
              <option value="Completed">{t('booking.statusCompleted', 'Completed')}</option>
              <option value="Cancelled">{t('booking.statusCancelled', 'Cancelled')}</option>
            </select>
            <input
              type="text"
              className="input-field border border-gray-300"
              placeholder={t('admin.employeeSearch', 'Employee name or email')}
              value={bookingCustomerFilter}
              onChange={(e) => setBookingCustomerFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-gray-600">
            {t('admin.bookingCount', { count: totalBookings })}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setBookingStatusFilter('');
                setBookingCustomerFilter('');
                const today = new Date();
                setBookingDateFrom(today.toISOString().split('T')[0]);
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setBookingDateTo(tomorrow.toISOString().split('T')[0]);
              }}
            >
              {t('admin.resetFilters', 'Reset Filters')}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setShowReservationWizard(true);
                setWizardStep(1);
                setWizardCustomerEmail('');
                setWizardCustomer(null);
                setWizardSelectedCategory(null);
                setWizardSelectedMake(null);
                setWizardSelectedModel(null);
                setWizardPickupDate(() => {
                  const today = new Date();
                  return today.toISOString().split('T')[0];
                });
                setWizardReturnDate(() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  return tomorrow.toISOString().split('T')[0];
                });
              }}
            >
              {t('admin.createReservation', 'Create Reservation')}
            </button>
          </div>
        </div>
      </div>

      {isLoadingBookings ? (
        <div className="py-8 text-center text-gray-500">
          {t('common.loading')}
        </div>
      ) : bookingsError ? (
        <div className="py-8 text-center text-red-500">
          {t('admin.bookingsLoadError', 'Unable to load bookings.')}
        </div>
      ) : !filteredBookings.length ? (
        <div className="py-8 text-center text-gray-500">
          {t('admin.noBookingsFound', 'No bookings found for the selected filters.')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.bookingNumber', 'Booking #')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.customer', 'Customer')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.vehicle', 'Vehicle')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.pickupDate', 'Pickup Date')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.returnDate', 'Return Date')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.totalAmount', 'Total')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.securityDeposit', 'Security Deposit')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.contract', 'Contract')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.status', 'Status')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleOpenBookingDetails(booking)}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      {booking.bookingNumber}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {booking.customerName}
                    <div className="text-xs text-gray-500">{booking.customerEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{booking.vehicleName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatDate(booking.pickupDate)}
                    <div className="text-xs text-gray-500">{booking.pickupLocation}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatDate(booking.returnDate)}
                    <div className="text-xs text-gray-500">{booking.returnLocation}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatPrice(booking.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatPrice(booking.securityDeposit)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleViewContract(booking)}
                      className="btn-outline text-xs"
                      title={t('admin.viewContract', 'View Contract')}
                    >
                      {t('admin.view', 'View')}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBookingStatusColor(
                        booking.status || ''
                      )}`}
                    >
                      {formatBookingStatus(booking.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
            <div className="text-sm text-gray-600">
              {totalBookings > 0
                ? `Showing ${(bookingPage - 1) * bookingPageSize + 1}-${Math.min(bookingPage * bookingPageSize, totalBookings)} of ${totalBookings}`
                : t('admin.showingRangeEmpty', 'No bookings to display.')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t('admin.pageSize', 'Page Size')}</span>
              <select
                value={bookingPageSize}
                onChange={(e) => {
                  setBookingPageSize(Number(e.target.value) || 10);
                  setBookingPage(1);
                }}
                className="input-field w-24"
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBookingPage(1)}
                disabled={bookingPage <= 1}
                className="btn-outline px-2 py-1 disabled:opacity-50"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setBookingPage((prev) => Math.max(prev - 1, 1))}
                disabled={bookingPage <= 1}
                className="btn-outline px-2 py-1 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600">
                {bookingPage} / {totalBookingPages}
              </span>
              <button
                type="button"
                onClick={() => setBookingPage((prev) => Math.min(prev + 1, totalBookingPages))}
                disabled={bookingPage >= totalBookingPages}
                className="btn-outline px-2 py-1 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setBookingPage(totalBookingPages)}
                disabled={bookingPage >= totalBookingPages}
                className="btn-outline px-2 py-1 disabled:opacity-50"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ReservationsSection;
