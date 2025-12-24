/*
 * ServicePricingModal - Modal for setting service pricing per company
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React from 'react';
import { X, Loader2 } from 'lucide-react';

const ServicePricingModal = ({
  t,
  isOpen,
  service,
  priceInput,
  basePrice,
  isMandatory,
  error,
  isSubmitting,
  onClose,
  onPriceChange,
  onMandatoryChange,
  onSubmit,
  currencySymbol = '$',
}) => {
  if (!isOpen || !service) return null;

  const serviceName = service.name || service.serviceName || 'Service';
  const serviceDescription = service.description || '';
  const pricingType = service.pricingType || 'per_day';

  const getPricingLabel = () => {
    switch (pricingType) {
      case 'per_day':
        return t('admin.perDay', '/ day');
      case 'per_rental':
        return t('admin.perRental', '/ rental');
      case 'one_time':
        return t('admin.oneTime', 'one-time');
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {t('admin.setServicePrice', 'Set Service Price')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Service Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">{serviceName}</h3>
            {serviceDescription && (
              <p className="text-sm text-gray-600 mt-1">{serviceDescription}</p>
            )}
            {basePrice > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {t('admin.suggestedPrice', 'Suggested price')}: {currencySymbol}{basePrice.toFixed(2)} {getPricingLabel()}
              </p>
            )}
          </div>

          {/* Price Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.yourPrice', 'Your Price')} {getPricingLabel()}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={priceInput}
                onChange={(e) => onPriceChange(e.target.value)}
                className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            {error && (
              <p className="text-red-500 text-xs mt-1">{error}</p>
            )}
          </div>

          {/* Mandatory Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium text-gray-900">
                {t('admin.mandatoryService', 'Mandatory Service')}
              </span>
              <p className="text-xs text-gray-500">
                {t('admin.mandatoryDesc', 'Customer must include this service in every booking')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isMandatory}
                onChange={(e) => onMandatoryChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Pricing Type Info */}
          <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
            <p>
              {pricingType === 'per_day' && t('admin.pricingPerDayInfo', 'This price will be charged for each day of the rental.')}
              {pricingType === 'per_rental' && t('admin.pricingPerRentalInfo', 'This price will be charged once per rental.')}
              {pricingType === 'one_time' && t('admin.pricingOneTimeInfo', 'This is a one-time fee added to the booking.')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting || !priceInput}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('admin.savePrice', 'Save Price')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServicePricingModal;
