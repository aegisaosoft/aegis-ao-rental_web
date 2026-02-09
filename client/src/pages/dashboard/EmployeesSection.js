/*
 * EmployeesSection - Self-contained employee management section
 * Includes search, list, add/edit modal functionality
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Plus, Edit, Trash2, ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Card, LoadingSpinner } from '../../components/common';
import { translatedApiService as apiService } from '../../services/translatedApi';
import { AddEmployeeModal } from './modals';

const EmployeesSection = ({
  currentCompanyId,
  isAuthenticated,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // ============== STATE ==============
  
  // Search & Pagination
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState(20);
  
  // Modal state
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedRole, setSelectedRole] = useState('worker');
  
  // Search customers state
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [isSettingEmployee, setIsSettingEmployee] = useState(false);

  // ============== QUERIES ==============

  // Fetch employees (customers with companyId and role != 'customer')
  const { data: customersResponse, isLoading: isLoadingCustomers, error: customersError } = useQuery(
    ['customers', currentCompanyId, customerPage, customerPageSize, customerSearch],
    () =>
      apiService.getCustomers({
        search: customerSearch || undefined,
        companyId: currentCompanyId,
        excludeRole: 'customer',
        page: customerPage,
        pageSize: customerPageSize,
      }),
    {
      enabled: isAuthenticated && !!currentCompanyId,
      keepPreviousData: true,
      onError: (error) => {
      },
    }
  );

  // ============== DATA PROCESSING ==============

  const customersData = useMemo(() => {
    const payload = customersResponse?.data || customersResponse;
    if (!payload) {
      return { items: [], totalCount: 0, page: customerPage, pageSize: customerPageSize };
    }

    if (payload.items && typeof payload.totalCount === 'number') {
      return {
        items: payload.items,
        totalCount: payload.totalCount,
        page: payload.page || customerPage,
        pageSize: payload.pageSize || customerPageSize,
      };
    }

    const items = Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []);
    const totalCount = payload?.totalCount || payload?.total || items.length;
    
    return {
      items,
      totalCount,
      page: customerPage,
      pageSize: customerPageSize,
    };
  }, [customersResponse, customerPage, customerPageSize]);

  const customers = customersData.items || [];
  const totalCustomers = customersData.totalCount || 0;
  const totalCustomerPages = Math.ceil(totalCustomers / customerPageSize) || 1;

  // ============== MUTATIONS ==============

  const updateCustomerMutation = useMutation(
    ({ customerId, data }) => apiService.updateCustomer(customerId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['customers', currentCompanyId]);
        setShowAddEmployeeModal(false);
        setEditingEmployeeId(null);
        setSelectedCustomer(null);
        setSelectedRole('worker');
      },
      onError: (error) => {
        toast.error(
          error.response?.data?.message ||
            error.response?.data?.error ||
            t('admin.employeeUpdateFailed', 'Failed to update employee.')
        );
      },
    }
  );

  // ============== HANDLERS ==============

  // Search customers by email/name (for add employee modal)
  const handleFindCustomers = useCallback(async (searchTerm) => {
    if (!searchTerm?.trim()) {
      toast.error(t('admin.enterEmailOrName', 'Please enter an email or name to search.'));
      return [];
    }

    setIsSearchingCustomers(true);
    try {
      const response = await apiService.getCustomers({
        search: searchTerm.trim(),
        page: 1,
        pageSize: 50,
      });
      
      const data = response?.data || response;
      const foundCustomers = data?.items || data || [];
      
      if (foundCustomers.length === 0) {
        toast.info(t('admin.noCustomersFound', 'No customers found matching your search.'));
      }
      
      return foundCustomers;
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          t('admin.customerSearchFailed', 'Failed to search for customers.')
      );
      return [];
    } finally {
      setIsSearchingCustomers(false);
    }
  }, [t]);

  // Handle edit employee
  const handleEditEmployee = useCallback((customer) => {
    const customerId = customer.customerId || customer.id || customer.CustomerId;
    let role = customer.role || customer.Role || 'worker';
    if (role === 'mainadmin' || role === 'customer') {
      role = 'worker';
    }
    setEditingEmployeeId(customerId);
    setSelectedCustomer(customer);
    setSelectedRole(role);
    setShowAddEmployeeModal(true);
  }, []);

  // Handle delete employee (sets role to customer and removes from company)
  const handleDeleteEmployee = useCallback(async (customer) => {
    const customerId = customer.customerId || customer.id || customer.CustomerId;
    const customerName = `${customer.firstName || customer.FirstName} ${customer.lastName || customer.LastName}`;
    
    if (!window.confirm(t('admin.confirmDeleteEmployee', `Are you sure you want to remove ${customerName} as an employee?`))) {
      return;
    }

    try {
      await updateCustomerMutation.mutateAsync({
        customerId,
        data: { role: 'customer' },
      });
    } catch (error) {
    }
  }, [t, updateCustomerMutation]);

  // Set employee (update role and companyId)
  const handleSetEmployee = useCallback(async ({ customerId, role }) => {
    if (!customerId) {
      toast.error(t('admin.invalidCustomerId', 'Invalid customer ID.'));
      return;
    }

    if (!role) {
      toast.error(t('admin.selectRole', 'Please select a role.'));
      return;
    }

    if (role !== 'customer' && !currentCompanyId) {
      toast.error(t('admin.companyIdRequired', 'Company ID is required for employee roles.'));
      return;
    }

    setIsSettingEmployee(true);
    try {
      const updateData = { role };
      if (role !== 'customer') {
        updateData.companyId = currentCompanyId;
      }

      await updateCustomerMutation.mutateAsync({ customerId, data: updateData });
    } catch (error) {
    } finally {
      setIsSettingEmployee(false);
    }
  }, [currentCompanyId, t, updateCustomerMutation]);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setShowAddEmployeeModal(false);
    setEditingEmployeeId(null);
    setSelectedCustomer(null);
    setSelectedRole('worker');
  }, []);

  // ============== RENDER ==============

  return (
    <>
      <Card title={t('admin.employees', 'Employees')}>
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <input
              type="text"
              className="input-field border border-gray-300"
              placeholder={t('admin.employeeSearch', 'Search by name or email')}
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setCustomerPage(1);
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary flex items-center gap-2"
                onClick={() => setShowAddEmployeeModal(true)}
              >
                <Plus className="h-4 w-4" />
                {t('admin.addEmployee', 'Add Employee')}
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setCustomerSearch('');
                  setCustomerPage(1);
                }}
                disabled={!customerSearch}
              >
                {t('admin.resetFilters', 'Reset Filters')}
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {`${totalCustomers} ${totalCustomers === 1 ? 'employee' : 'employees'}`}
          </div>
        </div>

        {isLoadingCustomers ? (
          <div className="py-8 text-center text-gray-500">
            <LoadingSpinner />
          </div>
        ) : customersError ? (
          <div className="py-8 text-center text-red-500">
            {t('admin.employeesLoadError', 'Unable to load employees.')}
          </div>
        ) : !customers.length ? (
          <div className="py-8 text-center text-gray-500">
            {t('admin.noEmployeesFound', 'No employees found.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.name', 'Name')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.email', 'Email')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.phone', 'Phone')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.location', 'Location')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.verified', 'Verified')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.role', 'Role')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.createdAt', 'Created')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => {
                  const role = customer.role || customer.Role || 'customer';
                  return (
                    <tr key={customer.customerId || customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {customer.firstName || customer.FirstName} {customer.lastName || customer.LastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {customer.email || customer.Email}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {customer.phone || customer.Phone || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {customer.city || customer.City || '-'}
                        {(customer.state || customer.State) && `, ${customer.state || customer.State}`}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            customer.isVerified || customer.IsVerified
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {customer.isVerified || customer.IsVerified
                            ? t('admin.verified', 'Verified')
                            : t('admin.notVerified', 'Not Verified')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            role === 'admin' || role === 'mainadmin'
                              ? 'bg-purple-100 text-purple-800'
                              : role === 'worker'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {customer.createdAt || customer.CreatedAt
                          ? new Date(customer.createdAt || customer.CreatedAt).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditEmployee(customer)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                            title={t('admin.editEmployee', 'Edit Employee')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(customer)}
                            className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                            title={t('admin.deleteEmployee', 'Remove Employee')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
              <div className="text-sm text-gray-600">
                {totalCustomers > 0
                  ? `Showing ${(customerPage - 1) * customerPageSize + 1}-${Math.min(customerPage * customerPageSize, totalCustomers)} of ${totalCustomers}`
                  : t('admin.showingRangeEmpty', 'No employees to display.')}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{t('admin.pageSize', 'Page Size')}</span>
                <select
                  value={customerPageSize}
                  onChange={(e) => {
                    setCustomerPageSize(Number(e.target.value) || 20);
                    setCustomerPage(1);
                  }}
                  className="input-field w-24"
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerPage(1)}
                  disabled={customerPage <= 1}
                  className="btn-outline px-2 py-1 disabled:opacity-50"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerPage((prev) => Math.max(prev - 1, 1))}
                  disabled={customerPage <= 1}
                  className="btn-outline px-2 py-1 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-600">
                  {customerPage} / {totalCustomerPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCustomerPage((prev) => Math.min(prev + 1, totalCustomerPages))}
                  disabled={customerPage >= totalCustomerPages}
                  className="btn-outline px-2 py-1 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerPage(totalCustomerPages)}
                  disabled={customerPage >= totalCustomerPages}
                  className="btn-outline px-2 py-1 disabled:opacity-50"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Add/Edit Employee Modal */}
      {showAddEmployeeModal && (
        <AddEmployeeModal
          t={t}
          editingEmployee={editingEmployeeId ? { id: editingEmployeeId, customer: selectedCustomer, role: selectedRole } : null}
          onClose={handleCloseModal}
          onSearch={handleFindCustomers}
          onSetEmployee={handleSetEmployee}
          isSearching={isSearchingCustomers}
          isSaving={isSettingEmployee}
        />
      )}
    </>
  );
};

export default EmployeesSection;
