// src/components/player/VideoPlayer.jsx

import {
  IoArrowBack,
  IoDownload,
  IoCopyOutline,
} from "react-icons/io5";
import {
  MdFastRewind,
  MdPlayArrow,
  MdPause,
  MdFastForward,
  MdVolumeUp,
  MdVolumeOff,
  MdFullscreen,
  MdFullscreenExit,
  MdClosedCaption,
  MdSettings,
} from "react-icons/md";
import { useEffect, useRef, useState } from "react";

export default function VideoPlayer({ video, metaLine, subLine, onBack }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hideControlsTimer = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const sources =
    video.sources && video.sources.length
      ? video.sources
      : [{ label: "Original", url: video.videoUrl }];

  const currentSource = sources[selectedSourceIndex];

  /* ---------------- CONTROL VISIBILITY ---------------- */

  const showPlayerControls = () => {
    setShowControls(true);

    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }

    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  };

  useEffect(() => {
    showPlayerControls();
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, [isPlaying]);

  /* ---------------- VIDEO STATE RESET ---------------- */

  useEffect(() => {
    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);
    setProgress(0);
    setBuffered(0);
  }, [video, selectedSourceIndex]);

  /* ---------------- VIDEO EVENTS ---------------- */

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onLoadedMetadata = () => setDuration(el.duration || 0);

    const onTimeUpdate = () => {
      const t = el.currentTime || 0;
      setCurrentTime(t);
      if (el.duration) {
        setProgress((t / el.duration) * 100);
      }
    };

    const onProgressEvent = () => {
      if (el.buffered.length > 0) {
        const bufferedEnd = el.buffered.end(el.buffered.length - 1);
        if (el.duration > 0) {
          setBuffered((bufferedEnd / el.duration) * 100);
        }
      }
    };

    const onEnded = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);

    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("progress", onProgressEvent);
    el.addEventListener("ended", onEnded);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("playing", onPlaying);

    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("progress", onProgressEvent);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("playing", onPlaying);
    };
  }, [currentSource]);

  /* ---------------- CONTROLS ---------------- */

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;

    if (el.paused) {
      el.play();
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const seek = (value) => {
    const el = videoRef.current;
    if (!el || !duration) return;
    const pct = Number(value);
    const newTime = (pct / 100) * duration;
    el.currentTime = newTime;
    setProgress(pct);
    setCurrentTime(newTime);
  };

  const skip = (seconds) => {
    const el = videoRef.current;
    if (!el) return;
    let newTime = el.currentTime + seconds;
    if (newTime < 0) newTime = 0;
    if (duration && newTime > duration) newTime = duration;
    el.currentTime = newTime;
  };

  const handleVolumeChange = (e) => {
    const el = videoRef.current;
    if (!el) return;
    const v = Number(e.target.value);
    el.volume = v;
    setVolume(v);
    setIsMuted(v === 0);
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
    if (!el.muted && el.volume === 0) {
      el.volume = 0.5;
      setVolume(0.5);
    }
  };

  const formatTime = (secs) => {
    if (!secs || Number.isNaN(secs)) return "00:00";
    const total = Math.floor(secs);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(
        2,
        "0"
      )}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      await container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    if (!currentSource?.url) return;
    const a = document.createElement("a");
    a.href = currentSource.url;
    a.download = video.title || "video.mp4";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = async () => {
    if (!navigator.clipboard || !currentSource?.url) return;
    try {
      await navigator.clipboard.writeText(currentSource.url);
      alert("Direct link copied to clipboard");
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  /* ---------------- RENDER ---------------- */

  return (
    <section className="cs-player-page">
      <div
        ref={containerRef}
        className={
          "cs-player-card" +
          (isFullscreen ? " cs-player-card-fullscreen" : "")
        }
      >
        <div className="cs-player-header">
  <div className="cs-player-header-left">

    {/* iOS-style Back Button */}
    <button
      className="cs-ios-back-btn"
      onClick={onBack}
      aria-label="Back"
    >
      <IoArrowBack size={18} />
    </button>

    {/* Title + meta */}
    <div>
      <h2 className="cs-player-title">{video.title}</h2>

      {metaLine && (
        <p className="cs-player-subtitle">{metaLine}</p>
      )}

      {subLine && (
        <p className="cs-player-subtitle cs-player-subtitle-small">
          {subLine}
        </p>
      )}
    </div>

  </div>
</div>



        <div
          className="cs-video-wrapper"
          onMouseMove={showPlayerControls}
          onClick={showPlayerControls}
          onTouchStart={showPlayerControls}
        >
          <div className="cs-video-inner">
            <video
              key={currentSource.url}
              ref={videoRef}
              className="cs-video"
              playsInline
            >
              <source src={currentSource.url} />
              Your browser does not support the video tag.
            </video>

            {isBuffering && (
              <div className="cs-video-buffering">
                <div className="cs-spinner"></div>
              </div>
            )}
          </div>

          <div
            className={
              "cs-player-controls " +
              (showControls
                ? "cs-player-controls-visible"
                : "cs-player-controls-hidden")
            }
          >
            <div className="cs-controls-row">
              <button className="cs-control-btn" onClick={() => skip(-10)}>
                <MdFastRewind size={24} />
              </button>
              <button className="cs-control-btn" onClick={togglePlay}>
                {isPlaying ? <MdPause size={24} /> : <MdPlayArrow size={24} />}
              </button>
              <button className="cs-control-btn" onClick={() => skip(10)}>
                <MdFastForward size={24} />
              </button>

              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progress}
                onChange={(e) => seek(e.target.value)}
                className="cs-seek-slider"
                style={{ "--progress": `${progress}%`, "--buffered": `${Math.max(progress, buffered)}%` }}
              />

              <span className="cs-time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <button className="cs-control-btn" onClick={toggleMute}>
                {isMuted || volume === 0 ? (
                  <MdVolumeOff size={24} />
                ) : (
                  <MdVolumeUp size={24} />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="cs-volume-slider"
                style={{ "--volume": `${volume * 100}%` }}
              />

              <button className="cs-control-btn">
                <MdClosedCaption size={24} />
              </button>
              <button className="cs-control-btn">
                <MdSettings size={24} />
              </button>
              <button className="cs-control-btn" onClick={toggleFullscreen}>
                {isFullscreen ? <MdFullscreenExit size={24} /> : <MdFullscreen size={24} />}
              </button>
            </div>
          </div>
        </div>

        {!isFullscreen && (
          <div className="cs-player-footer cs-player-footer-buttons">
            <button
              className="cs-btn cs-btn-primary cs-btn-large"
              onClick={handleDownload}
            >
              <IoDownload size={18} /> Download
            </button>
            <button
              className="cs-btn cs-btn-secondary cs-btn-large"
              onClick={handleCopyLink}
            >
              <IoCopyOutline size={18} /> Copy direct link
            </button>
          </div>
        )}
      </div>
    </section>
  );
}