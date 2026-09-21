import React, { useState, useRef, useEffect } from 'react';
import './EmailTagInput.css';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function EmailTagInput({ emails, onChange, hasError }) {
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');
  const inputRef = useRef(null);

  function addEmail(raw) {
    const email = raw.trim().toLowerCase();
    if (!email) return;
    if (!isValidEmail(email)) { setInputError(`"${email}" is not a valid email`); return; }
    if (emails.includes(email)) { setInputError('Email already added'); return; }
    onChange([...emails, email]);
    setInput('');
    setInputError('');
  }

  function handleKeyDown(e) {
    if (['Enter', ',', ' ', 'Tab'].includes(e.key)) {
      e.preventDefault();
      addEmail(input);
    } else if (e.key === 'Backspace' && !input && emails.length > 0) {
      onChange(emails.slice(0, -1));
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const parts = pasted.split(/[\s,;]+/).filter(Boolean);
    const valid = [];
    parts.forEach(p => { if (isValidEmail(p) && !emails.includes(p.toLowerCase())) valid.push(p.toLowerCase()); });
    if (valid.length) onChange([...emails, ...valid]);
  }

  function remove(idx) {
    onChange(emails.filter((_, i) => i !== idx));
  }

  return (
    <div className={`eti-wrapper${hasError ? ' error' : ''}`} onClick={() => inputRef.current?.focus()}>
      {emails.map((email, i) => (
        <span key={email} className={`eti-tag${i === 0 ? ' eti-tag-primary' : ' eti-tag-cc'}`}>
          {i === 0 && <span className="eti-tag-label">TO</span>}
          {i === 1 && <span className="eti-tag-label">CC</span>}
          {i > 1 && <span className="eti-tag-label">CC</span>}
          {email}
          <button type="button" className="eti-remove" onClick={e => { e.stopPropagation(); remove(i); }}>✕</button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="eti-input"
        value={input}
        onChange={e => { setInput(e.target.value); setInputError(''); }}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addEmail(input); }}
        onPaste={handlePaste}
        placeholder={emails.length === 0 ? 'Enter email address...' : 'Add CC email...'}
      />
      {inputError && <div className="eti-error">{inputError}</div>}
      {emails.length > 0 && (
        <div className="eti-hint">
          First email is the requester (TO). Additional emails are CC'd on all notifications.
          Press <kbd>Enter</kbd>, <kbd>,</kbd> or <kbd>Space</kbd> to add.
        </div>
      )}
    </div>
  );
}
