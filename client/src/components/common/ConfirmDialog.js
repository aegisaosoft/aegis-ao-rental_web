/*
 * ConfirmDialog - Reusable confirmation dialog component
 * Replaces native window.confirm() with a styled centered modal
 *
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirm Action',
  message = 'Are you sure?',
  confirmText = 'Yes',
  cancelText = 'Cancel',
  icon: Icon = AlertTriangle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
            <Icon className="h-7 w-7 text-amber-600" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-500 text-center mb-6">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
