/*
 * useMetaIntegration - Hook for Meta/Instagram integration
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { translatedApiService as apiService } from '../../../services/translatedApi';

/**
 * Hook for Meta/Instagram integration queries and mutations
 * @param {Object} options
 * @param {string} options.currentCompanyId - Current company ID
 * @param {boolean} options.isAuthenticated - Authentication status
 * @param {boolean} options.enabled - Whether to enable queries
 * @returns {Object} Meta integration state and mutations
 */
const useMetaIntegration = ({ currentCompanyId, isAuthenticated, enabled = true }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Meta connection status query
  const { 
    data: metaConnectionStatus, 
    isLoading: isLoadingMetaStatus, 
    error: metaStatusError 
  } = useQuery(
    ['metaStatus', currentCompanyId],
    async () => {
      const response = await apiService.getMetaConnectionStatus(currentCompanyId);
      return response;
    },
    {
      enabled: isAuthenticated && !!currentCompanyId && enabled,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  // Available pages query
  const { data: metaAvailablePages } = useQuery(
    ['metaPages', currentCompanyId],
    () => apiService.getMetaAvailablePages(currentCompanyId),
    {
      enabled: isAuthenticated && !!currentCompanyId && metaConnectionStatus?.isConnected,
      retry: false,
    }
  );

  // Connect mutation
  const connectMetaMutation = useMutation(
    () => {
      const lang = document.documentElement.lang || 'en';
      window.location.href = `/api/meta/oauth/connect/${currentCompanyId}?lang=${lang}`;
      return Promise.resolve();
    }
  );

  // Disconnect mutation
  const disconnectMetaMutation = useMutation(
    () => apiService.disconnectMeta(currentCompanyId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['metaStatus', currentCompanyId]);
        toast.success(t('meta.disconnected', 'Disconnected from Facebook'));
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || t('meta.disconnectError', 'Failed to disconnect'));
      },
    }
  );

  // Select page mutation
  const selectMetaPageMutation = useMutation(
    (pageId) => apiService.selectMetaPage(currentCompanyId, pageId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['metaStatus', currentCompanyId]);
        toast.success(t('meta.pageSelected', 'Page selected successfully'));
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || t('meta.pageSelectError', 'Failed to select page'));
      },
    }
  );

  // Refresh Instagram mutation
  const refreshInstagramMutation = useMutation(
    () => apiService.refreshInstagram(currentCompanyId),
    {
      onSuccess: (result) => {
        if (result.success) {
          queryClient.invalidateQueries(['metaStatus', currentCompanyId]);
          toast.success(t('meta.instagramRefreshed', `Instagram @${result.instagramUsername} connected!`));
        } else {
          toast.error(result.message || t('meta.instagramNotFound', 'Instagram not found'));
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || t('meta.refreshError', 'Failed to refresh Instagram'));
      },
    }
  );

  return {
    // Status
    metaConnectionStatus,
    isLoadingMetaStatus,
    metaStatusError,
    metaAvailablePages,
    
    // Mutations
    connectMetaMutation,
    disconnectMetaMutation,
    selectMetaPageMutation,
    refreshInstagramMutation,
    
    // Query client for manual invalidation
    queryClient,
  };
};

export default useMetaIntegration;
