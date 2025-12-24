# AdminDashboard State Migration Guide

## Overview

The `useAdminDashboardState` hook provides a useReducer-based state management solution to replace the 70+ individual useState hooks in AdminDashboard.js.

**Current state**: Partial integration completed. Custom hooks created for filters and queries.

## Benefits of Migration

1. **Reduced line count**: ~1000+ lines saved so far
2. **Centralized state**: Related state grouped together
3. **Reusable queries**: Query hooks with full filter support
4. **Better separation**: Business logic in hooks, UI in component
5. **Easier testing**: Hooks can be tested independently

## Completed Migrations

### Filter Hooks (Integrated)
- `useBookingFilters` - Replaces 6 useState for booking filters
- `useVehicleFilters` - Replaces 8 useState for vehicle filters

### Query Hooks (Integrated)
- `useBookingsQuery` - Replaces inline bookings query with filters/pagination
- `useViolationsQuery` - Replaces inline violations query with filters/pagination

### Query Hooks (Available, Not Yet Integrated)
- `useVehiclesQuery` - Combined hook for grouped and flat vehicle lists
- `useVehiclesGrouped` - Vehicles grouped by category/make/model
- `useVehiclesListQuery` - Flat vehicles list

## Migration Strategy

### Option 1: Full Migration (Recommended for new code)

Replace all useState with useAdminDashboardState:

```javascript
// Before (AdminDashboard.js)
const [activeSection, setActiveSection] = useState('company');
const [activeTab, setActiveTab] = useState('info');
const [isEditingCompany, setIsEditingCompany] = useState(false);
// ... 70+ more useState hooks

// After
import { useAdminDashboardState } from './dashboard/hooks';

const { state, actions } = useAdminDashboardState(initialTab);

// Use state values
const { activeSection, activeTab, isEditingCompany } = state;

// Use actions
actions.setActiveSection('vehicles');
actions.setActiveTab('design');
actions.setEditingCompany(true);
```

### Option 2: Gradual Migration (Safer)

Migrate one feature at a time:

1. **Phase 1**: Navigation state (activeSection, activeTab, etc.)
2. **Phase 2**: Modal state (show*Modal, selected*)
3. **Phase 3**: Form state (editing*, *FormData)
4. **Phase 4**: Wizard state (wizard*)
5. **Phase 5**: Filter state (use custom hooks)

### Option 3: Use Filter Hooks First (Minimal Risk)

Start with isolated filter hooks:

```javascript
import { useBookingFilters, useVehicleFilters } from './dashboard/hooks';

// Replace booking filter useState
const {
  bookingStatusFilter,
  bookingCustomerFilter,
  bookingDateFrom,
  bookingDateTo,
  bookingPage,
  bookingPageSize,
  setBookingStatusFilter,
  // ... other setters
} = useBookingFilters();

// Replace vehicle filter useState  
const {
  vehicleSearchTerm,
  vehicleMakeFilter,
  // ... other values
  setVehicleSearchTerm,
  // ... other setters
} = useVehicleFilters();
```

## Available Hooks

### useAdminDashboardState

Full reducer with all dashboard state:

```javascript
const { state, actions, dispatch } = useAdminDashboardState(initialTab);

// State includes:
// - Navigation: activeSection, activeTab, etc.
// - Company: isEditingCompany, companyFormData, etc.
// - Vehicles: editingVehicle, vehicleFilters, etc.
// - Locations: isEditingLocation, locationFormData, etc.
// - Services: isEditingService, serviceFormData, etc.
// - Bookings: selectedBooking, showBookingDetailsModal, etc.
// - Wizard: wizardStep, wizardCustomer, etc.
// - Upload: uploadProgress, isUploading
// - Violations: selectedStates, violationsFindingProgress
```

### useBookingFilters

Isolated hook for booking list filters:

```javascript
const {
  bookingStatusFilter,
  bookingCustomerFilter,
  bookingDateFrom,
  bookingDateTo,
  bookingPage,
  bookingPageSize,
  setBookingStatusFilter,
  setBookingCustomerFilter,
  setBookingDateFrom,
  setBookingDateTo,
  setBookingPage,
  setBookingPageSize,
  resetFilters,
} = useBookingFilters();
```

### useVehicleFilters

Isolated hook for vehicle list filters:

```javascript
const {
  vehicleSearchTerm,
  vehicleMakeFilter,
  vehicleModelFilter,
  vehicleYearFilter,
  vehicleLicensePlateFilter,
  vehicleLocationFilter,
  vehiclePage,
  vehiclePageSize,
  setVehicleSearchTerm,
  // ... other setters
  resetFilters,
} = useVehicleFilters();
```

## Action Types Reference

```javascript
import { ACTION_TYPES } from './dashboard/hooks';

// Navigation
ACTION_TYPES.SET_ACTIVE_SECTION
ACTION_TYPES.SET_ACTIVE_TAB
ACTION_TYPES.SET_ACTIVE_LOCATION_SUB_TAB

// Company
ACTION_TYPES.SET_EDITING_COMPANY
ACTION_TYPES.SET_COMPANY_FORM_DATA
ACTION_TYPES.UPDATE_COMPANY_FIELD

// Vehicles
ACTION_TYPES.SET_EDITING_VEHICLE
ACTION_TYPES.SET_VEHICLE_FILTERS
ACTION_TYPES.TOGGLE_CATEGORY_EXPAND

// And many more...
```

## Query Hooks

### useBookingsQuery

Query hook for fetching bookings with filters and pagination:

```javascript
import { useBookingsQuery } from './dashboard/hooks';

const { data, isLoading, error } = useBookingsQuery({
  companyId: currentCompanyId,
  enabled: isAuthenticated && activeSection === 'reservations',
  filters: {
    bookingStatusFilter,
    bookingCustomerFilter,
    bookingDateFrom,
    bookingDateTo,
    bookingPage,
    bookingPageSize,
  },
  onError: (error) => toast.error('Failed to load bookings'),
});
```

### useViolationsQuery

Query hook for fetching violations with filters and pagination:

```javascript
import { useViolationsQuery } from './dashboard/hooks';

const { data, isLoading, error } = useViolationsQuery({
  companyId: currentCompanyId,
  enabled: isAuthenticated && activeSection === 'violations',
  filters: {
    violationsDateFrom,
    violationsDateTo,
    violationsPage,
    violationsPageSize,
    searchTrigger: violationsSearchTrigger,
  },
  onError: (error) => toast.error('Failed to load violations'),
});
```

### useVehiclesQuery

Combined hook for vehicles grouped and list data:

```javascript
import { useVehiclesQuery, useVehiclesGrouped, useVehiclesListQuery } from './dashboard/hooks';

// Combined hook
const { grouped, list, isLoading, error } = useVehiclesQuery({
  companyId: currentCompanyId,
  enabled: isAuthenticated,
});

// Or individual hooks
const { data: groupedData } = useVehiclesGrouped({ companyId, enabled });
const { data: listData } = useVehiclesListQuery({ companyId, enabled });
```

## Testing During Migration

1. Test each migrated feature independently
2. Verify state updates correctly
3. Check that UI reflects state changes
4. Ensure no regressions in other features

## Files Involved

- `/pages/dashboard/hooks/useAdminDashboardState.js` - Main reducer (not yet integrated)
- `/pages/dashboard/hooks/useBookingFilters.js` - Booking filters hook (integrated)
- `/pages/dashboard/hooks/useVehicleFilters.js` - Vehicle filters hook (integrated)
- `/pages/dashboard/hooks/useBookingsQuery.js` - Bookings query hook (integrated)
- `/pages/dashboard/hooks/useViolationsQuery.js` - Violations query hook (integrated)
- `/pages/dashboard/hooks/useVehiclesQuery.js` - Vehicles query hooks (available)
- `/pages/dashboard/hooks/useAdminData.js` - Legacy data hooks
- `/pages/dashboard/hooks/index.js` - Exports all hooks
- `/pages/AdminDashboard.js` - Target file for migration
