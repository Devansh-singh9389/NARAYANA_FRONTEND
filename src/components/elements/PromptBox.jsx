import React, { useRef, useEffect } from 'react';
import '../../styles/HomePage.css';

const MAX_SCENES = 100;

const GENRE_PRESETS = [
  { label: '🏙️ Cyberpunk', prompt: 'A cynical neon-city detective investigating a rogue android syndicate in rainy Neo-Tokyo' },
  { label: '⚔️ Dark Fantasy', prompt: 'A cursed knight and an exile sorceress defending an ancient crumbling citadel from shadow beasts' },
  { label: '🕵️ Sci-Fi Noir', prompt: 'An interstellar private investigator tracking a stolen quantum core aboard a derelict freighter' },
  { label: '⛩️ Shonen Manga', prompt: 'A rebellious martial arts student unlocking forbidden elemental flame powers in a mountain tournament' },
  { label: '🌌 Cosmic Horror', prompt: 'Deep sea research crew uncovering a colossal bio-luminescent temple at the bottom of the Mariana Trench' },
];

const PromptBox = ({
  prompt, setPrompt,
  mode, setMode,
  sceneCount, setSceneCount,
  renderModel = 'sdxl', setRenderModel,
  onSubmit,
  isGenerating = false,
}) => {
  const textareaRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(220, textareaRef.current.scrollHeight)}px`;
    }
  }, [prompt]);

  const clamp = (n) => Math.max(0, Math.min(MAX_SCENES, n));

  const stepScenes = (delta) => {
    const current = sceneCount === 0 ? (delta > 0 ? 0 : 1) : sceneCount;
    setSceneCount(clamp(current + delta));
  };

  const applyPreset = (presetPrompt) => {
    setPrompt(presetPrompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const canSubmit = prompt.trim() && !isGenerating;

  return (
    <div className="pf-prompt-wrap">
      <div className="pf-prompt-inner">
        {/* Genre Inspiration Chips */}
        <div className="pf-genre-chips" role="region" aria-label="Genre presets">
          <span className="pf-genre-label">Quick Ideas:</span>
          {GENRE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="pf-genre-chip"
              onClick={() => applyPreset(preset.prompt)}
              title="Click to use this story prompt"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <form
          ref={formRef}
          onSubmit={onSubmit}
          className={`pf-prompt-box ${prompt.trim() ? 'is-active' : ''} ${isGenerating ? 'is-generating' : ''}`}
        >
          {/* Top Bar: Mode Toggle + Model Selector + Panel Counter */}
          <div className="pf-prompt-topbar">
            {/* Generation Mode */}
            <div className="pf-mode-toggle" role="tablist" aria-label="Generation mode">
              <button
                type="button"
                role="tab"
                aria-pressed={mode === 'topic'}
                onClick={() => setMode('topic')}
                className={`pf-mode-btn pf-mode-topic ${mode === 'topic' ? 'active' : ''}`}
              >
                Topic Mode
              </button>
              <button
                type="button"
                role="tab"
                aria-pressed={mode === 'story'}
                onClick={() => setMode('story')}
                className={`pf-mode-btn pf-mode-story ${mode === 'story' ? 'active' : ''}`}
              >
                Story Mode
              </button>
            </div>

            {/* Model Selector Pills */}
            <div className="pf-model-selector" role="group" aria-label="AI Render Model">
              <button
                type="button"
                className={`pf-model-btn ${renderModel === 'sdxl' ? 'active' : ''}`}
                onClick={() => setRenderModel && setRenderModel('sdxl')}
                title="Animagine XL / SDXL - Fast local GPU generation"
              >
                ⚡ SDXL
              </button>
              <button
                type="button"
                className={`pf-model-btn ${renderModel === 'flux' ? 'active' : ''}`}
                onClick={() => setRenderModel && setRenderModel('flux')}
                title="Flux Schnell GGUF - High detail local rendering"
              >
                🎨 Flux
              </button>
              <button
                type="button"
                className={`pf-model-btn ${renderModel === 'imagen' ? 'active' : ''}`}
                onClick={() => setRenderModel && setRenderModel('imagen')}
                title="Google Imagen 3 - Requires Pay-As-You-Go billing in Google AI Studio"
              >
                ☁️ Imagen
              </button>
            </div>

            {/* Panel Stepper */}
            <div className="pf-prompt-topbar-right">
              <div
                className="pf-panel-stepper"
                title="Leave on Auto for AI Director, or set exact panel count"
                role="group"
                aria-label="Panel count"
              >
                <span className="pf-panel-label">Panels</span>

                <button
                  type="button"
                  className="pf-panel-step-btn"
                  onClick={() => stepScenes(-1)}
                  disabled={sceneCount === 0}
                  aria-label="Decrease panel count"
                >
                  −
                </button>

                <input
                  type="text"
                  inputMode="numeric"
                  className="pf-panel-value pf-panel-input"
                  aria-label="Panel count"
                  value={sceneCount === 0 ? 'AUTO' : String(sceneCount).padStart(2, '0')}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setSceneCount(0);
                      return;
                    }
                    const digitsOnly = raw.replace(/\D/g, '');
                    if (digitsOnly === '') return;
                    const parsed = parseInt(digitsOnly, 10);
                    setSceneCount(Math.max(0, Math.min(MAX_SCENES, parsed)));
                  }}
                  onBlur={(e) => {
                    if (e.target.value === '') setSceneCount(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      stepScenes(1);
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      stepScenes(-1);
                    }
                  }}
                />

                <button
                  type="button"
                  className="pf-panel-step-btn"
                  onClick={() => stepScenes(1)}
                  disabled={sceneCount === MAX_SCENES}
                  aria-label="Increase panel count"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Text Input Row */}
          <div className="pf-prompt-inputrow">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (canSubmit) formRef.current?.requestSubmit();
                }
              }}
              placeholder={
                mode === 'topic'
                  ? "Describe your comic premise (e.g., 'A cyberpunk detective tracking an AI ghost in Neo-Kyoto')..."
                  : 'Paste your complete story or script here...'
              }
              rows={1}
              disabled={isGenerating}
              className="pf-prompt-textarea"
            />

            <button
              type="submit"
              disabled={!canSubmit}
              className="pf-send-btn"
              aria-label={isGenerating ? 'Generating...' : 'Start Comic'}
            >
              {isGenerating ? <span className="pf-send-spinner" /> : '➔'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromptBox;