/*
 *
 * Copyright (c) 2025 Alexander Orlov.
 * 34 Middletown Ave Atlantic Highlands NJ 07716
 *
 * THIS SOFTWARE IS THE CONFIDENTIAL AND PROPRIETARY INFORMATION OF
 * Alexander Orlov. ("CONFIDENTIAL INFORMATION"). YOU SHALL NOT DISCLOSE
 * SUCH CONFIDENTIAL INFORMATION AND SHALL USE IT ONLY IN ACCORDANCE
 * WITH THE TERMS OF THE LICENSE AGREEMENT YOU ENTERED INTO WITH
 * Alexander Orlov.
 *
 * Author: Alexander Orlov Aegis AO Soft
 *
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastContainer } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import LoadingSpinner from './components/common/LoadingSpinner';

// Pages
import Home from './pages/Home';
import VehicleDetail from './pages/VehicleDetail';
import BookPage from './pages/BookPage';
import Booking from './pages/Booking';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import MyBookings from './pages/MyBookings';
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import ScanLicense from './pages/ScanLicense';
import ScanLicenseNative from './pages/ScanLicenseNative';
import MobileScan from './pages/MobileScan';
import MobileHome from './pages/MobileHome';
import MobileLanding from './pages/MobileLanding';
import MobileVehicles from './pages/MobileVehicles';
import MobileBooking from './pages/MobileBooking';
import MobileMyBookings from './pages/MobileMyBookings';
import DriverLicenseScanner from './pages/DriverLicenseScanner';
import About from './pages/About';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Locations from './pages/Locations';
import QRCodePage from './pages/QRCodePage';
import VehicleLocations from './pages/VehicleLocations';

// Context
import { AuthProvider } from './context/AuthContext';
import { CompanyProvider, useCompany } from './context/CompanyContext';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Component to update page title based on company
// Note: CompanyContext already updates document.title when accessed via subdomain
const TitleUpdater = () => {
  return null;
};

const AppLayout = () => {
  const { loading, error, companyConfig } = useCompany();
  const location = useLocation();
  const { t } = useTranslation();
  
  // Full-screen routes without navbar/footer
  const fullScreenRoutes = ['/dl-scan'];
  const isFullScreen = fullScreenRoutes.includes(location.pathname);

  if (loading && !companyConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <LoadingSpinner size="lg" text={t('common.loadingExperience')} />
      </div>
    );
  }

  if (error && !companyConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">We're preparing this site</h1>
        <p className="mt-4 text-gray-600 max-w-md">
          {typeof error === 'string'
            ? error
            : 'We were unable to load the company configuration. Please try again in a moment.'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollToTop />
      <TitleUpdater />
      {!isFullScreen && <Navbar />}
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/qrcode" element={<QRCodePage />} />
          <Route path="/vehicles/:id" element={<VehicleDetail />} />
          <Route path="/book" element={<BookPage />} />
          <Route path="/booking/:vehicleId" element={<Booking />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/vehicle-locations" element={<VehicleLocations />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/scan" element={<ScanLicense />} />
          <Route path="/scan-native" element={<ScanLicenseNative />} />
          <Route path="/scan-mobile" element={<MobileScan />} />
          <Route path="/mobile" element={<MobileLanding />} />
          <Route path="/m" element={<MobileHome />} />
          <Route path="/m/vehicles" element={<MobileVehicles />} />
          <Route path="/m/booking" element={<MobileBooking />} />
          <Route path="/m/my-bookings" element={<MobileMyBookings />} />
          <Route path="/dl-scan" element={<DriverLicenseScanner />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isFullScreen && <Footer />}
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'auto',
          maxWidth: '500px',
        }}
        toastStyle={{
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          padding: '16px 24px',
          fontSize: '16px',
          fontWeight: '500',
        }}
      />
    </div>
  );
};

function App() {
  // App component - Aegis AO Car Rental System - Production Deploy
  return (
    <QueryClientProvider client={queryClient}>
      <CompanyProvider>
        <AuthProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AppLayout />
        </Router>
      </AuthProvider>
      </CompanyProvider>
    </QueryClientProvider>
  );
}

export default App;
