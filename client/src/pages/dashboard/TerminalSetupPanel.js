/*
 * TerminalSetupPanel — Location & Reader management for Stripe Terminal
 * Allows each tenant to create locations, register and manage card readers
 *
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { MapPin, Smartphone, Plus, Pencil, Trash2, RefreshCw, Wifi, WifiOff, X } from 'lucide-react';
import apiService from '../../services/api';

// ============================================
// Location Form Modal
// ============================================
const LocationFormModal = ({ t, isOpen, onClose, onSubmit, isLoading, initialData = null }) => {
  const isEdit = !!initialData;
  const [form, setForm] = useState({
    displayName: initialData?.displayName || '',
    line1: initialData?.address?.line1 || '',
    line2: initialData?.address?.line2 || '',
    city: initialData?.address?.city || '',
    state: initialData?.address?.state || '',
    postalCode: initialData?.address?.postalCode || '',
    country: initialData?.address?.country || 'US',
  });

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.displayName || !form.line1 || !form.city || !form.state || !form.postalCode) {
      toast.error(t('terminal.setup.fillRequired', 'Please fill in all required fields'));
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                  {isEdit
                    ? t('terminal.setup.editLocation', 'Edit Location')
                    : t('terminal.setup.addLocation', 'Add Location')}
                </h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('terminal.setup.locationName', 'Location Name')} *
                  </label>
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(e) => handleChange('displayName', e.target.value)}
                    placeholder="e.g. Main Office"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('terminal.setup.addressLine1', 'Address Line 1')} *
                  </label>
                  <input
                    type="text"
                    value={form.line1}
                    onChange={(e) => handleChange('line1', e.target.value)}
                    placeholder="123 Main St"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('terminal.setup.addressLine2', 'Address Line 2 (optional)')}
                  </label>
                  <input
                    type="text"
                    value={form.line2}
                    onChange={(e) => handleChange('line2', e.target.value)}
                    placeholder="Suite 100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('terminal.setup.city', 'City')} *
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('terminal.setup.state', 'State')} *
                    </label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      placeholder="NJ"
                      maxLength={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('terminal.setup.postalCode', 'Postal Code')} *
                    </label>
                    <input
                      type="text"
                      value={form.postalCode}
                      onChange={(e) => handleChange('postalCode', e.target.value)}
                      placeholder="07716"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('terminal.setup.country', 'Country')} *
                    </label>
                    <select
                      value={form.country}
                      onChange={(e) => handleChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="NZ">New Zealand</option>
                      <option value="SG">Singapore</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isEdit ? t('common.save', 'Save') : t('common.create', 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Register Reader Modal
// ============================================
const RegisterReaderModal = ({ t, isOpen, onClose, onSubmit, isLoading, locations }) => {
  const [form, setForm] = useState({
    registrationCode: '',
    label: '',
    locationId: locations?.[0]?.id || '',
  });

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.registrationCode || !form.label || !form.locationId) {
      toast.error(t('terminal.setup.fillRequired', 'Please fill in all required fields'));
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-blue-600" />
                  {t('terminal.setup.registerReader', 'Register Reader')}
                </h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('terminal.setup.registrationCode', 'Registration Code')} *
                  </label>
                  <input
                    type="text"
                    value={form.registrationCode}
                    onChange={(e) => handleChange('registrationCode', e.target.value.replace(/\s/g, ''))}
                    placeholder="e.g. sepia-cerulean-delta"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t('terminal.setup.registrationCodeHelp', 'Enter the code displayed on your card reader screen')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('terminal.setup.readerLabel', 'Reader Label')} *
                  </label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => handleChange('label', e.target.value)}
                    placeholder="e.g. Front Desk Reader"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t('terminal.setup.readerLabelHelp', 'A friendly name for this reader (e.g., Front Desk)')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('terminal.setup.selectLocation', 'Location')} *
                  </label>
                  <select
                    value={form.locationId}
                    onChange={(e) => handleChange('locationId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  >
                    <option value="">{t('terminal.setup.selectLocationPlaceholder', '-- Select a location --')}</option>
                    {(locations || []).map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.displayName} — {loc.address?.city}, {loc.address?.state}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {t('terminal.setup.selectLocationHelp', 'Choose which location this reader will be assigned to')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {t('terminal.setup.register', 'Register')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Location Manager
// ============================================
const LocationManager = ({ t, currentCompanyId, isAuthenticated }) => {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);

  const { data: locationsData, isLoading } = useQuery(
    ['terminalLocations', currentCompanyId],
    async () => {
      const res = await apiService.getTerminalLocations(currentCompanyId);
      return res.data || res;
    },
    { enabled: isAuthenticated && !!currentCompanyId }
  );

  const locations = useMemo(() => {
    if (Array.isArray(locationsData)) return locationsData;
    return [];
  }, [locationsData]);

  const createMutation = useMutation(
    (data) => apiService.createTerminalLocation(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['terminalLocations']);
        setShowCreateModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('terminal.setup.locationCreateError', 'Failed to create location'));
      },
    }
  );

  const updateMutation = useMutation(
    ({ locationId, data }) => apiService.updateTerminalLocation(locationId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['terminalLocations']);
        setEditingLocation(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('terminal.setup.locationUpdateError', 'Failed to update location'));
      },
    }
  );

  const deleteMutation = useMutation(
    (locationId) => apiService.deleteTerminalLocation(locationId, currentCompanyId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['terminalLocations']);
        queryClient.invalidateQueries(['terminalReaders']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('terminal.setup.locationDeleteError', 'Failed to delete location'));
      },
    }
  );

  const handleCreate = (formData) => {
    createMutation.mutate({
      companyId: currentCompanyId,
      ...formData,
    });
  };

  const handleUpdate = (formData) => {
    updateMutation.mutate({
      locationId: editingLocation.id,
      data: { companyId: currentCompanyId, ...formData },
    });
  };

  const handleDelete = (location) => {
    if (window.confirm(t('terminal.setup.deleteLocationConfirm', 'Are you sure you want to delete this location? Readers assigned to it will need to be reassigned.'))) {
      deleteMutation.mutate(location.id);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-gray-900">
            {t('terminal.setup.locations', 'Locations')}
          </h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {locations.length}
          </span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          {t('terminal.setup.addLocation', 'Add Location')}
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {t('terminal.setup.noLocations', 'No locations configured. Create a location to register readers.')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{loc.displayName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {loc.address?.line1}
                      {loc.address?.line2 ? `, ${loc.address.line2}` : ''}
                      {' — '}
                      {loc.address?.city}, {loc.address?.state} {loc.address?.postalCode}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{loc.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingLocation(loc)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title={t('common.edit', 'Edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(loc)}
                    disabled={deleteMutation.isLoading}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title={t('common.delete', 'Delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <LocationFormModal
        t={t}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isLoading={createMutation.isLoading}
      />

      {/* Edit Modal */}
      {editingLocation && (
        <LocationFormModal
          t={t}
          isOpen={true}
          onClose={() => setEditingLocation(null)}
          onSubmit={handleUpdate}
          isLoading={updateMutation.isLoading}
          initialData={editingLocation}
        />
      )}
    </div>
  );
};

// ============================================
// Reader Manager
// ============================================
const ReaderManager = ({ t, currentCompanyId, isAuthenticated, locations }) => {
  const queryClient = useQueryClient();
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const { data: readersData, isLoading, refetch } = useQuery(
    ['terminalReaders', currentCompanyId],
    async () => {
      const res = await apiService.getTerminalReaders(currentCompanyId);
      return res.data || res;
    },
    { enabled: isAuthenticated && !!currentCompanyId }
  );

  const readers = useMemo(() => {
    if (Array.isArray(readersData)) return readersData;
    return [];
  }, [readersData]);

  const registerMutation = useMutation(
    (data) => apiService.registerTerminalReader(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['terminalReaders']);
        setShowRegisterModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('terminal.setup.readerRegisterError', 'Failed to register reader'));
      },
    }
  );

  const deleteMutation = useMutation(
    (readerId) => apiService.deleteTerminalReader(readerId, currentCompanyId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['terminalReaders']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('terminal.setup.readerDeleteError', 'Failed to remove reader'));
      },
    }
  );

  const handleRegister = (formData) => {
    registerMutation.mutate({
      companyId: currentCompanyId,
      ...formData,
    });
  };

  const handleDelete = (reader) => {
    if (window.confirm(t('terminal.setup.deleteReaderConfirm', 'Are you sure you want to remove this reader? It will need to be re-registered.'))) {
      deleteMutation.mutate(reader.id);
    }
  };

  // Build location name lookup
  const locationMap = useMemo(() => {
    const map = {};
    (locations || []).forEach((loc) => {
      map[loc.id] = loc.displayName;
    });
    return map;
  }, [locations]);

  const getStatusBadge = (status) => {
    if (status === 'online') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <Wifi className="h-3 w-3" />
          {t('terminal.setup.online', 'Online')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <WifiOff className="h-3 w-3" />
        {t('terminal.setup.offline', 'Offline')}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">
            {t('terminal.setup.readers', 'Readers')}
          </h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {readers.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={t('terminal.refresh', 'Refresh')}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (!locations || locations.length === 0) {
                toast.warning(t('terminal.setup.createLocationFirst', 'Please create a location first before registering a reader.'));
                return;
              }
              setShowRegisterModal(true);
            }}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {t('terminal.setup.registerReader', 'Register Reader')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : readers.length === 0 ? (
          <div className="text-center py-8">
            <Smartphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {t('terminal.setup.noReaders', 'No readers registered. Register a reader using its registration code.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    {t('terminal.setup.readerLabel', 'Label')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    {t('terminal.setup.deviceType', 'Device')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    {t('terminal.setup.serialNumber', 'Serial #')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    {t('terminal.history.status', 'Status')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    {t('terminal.setup.location', 'Location')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    {t('terminal.setup.ipAddress', 'IP Address')}
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">
                    {t('terminal.history.actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {readers.map((reader) => (
                  <tr key={reader.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{reader.label || '—'}</p>
                        <p className="text-xs text-gray-400 font-mono">{reader.id}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm text-gray-700">{reader.deviceType || '—'}</span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm text-gray-700 font-mono">{reader.serialNumber || '—'}</span>
                    </td>
                    <td className="py-3 px-2">
                      {getStatusBadge(reader.status)}
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm text-gray-700">
                        {locationMap[reader.locationId] || reader.locationId || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm text-gray-500 font-mono">{reader.ipAddress || '—'}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => handleDelete(reader)}
                        disabled={deleteMutation.isLoading}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title={t('common.delete', 'Delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Modal */}
      <RegisterReaderModal
        t={t}
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSubmit={handleRegister}
        isLoading={registerMutation.isLoading}
        locations={locations}
      />
    </div>
  );
};

// ============================================
// Main: TerminalSetupPanel
// ============================================
const TerminalSetupPanel = ({ currentCompanyId, isAuthenticated }) => {
  const { t } = useTranslation();

  // Shared locations data — used by both LocationManager (for display) and ReaderManager (for dropdown)
  const { data: locationsData } = useQuery(
    ['terminalLocations', currentCompanyId],
    async () => {
      const res = await apiService.getTerminalLocations(currentCompanyId);
      return res.data || res;
    },
    { enabled: isAuthenticated && !!currentCompanyId }
  );

  const locations = useMemo(() => {
    if (Array.isArray(locationsData)) return locationsData;
    return [];
  }, [locationsData]);

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <svg className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="text-sm text-blue-800 font-medium">
            {t('terminal.setup.infoTitle', 'Terminal Setup')}
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            {t('terminal.setup.infoDescription', 'Create locations for your business addresses, then register card readers to those locations. Each reader must be assigned to a location.')}
          </p>
        </div>
      </div>

      {/* Locations */}
      <LocationManager
        t={t}
        currentCompanyId={currentCompanyId}
        isAuthenticated={isAuthenticated}
      />

      {/* Readers */}
      <ReaderManager
        t={t}
        currentCompanyId={currentCompanyId}
        isAuthenticated={isAuthenticated}
        locations={locations}
      />
    </div>
  );
};

export default TerminalSetupPanel;
