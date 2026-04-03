import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import api from '../services/api.js';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: ''
  });

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef([]);
  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((r) => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await login('demo@syncly.com', 'demo123');
      navigate('/');
    } catch (err) {
      setError('Guest demo login failed');
    }

    setLoading(false);
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (e.key === 'Enter') handleVerifyOTP();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);

    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/api/auth/send-otp', {
        email: form.email
      });

      setStep(2);
      setResendTimer(60);
      setSuccess('✅ OTP sent to ' + form.email);
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to send OTP'
      );
    }

    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');

    if (otpValue.length !== 6) {
      return setError('Enter all 6 digits');
    }

    setError('');
    setLoading(true);

    try {
      await api.post('/api/auth/verify-otp', {
        email: form.email,
        otp: otpValue
      });

      await register(
        form.username,
        form.email,
        form.password
      );

      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.error || 'Invalid OTP'
      );

      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }

    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        navigate('/');
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Something went wrong'
      );
    }

    setLoading(false);
  };

  const switchMode = (m) => {
    setMode(m);
    setStep(1);
    setError('');
    setSuccess('');
    setOtp(['', '', '', '', '', '']);

    setForm({
      username: '',
      email: '',
      password: ''
    });
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-panel border border-border rounded-2xl p-8">
          <div className="flex bg-surface rounded-xl p-1 mb-8">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-display font-500 transition-all capitalize ${
                  mode === m
                    ? 'bg-accent text-void'
                    : 'text-dim'
                }`}
              >
                {m === 'login'
                  ? 'Sign In'
                  : 'Sign Up'}
              </button>
            ))}
          </div>

          {mode === 'login' && (
            <form
              onSubmit={handleLogin}
              className="space-y-4"
            >
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    email: e.target.value
                  }))
                }
                placeholder="you@example.com"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text"
              />

              <input
                type="password"
                required
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    password: e.target.value
                  }))
                }
                placeholder="••••••••"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text"
              />

              {error && (
                <div className="text-pulse text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-void py-3 rounded-xl"
              >
                {loading
                  ? 'Signing in…'
                  : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={handleGuestLogin}
                className="w-full bg-surface border border-border text-text py-3 rounded-xl hover:border-accent transition-all"
              >
                Explore Live Demo
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}