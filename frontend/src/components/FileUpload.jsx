import React, { useRef, useState } from 'react';
import './FileUpload.css';

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ['jpg','jpeg','png','gif','pdf','doc','docx','xls','xlsx','txt','zip','rar'];
const IMAGE_TYPES = ['jpg','jpeg','png','gif'];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (IMAGE_TYPES.includes(ext)) return '🖼️';
  if (ext === 'pdf') return '📕';
  if (['doc','docx'].includes(ext)) return '📝';
  if (['xls','xlsx'].includes(ext)) return '📊';
  if (['zip','rar'].includes(ext)) return '🗜️';
  return '📄';
}

export default function FileUpload({ files, onChange }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null); // { url, name, type }

  function handleFiles(newFiles) {
    const valid = [];
    for (const f of newFiles) {
      const ext = f.name.split('.').pop().toLowerCase();
      if (!ALLOWED.includes(ext)) { alert(`File type .${ext} not allowed`); continue; }
      if (f.size > MAX_SIZE) { alert(`${f.name} exceeds 10MB limit`); continue; }
      valid.push(f);
    }
    onChange(prev => [...prev, ...valid]);
  }

  function remove(idx) {
    onChange(prev => prev.filter((_, i) => i !== idx));
  }

  function openPreview(f) {
    const ext = f.name.split('.').pop().toLowerCase();
    if (IMAGE_TYPES.includes(ext)) {
      const url = URL.createObjectURL(f);
      setPreview({ url, name: f.name, type: 'image' });
    } else if (ext === 'pdf') {
      const url = URL.createObjectURL(f);
      setPreview({ url, name: f.name, type: 'pdf' });
    } else {
      // non-previewable: just show info
      setPreview({ url: null, name: f.name, type: 'other', size: formatSize(f.size) });
    }
  }

  function closePreview() {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  return (
    <div className="fu-wrapper form-group">
      <button type="button" className="fu-trigger" onClick={() => inputRef.current.click()}>
        📎 Attach files
      </button>
      <input ref={inputRef} type="file" multiple hidden onChange={e => { handleFiles(Array.from(e.target.files)); e.target.value = ''; }} />

      {files.length > 0 && (
        <ul className="fu-list">
          {files.map((f, i) => (
            <li key={i} className="fu-item">
              <span className="fu-icon">{getFileIcon(f.name)}</span>
              <button type="button" className="fu-name-btn" onClick={() => openPreview(f)} title="Click to preview">
                {f.name}
              </button>
              <span className="fu-size">{formatSize(f.size)}</span>
              <button type="button" className="fu-remove" onClick={() => remove(i)}>✕</button>
            </li>
          ))}
        </ul>
      )}
      <p className="fu-hint">Allowed: {ALLOWED.join(', ')} · Max 10MB · Click filename to preview</p>

      {/* Preview modal */}
      {preview && (
        <div className="fu-preview-overlay" onClick={closePreview}>
          <div className="fu-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="fu-preview-header">
              <span>{preview.name}</span>
              <button className="fu-preview-close" onClick={closePreview}>✕</button>
            </div>
            <div className="fu-preview-body">
              {preview.type === 'image' && <img src={preview.url} alt={preview.name} className="fu-preview-img" />}
              {preview.type === 'pdf' && <iframe src={preview.url} title={preview.name} className="fu-preview-pdf" />}
              {preview.type === 'other' && (
                <div className="fu-preview-other">
                  <div style={{ fontSize: 48 }}>📄</div>
                  <p>{preview.name}</p>
                  <p style={{ color: '#6b7280', fontSize: 13 }}>{preview.size} · Preview not available for this file type</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
