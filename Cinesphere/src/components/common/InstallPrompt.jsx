import { useState, useEffect } from "react";
import { MdDownload, MdClose } from "react-icons/md";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timeoutId;
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the install prompt after 10 seconds
      timeoutId = setTimeout(() => {
        setShow(true);
      }, 10000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="cs-install-prompt">
      <div className="cs-install-icon">
        <MdDownload size={22} />
      </div>
      <div className="cs-install-content">
        <h4>Download App</h4>
        <p>Install CineSphere for a better experience</p>
      </div>
      <div className="cs-install-actions">
        <button className="cs-install-btn" onClick={handleInstallClick}>
          Install
        </button>
        <button className="cs-install-close" onClick={handleDismiss} aria-label="Dismiss">
          <MdClose size={20} />
        </button>
      </div>
    </div>
  );
}
