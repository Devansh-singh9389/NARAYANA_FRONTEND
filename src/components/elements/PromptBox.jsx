import React, { useRef, useEffect } from 'react';
import '../../styles/HomePage.css';

const MAX_SCENES = 100;

const PromptBox = ({
  prompt, setPrompt,
  mode, setMode,
  sceneCount, setSceneCount,
  onSubmit,
  isGenerating = false,
}) => {
  const textareaRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  const clamp = (n) => Math.max(0, Math.min(MAX_SCENES, n));

  const stepScenes = (delta) => {
    const current = sceneCount === 0 ? (delta > 0 ? 0 : 1) : sceneCount;
    setSceneCount(clamp(current + delta));
  };

  const canSubmit = prompt.trim() && !isGenerating;

  return (
    <div className="pf-prompt-wrap">
      <div className="pf-prompt-inner">
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className={`pf-prompt-box ${prompt.trim() ? 'is-active' : ''} ${isGenerating ? 'is-generating' : ''}`}
        >
          <div className="pf-prompt-topbar">
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

            <div className="pf-prompt-topbar-right">
              <span className="pf-mode-hint">
                {mode === 'topic' ? 'AI expands topic into scenes' : 'AI strictly follows your text'}
              </span>

              <div
                className="pf-panel-stepper"
                title="Leave on Auto for the AI Director, or set an exact panel count"
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
                  /* REMOVED: pattern="[0-9]*" so the browser allows "AUTO" */
                  className="pf-panel-value pf-panel-input"
                  aria-label="Panel count"
                  value={sceneCount === 0 ? 'AUTO' : String(sceneCount).padStart(2, '0')}
                  onFocus={(e) => {
                    e.target.select();
                  }}
                  onChange={(e) => {
                    const raw = e.target.value;

                    // allow clearing while typing
                    if (raw === '') {
                      setSceneCount(0);
                      return;
                    }

                    // strip non-digits (in case of paste, etc.)
                    const digitsOnly = raw.replace(/\D/g, '');
                    if (digitsOnly === '') return;

                    const parsed = parseInt(digitsOnly, 10);
                    const clamped = Math.max(0, Math.min(MAX_SCENES, parsed));
                    setSceneCount(clamped);
                  }}
                  onBlur={(e) => {
                    // if left empty, fall back to AUTO (0)
                    if (e.target.value === '') setSceneCount(0);
                  }}
                  onKeyDown={(e) => {
                    // optional: arrow keys still step like a native number input
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
                  ? "Give a simple concept (e.g., 'A cyberpunk detective in Neo-Agra')..."
                  : 'Paste your full story here...'
              }
              rows={1}
              disabled={isGenerating}
              style={{ maxHeight: '200px', overflowY: 'auto' }}
              className="pf-prompt-textarea"
            />

            <button
              type="submit"
              disabled={!canSubmit}
              className="pf-send-btn"
              aria-label={isGenerating ? 'Generating...' : 'Send'}
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