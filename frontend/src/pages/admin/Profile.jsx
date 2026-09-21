import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

export default function Profile() {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  async function handleProfileSave(e) {
    e.preventDefault();
    if (!profile.name.trim() || !profile.email.trim()) { toast.error('Name and email are required'); return; }
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/profile', profile);
      toast.success('Profile updated successfully');
      // update local user state
      window.dispatchEvent(new Event('profile-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSavingProfile(false); }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    if (!pwd.current_password || !pwd.new_password || !pwd.confirm_password) { toast.error('All fields are required'); return; }
    if (pwd.new_password !== pwd.confirm_password) { toast.error('New passwords do not match'); return; }
    if (pwd.new_password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSavingPwd(true);
    try {
      await api.put('/auth/change-password', { current_password: pwd.current_password, new_password: pwd.new_password });
      toast.success('Password changed successfully');
      setPwd({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setSavingPwd(false); }
  }

  return (
    <div className="pr-page">
      <div className="pr-header">
        <div className="pr-avatar">{user?.name?.[0]?.toUpperCase()}</div>
        <div>
          <h1 className="pr-name">{user?.name}</h1>
          <span className="pr-role">{user?.role?.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="pr-grid">
        {/* Profile Details */}
        <div className="pr-card">
          <div className="pr-card-header">👤 Profile Details</div>
          <form onSubmit={handleProfileSave} className="pr-form">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-control" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-control" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <input className="form-control" value={user?.role?.replace('_', ' ')} disabled />
            </div>
            <button type="submit" className="fd-btn fd-btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : '✓ Save Changes'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="pr-card">
          <div className="pr-card-header">🔒 Change Password</div>
          <form onSubmit={handlePasswordSave} className="pr-form">
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="form-control" type="password" placeholder="••••••••" value={pwd.current_password} onChange={e => setPwd(p => ({ ...p, current_password: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-control" type="password" placeholder="Min. 8 characters" value={pwd.new_password} onChange={e => setPwd(p => ({ ...p, new_password: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-control" type="password" placeholder="••••••••" value={pwd.confirm_password} onChange={e => setPwd(p => ({ ...p, confirm_password: e.target.value }))} />
            </div>
            <button type="submit" className="fd-btn fd-btn-primary" disabled={savingPwd}>
              {savingPwd ? 'Changing...' : '🔒 Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
