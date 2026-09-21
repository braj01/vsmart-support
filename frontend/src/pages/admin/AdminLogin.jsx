import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../../context/AuthContext';
import './AdminLogin.css';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const captchaRef = useRef(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaError, setCaptchaError] = useState('');

  const captchaEnabled = false; // !!import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Email and password are required'); return; }
    if (captchaEnabled) {
      const token = captchaRef.current?.getValue();
      if (!token) { setCaptchaError('Please complete the CAPTCHA'); return; }
    }
    setLoading(true); setError(''); setCaptchaError('');
    try {
      await login(form.email, form.password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
      captchaRef.current?.reset();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src="/src/assets/images/logo.png" alt="vSmart" className="login-logo" />
        </div>
        <h2>Welcome back</h2>
        <p className="login-sub">Sign in to vSmart Support</p>

        {error && (
          <div className="login-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              type="email"
              className="form-control"
              placeholder="braj.singh@velocis.co.in"
              value={form.email}
              onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setError(''); }}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={form.password}
              onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setError(''); }}
            />
          </div>
          {captchaEnabled && (
            <div className="login-captcha">
              <ReCAPTCHA ref={captchaRef} sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY} onChange={() => setCaptchaError('')} />
              {captchaError && <p className="form-error">{captchaError}</p>}
            </div>
          )}
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Signing in...</> : 'Sign In →'}
          </button>
        </form>

        <div className="login-footer">Velocis Systems Pvt Ltd · vSmart Support</div>
      </div>
    </div>
  );
}
