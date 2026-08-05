import React, { useState } from 'react';
import '../../styles/HomePage.css';

/**
 * Reusable Settings modal.
 * Owns its own field state — parent only needs to render it and
 * pass `onClose`. Add/remove settings fields here without touching
 * whatever page renders <SettingsModal />.
 */
const SettingsModal = ({ onClose }) => {
  const [host, setHost] = useState('http://127.0.0.1:8188');
  const [artStyle, setArtStyle] = useState('Graphic Novel (Default)');

  const handleSave = (e) => {
    e.preventDefault();
    // TODO: persist settings (e.g. localStorage, API call) here
    onClose();
  };

  return (
    <div className="pf-modal-overlay" onClick={onClose}>
      <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Engine Settings</h3>

        <form onSubmit={handleSave}>
          <div className="pf-modal-body">
            <div className="pf-field">
              <label>ComfyUI Host URL</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
            </div>

            <div className="pf-field">
              <label>Default Art Style</label>
              <select
                value={artStyle}
                onChange={(e) => setArtStyle(e.target.value)}
              >
                <option>Graphic Novel (Default)</option>
                <option>Cyberpunk / Anime</option>
                <option>Dark Fantasy Noir</option>
              </select>
            </div>
          </div>

          <div className="pf-modal-footer">
            <button type="button" onClick={onClose} className="pf-btn-secondary">
              Cancel
            </button>
            <button type="submit" className="pf-btn-primary">
              Save & Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;