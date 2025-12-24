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
import { Search, AlertTriangle, RefreshCw } from 'lucide-react';
import { flexRender } from '@tanstack/react-table';
import { Card, LoadingSpinner } from '../../components/common';
import { getStatesForCountry } from '../../utils/statesByCountry';
import { toast } from 'react-toastify';

const ViolationsSection = ({
  t,
  // Tab state
  activeViolationsTab,
  setActiveViolationsTab,
  // List tab - filters
  violationsDateFrom,
  setViolationsDateFrom,
  violationsDateTo,
  setViolationsDateTo,
  setViolationsSearchTrigger,
  // List tab - data
  isLoadingViolations,
  violationsError,
  violationsData,
  violationsTable,
  violationsPageSize,
  violationsTotalCount,
  // Find violations
  findViolationsMutation,
  violationsFindingProgress,
  setViolationsFindingProgress,
  currentCompanyId,
  findersListData,
  selectedStates,
  apiService,
  // Finders tab
  companyConfig,
  isLoadingFindersList,
  setSelectedStates,
  saveFindersListMutation,
}) => {
  return (
    <div className="space-y-6">
      <Card title={t('admin.violations', 'Violations')}>
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveViolationsTab('list')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeViolationsTab === 'list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {t('admin.violationsList', 'Violations List')}
            </button>
            <button
              type="button"
              onClick={() => setActiveViolationsTab('finders')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeViolationsTab === 'finders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {t('admin.configureFinders', 'Configure Finders')}
            </button>
            <button
              type="button"
              onClick={() => setActiveViolationsTab('payment')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeViolationsTab === 'payment'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {t('admin.payment', 'Payment')}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeViolationsTab === 'list' && (
          <div className="py-6">
            {/* Date Filters and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
                <input
                  type="date"
                  className="input-field border border-gray-300"
                  value={violationsDateFrom}
                  onChange={(e) => setViolationsDateFrom(e.target.value)}
                />
                <input
                  type="date"
                  className="input-field border border-gray-300"
                  value={violationsDateTo}
                  onChange={(e) => setViolationsDateTo(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn-primary px-6"
                onClick={() => setViolationsSearchTrigger(prev => prev + 1)}
                disabled={isLoadingViolations}
              >
                {isLoadingViolations ? (
                  <>
                    <span className="animate-spin inline-block mr-2">⟳</span>
                    {t('common.loading', 'Loading...')}
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 inline-block mr-2" />
                    {t('common.search', 'Search')}
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn-primary px-6 bg-blue-600 hover:bg-blue-700"
                onClick={async () => {
                  if (!currentCompanyId) {
                    toast.error(t('admin.companyIdRequired', 'Company ID is required'));
                    return;
                  }
                  
                  const findersList = findersListData?.findersList || findersListData?.FindersList || [];
                  const states = Array.isArray(findersList) && findersList.length > 0 
                    ? findersList 
                    : Array.from(selectedStates);
                  
                  if (!states || states.length === 0) {
                    toast.warning(t('admin.noStatesSelected', 'Please configure states in Configure Finders tab first'));
                    return;
                  }
                  
                  const dateFrom = violationsDateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  const dateTo = violationsDateTo || new Date().toISOString().split('T')[0];
                  
                  findViolationsMutation.mutate({
                    companyId: currentCompanyId,
                    states,
                    dateFrom,
                    dateTo,
                  });
                }}
                disabled={findViolationsMutation.isLoading || !currentCompanyId || (violationsFindingProgress && violationsFindingProgress.status !== 'completed' && violationsFindingProgress.status !== 'error')}
              >
                {findViolationsMutation.isLoading ? (
                  <>
                    <span className="animate-spin inline-block mr-2">⟳</span>
                    {t('common.loading', 'Loading...')}
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 inline-block mr-2" />
                    {t('admin.findViolations', 'Find Violations')}
                  </>
                )}
              </button>
            </div>

            {/* Progress Bar for Finding Violations */}
            {violationsFindingProgress && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">
                    {violationsFindingProgress.status === 'completed' 
                      ? t('admin.violationsFindingCompleted', 'Finding violations completed')
                      : violationsFindingProgress.status === 'error'
                      ? t('admin.violationsFindingError', 'Finding violations failed')
                      : violationsFindingProgress.status === 'uncertain'
                      ? t('admin.violationsFindingUncertain', 'Finding violations in progress (status unknown)')
                      : violationsFindingProgress.status === 'pending'
                      ? t('admin.violationsFindingInProgress', 'Finding violations in progress...')
                      : t('admin.violationsFindingInProgress', 'Finding violations in progress...')}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-blue-700">
                      {violationsFindingProgress.status === 'uncertain' 
                        ? '...' 
                        : `${Math.round(violationsFindingProgress.progress)}%`}
                    </span>
                    {violationsFindingProgress && violationsFindingProgress.status !== 'completed' && violationsFindingProgress.status !== 'error' && currentCompanyId && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!currentCompanyId) {
                            toast.error(t('admin.companyIdRequired', 'Company ID is required'));
                            return;
                          }
                          try {
                            const response = await apiService.getViolationsProgress(currentCompanyId);
                            const progressData = response?.data;
                            const progress = progressData?.progress ?? progressData?.Progress ?? progressData?.ProgressPercentage ?? 0;
                            const status = progressData?.status ?? progressData?.Status ?? progressData?.state ?? 'processing';
                            const isComplete = status?.toLowerCase() === 'completed' || status?.toLowerCase() === 'complete' || progress >= 100;
                            const isError = status?.toLowerCase() === 'error' || status?.toLowerCase() === 'failed' || status?.toLowerCase() === 'failure';
                            
                            setViolationsFindingProgress(prev => ({
                              ...prev,
                              progress: Math.min(100, Math.max(0, progress)),
                              status: isComplete ? 'completed' : isError ? 'error' : 'processing',
                            }));
                            
                            if (isComplete) {
                              setViolationsSearchTrigger(prev => prev + 1);
                            }
                          } catch (error) {
                            console.error('Error checking progress:', error);
                            toast.error(t('admin.progressCheckError', 'Failed to check progress. Please try again.'));
                          }
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-1"
                        title={t('admin.checkProgress', 'Check Progress')}
                      >
                        <RefreshCw className="h-3 w-3" />
                        {t('admin.checkProgress', 'Check')}
                      </button>
                    )}
                  </div>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      violationsFindingProgress.status === 'completed'
                        ? 'bg-green-500'
                        : violationsFindingProgress.status === 'error'
                        ? 'bg-red-500'
                        : violationsFindingProgress.status === 'uncertain'
                        ? 'bg-yellow-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ 
                      width: violationsFindingProgress.status === 'uncertain' 
                        ? '100%' 
                        : violationsFindingProgress.status === 'pending'
                        ? '0%'
                        : `${Math.min(100, Math.max(0, violationsFindingProgress.progress))}%` 
                    }}
                  ></div>
                </div>
                {violationsFindingProgress.status === 'processing' && (
                  <p className="text-xs text-blue-600 mt-2">
                    {t('admin.violationsFindingPleaseWait', 'Please wait while we search for violations in the background...')}
                  </p>
                )}
                {violationsFindingProgress.status === 'uncertain' && (
                  <p className="text-xs text-yellow-600 mt-2">
                    {t('admin.violationsFindingUncertainMessage', 'Progress check unavailable. The search may still be running in the background.')}
                  </p>
                )}
              </div>
            )}

            {/* Violations Table */}
            {isLoadingViolations ? (
              <div className="text-center py-12">
                <LoadingSpinner />
                <p className="mt-4 text-gray-600">{t('common.loading', 'Loading...')}</p>
              </div>
            ) : violationsError ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-600">{t('admin.violationsLoadError', 'Failed to load violations')}</p>
              </div>
            ) : violationsData.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">{t('admin.noViolations', 'No violations found for the selected period')}</p>
              </div>
            ) : (
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
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
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

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">
                      {t('common.showing', 'Showing')} {violationsTable.getState().pagination.pageIndex * violationsPageSize + 1} - {Math.min((violationsTable.getState().pagination.pageIndex + 1) * violationsPageSize, violationsTotalCount)} {t('common.of', 'of')} {violationsTotalCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => violationsTable.previousPage()}
                      disabled={!violationsTable.getCanPreviousPage()}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('common.previous', 'Previous')}
                    </button>
                    <span className="text-sm text-gray-700">
                      {t('common.page', 'Page')} {violationsTable.getState().pagination.pageIndex + 1} {t('common.of', 'of')} {violationsTable.getPageCount()}
                    </span>
                    <button
                      type="button"
                      onClick={() => violationsTable.nextPage()}
                      disabled={!violationsTable.getCanNextPage()}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('common.next', 'Next')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeViolationsTab === 'finders' && (() => {
          const companyCountry = companyConfig?.country || '';
          const states = getStatesForCountry(companyCountry);
          const allSelected = states.length > 0 && selectedStates.size === states.length;
          const someSelected = selectedStates.size > 0 && selectedStates.size < states.length;

          const handleStateToggle = (stateCode) => {
            setSelectedStates(prev => {
              const newSet = new Set(prev);
              if (newSet.has(stateCode)) {
                newSet.delete(stateCode);
              } else {
                newSet.add(stateCode);
              }
              
              if (currentCompanyId) {
                const stateCodesArray = Array.from(newSet);
                setTimeout(() => {
                  saveFindersListMutation.mutate(stateCodesArray);
                }, 0);
              }
              
              return newSet;
            });
          };

          const handleSelectAll = () => {
            const newSet = allSelected 
              ? new Set() 
              : new Set(states.map(s => s.code));
            
            setSelectedStates(newSet);
            
            if (currentCompanyId) {
              const stateCodesArray = Array.from(newSet);
              setTimeout(() => {
                saveFindersListMutation.mutate(stateCodesArray);
              }, 0);
            }
          };

          return (
            <div className="py-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('admin.configureFinders', 'Configure Finders')}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t('admin.selectStatesForFinders', 'Select the states where violation finders should be active for {{country}}.', { country: companyCountry || 'your country' })}
                </p>
                
                {isLoadingFindersList ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="md" text={t('common.loading', 'Loading...')} />
                  </div>
                ) : states.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">
                      {companyCountry 
                        ? t('admin.noStatesForCountry', 'No states/provinces are defined for {{country}}. Please configure states in the system.', { country: companyCountry })
                        : t('admin.noCountryConfigured', 'No country is configured for this company. Please set a country in company settings.')}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:underline"
                        >
                          {allSelected 
                            ? t('admin.deselectAll', 'Deselect All')
                            : t('admin.selectAll', 'Select All')}
                        </button>
                        {someSelected && (
                          <span className="text-sm text-gray-500">
                            ({selectedStates.size} {t('admin.selected', 'selected')})
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedStates.size} / {states.length} {t('admin.selected', 'selected')}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {states.map((state) => {
                        const isChecked = selectedStates.has(state.code);
                        return (
                          <label
                            key={state.code}
                            className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-blue-50 border-blue-300 text-blue-900'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleStateToggle(state.code)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-sm font-medium flex-1">
                              {state.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({state.code})
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {saveFindersListMutation.isLoading && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <LoadingSpinner size="sm" />
                            <span>{t('admin.saving', 'Saving...')}</span>
                          </div>
                        )}
                        {saveFindersListMutation.isSuccess && !saveFindersListMutation.isLoading && (
                          <span className="text-sm text-green-600">
                            {t('admin.saved', 'Saved')}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={async () => {
                            setSelectedStates(new Set());
                            if (currentCompanyId) {
                              saveFindersListMutation.mutate([]);
                            }
                          }}
                          disabled={saveFindersListMutation.isLoading || isLoadingFindersList}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t('admin.clear', 'Clear')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {activeViolationsTab === 'payment' && (
          <div className="py-6">
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">{t('admin.paymentComingSoon', 'Payment configuration coming soon...')}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ViolationsSection;
