import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchComicByIdApi, getAssetUrl, pauseStoryApi, resumeStoryApi } from '../services/api';
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
  const [sceneIndex, setSceneIndex] = useState(() => Number(window.localStorage.getItem(`panelforge.reader.${comicId}`)) || 0);
  const [showAllScenes, setShowAllScenes] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState(1);
  const touchStartX = useRef(null);
  const isFromPrompt = location.state?.fromPrompt;

  const loadComic = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      setComic(await fetchComicByIdApi(comicId));
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'We could not load this comic.');
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [comicId]);

  useEffect(() => { loadComic(true); }, [loadComic]);
  useEffect(() => {
    if (!comic || !POLLING_STATUSES.has(comic.status)) return undefined;
    const timer = window.setInterval(() => loadComic(), 2500);
    return () => window.clearInterval(timer);
  }, [comic, loadComic]);

  const scenes = (comic?.scenes || []).filter((scene) => Boolean(scene.imageUrl));
  const isGenerating = comic?.status === 'generating';
  const isPaused = comic?.status === 'paused';
  const isDeleting = comic?.status === 'delete_requested';
  const isFailed = ['failed', 'error'].includes(comic?.status);
  const progress = Math.min(100, Math.max(0, Number(comic?.progress) || 0));
  const currentScene = scenes[Math.min(sceneIndex, Math.max(0, scenes.length - 1))];

  useEffect(() => {
    if (scenes.length && sceneIndex >= scenes.length) setSceneIndex(scenes.length - 1);
  }, [sceneIndex, scenes.length]);
  useEffect(() => { window.localStorage.setItem(`panelforge.reader.${comicId}`, String(sceneIndex)); }, [comicId, sceneIndex]);

  const goToScene = useCallback((nextIndex) => {
    setSceneIndex((index) => {
      const boundedIndex = Math.max(0, Math.min(scenes.length - 1, nextIndex));
      if (boundedIndex !== index) setTransitionDirection(boundedIndex > index ? 1 : -1);
      return boundedIndex;
    });
  }, [scenes.length]);
  const previousScene = useCallback(() => goToScene(sceneIndex - 1), [goToScene, sceneIndex]);
  const nextScene = useCallback(() => goToScene(sceneIndex + 1), [goToScene, sceneIndex]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (showAllScenes || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (event.key === 'ArrowLeft') previousScene();
      if (event.key === 'ArrowRight' && sceneIndex < scenes.length - 1) nextScene();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nextScene, previousScene, sceneIndex, scenes.length, showAllScenes]);

  const updateGeneration = async (action) => {
    setIsUpdating(true);
    try { await action(comicId); await loadComic(); }
    catch (requestError) { setError(requestError.message || 'Could not update generation.'); }
    finally { setIsUpdating(false); }
  };

  const retryGeneration = async () => {
    setIsUpdating(true);
    try {
      await resumeStoryApi(comicId);
      // Start the live UI immediately; the backend task will become the source of truth on the next poll.
      setComic((currentComic) => ({ ...currentComic, status: 'generating' }));
      setError('');
      window.setTimeout(() => loadComic(), 500);
    } catch (requestError) {
      setError(requestError.message || 'Could not retry generation.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="pf-page flex items-center justify-center min-h-screen"><p className="text-[var(--text-muted)] animate-pulse uppercase tracking-widest text-sm font-bold">Connecting to Engine...</p></div>;
  if (!comic) return <div className="pf-page flex items-center justify-center min-h-screen text-center"><div><h2 className="text-2xl font-bold text-[var(--danger)] mb-2">Signal Lost</h2><p className="text-[var(--text-muted)] mb-6">{error || "We couldn't find this story in the archives."}</p><button onClick={() => loadComic(true)} className="pf-btn-secondary mr-3">Retry</button><button onClick={() => navigate('/')} className="pf-btn-primary">Return to Studio</button></div></div>;

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return;
    const difference = event.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(difference) > 60) {
      if (difference > 0) previousScene();
      else nextScene();
    }
    touchStartX.current = null;
  };

  return (
    <motion.main layoutId={isFromPrompt ? 'prompt-box-morph' : `story-card-${comicId}`} className="pf-page pf-reader-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {isGenerating && <div className="pf-live-progress" role="status"><motion.div className="pf-live-progress-fill" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.45 }} /><span>Drawing your comic · {progress}%</span></div>}
      <header className="pf-reader-header">
        <button onClick={() => navigate('/')} className="pf-reader-back">← Library</button>
        <div className={`pf-tag pf-tag-${modeName(comic.mode).toLowerCase()}`}>{modeName(comic.mode)} Mode</div>
        <button className="pf-reader-view-toggle" onClick={() => setShowAllScenes((value) => !value)}>{showAllScenes ? 'Reader view' : 'View all'}</button>
      </header>
      {error && <div className="pf-error" role="alert"><span>{error}</span><button onClick={() => loadComic()} className="pf-btn-secondary">Retry</button></div>}
      {isDeleting ? <div className="pf-reader-state"><h1>Deletion requested</h1><p>The current frame will finish safely, then this comic will be removed.</p></div>
        : isFailed ? <div className="pf-reader-state"><h1>Generation stopped</h1><p>{comic.synopsis || 'The engine could not finish this comic.'}</p><div className="pf-reader-state-actions"><button disabled={isUpdating} onClick={retryGeneration} className="pf-btn-primary">{isUpdating ? 'Retrying…' : 'Retry generation'}</button><button onClick={() => navigate('/')} className="pf-btn-secondary">Return to Studio</button></div></div>
        : !scenes.length ? <div className="pf-reader-state"><h1>{isPaused ? 'Generation paused' : 'Drawing the opening scene'}</h1><p>{comic.synopsis || 'The reader will open automatically as soon as the first panel is ready.'}</p>{isGenerating && <button disabled={isUpdating} onClick={() => updateGeneration(pauseStoryApi)} className="pf-btn-secondary">{isUpdating ? 'Requesting…' : 'Pause generation'}</button>}{isPaused && <button disabled={isUpdating} onClick={() => updateGeneration(resumeStoryApi)} className="pf-btn-primary">{isUpdating ? 'Resuming…' : 'Resume generation'}</button>}</div>
        : showAllScenes ? <section className="pf-all-scenes" aria-label="All comic scenes">{scenes.map((scene, index) => <button className="pf-scene-thumbnail" key={scene.id || index} onClick={() => { setSceneIndex(index); setShowAllScenes(false); }}><img src={getAssetUrl(scene.imageUrl)} alt={`Open scene ${index + 1}`} /><span>Scene {index + 1}</span></button>)}</section>
        : <section className="pf-cinematic-reader" onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }} onTouchEnd={handleTouchEnd}>
          <div className="pf-reader-title"><p>{comic.title}</p><span>Scene {sceneIndex + 1} of {Math.max(scenes.length, comic.scenes?.length || 0)}</span></div>
          <div className="pf-scene-stage">
            <AnimatePresence mode="wait">
              <motion.figure key={currentScene?.id || sceneIndex} className="pf-scene-frame" initial={{ opacity: 0, x: transitionDirection * 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: transitionDirection * -28 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
                <img className="pf-scene-image" src={getAssetUrl(currentScene?.imageUrl)} alt={`Scene ${sceneIndex + 1}: ${currentScene?.narration || 'comic panel'}`} />
              </motion.figure>
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait"><motion.div key={`${currentScene?.id || sceneIndex}-dialogue`} className="pf-dialogue-box" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.14, duration: 0.28 }}><p>{currentScene?.narration}</p></motion.div></AnimatePresence>
          <div className="pf-reader-controls"><button onClick={previousScene} disabled={sceneIndex === 0} className="pf-btn-secondary">← Previous</button><div className="pf-scene-dots" aria-label={`Scene ${sceneIndex + 1} of ${scenes.length}`}>{scenes.map((_, index) => <button key={index} onClick={() => goToScene(index)} className={index === sceneIndex ? 'active' : ''} aria-label={`Go to scene ${index + 1}`} />)}</div><button onClick={nextScene} disabled={sceneIndex >= scenes.length - 1} className="pf-btn-primary">{sceneIndex >= scenes.length - 1 && isGenerating ? 'Drawing next…' : 'Next →'}</button></div>
          {isGenerating && <button disabled={isUpdating} onClick={() => updateGeneration(pauseStoryApi)} className="pf-reader-pause">{isUpdating ? 'Requesting…' : 'Pause generation'}</button>}
          {isPaused && <button disabled={isUpdating} onClick={() => updateGeneration(resumeStoryApi)} className="pf-reader-pause">{isUpdating ? 'Resuming…' : 'Resume generation'}</button>}
        </section>}
    </motion.main>
  );
};

export default ReaderPage;
