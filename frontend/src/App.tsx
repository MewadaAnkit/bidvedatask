import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RFQListPage } from './pages/RFQListPage';
import { RFQDetailPage } from './pages/RFQDetailPage';
import { RFQCreateEditPage } from './pages/RFQCreateEditPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { AdminQuotesPage } from './pages/AdminQuotesPage';
import { AdminAuditLogsPage } from './pages/AdminAuditLogsPage';
import { VendorDashboardPage } from './pages/VendorDashboardPage';
import { VendorBidsPage } from './pages/VendorBidsPage';
import { BuyerDashboardPage } from './pages/BuyerDashboardPage';
import { BuyerEvaluationsPage } from './pages/BuyerEvaluationsPage';
import { Role } from './types';

// Protected Route Guard
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: Role[];
}> = ({ children, allowedRoles }) => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-indigo-600">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'BUYER') return <Navigate to="/buyer" replace />;
    return <Navigate to="/vendor" replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === 'BUYER') {
    return <Navigate to="/buyer" replace />;
  }

  if (user.role === 'VENDOR') {
    return <Navigate to="/vendor" replace />;
  }

  return <Navigate to="/rfqs" replace />;
};

export const AppContent: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Unified Enterprise Console with Persistent Left Sidebar for ALL Roles */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Admin Specific Console Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/rfqs"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <RFQListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/rfqs/new"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <RFQCreateEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/rfqs/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <RFQDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/rfqs/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <RFQCreateEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/rfqs/:id/comparison"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ComparisonPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/quotes"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminQuotesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminAuditLogsPage />
            </ProtectedRoute>
          }
        />

        {/* Buyer Specific Console Routes */}
        <Route
          path="/buyer"
          element={
            <ProtectedRoute allowedRoles={['BUYER', 'ADMIN']}>
              <BuyerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buyer/evaluations"
          element={
            <ProtectedRoute allowedRoles={['BUYER', 'ADMIN']}>
              <BuyerEvaluationsPage />
            </ProtectedRoute>
          }
        />

        {/* Vendor Specific Console Routes */}
        <Route
          path="/vendor"
          element={
            <ProtectedRoute allowedRoles={['VENDOR']}>
              <VendorDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bids"
          element={
            <ProtectedRoute allowedRoles={['VENDOR']}>
              <VendorBidsPage />
            </ProtectedRoute>
          }
        />

        {/* Common RFQ Operations (Accessible in Sidebar) */}
        <Route path="/rfqs" element={<RFQListPage />} />
        <Route
          path="/rfqs/new"
          element={
            <ProtectedRoute allowedRoles={['BUYER', 'ADMIN']}>
              <RFQCreateEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rfqs/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['BUYER', 'ADMIN']}>
              <RFQCreateEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rfqs/:id/comparison"
          element={
            <ProtectedRoute allowedRoles={['BUYER', 'ADMIN']}>
              <ComparisonPage />
            </ProtectedRoute>
          }
        />
        <Route path="/rfqs/:id" element={<RFQDetailPage />} />
      </Route>

      {/* Fallback & Root Redirect */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
