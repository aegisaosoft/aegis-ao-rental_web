/*
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 *
 * Instagram Campaign Management Component
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Calendar,
  Clock,
  Send,
  Image,
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Copy,
  Layers,
  Zap
} from 'lucide-react';
import { Card, LoadingSpinner, EmptyState } from '../../components/common';
import { translatedApiService as apiService } from '../../services/translatedApi';
import { useMetaIntegration } from './hooks';

// Instagram Icon Component
const InstagramIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const InstagramCampaignSection = ({
  t,
  currentCompanyId,
  isAuthenticated,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Get Meta connection status
  const { metaConnectionStatus } = useMetaIntegration({
    currentCompanyId,
    isAuthenticated,
    enabled: true,
  });

  // Check if Instagram is connected
  const isConnected = metaConnectionStatus?.instagramAccountId;

  // Fetch vehicles for this company
  const { data: vehiclesData } = useQuery(
    ['vehicles', currentCompanyId],
    () => apiService.getVehicles({ companyId: currentCompanyId, pageSize: 1000 }),
    {
      enabled: isAuthenticated && !!currentCompanyId && isConnected,
      refetchOnWindowFocus: false,
    }
  );

  // Extract vehicles list
  const vehicles = useMemo(() => {
    let data = vehiclesData;
    if (data?.data) data = data.data;
    if (data?.result) data = data.result;
    const list = data?.Vehicles || data?.vehicles || (Array.isArray(data) ? data : []);
    return Array.isArray(list) ? list : [];
  }, [vehiclesData]);

  // Fetch dashboard data
  const { data: dashboard, isLoading: isDashboardLoading } = useQuery(
    ['instagram-dashboard', currentCompanyId],
    () => apiService.get(`/api/instagram-campaign/dashboard/${currentCompanyId}`),
    { enabled: !!currentCompanyId && isConnected }
  );

  // Fetch scheduled posts
  const { data: scheduledPosts = [], isLoading: isScheduledLoading } = useQuery(
    ['instagram-scheduled', currentCompanyId],
    () => apiService.get(`/api/instagram-campaign/scheduled/${currentCompanyId}`),
    { enabled: !!currentCompanyId && isConnected }
  );

  // Fetch templates
  const { data: templates = [] } = useQuery(
    ['instagram-templates', currentCompanyId],
    () => apiService.get(`/api/instagram-campaign/templates/${currentCompanyId}`),
    { enabled: !!currentCompanyId && isConnected }
  );

  // Fetch auto-post settings
  const { data: autoPostSettings } = useQuery(
    ['instagram-auto-settings', currentCompanyId],
    () => apiService.get(`/api/instagram-campaign/auto-post-settings/${currentCompanyId}`),
    { enabled: !!currentCompanyId && isConnected }
  );

  // Publish mutation
  const publishMutation = useMutation(
    (data) => apiService.post(`/api/instagram-campaign/publish/${currentCompanyId}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['instagram-dashboard']);
        queryClient.invalidateQueries(['social-posts-status']);
        setShowPublishModal(false);
        setSelectedVehicles([]);
      }
    }
  );

  // Carousel publish mutation
  const carouselMutation = useMutation(
    (data) => apiService.post(`/api/instagram-campaign/publish-carousel/${currentCompanyId}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['instagram-dashboard']);
        setShowPublishModal(false);
        setSelectedVehicles([]);
      }
    }
  );

  // Schedule mutation
  const scheduleMutation = useMutation(
    (data) => apiService.post(`/api/instagram-campaign/schedule/${currentCompanyId}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['instagram-scheduled']);
        setShowScheduleModal(false);
        setSelectedVehicles([]);
      }
    }
  );

  // Cancel scheduled post
  const cancelScheduleMutation = useMutation(
    (postId) => apiService.delete(`/api/instagram-campaign/scheduled/${currentCompanyId}/${postId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['instagram-scheduled']);
      }
    }
  );

  // Update auto-post settings
  const updateAutoPostMutation = useMutation(
    (data) => apiService.put(`/api/instagram-campaign/auto-post-settings/${currentCompanyId}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['instagram-auto-settings']);
      }
    }
  );

  // Save template
  const saveTemplateMutation = useMutation(
    (data) => {
      if (editingTemplate?.id) {
        return apiService.put(`/api/instagram-campaign/templates/${currentCompanyId}/${editingTemplate.id}`, data);
      }
      return apiService.post(`/api/instagram-campaign/templates/${currentCompanyId}`, data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['instagram-templates']);
        setShowTemplateModal(false);
        setEditingTemplate(null);
      }
    }
  );

  if (!isConnected) {
    return (
      <Card title={t('instagram.campaigns', 'Instagram Campaigns')}>
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <InstagramIcon className="h-10 w-10 text-pink-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('instagram.notConnected', 'Instagram Not Connected')}
          </h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            {t('instagram.connectFirst', 'Connect your Instagram Business account to start posting vehicles and managing campaigns.')}
          </p>
          <p className="text-sm text-gray-500">
            {t('instagram.goToMeta', 'Go to the Meta Integration tab to connect.')}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Account Info */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <InstagramIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                @{metaConnectionStatus?.instagramUsername || 'Instagram'}
              </h2>
              <p className="text-white/80 text-sm">
                {t('instagram.businessAccount', 'Business Account Connected')}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPublishModal(true)}
              className="bg-white text-pink-600 px-4 py-2 rounded-lg font-medium hover:bg-white/90 transition flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {t('instagram.newPost', 'New Post')}
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {t('instagram.schedule', 'Schedule')}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'dashboard', label: t('instagram.dashboard', 'Dashboard'), icon: TrendingUp },
            { id: 'scheduled', label: t('instagram.scheduled', 'Scheduled'), icon: Calendar },
            { id: 'templates', label: t('instagram.templates', 'Templates'), icon: Copy },
            { id: 'automation', label: t('instagram.automation', 'Automation'), icon: Zap }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <DashboardTab 
          t={t}
          dashboard={dashboard}
          isLoading={isDashboardLoading}
        />
      )}

      {activeTab === 'scheduled' && (
        <ScheduledTab
          t={t}
          scheduledPosts={scheduledPosts}
          isLoading={isScheduledLoading}
          onCancel={(id) => cancelScheduleMutation.mutate(id)}
          vehicles={vehicles}
        />
      )}

      {activeTab === 'templates' && (
        <TemplatesTab
          t={t}
          templates={templates}
          onAdd={() => {
            setEditingTemplate(null);
            setShowTemplateModal(true);
          }}
          onEdit={(template) => {
            setEditingTemplate(template);
            setShowTemplateModal(true);
          }}
        />
      )}

      {activeTab === 'automation' && (
        <AutomationTab
          t={t}
          settings={autoPostSettings}
          onUpdate={(data) => updateAutoPostMutation.mutate(data)}
          isUpdating={updateAutoPostMutation.isLoading}
        />
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <PublishModal
          t={t}
          vehicles={vehicles}
          selectedVehicles={selectedVehicles}
          setSelectedVehicles={setSelectedVehicles}
          templates={templates}
          onClose={() => {
            setShowPublishModal(false);
            setSelectedVehicles([]);
          }}
          onPublish={(data) => {
            if (selectedVehicles.length > 1) {
              carouselMutation.mutate({
                vehicleIds: selectedVehicles,
                ...data
              });
            } else {
              publishMutation.mutate({
                vehicleId: selectedVehicles[0],
                ...data
              });
            }
          }}
          isPublishing={publishMutation.isLoading || carouselMutation.isLoading}
          apiService={apiService}
          currentCompanyId={currentCompanyId}
        />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          t={t}
          vehicles={vehicles}
          selectedVehicles={selectedVehicles}
          setSelectedVehicles={setSelectedVehicles}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedVehicles([]);
          }}
          onSchedule={(data) => scheduleMutation.mutate(data)}
          isScheduling={scheduleMutation.isLoading}
        />
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          t={t}
          template={editingTemplate}
          onClose={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
          onSave={(data) => saveTemplateMutation.mutate(data)}
          isSaving={saveTemplateMutation.isLoading}
        />
      )}
    </div>
  );
};

// Dashboard Tab Component
const DashboardTab = ({ t, dashboard, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const stats = dashboard?.analytics || {};

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t('instagram.totalPosts', 'Total Posts')}
          value={dashboard?.totalPosts || 0}
          icon={Image}
          color="pink"
        />
        <StatCard
          label={t('instagram.thisMonth', 'This Month')}
          value={dashboard?.postsThisMonth || 0}
          icon={Calendar}
          color="purple"
        />
        <StatCard
          label={t('instagram.scheduled', 'Scheduled')}
          value={dashboard?.scheduledCount || 0}
          icon={Clock}
          color="blue"
        />
        <StatCard
          label={t('instagram.engagement', 'Engagement')}
          value={stats.TotalEngagement || 0}
          icon={TrendingUp}
          color="green"
        />
      </div>

      {/* Analytics Summary */}
      <Card title={t('instagram.analytics30Days', '30-Day Analytics')}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.TotalImpressions?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-500">{t('instagram.impressions', 'Impressions')}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.TotalReach?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-500">{t('instagram.reach', 'Reach')}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.TotalLikes?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-500">{t('instagram.likes', 'Likes')}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.TotalComments?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-500">{t('instagram.comments', 'Comments')}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.TotalEngagement?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-500">{t('instagram.totalEngagement', 'Total Engagement')}</p>
          </div>
        </div>
      </Card>

      {/* Recent Posts */}
      <Card title={t('instagram.recentPosts', 'Recent Posts')}>
        {dashboard?.topPosts?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {dashboard.topPosts.map(post => (
              <a
                key={post.id}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden"
              >
                {post.imageUrl && (
                  <img 
                    src={post.imageUrl} 
                    alt=""
                    className="w-full h-full object-cover group-hover:opacity-75 transition"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <ExternalLink className="h-6 w-6 text-white" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-white text-xs truncate">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <EmptyState 
            icon={Image}
            title={t('instagram.noPosts', 'No posts yet')}
            description={t('instagram.startPosting', 'Start by publishing your first vehicle to Instagram')}
          />
        )}
      </Card>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ label, value, icon: Icon, color }) => {
  const colors = {
    pink: 'bg-pink-100 text-pink-600',
    purple: 'bg-purple-100 text-purple-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
};

// Scheduled Tab Component
const ScheduledTab = ({ t, scheduledPosts, isLoading, onCancel, vehicles }) => {
  if (isLoading) {
    return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  }

  if (scheduledPosts.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Calendar}
          title={t('instagram.noScheduled', 'No Scheduled Posts')}
          description={t('instagram.scheduleDescription', 'Schedule posts to be published automatically at a specific time.')}
        />
      </Card>
    );
  }

  const getVehicleName = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.vehicleModel?.make || ''} ${vehicle.vehicleModel?.model || ''}`.trim() || vehicle.licensePlate : 'Unknown';
  };

  return (
    <Card>
      <div className="divide-y divide-gray-200">
        {scheduledPosts.map(post => (
          <div key={post.id} className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                {post.postType === 1 ? (
                  <Layers className="h-6 w-6 text-gray-400" />
                ) : (
                  <Image className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {post.vehicleId ? getVehicleName(post.vehicleId) : `${post.vehicleIds?.length || 0} vehicles`}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  {new Date(post.scheduledFor).toLocaleString()}
                </div>
                {post.caption && (
                  <p className="text-sm text-gray-500 truncate max-w-md mt-1">
                    {post.caption.substring(0, 50)}...
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                post.status === 0 ? 'bg-yellow-100 text-yellow-800' :
                post.status === 2 ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {post.status === 0 ? 'Pending' : post.status === 2 ? 'Published' : 'Failed'}
              </span>
              {post.status === 0 && (
                <button
                  onClick={() => onCancel(post.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// Templates Tab Component
const TemplatesTab = ({ t, templates, onAdd, onEdit }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onAdd}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t('instagram.addTemplate', 'Add Template')}
        </button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <EmptyState
            icon={Copy}
            title={t('instagram.noTemplates', 'No Templates')}
            description={t('instagram.templateDescription', 'Create reusable templates for quick posting.')}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(template => (
            <Card key={template.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  {template.isDefault && (
                    <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onEdit(template)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
              {template.description && (
                <p className="text-sm text-gray-500 mb-3">{template.description}</p>
              )}
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 font-mono whitespace-pre-wrap">
                {template.captionTemplate.substring(0, 150)}
                {template.captionTemplate.length > 150 && '...'}
              </div>
              {template.hashtags?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {template.hashtags.slice(0, 5).map((tag, i) => (
                    <span key={i} className="text-xs text-pink-600">{tag}</span>
                  ))}
                  {template.hashtags.length > 5 && (
                    <span className="text-xs text-gray-400">+{template.hashtags.length - 5} more</span>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Automation Tab Component
const AutomationTab = ({ t, settings, onUpdate, isUpdating }) => {
  const [localSettings, setLocalSettings] = useState(settings || {});

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = () => {
    onUpdate(localSettings);
  };

  const toggleSetting = (key) => {
    setLocalSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card title={t('instagram.autoPostSettings', 'Auto-Post Settings')}>
      <div className="space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-semibold text-gray-900">
              {t('instagram.enableAutoPost', 'Enable Auto-Posting')}
            </h3>
            <p className="text-sm text-gray-500">
              {t('instagram.autoPostDescription', 'Automatically post vehicles to Instagram based on triggers')}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.isEnabled || false}
              onChange={() => toggleSetting('isEnabled')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
          </label>
        </div>

        {/* Trigger Settings */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">{t('instagram.triggers', 'Triggers')}</h4>
          
          {[
            { key: 'postOnVehicleAdded', label: t('instagram.triggerAdded', 'Post when new vehicle is added') },
            { key: 'postOnVehicleUpdated', label: t('instagram.triggerUpdated', 'Post when vehicle is updated') },
            { key: 'postOnVehicleAvailable', label: t('instagram.triggerAvailable', 'Post when vehicle becomes available') },
            { key: 'postOnPriceChange', label: t('instagram.triggerPrice', 'Post when price changes') }
          ].map(item => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings[item.key] || false}
                onChange={() => toggleSetting(item.key)}
                className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
              />
              <span className="text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>

        {/* Post Options */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">{t('instagram.postOptions', 'Post Options')}</h4>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.includePriceInPosts || false}
              onChange={() => toggleSetting('includePriceInPosts')}
              className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
            />
            <span className="text-gray-700">{t('instagram.includePrice', 'Include price in posts')}</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.crossPostToFacebook || false}
              onChange={() => toggleSetting('crossPostToFacebook')}
              className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
            />
            <span className="text-gray-700">{t('instagram.crossPost', 'Also post to Facebook')}</span>
          </label>
        </div>

        {/* Rate Limiting */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('instagram.minHours', 'Minimum hours between auto-posts')}
          </label>
          <select
            value={localSettings.minHoursBetweenPosts || 4}
            onChange={(e) => setLocalSettings(prev => ({ ...prev, minHoursBetweenPosts: parseInt(e.target.value) }))}
            className="input max-w-xs"
          >
            <option value={1}>1 hour</option>
            <option value={2}>2 hours</option>
            <option value={4}>4 hours</option>
            <option value={8}>8 hours</option>
            <option value={12}>12 hours</option>
            <option value={24}>24 hours</option>
          </select>
        </div>

        {/* Default Call to Action */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('instagram.defaultCTA', 'Default Call to Action')}
          </label>
          <input
            type="text"
            value={localSettings.defaultCallToAction || ''}
            onChange={(e) => setLocalSettings(prev => ({ ...prev, defaultCallToAction: e.target.value }))}
            placeholder="📲 Book now - link in bio!"
            className="input"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="btn-primary flex items-center gap-2"
          >
            {isUpdating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {t('common.save', 'Save Settings')}
          </button>
        </div>
      </div>
    </Card>
  );
};

// Publish Modal Component
const PublishModal = ({
  t,
  vehicles,
  selectedVehicles,
  setSelectedVehicles,
  templates,
  onClose,
  onPublish,
  isPublishing,
  apiService,
  currentCompanyId
}) => {
  const [caption, setCaption] = useState('');
  const [includePrice, setIncludePrice] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [, setPreviewCaption] = useState(null);

  const availableVehicles = vehicles.filter(v => v.imageUrl && v.status !== 3);

  const handleVehicleToggle = (vehicleId) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const handlePreviewCaption = async () => {
    if (selectedVehicles.length === 1) {
      try {
        const result = await apiService.post(
          `/api/instagram-campaign/preview-caption/${currentCompanyId}/${selectedVehicles[0]}`,
          { includePrice, includeHashtags: true }
        );
        setPreviewCaption(result);
        setCaption(result.text);
      } catch (error) {
        console.error('Failed to generate caption:', error);
      }
    }
  };

  const handleApplyTemplate = async (templateId) => {
    if (selectedVehicles.length === 1) {
      try {
        const result = await apiService.post(
          `/api/instagram-campaign/templates/${currentCompanyId}/${templateId}/apply/${selectedVehicles[0]}`
        );
        setCaption(result.caption);
        setIncludePrice(result.includePrice);
        setSelectedTemplate(templateId);
      } catch (error) {
        console.error('Failed to apply template:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <InstagramIcon className="h-6 w-6 text-pink-600" />
            {selectedVehicles.length > 1 
              ? t('instagram.publishCarousel', 'Publish Carousel')
              : t('instagram.publishPost', 'Publish to Instagram')}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Vehicle Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('instagram.selectVehicles', 'Select Vehicles')} ({selectedVehicles.length}/10)
            </label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 max-h-60 overflow-y-auto">
              {availableVehicles.map(vehicle => (
                <button
                  key={vehicle.id}
                  onClick={() => handleVehicleToggle(vehicle.id)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                    selectedVehicles.includes(vehicle.id)
                      ? 'border-pink-500 ring-2 ring-pink-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {vehicle.imageUrl && (
                    <img 
                      src={vehicle.imageUrl} 
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                  {selectedVehicles.includes(vehicle.id) && (
                    <div className="absolute top-1 right-1 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60 text-white text-xs truncate">
                    {vehicle.vehicleModel?.make} {vehicle.vehicleModel?.model}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Template Selection */}
          {selectedVehicles.length === 1 && templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('instagram.useTemplate', 'Use Template')}
              </label>
              <div className="flex gap-2 flex-wrap">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleApplyTemplate(template.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition ${
                      selectedTemplate === template.id
                        ? 'bg-pink-100 text-pink-700 border border-pink-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('instagram.caption', 'Caption')}
              </label>
              {selectedVehicles.length === 1 && (
                <button
                  onClick={handlePreviewCaption}
                  className="text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1"
                >
                  <Zap className="h-4 w-4" />
                  {t('instagram.generateCaption', 'Generate Caption')}
                </button>
              )}
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              placeholder={t('instagram.captionPlaceholder', 'Write a caption for your post...')}
              className="input font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              {caption.length}/2,200 characters
            </p>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includePrice}
                onChange={(e) => setIncludePrice(e.target.checked)}
                className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
              />
              <span className="text-sm text-gray-700">{t('instagram.includePrice', 'Include price')}</span>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={() => onPublish({ caption, includePrice })}
            disabled={isPublishing || selectedVehicles.length === 0}
            className="btn-primary bg-pink-600 hover:bg-pink-700 flex items-center gap-2"
          >
            {isPublishing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {selectedVehicles.length > 1 
              ? t('instagram.publishCarousel', 'Publish Carousel')
              : t('instagram.publish', 'Publish')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Schedule Modal (simplified version)
const ScheduleModal = ({
  t,
  vehicles,
  selectedVehicles,
  setSelectedVehicles,
  onClose,
  onSchedule,
  isScheduling
}) => {
  const [caption, setCaption] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [includePrice, setIncludePrice] = useState(true);

  const availableVehicles = vehicles.filter(v => v.imageUrl);

  const handleVehicleToggle = (vehicleId) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const handleSubmit = () => {
    const data = {
      vehicleId: selectedVehicles.length === 1 ? selectedVehicles[0] : null,
      vehicleIds: selectedVehicles.length > 1 ? selectedVehicles : null,
      isCarousel: selectedVehicles.length > 1,
      caption,
      scheduledFor: new Date(scheduledFor).toISOString(),
      includePrice
    };
    onSchedule(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-pink-600" />
            {t('instagram.schedulePost', 'Schedule Post')}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Vehicle Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('instagram.selectVehicles', 'Select Vehicles')}
            </label>
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {availableVehicles.map(vehicle => (
                <button
                  key={vehicle.id}
                  onClick={() => handleVehicleToggle(vehicle.id)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                    selectedVehicles.includes(vehicle.id)
                      ? 'border-pink-500'
                      : 'border-gray-200'
                  }`}
                >
                  {vehicle.imageUrl && (
                    <img src={vehicle.imageUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule DateTime */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('instagram.scheduleFor', 'Schedule For')}
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="input"
            />
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('instagram.caption', 'Caption')}
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              className="input"
            />
          </div>

          {/* Include Price */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includePrice}
              onChange={(e) => setIncludePrice(e.target.checked)}
              className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
            />
            <span className="text-sm text-gray-700">{t('instagram.includePrice', 'Include price')}</span>
          </label>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isScheduling || selectedVehicles.length === 0 || !scheduledFor}
            className="btn-primary bg-pink-600 hover:bg-pink-700 flex items-center gap-2"
          >
            {isScheduling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            {t('instagram.schedule', 'Schedule')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Template Modal (simplified)
const TemplateModal = ({ t, template, onClose, onSave, isSaving }) => {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [captionTemplate, setCaptionTemplate] = useState(template?.captionTemplate || '');
  const [callToAction, setCallToAction] = useState(template?.callToAction || '');
  const [hashtags, setHashtags] = useState(template?.hashtags?.join(' ') || '');
  const [includePrice, setIncludePrice] = useState(template?.includePrice ?? true);
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);

  const handleSubmit = () => {
    onSave({
      name,
      description,
      captionTemplate,
      callToAction,
      hashtags: hashtags.split(' ').filter(h => h.startsWith('#')),
      includePrice,
      isDefault
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            {template ? t('instagram.editTemplate', 'Edit Template') : t('instagram.newTemplate', 'New Template')}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g., SUV Special"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Caption Template
              <span className="text-xs text-gray-500 ml-2">
                Use: {'{make}'} {'{model}'} {'{year}'} {'{color}'} {'{location}'}
              </span>
            </label>
            <textarea
              value={captionTemplate}
              onChange={(e) => setCaptionTemplate(e.target.value)}
              rows={5}
              className="input font-mono text-sm"
              placeholder="🚗 {year} {make} {model}&#10;&#10;Available for rent in {location}!"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Call to Action</label>
            <input
              type="text"
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              className="input"
              placeholder="📲 Book now - link in bio!"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags (space-separated)</label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="input"
              placeholder="#carrental #luxurycar #roadtrip"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includePrice}
                onChange={(e) => setIncludePrice(e.target.checked)}
                className="w-4 h-4 text-pink-600 rounded"
              />
              <span className="text-sm text-gray-700">Include price</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-pink-600 rounded"
              />
              <span className="text-sm text-gray-700">Set as default</span>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !name || !captionTemplate}
            className="btn-primary flex items-center gap-2"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstagramCampaignSection;
