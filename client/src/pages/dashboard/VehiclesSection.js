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
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, LoadingSpinner } from '../../components/common';
import { translateCategory } from '../../i18n/translateHelpers';
import { toast } from 'react-toastify';

const VehiclesSection = ({
  t,
  // Data
  vehicleCount,
  availableCount,
  isLoadingModels,
  modelsGrouped,
  // Expand state
  expandedCategories,
  setExpandedCategories,
  expandedMakes,
  setExpandedMakes,
  // Rate editing
  dailyRateInputs,
  setDailyRateInputs,
  isUpdatingRate,
  setIsUpdatingRate,
  // Utilities
  formatRate,
  // Services
  apiService,
  queryClient,
  currentCompanyId,
}) => {
  const handleBulkUpdateRate = async (params, inputKey) => {
    const rate = dailyRateInputs[inputKey];
    if (!rate) {
      toast.error('Please enter a daily rate');
      return;
    }
    setIsUpdatingRate(true);
    try {
      await apiService.bulkUpdateModelDailyRate({
        dailyRate: parseFloat(rate),
        companyId: currentCompanyId,
        ...params
      });
      queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
      setDailyRateInputs(prev => ({ ...prev, [inputKey]: '' }));
    } catch (error) {
      console.error('Error updating models:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update models';
      toast.error(errorMessage);
    } finally {
      setIsUpdatingRate(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card title={t('vehicles.title')} headerActions={
        <span className="text-sm font-normal text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          {vehicleCount} / {availableCount}
        </span>
      }>
        {isLoadingModels ? (
          <div className="text-center py-12">
            <LoadingSpinner />
            <p className="mt-4 text-gray-600">{t('home.loadingModels')}</p>
          </div>
        ) : !modelsGrouped || modelsGrouped.length === 0 ? (
          <p className="text-gray-500 text-center py-4">{t('vehicles.noVehicles')}</p>
        ) : (
          <div className="space-y-2">
            {modelsGrouped.map((categoryGroup) => {
              const categoryId = categoryGroup.categoryId || categoryGroup.category_id;
              const categoryName = categoryGroup.categoryName || categoryGroup.category_name || 'Uncategorized';
              const isCategoryExpanded = expandedCategories[categoryId];
              
              // Group models by make first, then by modelName
              const makeGroups = {};
              (categoryGroup.models || categoryGroup.Models || []).forEach(model => {
                const make = (model.make || model.Make || '').toString().toUpperCase().trim();
                const modelName = (model.modelName || model.model_name || model.ModelName || '').toString().toUpperCase().trim();
                
                if (!makeGroups[make]) {
                  makeGroups[make] = { make, models: {} };
                }
                
                if (!makeGroups[make].models[modelName]) {
                  makeGroups[make].models[modelName] = { modelName, models: [] };
                }
                
                makeGroups[make].models[modelName].models.push(model);
              });
              
              // Sort years descending
              Object.values(makeGroups).forEach(makeGroup => {
                Object.values(makeGroup.models).forEach(modelGroup => {
                  modelGroup.models.sort((a, b) => (b.year || 0) - (a.year || 0));
                });
              });
              
              // Calculate rates for category
              const allModelsInCategory = (categoryGroup.models || []);
              const categoryRates = allModelsInCategory
                .map(m => m.dailyRate)
                .filter(r => r != null && r !== undefined && r !== '');
              const isCategoryUniform = categoryRates.length > 0 && 
                categoryRates.every(r => r === categoryRates[0]);
              const categoryDisplayRate = isCategoryUniform ? categoryRates[0] : 'different';
              
              return (
                <div key={categoryId} className="border border-gray-200 rounded-lg">
                  {/* Category Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <button
                      onClick={() => setExpandedCategories(prev => ({
                        ...prev,
                        [categoryId]: !prev[categoryId]
                      }))}
                      className="flex items-center flex-1"
                    >
                      <div className="flex items-center">
                        {isCategoryExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-600 mr-2" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-600 mr-2" />
                        )}
                        <h3 className="text-lg font-semibold text-gray-900">
                          {translateCategory(t, categoryName)}
                        </h3>
                      </div>
                      <span className="text-sm text-gray-600 ml-2">
                        {Object.keys(makeGroups).length} {Object.keys(makeGroups).length === 1 ? 'make' : 'makes'}
                      </span>
                    </button>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm font-medium text-gray-700 min-w-[80px] text-right">
                        {categoryDisplayRate !== 'different' ? formatRate(categoryDisplayRate) : categoryDisplayRate}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Daily Rate"
                        value={dailyRateInputs[`category_${categoryId}`] || ''}
                        onChange={(e) => setDailyRateInputs(prev => ({
                          ...prev,
                          [`category_${categoryId}`]: e.target.value
                        }))}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isUpdatingRate}
                      />
                      <button
                        onClick={() => handleBulkUpdateRate({ categoryId }, `category_${categoryId}`)}
                        disabled={isUpdatingRate || !categoryId}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                  
                  {/* Category Content */}
                  {isCategoryExpanded && (
                    <div className="p-4 space-y-2">
                      {Object.entries(makeGroups).map(([make, makeGroup]) => {
                        const makeExpandedKey = `${categoryId}_${make}`;
                        const isMakeExpanded = expandedMakes[makeExpandedKey];
                        
                        const allMakeModels = Object.values(makeGroup.models).flatMap(mg => mg.models);
                        const makeRates = allMakeModels.map(m => m.dailyRate).filter(r => r != null && r !== undefined && r !== '');
                        const isMakeUniform = makeRates.length > 0 && makeRates.every(r => r === makeRates[0]);
                        const makeDisplayRate = isMakeUniform ? makeRates[0] : 'different';
                        const totalModels = Object.keys(makeGroup.models).length;
                        
                        return (
                          <div key={make} className="border border-gray-200 rounded-lg">
                            {/* Make Header */}
                            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors">
                              <button
                                onClick={() => setExpandedMakes(prev => ({
                                  ...prev,
                                  [makeExpandedKey]: !prev[makeExpandedKey]
                                }))}
                                className="flex items-center flex-1"
                              >
                                <div className="flex items-center">
                                  {isMakeExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-gray-600 mr-2" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-600 mr-2" />
                                  )}
                                  <span className="font-medium text-gray-800">{make}</span>
                                </div>
                                <span className="text-sm text-gray-600 ml-2">
                                  {totalModels} {totalModels === 1 ? 'model' : 'models'}
                                </span>
                              </button>
                              <div className="flex items-center gap-2 ml-4">
                                <span className="text-sm font-medium text-gray-700 min-w-[60px] text-right">
                                  {makeDisplayRate !== 'different' ? formatRate(makeDisplayRate) : makeDisplayRate}
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Daily Rate"
                                  value={dailyRateInputs[`make_${makeExpandedKey}`] || ''}
                                  onChange={(e) => setDailyRateInputs(prev => ({
                                    ...prev,
                                    [`make_${makeExpandedKey}`]: e.target.value
                                  }))}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                  disabled={isUpdatingRate}
                                />
                                <button
                                  onClick={() => handleBulkUpdateRate({ categoryId, make: makeGroup.make }, `make_${makeExpandedKey}`)}
                                  disabled={isUpdatingRate}
                                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400"
                                >
                                  Update
                                </button>
                              </div>
                            </div>
                            
                            {/* Make Content */}
                            {isMakeExpanded && (
                              <div className="p-4 space-y-2">
                                {Object.entries(makeGroup.models).map(([modelName, modelGroup]) => {
                                  const modelExpandedKey = `${makeExpandedKey}_${modelName}`;
                                  
                                  const modelRates = modelGroup.models.map(m => m.dailyRate).filter(r => r != null && r !== undefined && r !== '');
                                  const isModelUniform = modelRates.length > 0 && modelRates.every(r => r === modelRates[0]);
                                  const modelDisplayRate = isModelUniform ? modelRates[0] : 'different';
                                  
                                  return (
                                    <div key={modelName} className="border border-gray-200 rounded-lg">
                                      {/* Model Header */}
                                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                                        <span className="font-medium text-gray-800">{modelGroup.modelName}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-gray-700 min-w-[60px] text-right">
                                            {modelDisplayRate !== 'different' ? formatRate(modelDisplayRate) : modelDisplayRate}
                                          </span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            placeholder="Daily Rate"
                                            value={dailyRateInputs[`model_${modelExpandedKey}`] || ''}
                                            onChange={(e) => setDailyRateInputs(prev => ({
                                              ...prev,
                                              [`model_${modelExpandedKey}`]: e.target.value
                                            }))}
                                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                            disabled={isUpdatingRate}
                                          />
                                          <button
                                            onClick={() => handleBulkUpdateRate(
                                              { categoryId, make: makeGroup.make, modelName: modelGroup.modelName },
                                              `model_${modelExpandedKey}`
                                            )}
                                            disabled={isUpdatingRate}
                                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400"
                                          >
                                            Update
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {/* Years */}
                                      <div className="p-4">
                                        <div className="flex flex-wrap gap-2">
                                          {modelGroup.models.map(model => {
                                            const year = model.year || 0;
                                            const yearRate = model.dailyRate;
                                            const vehicleCount = model.vehicleCount || 0;
                                            return (
                                              <div key={model.id || year} className="flex items-center gap-1">
                                                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                                                  {year} ({vehicleCount})
                                                </span>
                                                <span className="text-xs font-medium text-gray-600 min-w-[45px]">
                                                  {yearRate != null && yearRate !== '' ? formatRate(yearRate, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                                </span>
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  placeholder="Rate"
                                                  value={dailyRateInputs[`year_${year}_${modelExpandedKey}`] || ''}
                                                  onChange={(e) => setDailyRateInputs(prev => ({
                                                    ...prev,
                                                    [`year_${year}_${modelExpandedKey}`]: e.target.value
                                                  }))}
                                                  className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs"
                                                  disabled={isUpdatingRate}
                                                />
                                                <button
                                                  onClick={() => handleBulkUpdateRate(
                                                    { categoryId, make: makeGroup.make, modelName: modelGroup.modelName, year },
                                                    `year_${year}_${modelExpandedKey}`
                                                  )}
                                                  disabled={isUpdatingRate}
                                                  className="px-1 py-0.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400"
                                                >
                                                  ✓
                                                </button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default VehiclesSection;
