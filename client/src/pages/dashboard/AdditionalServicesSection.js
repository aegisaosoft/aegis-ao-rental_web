/*
 * AdditionalServicesSection - Self-contained additional services management
 * Includes service listing, creation, editing, assignment to company
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Card, LoadingSpinner } from '../../components/common';
import { useCompany } from '../../context/CompanyContext';
import { translatedApiService as apiService } from '../../services/translatedApi';

// Helper to get consistent service identifier
const getServiceIdentifier = (service) =>
  service?.additionalServiceId || service?.AdditionalServiceId || service?.id || service?.Id;

const AdditionalServicesSection = ({
  currentCompanyId,
  isAuthenticated,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { formatPrice, currencySymbol, currencyCode } = useCompany();

  // ============== STATE ==============
  
  const [isEditingService, setIsEditingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editingCompanyServiceId, setEditingCompanyServiceId] = useState(null);
  const [editingServiceBaseInfo, setEditingServiceBaseInfo] = useState(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    description: '',
    price: '',
    serviceType: 'Other',
    isMandatory: false,
    maxQuantity: 1,
    isActive: true
  });
  const [assignmentOverrides] = useState({});

  // ============== QUERIES ==============

  // Fetch all additional services (not filtered by company - to show full list)
  const { data: allAdditionalServicesResponse, isLoading: isLoadingAllServices } = useQuery(
    ['allAdditionalServices'],
    () => apiService.getAdditionalServices({}),
    {
      enabled: isAuthenticated && !!currentCompanyId,
      onError: (error) => {
        console.error('Error loading all additional services:', error);
      }
    }
  );

  // Fetch company services for current company (to know which services are assigned)
  const { data: companyServicesResponse, isLoading: isLoadingCompanyServices } = useQuery(
    ['companyServices', currentCompanyId],
    () => apiService.getCompanyServices(currentCompanyId),
    {
      enabled: isAuthenticated && !!currentCompanyId,
      onError: (error) => {
        console.error('Error loading company services:', error);
      }
    }
  );

  // ============== DATA PROCESSING ==============

  const allAdditionalServices = allAdditionalServicesResponse?.data || allAdditionalServicesResponse || [];
  
  const companyServices = useMemo(() => {
    const raw = companyServicesResponse?.data || companyServicesResponse || [];
    return Array.isArray(raw) ? raw : [];
  }, [companyServicesResponse]);

  const assignedServiceIds = useMemo(() => new Set(
    companyServices.map((cs) => getServiceIdentifier(cs))
  ), [companyServices]);

  const companyServicesMap = useMemo(() => {
    const map = new Map();
    if (!companyServices || companyServices.length === 0) return map;

    companyServices.forEach((cs) => {
      const id = getServiceIdentifier(cs);
      if (id && !map.has(id)) {
        map.set(id, cs);
      }
    });

    return map;
  }, [companyServices]);

  const isLoadingServices = isLoadingAllServices || isLoadingCompanyServices;

  // ============== MUTATIONS ==============

  // Create new additional service
  const createServiceMutation = useMutation(
    (data) => apiService.createAdditionalService({ ...data, companyId: currentCompanyId }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['allAdditionalServices']);
        queryClient.invalidateQueries(['companyServices', currentCompanyId]);
        resetForm();
        toast.success(t('admin.serviceCreated', 'Service created successfully'));
      },
      onError: (error) => {
        console.error('Error creating service:', error);
        toast.error(error.response?.data?.message || t('admin.serviceCreateFailed', 'Failed to create service'));
      }
    }
  );

  // Update base additional service
  const updateAdditionalServiceMutation = useMutation(
    ({ serviceId, data }) => apiService.updateAdditionalService(serviceId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['allAdditionalServices']);
        queryClient.invalidateQueries(['companyServices', currentCompanyId]);
        resetForm();
        toast.success(t('admin.serviceUpdated', 'Service updated successfully'));
      },
      onError: (error) => {
        console.error('Error updating additional service:', error);
        toast.error(error.response?.data?.message || t('admin.serviceUpdateFailed', 'Failed to update service'));
      }
    }
  );

  // Update company-specific service settings
  const updateCompanyServiceMutation = useMutation(
    ({ companyId, serviceId, data }) => apiService.updateCompanyService(companyId, serviceId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companyServices', currentCompanyId]);
        queryClient.invalidateQueries(['allAdditionalServices']);
        resetForm();
        toast.success(t('admin.serviceUpdated', 'Service updated successfully'));
      },
      onError: (error) => {
        console.error('Error updating company service:', error);
        toast.error(error.response?.data?.message || t('admin.serviceUpdateFailed', 'Failed to update service'));
      }
    }
  );

  // Delete additional service
  const deleteServiceMutation = useMutation(
    (serviceId) => apiService.deleteAdditionalService(serviceId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['allAdditionalServices']);
        queryClient.invalidateQueries(['companyServices', currentCompanyId]);
        toast.success(t('admin.serviceDeleted', 'Service deleted successfully'));
      },
      onError: (error) => {
        console.error('Error deleting service:', error);
        toast.error(t('admin.serviceDeleteFailed', 'Failed to delete service'));
      }
    }
  );

  // ============== HELPERS ==============

  const formatRate = useCallback((value, options = {}) => {
    const currency = options.currency || currencyCode || 'USD';
    return formatPrice(value, currency);
  }, [formatPrice, currencyCode]);

  const resetForm = useCallback(() => {
    setIsEditingService(false);
    setEditingServiceId(null);
    setEditingCompanyServiceId(null);
    setEditingServiceBaseInfo(null);
    setServiceFormData({
      name: '',
      description: '',
      price: '',
      serviceType: 'Other',
      isMandatory: false,
      maxQuantity: 1,
      isActive: true
    });
  }, []);

  // ============== HANDLERS ==============

  const handleAddService = useCallback(() => {
    setIsEditingService(true);
    setEditingServiceId(null);
    setEditingCompanyServiceId(null);
    setEditingServiceBaseInfo(null);
    setServiceFormData({
      name: '',
      description: '',
      price: '',
      serviceType: 'Other',
      isMandatory: false,
      maxQuantity: 1,
      isActive: true
    });
  }, []);

  const handleServiceInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setServiceFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const handleCancelServiceEdit = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const handleEditService = useCallback((service, companyServiceId = null) => {
    const serviceId = getServiceIdentifier(service);
    setIsEditingService(true);
    setEditingServiceId(serviceId);
    setEditingCompanyServiceId(companyServiceId);
    setEditingServiceBaseInfo(service);
    
    if (companyServiceId && companyServicesMap) {
      const companyService = companyServicesMap.get(serviceId);
      setServiceFormData({
        name: service.name || service.Name || '',
        description: service.description || service.Description || '',
        price: companyService?.price || companyService?.Price || service.price || service.Price || '',
        serviceType: service.serviceType || service.ServiceType || 'Other',
        isMandatory: companyService?.isMandatory ?? companyService?.IsMandatory ?? service.isMandatory ?? false,
        maxQuantity: companyService?.maxQuantity || companyService?.MaxQuantity || service.maxQuantity || 1,
        isActive: companyService?.isActive ?? companyService?.IsActive ?? true
      });
    } else {
      setServiceFormData({
        name: service.name || service.Name || '',
        description: service.description || service.Description || '',
        price: service.price || service.Price || '',
        serviceType: service.serviceType || service.ServiceType || 'Other',
        isMandatory: service.isMandatory ?? service.IsMandatory ?? false,
        maxQuantity: service.maxQuantity || service.MaxQuantity || 1,
        isActive: service.isActive ?? service.IsActive ?? true
      });
    }
  }, [companyServicesMap]);

  const handleSaveService = useCallback(async (e) => {
    e.preventDefault();
    
    const serviceData = {
      name: serviceFormData.name,
      description: serviceFormData.description || null,
      price: serviceFormData.price ? parseFloat(serviceFormData.price) : 0,
      serviceType: serviceFormData.serviceType || 'Other',
      isMandatory: serviceFormData.isMandatory || false,
      maxQuantity: serviceFormData.maxQuantity || 1,
      isActive: serviceFormData.isActive ?? true
    };

    if (editingCompanyServiceId) {
      updateCompanyServiceMutation.mutate({
        companyId: currentCompanyId,
        serviceId: editingCompanyServiceId,
        data: serviceData
      });
    } else if (editingServiceId) {
      updateAdditionalServiceMutation.mutate({ serviceId: editingServiceId, data: serviceData });
    } else {
      createServiceMutation.mutate({ ...serviceData, companyId: currentCompanyId });
    }
  }, [serviceFormData, editingCompanyServiceId, editingServiceId, currentCompanyId, 
      updateCompanyServiceMutation, updateAdditionalServiceMutation, createServiceMutation]);

  const handleDeleteService = useCallback(async (serviceId) => {
    if (!window.confirm(t('admin.confirmDeleteService', 'Are you sure you want to delete this service?'))) {
      return;
    }
    deleteServiceMutation.mutate(serviceId);
  }, [deleteServiceMutation, t]);

  const handleToggleServiceAssignment = useCallback(async (service) => {
    const serviceId = getServiceIdentifier(service);
    if (!serviceId) {
      console.error('No service ID found for service:', service);
      return;
    }

    const baseAssigned = assignedServiceIds.has(serviceId);
    const hasOverride = Object.prototype.hasOwnProperty.call(assignmentOverrides, serviceId);
    const isCurrentlyAssigned = hasOverride ? assignmentOverrides[serviceId] : baseAssigned;

    try {
      if (isCurrentlyAssigned) {
        await apiService.unassignServiceFromCompany(currentCompanyId, serviceId);
        queryClient.invalidateQueries(['companyServices', currentCompanyId]);
      } else {
        await apiService.assignServiceToCompany(currentCompanyId, serviceId, {
          price: service.price || service.Price || 0,
          isMandatory: service.isMandatory ?? service.IsMandatory ?? false,
          isActive: true
        });
        queryClient.invalidateQueries(['companyServices', currentCompanyId]);
      }
    } catch (error) {
      console.error('Error toggling service assignment:', error);
      toast.error(t('admin.serviceAssignmentFailed', 'Failed to update service assignment'));
    }
  }, [currentCompanyId, assignedServiceIds, assignmentOverrides, queryClient, t]);

  const handleToggleServiceField = useCallback(async (service, field) => {
    const serviceId = getServiceIdentifier(service);
    if (!serviceId) return;

    const companyService = companyServicesMap.get(serviceId);
    const currentValue = companyService?.[field] ?? companyService?.[field.charAt(0).toUpperCase() + field.slice(1)] ?? false;

    try {
      await apiService.updateCompanyService(currentCompanyId, serviceId, {
        [field]: !currentValue
      });
      queryClient.invalidateQueries(['companyServices', currentCompanyId]);
    } catch (error) {
      console.error(`Error toggling ${field}:`, error);
      toast.error(t('admin.serviceUpdateFailed', 'Failed to update service'));
    }
  }, [currentCompanyId, companyServicesMap, queryClient, t]);

  // ============== RENDER ==============

  return (
    <Card 
      title={t('admin.additionalServices', 'Additional Services')}
      headerActions={
        !isEditingService && (
          <button
            onClick={handleAddService}
            className="btn-primary text-sm"
          >
            + {t('admin.addService', 'Add Service')}
          </button>
        )
      }
    >
      <div className="space-y-6">
        {isEditingService ? (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingServiceId ? t('admin.editService', 'Edit Service') : t('admin.addService', 'Add Service')}
            </h3>
            <form onSubmit={handleSaveService} className="space-y-4">
              {editingCompanyServiceId ? (
                // Editing company service - show base info as read-only
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.serviceName', 'Service Name')}
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
                      {t('admin.serviceDescription', 'Description')}
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
                      {t('admin.serviceType', 'Service Type')}
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
                      {t('admin.maxQuantity', 'Max Quantity')}
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
                      {t('admin.servicePrice', 'Price')} ({t('admin.companyPrice', 'Company Price')} · {currencySymbol}{currencyCode})
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
                      {t('admin.companyPriceHint', 'Your company-specific price')} ({currencySymbol}{currencyCode})
                    </p>
                  </div>
                </div>
              ) : (
                // Creating new additional service - show all fields
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.serviceName', 'Service Name')} *
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
                      {t('admin.serviceDescription', 'Description')}
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
                      {t('admin.serviceType', 'Service Type')} *
                    </label>
                    <select
                      name="serviceType"
                      value={serviceFormData.serviceType}
                      onChange={handleServiceInputChange}
                      className="input-field"
                      required
                    >
                      <option value="">{t('admin.selectServiceType', 'Select type')}</option>
                      <option value="per_day">{t('admin.perDay', 'Per Day')}</option>
                      <option value="per_rental">{t('admin.perRental', 'Per Rental')}</option>
                      <option value="one_time">{t('admin.oneTime', 'One Time')}</option>
                      <option value="Other">{t('admin.other', 'Other')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.servicePrice', 'Price')} ({currencySymbol}{currencyCode})
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={serviceFormData.price}
                      onChange={handleServiceInputChange}
                      className="input-field"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.maxQuantity', 'Max Quantity')}
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

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isMandatory"
                        checked={serviceFormData.isMandatory}
                        onChange={handleServiceInputChange}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{t('admin.isMandatory', 'Mandatory')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={serviceFormData.isActive}
                        onChange={handleServiceInputChange}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{t('admin.isActive', 'Active')}</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancelServiceEdit}
                  className="btn-outline"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createServiceMutation.isLoading || updateAdditionalServiceMutation.isLoading || updateCompanyServiceMutation.isLoading}
                >
                  {t('common.save', 'Save')}
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
                {t('admin.noServices', 'No services available')}
              </p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.assigned', 'Assigned')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.serviceName', 'Service Name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.serviceType', 'Type')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.servicePrice', 'Price')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.maxQuantity', 'Max Qty')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.isMandatory', 'Mandatory')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.isActive', 'Active')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allAdditionalServices.map((service) => {
                    const serviceId = getServiceIdentifier(service);
                    const baseAssigned = assignedServiceIds.has(serviceId);
                    const hasOverride = Object.prototype.hasOwnProperty.call(assignmentOverrides, serviceId);
                    const isAssigned = hasOverride ? assignmentOverrides[serviceId] : baseAssigned;
                    const companyServiceRaw = companyServicesMap.get(serviceId);
                    const companyService = isAssigned ? companyServiceRaw : null;
                    const basePrice = service.price !== undefined && service.price !== null ? service.price : service.Price ?? 0;
                    const companyPrice = companyService && (companyService.price ?? companyService.Price ?? basePrice);
                    const displayPrice = isAssigned ? companyPrice ?? basePrice : basePrice;
                    const formattedPrice = isAssigned ? formatRate(displayPrice) : formatRate(displayPrice, { currency: 'USD' });
                    const displayMaxQuantity = isAssigned
                      ? companyService?.maxQuantity ?? companyService?.MaxQuantity ?? service.maxQuantity ?? service.MaxQuantity ?? 1
                      : service.maxQuantity || service.MaxQuantity || 1;
                    const isMandatory = isAssigned
                      ? companyService?.isMandatory ?? companyService?.IsMandatory ?? false
                      : service.isMandatory ?? service.IsMandatory ?? false;
                    const isActive = isAssigned
                      ? companyService?.isActive ?? companyService?.IsActive ?? true
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
                              title={isAssigned ? t('admin.removeFromCompany', 'Remove from company') : t('admin.addToCompany', 'Add to company')}
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
                              disabled={!isAssigned}
                              title={t('admin.isMandatory', 'Mandatory')}
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {isMandatory ? t('common.yes', 'Yes') : t('common.no', 'No')}
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
                              disabled={!isAssigned}
                              title={t('admin.isActive', 'Active')}
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {isActive ? t('status.active', 'Active') : t('status.inactive', 'Inactive')}
                            </span>
                          </label>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditService(service, isAssigned ? serviceId : null)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            {t('common.edit', 'Edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id || service.Id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            {t('common.delete', 'Delete')}
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
