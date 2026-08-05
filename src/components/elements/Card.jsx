import React from 'react';
import { motion } from 'framer-motion';
import '../../styles/HomePage.css';

const BACKEND_URL = "http://127.0.0.1:8000";

const getFullImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url; 
  return `${BACKEND_URL}${url}`;
};

// --- ADDED: onRegenerate prop ---
const Card = ({ story, isMenuOpen, onOpen, onToggleMenu, onDelete, onRegenerate, style }) => {
  const isGenerating = story.status === 'generating';
  const displayMode = story.mode || 'Story';

  const thumbSrc = story.thumbnail 
    ? getFullImageUrl(story.thumbnail) 
    : (isGenerating 
        ? 'https://via.placeholder.com/300x400/151822/4F46E5?text=Generating...' 
        : 'https://via.placeholder.com/300x400/151822/4F46E5?text=No+Cover');

  return (
    <motion.div
      layoutId={`story-card-${story.id}`}
      onClick={onOpen}
      className={`pf-card ${isGenerating ? 'pf-card-generating' : ''}`}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isGenerating ? { y: -4, borderColor: 'var(--accent)' } : {}}
    >
      {isGenerating && (
        <motion.div
          className="pf-card-progress-bar"
          initial={{ width: 0 }}
          animate={{ width: `${story.progress || 0}%` }}
          transition={{ ease: "linear", duration: 0.5 }}
        />
      )}

      <div className="pf-card-content-wrapper">
        <div className="pf-card-info">
          <div className="flex items-center gap-2">
            <span className={`pf-tag pf-tag-${displayMode.split(' ')[0].toLowerCase()}`}>
              {displayMode}
            </span>
            
            {isGenerating ? (
              <span className="pf-status-text">Generating {story.progress}%...</span>
            ) : !story.isRead ? (
              <span className="pf-tick pf-tick-red" title="New Story">● New</span>
            ) : (
              <span className="pf-tick pf-tick-blue" title="Read">✓✓ Read</span>
            )}
          </div>
          
          <h3 className="pf-card-title">{story.title || "Untitled Comic"}</h3>
          <p className="pf-card-date">{story.date || "Unknown date"}</p>
        </div>

        <div className="pf-card-right">
          <div className="pf-thumb">
            <img 
              src={thumbSrc} 
              alt={story.title || 'Thumbnail'} 
              className={isGenerating && story.thumbnail ? 'pf-img-blur' : ''} 
            />
          </div>

          <div className="pf-menu-wrap">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleMenu();
              }}
              className="pf-menu-btn"
              disabled={isGenerating} 
            >
              ⋮
            </button>

            {isMenuOpen && !isGenerating && (
              <div className="pf-menu-dropdown flex flex-col gap-1">
                {/* --- NEW: Regenerate Cover Button --- */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRegenerate(); // Trigger the API call
                    onToggleMenu(); // Close the menu
                  }}
                  className="pf-menu-action text-left p-2 text-sm text-[var(--text)] hover:bg-[var(--surface)] transition-colors rounded"
                >
                  🖼️ Regenerate Cover
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="pf-menu-delete"
                >
                  🗑️ Delete Story
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Card;