import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api.js';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. Link may have expired.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  stroke="#080A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="#080A0F"/>
              </svg>
            </div>
            <span className="font-display text-2xl font-700 text-text tracking-tight">Syncly</span>
          </div>
        </div>

        <div className="bg-panel border border-border rounded-2xl p-8 glow-accent">
          {success ? (
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="font-display font-700 text-text text-xl mb-2">Password Reset!</h2>
              <p className="text-dim font-body text-sm">
                Your password has been updated. Redirecting to login…
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-display font-700 text-text text-xl mb-1">Set New Password</h2>
              <p className="text-dim text-sm font-body mb-6">
                Choose a strong password for your account.
              </p>

              {!token && (
                <div className="bg-pulse/10 border border-pulse/30 rounded-xl px-4 py-3
                  text-pulse text-sm font-body mb-4">
                  Invalid reset link. Please request a new one.
                </div>
              )}

              <form onSubmit={handle} className="space-y-4">
                <div>
                  <label className="block text-xs font-display font-600 text-dim uppercase tracking-widest mb-2">
                    New Password
                  </label>
                  <input type="password" required value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text
                      font-body text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-display font-600 text-dim uppercase tracking-widest mb-2">
                    Confirm Password
                  </label>
                  <input type="password" required value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Same password again"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text
                      font-body text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-all" />
                </div>

                {error && (
                  <div className="bg-pulse/10 border border-pulse/30 rounded-xl px-4 py-3
                    text-pulse text-sm font-body">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || !token}
                  className="w-full bg-accent hover:bg-accentDim text-void font-display font-600
                    py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed
                    hover:shadow-lg hover:shadow-accent/20">
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}