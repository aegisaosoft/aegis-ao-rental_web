/*
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React from 'react';
import { Building2, MapPin, Save, X, ChevronLeft, ChevronsLeft, ChevronsRight, CreditCard } from 'lucide-react';
import { ChevronRight as ChevronRightIcon } from 'lucide-react';
import { flexRender } from '@tanstack/react-table';
import { Card, LoadingSpinner } from '../../components/common';
import MultiLanguageTipTapEditor from '../../components/MultiLanguageTipTapEditor';
import VehicleLocations from '../VehicleLocations';

const CompanySection = ({
  t,
  activeTab,
  setActiveTab,
  activeLocationSubTab,
  setActiveLocationSubTab,
  currentCompanyId,
  isLoadingCompany,
  companyError,
  companyData,
  actualCompanyData,
  companyConfig,
  isEditingCompany,
  isCreatingCompany,
  companyFormData,
  setCompanyFormData,
  handleCompanyInputChange,
  handleSaveCompany,
  handleCancelEdit,
  isAdmin,
  isMainAdmin,
  isEditingLocation,
  editingLocationId,
  locationFormData,
  handleLocationInputChange,
  handleSaveLocation,
  handleCancelLocationEdit,
  handleAddLocation,
  handleEditLocation,
  handleDeleteLocation,
  isLoadingLocations,
  locations,
  pickupLocations,
  locationTable,
  locationPage,
  locationPageSize,
  handleLogoUpload,
  handleLogoDelete,
  handleBannerUpload,
  handleBannerDelete,
  handleVideoUpload,
  handleVideoDelete,
  isUploading,
  uploadProgress,
  securityDepositDraft,
  setSecurityDepositDraft,
  isSecurityDepositMandatoryDraft,
  setIsSecurityDepositMandatoryDraft,
  isEditingDeposit,
  beginSecurityDepositEdit,
  cancelSecurityDepositEdit,
  handleSecurityDepositSave,
  isSavingDeposit,
  termsOfUseDraft,
  setTermsOfUseDraft,
  handleTermsOfUseSave,
  isSavingTermsOfUse,
  isLoadingStripeStatus,
  stripeStatus,
  isCreatingStripeAccount,
  handleCreateStripeAccount,
  updateCompanyMutation,
  tabCaptions,
  isAuthenticated,
  canAccessDashboard,
  countriesByContinent,
}) => {
  return (
    <Card
      title={
        <div className="flex items-center">
          {activeTab === 'locations' ? (
            <>
              <MapPin className="h-6 w-6 text-blue-600 mr-2" />
              <span>{t('admin.locations', 'Locations')}</span>
            </>
          ) : (
            <>
              <Building2 className="h-6 w-6 text-blue-600 mr-2" />
              <span>
                {!currentCompanyId && isEditingCompany
                  ? t('admin.createCompany') || 'Create Company'
                  : t('admin.companyProfile')}
              </span>
            </>
          )}
        </div>
      }
    >
      <div>
      {isLoadingCompany && currentCompanyId ? (
        <LoadingSpinner text={t('common.loading')} />
      ) : companyError && currentCompanyId ? (
        <div className="text-center py-8">
          <p className="text-red-600 font-medium">{t('admin.companyLoadFailed')}</p>
          <p className="text-sm text-gray-600 mt-2">{companyError.message}</p>
            </div>
      ) : (!companyData && currentCompanyId) ? (
        <div className="text-center py-8">
          <p className="text-gray-600">{t('admin.noCompanyData')}</p>
          </div>
      ) : activeTab === 'locations' ? (
          // Locations Tab - Always show locations content
          <div className="space-y-6">
            {/* Sub-tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Sub-tabs">
                <button
                  type="button"
                  onClick={() => setActiveLocationSubTab('company')}
                  className={`
                    whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm
                    ${activeLocationSubTab === 'company'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {t('admin.companyLocations', 'Company Locations')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLocationSubTab('pickup')}
                  className={`
                    whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm
                    ${activeLocationSubTab === 'pickup'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {t('admin.pickupLocations', 'Pickup Locations')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLocationSubTab('management')}
                  className={`
                    whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm
                    ${activeLocationSubTab === 'management'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {t('admin.manageLocations', 'Manage Locations')}
                </button>
              </nav>
            </div>
  
            {/* Add Location Button - Admin only (only show for company and pickup tabs) */}
            {!isEditingLocation && isAdmin && activeLocationSubTab !== 'management' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddLocation}
                  className="btn-primary"
                >
                  + {t('admin.addLocation')}
                </button>
              </div>
            )}
  
            {/* Management Tab - Vehicle Location Assignment */}
            {activeLocationSubTab === 'management' ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    {t('admin.manageLocationsDescription', 'Assign vehicles to locations by dragging and dropping. This helps organize your fleet across different pickup and return locations.')}
                  </p>
                </div>
                <VehicleLocations embedded={true} />
              </div>
            ) : (
              <>
            {/* Location Form */}
            {isEditingLocation ? (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">
                  {editingLocationId ? t('admin.editLocation') : t('admin.addLocation')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.locationName')} *
                    </label>
                    <input
                      type="text"
                      name="locationName"
                      value={locationFormData.locationName}
                      onChange={handleLocationInputChange}
                      className="input-field"
                      required
                    />
                  </div>
  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.address')}
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={locationFormData.address}
                      onChange={handleLocationInputChange}
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
                      value={locationFormData.city}
                      onChange={handleLocationInputChange}
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
                      value={locationFormData.state}
                      onChange={handleLocationInputChange}
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
                      value={locationFormData.country}
                      onChange={handleLocationInputChange}
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
                      value={locationFormData.postalCode}
                      onChange={handleLocationInputChange}
                      className="input-field"
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.phone')}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={locationFormData.phone}
                      onChange={handleLocationInputChange}
                      className="input-field"
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.email')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={locationFormData.email}
                      onChange={handleLocationInputChange}
                      className="input-field"
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.latitude')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      value={locationFormData.latitude}
                      onChange={handleLocationInputChange}
                      className="input-field"
                      placeholder="40.7128"
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.longitude')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={locationFormData.longitude}
                      onChange={handleLocationInputChange}
                      className="input-field"
                      placeholder="-74.0060"
                    />
                  </div>
  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.openingHours')}
                    </label>
                    <textarea
                      name="openingHours"
                      value={locationFormData.openingHours}
                      onChange={handleLocationInputChange}
                      className="input-field"
                      rows="3"
                      placeholder='{"Mon": "9-5", "Tue": "9-5"}'
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      JSON format optional
                    </p>
                  </div>
  
                  <div className="md:col-span-2 flex items-center space-x-6">
                    {activeLocationSubTab === 'pickup' && (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="isPickupLocation"
                          checked={locationFormData.isPickupLocation}
                          onChange={handleLocationInputChange}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{t('admin.isPickupLocation')}</span>
                      </label>
                    )}
  
                    {activeLocationSubTab === 'company' && (
                      <>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="isPickupLocation"
                            checked={locationFormData.isPickupLocation}
                            onChange={handleLocationInputChange}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">{t('admin.isPickupLocation')}</span>
                        </label>
  
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="isReturnLocation"
                            checked={locationFormData.isReturnLocation}
                            onChange={handleLocationInputChange}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">{t('admin.isReturnLocation')}</span>
                        </label>
  
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="isOffice"
                            checked={locationFormData.isOffice}
                            onChange={handleLocationInputChange}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">{t('admin.isOffice') || 'Is Office'}</span>
                        </label>
                      </>
                    )}
  
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={locationFormData.isActive}
                        onChange={handleLocationInputChange}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{t('admin.isActive')}</span>
                    </label>
                  </div>
  
                  <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancelLocationEdit}
                      className="btn-outline"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveLocation}
                      className="btn-primary"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Locations Table */
              <div className="overflow-x-auto">
                {isLoadingLocations ? (
                  <div className="text-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : locations.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-600">{t('admin.noLocations')}</p>
                  </div>
                ) : (
                  <>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        {locationTable.getHeaderGroups().map(headerGroup => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                              <th
                                key={header.id}
                                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                                  header.id === 'actions' ? 'text-right' : ''
                                }`}
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
                        {locationTable.getRowModel().rows.map(row => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            {row.getVisibleCells().map(cell => (
                              <td
                                key={cell.id}
                                className={`px-6 py-4 whitespace-nowrap ${
                                  cell.column.id === 'actions' ? 'text-right text-sm font-medium' : ''
                                }`}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
  
                    {/* Pagination */}
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
                      <div className="flex flex-1 justify-between sm:hidden">
                        <button
                          onClick={() => locationTable.previousPage()}
                          disabled={!locationTable.getCanPreviousPage()}
                          className="btn-secondary"
                        >
                          {t('previous')}
                        </button>
                        <button
                          onClick={() => locationTable.nextPage()}
                          disabled={!locationTable.getCanNextPage()}
                          className="btn-secondary ml-3"
                        >
                          {t('next')}
                        </button>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            {t('admin.showing')} <span className="font-medium">{locationPage * locationPageSize + 1}</span> {t('admin.to')} <span className="font-medium">{Math.min((locationPage + 1) * locationPageSize, locations.length)}</span> {t('admin.of')} <span className="font-medium">{locations.length}</span> {t('results')}
                          </p>
                        </div>
                        <div>
                          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            <button
                              onClick={() => locationTable.setPageIndex(0)}
                              disabled={!locationTable.getCanPreviousPage()}
                              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                            >
                              <ChevronsLeft className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => locationTable.previousPage()}
                              disabled={!locationTable.getCanPreviousPage()}
                              className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => locationTable.nextPage()}
                              disabled={!locationTable.getCanNextPage()}
                              className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                            >
                              <ChevronRightIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => locationTable.setPageIndex(locationTable.getPageCount() - 1)}
                              disabled={!locationTable.getCanNextPage()}
                              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                            >
                              <ChevronsRight className="h-5 w-5" />
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            </>
            )}
          </div>
      ) : isEditingCompany || (!currentCompanyId && isMainAdmin) ? (
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
                <button
                  type="button"
                  onClick={() => setActiveTab('locations')}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === 'locations'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {t('admin.locations')}
                </button>
              </nav>
        </div>
            <p className="text-sm text-gray-500 mb-6">
              {tabCaptions[activeTab]}
            </p>
  
            {/* Company Info Tab */}
            {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="isTestCompany"
                    checked={companyFormData.isTestCompany ?? true}
                    disabled
                    readOnly
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-not-allowed opacity-60"
                  />
                  <span className="block text-sm font-medium text-gray-700">
                    {t('admin.isTestCompany', 'Test Company')}
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  {t('admin.isTestCompanyHelp', 'Mark this company as a test company')} (Read-only)
                </p>
              </div>
  
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
  
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.country') || 'Country'}
                </label>
                <select
                  name="country"
                  value={companyFormData.country || ''}
                  onChange={handleCompanyInputChange}
                  className="input-field"
                >
                  <option value="">Select Country</option>
                  {Object.entries(countriesByContinent).map(([continent, countries]) => (
                    <optgroup key={continent} label={continent}>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
  
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.securityDeposit', 'Security Deposit')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="securityDeposit"
                    min="0"
                    step="0.01"
                    value={
                      companyFormData.securityDeposit === '' ||
                      companyFormData.securityDeposit == null
                        ? ''
                        : companyFormData.securityDeposit
                    }
                    onChange={handleCompanyInputChange}
                    className="input-field pr-14"
                    placeholder="1000"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
                    {companyFormData.currency || 'USD'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t(
                    'admin.securityDepositHelp',
                    'Default deposit amount required for bookings created under this company.'
                  )}
                </p>
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
  
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.termsOfUse', 'Terms of Use')}
                </label>
                <MultiLanguageTipTapEditor
                  content={companyFormData.termsOfUse || companyFormData.TermsOfUse || ''}
                  onChange={(jsonString) => {
                    setCompanyFormData(prev => ({
                      ...prev,
                      termsOfUse: jsonString,
                      TermsOfUse: jsonString
                    }));
                  }}
                  placeholder="Enter terms of use. You can paste formatted text from clipboard..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t('admin.termsOfUseHelp', 'Use the editor to format your terms of use in 5 languages (English, Spanish, Portuguese, French, German). You can paste formatted text from your clipboard. Switch between language tabs to edit each version.')}
                </p>
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
                {(companyConfig?.subdomain || actualCompanyData?.subdomain) ? (
                  <div>
                    <input
                      type="text"
                      value={companyConfig?.subdomain || actualCompanyData?.subdomain || ''}
                      className="input-field bg-gray-100 cursor-not-allowed"
                      readOnly
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used for: {(companyConfig?.subdomain || actualCompanyData?.subdomain)}.aegis-rental.com
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      {t('admin.subdomainCannotBeChanged', 'Subdomain cannot be changed once set')}
                    </p>
                  </div>
                ) : (
                  <div>
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
                )}
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
  
            {/* Locations Tab - Removed duplicate, now handled at top level */}
  
            {/* Action Buttons */}
            {activeTab !== 'locations' && (
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn-outline flex items-center"
              >
                <X className="h-4 w-4 mr-2" />
                {t('common.cancel')}
              </button>
              {/* Show save button if: creating new company (main admin only) OR updating existing company */}
              {((!currentCompanyId && isEditingCompany && isMainAdmin) || currentCompanyId) && (
                <button
                  type="submit"
                  disabled={updateCompanyMutation.isLoading || isCreatingCompany}
                  className="btn-primary flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {(updateCompanyMutation.isLoading || isCreatingCompany) 
                    ? t('common.saving') || 'Saving...' 
                    : (!currentCompanyId ? t('admin.createCompany') || 'Create Company' : t('common.save'))
                  }
                </button>
              )}
            </div>
            )}
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
  
            <div className="md:col-span-2 pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                {t('admin.financialSettings', 'Financial Settings')}
              </p>
            </div>
  
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t('admin.currency', 'Currency')}
              </p>
              <p className="text-base text-gray-900">
                {(actualCompanyData?.currency || 'USD').toUpperCase()}
              </p>
            </div>
  
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t('admin.securityDeposit', 'Security Deposit')}
              </p>
              {isEditingDeposit ? (
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={securityDepositDraft}
                      onChange={(e) => setSecurityDepositDraft(e.target.value)}
                      className="input-field h-10"
                      disabled={isSavingDeposit}
                    />
                    <button
                      type="button"
                      onClick={handleSecurityDepositSave}
                      disabled={isSavingDeposit}
                      className="btn-primary px-3 py-2 text-sm"
                    >
                      {isSavingDeposit ? t('common.saving') || 'Saving…' : t('common.save')}
                    </button>
                    <button
                      type="button"
                      onClick={cancelSecurityDepositEdit}
                      disabled={isSavingDeposit}
                      className="btn-outline px-3 py-2 text-sm"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={isSecurityDepositMandatoryDraft}
                      onChange={(e) => setIsSecurityDepositMandatoryDraft(e.target.checked)}
                      disabled={isSavingDeposit}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span>{t('admin.isSecurityDepositMandatory', 'Security deposit is mandatory')}</span>
                  </label>
                </div>
              ) : (
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center gap-3">
                    <span className="text-base text-gray-900">
                      {actualCompanyData?.securityDeposit != null
                        ? new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: (actualCompanyData?.currency || 'USD').toUpperCase(),
                            minimumFractionDigits: 0,
                          }).format(actualCompanyData.securityDeposit)
                        : '-'}
                    </span>
                    <button
                      type="button"
                      onClick={beginSecurityDepositEdit}
                      disabled={isEditingCompany}
                      className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                    >
                      {t('common.edit')}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className={(actualCompanyData?.isSecurityDepositMandatory ?? actualCompanyData?.IsSecurityDepositMandatory ?? true) ? 'text-green-600 font-medium' : 'text-gray-500'}>
                      {(actualCompanyData?.isSecurityDepositMandatory ?? actualCompanyData?.IsSecurityDepositMandatory ?? true)
                        ? t('admin.mandatory', 'Mandatory') 
                        : t('admin.optional', 'Optional')}
                    </span>
                  </div>
                </div>
              )}
            </div>
  
            {/* Create Stripe Account Button - Visible to all authenticated users, but only admin/mainadmin can create */}
            {isAuthenticated && canAccessDashboard && currentCompanyId && (
              <div className="md:col-span-2 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">
                    {t('admin.stripeAccount', 'Stripe Account')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    {t('admin.stripeAccountDescription', 'Connect a Stripe account to accept payments and receive payouts for your rental business.')}
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateStripeAccount}
                    disabled={isCreatingStripeAccount || isEditingCompany || !(isAdmin || isMainAdmin)}
                    className="btn-primary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px] justify-center"
                    title={!(isAdmin || isMainAdmin) ? t('admin.adminOnly', 'Admin access required') : ''}
                  >
                    {isCreatingStripeAccount ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {t('common.creating', 'Creating...')}
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        {stripeStatus?.StripeAccountId || stripeStatus?.stripeAccountId 
                          ? t('admin.stripe', 'Stripe')
                          : t('admin.createStripeAccount', 'Create Stripe Account')
                        }
                      </>
                    )}
                  </button>
                  {!(isAdmin || isMainAdmin) && (
                    <p className="text-xs text-gray-500 mt-2">
                      {t('admin.readOnlyAccess', 'Read-only access. Admin or Main Admin role required to create accounts.')}
                    </p>
                  )}
                  {/* Status Indicators - Visible to all authenticated users */}
                  <div className="flex items-center gap-3 mt-3">
                    {isLoadingStripeStatus ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    ) : (
                      <>
                        {/* 1. Is Active */}
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            (stripeStatus?.AccountStatus || stripeStatus?.accountStatus || '').toLowerCase() === 'active' 
                              ? 'bg-green-500' 
                              : 'bg-red-500'
                          }`}></div>
                          <span className="text-xs text-gray-600 whitespace-nowrap">Active</span>
                        </div>
                        {/* 2. Charges Enabled */}
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            stripeStatus?.ChargesEnabled === true || stripeStatus?.chargesEnabled === true
                              ? 'bg-green-500' 
                              : 'bg-red-500'
                          }`}></div>
                          <span className="text-xs text-gray-600 whitespace-nowrap">Charges</span>
                        </div>
                        {/* 3. Payouts Enabled */}
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            stripeStatus?.PayoutsEnabled === true || stripeStatus?.payoutsEnabled === true
                              ? 'bg-green-500' 
                              : 'bg-red-500'
                          }`}></div>
                          <span className="text-xs text-gray-600 whitespace-nowrap">Payouts</span>
                        </div>
                        {/* 4. Onboarding Completed */}
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            stripeStatus?.OnboardingCompleted === true || stripeStatus?.onboardingCompleted === true
                              ? 'bg-green-500' 
                              : 'bg-red-500'
                          }`}></div>
                          <span className="text-xs text-gray-600 whitespace-nowrap">Onboarded</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
  
            {/* Terms of Use Section - Always Editable for Admins */}
            {(isAdmin || isMainAdmin) && currentCompanyId && (
              <div className="md:col-span-2 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">
                    {t('admin.termsOfUse', 'Terms of Use')}
                  </p>
                </div>
  
                <div className="space-y-4">
                  <MultiLanguageTipTapEditor
                    content={termsOfUseDraft || actualCompanyData?.termsOfUse || actualCompanyData?.TermsOfUse || companyFormData?.termsOfUse || companyFormData?.TermsOfUse || ''}
                    onChange={(jsonString) => {
                      setTermsOfUseDraft(jsonString);
                    }}
                    placeholder="Enter terms of use. You can paste formatted text from clipboard..."
                  />
                  <div className="flex justify-end space-x-4 pt-2">
                    <button
                      type="button"
                      onClick={handleTermsOfUseSave}
                      disabled={isSavingTermsOfUse}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      {isSavingTermsOfUse 
                        ? t('common.saving') || 'Saving…' 
                        : t('common.save', 'Save Terms')}
                    </button>
                  </div>
                </div>
              </div>
            )}
  
          </div>
      )}
      </div>
    </Card>
  );
};

export default CompanySection;
