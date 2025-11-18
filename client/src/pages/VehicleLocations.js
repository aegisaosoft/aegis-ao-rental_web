import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { translatedApiService as apiService } from '../services/translatedApi';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const VehicleLocations = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isAdmin, canAccessDashboard, currentCompanyId: authCompanyId, loading: authLoading } = useAuth();
  const { companyConfig, companyId: contextCompanyId, loading: companyLoading } = useCompany();
  const queryClient = useQueryClient();
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [draggedVehicle, setDraggedVehicle] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedVehicles, setSelectedVehicles] = useState(new Set());
  
  // Filter states
  const [filterMake, setFilterMake] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterLicensePlate, setFilterLicensePlate] = useState('');

  // Get company ID from global contexts: 1) URL param (for explicit selection), 2) AuthContext, 3) CompanyContext
  const companyIdFromUrl = searchParams.get('companyId');
  const currentCompanyId = companyIdFromUrl || authCompanyId || contextCompanyId;


  // Redirect if not authenticated or not admin (only after loading is complete)
  useEffect(() => {
    // Wait for auth and company contexts to finish loading
    if (authLoading || companyLoading) {
      console.log('[VehicleLocations] Waiting for contexts to load...', {
        authLoading,
        companyLoading
      });
      return;
    }

    // Mark that we've checked auth (prevents flash of error messages)
    if (!authChecked) {
      setAuthChecked(true);
    }

    console.log('[VehicleLocations] Auth Check:', {
      isAuthenticated,
      isAdmin,
      canAccessDashboard,
      user,
      currentCompanyId,
      companyConfig
    });

    // Only show errors and redirect after auth has loaded
    if (!authLoading && !isAuthenticated) {
      console.log('[VehicleLocations] Not authenticated, redirecting to login');
      toast.error(t('auth.loginRequired', 'Please login to access this page'));
      navigate('/login');
      return;
    }

    if (!authLoading && !canAccessDashboard) {
      console.log('[VehicleLocations] No dashboard access, redirecting to home');
      toast.error(t('auth.adminRequired', 'Admin access required'));
      navigate('/');
      return;
    }

    if (!authLoading && !companyLoading && !currentCompanyId) {
      console.log('[VehicleLocations] No company ID, redirecting to admin dashboard');
      toast.error(t('auth.noCompany', 'No company selected'));
      navigate('/admin-dashboard');
      return;
    }
  }, [isAuthenticated, isAdmin, canAccessDashboard, currentCompanyId, navigate, t, authLoading, companyLoading, authChecked, user, companyConfig]);

  // Fetch all locations - only after auth is ready
  const { data: locationsData, isLoading: locationsLoading } = useQuery(
    ['pickupLocations', currentCompanyId],
    async () => {
      console.log('[VehicleLocations] Fetching locations for company:', currentCompanyId);
      const result = await apiService.getPickupLocations(currentCompanyId);
      console.log('[VehicleLocations] Locations API response:', result);
      return result;
    },
    {
      enabled: !!currentCompanyId && !authLoading && !companyLoading && isAuthenticated && canAccessDashboard,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000 // 10 minutes
    }
  );

  // Fetch all vehicles - only after auth is ready
  // Log the conditions for vehicles query
  console.log('[VehicleLocations] 🚗 Vehicles query enabled conditions:', {
    currentCompanyId: !!currentCompanyId,
    authLoading: authLoading,
    companyLoading: companyLoading,
    isAuthenticated: isAuthenticated,
    isAdmin: isAdmin,
    canAccessDashboard: canAccessDashboard,
    '✅ ENABLED': !!currentCompanyId && !authLoading && !companyLoading && isAuthenticated && canAccessDashboard
  });

  const { data: vehiclesData, isLoading: vehiclesLoading, error: vehiclesError } = useQuery(
    ['vehicles', 'all', currentCompanyId],
    async () => {
      console.log('[VehicleLocations] 🚗 Fetching vehicles with params:', {
        page: 1,
        pageSize: 1000,
        companyId: currentCompanyId
      });
      
      const result = await apiService.getVehicles({
        page: 1,
        pageSize: 1000,
        companyId: currentCompanyId
      });
      
      console.log('[VehicleLocations] 🚗 Vehicles API RAW response:', result);
      console.log('[VehicleLocations] 🚗 Response type:', typeof result);
      console.log('[VehicleLocations] 🚗 Response keys:', result ? Object.keys(result) : 'null');
      
      // Log the full structure
      if (result && typeof result === 'object') {
        Object.keys(result).forEach(key => {
          console.log(`[VehicleLocations] 🚗   - ${key}:`, typeof result[key], Array.isArray(result[key]) ? `(array of ${result[key].length})` : '');
        });
      }
      
      return result;
    },
    {
      enabled: !!currentCompanyId && !authLoading && !companyLoading && isAuthenticated && canAccessDashboard,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      onError: (error) => {
        console.error('[VehicleLocations] ❌ Vehicles API error:', error);
        console.error('[VehicleLocations] ❌ Error response:', error.response?.data);
      }
    }
  );

  // Unwrap the API responses - translatedApiService can return various formats
  // Handle: Axios response, direct array, {items: []}, {data: []}, {data: {items: []}}, paginated response, etc.
  const unwrapArray = (data, label) => {
    console.log(`[VehicleLocations] Unwrapping ${label}:`, data);
    
    // Already an array
    if (Array.isArray(data)) {
      console.log(`[VehicleLocations] ${label} is direct array:`, data.length);
      return data;
    }
    
    // No data
    if (!data) {
      console.log(`[VehicleLocations] ${label} is null/undefined`);
      return [];
    }
    
    // Check if this is an Axios response object (has status, statusText, headers, config, request)
    if (data.status && data.statusText && data.headers && data.config && data.data) {
      console.log(`[VehicleLocations] ${label} is Axios response, extracting data property`);
      console.log(`[VehicleLocations] ${label} Axios data.data type:`, typeof data.data, Array.isArray(data.data) ? `(array of ${data.data.length})` : '');
      console.log(`[VehicleLocations] ${label} Axios data.data keys:`, data.data ? Object.keys(data.data) : 'null');
      console.log(`[VehicleLocations] ${label} Axios data.data.items:`, data.data?.items ? `array of ${data.data.items.length}` : 'not found');
      // Recursively unwrap the actual data
      return unwrapArray(data.data, label);
    }
    
    // Check for paginated response format: {items: [], page: 1, pageSize: 10, totalCount: 50, ...}
    if (data.items && Array.isArray(data.items)) {
      console.log(`[VehicleLocations] ${label} has items array (paginated):`, data.items.length, 'of', data.totalCount || 'unknown');
      return data.items;
    }
    
    // Check for paginated response format: {vehicles: [], page: 1, pageSize: 10, totalCount: 50, ...}
    if (data.vehicles && Array.isArray(data.vehicles)) {
      console.log(`[VehicleLocations] ${label} has vehicles array (paginated):`, data.vehicles.length, 'of', data.totalCount || 'unknown');
      return data.vehicles;
    }
    
    // Check for {data: [...]} format (not Axios response)
    if (data.data && !data.status) {
      if (Array.isArray(data.data)) {
        console.log(`[VehicleLocations] ${label} has data array:`, data.data.length);
        return data.data;
      }
      // Nested: {data: {items: []}}
      if (data.data.items && Array.isArray(data.data.items)) {
        console.log(`[VehicleLocations] ${label} has data.items array:`, data.data.items.length);
        return data.data.items;
      }
    }
    
    // Check for {result: [...]} or {result: {items: []}}
    if (data.result) {
      if (Array.isArray(data.result)) {
        console.log(`[VehicleLocations] ${label} has result array:`, data.result.length);
        return data.result;
      }
      if (data.result.items && Array.isArray(data.result.items)) {
        console.log(`[VehicleLocations] ${label} has result.items array:`, data.result.items.length);
        return data.result.items;
      }
    }
    
    // Unknown format - log all keys to help debug
    console.warn(`[VehicleLocations] ${label} unknown format. Keys:`, Object.keys(data));
    console.warn(`[VehicleLocations] ${label} full object:`, data);
    return [];
  };
  
  const locations = unwrapArray(locationsData, 'locations');
  const allVehicles = unwrapArray(vehiclesData, 'vehicles');

  console.log('[VehicleLocations] ✅ Final arrays:', {
    locations: locations.length,
    vehicles: allVehicles.length,
    locationsIsArray: Array.isArray(locations),
    vehiclesIsArray: Array.isArray(allVehicles)
  });

  // Update vehicle location mutation
  const updateLocationMutation = useMutation(
    ({ vehicleId, locationId }) => {
      return apiService.updateVehicle(vehicleId, { locationId });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vehicles']);
      },
      onError: (error) => {
        console.error('Error updating vehicle location:', error);
        
        // Check if it's an authentication error
        if (error.response?.status === 401) {
          toast.error(t('auth.sessionExpired', 'Your session has expired. Please login again.'));
          navigate('/login');
          return;
        }
        
        toast.error(t('admin.vehicleLocationUpdateFailed', 'Failed to update vehicle location'));
      }
    }
  );

  // Selection handlers
  const toggleVehicleSelection = (vehicleId) => {
    setSelectedVehicles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vehicleId)) {
        newSet.delete(vehicleId);
      } else {
        newSet.add(vehicleId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedVehicles(new Set());
  };

  // Batch move selected vehicles to a location
  const moveSelectedVehicles = async (locationId, fromPanel = 'all') => {
    if (selectedVehicles.size === 0) return;
    
    // Determine which vehicles to move based on the panel
    let vehiclesToMove = Array.from(selectedVehicles);
    
    if (fromPanel === 'unassigned') {
      // Only move vehicles that are currently unassigned
      const unassignedVehicleIds = vehiclesWithoutLocationAll.map(v => 
        v.vehicleId || v.VehicleId || v.id || v.Id
      );
      vehiclesToMove = vehiclesToMove.filter(id => unassignedVehicleIds.includes(id));
    } else if (fromPanel === 'location') {
      // Only move vehicles that are currently in the selected location
      const locationVehicleIds = vehiclesInLocationAll.map(v => 
        v.vehicleId || v.VehicleId || v.id || v.Id
      );
      vehiclesToMove = vehiclesToMove.filter(id => locationVehicleIds.includes(id));
    }
    
    if (vehiclesToMove.length === 0) return;
    
    const promises = vehiclesToMove.map(vehicleId =>
      apiService.updateVehicle(vehicleId, { locationId })
    );
    
    try {
      await Promise.all(promises);
      queryClient.invalidateQueries(['vehicles']);
      clearSelection();
    } catch (error) {
      console.error('Error moving vehicles:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        toast.error(t('auth.sessionExpired', 'Your session has expired. Please login again.'));
        navigate('/login');
        return;
      }
      
      toast.error(t('admin.vehiclesMoveFailed', 'Failed to move some vehicles'));
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, vehicle) => {
    setDraggedVehicle(vehicle);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnAllVehicles = (e) => {
    e.preventDefault();
    if (draggedVehicle) {
      updateLocationMutation.mutate({
        vehicleId: draggedVehicle.vehicleId || draggedVehicle.VehicleId || draggedVehicle.id || draggedVehicle.Id,
        locationId: null
      });
      setDraggedVehicle(null);
    }
  };

  const handleDropOnLocation = (e, locationId) => {
    e.preventDefault();
    if (draggedVehicle) {
      updateLocationMutation.mutate({
        vehicleId: draggedVehicle.vehicleId || draggedVehicle.VehicleId || draggedVehicle.id || draggedVehicle.Id,
        locationId: locationId
      });
      setDraggedVehicle(null);
    }
  };

  // Apply filters to vehicles
  const applyFilters = (vehicles) => {
    return vehicles.filter(v => {
      const vehicleMake = (v.Make || v.make || '').toLowerCase();
      const vehicleModel = (v.Model || v.model || '').toLowerCase();
      const vehicleLicensePlate = (v.LicensePlate || v.licensePlate || '').toLowerCase();
      
      const matchesMake = !filterMake || vehicleMake === filterMake.toLowerCase();
      const matchesModel = !filterModel || vehicleModel === filterModel.toLowerCase();
      const matchesLicensePlate = !filterLicensePlate || vehicleLicensePlate.includes(filterLicensePlate.toLowerCase());
      
      return matchesMake && matchesModel && matchesLicensePlate;
    });
  };

  // Filter vehicles - ensure allVehicles is an array before filtering
  const vehiclesWithoutLocationAll = Array.isArray(allVehicles) 
    ? allVehicles.filter(v => !v.locationId)
    : [];
    
  const vehiclesInLocationAll = selectedLocationId && Array.isArray(allVehicles)
    ? allVehicles.filter(v => v.locationId === selectedLocationId)
    : [];

  // Apply user filters
  const vehiclesWithoutLocation = applyFilters(vehiclesWithoutLocationAll);
  const vehiclesInLocation = applyFilters(vehiclesInLocationAll);

  // Extract unique makes and models for filters
  const uniqueMakes = Array.isArray(allVehicles)
    ? [...new Set(allVehicles.map(v => v.Make || v.make).filter(Boolean))].sort()
    : [];

  const filteredModels = useMemo(() => {
    if (Array.isArray(allVehicles) && filterMake) {
      return [...new Set(
        allVehicles
          .filter(v => (v.Make || v.make) === filterMake)
          .map(v => v.Model || v.model)
          .filter(Boolean)
      )].sort();
    }
    return Array.isArray(allVehicles)
      ? [...new Set(allVehicles.map(v => v.Model || v.model).filter(Boolean))].sort()
      : [];
  }, [allVehicles, filterMake]);

  // Clear model filter if make changes and model is no longer valid
  useEffect(() => {
    if (filterMake && filterModel) {
      const isModelValid = filteredModels.includes(filterModel);
      if (!isModelValid) {
        setFilterModel('');
      }
    }
  }, [filterMake, filterModel, filteredModels]);

  // Show loading screen while auth or data is loading
  if (authLoading || companyLoading || locationsLoading || vehiclesLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="text-xl">
          {authLoading && t('auth.checkingAuth', 'Checking authentication...')}
          {!authLoading && companyLoading && t('common.loadingCompany', 'Loading company information...')}
          {!authLoading && !companyLoading && locationsLoading && vehiclesLoading && t('common.loadingData', 'Loading locations and vehicles...')}
          {!authLoading && !companyLoading && locationsLoading && !vehiclesLoading && t('common.loadingLocations', 'Loading locations...')}
          {!authLoading && !companyLoading && !locationsLoading && vehiclesLoading && t('common.loadingVehicles', 'Loading vehicles...')}
        </div>
        {!authLoading && !companyLoading && (
          <div className="text-sm text-gray-500 space-y-1 text-center">
            <div>{t('common.user', 'User')}: {user?.email || t('common.notLoggedIn', 'Not logged in')}</div>
            <div>{t('common.companyId', 'Company ID')}: {currentCompanyId || t('common.notSet', 'Not set')}</div>
            <div>{t('common.admin', 'Admin')}: {isAdmin ? t('common.yes', 'Yes') : t('common.no', 'No')}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header with Back button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin-dashboard?tab=vehicleManagement')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          {t('common.back', 'Back to Vehicles')}
        </button>
        <h1 className="text-3xl font-bold">
          {t('admin.vehicleLocationManagement', 'Vehicle Location Management')}
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('admin.filterVehicles', 'Filter Vehicles')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Make Filter */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.make', 'Make')}
            </label>
            <select
              value={filterMake}
              onChange={(e) => setFilterMake(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('admin.allMakes', 'All Makes')}</option>
              {uniqueMakes.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>
          </div>

          {/* Model Filter */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.model', 'Model')}
            </label>
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!filterMake && filteredModels.length === 0}
            >
              <option value="">
                {filterMake 
                  ? t('admin.allModelsForMake', { make: filterMake, defaultValue: `All ${filterMake} Models` })
                  : t('admin.allModels', 'All Models')}
              </option>
              {filteredModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          {/* License Plate Filter */}
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.licensePlate', 'License Plate')}
            </label>
            <input
              type="text"
              value={filterLicensePlate}
              onChange={(e) => setFilterLicensePlate(e.target.value)}
              placeholder={t('admin.searchLicensePlate', 'Search by license plate...')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Clear Filters Button */}
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={() => {
                setFilterMake('');
                setFilterModel('');
                setFilterLicensePlate('');
              }}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              {t('admin.clearFilters', 'Clear Filters')}
            </button>
          </div>
        </div>

        {/* Filter Results Summary */}
        {(filterMake || filterModel || filterLicensePlate) && (
          <div className="mt-4 text-sm text-gray-600">
            {t('admin.showingFilteredVehicles', 'Showing filtered vehicles:')} 
            <span className="font-semibold ml-1">
              {vehiclesWithoutLocation.length} {t('admin.unassigned', 'unassigned')}
            </span>
            {selectedLocationId && (
              <span className="font-semibold ml-1">
                , {vehiclesInLocation.length} {t('admin.atSelectedLocation', 'at selected location')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Warning if no data */}
      {locations.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            <strong>{t('admin.noLocationsFound', 'No locations found.')}</strong> {t('admin.addLocationsFirst', 'Please add locations in the admin dashboard first.')}
          </p>
        </div>
      )}

      {vehiclesError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">
            <strong>{t('admin.errorLoadingVehicles', 'Error loading vehicles:')}</strong> {vehiclesError.message || t('common.unknownError', 'Unknown error')}
          </p>
          <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
            {JSON.stringify(vehiclesError.response?.data || vehiclesError, null, 2)}
          </pre>
        </div>
      )}

      {!vehiclesError && allVehicles.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            <strong>{t('admin.noVehiclesFound', 'No vehicles found.')}</strong> {t('admin.addVehiclesFirst', 'Please add vehicles in the admin dashboard first.')}
          </p>
          <p className="text-sm text-yellow-700 mt-2">
            {t('admin.checkConsoleLogs', 'Check console logs for API response details.')}
          </p>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT SIDE - All Vehicles (unassigned) */}
        <div
          className="bg-white rounded-lg shadow-lg p-6 min-h-[600px]"
          onDragOver={handleDragOver}
          onDrop={handleDropOnAllVehicles}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{t('admin.unassignedVehicles', 'Unassigned Vehicles')}</h2>
            <div className="flex items-center gap-2">
              {(() => {
                const selectedInThisPanel = vehiclesWithoutLocation.filter(v => 
                  selectedVehicles.has(v.vehicleId || v.VehicleId || v.id || v.Id)
                ).length;
                return selectedInThisPanel > 0 && (
                  <button
                    onClick={() => moveSelectedVehicles(selectedLocationId, 'unassigned')}
                    disabled={!selectedLocationId}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('admin.moveSelected', { count: selectedInThisPanel, defaultValue: `Move ${selectedInThisPanel} →` })}
                  </button>
                );
              })()}
              <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                {vehiclesWithoutLocation.length}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {t('admin.dragVehiclesToAssign', 'Drag vehicles from here to assign them to a location →')}
          </p>
          
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {vehiclesWithoutLocation.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('admin.allVehiclesAssigned', 'All vehicles are assigned to locations')}
              </div>
            ) : (
              vehiclesWithoutLocation.map((vehicle) => {
                const vehicleId = vehicle.vehicleId || vehicle.VehicleId || vehicle.id || vehicle.Id;
                const isSelected = selectedVehicles.has(vehicleId);
                return (
                <div
                  key={vehicleId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, vehicle)}
                  className={`p-4 border rounded-lg cursor-move hover:bg-gray-50 hover:border-blue-400 transition-colors ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleVehicleSelection(vehicleId)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1 flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-lg">
                          {vehicle.Make || vehicle.make} {vehicle.Model || vehicle.model} {vehicle.Year || vehicle.year}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">{vehicle.LicensePlate || vehicle.licensePlate}</span>
                          {(vehicle.State || vehicle.state) && (
                            <span className="ml-2">({vehicle.State || vehicle.state})</span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                      (vehicle.Status || vehicle.status) === 'available' || (vehicle.Status || vehicle.status) === 'Available'
                        ? 'bg-green-100 text-green-800'
                        : (vehicle.Status || vehicle.status) === 'rented' || (vehicle.Status || vehicle.status) === 'Rented'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {vehicle.Status || vehicle.status}
                    </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT SIDE - Location Vehicles */}
        <div
          className="bg-white rounded-lg shadow-lg p-6 min-h-[600px]"
          onDragOver={selectedLocationId ? handleDragOver : undefined}
          onDrop={selectedLocationId ? (e) => handleDropOnLocation(e, selectedLocationId) : undefined}
        >
          {/* Location Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin.selectLocationToView', 'Select Location to View:')}
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('admin.selectLocation', '-- Select a location --')}</option>
              {locations.map((location) => (
                <option key={location.locationId} value={location.locationId}>
                  {location.locationName} - {location.city}, {location.state}
                </option>
              ))}
            </select>
          </div>

          {selectedLocationId ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-blue-600">
                  {t('admin.dropVehiclesHere', '← Drop vehicles here to assign to this location')}
                </p>
                <div className="flex items-center gap-2">
                  {(() => {
                    const selectedInThisPanel = vehiclesInLocation.filter(v => 
                      selectedVehicles.has(v.vehicleId || v.VehicleId || v.id || v.Id)
                    ).length;
                    return selectedInThisPanel > 0 && (
                      <button
                        onClick={() => moveSelectedVehicles(null, 'location')}
                        className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        {t('admin.unassignSelected', { count: selectedInThisPanel, defaultValue: `← Unassign ${selectedInThisPanel}` })}
                      </button>
                    );
                  })()}
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    {vehiclesInLocation.length}
                  </span>
                </div>
              </div>

              <div className="space-y-2 max-h-[450px] overflow-y-auto">
                {vehiclesInLocation.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {t('admin.noVehiclesAtLocation', 'No vehicles assigned to this location')}
                  </div>
                ) : (
                  vehiclesInLocation.map((vehicle) => {
                    const vehicleId = vehicle.vehicleId || vehicle.VehicleId || vehicle.id || vehicle.Id;
                    const isSelected = selectedVehicles.has(vehicleId);
                    return (
                    <div
                      key={vehicleId}
                      draggable
                      onDragStart={(e) => handleDragStart(e, vehicle)}
                      className={`p-4 border rounded-lg cursor-move hover:bg-blue-50 hover:border-blue-500 transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-100' : 'border-blue-300 bg-blue-50/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleVehicleSelection(vehicleId)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1 flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-lg">
                              {vehicle.Make || vehicle.make} {vehicle.Model || vehicle.model} {vehicle.Year || vehicle.year}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">{vehicle.LicensePlate || vehicle.licensePlate}</span>
                              {(vehicle.State || vehicle.state) && (
                                <span className="ml-2">({vehicle.State || vehicle.state})</span>
                              )}
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            (vehicle.Status || vehicle.status) === 'available' || (vehicle.Status || vehicle.status) === 'Available'
                              ? 'bg-green-100 text-green-800'
                              : (vehicle.Status || vehicle.status) === 'rented' || (vehicle.Status || vehicle.status) === 'Rented'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {vehicle.Status || vehicle.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-lg">{t('admin.selectLocationAbove', 'Select a location above to view its vehicles')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">{t('admin.howToUse', 'How to use:')}</h3>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li>{t('admin.instruction1', 'Select a location from the dropdown to view vehicles at that location')}</li>
          <li>{t('admin.instruction2', 'Drag vehicles from the left panel to assign them to the selected location')}</li>
          <li>{t('admin.instruction3', 'Drag vehicles from the right panel back to the left to unassign them')}</li>
          <li>{t('admin.instruction4', 'Vehicle cards show the make, model, year, license plate, and status')}</li>
        </ul>
      </div>
    </div>
  );
};

export default VehicleLocations;

