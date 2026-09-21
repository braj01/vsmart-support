import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import SubmitTicket from './pages/SubmitTicket';
import TicketTracking from './pages/TicketTracking';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import TicketList from './pages/admin/TicketList';
import TicketDetail from './pages/admin/TicketDetail';
import AuditLogs from './pages/admin/AuditLogs';

import Profile from './pages/admin/Profile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          <Route path="/submit-ticket" element={<SubmitTicket />} />
          <Route path="/ticket/:token" element={<TicketTracking />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tickets" element={<TicketList />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="/" element={<Navigate to="/submit-ticket" replace />} />
          <Route path="*" element={<div style={{textAlign:'center',padding:'80px'}}><h2>404 — Page not found</h2></div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
