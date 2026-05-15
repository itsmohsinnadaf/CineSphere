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
  MdPictureInPicture,
  MdPictureInPictureAlt,
  MdSpeed,
  MdClosedCaption,
  MdClosedCaptionDisabled,
  MdSettings,
  MdAudiotrack,
  MdReplay10,
  MdForward10,
} from "react-icons/md";
import { useEffect, useRef, useState, useCallback } from "react";
import { saveProgress, getContinueWatching } from "../../hooks/useContinueWatching";

function formatTimeRaw(secs) {
  if (!secs || Number.isNaN(secs)) return "0:00";
  const total = Math.floor(secs);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const DBL_CLICK_MS = 280; // window to detect double-click

export default function VideoPlayer({ video, metaLine, subLine, onBack, context }) {
  const videoRef        = useRef(null);
  const containerRef    = useRef(null);
  const hideTimer       = useRef(null);
  const saveIntervalRef = useRef(null);
  const seekWrapRef     = useRef(null);
  const clickTimerRef   = useRef(null);
  const clickDataRef    = useRef({ count: 0, side: null });

  /* ── Saved position ── */
  const savedEntry = getContinueWatching().find((i) => i.id === video.id);
  const resumeTime = savedEntry ? savedEntry.currentTime : 0;
  const [resumeState, setResumeState] = useState(resumeTime > 0 ? "asking" : "done");

  /* ── Core state ── */
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [isBuffering,   setIsBuffering]   = useState(false);
  const [duration,      setDuration]      = useState(0);
  const [currentTime,   setCurrentTime]   = useState(0);
  const [progress,      setProgress]      = useState(0);
  const [buffered,      setBuffered]      = useState(0);
  const [volume,        setVolume]        = useState(1);
  const [isMuted,       setIsMuted]       = useState(false);
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const [isPiP,         setIsPiP]         = useState(false);
  const [showControls,  setShowControls]  = useState(true);
  const [hoverTime,     setHoverTime]     = useState(null);
  const [selectedSourceIndex] = useState(0);

  /* ── Speed ── */
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  /* ── CC / Text tracks ── */
  const [textTracks,   setTextTracks]   = useState([]); // available tracks
  const [activeCC,     setActiveCC]     = useState(-1); // -1 = off
  const [showCCMenu,   setShowCCMenu]   = useState(false);

  /* ── Audio tracks ── */
  const [audioTracks,  setAudioTracks]  = useState([]);
  const [activeAudio,  setActiveAudio]  = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  /* ── Seek indicator (Netflix-style ripple) ── */
  const [seekIndicator, setSeekIndicator] = useState(null);
  const seekCountRef = useRef({ left: 0, right: 0 });

  /* ── Centre play/pause flash ── */
  const [playPauseFlash, setPlayPauseFlash] = useState(null); // 'play' | 'pause' | null
  const flashTimerRef = useRef(null);

  const sources = video.sources?.length
    ? video.sources
    : [{ label: "Original", url: video.videoUrl }];
  const currentSource = sources[selectedSourceIndex];

  /* ─────────────────────────────────────────────────────
     CONTROL VISIBILITY
  ───────────────────────────────────────────────────── */
  const showPlayerControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (isPlaying) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    showPlayerControls();
    return () => clearTimeout(hideTimer.current);
  }, [isPlaying]);

  /* ─────────────────────────────────────────────────────
     AUTO-SAVE PROGRESS
  ───────────────────────────────────────────────────── */
  useEffect(() => {
    const save = () => {
      const el = videoRef.current;
      if (el && el.duration > 0 && !el.paused) {
        saveProgress(video, el.currentTime, el.duration, context || {});
      }
    };
    saveIntervalRef.current = setInterval(save, 5000);
    return () => {
      clearInterval(saveIntervalRef.current);
      const el = videoRef.current;
      if (el && el.duration > 0) saveProgress(video, el.currentTime, el.duration, context || {});
    };
  }, [video, context]);


  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onMeta = () => {
      setDuration(el.duration || 0);

      // ── Text tracks (CC / Subtitles) ──
      const tTracks = Array.from(el.textTracks || []);
      setTextTracks(tTracks);
      // Start all hidden
      tTracks.forEach((t) => { t.mode = "hidden"; });

      // ── Audio tracks ──
      if (el.audioTracks && el.audioTracks.length > 0) {
        setAudioTracks(Array.from(el.audioTracks));
        setActiveAudio(0);
      }
    };

    const onTime = () => {
      const t = el.currentTime || 0;
      setCurrentTime(t);
      if (el.duration) setProgress((t / el.duration) * 100);
    };
    const onProg = () => {
      if (el.buffered.length > 0 && el.duration > 0) {
        setBuffered((el.buffered.end(el.buffered.length - 1) / el.duration) * 100);
      }
    };
    const onEnded    = () => setIsPlaying(false);
    const onWaiting  = () => setIsBuffering(true);
    const onPlaying  = () => setIsBuffering(false);
    const onPiPEnter = () => setIsPiP(true);
    const onPiPLeave = () => setIsPiP(false);

    el.addEventListener("loadedmetadata",        onMeta);
    el.addEventListener("timeupdate",            onTime);
    el.addEventListener("progress",              onProg);
    el.addEventListener("ended",                 onEnded);
    el.addEventListener("waiting",               onWaiting);
    el.addEventListener("playing",               onPlaying);
    el.addEventListener("enterpictureinpicture", onPiPEnter);
    el.addEventListener("leavepictureinpicture", onPiPLeave);

    return () => {
      el.removeEventListener("loadedmetadata",        onMeta);
      el.removeEventListener("timeupdate",            onTime);
      el.removeEventListener("progress",              onProg);
      el.removeEventListener("ended",                 onEnded);
      el.removeEventListener("waiting",               onWaiting);
      el.removeEventListener("playing",               onPlaying);
      el.removeEventListener("enterpictureinpicture", onPiPEnter);
      el.removeEventListener("leavepictureinpicture", onPiPLeave);
    };
  }, [currentSource]);

  /* ─────────────────────────────────────────────────────
     RESUME MODAL ACTIONS
  ───────────────────────────────────────────────────── */
  const handleRestart = () => {
    const el = videoRef.current;
    if (el) { el.currentTime = 0; el.play(); }
    setIsPlaying(true);
    setResumeState("done");
  };

  const handleContinue = () => {
    const el = videoRef.current;
    if (el) { el.currentTime = resumeTime; el.play(); }
    setIsPlaying(true);
    setResumeState("done");
  };

  /* ─────────────────────────────────────────────────────
     CORE CONTROLS
  ───────────────────────────────────────────────────── */
  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) { el.play(); setIsPlaying(true); }
    else           { el.pause(); setIsPlaying(false); }
  }, []);

  const seek = (value) => {
    const el = videoRef.current;
    if (!el || !duration) return;
    const pct = Number(value);
    el.currentTime = (pct / 100) * duration;
    setProgress(pct);
    setCurrentTime(el.currentTime);
  };

  const skip = useCallback((seconds) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(duration || Infinity, el.currentTime + seconds));
  }, [duration]);

  /* ─────────────────────────────────────────────────────
     MEDIA SESSION API — PiP title + OS media controls
     Must be placed AFTER skip is declared.
  ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title:  video.title  || "CineSphere",
      artist: metaLine     || "CineSphere",
      album:  subLine      || "",
      artwork: video.image
        ? [
            { src: video.image, sizes: "96x96",  type: "image/jpeg" },
            { src: video.image, sizes: "512x512", type: "image/jpeg" },
          ]
        : [],
    });

    const ms = navigator.mediaSession;
    ms.setActionHandler("play",         () => { videoRef.current?.play();  setIsPlaying(true);  });
    ms.setActionHandler("pause",        () => { videoRef.current?.pause(); setIsPlaying(false); });
    ms.setActionHandler("seekbackward", (d) => skip(-(d?.seekOffset ?? 10)));
    ms.setActionHandler("seekforward",  (d) => skip( d?.seekOffset ?? 10));
    ms.setActionHandler("stop",         () => { videoRef.current?.pause(); setIsPlaying(false); onBack?.(); });

    return () => {
      navigator.mediaSession.metadata = null;
      ["play","pause","seekbackward","seekforward","stop"].forEach((a) => {
        try { navigator.mediaSession.setActionHandler(a, null); } catch (_) {}
      });
    };
  }, [video, metaLine, subLine, skip, onBack]);

  const changeVolume = (v) => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = v;
    setVolume(v);
    setIsMuted(v === 0);
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
    if (!el.muted && el.volume === 0) { el.volume = 0.5; setVolume(0.5); }
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

  const togglePiP = async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await el.requestPictureInPicture();
    } catch (err) { console.warn("PiP:", err); }
  };

  const setSpeed = (speed) => {
    const el = videoRef.current;
    if (el) el.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  /* ─────────────────────────────────────────────────────
     CC (TEXT TRACKS)
  ───────────────────────────────────────────────────── */
  const toggleCCTrack = (index) => {
    const el = videoRef.current;
    if (!el) return;
    const newActive = activeCC === index ? -1 : index;
    Array.from(el.textTracks).forEach((t, i) => {
      t.mode = i === newActive ? "showing" : "hidden";
    });
    setActiveCC(newActive);
    setShowCCMenu(false);
  };

  /* ─────────────────────────────────────────────────────
     AUDIO TRACKS
  ───────────────────────────────────────────────────── */
  const switchAudioTrack = (index) => {
    const el = videoRef.current;
    if (!el || !el.audioTracks) return;
    Array.from(el.audioTracks).forEach((t, i) => { t.enabled = i === index; });
    setActiveAudio(index);
  };

  /* ─────────────────────────────────────────────────────
     CLICK / DOUBLE-CLICK ON VIDEO AREA
     Single click = play/pause
     Double click left = -10s
     Double click right = +10s
  ───────────────────────────────────────────────────── */
  const fireSeekIndicator = (side) => {
    seekCountRef.current[side] = (seekCountRef.current[side] || 0) + 1;
    setSeekIndicator({ side, count: seekCountRef.current[side] });
    setTimeout(() => {
      setSeekIndicator(null);
      seekCountRef.current = { left: 0, right: 0 };
    }, 700);
  };

  const handleVideoAreaClick = useCallback((e) => {
    if (e.target.closest(".cs-player-controls")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const side = relX < 0.5 ? "left" : "right";

    clickDataRef.current.count += 1;
    if (!clickDataRef.current.side) clickDataRef.current.side = side;

    clearTimeout(clickTimerRef.current);

    clickTimerRef.current = setTimeout(() => {
      const { count, side: s } = clickDataRef.current;

      if (count >= 2) {
        // Double click — seek
        const amount = s === "left" ? -10 : 10;
        skip(amount);
        fireSeekIndicator(s);
      } else {
        // Single click — play/pause with center icon flash
        const el = videoRef.current;
        const willPause = el && !el.paused;
        togglePlay();
        // Show the flash icon
        clearTimeout(flashTimerRef.current);
        setPlayPauseFlash(willPause ? "pause" : "play");
        flashTimerRef.current = setTimeout(() => setPlayPauseFlash(null), 650);
      }

      showPlayerControls();
      clickDataRef.current = { count: 0, side: null };
    }, DBL_CLICK_MS);
  }, [skip, togglePlay, showPlayerControls]);

  /* ─────────────────────────────────────────────────────
     KEYBOARD SHORTCUTS
  ───────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      if (resumeState === "asking") return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      switch (e.code) {
        case "Space": case "KeyK": e.preventDefault(); togglePlay(); showPlayerControls(); break;
        case "KeyF":  e.preventDefault(); toggleFullscreen(); break;
        case "KeyM":  e.preventDefault(); toggleMute(); break;
        case "ArrowRight": e.preventDefault(); skip(10);  fireSeekIndicator("right"); showPlayerControls(); break;
        case "ArrowLeft":  e.preventDefault(); skip(-10); fireSeekIndicator("left");  showPlayerControls(); break;
        case "ArrowUp":    e.preventDefault(); changeVolume(Math.min(1, volume + 0.1)); break;
        case "ArrowDown":  e.preventDefault(); changeVolume(Math.max(0, volume - 0.1)); break;
        default: break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPlaying, volume, isFullscreen, resumeState, skip, togglePlay]);

  /* ── Seek tooltip ── */
  const handleSeekHover = (e) => {
    const bar = seekWrapRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setHoverTime({ pct, time: (pct / 100) * duration });
  };

  const handleDownload = () => {
    if (!currentSource?.url) return;
    const a = document.createElement("a");
    a.href = currentSource.url;
    a.download = video.title || "video.mp4";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleCopyLink = async () => {
    if (!navigator.clipboard || !currentSource?.url) return;
    try { await navigator.clipboard.writeText(currentSource.url); alert("Link copied!"); }
    catch (err) { console.error(err); }
  };

  const ccActive = activeCC >= 0;

  /* ─────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────── */
  return (
    <section className="cs-player-page">

      {/* ── Resume modal ── */}
      {resumeState === "asking" && (
        <div className="cs-resume-modal-backdrop">
          <div className="cs-resume-modal">
            <div className="cs-resume-modal-icon">▶</div>
            <h3 className="cs-resume-modal-title">Resume Watching?</h3>
            <p className="cs-resume-modal-subtitle">
              You left off at <strong>{formatTimeRaw(resumeTime)}</strong>
            </p>
            <div className="cs-resume-modal-actions">
              <button className="cs-resume-btn cs-resume-btn-secondary" onClick={handleRestart}>↺ Restart</button>
              <button className="cs-resume-btn cs-resume-btn-primary"   onClick={handleContinue}>▶ Continue</button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className={"cs-player-card" + (isFullscreen ? " cs-player-card-fullscreen" : "")}
      >
        {/* Header */}
        <div className="cs-player-header">
          <div className="cs-player-header-left">
            <button className="cs-ios-back-btn" onClick={onBack} aria-label="Back">
              <IoArrowBack size={18} />
            </button>
            <div>
              <h2 className="cs-player-title">{video.title}</h2>
              {metaLine && <p className="cs-player-subtitle">{metaLine}</p>}
              {subLine  && <p className="cs-player-subtitle cs-player-subtitle-small">{subLine}</p>}
            </div>
          </div>
          <div className="cs-player-shortcuts-hint">
            <span><kbd>Space</kbd> Play/Pause</span>
            <span><kbd>←</kbd><kbd>→</kbd> Seek ±10s</span>
            <span><kbd>M</kbd> Mute</span>
            <span><kbd>F</kbd> Fullscreen</span>
          </div>
        </div>

        {/* Video wrapper */}
        <div
          className="cs-video-wrapper"
          onMouseMove={showPlayerControls}
          onTouchStart={showPlayerControls}
          onClick={handleVideoAreaClick}
        >
          <div className="cs-video-inner">
            <video key={currentSource.url} ref={videoRef} className="cs-video" playsInline>
              <source src={currentSource.url} />
            </video>

            {isBuffering && (
              <div className="cs-video-buffering"><div className="cs-spinner" /></div>
            )}

            {/* ── Centre play/pause flash ── */}
            {playPauseFlash && (
              <div className="cs-center-flash">
                {playPauseFlash === "play"
                  ? <MdPlayArrow size={72} />
                  : <MdPause     size={72} />}
              </div>
            )}

            {/* ── Seek indicator (left / right ripple) ── */}
            {seekIndicator && (
              <div className={`cs-seek-indicator cs-seek-indicator-${seekIndicator.side}`}>
                <div className="cs-seek-ripple" />
                <span className="cs-seek-indicator-icon">
                  {seekIndicator.side === "left"
                    ? <MdReplay10  size={48} />
                    : <MdForward10 size={48} />}
                </span>
                <span className="cs-seek-indicator-text">
                  {seekIndicator.side === "left" ? "-10s" : "+10s"}
                </span>
              </div>
            )}
          </div>

          {/* Controls overlay */}
          <div
            className={"cs-player-controls " + (showControls ? "cs-player-controls-visible" : "cs-player-controls-hidden")}
            onClick={(e) => e.stopPropagation()} // prevent bubbling to video wrapper
          >
            <div className="cs-controls-col">
              {/* Seek bar */}
              <div
                ref={seekWrapRef}
                className="cs-seek-wrap"
                onMouseMove={handleSeekHover}
                onMouseLeave={() => setHoverTime(null)}
              >
                {hoverTime && (
                  <div className="cs-seek-tooltip" style={{ left: `clamp(28px, ${hoverTime.pct}%, calc(100% - 28px))` }}>
                    {formatTimeRaw(hoverTime.time)}
                  </div>
                )}
                <input
                  type="range" min="0" max="100" step="0.1"
                  value={progress}
                  onChange={(e) => seek(e.target.value)}
                  className="cs-seek-slider"
                  style={{ "--progress": `${progress}%`, "--buffered": `${Math.max(progress, buffered)}%` }}
                  aria-label="Seek"
                />
              </div>

              {/* Controls row */}
              <div className="cs-controls-row">
                {/* Left group */}
                <div className="cs-controls-left">
                  <button className="cs-control-btn" onClick={() => skip(-10)} title="Rewind 10s (←)">
                    <MdFastRewind size={24} />
                  </button>
                  <button className="cs-control-btn cs-play-btn" onClick={togglePlay} title="Play/Pause (Space)">
                    {isPlaying ? <MdPause size={30} /> : <MdPlayArrow size={30} />}
                  </button>
                  <button className="cs-control-btn" onClick={() => skip(10)} title="Forward 10s (→)">
                    <MdFastForward size={24} />
                  </button>
                  <button className="cs-control-btn" onClick={toggleMute} title="Mute (M)">
                    {isMuted || volume === 0 ? <MdVolumeOff size={22} /> : <MdVolumeUp size={22} />}
                  </button>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    className="cs-volume-slider"
                    style={{ "--volume": `${(isMuted ? 0 : volume) * 100}%` }}
                    aria-label="Volume"
                  />
                  <span className="cs-time-display">
                    {formatTimeRaw(currentTime)} / {formatTimeRaw(duration)}
                  </span>
                </div>

                {/* Right group */}
                <div className="cs-controls-right">

                  {/* Speed */}
                  <div className="cs-speed-wrap">
                    <button className="cs-control-btn cs-speed-btn" onClick={() => { setShowSpeedMenu(p => !p); setShowCCMenu(false); setShowSettings(false); }} title="Speed">
                      <MdSpeed size={22} />
                      <span className="cs-speed-label">{playbackSpeed}×</span>
                    </button>
                    {showSpeedMenu && (
                      <div className="cs-speed-menu">
                        <p className="cs-speed-menu-title">Speed</p>
                        {SPEEDS.map((s) => (
                          <button key={s} className={"cs-speed-option" + (playbackSpeed === s ? " cs-speed-option-active" : "")} onClick={() => setSpeed(s)}>
                            {s === 1 ? "Normal" : `${s}×`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CC */}
                  <div className="cs-speed-wrap">
                    <button
                      className={"cs-control-btn" + (ccActive ? " cs-control-btn-active" : "")}
                      onClick={() => { setShowCCMenu(p => !p); setShowSpeedMenu(false); setShowSettings(false); }}
                      title="Subtitles / CC"
                    >
                      {ccActive ? <MdClosedCaption size={22} /> : <MdClosedCaptionDisabled size={22} />}
                    </button>
                    {showCCMenu && (
                      <div className="cs-speed-menu">
                        <p className="cs-speed-menu-title">Subtitles / CC</p>
                        {textTracks.length === 0 ? (
                          <p className="cs-speed-option" style={{ opacity: 0.4, cursor: "default" }}>No subtitles available</p>
                        ) : (
                          <>
                            <button className={"cs-speed-option" + (activeCC === -1 ? " cs-speed-option-active" : "")} onClick={() => toggleCCTrack(-2)}>
                              Off
                            </button>
                            {textTracks.map((t, i) => (
                              <button key={i} className={"cs-speed-option" + (activeCC === i ? " cs-speed-option-active" : "")} onClick={() => toggleCCTrack(i)}>
                                {t.label || t.language || `Track ${i + 1}`}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Settings (Audio tracks) */}
                  <div className="cs-speed-wrap">
                    <button
                      className="cs-control-btn"
                      onClick={() => { setShowSettings(p => !p); setShowSpeedMenu(false); setShowCCMenu(false); }}
                      title="Settings"
                    >
                      <MdSettings size={22} />
                    </button>
                    {showSettings && (
                      <div className="cs-speed-menu cs-settings-menu">
                        <p className="cs-speed-menu-title">
                          <MdAudiotrack size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                          Audio Track
                        </p>
                        {audioTracks.length === 0 ? (
                          <p className="cs-speed-option" style={{ opacity: 0.4, cursor: "default" }}>Default audio only</p>
                        ) : (
                          audioTracks.map((t, i) => (
                            <button
                              key={i}
                              className={"cs-speed-option" + (activeAudio === i ? " cs-speed-option-active" : "")}
                              onClick={() => switchAudioTrack(i)}
                            >
                              {t.label || t.language || `Track ${i + 1}`}
                              {t.language ? <span style={{ opacity: 0.5, marginLeft: 6, fontSize: 11 }}>{t.language.toUpperCase()}</span> : null}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* PiP */}
                  {document.pictureInPictureEnabled && (
                    <button className="cs-control-btn" onClick={togglePiP} title="Picture in Picture">
                      {isPiP ? <MdPictureInPicture size={22} /> : <MdPictureInPictureAlt size={22} />}
                    </button>
                  )}

                  {/* Fullscreen */}
                  <button className="cs-control-btn" onClick={toggleFullscreen} title="Fullscreen (F)">
                    {isFullscreen ? <MdFullscreenExit size={26} /> : <MdFullscreen size={26} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {!isFullscreen && (
          <div className="cs-player-footer cs-player-footer-buttons">
            <button className="cs-btn cs-btn-primary cs-btn-large" onClick={handleDownload}>
              <IoDownload size={18} /> Download
            </button>
            <button className="cs-btn cs-btn-secondary cs-btn-large" onClick={handleCopyLink}>
              <IoCopyOutline size={18} /> Copy direct link
            </button>
          </div>
        )}
      </div>
    </section>
  );
}