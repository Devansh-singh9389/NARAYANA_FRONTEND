import React, { useEffect, useRef, useState } from 'react';
import { getApiBaseUrl, setApiBaseUrl } from '../../services/api';
import '../../styles/HomePage.css';

const SettingsModal = ({ onClose }) => {
  const [apiBaseUrl, setApiBaseUrlValue] = useState(getApiBaseUrl());
  const closeButtonRef = useRef(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSave = (event) => {
    event.preventDefault();
    setApiBaseUrl(apiBaseUrl.trim());
    onClose();
  };

  return (
    <div className="pf-modal-overlay" onMouseDown={onClose}>
      <div className="pf-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <h3 id="settings-title">Engine Settings</h3>
        <form onSubmit={handleSave}>
          <div className="pf-modal-body">
            <div className="pf-field">
              <label htmlFor="api-base-url">FastAPI base URL</label>
              <input id="api-base-url" type="url" required value={apiBaseUrl} onChange={(event) => setApiBaseUrlValue(event.target.value)} />
              <p className="pf-field-help">Example: http://127.0.0.1:8000/api</p>
            </div>
          </div>
          <div className="pf-modal-footer">
            <button ref={closeButtonRef} type="button" onClick={onClose} className="pf-btn-secondary">Cancel</button>
            <button type="submit" className="pf-btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
