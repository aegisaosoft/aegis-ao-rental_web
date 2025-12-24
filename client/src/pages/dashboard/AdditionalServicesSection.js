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
import { Card, LoadingSpinner } from '../../components/common';

const AdditionalServicesSection = ({
  t,
  // Editing state
  isEditingService,
  editingServiceId,
  editingCompanyServiceId,
  editingServiceBaseInfo,
  serviceFormData,
  // Data
  allAdditionalServices,
  assignedServiceIds,
  assignmentOverrides,
  companyServicesMap,
  isLoadingServices,
  // Handlers
  handleAddService,
  handleSaveService,
  handleServiceInputChange,
  handleCancelServiceEdit,
  handleToggleServiceAssignment,
  handleToggleServiceField,
  handleEditService,
  handleDeleteService,
  getServiceIdentifier,
  // Utilities
  formatRate,
  currencySymbol,
  currencyCode,
}) => {
  return (
    <Card 
      title={t('admin.additionalServices')}
      headerActions={
        !isEditingService && (
          <button
            onClick={handleAddService}
            className="btn-primary text-sm"
          >
            + {t('admin.addService')}
          </button>
        )
      }
    >
      <div className="space-y-6">
        {isEditingService ? (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingServiceId ? t('admin.editService') : t('admin.addService')}
            </h3>
            <form onSubmit={handleSaveService} className="space-y-4">
              {editingCompanyServiceId ? (
                // Editing company service - show base info as read-only
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.serviceName')}
                    </label>
                    <input
                      type="text"
                      value={serviceFormData.name}
                      className="input-field bg-gray-100"
                      readOnly
                      disabled
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.serviceDescription')}
                    </label>
                    <textarea
                      value={serviceFormData.description}
                      className="input-field bg-gray-100"
                      rows="3"
                      readOnly
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.serviceType')}
                    </label>
                    <input
                      type="text"
                      value={serviceFormData.serviceType}
                      className="input-field bg-gray-100"
                      readOnly
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.maxQuantity')}
                    </label>
                    <input
                      type="number"
                      value={serviceFormData.maxQuantity}
                      className="input-field bg-gray-100"
                      readOnly
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.servicePrice')} ({t('admin.companyPrice')} · {currencySymbol}{currencyCode})
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={serviceFormData.price}
                      onChange={handleServiceInputChange}
                      className="input-field"
                      step="0.01"
                      min="0"
                      placeholder={editingServiceBaseInfo ? `Base: ${formatRate(editingServiceBaseInfo.price || editingServiceBaseInfo.Price || 0, { currency: 'USD' })}` : ''}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('admin.companyPriceHint')} ({currencySymbol}{currencyCode})
                    </p>
                  </div>
                </div>
              ) : (
                // Creating new additional service - show all fields
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.serviceName')} *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={serviceFormData.name}
                      onChange={handleServiceInputChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.serviceDescription')}
                    </label>
                    <textarea
                      name="description"
                      value={serviceFormData.description}
                      onChange={handleServiceInputChange}
                      className="input-field"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.serviceType')} *
                    </label>
                    <select
                      name="serviceType"
                      value={serviceFormData.serviceType}
                      onChange={handleServiceInputChange}
                      className="input-field"
                      required
                    >
                      <option value="">{t('admin.selectServiceType')}</option>
                      <option value="per_day">{t('admin.perDay')}</option>
                      <option value="per_rental">{t('admin.perRental')}</option>
                      <option value="one_time">{t('admin.oneTime')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.servicePrice')} *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={serviceFormData.price}
                      onChange={handleServiceInputChange}
                      className="input-field"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.maxQuantity')}
                    </label>
                    <input
                      type="number"
                      name="maxQuantity"
                      value={serviceFormData.maxQuantity}
                      onChange={handleServiceInputChange}
                      className="input-field"
                      min="1"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="isMandatory"
                        checked={serviceFormData.isMandatory}
                        onChange={handleServiceInputChange}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{t('admin.isMandatory')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={serviceFormData.isActive}
                        onChange={handleServiceInputChange}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{t('admin.isActive')}</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCancelServiceEdit}
                  className="btn-outline"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {isLoadingServices ? (
              <div className="py-8 text-center">
                <LoadingSpinner />
              </div>
            ) : !allAdditionalServices || allAdditionalServices.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                {t('admin.noServices')}
              </p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.assigned')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.serviceName')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.serviceType')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.servicePrice')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.maxQuantity')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.isMandatory')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.isActive')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allAdditionalServices.map((service) => {
                    const serviceId = getServiceIdentifier(service);
                    const baseAssigned = assignedServiceIds.has(serviceId);
                    const hasOverride = Object.prototype.hasOwnProperty.call(
                      assignmentOverrides,
                      serviceId
                    );
                    const isAssigned = hasOverride
                      ? assignmentOverrides[serviceId]
                      : baseAssigned;
                    const companyServiceRaw = companyServicesMap.get(serviceId);
                    const companyService = isAssigned ? companyServiceRaw : null;
                    const basePrice =
                      service.price !== undefined && service.price !== null
                        ? service.price
                        : service.Price ?? 0;
                    const companyPrice =
                      companyService &&
                      (companyService.price ?? companyService.Price ?? basePrice);
                    const displayPrice = isAssigned ? companyPrice ?? basePrice : basePrice;
                    const formattedPrice = isAssigned
                      ? formatRate(displayPrice)
                      : formatRate(displayPrice, { currency: 'USD' });
                    const displayMaxQuantity = isAssigned
                      ? companyService?.maxQuantity ??
                        companyService?.MaxQuantity ??
                        service.maxQuantity ??
                        service.MaxQuantity ??
                        1
                      : service.maxQuantity || service.MaxQuantity || 1;
                    const isMandatory = isAssigned
                      ? companyService?.isMandatory ??
                        companyService?.IsMandatory ??
                        false
                      : service.isMandatory ?? service.IsMandatory ?? false;
                    const isActive = isAssigned
                      ? companyService?.isActive ??
                        companyService?.IsActive ??
                        true
                      : service.isActive ?? service.IsActive ?? true;
                    return (
                      <tr key={serviceId} className={`hover:bg-gray-50 ${isAssigned ? 'bg-green-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => handleToggleServiceAssignment(service)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              title={isAssigned ? t('admin.removeFromCompany') : t('admin.addToCompany')}
                            />
                          </label>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {service.name || service.Name}
                            </div>
                            {service.description || service.Description ? (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {service.description || service.Description}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {service.serviceType || service.ServiceType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {formattedPrice}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {displayMaxQuantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!isMandatory}
                              onChange={() => handleToggleServiceField(service, 'isMandatory')}
                              className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                              title={t('admin.isMandatory')}
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {isMandatory ? t('common.yes') : t('common.no')}
                            </span>
                          </label>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!isActive}
                              onChange={() => handleToggleServiceField(service, 'isActive')}
                              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                              title={t('admin.isActive')}
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {isActive ? t('status.active') : t('status.inactive')}
                            </span>
                          </label>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditService(service)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id || service.Id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            {t('common.delete')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default AdditionalServicesSection;
