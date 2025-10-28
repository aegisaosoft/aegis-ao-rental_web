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
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../context/AuthContext';
import { Car, Users, Calendar, DollarSign, TrendingUp, Building2, Save, X } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({});

  // Fetch company data
  const { data: companyData, isLoading: isLoadingCompany } = useQuery(
    ['company', user?.companyId],
    () => apiService.getCompany(user?.companyId),
    {
      enabled: isAuthenticated && isAdmin && !!user?.companyId,
      onSuccess: (data) => {
        setCompanyFormData(data);
      }
    }
  );

  // Update company mutation
  const updateCompanyMutation = useMutation(
    (data) => apiService.updateCompany(user?.companyId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['company', user?.companyId]);
        toast.success(t('admin.companyUpdated'), {
          position: 'top-center',
          autoClose: 3000,
        });
        setIsEditingCompany(false);
      },
      onError: (error) => {
        toast.error(t('admin.companyUpdateFailed'), {
          position: 'top-center',
          autoClose: 3000,
        });
        console.error('Error updating company:', error);
      }
    }
  );

  // const { data: dashboardData, isLoading } = useQuery(
  //   'adminDashboard',
  //   () => apiService.getAdminDashboard(),
  //   {
  //     enabled: isAuthenticated && isAdmin
  //   }
  // );

  // Temporary defaults while API endpoint is not implemented
  const isLoading = false;
  const dashboardData = {
    recentVehicles: [],
    recentReservations: [],
    recentCustomers: []
  };

  const handleCompanyInputChange = (e) => {
    const { name, value } = e.target;
    setCompanyFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    updateCompanyMutation.mutate(companyFormData);
  };

  const handleCancelEdit = () => {
    setCompanyFormData(companyData);
    setIsEditingCompany(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('admin.pleaseLogin')}</h2>
          <p className="text-gray-600">{t('admin.needLogin')}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('admin.accessDenied')}</h2>
          <p className="text-gray-600">{t('admin.noPermission')}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = [
    {
      name: t('admin.stats.totalVehicles'),
      value: dashboardData?.recentVehicles?.length || 0,
      icon: Car,
      color: 'text-blue-600'
    },
    {
      name: t('admin.stats.activeReservations'),
      value: dashboardData?.recentReservations?.length || 0,
      icon: Calendar,
      color: 'text-green-600'
    },
    {
      name: t('admin.stats.totalCustomers'),
      value: dashboardData?.recentCustomers?.length || 0,
      icon: Users,
      color: 'text-purple-600'
    },
    {
      name: t('admin.stats.revenue'),
      value: '$0',
      icon: DollarSign,
      color: 'text-yellow-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.title')}</h1>
          <p className="text-gray-600">{t('admin.welcome')}, {user?.firstName}!</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-full bg-gray-100 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Company Profile Section */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center">
              <Building2 className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">{t('admin.companyProfile')}</h3>
            </div>
            {!isEditingCompany && (
              <button
                onClick={() => setIsEditingCompany(true)}
                className="btn-primary text-sm"
              >
                {t('common.edit')}
              </button>
            )}
          </div>
          
          <div className="p-6">
            {isLoadingCompany ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : isEditingCompany ? (
              <form onSubmit={handleSaveCompany} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.companyName')}
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={companyFormData.companyName || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.email')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={companyFormData.email || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.phone')}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={companyFormData.phone || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.website')}
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={companyFormData.website || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="https://example.com"
                    />
                  </div>

                  {/* Address Information */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.address')}
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={companyFormData.address || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.city')}
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={companyFormData.city || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.state')}
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={companyFormData.state || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.country')}
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={companyFormData.country || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.postalCode')}
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={companyFormData.postalCode || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                    />
                  </div>

                  {/* Media Links */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-800 mb-4 mt-4">
                      {t('admin.mediaLinks')}
                    </h4>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.logoLink')}
                    </label>
                    <input
                      type="url"
                      name="logoLink"
                      value={companyFormData.logoLink || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.bannerLink')}
                    </label>
                    <input
                      type="url"
                      name="bannerLink"
                      value={companyFormData.bannerLink || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="https://example.com/banner.jpg"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.videoLink')}
                    </label>
                    <input
                      type="url"
                      name="videoLink"
                      value={companyFormData.videoLink || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>

                  {/* Marketing Content */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-800 mb-4 mt-4">
                      {t('admin.marketingContent')}
                    </h4>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.invitation')}
                    </label>
                    <input
                      type="text"
                      name="invitation"
                      value={companyFormData.invitation || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="Find & Book a Great Deal Today"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.motto')}
                    </label>
                    <input
                      type="text"
                      name="motto"
                      value={companyFormData.motto || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="Meet our newest fleet yet"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.mottoDescription')}
                    </label>
                    <input
                      type="text"
                      name="mottoDescription"
                      value={companyFormData.mottoDescription || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="New rental cars. No lines. Let's go!"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="btn-outline flex items-center"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={updateCompanyMutation.isLoading}
                    className="btn-primary flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateCompanyMutation.isLoading ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Display Mode */}
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.companyName')}</p>
                  <p className="text-base text-gray-900">{companyData?.companyName || '-'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.email')}</p>
                  <p className="text-base text-gray-900">{companyData?.email || '-'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.phone')}</p>
                  <p className="text-base text-gray-900">{companyData?.phone || '-'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.website')}</p>
                  <p className="text-base text-gray-900">
                    {companyData?.website ? (
                      <a href={companyData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {companyData.website}
                      </a>
                    ) : '-'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-600">{t('admin.address')}</p>
                  <p className="text-base text-gray-900">
                    {[companyData?.address, companyData?.city, companyData?.state, companyData?.postalCode, companyData?.country]
                      .filter(Boolean)
                      .join(', ') || '-'}
                  </p>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">{t('admin.marketingContent')}</p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-600">{t('admin.invitation')}</p>
                  <p className="text-base text-gray-900">{companyData?.invitation || '-'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.motto')}</p>
                  <p className="text-base text-gray-900">{companyData?.motto || '-'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.mottoDescription')}</p>
                  <p className="text-base text-gray-900">{companyData?.mottoDescription || '-'}</p>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">{t('admin.mediaLinks')}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.logoLink')}</p>
                  <p className="text-base text-gray-900">
                    {companyData?.logoLink ? (
                      <a href={companyData.logoLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {t('admin.viewLogo')}
                      </a>
                    ) : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.bannerLink')}</p>
                  <p className="text-base text-gray-900">
                    {companyData?.bannerLink ? (
                      <a href={companyData.bannerLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {t('admin.viewBanner')}
                      </a>
                    ) : '-'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-600">{t('admin.videoLink')}</p>
                  <p className="text-base text-gray-900">
                    {companyData?.videoLink ? (
                      <a href={companyData.videoLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {t('admin.viewVideo')}
                      </a>
                    ) : '-'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Vehicles */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('vehicles.title')}</h3>
            </div>
            <div className="p-6">
              {dashboardData?.recentVehicles?.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recentVehicles.slice(0, 5).map((vehicle) => (
                    <div key={vehicle.vehicle_id} className="flex items-center space-x-4">
                      <img
                        src={vehicle.image_url || '/economy.jpg'}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="w-15 h-11 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h4>
                        <p className="text-sm text-gray-600">${vehicle.daily_rate}/{t('vehicles.day')}</p>
                      </div>
                      <span className={`px-2 py-1 py-1 rounded-full text-xs font-medium ${
                        vehicle.status === 'available' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {vehicle.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">{t('vehicles.noVehicles')}</p>
              )}
            </div>
          </div>

          {/* Recent Reservations */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('admin.recentActivity')}</h3>
            </div>
            <div className="p-6">
              {dashboardData?.recentReservations?.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recentReservations.slice(0, 5).map((reservation) => (
                    <div key={reservation.reservation_id} className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          #{reservation.reservation_number}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {reservation.customer_name} - {reservation.vehicle_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(reservation.pickup_date).toLocaleDateString()} - {new Date(reservation.return_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">${reservation.total_amount}</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          reservation.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : reservation.status === 'active'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {reservation.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">{t('myBookings.noBookings')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.quickActions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="btn-primary flex items-center justify-center">
              <Car className="h-4 w-4 mr-2" />
              {t('admin.addVehicle')}
            </button>
            <button className="btn-outline flex items-center justify-center">
              <Users className="h-4 w-4 mr-2" />
              {t('admin.manageUsers')}
            </button>
            <button className="btn-secondary flex items-center justify-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              {t('admin.viewReports')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
