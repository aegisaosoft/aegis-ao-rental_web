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
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { toast } from 'react-toastify';
import { User, Mail } from 'lucide-react';
import { apiService } from '../services/api';
import { useTranslation } from 'react-i18next';

const Booking = () => {
  const { t } = useTranslation();
  const { vehicleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { companyConfig, formatPrice } = useCompany();
  const companyId = companyConfig?.id || null;
  
  // Set default dates (today and tomorrow)
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    pickupDate: searchParams.get('pickup') || todayStr,
    returnDate: searchParams.get('return') || tomorrowStr,
    pickupLocation: '',
    returnLocation: '',
    additionalNotes: ''
  });

  const { data: vehicle, isLoading } = useQuery(
    ['vehicle', vehicleId],
    () => apiService.getVehicle(vehicleId),
    {
      enabled: !!vehicleId
    }
  );

  const handleChange = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    
    // If pickup date is changing, check if return date needs adjustment
    if (name === 'pickupDate' && value) {
      const newPickupDate = new Date(value);
      const currentReturnDate = formData.returnDate ? new Date(formData.returnDate) : null;
      
      // If return date exists and is less than or equal to new pickup date, set it to next day after pickup
      if (currentReturnDate && currentReturnDate <= newPickupDate) {
        const nextDay = new Date(newPickupDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        
        setFormData({
          ...formData,
          pickupDate: value,
          returnDate: nextDayStr
        });
        return;
      }
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const calculateTotal = () => {
    if (!formData.pickupDate || !formData.returnDate || !vehicle) return 0;
    
    const pickup = new Date(formData.pickupDate);
    const returnDate = new Date(formData.returnDate);
    const days = Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24));
    
    return days * vehicle.daily_rate;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error(t('booking.pleaseLoginToBook'));
      navigate('/login');
      return;
    }

    if (!formData.pickupDate || !formData.returnDate) {
      toast.error(t('booking.selectPickupAndReturn'));
      return;
    }

    // Prohibit booking if no company
    if (!companyId) {
      toast.error('Booking is not available. Please access via a company subdomain.');
      navigate('/');
      return;
    }

    try {
      const bookingData = {
        vehicleId,
        companyId,
        pickupDate: formData.pickupDate,
        returnDate: formData.returnDate,
        pickupLocation: formData.pickupLocation,
        returnLocation: formData.returnLocation,
        additionalNotes: formData.additionalNotes,
        securityDeposit: companyConfig?.securityDeposit ?? 1000
      };

    await apiService.createBooking(bookingData);
      toast.success(t('booking.success'));
      navigate('/my-bookings');
    } catch (error) {
      toast.error(error.response?.data?.message || t('booking.error'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('vehicleDetail.vehicleNotFound')}</h2>
          <p className="text-gray-600">{t('vehicleDetail.vehicleNotFoundDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('booking.title')}</h1>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Vehicle Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('booking.vehicleDetails')}</h3>
                  <div className="flex items-center space-x-4">
                    <img
                      src={`/models/${(vehicle.make || '').toUpperCase()}_${(vehicle.model || '').toUpperCase().replace(/\s+/g, '_')}.png`}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="w-20 h-15 object-cover rounded"
                      onError={(e) => {
                        // Fallback to vehicle image_url or economy.jpg
                        const fallback = vehicle.image_url || '/economy.jpg';
                        if (!e.target.src.includes(fallback.replace('/', ''))) {
                          e.target.src = fallback;
                        }
                      }}
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h4>
                      <p className="text-gray-600">{formatPrice(vehicle.daily_rate)} {t('vehicles.perDay')}</p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">{t('booking.pickupDate')}</label>
                    <input
                      type="date"
                      name="pickupDate"
                      value={formData.pickupDate}
                      onChange={handleChange}
                      className="form-input"
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">{t('booking.returnDate')}</label>
                    <input
                      type="date"
                      name="returnDate"
                      value={formData.returnDate}
                      onChange={handleChange}
                      className="form-input"
                      min={formData.pickupDate || new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                </div>

                {/* Locations */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">{t('booking.pickupLocation')}</label>
                    <input
                      type="text"
                      name="pickupLocation"
                      value={formData.pickupLocation}
                      onChange={handleChange}
                      className="form-input"
                      placeholder={t('booking.enterPickupLocation')}
                    />
                  </div>
                  <div>
                    <label className="form-label">{t('booking.returnLocation')}</label>
                    <input
                      type="text"
                      name="returnLocation"
                      value={formData.returnLocation}
                      onChange={handleChange}
                      className="form-input"
                      placeholder={t('booking.enterReturnLocation')}
                    />
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="form-label">{t('bookPage.additionalNotes')}</label>
                  <textarea
                    name="additionalNotes"
                    value={formData.additionalNotes}
                    onChange={handleChange}
                    rows={3}
                    className="form-input"
                    placeholder={t('bookPage.specialRequests')}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full btn-primary"
                >
                  {t('booking.confirmBooking')}
                </button>
              </form>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('booking.summary')}</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('booking.vehicle')}</span>
                  <span className="font-medium">{vehicle.make} {vehicle.model}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('booking.dailyRate')}</span>
                  <span className="font-medium">{formatPrice(vehicle.daily_rate)}</span>
                </div>
                
                {formData.pickupDate && formData.returnDate && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('booking.duration')}</span>
                      <span className="font-medium">
                        {Math.ceil((new Date(formData.returnDate) - new Date(formData.pickupDate)) / (1000 * 60 * 60 * 24))} {t('booking.days')}
                      </span>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>{t('booking.total')}</span>
                        <span className="text-blue-600">{formatPrice(calculateTotal())}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User Info */}
              {user && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold text-gray-900 mb-2">{t('booking.bookingFor')}</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      <span>{user.firstName} {user.lastName}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      <span>{user.email}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
