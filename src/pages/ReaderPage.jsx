import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  fetchComicByIdApi,
  getAssetUrl,
  pauseStoryApi,
  resumeStoryApi,
  regenerateComicModelApi,
} from '../services/api';
import '../styles/HomePage.css';

const POLLING_STATUSES = new Set(['generating', 'pause_requested', 'delete_requested']);
const modeName = (mode) => String(mode || 'story').toLowerCase().startsWith('topic') ? 'Topic' : 'Story';

const ReaderPage = () => {
  const { comicId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [comic, setComic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isModelSwapping, setIsModelSwapping] = useState(false);
  const [swapNotice, setSwapNotice] = useState('');

  // Reader Mode: 'cinematic' | 'webtoon' | 'grid'
  const [readerMode, setReaderMode] = useState(() => {
    return window.localStorage.getItem('panelforge.readerMode') || 'cinematic';
  });

  const [sceneIndex, setSceneIndex] = useState(() => {
    return Number(window.localStorage.getItem(`panelforge.reader.${comicId}`)) || 0;
  });

  const [transitionDirection, setTransitionDirection] = useState(1);
  const [autoPlay, setAutoPlay] = useState(false);
  const touchStartX = useRef(null);
  const isFromPrompt = location.state?.fromPrompt;

  const loadComic = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const data = await fetchComicByIdApi(comicId);
      setComic(data);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'We could not load this comic.');
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [comicId]);

  useEffect(() => {
    loadComic(true);
  }, [loadComic]);

  // Polling loop with recursive setTimeout
  useEffect(() => {
    if (!comic || !POLLING_STATUSES.has(comic.status)) return undefined;
    let timer;
    const poll = async () => {
      await loadComic();
      timer = window.setTimeout(poll, 2500);
    };
    timer = window.setTimeout(poll, 2500);
    return () => window.clearTimeout(timer);
  }, [comic, loadComic]);

  // Persist Reader Mode preference
  const handleSetReaderMode = (mode) => {
    setReaderMode(mode);
    window.localStorage.setItem('panelforge.readerMode', mode);
  };

  const scenes = (comic?.scenes || []).filter((scene) => Boolean(scene.imageUrl));
  const isGenerating = comic?.status === 'generating';
  const isPaused = comic?.status === 'paused';
  const isDeleting = comic?.status === 'delete_requested';
  const isFailed = ['failed', 'error'].includes(comic?.status);
  const progress = Math.min(100, Math.max(0, Number(comic?.progress) || 0));
  const currentScene = scenes[Math.min(sceneIndex, Math.max(0, scenes.length - 1))];
  const activeModel = (comic?.render_model || 'sdxl').toLowerCase();

  // Bounded scene index tracking
  useEffect(() => {
    if (scenes.length && sceneIndex >= scenes.length) {
      setSceneIndex(scenes.length - 1);
    }
  }, [sceneIndex, scenes.length]);

  useEffect(() => {
    window.localStorage.setItem(`panelforge.reader.${comicId}`, String(sceneIndex));
  }, [comicId, sceneIndex]);

  // Auto-play timer for slideshow
  useEffect(() => {
    if (!autoPlay || readerMode !== 'cinematic' || scenes.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setSceneIndex((idx) => (idx < scenes.length - 1 ? idx + 1 : 0));
    }, 6000);
    return () => window.clearInterval(timer);
  }, [autoPlay, readerMode, scenes.length]);

  const goToScene = useCallback((nextIndex) => {
    setSceneIndex((index) => {
      const boundedIndex = Math.max(0, Math.min(scenes.length - 1, nextIndex));
      if (boundedIndex !== index) {
        setTransitionDirection(boundedIndex > index ? 1 : -1);
      }
      return boundedIndex;
    });
  }, [scenes.length]);

  const previousScene = useCallback(() => goToScene(sceneIndex - 1), [goToScene, sceneIndex]);
  const nextScene = useCallback(() => goToScene(sceneIndex + 1), [goToScene, sceneIndex]);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (readerMode === 'cinematic') {
        if (event.key === 'ArrowLeft') previousScene();
        if (event.key === 'ArrowRight' && sceneIndex < scenes.length - 1) nextScene();
        if (event.key === ' ') {
          event.preventDefault();
          if (sceneIndex < scenes.length - 1) nextScene();
          else goToScene(0);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nextScene, previousScene, sceneIndex, scenes.length, readerMode, goToScene]);

  // Hot-swap render model (SDXL <-> Flux <-> Imagen)
  const handleModelSwap = async (targetModel) => {
    if (targetModel === activeModel || isModelSwapping) return;
    setIsModelSwapping(true);
    setSwapNotice(`Switching to ${targetModel.toUpperCase()}…`);
    try {
      const response = await regenerateComicModelApi(comicId, targetModel);
      setSwapNotice(response.message || `Swapped to ${targetModel.toUpperCase()}`);
      await loadComic();
      window.setTimeout(() => setSwapNotice(''), 4000);
    } catch (err) {
      setError(err.message || 'Could not switch render model.');
      window.setTimeout(() => setSwapNotice(''), 4000);
    } finally {
      setIsModelSwapping(false);
    }
  };

  const updateGeneration = async (action) => {
    setIsUpdating(true);
    try {
      await action(comicId);
      await loadComic();
    } catch (requestError) {
      setError(requestError.message || 'Could not update generation.');
    } finally {
      setIsUpdating(false);
    }
  };

  const retryGeneration = async () => {
    setIsUpdating(true);
    try {
      await resumeStoryApi(comicId);
      setComic((currentComic) => ({ ...currentComic, status: 'generating' }));
      setError('');
      window.setTimeout(() => loadComic(), 500);
    } catch (requestError) {
      setError(requestError.message || 'Could not retry generation.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return;
    const diff = event.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 55) {
      if (diff > 0) previousScene();
      else nextScene();
    }
    touchStartX.current = null;
  };

  if (isLoading) {
    return (
      <div className="pf-page flex items-center justify-center min-h-screen">
        <div className="pf-loading-box">
          <div className="pf-loading-spinner" />
          <p className="pf-loading-text">Connecting to Engine...</p>
        </div>
      </div>
    );
  }

  if (!comic) {
    return (
      <div className="pf-page flex items-center justify-center min-h-screen text-center">
        <div>
          <h2 className="text-2xl font-bold text-[var(--danger)] mb-2">Signal Lost</h2>
          <p className="text-[var(--text-muted)] mb-6">{error || "We couldn't find this story in the archives."}</p>
          <button onClick={() => loadComic(true)} className="pf-btn-secondary mr-3">Retry</button>
          <button onClick={() => navigate('/')} className="pf-btn-primary">Return to Studio</button>
        </div>
      </div>
    );
  }

  return (
    <motion.main
      layoutId={isFromPrompt ? 'prompt-box-morph' : `story-card-${comicId}`}
      className="pf-page pf-reader-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Live Generation Progress Bar */}
      {isGenerating && (
        <div className="pf-live-progress" role="status">
          <motion.div
            className="pf-live-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45 }}
          />
          <span>Drawing your comic · {progress}% ({activeModel.toUpperCase()})</span>
        </div>
      )}

      {/* Global Toast Notice */}
      {swapNotice && (
        <div className="pf-toast-banner" role="status">
          <span>{swapNotice}</span>
        </div>
      )}

      {/* Enhanced Reader Header */}
      <header className="pf-reader-header">
        <div className="pf-reader-header-left">
          <button onClick={() => navigate('/')} className="pf-reader-back" title="Back to Library">
            ← Library
          </button>
          <h2 className="pf-reader-header-title">{comic.title}</h2>
        </div>

        {/* Center: Model Hot-Swapper Toolbar */}
        <div className="pf-reader-model-bar" role="group" aria-label="Switch AI Render Model">
          <span className="pf-model-bar-label">Model:</span>
          {['sdxl', 'flux', 'imagen'].map((m) => (
            <button
              key={m}
              type="button"
              disabled={isModelSwapping}
              className={`pf-reader-model-chip ${activeModel === m ? 'active' : ''}`}
              onClick={() => handleModelSwap(m)}
              title={m === 'imagen' ? 'Google Imagen 3 (Requires Pay-As-You-Go billing in Google AI Studio)' : `Switch or re-render with ${m.toUpperCase()}`}
            >
              {m === 'sdxl' ? '⚡ SDXL' : m === 'flux' ? '🎨 Flux' : '☁️ Imagen'}
            </button>
          ))}
        </div>

        {/* Right: 3-Way Mode Switcher + Controls */}
        <div className="pf-reader-header-right">
          <div className="pf-reader-mode-toggle" role="group" aria-label="Reading layout mode">
            <button
              type="button"
              className={`pf-mode-pill ${readerMode === 'cinematic' ? 'active' : ''}`}
              onClick={() => handleSetReaderMode('cinematic')}
              title="Cinematic Theater Mode (Slideshow with Ambient Glow)"
            >
              🎬 Slide
            </button>
            <button
              type="button"
              className={`pf-mode-pill ${readerMode === 'webtoon' ? 'active' : ''}`}
              onClick={() => handleSetReaderMode('webtoon')}
              title="Webtoon Mode (Vertical Continuous Scroll)"
            >
              📜 Scroll
            </button>
            <button
              type="button"
              className={`pf-mode-pill ${readerMode === 'grid' ? 'active' : ''}`}
              onClick={() => handleSetReaderMode('grid')}
              title="Classic Comic Page Grid Spread"
            >
              📖 Grid
            </button>
          </div>

          {readerMode === 'cinematic' && (
            <button
              type="button"
              className={`pf-autoplay-btn ${autoPlay ? 'active' : ''}`}
              onClick={() => setAutoPlay(!autoPlay)}
              title={autoPlay ? 'Pause Auto-play' : 'Start Auto-play Slideshow'}
            >
              {autoPlay ? '⏸ Auto' : '▶ Auto'}
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="pf-error" role="alert">
          <span>{error}</span>
          <button onClick={() => loadComic()} className="pf-btn-secondary">Retry</button>
        </div>
      )}

      {/* Generation States */}
      {isDeleting ? (
        <div className="pf-reader-state">
          <h1>Deletion requested</h1>
          <p>The current frame will finish safely, then this comic will be removed.</p>
        </div>
      ) : isFailed ? (
        <div className="pf-reader-state">
          <h1>Generation stopped</h1>
          <p>{comic.synopsis || 'The engine could not finish this comic.'}</p>
          <div className="pf-reader-state-actions">
            <button disabled={isUpdating} onClick={retryGeneration} className="pf-btn-primary">
              {isUpdating ? 'Retrying…' : 'Retry generation'}
            </button>
            <button onClick={() => navigate('/')} className="pf-btn-secondary">
              Return to Studio
            </button>
          </div>
        </div>
      ) : !scenes.length ? (
        <div className="pf-reader-state">
          <h1>{isPaused ? 'Generation paused' : 'Drawing the opening scene'}</h1>
          <p>{comic.synopsis || 'The reader will open automatically as soon as the first panel is ready.'}</p>
          {isGenerating && (
            <button disabled={isUpdating} onClick={() => updateGeneration(pauseStoryApi)} className="pf-btn-secondary">
              {isUpdating ? 'Requesting…' : 'Pause generation'}
            </button>
          )}
          {isPaused && (
            <button disabled={isUpdating} onClick={() => updateGeneration(resumeStoryApi)} className="pf-btn-primary">
              {isUpdating ? 'Resuming…' : 'Resume generation'}
            </button>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* MODE 1: 🎬 CINEMATIC THEATER MODE (Dynamic Backlight + Slides)  */
        /* ============================================================== */
        readerMode === 'cinematic' ? (
          <section
            className="pf-cinematic-reader"
            onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }}
            onTouchEnd={handleTouchEnd}
          >
            {/* Ambient Dynamic Backlight Halo */}
            <div
              className="pf-ambient-glow"
              style={{
                backgroundImage: currentScene?.imageUrl ? `url(${getAssetUrl(currentScene.imageUrl)})` : 'none',
              }}
              aria-hidden="true"
            />

            <div className="pf-reader-title">
              <p>{comic.title}</p>
              <span>Scene {sceneIndex + 1} of {Math.max(scenes.length, comic.scenes?.length || 0)}</span>
            </div>

            {/* Main Stage with Ken Burns Pan */}
            <div className="pf-scene-stage">
              <AnimatePresence mode="wait">
                <motion.figure
                  key={currentScene?.id || sceneIndex}
                  className="pf-scene-frame"
                  initial={{ opacity: 0, x: transitionDirection * 35 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: transitionDirection * -35 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <img
                    className="pf-scene-image"
                    loading="lazy"
                    src={getAssetUrl(currentScene?.imageUrl)}
                    alt={`Scene ${sceneIndex + 1}: ${currentScene?.narration || 'comic panel'}`}
                  />
                </motion.figure>
              </AnimatePresence>
            </div>

            {/* Comic Dialogue & Narration Box */}
            <div className="pf-comic-overlay-container">
              {currentScene?.narration && (
                <motion.div
                  key={`${currentScene?.id || sceneIndex}-narration`}
                  className="pf-narration-box"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <span className="pf-narration-label">NARRATION</span>
                  <p>{currentScene.narration}</p>
                </motion.div>
              )}

              {/* Render Dialogues if present */}
              {Array.isArray(currentScene?.dialogues) && currentScene.dialogues.length > 0 && (
                <div className="pf-dialogues-stack">
                  {currentScene.dialogues.map((dlg, idx) => (
                    <div key={idx} className="pf-speech-bubble">
                      <span className="pf-speech-speaker">{dlg.speaker_id || 'Character'}:</span>
                      <p>“{dlg.text}”</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Control Bar: Previous, Dots, Next */}
            <div className="pf-reader-controls">
              <button onClick={previousScene} disabled={sceneIndex === 0} className="pf-btn-secondary">
                ← Previous
              </button>
              <div className="pf-scene-dots" aria-label={`Scene ${sceneIndex + 1} of ${scenes.length}`}>
                {scenes.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToScene(index)}
                    className={index === sceneIndex ? 'active' : ''}
                    aria-label={`Go to scene ${index + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={nextScene}
                disabled={sceneIndex >= scenes.length - 1}
                className="pf-btn-primary"
              >
                {sceneIndex >= scenes.length - 1 && isGenerating ? 'Drawing next…' : 'Next →'}
              </button>
            </div>

            {isGenerating && (
              <button disabled={isUpdating} onClick={() => updateGeneration(pauseStoryApi)} className="pf-reader-pause">
                {isUpdating ? 'Requesting…' : 'Pause generation'}
              </button>
            )}
            {isPaused && (
              <button disabled={isUpdating} onClick={() => updateGeneration(resumeStoryApi)} className="pf-reader-pause">
                {isUpdating ? 'Resuming…' : 'Resume generation'}
              </button>
            )}
          </section>
        ) :

        /* ============================================================== */
        /* MODE 2: 📜 WEBTOON MODE (Continuous Vertical Scroll)           */
        /* ============================================================== */
        readerMode === 'webtoon' ? (
          <section className="pf-webtoon-container" aria-label="Webtoon continuous vertical scroll">
            <div className="pf-webtoon-flow">
              {scenes.map((scene, idx) => (
                <article key={scene.id || idx} className="pf-webtoon-panel">
                  <header className="pf-webtoon-panel-header">
                    <span className="pf-panel-number">PANEL {String(idx + 1).padStart(2, '0')}</span>
                  </header>

                  <div className="pf-webtoon-image-wrap">
                    <img
                      loading="lazy"
                      src={getAssetUrl(scene.imageUrl)}
                      alt={`Panel ${idx + 1}: ${scene.narration || ''}`}
                      className="pf-webtoon-image"
                    />
                  </div>

                  {scene.narration && (
                    <div className="pf-webtoon-narration">
                      <p>{scene.narration}</p>
                    </div>
                  )}

                  {Array.isArray(scene.dialogues) && scene.dialogues.length > 0 && (
                    <div className="pf-webtoon-dialogues">
                      {scene.dialogues.map((dlg, dIdx) => (
                        <div key={dIdx} className="pf-speech-bubble">
                          <span className="pf-speech-speaker">{dlg.speaker_id || 'Character'}:</span>
                          <p>“{dlg.text}”</p>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
            <div className="pf-webtoon-footer text-center py-10">
              <p className="text-[var(--text-muted)] text-sm uppercase tracking-widest font-bold">End of Story</p>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="pf-btn-secondary mt-4">
                ↑ Scroll to Top
              </button>
            </div>
          </section>
        ) :

        /* ============================================================== */
        /* MODE 3: 📖 COMIC GRID SPREAD MODE (Graphic Novel 2-Col Layout) */
        /* ============================================================== */
        (
          <section className="pf-comic-grid-spread" aria-label="Graphic novel page spreads">
            <div className="pf-grid-book-layout">
              {scenes.map((scene, idx) => (
                <div key={scene.id || idx} className="pf-comic-page-cell">
                  <div className="pf-cell-badge">#{idx + 1}</div>
                  <div className="pf-cell-frame">
                    <img
                      loading="lazy"
                      src={getAssetUrl(scene.imageUrl)}
                      alt={`Comic panel ${idx + 1}`}
                      className="pf-cell-img"
                    />
                  </div>
                  <div className="pf-cell-text">
                    {scene.narration && <p className="pf-cell-narration">{scene.narration}</p>}
                    {Array.isArray(scene.dialogues) && scene.dialogues.length > 0 && (
                      <div className="pf-cell-dialogues">
                        {scene.dialogues.map((dlg, dIdx) => (
                          <p key={dIdx} className="pf-cell-speech">
                            <strong>{dlg.speaker_id}:</strong> “{dlg.text}”
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      )}
    </motion.main>
  );
};

export default ReaderPage;
