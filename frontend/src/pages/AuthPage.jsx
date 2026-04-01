import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import api from '../services/api.js';

export default function AuthPage() {
  const [mode, setMode]       = useState('login');
  const [step, setStep]       = useState(1);
  const [form, setForm]       = useState({ username:'', email:'', password:'' });
  const [otp, setOtp]         = useState(['','','','','','']);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);
  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      otpRefs.current[index - 1]?.focus();
    if (e.key === 'Enter') handleVerifyOTP();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/api/auth/send-otp', { email: form.email });
      setStep(2);
      setResendTimer(60);
      setSuccess('✅ OTP sent to ' + form.email);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) return setError('Enter all 6 digits');
    setError(''); setLoading(true);
    try {
      await api.post('/api/auth/verify-otp', { email: form.email, otp: otpValue });
      await register(form.username, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
      setOtp(['','','','','','']);
      otpRefs.current[0]?.focus();
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError(''); setSuccess('');
    try {
      await api.post('/api/auth/send-otp', { email: form.email });
      setResendTimer(60);
      setOtp(['','','','','','']);
      setSuccess('✅ New OTP sent!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        navigate('/');
      } else if (mode === 'forgot') {
        await api.post('/api/auth/forgot-password', { email: form.email });
        setSuccess('✅ If that email exists, a reset link was sent!');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
    setLoading(false);
  };

  const switchMode = (m) => {
    setMode(m); setStep(1); setError(''); setSuccess('');
    setOtp(['','','','','','']);
    setForm({ username:'', email:'', password:'' });
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-pulse/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  stroke="#080A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="#080A0F"/>
              </svg>
            </div>
            <span className="font-display text-2xl font-700 text-text tracking-tight">Syncly</span>
          </div>
          <p className="text-dim font-body text-sm">Real-time messaging. Encrypted. Fast.</p>
        </div>

        <div className="bg-panel border border-border rounded-2xl p-8 glow-accent">

          {/* Tabs */}
          {mode !== 'forgot' && (
            <div className="flex bg-surface rounded-xl p-1 mb-8">
              {['login','register'].map(m => (
                <button key={m} onClick={() => switchMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-display font-500 transition-all capitalize
                    ${mode === m ? 'bg-accent text-void shadow-lg' : 'text-dim hover:text-text'}`}>
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          {/* FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <>
              <div className="mb-6">
                <h2 className="font-display font-700 text-text text-xl mb-1">Reset Password</h2>
                <p className="text-dim text-sm font-body">Enter your email for a reset link.</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-display font-600 text-dim uppercase tracking-widest mb-2">Email</label>
                  <input type="email" required value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text
                      font-body text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-all" />
                </div>
                {error && <div className="bg-pulse/10 border border-pulse/30 rounded-xl px-4 py-3 text-pulse text-sm">{error}</div>}
                {success && <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm">{success}</div>}
                <button type="submit" disabled={loading}
                  className="w-full bg-accent hover:bg-accentDim text-void font-display font-600 py-3 rounded-xl transition-all disabled:opacity-50">
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <button onClick={() => switchMode('login')}
                className="w-full text-center text-dim hover:text-accent text-xs font-body mt-4 transition-colors">
                ← Back to Sign In
              </button>
            </>
          )}

          {/* LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-display font-600 text-dim uppercase tracking-widest mb-2">Email</label>
                <input type="email" required value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text
                    font-body text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-all" />
              </div>
              <div>
                <label className="block text-xs font-display font-600 text-dim uppercase tracking-widest mb-2">Password</label>
                <input type="password" required value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text
                    font-body text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-all" />
              </div>
              {error && <div className="bg-pulse/10 border border-pulse/30 rounded-xl px-4 py-3 text-pulse text-sm">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full bg-accent hover:bg-accentDim text-void font-display font-600 py-3 rounded-xl transition-all disabled:opacity-50">
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <button type="button" onClick={() => switchMode('forgot')}
                className="w-full text-center text-dim hover:text-accent text-xs font-body transition-colors">
                Forgot your password?
              </button>
            </form>
          )}

          {/* REGISTER STEP 1 */}
          {mode === 'register' && step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-display font-600 text-dim uppercase tracking-widest mb-2">Username</label>
                <input type="text" required value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="your_username"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text
                    font-body text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-all" />
              </div>
              <div>
                <label className="block text-xs font-display font-600 text-dim uppercase tracking-widest mb-2">Email</label>
                <input type="email" required value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text
                    font-body text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-all" />
              </div>
              <div>
                <label className="block text-xs font-display font-600 text-dim uppercase tracking-widest mb-2">Password</label>
                <input type="password" required value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 8 characters"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text
                    font-body text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-all" />
              </div>
              {error && <div className="bg-pulse/10 border border-pulse/30 rounded-xl px-4 py-3 text-pulse text-sm">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full bg-accent hover:bg-accentDim text-void font-display font-600 py-3 rounded-xl transition-all disabled:opacity-50">
                {loading ? 'Sending OTP…' : 'Send Verification Code →'}
              </button>
              <p className="text-center text-muted text-xs font-body">
                We'll send a 6-digit code to verify your email
              </p>
            </form>
          )}

          {/* REGISTER STEP 2 — OTP */}
          {mode === 'register' && step === 2 && (
            <div className="animate-fade-in">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20
                  flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">📧</span>
                </div>
                <h3 className="font-display font-700 text-text text-lg mb-1">Check your email</h3>
                <p className="text-dim text-sm font-body">
                  We sent a 6-digit code to<br/>
                  <strong className="text-accent">{form.email}</strong>
                </p>
              </div>

              {/* OTP boxes */}
              <div className="flex gap-3 justify-center mb-6" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text" inputMode="numeric"
                    maxLength={1} value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className={`w-12 h-14 text-center text-2xl font-mono font-700 rounded-xl border-2
                      bg-surface transition-all focus:outline-none
                      ${digit ? 'border-accent text-accent' : 'border-border text-text'}
                      focus:border-accent focus:shadow-lg focus:shadow-accent/20`}
                  />
                ))}
              </div>

              {error && (
                <div className="bg-pulse/10 border border-pulse/30 rounded-xl px-4 py-3
                  text-pulse text-sm mb-4 text-center">{error}</div>
              )}
              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3
                  text-emerald-400 text-sm mb-4 text-center">{success}</div>
              )}

              <button onClick={handleVerifyOTP}
                disabled={loading || otp.join('').length !== 6}
                className="w-full bg-accent hover:bg-accentDim text-void font-display font-600
                  py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed mb-3">
                {loading ? 'Verifying…' : 'Verify & Create Account'}
              </button>

              <div className="flex items-center justify-between text-xs font-body">
                <button
                  onClick={() => { setStep(1); setError(''); setSuccess(''); setOtp(['','','','','','']); }}
                  className="text-dim hover:text-text transition-colors">
                  ← Change email
                </button>
                <button onClick={handleResend} disabled={resendTimer > 0}
                  className={`transition-colors
                    ${resendTimer > 0 ? 'text-muted cursor-not-allowed' : 'text-accent hover:text-accentDim'}`}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-dim text-xs font-body mt-6">
            Messages are end-to-end encrypted with AES-256-GCM
          </p>
        </div>
      </div>
    </div>
  );
}