/*
 * VehicleManagementSection - Self-contained vehicle management
 * Includes filtering, import, field mapping modal, and vehicle table
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Upload, Plus, Search, X, ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Card, LoadingSpinner } from '../../components/common';
import { translatedApiService as apiService } from '../../services/translatedApi';
import { useVehicleFilters } from './hooks';

const VehicleManagementSection = ({
  currentCompanyId,
  isAuthenticated,
  isAdmin,
  isMainAdmin,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ============== FILTERS (from hook) ==============
  const {
    vehicleSearchTerm,
    vehicleMakeFilter,
    vehicleModelFilter,
    vehicleYearFilter,
    vehicleLicensePlateFilter,
    vehicleLocationFilter,
    vehiclePage,
    vehiclePageSize,
    setVehicleSearchTerm,
    setVehicleMakeFilter,
    setVehicleModelFilter,
    setVehicleYearFilter,
    setVehicleLicensePlateFilter,
    setVehicleLocationFilter,
    setVehiclePage,
    resetFilters,
  } = useVehicleFilters();

  // ============== LOCAL STATE ==============
  
  const [isImportingVehicles, setIsImportingVehicles] = useState(false);
  const [showFieldMappingModal, setShowFieldMappingModal] = useState(false);
  const [fieldMappingData, setFieldMappingData] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({});
  const [pendingImportFile, setPendingImportFile] = useState(null);

  // ============== QUERIES ==============

  // Fetch pickup locations for filter dropdown
  const { data: pickupLocationsData } = useQuery(
    ['pickupLocations', currentCompanyId],
    () => apiService.getPickupLocations(currentCompanyId),
    {
      enabled: isAuthenticated && !!currentCompanyId,
      onError: (error) => {
        console.error('Error loading pickup locations:', error);
      }
    }
  );

  const pickupLocations = useMemo(() => {
    return Array.isArray(pickupLocationsData) ? pickupLocationsData : [];
  }, [pickupLocationsData]);

  // Fetch models for filter dropdowns
  const { data: modelsGroupedData } = useQuery(
    ['modelsGroupedByCategory', currentCompanyId],
    () => apiService.getModelsGroupedByCategory(currentCompanyId),
    {
      enabled: isAuthenticated && !!currentCompanyId,
      refetchOnWindowFocus: false,
    }
  );

  const modelsGrouped = useMemo(() => {
    let allModels = modelsGroupedData;
    if (allModels?.data) allModels = allModels.data;
    if (allModels?.result) allModels = allModels.result;
    if (allModels?.models) allModels = allModels.models;
    if (allModels?.Models) allModels = allModels.Models;
    if (allModels && !Array.isArray(allModels)) {
      allModels = Object.values(allModels).find(v => Array.isArray(v)) || [];
    }
    return Array.isArray(allModels) ? allModels : [];
  }, [modelsGroupedData]);

  // Fetch vehicles list
  const { data: vehiclesListData, isLoading: isLoadingVehiclesList } = useQuery(
    ['vehicles', currentCompanyId, vehiclePage, vehiclePageSize, vehicleMakeFilter, vehicleModelFilter, vehicleYearFilter, vehicleLicensePlateFilter, vehicleLocationFilter],
    () => {
      const params = {
        companyId: currentCompanyId,
        page: vehiclePage + 1,
        pageSize: vehiclePageSize
      };
      
      if (vehicleMakeFilter) params.make = vehicleMakeFilter;
      if (vehicleModelFilter) params.model = vehicleModelFilter;
      if (vehicleYearFilter) params.year = vehicleYearFilter;
      if (vehicleLicensePlateFilter) params.licensePlate = vehicleLicensePlateFilter;
      if (vehicleLocationFilter) params.locationId = vehicleLocationFilter;
      
      return apiService.getVehicles(params);
    },
    {
      enabled: isAuthenticated && !!currentCompanyId,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  // ============== DATA PROCESSING ==============

  const vehiclesList = useMemo(() => {
    let data = vehiclesListData;
    if (data?.data) data = data.data;
    if (data?.result) data = data.result;
    const vehicles = data?.Vehicles || data?.vehicles || (Array.isArray(data) ? data : []);
    return Array.isArray(vehicles) ? vehicles : [];
  }, [vehiclesListData]);

  // Extract unique makes and models
  const { uniqueMakes, uniqueModels, makeModelMap } = useMemo(() => {
    const makes = new Set();
    const models = new Set();
    const makeToModels = new Map();
    
    // From modelsGrouped
    if (modelsGrouped && Array.isArray(modelsGrouped)) {
      modelsGrouped.forEach(categoryGroup => {
        if (categoryGroup.models && Array.isArray(categoryGroup.models)) {
          categoryGroup.models.forEach(model => {
            const make = model.make || model.Make;
            const modelName = model.modelName || model.ModelName || model.model || model.Model;
            
            if (make) {
              makes.add(make);
              if (!makeToModels.has(make)) makeToModels.set(make, new Set());
              if (modelName) makeToModels.get(make).add(modelName);
            }
            if (modelName) models.add(modelName);
          });
        }
      });
    }
    
    // From vehicles list
    if (vehiclesList && Array.isArray(vehiclesList)) {
      vehiclesList.forEach(vehicle => {
        const make = vehicle.Make || vehicle.make;
        const modelName = vehicle.Model || vehicle.model;
        
        if (make) {
          makes.add(make);
          if (!makeToModels.has(make)) makeToModels.set(make, new Set());
          if (modelName) makeToModels.get(make).add(modelName);
        }
        if (modelName) models.add(modelName);
      });
    }
    
    return {
      uniqueMakes: Array.from(makes).sort(),
      uniqueModels: Array.from(models).sort(),
      makeModelMap: makeToModels
    };
  }, [modelsGrouped, vehiclesList]);

  // Filter models based on selected make
  const filteredModels = useMemo(() => {
    if (!vehicleMakeFilter) return uniqueModels;
    const modelsForMake = makeModelMap.get(vehicleMakeFilter);
    return modelsForMake ? Array.from(modelsForMake).sort() : [];
  }, [vehicleMakeFilter, uniqueModels, makeModelMap]);

  // Reset page when filters change
  useEffect(() => {
    setVehiclePage(0);
  }, [vehicleMakeFilter, vehicleModelFilter, vehicleYearFilter, vehicleLicensePlateFilter, vehicleLocationFilter, setVehiclePage]);

  // Reset model filter when make changes
  useEffect(() => {
    if (vehicleMakeFilter) {
      setVehicleModelFilter('');
    }
  }, [vehicleMakeFilter, setVehicleModelFilter]);

  // Filter vehicles by search term
  const filteredVehiclesList = useMemo(() => {
    if (!vehicleSearchTerm.trim()) return vehiclesList;
    
    const searchLower = vehicleSearchTerm.toLowerCase().trim();
    
    return vehiclesList.filter(vehicle => {
      const licensePlate = (vehicle.LicensePlate || vehicle.licensePlate || '').toLowerCase();
      const make = (vehicle.Make || vehicle.make || '').toLowerCase();
      const model = (vehicle.Model || vehicle.model || '').toLowerCase();
      const color = (vehicle.Color || vehicle.color || '').toLowerCase();
      const status = (vehicle.Status || vehicle.status || '').toLowerCase();
      const year = String(vehicle.Year || vehicle.year || '').toLowerCase();
      
      const matchesIndividual = licensePlate.includes(searchLower) ||
                               make.includes(searchLower) ||
                               model.includes(searchLower) ||
                               color.includes(searchLower) ||
                               status.includes(searchLower) ||
                               year.includes(searchLower);
      
      const makeModel = `${make} ${model}`.toLowerCase();
      const modelMake = `${model} ${make}`.toLowerCase();
      const matchesCombined = makeModel.includes(searchLower) || modelMake.includes(searchLower);
      
      return matchesIndividual || matchesCombined;
    });
  }, [vehiclesList, vehicleSearchTerm]);

  const vehiclesTotalCount = filteredVehiclesList?.length || 0;

  // ============== IMPORT HANDLERS ==============

  const handleVehicleImportWithMapping = useCallback(async (mapping) => {
    if (!pendingImportFile) return;
    
    setIsImportingVehicles(true);
    setShowFieldMappingModal(false);
    
    try {
      const formData = new FormData();
      const mappingJson = JSON.stringify(mapping);
      formData.append('fieldMapping', mappingJson);
      formData.append('companyId', currentCompanyId || '');
      formData.append('file', pendingImportFile);
      
      const response = await apiService.importVehicles(formData);
      
      const responseData = response?.data || response;
      let result = responseData;
      if (responseData && typeof responseData === 'object') {
        if ('result' in responseData && responseData.result !== undefined) {
          result = responseData.result;
        } else if ('original' in responseData && responseData.original?.result) {
          result = responseData.original.result;
        }
      }
      
      const errors = Array.isArray(result?.errors) ? result.errors : [];
      const ignoredCount = Number(result?.ignoredCount ?? errors.length ?? 0);
      
      if (ignoredCount > 0 && errors.length > 0) {
        const failedCars = [];
        errors.forEach(error => {
          const licensePlateMatch = error.match(/license plate\s+([A-Z0-9]+)/i);
          const lineMatch = error.match(/Line\s+(\d+)/i);
          const licensePlate = licensePlateMatch ? licensePlateMatch[1] : null;
          const lineNumber = lineMatch ? lineMatch[1] : null;
          
          if (licensePlate) {
            failedCars.push({ licensePlate, lineNumber, error });
          } else if (lineNumber) {
            const missingMatch = error.match(/licenseplate:\s*([A-Z0-9]+)/i);
            if (missingMatch) {
              failedCars.push({ licensePlate: missingMatch[1], lineNumber, error });
            } else {
              failedCars.push({ licensePlate: `Line ${lineNumber}`, lineNumber, error });
            }
          } else {
            failedCars.push({ licensePlate: 'Unknown', lineNumber: null, error });
          }
        });
        
        if (failedCars.length > 0) {
          const licensePlates = failedCars
            .map(car => car.licensePlate)
            .filter((plate, index, self) => self.indexOf(plate) === index)
            .slice(0, 10);
          
          let errorSummary = `${ignoredCount} ${t('vehicles.carsNotLoaded', 'car(s) not loaded')}`;
          if (licensePlates.length > 0 && licensePlates.length <= 10) {
            errorSummary += `: ${licensePlates.join(', ')}`;
            if (failedCars.length > 10) {
              errorSummary += ` (+${failedCars.length - 10} more)`;
            }
          }
          
          toast.warning(errorSummary, { autoClose: 10000 });
          console.group('🚫 Failed to Load Vehicles');
          failedCars.forEach((car, index) => {
            console.log(`${index + 1}. ${car.licensePlate}${car.lineNumber ? ` (Line ${car.lineNumber})` : ''}: ${car.error}`);
          });
          console.groupEnd();
        }
      }
      
      queryClient.invalidateQueries(['vehicles', currentCompanyId]);
      queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
      
      setPendingImportFile(null);
      setFieldMapping({});
    } catch (error) {
      console.error('Error importing vehicles with mapping:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error?.message || 
                          error.message || 
                          t('vehicles.importError') || 
                          'Failed to import vehicles';
      toast.error(errorMessage);
    } finally {
      setIsImportingVehicles(false);
    }
  }, [pendingImportFile, currentCompanyId, queryClient, t]);

  const handleVehicleImport = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      toast.error(t('vehicles.invalidImportFile') || 'Invalid file type. Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      event.target.value = '';
      return;
    }

    if (file.size > 10_485_760) {
      toast.error(t('vehicles.fileTooLarge') || 'File size exceeds 10 MB limit');
      event.target.value = '';
      return;
    }

    setIsImportingVehicles(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', currentCompanyId || '');

      const response = await apiService.importVehicles(formData);
      
      const responseData = response?.data || response;
      let result = responseData;
      if (responseData && typeof responseData === 'object') {
        if ('result' in responseData && responseData.result !== undefined) {
          result = responseData.result;
        } else if ('original' in responseData && responseData.original?.result) {
          result = responseData.original.result;
        }
      }
      
      // Check if field mapping is required
      if (result?.requiresMapping === true) {
        setIsImportingVehicles(false);
        const headers = result.headers || [];
        const availableFields = result.availableFields || [];
        
        // Auto-map columns
        const autoMapping = {};
        headers.forEach((header, index) => {
          const headerLower = header.toLowerCase().trim();
          
          availableFields.forEach(field => {
            const fieldNameLower = field.field.toLowerCase();
            const fieldLabelLower = (field.label || '').toLowerCase();
            
            if (headerLower === fieldNameLower || 
                headerLower === fieldLabelLower ||
                headerLower.replace(/[_\s-]/g, '') === fieldNameLower.replace(/[_\s-]/g, '') ||
                headerLower.replace(/[_\s-]/g, '') === fieldLabelLower.replace(/[_\s-]/g, '')) {
              if (!autoMapping[field.field]) {
                autoMapping[field.field] = index;
              }
            }
          });
          
          // Special cases
          if (headerLower.includes('license') && headerLower.includes('plate')) {
            if (!autoMapping['license_plate']) autoMapping['license_plate'] = index;
          }
          if (headerLower.includes('seats') || headerLower.includes('seat')) {
            if (!autoMapping['number_of_seats']) autoMapping['number_of_seats'] = index;
          }
          if (headerLower.includes('fuel')) {
            if (!autoMapping['fuel_type']) autoMapping['fuel_type'] = index;
          }
        });
        
        setFieldMappingData({ headers, availableFields });
        setFieldMapping(autoMapping);
        setPendingImportFile(file);
        setShowFieldMappingModal(true);
        event.target.value = '';
        return;
      }
      
      const errors = Array.isArray(result?.errors) ? result.errors : [];
      const ignoredCount = Number(result?.ignoredCount ?? errors.length ?? 0);
      
      if (ignoredCount > 0 && errors.length > 0) {
        console.warn('Import errors:', errors);
        
        const failedCars = [];
        errors.forEach(error => {
          const licensePlateMatch = error.match(/license plate\s+([A-Z0-9]+)/i);
          const lineMatch = error.match(/Line\s+(\d+)/i);
          const licensePlate = licensePlateMatch ? licensePlateMatch[1] : null;
          const lineNumber = lineMatch ? lineMatch[1] : null;
          
          if (licensePlate) {
            failedCars.push({ licensePlate, lineNumber, error });
          } else if (lineNumber) {
            const missingMatch = error.match(/licenseplate:\s*([A-Z0-9]+)/i);
            if (missingMatch) {
              failedCars.push({ licensePlate: missingMatch[1], lineNumber, error });
            } else {
              failedCars.push({ licensePlate: `Line ${lineNumber}`, lineNumber, error });
            }
          } else {
            failedCars.push({ licensePlate: 'Unknown', lineNumber: null, error });
          }
        });
        
        if (failedCars.length > 0) {
          const licensePlates = failedCars
            .map(car => car.licensePlate)
            .filter((plate, index, self) => self.indexOf(plate) === index)
            .slice(0, 10);
          
          let errorSummary = `${ignoredCount} ${t('vehicles.carsNotLoaded', 'car(s) not loaded')}`;
          if (licensePlates.length > 0 && licensePlates.length <= 10) {
            errorSummary += `: ${licensePlates.join(', ')}`;
            if (failedCars.length > 10) {
              errorSummary += ` (+${failedCars.length - 10} more)`;
            }
          }
          
          toast.warning(errorSummary, { autoClose: 10000 });
          
          console.group('🚫 Failed to Load Vehicles');
          failedCars.forEach((car, index) => {
            console.log(`${index + 1}. ${car.licensePlate}${car.lineNumber ? ` (Line ${car.lineNumber})` : ''}: ${car.error}`);
          });
          console.groupEnd();
          
          if (failedCars.length <= 3) {
            failedCars.forEach((car, index) => {
              setTimeout(() => {
                const shortError = car.error.length > 80 ? car.error.substring(0, 80) + '...' : car.error;
                toast.warning(`${car.licensePlate}: ${shortError}`, { autoClose: 5000 });
              }, (index + 1) * 400);
            });
          } else {
            setTimeout(() => {
              toast.info(`${failedCars.length} ${t('vehicles.errorsDetails', 'error details')} in console (F12)`, { autoClose: 5000 });
            }, 1000);
          }
        } else {
          toast.warning(`${ignoredCount} ${t('vehicles.lineIgnored', 'line(s) ignored')} due to errors. Check console for details.`, { autoClose: 5000 });
        }
      }
      
      queryClient.invalidateQueries(['vehicles', currentCompanyId]);
      queryClient.invalidateQueries(['modelsGroupedByCategory', currentCompanyId]);
      
      event.target.value = '';
    } catch (error) {
      console.error('Error importing vehicles:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error?.message || 
                          error.message || 
                          t('vehicles.importError') || 
                          'Failed to import vehicles';
      toast.error(errorMessage);
    } finally {
      setIsImportingVehicles(false);
      event.target.value = '';
    }
  }, [currentCompanyId, queryClient, t]);

  // ============== TABLE ==============

  const vehicleColumns = useMemo(() => [
    {
      accessorKey: 'make',
      header: t('vehicles.make', 'Make'),
      cell: ({ row }) => row.original.make || row.original.Make || '-',
    },
    {
      accessorKey: 'model',
      header: t('vehicles.model', 'Model'),
      cell: ({ row }) => row.original.model || row.original.Model || '-',
    },
    {
      accessorKey: 'year',
      header: t('vehicles.year', 'Year'),
      cell: ({ row }) => row.original.year || row.original.Year || '-',
    },
    {
      accessorKey: 'licensePlate',
      header: t('vehicles.licensePlate', 'License Plate'),
      cell: ({ row }) => row.original.licensePlate || row.original.LicensePlate || '-',
    },
    {
      accessorKey: 'status',
      header: t('vehicles.status', 'Status'),
      cell: ({ row }) => {
        const status = row.original.status || row.original.Status || 'Unknown';
        const statusColors = {
          'Available': 'bg-green-100 text-green-800',
          'Rented': 'bg-blue-100 text-blue-800',
          'Maintenance': 'bg-yellow-100 text-yellow-800',
          'Unavailable': 'bg-red-100 text-red-800',
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
          </span>
        );
      },
    },
  ], [t]);

  const vehicleTable = useReactTable({
    data: filteredVehiclesList || [],
    columns: vehicleColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination: {
        pageIndex: vehiclePage,
        pageSize: vehiclePageSize,
      },
    },
    onPaginationChange: (updater) => {
      const newState = typeof updater === 'function' 
        ? updater({ pageIndex: vehiclePage, pageSize: vehiclePageSize })
        : updater;
      setVehiclePage(newState.pageIndex);
    },
  });

  // ============== RENDER ==============

  return (
    <>
      <Card title={t('admin.vehicles')} headerActions={
        <div className="flex gap-2">
          {(isAdmin || isMainAdmin) && (
            <>
              <label className={`btn-secondary text-sm ${isImportingVehicles ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`} style={{ margin: 0 }}>
                {isImportingVehicles ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2 inline-block"></div>
                    {t('vehicles.importing') || 'Importing...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2 inline" />
                    {t('admin.importVehicles', 'Import Vehicles')}
                  </>
                )}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleVehicleImport}
                  disabled={isImportingVehicles}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => navigate(`/vehicle-create?companyId=${currentCompanyId}`)}
                className="btn-primary text-sm"
              >
                <Plus className="h-4 w-4 mr-2 inline" />
                {t('admin.addVehicle')}
              </button>
            </>
          )}
        </div>
      }>
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Make Filter */}
            <div className={pickupLocations.length > 1 ? "md:col-span-2" : "md:col-span-3"}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vehicles.make') || 'Make'}
              </label>
              <select
                value={vehicleMakeFilter}
                onChange={(e) => {
                  setVehicleMakeFilter(e.target.value);
                  setVehiclePage(0);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('vehicles.allMakes') || 'All Makes'}</option>
                {uniqueMakes.map((make) => (
                  <option key={make} value={make}>{make}</option>
                ))}
              </select>
            </div>

            {/* Model Filter */}
            <div className={pickupLocations.length > 1 ? "md:col-span-2" : "md:col-span-3"}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vehicles.model') || 'Model'}
              </label>
              <select
                value={vehicleModelFilter}
                onChange={(e) => {
                  setVehicleModelFilter(e.target.value);
                  setVehiclePage(0);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={vehicleMakeFilter && filteredModels.length === 0}
              >
                <option value="">
                  {vehicleMakeFilter 
                    ? (filteredModels.length === 0 
                        ? t('vehicles.noModelsForMake', `No models for ${vehicleMakeFilter}`)
                        : t('vehicles.allModels', 'All Models'))
                    : t('vehicles.allModels', 'All Models')
                  }
                </option>
                {filteredModels.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div className={pickupLocations.length > 1 ? "md:col-span-2" : "md:col-span-3"}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vehicles.year') || 'Year'}
              </label>
              <input
                type="text"
                placeholder={t('vehicles.yearPlaceholder') || 'Year (e.g. 2025)'}
                value={vehicleYearFilter}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setVehicleYearFilter(value);
                  setVehiclePage(0);
                }}
                onBlur={(e) => {
                  const year = parseInt(e.target.value);
                  if (e.target.value && (year < 1900 || year > 2100)) {
                    setVehicleYearFilter('');
                    toast.error(t('vehicles.invalidYear') || 'Please enter a valid year (1900-2100)');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* License Plate Filter */}
            <div className={pickupLocations.length > 1 ? "md:col-span-2" : "md:col-span-3"}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vehicles.licensePlate') || 'License Plate'}
              </label>
              <input
                type="text"
                placeholder={t('vehicles.licensePlatePlaceholder') || 'License Plate'}
                value={vehicleLicensePlateFilter}
                onChange={(e) => {
                  setVehicleLicensePlateFilter(e.target.value);
                  setVehiclePage(0);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Location Filter */}
            {pickupLocations.length > 1 && (
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('vehicles.location') || 'Location'}
                </label>
                <select
                  value={vehicleLocationFilter}
                  onChange={(e) => {
                    setVehicleLocationFilter(e.target.value);
                    setVehiclePage(0);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('vehicles.allLocations') || 'All Locations'}</option>
                  {pickupLocations.map((location) => {
                    const locationId = location.locationId || location.id || location.pickupLocationId;
                    const locationName = location.locationName || location.name || `Location ${locationId}`;
                    return (
                      <option key={locationId} value={locationId}>
                        {locationName}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
          
          {/* Clear Filters Button */}
          <div className="flex justify-end">
            <button
              onClick={resetFilters}
              disabled={!vehicleMakeFilter && !vehicleModelFilter && !vehicleYearFilter && !vehicleLicensePlateFilter && !vehicleLocationFilter && !vehicleSearchTerm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {t('clearFilters') || 'Clear Filters'}
            </button>
          </div>

          {/* Search Field */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('search') || 'Search vehicles...'}
              value={vehicleSearchTerm}
              onChange={(e) => {
                setVehicleSearchTerm(e.target.value);
                setVehiclePage(0);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {vehicleSearchTerm && (
              <button
                onClick={() => {
                  setVehicleSearchTerm('');
                  setVehiclePage(0);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {isLoadingVehiclesList ? (
          <div className="text-center py-12">
            <LoadingSpinner />
            <p className="mt-4 text-gray-600">{t('loading')}</p>
          </div>
        ) : vehiclesList.length === 0 ? (
          <p className="text-gray-500 text-center py-4">{t('vehicles.noVehicles')}</p>
        ) : filteredVehiclesList.length === 0 && (vehicleSearchTerm || vehicleMakeFilter || vehicleModelFilter || vehicleYearFilter || vehicleLicensePlateFilter) ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">{t('noResults') || 'No vehicles found matching your filters'}</p>
            <button onClick={resetFilters} className="btn-secondary">
              {t('clearSearch') || 'Clear Filters'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {(vehicleSearchTerm || vehicleMakeFilter || vehicleModelFilter || vehicleYearFilter || vehicleLicensePlateFilter) && (
              <p className="text-sm text-gray-600">
                {t('admin.showing')} {filteredVehiclesList.length} {t('admin.of')} {vehiclesList.length} {t('vehicles')}
              </p>
            )}
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  {vehicleTable.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehicleTable.getRowModel().rows.map(row => (
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
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
              <div className="flex flex-1 justify-between sm:hidden">
                <button onClick={() => vehicleTable.previousPage()} disabled={!vehicleTable.getCanPreviousPage()} className="btn-secondary">
                  {t('previous')}
                </button>
                <button onClick={() => vehicleTable.nextPage()} disabled={!vehicleTable.getCanNextPage()} className="btn-secondary ml-3">
                  {t('next')}
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    {t('admin.showing')} <span className="font-medium">{Math.min(vehiclePage * vehiclePageSize + 1, vehiclesTotalCount)}</span> {t('admin.to')} <span className="font-medium">{Math.min((vehiclePage + 1) * vehiclePageSize, vehiclesTotalCount)}</span> {t('admin.of')} <span className="font-medium">{vehiclesTotalCount}</span> {t('results')}
                  </p>
                </div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                  <button onClick={() => vehicleTable.setPageIndex(0)} disabled={!vehicleTable.getCanPreviousPage()} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50">
                    <ChevronsLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => vehicleTable.previousPage()} disabled={!vehicleTable.getCanPreviousPage()} className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => vehicleTable.nextPage()} disabled={!vehicleTable.getCanNextPage()} className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button onClick={() => vehicleTable.setPageIndex(vehicleTable.getPageCount() - 1)} disabled={!vehicleTable.getCanNextPage()} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50">
                    <ChevronsRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Field Mapping Modal */}
      {showFieldMappingModal && fieldMappingData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{t('vehicles.mapFields', 'Map CSV Columns to Fields')}</h2>
              <button onClick={() => { setShowFieldMappingModal(false); setFieldMappingData(null); setPendingImportFile(null); setFieldMapping({}); }} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">{t('vehicles.mapFieldsDescription', 'Please map each CSV column to the corresponding field. Mandatory fields are marked with *.')}</p>
            
            <div className="space-y-4">
              {fieldMappingData.availableFields.map((field) => {
                const currentMapping = fieldMapping[field.field];
                const isMapped = currentMapping !== undefined && currentMapping !== null && currentMapping !== '';
                const isMandatoryUnmapped = field.mandatory && !isMapped;
                
                return (
                  <div key={field.field} className={`flex items-center gap-4 ${isMandatoryUnmapped ? 'bg-red-50 p-3 rounded border border-red-200' : ''}`}>
                    <label className={`w-48 font-medium ${isMandatoryUnmapped ? 'text-red-600' : ''}`}>
                      {field.label}
                      {field.mandatory && <span className="text-red-500 ml-1">*</span>}
                      {field.defaultValue && <span className="text-gray-500 text-sm ml-2">({t('vehicles.default', 'default')}: {field.defaultValue})</span>}
                      {isMandatoryUnmapped && <span className="text-red-600 text-sm ml-2 font-normal">({t('vehicles.required', 'required')})</span>}
                    </label>
                    <select
                      value={currentMapping === undefined || currentMapping === null ? '' : currentMapping}
                      onChange={(e) => setFieldMapping(prev => ({ ...prev, [field.field]: e.target.value === '' ? undefined : parseInt(e.target.value, 10) }))}
                      className={`flex-1 border rounded px-3 py-2 ${isMandatoryUnmapped ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    >
                      <option value="">{t('vehicles.selectColumn', 'Select CSV column...')}</option>
                      {fieldMappingData.headers.map((header, index) => (
                        <option key={index} value={index}>{header} (Column {index + 1})</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => { setShowFieldMappingModal(false); setFieldMappingData(null); setPendingImportFile(null); setFieldMapping({}); }} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={() => {
                  const mandatoryFields = fieldMappingData.availableFields.filter(f => f.mandatory);
                  const missingMandatory = mandatoryFields.some(f => {
                    const value = fieldMapping[f.field];
                    return value === undefined || value === null || value === '' || isNaN(Number(value));
                  });
                  
                  if (missingMandatory) {
                    const unmappedFields = mandatoryFields.filter(f => {
                      const value = fieldMapping[f.field];
                      return value === undefined || value === null || value === '' || isNaN(Number(value));
                    }).map(f => f.label).join(', ');
                    toast.error(t('vehicles.mapAllMandatoryFields', 'Please map all mandatory fields') + `: ${unmappedFields}`);
                    return;
                  }
                  
                  const mapping = {};
                  Object.keys(fieldMapping).forEach(field => {
                    const value = fieldMapping[field];
                    if (value !== undefined && value !== null && value !== '' && !isNaN(Number(value))) {
                      mapping[field] = Number(value);
                    }
                  });
                  
                  handleVehicleImportWithMapping(mapping);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {t('vehicles.importWithMapping', 'Import with Mapping')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VehicleManagementSection;
