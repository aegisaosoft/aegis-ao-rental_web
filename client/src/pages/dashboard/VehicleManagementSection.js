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
import { Upload, Plus, MapPin, Search, X, ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { flexRender } from '@tanstack/react-table';
import { Card, LoadingSpinner } from '../../components/common';
import { toast } from 'react-toastify';

const VehicleManagementSection = ({
  t,
  // Role checks
  isAdmin,
  isMainAdmin,
  // Import state
  isImportingVehicles,
  handleVehicleImport,
  // Create vehicle
  setIsCreatingVehicle,
  setVehicleCreateForm,
  // Navigation
  navigate,
  currentCompanyId,
  // Locations
  pickupLocations,
  // Filters
  vehicleMakeFilter,
  setVehicleMakeFilter,
  vehicleModelFilter,
  setVehicleModelFilter,
  vehicleYearFilter,
  setVehicleYearFilter,
  vehicleLicensePlateFilter,
  setVehicleLicensePlateFilter,
  vehicleLocationFilter,
  setVehicleLocationFilter,
  vehicleSearchTerm,
  setVehicleSearchTerm,
  // Filter options
  uniqueMakes,
  filteredModels,
  // Pagination
  vehiclePage,
  setVehiclePage,
  vehiclePageSize,
  vehiclesTotalCount,
  // Data
  isLoadingVehiclesList,
  vehiclesList,
  filteredVehiclesList,
  // Table
  vehicleTable,
}) => {
  return (
    <Card title={t('admin.vehicles')} headerActions={
      <div className="flex gap-2">
        {/* Import and Add buttons - Admin and MainAdmin */}
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
              onClick={() => {
                setIsCreatingVehicle(true);
                setVehicleCreateForm({
                  make: '',
                  model: '',
                  year: '',
                  licensePlate: '',
                  color: '',
                  vin: '',
                  mileage: 0,
                  transmission: '',
                  seats: '',
                  dailyRate: '',
                  status: 'Available',
                  state: '',
                  location: '',
                  features: null
                });
              }}
              className="btn-primary text-sm"
            >
              <Plus className="h-4 w-4 mr-2 inline" />
              {t('admin.addVehicle')}
            </button>
          </>
        )}
        {/* Manage Locations - All roles */}
        <button
          onClick={() => navigate(`/vehicle-locations?companyId=${currentCompanyId}`)}
          className="btn-outline text-sm flex items-center gap-2"
        >
          <MapPin className="h-4 w-4" />
          {t('admin.manageLocations', 'Manage Locations')}
        </button>
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
              placeholder={t('vehicles.licensePlate') || 'License Plate'}
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
                {t('admin.location') || 'Location'}
              </label>
              <select
                value={vehicleLocationFilter}
                onChange={(e) => {
                  setVehicleLocationFilter(e.target.value);
                  setVehiclePage(0);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('admin.allLocations') || 'All Locations'}</option>
                {pickupLocations.map((location) => {
                  const locationId = location.LocationId || location.locationId || location.id || location.Id;
                  const locationName = location.LocationName || location.locationName || location.location_name || '';
                  return (
                    <option key={locationId} value={locationId}>{locationName}</option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
        
        {/* Clear Filters Button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              setVehicleMakeFilter('');
              setVehicleModelFilter('');
              setVehicleYearFilter('');
              setVehicleLicensePlateFilter('');
              setVehicleLocationFilter('');
              setVehicleSearchTerm('');
              setVehiclePage(0);
            }}
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
          <button
            onClick={() => {
              setVehicleMakeFilter('');
              setVehicleModelFilter('');
              setVehicleYearFilter('');
              setVehicleLicensePlateFilter('');
              setVehicleSearchTerm('');
              setVehiclePage(0);
            }}
            className="btn-secondary"
          >
            {t('clearSearch') || 'Clear Filters'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Show filtered count */}
          {(vehicleSearchTerm || vehicleMakeFilter || vehicleModelFilter || vehicleYearFilter || vehicleLicensePlateFilter) && (
            <p className="text-sm text-gray-600">
              {t('admin.showing')} {filteredVehiclesList.length} {t('admin.of')} {vehiclesList.length} {t('vehicles')}
            </p>
          )}
          
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {vehicleTable.getHeaderGroups().map(headerGroup => (
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
              <button
                onClick={() => vehicleTable.previousPage()}
                disabled={!vehicleTable.getCanPreviousPage()}
                className="btn-secondary"
              >
                {t('previous')}
              </button>
              <button
                onClick={() => vehicleTable.nextPage()}
                disabled={!vehicleTable.getCanNextPage()}
                className="btn-secondary ml-3"
              >
                {t('next')}
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {vehicleSearchTerm ? (
                    <>
                      {t('admin.showing')} <span className="font-medium">{Math.min(vehiclePage * vehiclePageSize + 1, filteredVehiclesList.length)}</span> {t('admin.to')} <span className="font-medium">{Math.min((vehiclePage + 1) * vehiclePageSize, filteredVehiclesList.length)}</span> {t('admin.of')} <span className="font-medium">{filteredVehiclesList.length}</span> {t('results')}
                    </>
                  ) : (
                    <>
                      {t('admin.showing')} <span className="font-medium">{vehiclePage * vehiclePageSize + 1}</span> {t('admin.to')} <span className="font-medium">{Math.min((vehiclePage + 1) * vehiclePageSize, vehiclesTotalCount)}</span> {t('admin.of')} <span className="font-medium">{vehiclesTotalCount}</span> {t('results')}
                    </>
                  )}
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => vehicleTable.setPageIndex(0)}
                    disabled={!vehicleTable.getCanPreviousPage()}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <ChevronsLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => vehicleTable.previousPage()}
                    disabled={!vehicleTable.getCanPreviousPage()}
                    className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => vehicleTable.nextPage()}
                    disabled={!vehicleTable.getCanNextPage()}
                    className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => vehicleTable.setPageIndex(vehicleTable.getPageCount() - 1)}
                    disabled={!vehicleTable.getCanNextPage()}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <ChevronsRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default VehicleManagementSection;
