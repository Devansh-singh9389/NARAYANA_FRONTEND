import React from 'react';
import { motion } from 'framer-motion';
import { getAssetUrl } from '../../services/api';
import '../../styles/HomePage.css';

const statusLabel = (story) => {
  if (story.status === 'delete_requested') return 'Deletion requested';
  if (story.status === 'pause_requested') return 'Pausing…';
  if (story.status === 'paused') return 'Paused';
  if (story.status === 'failed' || story.status === 'error') return 'Generation failed';
  return `Generating ${story.progress ?? 0}%…`;
};

const Card = ({ story, isCoverRegenerating, isMenuOpen, onOpen, onToggleMenu, onDelete, onRegenerate, style }) => {
  const isGenerating = story.status === 'generating';
  const isComicActive = ['generating', 'pause_requested', 'delete_requested'].includes(story.status);
  const isActive = isComicActive || isCoverRegenerating;
  const mode = (story.mode || 'story').toLowerCase().startsWith('topic') ? 'topic' : 'story';
  const thumbSrc = story.thumbnail ? getAssetUrl(story.thumbnail) : '';
  const isThumbnailFailed = story.thumbnail_status === 'failed';
  const status = isCoverRegenerating ? 'Regenerating cover…' : isThumbnailFailed ? 'Cover regeneration failed' : statusLabel(story);

  return (
    <motion.article layoutId={`story-card-${story.id}`} onClick={onOpen} onKeyDown={(event) => event.key === 'Enter' && onOpen()} tabIndex={0} role="link" aria-label={`Open ${story.title || 'comic'}`} className={`pf-card pf-card-vertical ${isActive ? 'pf-card-generating' : ''} ${isCoverRegenerating ? 'pf-card-cover-queue' : ''}`} style={style} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4, borderColor: 'var(--accent)' }}>
      <div className="pf-card-cover">
        {thumbSrc ? <img loading="lazy" src={thumbSrc} alt={story.title || 'Comic cover'} className={isGenerating ? 'pf-img-blur' : ''} onError={(event) => { event.currentTarget.style.opacity = '0'; }} /> : <span className="pf-thumb-fallback">{isComicActive ? 'Generating cover…' : 'No cover yet'}</span>}
      </div>
      <div className="pf-menu-wrap">
        <button onClick={(event) => { event.stopPropagation(); onToggleMenu(); }} className="pf-menu-btn" aria-label={`Actions for ${story.title || 'comic'}`} aria-expanded={isMenuOpen}>⋮</button>
        {isMenuOpen && <div className="pf-menu-dropdown flex flex-col gap-1" role="menu">
          <button onClick={(event) => { event.stopPropagation(); onRegenerate(); }} disabled={isComicActive || isCoverRegenerating} className="pf-menu-action" role="menuitem">🖼️ Regenerate Cover</button>
          <button onClick={(event) => { event.stopPropagation(); onDelete(); }} className="pf-menu-delete" role="menuitem">🗑️ Delete Story</button>
        </div>}
      </div>
      <div className="pf-card-info-surface">
        {isActive && <motion.div className="pf-card-progress-bar" initial={{ width: isCoverRegenerating ? '18%' : 0 }} animate={isCoverRegenerating ? { width: ['18%', '72%', '38%', '88%', '18%'] } : { width: `${story.progress || 0}%` }} transition={isCoverRegenerating ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : { ease: 'linear', duration: 0.5 }} />}
        <div className="pf-card-content-wrapper">
          <div className="pf-card-info">
            <div className="flex items-center gap-2"><span className={`pf-tag pf-tag-${mode}`}>{mode} mode</span>{isActive || isThumbnailFailed || story.status === 'paused' || story.status === 'failed' || story.status === 'error' ? <span className="pf-status-text">{status}</span> : !story.isRead ? <span className="pf-tick pf-tick-red">● New</span> : <span className="pf-tick pf-tick-blue">✓✓ Read</span>}</div>
            <h3 className="pf-card-title">{story.title || 'Untitled Comic'}</h3>
            <p className="pf-card-date">{story.date || 'Unknown date'}</p>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default Card;
