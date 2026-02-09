/*
 * License Auto-Fill Banner Component
 * UI component for showing auto-fill suggestions and controls
 *
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  FileText,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Eye,
  AlertOctagon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Banner component for license auto-fill functionality
 */
const LicenseAutoFillBanner = ({
  // Auto-fill data
  isAvailable,
  confidence,
  processingMethod,
  suggestionsCount,
  validationResult,

  // Callbacks
  onApplyAutoFill,
  onGenerateSuggestions,
  onViewDetails,
  onDismiss,

  // UI options
  showDetails = false,
  variant = 'suggestions', // 'suggestions', 'applied', 'validation'
  className = ''
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isAvailable || isDismissed) return null;

  // Determine banner style based on confidence and validation
  const getBannerStyle = () => {
    if (validationResult?.errors.length > 0) {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: AlertOctagon,
        iconColor: 'text-red-500',
        textColor: 'text-red-800'
      };
    }

    if (validationResult?.warnings.length > 0) {
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        icon: AlertTriangle,
        iconColor: 'text-yellow-500',
        textColor: 'text-yellow-800'
      };
    }

    if (confidence >= 0.8) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: CheckCircle,
        iconColor: 'text-green-500',
        textColor: 'text-green-800'
      };
    }

    if (confidence >= 0.6) {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: Sparkles,
        iconColor: 'text-blue-500',
        textColor: 'text-blue-800'
      };
    }

    return {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: FileText,
      iconColor: 'text-gray-500',
      textColor: 'text-gray-800'
    };
  };

  const style = getBannerStyle();
  const Icon = style.icon;

  // Get banner message based on state
  const getBannerMessage = () => {
    if (variant === 'applied') {
      return {
        title: t('license.autoFillApplied', 'License data applied'),
        description: `${suggestionsCount} fields were automatically filled from your scanned license (${Math.round(confidence * 100)}% confidence)`
      };
    }

    if (variant === 'validation') {
      const errorCount = validationResult?.errors.length || 0;
      const warningCount = validationResult?.warnings.length || 0;

      if (errorCount > 0) {
        return {
          title: t('license.validationErrors', 'Validation errors found'),
          description: `${errorCount} error${errorCount !== 1 ? 's' : ''} and ${warningCount} warning${warningCount !== 1 ? 's' : ''} detected`
        };
      }

      if (warningCount > 0) {
        return {
          title: t('license.validationWarnings', 'Please review'),
          description: `${warningCount} warning${warningCount !== 1 ? 's' : ''} found in the scanned data`
        };
      }

      return {
        title: t('license.validationPassed', 'Data looks good'),
        description: 'All scanned data passed validation checks'
      };
    }

    // Default: suggestions variant
    return {
      title: t('license.autoFillAvailable', 'License data detected'),
      description: `${suggestionsCount} fields can be auto-filled from your scanned license (${Math.round(confidence * 100)}% confidence)`
    };
  };

  const { title, description } = getBannerMessage();

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={`${style.bg} ${style.border} border rounded-lg p-4 mb-4 ${className}`}>
      {/* Main banner content */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Icon className={`h-5 w-5 ${style.iconColor} mt-0.5 flex-shrink-0`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`text-sm font-semibold ${style.textColor}`}>
                {title}
              </h4>

              {/* Processing method badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                processingMethod.includes('pdf417') || processingMethod.includes('barcode')
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {processingMethod.includes('pdf417') || processingMethod.includes('barcode') ? (
                  <>
                    <Zap className="h-3 w-3" />
                    PDF417 Barcode
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" />
                    OCR Scan
                  </>
                )}
              </span>
            </div>

            <p className={`text-sm ${style.textColor.replace('800', '600')}`}>
              {description}
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3">
              {variant === 'suggestions' && (
                <>
                  <button
                    onClick={onApplyAutoFill}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  >
                    {t('license.applyAutoFill', 'Apply Auto-Fill')}
                  </button>

                  <button
                    onClick={onGenerateSuggestions}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  >
                    {t('license.reviewChanges', 'Review Changes')}
                  </button>
                </>
              )}

              {onViewDetails && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Details
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title={t('common.dismiss', 'Dismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Confidence meter */}
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Data Quality</h5>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      confidence >= 0.8 ? 'bg-green-500' :
                      confidence >= 0.6 ? 'bg-blue-500' :
                      'bg-yellow-500'
                    }`}
                    style={{ width: `${confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600">
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Processing method details */}
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Scan Method</h5>
              <p className="text-gray-600">
                {processingMethod.includes('pdf417') || processingMethod.includes('barcode')
                  ? 'PDF417 barcode (high accuracy)'
                  : 'Optical Character Recognition (OCR)'
                }
              </p>
            </div>

            {/* Validation results */}
            {validationResult && (
              <div className="md:col-span-2">
                <h5 className="font-medium text-gray-900 mb-2">Validation Results</h5>

                {validationResult.errors.length > 0 && (
                  <div className="mb-2">
                    <h6 className="text-sm font-medium text-red-800 mb-1">Errors:</h6>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validationResult.errors.map((error, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationResult.warnings.length > 0 && (
                  <div className="mb-2">
                    <h6 className="text-sm font-medium text-yellow-800 mb-1">Warnings:</h6>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          {warning.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationResult.suggestions.length > 0 && (
                  <div>
                    <h6 className="text-sm font-medium text-blue-800 mb-1">Suggestions:</h6>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {validationResult.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          {suggestion.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LicenseAutoFillBanner;