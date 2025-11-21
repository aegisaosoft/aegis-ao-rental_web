# User Role Usage Summary

This document tracks all places where user role is used in the application.

## Backend (C# API)
- **AuthController.cs**: Returns role in login/register responses
- **VehiclesController.cs**: `HasAdminPrivileges()` checks role from JWT claims
- **LocationsController.cs**: `HasAdminPrivileges()` and `CanEditCompanyLocations()` check role from JWT claims
- **CompanyLocationsController.cs**: Role checks from JWT claims
- **DebugController.cs**: Returns role in debug endpoint

## Node.js Proxy Server

### Middleware (`server/middleware/auth.js`)
- **`authenticateToken`**: 
  - Extracts role from JWT token (line 88-105)
  - Stores role in `req.session.user.role` (line 116)
  - Sets `req.user.role` for route handlers (line 153)
  - Sets `req.user.isAdmin` based on role (line 149)

- **`requireAdmin`**: 
  - Checks `req.user.role` to determine admin access (line 166-167)
  - Blocks non-admin users (line 173)

### Routes (`server/routes/auth.js`)
- **Login route**: Stores role in `req.session.user.role` from login response (line 66, 153)
- **Register route**: Stores role in `req.session.user.role` from register response (line 66, 153)
- **Profile route**: Returns role from `req.session.user.role` (no backend call)
- **Session-token route**: Uses `req.user.role` for QR code generation (line 381)

### Other Routes
- **`server/routes/vehicles.js`**: Uses `req.user.role` for logging (line 217)

## Frontend (React)

### Context (`client/src/context/AuthContext.js`)
- **`isAdmin`**: `user?.role === 'admin' || user?.role === 'mainadmin'` (line 189)
- **`isMainAdmin`**: `user?.role === 'mainadmin'` (line 190)
- **`isWorker`**: `user?.role === 'worker'` (line 191)
- **`canAccessDashboard`**: Checks role for dashboard access (line 192)

### Pages
- **`client/src/pages/AdminDashboard.js`**: 
  - Uses `customer.role` for employee management (lines 1359, 1361, 1410, 1425, 1430)
  - Role dropdown for editing customers (lines 6098, 6110, 6142, 6144, 7886, 7889, 7893, 7894)

## Key Points

1. **Role is stored in session** during login/register
2. **Role is extracted from JWT token** in auth middleware and stored in session
3. **Profile endpoint returns role from session** (no backend call)
4. **All role checks use session data** or `req.user.role` from middleware
5. **Frontend uses role from user object** which comes from session via profile endpoint

## No Backend Calls for Role

✅ All role information comes from:
- Session storage (primary source)
- JWT token decoding (fallback in middleware)
- Login/register responses (initial storage)

❌ No unnecessary backend calls:
- Profile endpoint returns from session
- Role is always available in `req.session.user.role`
- Frontend gets role from user object (from session)

