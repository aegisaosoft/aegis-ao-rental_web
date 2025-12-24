/*
 * EditVehicleModal - Modal for editing vehicle details
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';

const EditVehicleModal = ({
  t,
  vehicle,
  vehicleModels = [],
  locations = [],
  onClose,
  onSave,
  isSaving = false,
  currencySymbol = '$',
}) => {
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    color: '',
    licensePlate: '',
    vin: '',
    mileage: '',
    transmission: 'automatic',
    seats: '',
    status: 'available',
    locationId: '',
    dailyRate: '',
    imageUrl: '',
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Initialize form with vehicle data
  useEffect(() => {
    if (vehicle) {
      setFormData({
        make: vehicle.vehicleModel?.make || vehicle.make || '',
        model: vehicle.vehicleModel?.model || vehicle.model || '',
        year: vehicle.vehicleModel?.year || vehicle.year || '',
        color: vehicle.color || '',
        licensePlate: vehicle.licensePlate || '',
        vin: vehicle.vin || '',
        mileage: vehicle.mileage || '',
        transmission: vehicle.transmission || 'automatic',
        seats: vehicle.seats || '',
        status: vehicle.status || 'available',
        locationId: vehicle.locationId || '',
        dailyRate: vehicle.dailyRate || '',
        imageUrl: vehicle.imageUrl || '',
      });
      setImagePreview(vehicle.imageUrl);
    }
  }, [vehicle]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // TODO: Upload to server
    setIsUploadingImage(true);
    try {
      // Simulate upload - replace with actual upload logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      // setFormData(prev => ({ ...prev, imageUrl: uploadedUrl }));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  const statusOptions = [
    { value: 'available', label: t('vehicles.statusAvailable', 'Available') },
    { value: 'rented', label: t('vehicles.statusRented', 'Rented') },
    { value: 'maintenance', label: t('vehicles.statusMaintenance', 'Maintenance') },
    { value: 'unavailable', label: t('vehicles.statusUnavailable', 'Unavailable') },
  ];

  const transmissionOptions = [
    { value: 'automatic', label: t('vehicles.automatic', 'Automatic') },
    { value: 'manual', label: t('vehicles.manual', 'Manual') },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('vehicleDetail.editVehicle', 'Edit Vehicle')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Image */}
          <div className="flex items-start gap-6">
            <div className="w-48 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt="Vehicle" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Upload className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('vehicles.image', 'Vehicle Image')}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                disabled={isUploadingImage}
              />
              {isUploadingImage && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('common.uploading', 'Uploading...')}
                </div>
              )}
            </div>
          </div>

          {/* Make, Model, Year */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vehicles.make', 'Make')}
              </label>
              <input
                type="text"
                value={formData.make}
                onChange={(e) => handleChange('make', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('vehicles.make', 'Make')}
              />
            </div>
            <div className="col-span-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vehicles.model', 'Model')}
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('vehicles.model', 'Model')}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vehicles.year', 'Year')}
              </label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => handleChange('year', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="2024"
                min="1900"
                max="2100"
              />
            </div>
          </div>

          {/* Color & License Plate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vehicles.color', 'Color')}
              </label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('vehicles.color', 'Color')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vehicles.licensePlate', 'License Plate')} *
              </label>
              <input
                type="text"
                value={formData.licensePlate}
                onChange={(e) => handleChange('licensePlate', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ABC-1234"
                required
              />
            </div>
          </div>

          {/* VIN & Mileage */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vehicles.vin', 'VIN')}
              </label>
              <input
                type="text"
                value={formData.vin}
                onChange={(e) => handleChange('vin', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="1HGBH41JXMN109186"
                maxLength={17}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vehicles.mileage', 'Mileage')}
              </label>
              <input
                type="number"
                value={formData.mileage}
                onChange={(e) => handleChange('mileage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          {/* Transmission & Seats */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vehicles.transmission', 'Transmission')}
              </label>
              <select
                value={formData.transmission}
                onChange={(e) => handleChange('transmission', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {transmissionOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vehicles.seats', 'Seats')}
              </label>
              <input
                type="number"
                value={formData.seats}
                onChange={(e) => handleChange('seats', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="5"
                min="1"
                max="50"
              />
            </div>
          </div>

          {/* Status & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vehicles.status', 'Status')}
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('vehicles.location', 'Location')}
              </label>
              <select
                value={formData.locationId}
                onChange={(e) => handleChange('locationId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('vehicles.selectLocation', 'Select location...')}</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name || `${loc.city}, ${loc.state}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Daily Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('vehicles.dailyRate', 'Daily Rate')}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={formData.dailyRate}
                onChange={(e) => handleChange('dailyRate', e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            disabled={isSaving}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !formData.licensePlate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('common.save', 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditVehicleModal;
