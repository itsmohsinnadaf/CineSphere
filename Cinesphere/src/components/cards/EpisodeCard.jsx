// src/components/cards/EpisodeCard.jsx
import { useState, useRef, useEffect } from 'react';
import ProgressiveImage from "../common/ProgressiveImage";
import { FaPlay, FaDownload, FaEllipsisV } from 'react-icons/fa';

export default function EpisodeCard({ episode, index, active, onClick }) {
  const episodeNumber = index + 1;
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className={`cs-item-card cs-portrait-card ${active ? "cs-item-card-active" : ""}`}
      onClick={onClick}
    >
      <div className="cs-item-image-wrapper">
        <ProgressiveImage src={episode.image} alt={episode.title} className="cs-item-image" />
        <div className="cs-item-gradient" />
        
        {/* Episode Badge */}
        <div className="cs-item-episode-badge">
           Ep {episodeNumber}
        </div>
        
        {/* Play Button */}
        <div className="cs-item-play-btn" onClick={(e) => { e.stopPropagation(); onClick(e); }}>
          <div className="cs-play-icon-bg">
            <FaPlay className="cs-play-icon" />
          </div>
          <span className="cs-play-text">Play</span>
        </div>
      </div>
      
      <div className="cs-item-meta">
        <h3 className="cs-item-title">{episode.title}</h3>
        <p className="cs-item-details">{episode.type || "Episode"}</p>
        <div className="cs-item-divider" />
        
        <div className="cs-item-bottom-actions">
          {episode.videoUrl ? (
            <a
              href={episode.videoUrl}
              className="cs-download-btn"
              target="_blank"
              rel="noreferrer"
              download
              onClick={(e) => e.stopPropagation()}
            >
              <FaDownload className="cs-download-icon" />
              Download
            </a>
          ) : (
            <div className="cs-download-btn-placeholder" />
          )}
          
          <div className="cs-card-menu-container" ref={menuRef}>
            <button className="cs-more-btn" aria-label="More options" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}>
              <FaEllipsisV />
            </button>
            
            {showMenu && (
              <div className="cs-card-popup-menu">
                <button className="cs-popup-btn" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onClick(e); }}>
                  <FaPlay className="cs-popup-icon" /> Play
                </button>
                {episode.videoUrl && (
                  <a href={episode.videoUrl} className="cs-popup-btn" target="_blank" rel="noreferrer" download onClick={(e) => e.stopPropagation()}>
                    <FaDownload className="cs-popup-icon" /> Download
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
