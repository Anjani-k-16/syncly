import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import AuthPage from './pages/AuthPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20
          flex items-center justify-center mx-auto mb-3">
          <svg className="animate-spin w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
        <p className="text-dim text-sm font-display">Loading Syncly…</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { init } = useAuthStore();
  useEffect(() => { init(); }, []);
  return (
    <Routes>
      <Route path="/login"          element={<AuthPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/"               element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="*"               element={<Navigate to="/" replace />} />
    </Routes>
  );
}