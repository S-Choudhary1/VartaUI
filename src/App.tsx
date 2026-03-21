import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import TemplateStudio from './pages/TemplateStudio';
import Campaigns from './pages/Campaigns';
import QuickSend from './pages/QuickSend';
import Flows from './pages/Flows';
import FlowBuilder from './pages/FlowBuilder';
import Settings from './pages/Settings';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminClients from './pages/admin/AdminClients';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isAuthenticated, loading } = useAuth();

    if (loading) return null;

    if (isAuthenticated) {
        return <Navigate to={user?.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'} />;
    }

    return <>{children}</>;
}

const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

const DefaultRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
              <PublicRoute>
                  <Login />
              </PublicRoute>
          } />
          <Route path="/register" element={<Navigate to="/login" />} />

          <Route element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/templates" element={<TemplateStudio />} />
            <Route path="/messages" element={<QuickSend />} />
            <Route path="/flows" element={<Flows />} />
            <Route path="/flows/new" element={<FlowBuilder />} />
            <Route path="/flows/:id" element={<FlowBuilder />} />
            <Route path="/flows/:id/analytics" element={<FlowBuilder />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={
              <SuperAdminRoute>
                <AdminDashboard />
              </SuperAdminRoute>
            } />
            <Route path="/admin/clients" element={
              <SuperAdminRoute>
                <AdminClients />
              </SuperAdminRoute>
            } />
            <Route path="/" element={<DefaultRedirect />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
