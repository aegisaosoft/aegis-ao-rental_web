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
 * Author: Alexander Orlov Aegis AO Soft
 *
 */

import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { Car, Calendar, MapPin, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';
import { PageContainer, PageHeader, Card, EmptyState, LoadingSpinner } from '../components/common';
import RentalAgreementModal from '../components/RentalAgreementModal';
import { toast } from 'react-toastify';

const MyBookings = () => {
  const { t } = useTranslation();
  const { isAuthenticated, restoreUser } = useAuth();
  const { companyConfig, formatPrice } = useCompany();
  const companyId = companyConfig?.id || null;
  const [viewAgreementBookingId, setViewAgreementBookingId] = useState(null);
  const [agreementData, setAgreementData] = useState(null);

  const searchParams = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const bookingParam = React.useMemo(() => searchParams.get('booking'), [searchParams]);

  // Handle Stripe Checkout return - restore session if lost
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isStripeReturn = urlParams.get('session_id') !== null || // Stripe Checkout returns session_id
                          urlParams.get('booking') !== null; // Our success URL includes booking param
    const stripeSuccess = urlParams.get('stripe_success') === 'true';
    const bookingIdFromUrl = urlParams.get('booking');
    
    // Also check if we have the stripeRedirect flag
    const wasStripeRedirect = sessionStorage.getItem('stripeRedirect') === 'true';
    
    if (isStripeReturn || wasStripeRedirect) {
      // Clear the flag
      sessionStorage.removeItem('stripeRedirect');
      sessionStorage.removeItem('stripeRedirectTime');
      
      // If stripe_success=true, update booking status
      if (stripeSuccess && bookingIdFromUrl) {
        apiService.updateBooking(bookingIdFromUrl, { 
          status: 'Confirmed', 
          paymentStatus: 'Paid' 
        }).then(() => {
          // Removed: success message - silent confirmation
          // Clean URL
          const newUrl = new URL(window.location);
          newUrl.searchParams.delete('stripe_success');
          window.history.replaceState({}, '', newUrl.toString());
        }).catch(err => {
          // Removed: success message - silent payment confirmation
        });
      }
      
      // Always restore user data (including role) after Stripe redirect
      const restoreSession = async () => {
        try {
          // Always get profile to restore user data (including role) in AuthContext
          const profileResponse = await apiService.getProfile();
          const userData = profileResponse.data;
          
          // Restore user data in AuthContext - this ensures role and all user info is current
          if (userData) {
            restoreUser(userData);
          }
        } catch (error) {
          if (error.response?.status === 401) {
            
            // Try to restore from sessionStorage backup
            const storedUserData = sessionStorage.getItem('stripeUserBackup');
            if (storedUserData) {
              try {
                const userData = JSON.parse(storedUserData);
                // User data will be restored when they log in again
              } catch (parseError) {
              }
            }
            
            toast.error(t('bookPage.sessionExpired', 'Your session expired. Please sign in again.'));
            // Redirect to login page
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          }
        }
      };
      
      restoreSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bookingQuery = useQuery(
    ['bookingDetail', bookingParam, companyId],
    () => (bookingParam ? apiService.getBooking(bookingParam, { companyId }) : null),
    {
      enabled: isAuthenticated && !!companyId && !!bookingParam,
      retry: 1,
    }
  );

  const listQuery = useQuery(
    ['myBookings', companyId],
    () => apiService.getBookings({ companyId }),
    {
      enabled: isAuthenticated && !!companyId && !bookingParam,
    }
  );

  const isLoading = listQuery.isLoading || bookingQuery.isLoading;
  const error = listQuery.error || bookingQuery.error;
  const bookings = bookingParam ? bookingQuery.data : listQuery.data;

  const bookingList = React.useMemo(() => {
    if (bookingParam) {
      const detail = bookingQuery.data?.data || bookingQuery.data;
      if (!detail) return [];
      return [detail];
    }

    let list = [];
    if (Array.isArray(bookings?.Bookings)) list = bookings.Bookings;
    else if (Array.isArray(bookings?.bookings)) list = bookings.bookings;
    else if (Array.isArray(bookings?.data)) list = bookings.data;
    else if (Array.isArray(bookings?.items)) list = bookings.items;
    else if (Array.isArray(bookings?.result)) list = bookings.result;
    else if (Array.isArray(bookings)) list = bookings;

    return list;
  }, [bookings, bookingParam, bookingQuery.data]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-100';
      case 'active':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-gray-600 bg-gray-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <EmptyState
          icon={<Car className="h-16 w-16" />}
          title={t('myBookings.pleaseLogin')}
          message={t('myBookings.needLogin')}
        />
      </PageContainer>
    );
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen text={t('common.loading')} />;
  }

  if (error) {
    return (
      <PageContainer>
        <EmptyState
          title={t('myBookings.errorLoading')}
          message={t('myBookings.tryAgainLater')}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={bookingParam ? t('myBookings.bookingDetails', 'Booking Details') : t('myBookings.title')}
        subtitle={bookingParam ? t('myBookings.bookingDetailsSubtitle', 'View your booking information') : t('myBookings.subtitle')}
        icon={<Calendar className="h-8 w-8" />}
      />

      {bookingParam && (
        <div className="mb-6">
          <button
            className="btn-outline text-sm flex items-center gap-2"
            onClick={() => {
              window.location.href = '/my-bookings';
            }}
          >
            ← {t('myBookings.backToList', 'Back to Bookings')}
          </button>
        </div>
      )}

      {!bookingList.length ? (
        <Card>
          <EmptyState
            icon={<Car className="h-16 w-16" />}
            title={t('myBookings.noBookings')}
            message={t('myBookings.noBookingsDesc')}
            actionText={t('myBookings.browseVehicles')}
            actionLink="/"
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {bookingList.map((booking) => (
            <Card key={booking.id || booking.bookingId || booking.booking_id}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <img
                        src={booking.vehicle?.make && booking.vehicle?.model 
                              ? `https://aegisaorentalstorage.blob.core.windows.net/models/${(booking.vehicle.make || '').toUpperCase()}_${(booking.vehicle.model || '').toUpperCase().replace(/\s+/g, '_')}.png`
                          : booking.vehicle?.imageUrl || booking.vehicle?.image_url || '/economy.jpg'}
                        alt={booking.vehicle?.make}
                        className="w-20 h-15 object-cover rounded"
                        onError={(e) => {
                          // Fallback to vehicle image_url or economy.jpg
                          const fallback = booking.vehicle?.imageUrl || booking.vehicle?.image_url || '/economy.jpg';
                          if (!e.target.src.includes(fallback.replace('/', ''))) {
                            e.target.src = fallback;
                          }
                        }}
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}
                        </h3>
                        <p className="text-gray-600">
                          {t('myBookings.reservationNumber', { number: booking.bookingNumber || booking.reservation_number })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <div>
                          <p className="text-sm">
                            {t('myBookings.pickupDate')}: {new Date(booking.pickupDate || booking.pickup_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm">
                            {t('myBookings.returnDate')}: {new Date(booking.returnDate || booking.return_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        <div>
                          <p className="text-sm">{t('booking.pickupLocation')}: {booking.pickupLocation || booking.pickup_location}</p>
                          <p className="text-sm">{t('booking.returnLocation')}: {booking.returnLocation || booking.return_location}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="text-lg font-semibold text-blue-600">
                        {t('myBookings.totalCost')}: {formatPrice(booking.totalAmount ?? booking.total_amount)}
                      </div>
                      {booking.securityDeposit ?? booking.security_deposit ? (
                        <div className="text-sm text-gray-700">
                          {t('myBookings.securityDeposit')}: {formatPrice(booking.securityDeposit ?? booking.security_deposit)}
                        </div>
                      ) : null}
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-1 capitalize">{booking.status}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col space-y-2">
                    <button
                      className="btn-outline text-sm"
                      onClick={() => {
                        const bookingId = booking.id || booking.bookingId || booking.booking_id;
                        const newUrl = `/my-bookings?booking=${encodeURIComponent(bookingId)}`;
                        window.location.href = newUrl;
                      }}
                    >
                      {t('myBookings.viewDetails', 'View Details')}
                    </button>
                    <button 
                      className="btn-outline text-sm flex items-center justify-center gap-2"
                      onClick={async () => {
                        try {
                          const response = await apiService.getRentalAgreement(booking.id || booking.bookingId || booking.booking_id);
                          const agreement = response.data;
                          
                          // If PDF URL exists, open it directly
                          if (agreement.pdfUrl) {
                            window.open(agreement.pdfUrl, '_blank');
                          } else {
                            // Fallback to modal if no PDF
                            setAgreementData(agreement);
                            setViewAgreementBookingId(booking.id || booking.bookingId || booking.booking_id);
                          }
                        } catch (error) {
                          alert(t('myBookings.agreementNotFound', 'Rental agreement not found for this booking'));
                        }
                      }}
                    >
                      <FileText className="h-4 w-4" />
                      {t('myBookings.viewAgreement', 'View Agreement')}
                    </button>
                    {booking.status === 'confirmed' && (
                      <button
                        className="btn-secondary text-sm"
                        onClick={async () => {
                          const confirmed = window.confirm(
                            t('myBookings.cancelConfirmation', 'Are you sure you want to cancel this booking? This action cannot be undone.')
                          );

                          if (confirmed) {
                            try {
                              const bookingId = booking.id || booking.bookingId || booking.booking_id;
                              await apiService.cancelBooking(bookingId);
                              // Removed: success message - silent cancellation

                              // Refetch the bookings to update the list
                              if (bookingParam) {
                                bookingQuery.refetch();
                              } else {
                                listQuery.refetch();
                              }
                            } catch (error) {
                              toast.error(t('myBookings.cancellationFailed', 'Failed to cancel booking. Please try again.'));
                            }
                          }
                        }}
                      >
                        {t('myBookings.cancelBooking')}
                      </button>
                    )}
                  </div>
                </div>
            </Card>
          ))}
        </div>
      )}

      {/* Rental Agreement View Modal */}
      {viewAgreementBookingId && (
        <RentalAgreementModal
          isOpen={!!viewAgreementBookingId}
          onClose={() => {
            setViewAgreementBookingId(null);
            setAgreementData(null);
          }}
          viewMode={true}
          bookingId={viewAgreementBookingId}
          language={agreementData?.language || 'en'}
          formatPrice={formatPrice}
          t={t}
        />
      )}
    </PageContainer>
  );
};

export default MyBookings;
