/*
 * AddEmployeeModal - Modal for adding/editing employees
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const AddEmployeeModal = ({
  t,
  editingEmployee = null, // { id, customer, role } when editing
  onClose,
  onSearch,
  onSetEmployee,
  isSearching = false,
  isSaving = false,
}) => {
  const [searchEmail, setSearchEmail] = useState('');
  const [foundCustomers, setFoundCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedRole, setSelectedRole] = useState('worker');

  // Initialize when editing
  useEffect(() => {
    if (editingEmployee) {
      setSelectedCustomer(editingEmployee.customer);
      setSelectedRole(editingEmployee.role || 'worker');
    }
  }, [editingEmployee]);

  const handleClose = () => {
    setSearchEmail('');
    setFoundCustomers([]);
    setSelectedCustomer(null);
    setSelectedRole('worker');
    onClose();
  };

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    const results = await onSearch(searchEmail);
    setFoundCustomers(results || []);
  };

  const handleSubmit = () => {
    if (!selectedCustomer) return;
    onSetEmployee({
      customerId: selectedCustomer.customerId || selectedCustomer.id || selectedCustomer.CustomerId,
      role: selectedRole,
      isEditing: !!editingEmployee,
    });
  };

  const isEditing = !!editingEmployee;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? t('admin.editEmployee', 'Edit Employee') : t('admin.addEmployee', 'Add Employee')}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Show current employee info when editing */}
            {isEditing && selectedCustomer && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="font-medium text-gray-900 mb-1">
                  {selectedCustomer.firstName || selectedCustomer.FirstName} {selectedCustomer.lastName || selectedCustomer.LastName}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedCustomer.email || selectedCustomer.Email}
                </div>
                {(selectedCustomer.phone || selectedCustomer.Phone) && (
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedCustomer.phone || selectedCustomer.Phone}
                  </div>
                )}
              </div>
            )}

            {/* Search Section - only show when adding (not editing) */}
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.searchByEmailOrName', 'Search by Email or Name')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field flex-1"
                    placeholder={t('admin.enterEmailOrName', 'Enter email, first name, or last name')}
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={isSearching || !searchEmail.trim()}
                    className="btn-primary px-4 py-2 disabled:opacity-50"
                  >
                    {isSearching ? t('common.searching', 'Searching...') : t('common.find', 'Find')}
                  </button>
                </div>
              </div>
            )}

            {/* Found Customers List - only show when adding (not editing) */}
            {!isEditing && foundCustomers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.selectCustomer', 'Select Customer')}
                </label>
                <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                  {foundCustomers.map((customer) => {
                    const customerId = customer.customerId || customer.id || customer.CustomerId;
                    const isSelected = selectedCustomer && (
                      (selectedCustomer.customerId || selectedCustomer.id || selectedCustomer.CustomerId) === customerId
                    );
                    return (
                      <div
                        key={customerId}
                        onClick={() => setSelectedCustomer(customer)}
                        className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                          isSelected ? 'bg-blue-50 border-blue-300' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900">
                          {customer.firstName || customer.FirstName} {customer.lastName || customer.LastName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {customer.email || customer.Email}
                        </div>
                        {(customer.phone || customer.Phone) && (
                          <div className="text-xs text-gray-500">
                            {customer.phone || customer.Phone}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Role Selection */}
            {selectedCustomer && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.role', 'Role')}
                </label>
                <select
                  value={selectedRole === 'mainadmin' || selectedRole === 'customer' ? 'worker' : selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="worker">{t('admin.roleWorker', 'Worker')}</option>
                  <option value="admin">{t('admin.roleAdmin', 'Admin')}</option>
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="btn-outline px-4 py-2"
                disabled={isSaving}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedCustomer || isSaving}
                className="btn-primary px-4 py-2 disabled:opacity-50"
              >
                {isSaving
                  ? t('common.saving', 'Saving...')
                  : isEditing
                  ? t('admin.updateEmployee', 'Update Employee')
                  : t('admin.setEmployee', 'Set Employee')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
