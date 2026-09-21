import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import toast from 'react-hot-toast';
import api from '../services/api';
import RichTextEditor from '../components/RichTextEditor';
import FileUpload from '../components/FileUpload';
import EmailTagInput from '../components/EmailTagInput';
import logo from '../assets/images/logo.png';
import './SubmitTicket.css';

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export default function SubmitTicket() {
  const navigate = useNavigate();
  const captchaRef = useRef(null);
  const [form, setForm] = useState({ subject: '', priority: 'LOW', description: '' });
  const [emails, setEmails] = useState([]); // first = requester, rest = CC
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  function validate() {
    const e = {};
    if (!form.subject.trim()) e.subject = 'Subject is required';
    if (emails.length === 0) e.requester_email = 'Requester email is required';
    if (!form.description || form.description === '<p></p>' || form.description.trim() === '') e.description = 'Description is required';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const captchaToken = captchaRef.current?.getValue();
    // if (!captchaToken) {
    //   setErrors({ captcha: 'Please complete the CAPTCHA' });
    //   return;
    // }

    setSubmitting(true);
    const fd = new FormData();
    fd.append('subject', form.subject);
    fd.append('requester_email', emails[0]);
    fd.append('priority', form.priority);
    fd.append('description', form.description);
    fd.append('captcha_token', captchaToken || 'bypass');
    if (emails.length > 1) fd.append('cc_emails', emails.slice(1).join(','));
    files.forEach(f => fd.append('attachments[]', f));

    try {
      const { data } = await api.post('/tickets', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(data.data);
    } catch (err) {
      const serverErrors = err.response?.data?.errors || {};
      if (Object.keys(serverErrors).length) setErrors(serverErrors);
      else toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
      captchaRef.current?.reset();
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="st-page">
        <header className="st-header">
          <div className="st-header-inner">
            <div className="st-brand"><img src={logo} alt="vSmart" className="st-logo" /></div>
            <span className="st-header-title">Ticket Submitted</span>
          </div>
        </header>
        <div className="st-body">
          <div className="st-card st-success">
            <div className="st-success-icon">✓</div>
            <h2>Your ticket has been submitted successfully.</h2>
            <p>A confirmation email has been sent to <strong>{emails[0]}</strong>{emails.length > 1 ? ` and CC'd to ${emails.slice(1).join(', ')}` : ''}.</p>
            <div className="st-ticket-number">
              <span>Ticket Number:</span>
              <strong>{success.ticketNumber}</strong>
            </div>
            <div className="st-success-actions">
              <button className="btn btn-primary" onClick={() => navigate(`/ticket/${success.publicToken}`)}>Track Ticket</button>
              <button className="btn btn-secondary" onClick={() => { setSuccess(null); setForm({ subject: '', priority: 'LOW', description: '' }); setEmails([]); setFiles([]); }}>Submit Another</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="st-page">
      <header className="st-header">
        <div className="st-header-inner">
            <div className="st-brand"><img src={logo} alt="vSmart" className="st-logo" /></div>
          <span className="st-header-title">Submit a Ticket</span>
        </div>
      </header>
      <div className="st-body">
        <div className="st-card">
          <p className="st-mandatory-note">Fields marked <span className="required">*</span> are mandatory</p>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Subject <span className="required">*</span></label>
              <input className={`form-control${errors.subject ? ' error' : ''}`} value={form.subject} onChange={e => { setForm(p => ({ ...p, subject: e.target.value })); setErrors(p => ({ ...p, subject: '' })); }} />
              {errors.subject && <p className="form-error">{errors.subject}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Requester <span className="required">*</span></label>
              <EmailTagInput
                emails={emails}
                onChange={val => { setEmails(val); setErrors(p => ({ ...p, requester_email: '' })); }}
                hasError={!!errors.requester_email}
              />
              {errors.requester_email && <p className="form-error">{errors.requester_email}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-control" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p.toUpperCase()}>{p}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description <span className="required">*</span></label>
              <RichTextEditor
                value={form.description}
                onChange={val => { setForm(p => ({ ...p, description: val })); setErrors(p => ({ ...p, description: '' })); }}
                hasError={!!errors.description}
              />
              {errors.description && <p className="form-error">{errors.description}</p>}
            </div>

            <FileUpload files={files} onChange={setFiles} />

            <div className="form-group">
              {/* reCAPTCHA — enable when site key is configured
            {import.meta.env.VITE_RECAPTCHA_SITE_KEY && (
                <ReCAPTCHA ref={captchaRef} sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY} />
              )}
            */}
              {errors.captcha && <p className="form-error">{errors.captcha}</p>}
            </div>

            <div className="st-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <><span className="spinner" style={{width:14,height:14}} /> Submitting...</> : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
