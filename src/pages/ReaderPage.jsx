import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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

  if (isLoading) return <div className="pf-page flex items-center justify-center min-h-screen"><p className="text-[var(--text-muted)] animate-pulse uppercase tracking-widest text-sm font-bold">Connecting to Engine...</p></div>;
  if (!comic) return <div className="pf-page flex items-center justify-center min-h-screen text-center"><div><h2 className="text-2xl font-bold text-[var(--danger)] mb-2">Signal Lost</h2><p className="text-[var(--text-muted)] mb-6">{error || "We couldn't find this story in the archives."}</p><button onClick={() => loadComic(true)} className="pf-btn-secondary mr-3">Retry</button><button onClick={() => navigate('/')} className="pf-btn-primary">Return to Studio</button></div></div>;

  const isGenerating = comic.status === 'generating';
  const isPaused = comic.status === 'paused';
  const isDeleting = comic.status === 'delete_requested';
  const isFailed = ['failed', 'error'].includes(comic.status);
  const displayMode = modeName(comic.mode);
  const progress = Math.min(100, Math.max(0, Number(comic.progress) || 0));

  return (
    <motion.div layoutId={isFromPrompt ? 'prompt-box-morph' : `story-card-${comicId}`} className="pf-page !pb-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className="flex justify-between items-center mb-12">
        <button onClick={() => navigate('/')} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest">← Back to Studio</button>
        <div className={`pf-tag pf-tag-${displayMode.toLowerCase()}`}>{displayMode} Mode</div>
      </header>
      {error && <div className="pf-error" role="alert"><span>{error}</span><button onClick={() => loadComic()} className="pf-btn-secondary">Retry</button></div>}
      {isDeleting ? <div className="pf-reader-state"><h1>Deletion requested</h1><p>The current frame will finish safely, then this comic will be removed.</p></div>
        : isGenerating || comic.status === 'pause_requested' ? <div className="pf-reader-state"><div className="w-full bg-[#151822] rounded-full h-3 relative overflow-hidden border border-[#2A2E3D]"><motion.div className="absolute top-0 left-0 bottom-0 bg-[var(--accent)]" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ ease: 'linear', duration: 0.5 }} /></div><p className="mt-6 text-[var(--accent)] font-bold tracking-widest uppercase text-[10px] animate-pulse">{comic.synopsis || 'Creating your comic'} · {progress}%</p>{isGenerating && <button disabled={isUpdating} onClick={() => updateGeneration(pauseStoryApi)} className="pf-btn-secondary mt-6">{isUpdating ? 'Requesting…' : 'Pause generation'}</button>}</div>
        : isPaused ? <div className="pf-reader-state"><h1>Generation paused</h1><p>{comic.synopsis || 'Resume when you are ready to create the remaining panels.'}</p><button disabled={isUpdating} onClick={() => updateGeneration(resumeStoryApi)} className="pf-btn-primary">{isUpdating ? 'Resuming…' : 'Resume generation'}</button></div>
        : isFailed ? <div className="pf-reader-state"><h1>Generation stopped</h1><p>{comic.synopsis || 'The engine could not finish this comic.'}</p><button onClick={() => navigate('/')} className="pf-btn-primary">Return to Studio</button></div>
        : <div className="max-w-2xl mx-auto w-full"><div className="text-center mb-16"><h1 className="text-3xl font-black text-[var(--text)] mb-3 tracking-tight">{comic.title}</h1><p className="text-[var(--text-faint)] text-[10px] uppercase tracking-widest">Generated {comic.date}</p>{comic.synopsis && <p className="pf-synopsis">{comic.synopsis}</p>}</div>{(comic.scenes || []).length ? <div className="space-y-16">{comic.scenes.map((scene, index) => <motion.article key={scene.id || index} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.15, ease: 'easeOut' }} className="bg-[var(--surface)] rounded-2xl overflow-hidden border border-[var(--border-soft)] shadow-2xl"><div className="w-full aspect-video bg-black relative"><img src={getAssetUrl(scene.imageUrl)} alt={`Scene ${index + 1}: ${scene.narration || 'comic panel'}`} className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></div><div className="p-6 md:p-8 border-t border-[var(--border)]"><p className="text-[var(--text)] text-base md:text-lg leading-relaxed text-center font-medium">{scene.narration}</p></div></motion.article>)}</div> : <div className="pf-reader-state"><p>No panels were generated for this comic.</p></div>}<div className="mt-20 flex items-center justify-center gap-4 text-[var(--text-faint)]"><span className="w-12 h-[1px] bg-[var(--border)]" /><span className="text-[10px] uppercase tracking-widest font-bold">End of Story</span><span className="w-12 h-[1px] bg-[var(--border)]" /></div></div>}
    </motion.div>
  );
};

export default ReaderPage;
