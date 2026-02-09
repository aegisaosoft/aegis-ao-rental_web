/*
 * Field Suggestion Component
 * UI component for displaying individual field auto-fill suggestions
 *
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState } from 'react';
import { Check, X, ChevronRight, AlertTriangle, Zap, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Individual field suggestion component
 */
const FieldSuggestion = ({
  fieldName,
  fieldLabel,
  currentValue = '',
  suggestedValue,
  confidence,
  source,
  onAccept,
  onReject,
  onPreview,
  disabled = false,
  showDiff = true,
  className = ''
}) => {
  const { t } = useTranslation();
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  if (!suggestedValue || suggestedValue === currentValue) return null;

  const handleAccept = () => {
    onAccept?.(fieldName, suggestedValue);
  };

  const handleReject = () => {
    onReject?.(fieldName);
  };

  const handlePreview = () => {
    setIsPreviewActive(!isPreviewActive);
    onPreview?.(fieldName, isPreviewActive ? null : suggestedValue);
  };

  // Get confidence color
  const getConfidenceStyle = () => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-blue-600 bg-blue-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  // Get source icon
  const getSourceIcon = () => {
    if (source.includes('pdf417') || source.includes('barcode')) {
      return <Zap className="h-3 w-3 text-green-600" title="PDF417 Barcode" />;
    }
    return <Eye className="h-3 w-3 text-blue-600" title="OCR Scan" />;
  };

  return (
    <div className={`border rounded-lg p-3 bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">
            {fieldLabel || fieldName}
          </label>

          {/* Source indicator */}
          <div className="flex items-center gap-1">
            {getSourceIcon()}
          </div>

          {/* Confidence badge */}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceStyle()}`}>
            {Math.round(confidence * 100)}%
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {onPreview && (
            <button
              onClick={handlePreview}
              disabled={disabled}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                isPreviewActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title={t('license.preview', 'Preview')}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          )}

          <button
            onClick={handleAccept}
            disabled={disabled}
            className="p-1.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('common.accept', 'Accept')}
          >
            <Check className="h-3 w-3" />
          </button>

          <button
            onClick={handleReject}
            disabled={disabled}
            className="p-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('common.reject', 'Reject')}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Value comparison */}
      {showDiff && (
        <div className="space-y-2">
          {/* Current value */}
          {currentValue && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-16 flex-shrink-0">Current:</span>
              <span className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
                {currentValue || <em className="text-gray-400">empty</em>}
              </span>
            </div>
          )}

          {/* Suggested value */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16 flex-shrink-0">Suggested:</span>
            <span className={`text-sm font-mono px-2 py-1 rounded ${
              isPreviewActive
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-green-50 text-green-800'
            }`}>
              {suggestedValue}
            </span>
          </div>
        </div>
      )}

      {/* Low confidence warning */}
      {confidence < 0.6 && (
        <div className="mt-2 flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-yellow-800">
            {t('license.lowConfidenceWarning', 'Low confidence - please verify this value carefully')}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Batch suggestions component for multiple fields
 */
export const BatchFieldSuggestions = ({
  suggestions,
  fieldLabels = {},
  onAcceptAll,
  onRejectAll,
  onAcceptField,
  onRejectField,
  onPreviewField,
  disabled = false,
  className = ''
}) => {
  const { t } = useTranslation();

  if (!suggestions || Object.keys(suggestions).length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">
          {t('license.suggestedChanges', 'Suggested Changes')} ({Object.keys(suggestions).length})
        </h4>

        {/* Batch actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAcceptAll}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="h-3 w-3" />
            {t('common.acceptAll', 'Accept All')}
          </button>

          <button
            onClick={onRejectAll}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-3 w-3" />
            {t('common.rejectAll', 'Reject All')}
          </button>
        </div>
      </div>

      {/* Individual suggestions */}
      <div className="space-y-2">
        {Object.entries(suggestions).map(([fieldName, suggestion]) => (
          <FieldSuggestion
            key={fieldName}
            fieldName={fieldName}
            fieldLabel={fieldLabels[fieldName]}
            currentValue={suggestion.current}
            suggestedValue={suggestion.suggested}
            confidence={suggestion.confidence}
            source={suggestion.source}
            onAccept={onAcceptField}
            onReject={onRejectField}
            onPreview={onPreviewField}
            disabled={disabled}
            showDiff={true}
          />
        ))}
      </div>
    </div>
  );
};

export default FieldSuggestion;