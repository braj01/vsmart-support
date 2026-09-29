import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/images/logo.png';
import './AdminLogin.css';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Email and password are required'); return; }
    setLoading(true); setError('');
    try {
      if (executeRecaptcha) {
        const token = await executeRecaptcha('admin_login');
        if (!token) { setError('reCAPTCHA failed, please try again.'); setLoading(false); return; }
      }
      await login(form.email, form.password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src={logo} alt="vSmart" className="login-logo" />
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
              placeholder="Email Address"
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
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Signing in...</> : 'Sign In →'}
          </button>
        </form>

        <div className="login-footer">Velocis Systems Pvt Ltd · vSmart Support</div>
      </div>
    </div>
  );
}
