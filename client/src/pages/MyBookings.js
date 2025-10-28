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

import React from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../context/AuthContext';
import { Car, Calendar, MapPin, Clock, CheckCircle, XCircle } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';
import { PageContainer, PageHeader, Card, EmptyState, LoadingSpinner } from '../components/common';

const MyBookings = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const { data: bookings, isLoading, error } = useQuery(
    'myBookings',
    () => apiService.getReservations(),
    {
      enabled: isAuthenticated
    }
  );

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
        title={t('myBookings.title')}
        subtitle={t('myBookings.subtitle')}
        icon={<Calendar className="h-8 w-8" />}
      />

      {!bookings || bookings.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Car className="h-16 w-16" />}
            title={t('myBookings.noBookings')}
            message={t('myBookings.noBookingsDesc')}
            actionText={t('myBookings.browseVehicles')}
            actionLink="/vehicles"
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => (
            <Card key={booking.reservation_id}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <img
                        src={booking.vehicle?.image_url || '/economy.jpg'}
                        alt={booking.vehicle?.make}
                        className="w-20 h-15 object-cover rounded"
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}
                        </h3>
                        <p className="text-gray-600">Reservation #{booking.reservation_number}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <div>
                          <p className="text-sm">{t('myBookings.pickupDate')}: {new Date(booking.pickup_date).toLocaleDateString()}</p>
                          <p className="text-sm">{t('myBookings.returnDate')}: {new Date(booking.return_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        <div>
                          <p className="text-sm">{t('booking.pickupLocation')}: {booking.pickup_location}</p>
                          <p className="text-sm">{t('booking.returnLocation')}: {booking.return_location}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold text-blue-600">
                        {t('myBookings.totalCost')}: ${booking.total_amount}
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-1 capitalize">{booking.status}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col space-y-2">
                    <button className="btn-outline text-sm">
                      {t('vehicleDetail.viewDetails')}
                    </button>
                    {booking.status === 'confirmed' && (
                      <button className="btn-secondary text-sm">
                        {t('myBookings.cancelBooking', 'Cancel Booking')}
                      </button>
                    )}
                  </div>
                </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
};

export default MyBookings;
