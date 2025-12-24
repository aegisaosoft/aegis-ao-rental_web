/*
 * ViolationsSection - Self-contained violations management section
 * All state, queries, mutations and handlers are inside this component
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Search, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Card, LoadingSpinner } from '../../components/common';
import { getStatesForCountry } from '../../utils/statesByCountry';
import { translatedApiService as apiService } from '../../services/translatedApi';
import { useViolationsQuery } from './hooks';

const ViolationsSection = ({
  currentCompanyId,
  isAuthenticated,
  companyConfig,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Check if company is in USA
  const isUSCompany = useMemo(() => {
    const country = (companyConfig?.country || '').toLowerCase();
    return country === 'united states' || country === 'usa' || country === 'us';
  }, [companyConfig?.country]);

  // ============== STATE ==============
  
  // Tab navigation
  const [activeViolationsTab, setActiveViolationsTab] = useState('list');
  
  // Finders state
  const [selectedStates, setSelectedStates] = useState(new Set());
  const [violationsFindingProgress, setViolationsFindingProgress] = useState(null);
  
  // Date filters
  const [violationsDateFrom, setViolationsDateFrom] = useState(() => {
    const today = new Date();
    today.setMonth(today.getMonth() - 1);
    return today.toISOString().split('T')[0];
  });
  const [violationsDateTo, setViolationsDateTo] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  // Pagination
  const [violationsPage, setViolationsPage] = useState(0);
  const [violationsPageSize, setViolationsPageSize] = useState(10);
  const [violationsSearchTrigger, setViolationsSearchTrigger] = useState(0);

  // Reset page when filters change
  useEffect(() => {
    setViolationsPage(0);
  }, [violationsDateFrom, violationsDateTo, violationsSearchTrigger]);

  // ============== QUERIES ==============

  // Fetch violations using custom hook
  const { data: violationsResponse, isLoading: isLoadingViolations, error: violationsError } = useViolationsQuery({
    companyId: currentCompanyId,
    enabled: isAuthenticated && activeViolationsTab === 'list' && isUSCompany,
    filters: {
      violationsDateFrom,
      violationsDateTo,
      violationsPage,
      violationsPageSize,
      searchTrigger: violationsSearchTrigger,
    },
    onError: () => {
      toast.error(t('admin.violationsLoadError', 'Failed to load violations'));
    },
  });

  // Load finders list configuration
  const { data: findersListData, isLoading: isLoadingFindersList } = useQuery(
    ['findersList', currentCompanyId],
    () => apiService.getFindersList({ companyId: currentCompanyId }),
    {
      enabled: isAuthenticated && !!currentCompanyId && isUSCompany,
      onError: (error) => {
        console.error('Error loading finders list:', error);
      },
    }
  );

  // Update selectedStates when findersListData changes
  useEffect(() => {
    if (findersListData) {
      const findersList = findersListData?.findersList || 
                         findersListData?.FindersList || 
                         findersListData?.data?.findersList ||
                         findersListData?.data?.FindersList ||
                         [];
      
      if (Array.isArray(findersList) && findersList.length > 0) {
        setSelectedStates(new Set(findersList));
      } else if (Array.isArray(findersList) && findersList.length === 0) {
        setSelectedStates(new Set());
      }
    }
  }, [findersListData]);

  // ============== MUTATIONS ==============

  // Mutation for finding violations
  const findViolationsMutation = useMutation(
    async ({ companyId, states, dateFrom, dateTo }) => {
      try {
        const response = await apiService.findViolations(companyId, states, dateFrom, dateTo);
        return { success: true, response, isAlreadyRunning: false };
      } catch (error) {
        const errorData = error.response?.data || error.data || {};
        const errorMessage = (errorData?.error || errorData?.message || '').toLowerCase();
        const statusCode = error.response?.status;
        const isAlreadyRunning = statusCode === 409 ||
                                errorMessage.includes('already in progress') ||
                                errorMessage.includes('collection is already') ||
                                errorMessage.includes('already running');
        
        if (isAlreadyRunning) {
          return { 
            success: true, 
            response: { 
              data: { 
                progress: errorData.progress || 0,
                status: errorData.status || 'processing',
                startedAt: errorData.startedAt
              } 
            }, 
            isAlreadyRunning: true 
          };
        }
        
        return { success: false, error: error.message || 'Unknown error', isAlreadyRunning: false };
      }
    },
    {
      onSuccess: (result) => {
        if (!result.success) {
          toast.error(t('admin.findViolationsError', 'Failed to start violations finding. Please try again.'));
          return;
        }
        
        const progress = result.response?.data?.progress || 0;
        const status = result.response?.data?.status || '';
        const isProcessing = result.isAlreadyRunning || progress > 0 || (status && status.toLowerCase() !== 'completed' && status.toLowerCase() !== 'error');
        
        setViolationsFindingProgress({ 
          progress: Math.min(100, Math.max(0, progress)), 
          status: isProcessing ? 'processing' : 'pending' 
        });
        
        if (result.isAlreadyRunning) {
          toast.info(t('admin.violationsFindingAlreadyRunning', 'Violations finding is already in progress.'));
        } else {
          toast.info(t('admin.violationsFindingStarted', 'Violations finding started in background.'));
        }
      },
    }
  );

  // Mutation for saving finders list
  const saveFindersListMutation = useMutation(
    async (stateCodes) => {
      return await apiService.saveFindersList({
        companyId: currentCompanyId,
        findersList: stateCodes,
      });
    },
    {
      onSuccess: () => {
        queryClient.setQueryData(['findersList', currentCompanyId], (oldData) => ({
          ...oldData,
          findersList: Array.from(selectedStates),
        }));
      },
      onError: (error) => {
        console.error('Error saving finders list:', error);
        toast.error(t('admin.findersListSaveError', 'Failed to save finders list'));
      },
    }
  );

  // ============== EFFECTS ==============

  // Check for active collection on mount
  useEffect(() => {
    if (!currentCompanyId || !isUSCompany || violationsFindingProgress) return;

    const checkActiveCollection = async () => {
      try {
        const response = await apiService.getViolationsProgress(currentCompanyId);
        const progressData = response?.data || response;
        
        const progress = progressData?.progress ?? progressData?.Progress ?? 0;
        const status = progressData?.status ?? progressData?.Status ?? '';
        
        const isComplete = status?.toLowerCase() === 'completed' || progress >= 100;
        const isError = status?.toLowerCase() === 'error' || status?.toLowerCase() === 'failed';
        
        if ((progress > 0 || status) && !isComplete && !isError) {
          setViolationsFindingProgress({
            progress: Math.min(100, Math.max(0, progress)),
            status: 'processing',
          });
        }
      } catch (error) {
        const isTimeout = error.code === 'ECONNABORTED' || error.response?.status === 408;
        const isConflict = error.response?.status === 409;
        
        if (isTimeout || isConflict) {
          setViolationsFindingProgress({ progress: 0, status: 'pending' });
        }
      }
    };
    
    checkActiveCollection();
  }, [currentCompanyId, isUSCompany, violationsFindingProgress]);

  // Poll for progress
  useEffect(() => {
    if (!currentCompanyId || !isUSCompany) return;

    let intervalId;
    let isMounted = true;
    let consecutiveErrors = 0;
    let consecutiveNoData = 0;
    const MAX_CONSECUTIVE_ERRORS = 5;
    const MAX_CONSECUTIVE_NO_DATA = 3;

    const pollProgress = async () => {
      if (!isMounted) return;

      try {
        const response = await apiService.getViolationsProgress(currentCompanyId);
        consecutiveErrors = 0;
        
        const progressData = response?.data;
        const progress = progressData?.progress ?? progressData?.Progress ?? 0;
        const status = progressData?.status ?? progressData?.Status ?? 'processing';
        const isComplete = status?.toLowerCase() === 'completed' || progress >= 100;
        const isError = status?.toLowerCase() === 'error' || status?.toLowerCase() === 'failed';

        if (isMounted) {
          const hasProgressData = progress > 0 || status;
          
          if (hasProgressData) {
            consecutiveNoData = 0;
            setViolationsFindingProgress({
              progress: Math.min(100, Math.max(0, progress)),
              status: isComplete ? 'completed' : isError ? 'error' : 'processing',
            });
            
            if (isComplete) {
              if (intervalId) clearInterval(intervalId);
              queryClient.invalidateQueries(['violations', currentCompanyId]);
              toast.success(t('admin.violationsFindingCompleted', 'Violations finding completed!'));
              setTimeout(() => setViolationsFindingProgress(null), 3000);
            } else if (isError) {
              if (intervalId) clearInterval(intervalId);
              toast.error(t('admin.violationsFindingFailed', 'Violations finding failed.'));
              setTimeout(() => setViolationsFindingProgress(null), 3000);
            }
          } else {
            consecutiveNoData++;
            if (consecutiveNoData >= MAX_CONSECUTIVE_NO_DATA) {
              if (intervalId) clearInterval(intervalId);
              setViolationsFindingProgress(null);
            }
          }
        }
      } catch (error) {
        const isTimeout = error.code === 'ECONNABORTED' || error.response?.status === 408;
        if (!isTimeout) {
          consecutiveErrors++;
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            if (intervalId) clearInterval(intervalId);
            setViolationsFindingProgress(null);
          }
        }
      }
    };

    if (violationsFindingProgress && violationsFindingProgress.status !== 'completed' && violationsFindingProgress.status !== 'error') {
      intervalId = setInterval(pollProgress, 5000);
      pollProgress();
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentCompanyId, isUSCompany, violationsFindingProgress?.status, t, queryClient]);

  // ============== DATA PROCESSING ==============

  const violationsData = useMemo(() => {
    let data = violationsResponse;
    if (data?.data) data = data.data;
    if (data?.result) data = data.result;
    if (data?.Items || data?.items || data?.data) {
      return Array.isArray(data.Items || data.items || data.data) ? (data.Items || data.items || data.data) : [];
    }
    return Array.isArray(data) ? data : [];
  }, [violationsResponse]);

  const violationsTotalCount = useMemo(() => {
    let data = violationsResponse;
    if (data?.data) data = data.data;
    if (data?.result) data = data.result;
    return data?.TotalCount || data?.totalCount || data?.total || data?.Total || 0;
  }, [violationsResponse]);

  // Format price helper
  const formatPrice = useCallback((amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  }, []);

  // ============== TABLE ==============

  const violationsColumns = useMemo(() => [
    {
      id: 'violationNumber',
      header: t('admin.violationNumber', 'Violation #'),
      accessorFn: row => row.violationNumber || row.ViolationNumber || 
                         row.citationNumber || row.CitationNumber || 
                         row.noticeNumber || row.NoticeNumber || '-',
      cell: ({ row }) => {
        const violationNumber = row.original.violationNumber || row.original.ViolationNumber || 
                                row.original.citationNumber || row.original.CitationNumber || 
                                row.original.noticeNumber || row.original.NoticeNumber || '-';
        const link = row.original.link || row.original.Link;
        
        const handleClick = async (e) => {
          e.preventDefault();
          try {
            await navigator.clipboard.writeText(violationNumber);
          } catch (err) {
            console.error('Failed to copy:', err);
          }
          if (link) {
            let finalLink = link;
            if (link.includes('{DatasetId}') && violationNumber !== '-') {
              finalLink = link.replace(/{DatasetId}/g, violationNumber);
            }
            window.open(finalLink, '_blank', 'noopener,noreferrer');
          }
        };
        
        if (violationNumber && violationNumber !== '-') {
          return (
            <button
              type="button"
              onClick={handleClick}
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
              title={link ? t('admin.clickToCopyAndOpen', 'Click to copy and open link') : t('admin.clickToCopy', 'Click to copy')}
            >
              {violationNumber}
            </button>
          );
        }
        return <span className="text-gray-400">-</span>;
      },
    },
    {
      id: 'date',
      header: t('admin.date', 'Date'),
      accessorFn: row => {
        const date = row.violationDate || row.ViolationDate || 
                     row.issueDate || row.IssueDate || 
                     row.createdAt || row.CreatedAt;
        if (!date) return '-';
        try {
          return new Date(date).toLocaleDateString();
        } catch {
          return date;
        }
      },
      cell: info => info.getValue(),
    },
    {
      id: 'licensePlate',
      header: t('admin.licensePlate', 'License Plate'),
      accessorFn: row => {
        const tag = row.tag || row.Tag || '';
        const state = row.state || row.State || '';
        if (tag && state) return `${tag} ${state}`;
        return tag || state || '-';
      },
      cell: info => {
        const value = info.getValue();
        return value !== '-' ? (
          <span className="font-mono text-sm">{value}</span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      id: 'description',
      header: t('admin.description', 'Description'),
      accessorFn: row => row.description || row.Description || row.note || row.Note || '-',
      cell: info => {
        const value = info.getValue();
        return value !== '-' && value.length > 50 ? `${value.substring(0, 50)}...` : value;
      },
    },
    {
      id: 'amount',
      header: t('admin.amount', 'Amount'),
      accessorFn: row => row.amount || row.Amount || 0,
      cell: ({ row }) => formatPrice(row.original.amount || row.original.Amount || 0),
    },
    {
      id: 'status',
      header: t('admin.status', 'Status'),
      accessorFn: row => {
        if (row.status || row.Status) return (row.status || row.Status).toLowerCase();
        const paymentStatus = row.paymentStatus ?? row.PaymentStatus ?? 0;
        const statusMap = { 0: 'pending', 1: 'paid', 2: 'overdue', 3: 'cancelled' };
        return statusMap[paymentStatus] || 'pending';
      },
      cell: ({ row }) => {
        const status = (row.original.status || row.original.Status || 'pending').toLowerCase();
        const statusColors = {
          paid: 'bg-green-100 text-green-800',
          pending: 'bg-yellow-100 text-yellow-800',
          overdue: 'bg-red-100 text-red-800',
          cancelled: 'bg-gray-100 text-gray-800',
        };
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.pending}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
    },
  ], [t, formatPrice]);

  const violationsTable = useReactTable({
    data: violationsData,
    columns: violationsColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(violationsTotalCount / violationsPageSize),
    state: {
      pagination: {
        pageIndex: violationsPage,
        pageSize: violationsPageSize,
      },
    },
    onPaginationChange: (updater) => {
      const newState = typeof updater === 'function' 
        ? updater({ pageIndex: violationsPage, pageSize: violationsPageSize })
        : updater;
      setViolationsPage(newState.pageIndex);
      setViolationsPageSize(newState.pageSize);
    },
  });

  // ============== HANDLERS ==============

  const handleFindViolations = () => {
    if (!currentCompanyId) return;
    
    const states = Array.from(selectedStates);
    if (states.length === 0) {
      toast.warning(t('admin.selectStatesFirst', 'Please select at least one state in the Finders tab first.'));
      return;
    }
    
    findViolationsMutation.mutate({
      companyId: currentCompanyId,
      states,
      dateFrom: violationsDateFrom,
      dateTo: violationsDateTo,
    });
  };

  const handleStateToggle = (stateCode) => {
    setSelectedStates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stateCode)) {
        newSet.delete(stateCode);
      } else {
        newSet.add(stateCode);
      }
      return newSet;
    });
  };

  const handleSaveFinders = () => {
    const stateCodes = Array.from(selectedStates);
    saveFindersListMutation.mutate(stateCodes);
    toast.success(t('admin.findersListSaved', 'Finders list saved successfully!'));
  };

  // Get US states for finders tab
  const usStates = useMemo(() => getStatesForCountry('United States'), []);

  // ============== RENDER ==============

  if (!isUSCompany) {
    return (
      <Card title={t('admin.violations', 'Violations')}>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">
            {t('admin.violationsUSOnly', 'Violations tracking is only available for US-based companies.')}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title={t('admin.violations', 'Violations')}>
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveViolationsTab('list')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeViolationsTab === 'list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('admin.violationsList', 'Violations List')}
            </button>
            <button
              type="button"
              onClick={() => setActiveViolationsTab('finders')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeViolationsTab === 'finders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('admin.violationsFinders', 'Finders Configuration')}
            </button>
          </nav>
        </div>

        {/* List Tab */}
        {activeViolationsTab === 'list' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.dateFrom', 'Date From')}
                </label>
                <input
                  type="date"
                  value={violationsDateFrom}
                  onChange={(e) => setViolationsDateFrom(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.dateTo', 'Date To')}
                </label>
                <input
                  type="date"
                  value={violationsDateTo}
                  onChange={(e) => setViolationsDateTo(e.target.value)}
                  className="input-field"
                />
              </div>
              <button
                type="button"
                onClick={() => setViolationsSearchTrigger(prev => prev + 1)}
                className="btn-primary flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                {t('admin.search', 'Search')}
              </button>
              <button
                type="button"
                onClick={handleFindViolations}
                disabled={findViolationsMutation.isLoading || violationsFindingProgress?.status === 'processing'}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${findViolationsMutation.isLoading ? 'animate-spin' : ''}`} />
                {t('admin.findViolations', 'Find Violations')}
              </button>
            </div>

            {/* Progress Bar */}
            {violationsFindingProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">
                    {violationsFindingProgress.status === 'completed' 
                      ? t('admin.findingComplete', 'Finding complete!')
                      : violationsFindingProgress.status === 'error'
                      ? t('admin.findingError', 'Finding failed')
                      : t('admin.findingInProgress', 'Finding violations...')}
                  </span>
                  <span className="text-sm text-blue-600">{violationsFindingProgress.progress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      violationsFindingProgress.status === 'completed' ? 'bg-green-500' :
                      violationsFindingProgress.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${violationsFindingProgress.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Table */}
            {isLoadingViolations ? (
              <LoadingSpinner />
            ) : violationsError ? (
              <div className="text-center py-8 text-red-600">
                {t('admin.violationsLoadError', 'Failed to load violations')}
              </div>
            ) : violationsData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('admin.noViolations', 'No violations found for the selected period.')}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      {violationsTable.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <th
                              key={header.id}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {violationsTable.getRowModel().rows.map(row => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-700">
                    {t('admin.showing')} {violationsPage * violationsPageSize + 1} - {Math.min((violationsPage + 1) * violationsPageSize, violationsTotalCount)} {t('admin.of')} {violationsTotalCount}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => violationsTable.previousPage()}
                      disabled={!violationsTable.getCanPreviousPage()}
                      className="btn-secondary text-sm"
                    >
                      {t('common.previous', 'Previous')}
                    </button>
                    <button
                      onClick={() => violationsTable.nextPage()}
                      disabled={!violationsTable.getCanNextPage()}
                      className="btn-secondary text-sm"
                    >
                      {t('common.next', 'Next')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Finders Tab */}
        {activeViolationsTab === 'finders' && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-700">
                {t('admin.findersDescription', 'Select the states where your vehicles may have violations. The system will automatically search for violations from these states.')}
              </p>
            </div>

            {isLoadingFindersList ? (
              <LoadingSpinner />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {usStates.map(state => (
                    <label
                      key={state.code}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedStates.has(state.code)
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStates.has(state.code)}
                        onChange={() => handleStateToggle(state.code)}
                        className="sr-only"
                      />
                      <span className="font-medium">{state.code}</span>
                      <span className="ml-2 text-sm text-gray-500 truncate">{state.name}</span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveFinders}
                    disabled={saveFindersListMutation.isLoading}
                    className="btn-primary"
                  >
                    {saveFindersListMutation.isLoading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ViolationsSection;
