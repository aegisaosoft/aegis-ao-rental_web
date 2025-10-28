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

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../context/AuthContext';
import { Car, Users, Calendar, DollarSign, TrendingUp, Building2, Save, X, LayoutDashboard } from 'lucide-react';
import { translatedApiService as apiService } from '../services/translatedApi';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { PageContainer, PageHeader, Card, EmptyState, LoadingSpinner } from '../components/common';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({});
  const [currentCompanyId, setCurrentCompanyId] = useState(null);
  const [activeTab, setActiveTab] = useState('info'); // 'info' or 'design'
  const [uploadProgress, setUploadProgress] = useState({
    video: 0,
    banner: 0,
    logo: 0
  });
  const [isUploading, setIsUploading] = useState({
    video: false,
    banner: false,
    logo: false
  });

  // Get company ID from user or localStorage
  const getCompanyId = useCallback(() => {
    // First try user's companyId
    if (user?.companyId) {
      return user.companyId;
    }
    // Fallback to selected company from localStorage
    const selectedCompanyId = localStorage.getItem('selectedCompanyId');
    return selectedCompanyId || null;
  }, [user]);

  // Initialize and watch for company changes
  useEffect(() => {
    const companyId = getCompanyId();
    setCurrentCompanyId(companyId);

    // Listen for storage changes (when company is changed in navbar)
    const handleStorageChange = (e) => {
      if (e.key === 'selectedCompanyId' || e.key === null) {
        const newCompanyId = getCompanyId();
        console.log('Company changed in storage:', newCompanyId);
        setCurrentCompanyId(newCompanyId);
        // Invalidate and refetch company data
        queryClient.invalidateQueries(['company']);
      }
    };

    // Listen for custom event (more reliable for same-tab changes)
    const handleCompanyChange = (e) => {
      const newCompanyId = getCompanyId();
      console.log('Company changed via event:', newCompanyId);
      setCurrentCompanyId(newCompanyId);
      // Invalidate and refetch company data
      queryClient.invalidateQueries(['company']);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('companyChanged', handleCompanyChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('companyChanged', handleCompanyChange);
    };
  }, [user, queryClient, getCompanyId]);

  // Fetch current user's company data
  const { data: companyData, isLoading: isLoadingCompany, error: companyError } = useQuery(
    ['company', currentCompanyId],
    () => apiService.getCompany(currentCompanyId),
    {
      enabled: isAuthenticated && isAdmin && !!currentCompanyId,
      onSuccess: (data) => {
        console.log('Company data loaded:', data);
        console.log('Company data type:', typeof data);
        console.log('Company data keys:', data ? Object.keys(data) : 'no data');
        
        // Handle both axios response format and direct data
        const companyInfo = data?.data || data;
        console.log('Processed company info:', companyInfo);
        
        setCompanyFormData(companyInfo);
      },
      onError: (error) => {
        console.error('Error loading company:', error);
        toast.error(t('admin.companyLoadFailed'), {
          position: 'top-center',
          autoClose: 3000,
        });
      }
    }
  );

  // Check if currently editing - this will disable other actions
  const isEditing = isEditingCompany;

  // Update company mutation
  const updateCompanyMutation = useMutation(
    (data) => apiService.updateCompany(currentCompanyId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['company', currentCompanyId]);
        toast.success(t('admin.companyUpdated'), {
          position: 'top-center',
          autoClose: 3000,
        });
        setIsEditingCompany(false);
      },
      onError: (error) => {
        console.error('Error updating company:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        console.error('Error message:', error.message);
        
        const errorMessage = error.response?.data?.message 
          || error.response?.data 
          || t('admin.companyUpdateFailed');
          
        toast.error(typeof errorMessage === 'string' ? errorMessage : t('admin.companyUpdateFailed'), {
          position: 'top-center',
          autoClose: 5000,
        });
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
    
    // Only send fields that the API expects (exclude read-only and navigation properties)
    const updateData = {
      companyName: companyFormData.companyName,
      email: companyFormData.email || null,
      phone: companyFormData.phone || null,
      website: companyFormData.website || null,
      address: companyFormData.address || null,
      city: companyFormData.city || null,
      state: companyFormData.state || null,
      country: companyFormData.country || null,
      postalCode: companyFormData.postalCode || null,
      logoLink: companyFormData.logoLink || null,
      bannerLink: companyFormData.bannerLink || null,
      videoLink: companyFormData.videoLink || null,
      invitation: companyFormData.invitation || null,
      motto: companyFormData.motto || null,
      mottoDescription: companyFormData.mottoDescription || null,
      tests: companyFormData.tests || null
    };
    
    // Auto-add https:// to URLs if missing
    if (updateData.website && !updateData.website.match(/^https?:\/\//i)) {
      updateData.website = 'https://' + updateData.website;
    }
    
    if (updateData.logoLink && !updateData.logoLink.match(/^https?:\/\//i)) {
      updateData.logoLink = 'https://' + updateData.logoLink;
    }
    
    if (updateData.bannerLink && !updateData.bannerLink.match(/^https?:\/\//i)) {
      updateData.bannerLink = 'https://' + updateData.bannerLink;
    }
    
    if (updateData.videoLink && !updateData.videoLink.match(/^https?:\/\//i)) {
      updateData.videoLink = 'https://' + updateData.videoLink;
    }
    
    console.log('Sending update data:', updateData);
    console.log('Update data stringified:', JSON.stringify(updateData, null, 2));
    console.log('Current company ID:', currentCompanyId);
    updateCompanyMutation.mutate(updateData);
  };

  const handleCancelEdit = () => {
    // Handle both axios response format and direct data
    const companyInfo = companyData?.data || companyData;
    setCompanyFormData(companyInfo);
    setIsEditingCompany(false);
  };

  // Video upload handler
  const handleVideoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm', 'video/mkv'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a video file (MP4, AVI, MOV, WMV, WebM, MKV)');
      return;
    }

    // Validate file size (500 MB)
    if (file.size > 524_288_000) {
      toast.error('File size exceeds 500 MB limit');
      return;
    }

    setIsUploading(prev => ({ ...prev, video: true }));
    setUploadProgress(prev => ({ ...prev, video: 0 }));

    try {
      const response = await apiService.uploadCompanyVideo(
        currentCompanyId,
        file,
        (progress) => setUploadProgress(prev => ({ ...prev, video: progress }))
      );

      // Update company data with new video link
      setCompanyFormData(prev => ({
        ...prev,
        videoLink: response.data.videoUrl
      }));

      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success('Video uploaded successfully!');
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error(error.response?.data?.message || 'Failed to upload video');
    } finally {
      setIsUploading(prev => ({ ...prev, video: false }));
      setUploadProgress(prev => ({ ...prev, video: 0 }));
      event.target.value = ''; // Reset file input
    }
  };

  // Video delete handler
  const handleVideoDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      await apiService.deleteCompanyVideo(currentCompanyId);

      // Update company data
      setCompanyFormData(prev => ({
        ...prev,
        videoLink: null
      }));

      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success('Video deleted successfully!');
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    }
  };

  // Banner upload handler
  const handleBannerUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image file (JPG, PNG, GIF, WebP)');
      return;
    }

    if (file.size > 10_485_760) {
      toast.error('File size exceeds 10 MB limit');
      return;
    }

    setIsUploading(prev => ({ ...prev, banner: true }));
    setUploadProgress(prev => ({ ...prev, banner: 0 }));

    try {
      const response = await apiService.uploadCompanyBanner(
        currentCompanyId,
        file,
        (progress) => setUploadProgress(prev => ({ ...prev, banner: progress }))
      );

      setCompanyFormData(prev => ({
        ...prev,
        bannerLink: response.data.bannerUrl
      }));

      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success('Banner uploaded successfully!');
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error(error.response?.data?.message || 'Failed to upload banner');
    } finally {
      setIsUploading(prev => ({ ...prev, banner: false }));
      setUploadProgress(prev => ({ ...prev, banner: 0 }));
      event.target.value = '';
    }
  };

  const handleBannerDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this banner?')) {
      return;
    }

    try {
      await apiService.deleteCompanyBanner(currentCompanyId);
      setCompanyFormData(prev => ({ ...prev, bannerLink: null }));
      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success('Banner deleted successfully!');
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error('Failed to delete banner');
    }
  };

  // Logo upload handler
  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image file (JPG, PNG, SVG, WebP)');
      return;
    }

    if (file.size > 5_242_880) {
      toast.error('File size exceeds 5 MB limit');
      return;
    }

    setIsUploading(prev => ({ ...prev, logo: true }));
    setUploadProgress(prev => ({ ...prev, logo: 0 }));

    try {
      const response = await apiService.uploadCompanyLogo(
        currentCompanyId,
        file,
        (progress) => setUploadProgress(prev => ({ ...prev, logo: progress }))
      );

      setCompanyFormData(prev => ({
        ...prev,
        logoLink: response.data.logoUrl
      }));

      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    } finally {
      setIsUploading(prev => ({ ...prev, logo: false }));
      setUploadProgress(prev => ({ ...prev, logo: 0 }));
      event.target.value = '';
    }
  };

  const handleLogoDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this logo?')) {
      return;
    }

    try {
      await apiService.deleteCompanyLogo(currentCompanyId);
      setCompanyFormData(prev => ({ ...prev, logoLink: null }));
      queryClient.invalidateQueries(['company', currentCompanyId]);
      toast.success('Logo deleted successfully!');
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast.error('Failed to delete logo');
    }
  };

  // Extract actual company data from response
  const actualCompanyData = companyData?.data || companyData;

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <EmptyState
          title={t('admin.pleaseLogin')}
          message={t('admin.needLogin')}
        />
      </PageContainer>
    );
  }

  if (!isAdmin) {
    return (
      <PageContainer>
        <EmptyState
          title={t('admin.accessDenied')}
          message={t('admin.noPermission')}
        />
      </PageContainer>
    );
  }

  if (!currentCompanyId) {
    return (
      <PageContainer>
        <EmptyState
          title={t('admin.noCompany')}
          message={t('admin.noCompanyMessage')}
        />
      </PageContainer>
    );
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen text={t('common.loading')} />;
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
    <PageContainer>
      <PageHeader
        title={t('admin.title')}
        subtitle={
          isEditing 
            ? t('admin.editingMode') 
            : `${t('admin.welcome')}, ${user?.firstName}!`
        }
        icon={<LayoutDashboard className="h-8 w-8" />}
      />

        {/* Stats Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 ${isEditing ? 'opacity-50 pointer-events-none' : ''}`}>
          {stats.map((stat, index) => (
          <Card key={index}>
              <div className="flex items-center">
                <div className={`p-3 rounded-full bg-gray-100 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
          </Card>
          ))}
        </div>

      {/* Editing Overlay Notice */}
      {isEditing && (
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700 font-medium">
                {t('admin.editingInProgress')}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {t('admin.editingNotice')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Company Profile Section */}
      <Card
        title={
          <div className="flex items-center">
            <Building2 className="h-6 w-6 text-blue-600 mr-2" />
            <span>{t('admin.companyProfile')}</span>
          </div>
        }
        headerActions={
          !isEditingCompany && (
            <button
              onClick={() => setIsEditingCompany(true)}
              className="btn-primary text-sm"
            >
              {t('common.edit')}
            </button>
          )
        }
        className="mb-8"
      >
          <div>
          {isLoadingCompany ? (
            <LoadingSpinner text={t('common.loading')} />
          ) : companyError ? (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium">{t('admin.companyLoadFailed')}</p>
              <p className="text-sm text-gray-600 mt-2">{companyError.message}</p>
            </div>
          ) : !companyData ? (
            <div className="text-center py-8">
              <p className="text-gray-600">{t('admin.noCompanyData')}</p>
            </div>
          ) : isEditingCompany ? (
              <form onSubmit={handleSaveCompany} className="space-y-6">
                {/* Tab Navigation */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('info')}
                      className={`
                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                        ${activeTab === 'info'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      {t('admin.companyInfo')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('design')}
                      className={`
                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                        ${activeTab === 'design'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      {t('admin.design')}
                    </button>
                  </nav>
                </div>

                {/* Company Info Tab */}
                {activeTab === 'info' && (
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
                      type="text"
                      name="website"
                      value={companyFormData.website || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="www.example.com or https://example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Protocol (https://) will be added automatically if not provided
                    </p>
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

                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.logoLink')}
                    </label>
                    {companyFormData.logoLink ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <img 
                            src={companyFormData.logoLink} 
                            alt="Logo" 
                            className="h-20 w-20 object-contain border border-gray-300 rounded"
                          />
                          <button
                            type="button"
                            onClick={handleLogoDelete}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                          disabled={isUploading.logo}
                        />
                        {isUploading.logo && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress.logo}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{uploadProgress.logo}%</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Max 5 MB (JPG, PNG, SVG, WebP)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Banner Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.bannerLink')}
                    </label>
                    {companyFormData.bannerLink ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <img 
                            src={companyFormData.bannerLink} 
                            alt="Banner" 
                            className="h-20 w-40 object-cover border border-gray-300 rounded"
                          />
                          <button
                            type="button"
                            onClick={handleBannerDelete}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                          disabled={isUploading.banner}
                        />
                        {isUploading.banner && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress.banner}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{uploadProgress.banner}%</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Max 10 MB (JPG, PNG, GIF, WebP)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Video Upload */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.videoLink')}
                    </label>
                    {companyFormData.videoLink ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <video 
                            src={companyFormData.videoLink} 
                            className="h-32 w-56 border border-gray-300 rounded"
                            controls
                          />
                          <button
                            type="button"
                            onClick={handleVideoDelete}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoUpload}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                          disabled={isUploading.video}
                        />
                        {isUploading.video && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress.video}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{uploadProgress.video}%</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Max 500 MB (MP4, AVI, MOV, WMV, WebM, MKV)
                        </p>
                      </div>
                    )}
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

                  {/* Tests JSONB field */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-800 mb-4 mt-4">
                      {t('admin.testsData')}
                    </h4>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.tests')}
                      <span className="text-xs text-gray-500 ml-2">(JSON format)</span>
                    </label>
                    <textarea
                      name="tests"
                      value={companyFormData.tests || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      rows="4"
                      placeholder='{"key1": "value1", "key2": "value2"}'
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('admin.testsHelp')}
                    </p>
                  </div>

                  {/* Additional Content Fields */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-800 mb-4 mt-4">
                      {t('admin.additionalContent')}
                    </h4>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.about')}
                    </label>
                    <textarea
                      name="about"
                      value={companyFormData.about || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      rows="5"
                      placeholder="Tell us about your company..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.backgroundLink')}
                    </label>
                    <input
                      type="text"
                      name="backgroundLink"
                      value={companyFormData.backgroundLink || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="https://example.com/background.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.companyPath')}
                    </label>
                    <input
                      type="text"
                      name="companyPath"
                      value={companyFormData.companyPath || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="my-company"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.bookingIntegrated')}
                    </label>
                    <textarea
                      name="bookingIntegrated"
                      value={companyFormData.bookingIntegrated || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      rows="3"
                      placeholder="Booking integration code or information..."
                    />
                  </div>

                </div>
                )}

                {/* Design Tab */}
                {activeTab === 'design' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Branding Fields */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-800 mb-4">
                      {t('admin.branding')}
                    </h4>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.subdomain')}
                    </label>
                    <input
                      type="text"
                      name="subdomain"
                      value={companyFormData.subdomain || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="mycompany"
                      maxLength="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used for: [subdomain].aegis-rental.com
                    </p>
                  </div>

                  <div className="md:col-span-2"></div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.primaryColor')}
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        name="primaryColor"
                        value={companyFormData.primaryColor || '#3B82F6'}
                        onChange={handleCompanyInputChange}
                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        name="primaryColor"
                        value={companyFormData.primaryColor || ''}
                        onChange={handleCompanyInputChange}
                        className="input-field flex-1"
                        placeholder="#FF5733"
                        maxLength="7"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.secondaryColor')}
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        name="secondaryColor"
                        value={companyFormData.secondaryColor || '#10B981'}
                        onChange={handleCompanyInputChange}
                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        name="secondaryColor"
                        value={companyFormData.secondaryColor || ''}
                        onChange={handleCompanyInputChange}
                        className="input-field flex-1"
                        placeholder="#33C1FF"
                        maxLength="7"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.logoUrl')}
                    </label>
                    <input
                      type="text"
                      name="logoUrl"
                      value={companyFormData.logoUrl || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.faviconUrl')}
                    </label>
                    <input
                      type="text"
                      name="faviconUrl"
                      value={companyFormData.faviconUrl || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field"
                      placeholder="https://example.com/favicon.ico"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.customCss')}
                    </label>
                    <textarea
                      name="customCss"
                      value={companyFormData.customCss || ''}
                      onChange={handleCompanyInputChange}
                      className="input-field font-mono text-sm"
                      rows="6"
                      placeholder=".custom-class { color: #FF5733; }"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Add custom CSS styles for your company's branding
                    </p>
                  </div>
                </div>
                )}

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
                  <p className="text-base text-gray-900">{actualCompanyData?.companyName || '-'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.email')}</p>
                  <p className="text-base text-gray-900">{actualCompanyData?.email || '-'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.phone')}</p>
                  <p className="text-base text-gray-900">{actualCompanyData?.phone || '-'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.website')}</p>
                  <p className="text-base text-gray-900">
                    {actualCompanyData?.website ? (
                      <a href={actualCompanyData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {actualCompanyData.website}
                      </a>
                    ) : '-'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-600">{t('admin.address')}</p>
                  <p className="text-base text-gray-900">
                    {[actualCompanyData?.address, actualCompanyData?.city, actualCompanyData?.state, actualCompanyData?.postalCode, actualCompanyData?.country]
                      .filter(Boolean)
                      .join(', ') || '-'}
                  </p>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">{t('admin.marketingContent')}</p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-600">{t('admin.invitation')}</p>
                  <p className="text-base text-gray-900">{actualCompanyData?.invitation || '-'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.motto')}</p>
                  <p className="text-base text-gray-900">{actualCompanyData?.motto || '-'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.mottoDescription')}</p>
                  <p className="text-base text-gray-900">{actualCompanyData?.mottoDescription || '-'}</p>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">{t('admin.testsData')}</p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-600">{t('admin.tests')}</p>
                  <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
                    {actualCompanyData?.tests ? (() => {
                      try {
                        return JSON.stringify(JSON.parse(actualCompanyData.tests), null, 2);
                      } catch (e) {
                        return actualCompanyData.tests;
                      }
                    })() : '-'}
                  </pre>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">{t('admin.mediaLinks')}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.logoLink')}</p>
                  <p className="text-base text-gray-900">
                    {actualCompanyData?.logoLink ? (
                      <a href={actualCompanyData.logoLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {t('admin.viewLogo')}
                      </a>
                    ) : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">{t('admin.bannerLink')}</p>
                  <p className="text-base text-gray-900">
                    {actualCompanyData?.bannerLink ? (
                      <a href={actualCompanyData.bannerLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {t('admin.viewBanner')}
                      </a>
                    ) : '-'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-600">{t('admin.videoLink')}</p>
                  <p className="text-base text-gray-900">
                    {actualCompanyData?.videoLink ? (
                      <a href={actualCompanyData.videoLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {t('admin.viewVideo')}
                      </a>
                    ) : '-'}
                  </p>
                </div>
              </div>
          )}
        </div>
      </Card>

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${isEditing ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Recent Vehicles */}
        <Card title={t('vehicles.title')}>
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
        </Card>

          {/* Recent Reservations */}
        <Card title={t('admin.recentActivity')}>
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
        </Card>
        </div>

        {/* Quick Actions */}
      <Card title={t('admin.quickActions')} className={`mt-8 ${isEditing ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="btn-primary flex items-center justify-center" disabled={isEditing}>
              <Car className="h-4 w-4 mr-2" />
              {t('admin.addVehicle')}
            </button>
            <button className="btn-outline flex items-center justify-center" disabled={isEditing}>
              <Users className="h-4 w-4 mr-2" />
              {t('admin.manageUsers')}
            </button>
          <button className="btn-secondary flex items-center justify-center" disabled={isEditing}>
              <TrendingUp className="h-4 w-4 mr-2" />
            {t('admin.viewReports')}
            </button>
          </div>
      </Card>
    </PageContainer>
  );
};

export default AdminDashboard;
