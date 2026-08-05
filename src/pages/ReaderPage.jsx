import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchComicByIdApi } from '../services/api';
import '../styles/HomePage.css'; 

const BACKEND_URL = "http://127.0.0.1:8000";

const ReaderPage = () => {
  const { comicId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [comic, setComic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const getFullImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url; 
  return `${BACKEND_URL}${url}`;
  };
  
  // Keep track of the timeout so we can cancel it if the user leaves the page
  const pollTimerRef = useRef(null);

  const isFromPrompt = location.state?.fromPrompt;
  const activeLayoutId = isFromPrompt ? "prompt-box-morph" : `story-card-${comicId}`;

  // --- THE NEW LIVE POLLING LOGIC ---
  useEffect(() => {
    const loadComic = async () => {
      const data = await fetchComicByIdApi(comicId);
      setComic(data);
      setIsLoading(false);

      // If the backend says it's still working, check again in 2.5 seconds!
      if (data && data.status === 'generating') {
        pollTimerRef.current = setTimeout(loadComic, 2500);
      }
    };

    loadComic();

    // Cleanup: Stop polling if the user clicks "Back to Studio"
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [comicId]);

  if (isLoading) {
    return (
      <div className="pf-page flex items-center justify-center min-h-screen">
        <p className="text-[var(--text-muted)] animate-pulse uppercase tracking-widest text-sm font-bold">
          Connecting to Engine...
        </p>
      </div>
    );
  }
  if (!comic) {
    return (
      <div className="pf-page flex items-center justify-center min-h-screen text-center">
        <div>
          <h2 className="text-2xl font-bold text-[var(--danger)] mb-2">Signal Lost</h2>
          <p className="text-[var(--text-muted)] mb-6">We couldn't find this story in the archives.</p>
          <button onClick={() => navigate('/')} className="pf-btn-primary">Return to Studio</button>
        </div>
      </div>
    );
  }

  const isGenerating = comic.status === 'generating';

  return (
    <motion.div
      layoutId={activeLayoutId}
      className="pf-page !pb-12" // Override bottom padding for reading
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Universal Header */}
      <header className="flex justify-between items-center mb-12">
        <button 
          onClick={() => navigate('/')} 
          className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
        >
          ← Back to Studio
        </button>
        <div className={`pf-tag pf-tag-${comic.mode.toLowerCase()}`}>
          {comic.mode} Mode
        </div>
      </header>

      {/* The Smart Canvas Logic */}
      {isGenerating ? (
        
        /* STATE A: GENERATING (Cinematic Progress Bar) */
        <div className="flex flex-col items-center justify-center mt-32 max-w-lg mx-auto w-full">
          <motion.div 
            className="w-full bg-[#151822] rounded-full h-3 relative overflow-hidden border border-[#2A2E3D]"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            {/* The filling bar */}
            <motion.div
              className="absolute top-0 left-0 bottom-0 bg-[var(--accent)]"
              initial={{ width: 0 }}
              animate={{ width: `${comic.progress}%` }}
              transition={{ ease: "linear", duration: 0.5 }}
            />
          </motion.div>
          
          <p className="mt-6 text-[var(--accent)] font-bold tracking-widest uppercase text-[10px] animate-pulse">
            Consulting the LLM... {comic.progress}%
          </p>
        </div>

      ) : (

        /* STATE B: COMPLETED (The Comic Reader) */
        <div className="max-w-2xl mx-auto w-full">
          {/* Story Title */}
          <div className="text-center mb-16">
            <h1 className="text-3xl font-black text-[var(--text)] mb-3 tracking-tight">
              {comic.title}
            </h1>
            <p className="text-[var(--text-faint)] text-[10px] uppercase tracking-widest">
              Generated {comic.date}
            </p>
          </div>

          {/* Comic Panels Cascade */}
          <div className="space-y-16">
            {comic.scenes.map((scene, index) => (
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15, ease: "easeOut" }}
                className="bg-[var(--surface)] rounded-2xl overflow-hidden border border-[var(--border-soft)] shadow-2xl"
              >
                {/* Image Frame */}
                <div className="w-full aspect-video bg-black relative">
                  <img 
                    src={getFullImageUrl(scene.imageUrl)} 
                    alt={`Scene ${scene.id}`} 
                    className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-300" 
                  />
                </div>
                
                {/* Narration Box */}
                <div className="p-6 md:p-8 border-t border-[var(--border)]">
                  <p className="text-[var(--text)] text-base md:text-lg leading-relaxed text-center font-medium">
                    {scene.narration}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* End of Story Marker */}
          <div className="mt-20 flex items-center justify-center gap-4 text-[var(--text-faint)]">
            <span className="w-12 h-[1px] bg-[var(--border)]" />
            <span className="text-[10px] uppercase tracking-widest font-bold">End of Story</span>
            <span className="w-12 h-[1px] bg-[var(--border)]" />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ReaderPage;