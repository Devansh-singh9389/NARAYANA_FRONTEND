import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SettingsModal from '../components/elements/SettingModel';
import CardModel from '../components/elements/Card';
import PromptBoxModel from '../components/elements/PromptBox';
import { fetchHistoryApi, deleteStoryApi, generateStoryApi } from '../services/api';
import { regenerateThumbnailApi} from '../services/api';

import '../styles/HomePage.css';

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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchHistoryApi();
        setHistory(data);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);


  const handleRegenerateThumbnail = async (id) => {
  setActiveMenu(null); // Close the menu
  await regenerateThumbnailApi(id); // Send request to backend
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const response = await generateStoryApi(prompt, mode, sceneCount);
      navigate(`/comic/${response.comic_id}`, {
        state: { fromPrompt: true }
      });
    } catch (error) {
      console.error("Failed to generate:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteHistory = async (id) => {
    setActiveMenu(null);
    await deleteStoryApi(id);
    setHistory(history.filter(item => item.id !== id));
  };

  return (
    <div className="pf-page">
      {/* Header */}
      <header className="pf-header">
        <div>
          <h1 className="pf-title">PanelForge</h1>
          <p className="pf-subtitle">Visual Comic Engine</p>
        </div>

        <button
          onClick={() => setShowSettings(true)}
          className="pf-icon-btn"
          title="Settings"
        >
          ⚙️
        </button>
      </header>

      {/* History Feed */}
      <main className="pf-main">
        <div className="pf-section-label">
          <span className="pf-section-dash" />
          <h2>Previous Stories</h2>
        </div>

        {isLoading ? (
          <div className="pf-empty" style={{ border: 'none' }}>
            <p style={{ color: 'var(--text-muted)' }}>Connecting to server...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="pf-empty">
            <p>Your first panel is one idea away.</p>
            <p className="pf-empty-sub">Type your idea below to begin.</p>
          </div>
        ) : (
          <div className="pf-history-grid">
            {history.map((story, i) => (
              <CardModel
                key={story.id}
                story={story}
                isMenuOpen={activeMenu === story.id}
                onOpen={() => navigate(`/comic/${story.id}`)}
                onToggleMenu={() => setActiveMenu(activeMenu === story.id ? null : story.id)}
                onDelete={() => handleDeleteHistory(story.id)}
                onRegenerate={() => handleRegenerateThumbnail(story.id)}
                style={{ animationDelay: `${i * 0.06}s` }}
              />
            ))}
          </div>
        )}
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <PromptBoxModel
        prompt={prompt}
        setPrompt={setPrompt}
        mode={mode}
        setMode={setMode}
        sceneCount={sceneCount}
        setSceneCount={setSceneCount}
        onSubmit={handleGenerate}
        isGenerating={isGenerating}
      />
    </div>
  );
};

export default HomePage;