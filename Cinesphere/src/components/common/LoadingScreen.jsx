// src/components/common/LoadingScreen.jsx

import "./LoadingScreen.css";

export default function LoadingScreen() {
  return (
    <div className="cs-loading-screen">
      <div className="cs-loading-overlay"></div>
      <div className="cs-loading-content">
        <div className="cs-loading-logo">
          <span className="cs-loading-logo-icon">🎬</span>
          <span className="cs-loading-logo-text">CineSphere</span>
        </div>
        <p className="cs-loading-subtitle">created by Mohsin</p>
        <div className="cs-loading-message">
          <p className="cs-loading-text">Movies and Series are on the way</p>
          <div className="cs-loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <div className="cs-loading-animation">
          <div className="cs-loading-spinner">
            <div className="cs-loading-spinner-inner"></div>
          </div>
        </div>
      </div>
      <div className="cs-loading-particles">
        <div className="cs-particle cs-particle-1"></div>
        <div className="cs-particle cs-particle-2"></div>
        <div className="cs-particle cs-particle-3"></div>
        <div className="cs-particle cs-particle-4"></div>
        <div className="cs-particle cs-particle-5"></div>
      </div>
    </div>
  );
}