/*
 * FieldMappingModal - Modal for mapping CSV columns to vehicle fields
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React from 'react';
import { X, FileSpreadsheet, AlertCircle } from 'lucide-react';

const FieldMappingModal = ({
  t,
  isOpen,
  headers = [],
  availableFields = [],
  fieldMapping = {},
  onClose,
  onFieldMap,
  onImport,
  isImporting = false,
}) => {
  if (!isOpen) return null;

  const mandatoryFields = availableFields.filter(f => f.mandatory);
  const missingMandatory = mandatoryFields.filter(f => {
    const value = fieldMapping[f.field];
    return value === undefined || value === null || value === '';
  });

  const handleFieldChange = (field, columnIndex) => {
    onFieldMap(field, columnIndex === '' ? undefined : parseInt(columnIndex, 10));
  };

  const handleImport = () => {
    if (missingMandatory.length > 0) {
      return; // Validation will show error states
    }
    
    // Build mapping object with valid values only
    const mapping = {};
    Object.keys(fieldMapping).forEach(field => {
      const value = fieldMapping[field];
      if (value !== undefined && value !== null && value !== '' && !isNaN(Number(value))) {
        mapping[field] = Number(value);
      }
    });
    
    onImport(mapping);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{t('vehicles.mapFields', 'Map CSV Columns to Fields')}</h2>
              <p className="text-sm text-gray-500">
                {headers.length} {t('vehicles.columnsDetected', 'columns detected')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800">
            {t('vehicles.mapFieldsDescription', 'Please map each CSV column to the corresponding field. Mandatory fields are marked with *.')}
          </p>
        </div>

        {/* Missing Fields Warning */}
        {missingMandatory.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">
                {t('vehicles.missingMandatoryFields', 'Missing mandatory fields')}
              </p>
              <p className="text-red-700 text-sm">
                {missingMandatory.map(f => f.label).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Field Mapping List */}
        <div className="space-y-4">
          {availableFields.map((field) => {
            const currentMapping = fieldMapping[field.field];
            const isMapped = currentMapping !== undefined && currentMapping !== null && currentMapping !== '';
            const isMandatoryUnmapped = field.mandatory && !isMapped;

            return (
              <div 
                key={field.field} 
                className={`flex items-center gap-4 p-3 rounded-lg ${
                  isMandatoryUnmapped ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                }`}
              >
                <label className={`w-48 font-medium ${isMandatoryUnmapped ? 'text-red-600' : 'text-gray-700'}`}>
                  {field.label}
                  {field.mandatory && <span className="text-red-500 ml-1">*</span>}
                  {field.defaultValue && (
                    <span className="text-gray-500 text-sm ml-2">
                      ({t('vehicles.default', 'default')}: {field.defaultValue})
                    </span>
                  )}
                </label>
                <select
                  value={currentMapping === undefined || currentMapping === null ? '' : currentMapping}
                  onChange={(e) => handleFieldChange(field.field, e.target.value)}
                  className={`flex-1 border rounded-lg px-3 py-2 ${
                    isMandatoryUnmapped
                      ? 'border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                >
                  <option value="">{t('vehicles.selectColumn', 'Select CSV column...')}</option>
                  {headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header} (Column {index + 1})
                    </option>
                  ))}
                </select>
                {isMapped && (
                  <span className="text-green-600 text-sm">✓</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Preview */}
        {headers.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">
              {t('vehicles.csvPreview', 'CSV Columns Preview')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {headers.map((header, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-white border border-gray-200 rounded text-sm"
                >
                  {index + 1}: {header}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isImporting}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || missingMandatory.length > 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isImporting 
              ? t('vehicles.importing', 'Importing...') 
              : t('vehicles.importWithMapping', 'Import with Mapping')
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldMappingModal;
