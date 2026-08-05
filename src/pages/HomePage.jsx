import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SettingsModal from '../components/elements/SettingModel';
import CardModel from '../components/elements/Card';
import PromptBoxModel from '../components/elements/PromptBox';
import { deleteStoryApi, fetchHistoryApi, generateStoryApi, regenerateThumbnailApi } from '../services/api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import '../styles/HomePage.css';

const isPollingRequired = (story) =>
  ['generating', 'pause_requested', 'delete_requested'].includes(story.status) ||
  story.thumbnail_status === 'generating';

const HomePage = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState('topic');
  const [sceneCount, setSceneCount] = useState(0);
  const [activeMenu, setActiveMenu] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [readComicIds, setReadComicIds] = useLocalStorage('panelforge.readComicIds', []);

  const loadHistory = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const comics = await fetchHistoryApi();
      setHistory(comics);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to reach the comic engine.');
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(true); }, [loadHistory]);

  useEffect(() => {
    if (!history.some(isPollingRequired)) return undefined;
    const timer = window.setInterval(() => loadHistory(), 3000);
    return () => window.clearInterval(timer);
  }, [history, loadHistory]);

  const openStory = (id) => {
    setReadComicIds((ids) => ids.includes(id) ? ids : [...ids, id]);
    navigate(`/comic/${id}`);
  };

  const handleRegenerateThumbnail = async (id) => {
    setActiveMenu(null);
    try {
      const response = await regenerateThumbnailApi(id);
      setHistory((items) => items.map((story) => story.id === id ? { ...story, thumbnail_status: 'generating' } : story));
      setNotice(response.message || 'Cover regeneration has been queued.');
      window.setTimeout(() => loadHistory(), 1500);
    } catch (requestError) {
      setError(requestError.message || 'Could not regenerate the cover.');
    }
  };

  const handleGenerate = async (event) => {
    event?.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError('');
    try {
      const response = await generateStoryApi(prompt, mode, sceneCount);
      navigate(`/comic/${response.comic_id}`, { state: { fromPrompt: true } });
    } catch (requestError) {
      setError(requestError.message || 'Could not start generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteHistory = async (story) => {
    setActiveMenu(null);
    if (!window.confirm(`Delete “${story.title || 'this comic'}”? This cannot be undone.`)) return;
    try {
      const response = await deleteStoryApi(story.id);
      if (story.status === 'generating') {
        setHistory((items) => items.map((item) => item.id === story.id ? { ...item, status: 'delete_requested' } : item));
        setNotice(response.message || 'Deletion requested; it will finish after the current frame.');
      } else {
        setHistory((items) => items.filter((item) => item.id !== story.id));
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not delete the comic.');
    }
  };

  return (
    <div className="pf-page">
      <header className="pf-header">
        <div><h1 className="pf-title">PanelForge</h1><p className="pf-subtitle">Visual Comic Engine</p></div>
        <button onClick={() => setShowSettings(true)} className="pf-icon-btn" title="Settings" aria-label="Settings">⚙️</button>
      </header>
      <main className="pf-main">
        <div className="pf-section-label"><span className="pf-section-dash" /><h2>Previous Stories</h2></div>
        {notice && <p className="pf-notice" role="status">{notice}</p>}
        {error && <div className="pf-error" role="alert"><span>{error}</span><button onClick={() => loadHistory(true)} className="pf-btn-secondary">Retry</button></div>}
        {isLoading ? <div className="pf-empty"><p>Connecting to server...</p></div>
          : history.length === 0 && !error ? <div className="pf-empty"><p>Your first panel is one idea away.</p><p className="pf-empty-sub">Type your idea below to begin.</p></div>
          : <div className="pf-history-grid">{history.map((story, index) => <CardModel key={story.id} story={{ ...story, isRead: story.isRead || readComicIds.includes(story.id) }} isCoverRegenerating={story.thumbnail_status === 'generating'} isMenuOpen={activeMenu === story.id} onOpen={() => openStory(story.id)} onToggleMenu={() => setActiveMenu(activeMenu === story.id ? null : story.id)} onDelete={() => handleDeleteHistory(story)} onRegenerate={() => handleRegenerateThumbnail(story.id)} style={{ animationDelay: `${index * 0.06}s` }} />)}</div>}
      </main>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      <PromptBoxModel prompt={prompt} setPrompt={setPrompt} mode={mode} setMode={setMode} sceneCount={sceneCount} setSceneCount={setSceneCount} onSubmit={handleGenerate} isGenerating={isGenerating} />
    </div>
  );
};

export default HomePage;
