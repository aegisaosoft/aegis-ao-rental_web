/*
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  Unlink, 
  Send, 
  RefreshCw, 
  ExternalLink, 
  Clock, 
  Eye, 
  CheckCircle2, 
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';
import { Card, LoadingSpinner } from '../../components/common';

// Facebook Icon Component
const FacebookIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

// Instagram Icon Component
const InstagramIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const MetaSection = ({
  t,
  currentCompanyId,
  // Meta connection status
  metaConnectionStatus,
  isLoadingMetaStatus,
  metaStatusError,
  // Mutations
  connectMetaMutation,
  disconnectMetaMutation,
  selectMetaPageMutation,
  refreshInstagramMutation,
  // Available pages
  availablePages,
  // API service for direct calls
  apiService,
  queryClient,
}) => {
  const [activeTab, setActiveTab] = useState('instagram');
  const [showPageSelectModal, setShowPageSelectModal] = useState(false);

  // Check for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const metaSuccess = params.get('meta_success');
    const metaError = params.get('meta_error');

    if (metaSuccess === 'true') {
      // Toast success handled by parent
      window.history.replaceState({}, '', window.location.pathname);
    } else if (metaError) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = () => {
    if (connectMetaMutation) {
      connectMetaMutation.mutate();
    } else {
      // Redirect to OAuth - use the proxy server endpoint
      const lang = document.documentElement.lang || 'en';
      window.location.href = `/api/meta/oauth/connect/${currentCompanyId}?lang=${lang}`;
    }
  };

  const handleDisconnect = () => {
    if (disconnectMetaMutation) {
      disconnectMetaMutation.mutate();
    }
  };

  const handleSelectPage = (pageId) => {
    if (selectMetaPageMutation) {
      selectMetaPageMutation.mutate(pageId);
      setShowPageSelectModal(false);
    }
  };

  const handleRefreshInstagram = async () => {
    if (refreshInstagramMutation) {
      refreshInstagramMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <Card title={t('admin.metaIntegration', 'Meta Integration')}>
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('instagram')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                ${activeTab === 'instagram'
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <InstagramIcon className="h-5 w-5" />
              Instagram
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('facebook')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                ${activeTab === 'facebook'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <FacebookIcon className="h-5 w-5" />
              Facebook
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'instagram' && (
          <InstagramTab
            t={t}
            connectionStatus={metaConnectionStatus}
            isLoading={isLoadingMetaStatus}
            error={metaStatusError}
            onConnect={handleConnect}
            onRefreshInstagram={handleRefreshInstagram}
            isRefreshing={refreshInstagramMutation?.isLoading}
          />
        )}

        {activeTab === 'facebook' && (
          <FacebookTab
            t={t}
            connectionStatus={metaConnectionStatus}
            isLoading={isLoadingMetaStatus}
            error={metaStatusError}
            availablePages={availablePages}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onSelectPage={handleSelectPage}
            showPageSelectModal={showPageSelectModal}
            setShowPageSelectModal={setShowPageSelectModal}
            isDisconnecting={disconnectMetaMutation?.isLoading}
            isSelectingPage={selectMetaPageMutation?.isLoading}
          />
        )}
      </Card>

      {/* Page Select Modal */}
      {showPageSelectModal && availablePages && availablePages.length > 0 && (
        <PageSelectModal
          t={t}
          pages={availablePages}
          onClose={() => setShowPageSelectModal(false)}
          onSelect={handleSelectPage}
          isLoading={selectMetaPageMutation?.isLoading}
          currentPageId={metaConnectionStatus?.pageId}
        />
      )}
    </div>
  );
};

// Instagram Tab Component
const InstagramTab = ({
  t,
  connectionStatus,
  isLoading,
  error,
  onConnect,
  onRefreshInstagram,
  isRefreshing,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('meta.connectionError', 'Connection Error')}
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {error.message || t('meta.errorLoadingStatus', 'Failed to load Meta connection status. Please try again later.')}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {t('common.retry', 'Retry')}
        </button>
      </div>
    );
  }

  if (!connectionStatus?.isConnected || !connectionStatus?.instagramAccountId) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <InstagramIcon className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('meta.connectInstagram', 'Connect Instagram Business')}
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {t('meta.connectInstagramDesc', 'Connect your Instagram Business account to manage your social media presence directly from your dashboard.')}
        </p>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
          <p className="text-sm text-amber-800">
            <strong>{t('common.note', 'Note')}:</strong>{' '}
            {t('meta.instagramRequiresFacebook', 'Instagram Business accounts must be connected to a Facebook Page. Please connect your Facebook Page first.')}
          </p>
        </div>

        {!connectionStatus?.isConnected ? (
          <button
            type="button"
            onClick={onConnect}
            className="btn-primary bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 inline-flex items-center gap-2"
          >
            <Link2 className="h-4 w-4" />
            {t('meta.connectWithFacebook', 'Connect with Facebook')}
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-500 text-sm">
              {t('meta.noInstagramLinked', 'No Instagram Business account is linked to your Facebook Page.')}
            </p>
            <button
              type="button"
              onClick={onRefreshInstagram}
              disabled={isRefreshing}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('meta.refreshInstagram', 'Refresh Instagram Connection')}
            </button>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              {t('meta.refreshInstagramHint', 'If you already linked your Instagram to your Facebook Page, click refresh to sync it here.')}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Connected state
  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <InstagramIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">
                  @{connectionStatus.instagramUsername || 'Instagram Business'}
                </h3>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-sm text-gray-500">
                {t('meta.linkedToFacebook', 'Linked to')} {connectionStatus.pageName}
              </p>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">{t('meta.instagramId', 'Instagram ID')}</p>
            <p className="font-mono text-sm mt-1">{connectionStatus.instagramAccountId || '-'}</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">{t('meta.connectedSince', 'Connected Since')}</p>
            <p className="text-sm mt-1">
              {connectionStatus.connectedAt 
                ? new Date(connectionStatus.connectedAt).toLocaleDateString() 
                : '-'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">{t('meta.tokenStatus', 'Token Status')}</p>
            <p className={`text-sm mt-1 ${connectionStatus.tokenStatus === 'expired' ? 'text-red-500' : 'text-green-500'}`}>
              {connectionStatus.tokenStatus === 'expired' ? t('meta.expired', 'Expired') : t('meta.valid', 'Valid')}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          {t('meta.quickActions', 'Quick Actions')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href={`https://instagram.com/${connectionStatus.instagramUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-white transition-colors bg-white"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <ExternalLink className="h-5 w-5 text-gray-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">
                {t('meta.viewProfile', 'View Profile')}
              </p>
              <p className="text-sm text-gray-500">
                {t('meta.openOnInstagram', 'Open on Instagram')}
              </p>
            </div>
          </a>

          <button
            type="button"
            onClick={onRefreshInstagram}
            disabled={isRefreshing}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-white transition-colors bg-white text-left"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <RefreshCw className={`h-5 w-5 text-green-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {t('meta.refreshConnection', 'Refresh Connection')}
              </p>
              <p className="text-sm text-gray-500">
                {t('meta.renewAccessToken', 'Renew access token')}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Placeholder for future features */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          {t('meta.recentActivity', 'Recent Activity')}
        </h3>
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>{t('meta.noRecentActivity', 'No recent activity')}</p>
          <p className="text-sm mt-1">
            {t('meta.activityWillAppear', 'Your activity will appear here')}
          </p>
        </div>
      </div>
    </div>
  );
};

// Facebook Tab Component
const FacebookTab = ({
  t,
  connectionStatus,
  isLoading,
  error,
  availablePages,
  onConnect,
  onDisconnect,
  onSelectPage,
  showPageSelectModal,
  setShowPageSelectModal,
  isDisconnecting,
  isSelectingPage,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('meta.connectionError', 'Connection Error')}
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {error.message || t('meta.errorLoadingStatus', 'Failed to load Meta connection status. Please try again later.')}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {t('common.retry', 'Retry')}
        </button>
      </div>
    );
  }

  if (!connectionStatus?.isConnected) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FacebookIcon className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('meta.connectFacebook', 'Connect Facebook Page')}
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {t('meta.connectFacebookDesc', 'Connect your Facebook Page to manage your business presence and enable Instagram integration.')}
        </p>
        <button
          type="button"
          onClick={onConnect}
          className="btn-primary bg-blue-600 hover:bg-blue-700 inline-flex items-center gap-2"
        >
          <Link2 className="h-4 w-4" />
          {t('meta.connectWithFacebook', 'Connect with Facebook')}
        </button>
      </div>
    );
  }

  // Connected state
  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FacebookIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">
                  {connectionStatus.pageName || 'Facebook Page'}
                </h3>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-sm text-gray-500">
                {t('meta.connectedSince', 'Connected since')}{' '}
                {connectionStatus.connectedAt 
                  ? new Date(connectionStatus.connectedAt).toLocaleDateString() 
                  : '-'}
              </p>
              {connectionStatus.tokenStatus === 'expired' && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-4 w-4" />
                  {t('meta.tokenExpired', 'Token expired - please reconnect')}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 inline-flex items-center gap-2"
          >
            {isDisconnecting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Unlink className="h-4 w-4" />
            )}
            {t('meta.disconnect', 'Disconnect')}
          </button>
        </div>

        {/* Page Details */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-500">{t('meta.pageId', 'Page ID')}</p>
            <p className="font-mono text-sm mt-1">{connectionStatus.pageId || '-'}</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-500">{t('meta.catalogId', 'Catalog ID')}</p>
            <p className="font-mono text-sm mt-1">{connectionStatus.catalogId || '-'}</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-500">{t('meta.pixelId', 'Pixel ID')}</p>
            <p className="font-mono text-sm mt-1">{connectionStatus.pixelId || '-'}</p>
          </div>
        </div>

        {/* Change Page Button */}
        {availablePages && availablePages.length > 1 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowPageSelectModal(true)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {t('meta.changePage', 'Change Page')}
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          {t('meta.quickActions', 'Quick Actions')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <a
            href={`https://facebook.com/${connectionStatus.pageId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-white transition-colors bg-white"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <ExternalLink className="h-5 w-5 text-gray-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">
                {t('meta.viewPage', 'View Page')}
              </p>
              <p className="text-sm text-gray-500">
                {t('meta.openOnFacebook', 'Open on Facebook')}
              </p>
            </div>
          </a>

          <button
            type="button"
            onClick={onConnect}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-white transition-colors bg-white text-left"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {t('meta.refreshConnection', 'Refresh Connection')}
              </p>
              <p className="text-sm text-gray-500">
                {t('meta.renewAccessToken', 'Renew access token')}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Placeholder for recent activity */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          {t('meta.recentActivity', 'Recent Activity')}
        </h3>
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>{t('meta.noRecentActivity', 'No recent activity')}</p>
          <p className="text-sm mt-1">
            {t('meta.activityWillAppear', 'Your activity will appear here')}
          </p>
        </div>
      </div>
    </div>
  );
};

// Page Select Modal
const PageSelectModal = ({
  t,
  pages,
  onClose,
  onSelect,
  isLoading,
  currentPageId,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            {t('meta.selectPage', 'Select Facebook Page')}
          </h2>
        </div>

        <div className="p-4 space-y-2">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => onSelect(page.id)}
              disabled={isLoading}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                page.id === currentPageId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FacebookIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">{page.name}</p>
                {page.category && (
                  <p className="text-sm text-gray-500">{page.category}</p>
                )}
              </div>
              {page.id === currentPageId && (
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
              )}
              {isLoading && page.id !== currentPageId && (
                <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary w-full"
            disabled={isLoading}
          >
            {t('common.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetaSection;
