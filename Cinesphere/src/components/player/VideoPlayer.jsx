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
  MdChevronRight,
  MdChevronLeft,
} from "react-icons/md";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { saveProgress, getContinueWatching } from "../../hooks/useContinueWatching";
import { MdCheckCircle } from "react-icons/md";
import { probeMediaTracks, getStreamUrl, getSubtitleUrl } from "../../api/api";

/* ── VTT parser (shared) ── */
function parseVtt(vttText) {
  const cues = [];
  const blocks = vttText.split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const timingIdx = lines.findIndex(l => l.includes('-->'));
    if (timingIdx < 0) continue;
    const m = lines[timingIdx].match(/(\d{1,2}:)?([\d]{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}:)?([\d]{2}):(\d{2})[.,](\d{3})/);
    if (!m) continue;
    const t = (h, min, s, ms) => (h ? parseInt(h) : 0) * 3600 + parseInt(min) * 60 + parseInt(s) + parseInt(ms) / 1000;
    const start = t(m[1], m[2], m[3], m[4]);
    const end   = t(m[5], m[6], m[7], m[8]);
    const text  = lines.slice(timingIdx + 1).join('\n').replace(/<[^>]+>/g, '').trim();
    if (text) cues.push({ start, end, text });
  }
  return cues;
}

/* ── Client-side subtitle cue cache: key = "path:trackOrder" → cues[] ── */
const _ccCueCache = new Map();

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

// Common ISO 639-2/3 codes → readable names
const LANG_NAMES = {
  hin: "Hindi", eng: "English", tam: "Tamil", tel: "Telugu",
  kan: "Kannada", mal: "Malayalam", mar: "Marathi", ben: "Bengali",
  guj: "Gujarati", pan: "Punjabi", urd: "Urdu", ori: "Odia",
  jpn: "Japanese", kor: "Korean", zho: "Chinese", cmn: "Mandarin",
  spa: "Spanish", fra: "French", deu: "German", ita: "Italian",
  por: "Portuguese", rus: "Russian", ara: "Arabic", tha: "Thai",
  und: "Unknown",
};

export default function VideoPlayer({ video, metaLine, subLine, onBack, context }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hideTimer = useRef(null);
  const saveIntervalRef = useRef(null);
  const seekWrapRef = useRef(null);
  const clickTimerRef = useRef(null);
  const clickDataRef = useRef({ count: 0, side: null });
  const skipDebounceRef = useRef(null);

  /* ── Saved position — read localStorage once via useMemo (#8) ── */
  const resumeEntry = useMemo(() => {
    return getContinueWatching().find((i) => i.id === video.id);
  }, [video.id]);
  const resumeTime = resumeEntry ? resumeEntry.currentTime : 0;
  const [resumeState, setResumeState] = useState(resumeTime > 0 ? "asking" : "done");

  /* ── Toast notification (#1) ── */
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  /* ── Core state ── */
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)');
    const listener = (e) => setIsMobile(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);
  const [hoverTime, setHoverTime] = useState(null);
  // selectedSourceIndex removed — single-source only for now (#13)

  /* ── Speed ── */
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showCCMenu, setShowCCMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  /* ── CC / Text tracks (from server probe) ── */
  const [textTracks, setTextTracks] = useState([]); // probed subtitle tracks
  const [activeCC, setActiveCC] = useState(-1); // -1 = off
  const [ccCues, setCcCues] = useState([]); // parsed VTT cues [{start, end, text}]
  const [ccText, setCcText] = useState(""); // currently displayed subtitle line

  /* ── Audio tracks (from server probe) ── */
  const [audioTracks, setAudioTracks] = useState([]);
  const [activeAudio, setActiveAudio] = useState(0);
  /* ── State for generic settings UI ── */
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState("main"); // "main" | "speed" | "audio" | "cc"
  const [probeLoading, setProbeLoading] = useState(false);
  /* ── Mobile bottom sheet ── */
  const [mobileSheet, setMobileSheet] = useState(null); // null | 'speed' | 'cc' | 'settings'

  /* ── Current video source (may change when switching audio tracks) ── */
  const [videoSrc, setVideoSrc] = useState(video.videoUrl);
  const [streamOffset, setStreamOffset] = useState(0); // Offset for FFmpeg streams

  /* ── Seek Bar Dragging State ── */
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  /* ── Seek indicator (Netflix-style ripple) ── */
  const [seekIndicator, setSeekIndicator] = useState(null);
  const seekCountRef = useRef({ left: 0, right: 0 });

  /* ── Centre play/pause flash ── */
  const [playPauseFlash, setPlayPauseFlash] = useState(null); // 'play' | 'pause' | null
  const flashTimerRef = useRef(null);

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
    setTimeout(() => showPlayerControls(), 0);
    return () => clearTimeout(hideTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]); // showPlayerControls is stable via useCallback

  /* ─────────────────────────────────────────────────────
     AUTO-SAVE PROGRESS
  ───────────────────────────────────────────────────── */
  useEffect(() => {
    const el = videoRef.current;
    const save = () => {
      if (el && !el.paused && duration > 0) {
        const virtualTime = el.currentTime + streamOffset;
        saveProgress(video, virtualTime, duration, context || {}, activeAudio, activeCC);
      }
    };
    saveIntervalRef.current = setInterval(save, 5000);
    return () => {
      clearInterval(saveIntervalRef.current);
      if (el && duration > 0) {
        const virtualTime = el.currentTime + streamOffset;
        saveProgress(video, virtualTime, duration, context || {}, activeAudio, activeCC);
      }
    };
  }, [video, context, streamOffset, duration, activeAudio, activeCC]);


  /* ─────────────────────────────────────────────────────
     PROBE: fetch audio + subtitle tracks from backend
  ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!video.path) return; // no path = can't probe
    let cancelled = false;

    setTimeout(() => setProbeLoading(true), 0);
    probeMediaTracks(video.path)
      .then((data) => {
        if (cancelled) return;
        setAudioTracks(data.audio || []);
        setTextTracks(data.subtitles || []);

        // Set the authoritative full-file duration from the probe
        if (data.duration && data.duration > 0) {
          setDuration(data.duration);
        }

        // Find saved or default audio track
        let audioIdx = resumeEntry?.audioTrack ?? -1;
        if (audioIdx < 0 || audioIdx >= (data.audio || []).length) {
          audioIdx = (data.audio || []).findIndex((t) => t.default);
          if (audioIdx < 0) audioIdx = 0;
        }

        let ccIdx = resumeEntry?.ccTrack ?? -1;
        if (ccIdx >= (data.subtitles || []).length) ccIdx = -1;

        setActiveAudio(audioIdx);
        setActiveCC(ccIdx);

        // Background-prefetch all text subtitle tracks so the backend caches them
        // and the client cue cache is warm before the user clicks CC
        (data.subtitles || []).forEach((track) => {
          const key = `${video.path}:${track.order}`;
          if (_ccCueCache.has(key)) return; // already cached
          fetch(getSubtitleUrl(video.path, track.order))
            .then(r => r.ok ? r.text() : Promise.reject())
            .then(vttText => {
              const cues = parseVtt(vttText);
              if (cues.length > 0) _ccCueCache.set(key, cues);
            })
            .catch(() => {}); // silent — this is best-effort prefetch
        });

        // If not asking to resume (fresh start) and audioIdx !== 0, load stream immediately
        if (resumeTime === 0 && audioIdx !== 0) {
           setStreamOffset(0);
           setVideoSrc(getStreamUrl(video.path, audioIdx, 0));
        }
      })
      .catch((err) => {
        if (!cancelled) console.warn("Probe failed:", err.message);
      })
      .finally(() => {
        if (!cancelled) setProbeLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.path]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onMeta = () => {
      const elDur = el.duration;
      if (!elDur || !isFinite(elDur) || elDur <= 0) return;
      setDuration(prev => {
        // When streaming with offset, the element reports a shorter duration.
        // Only accept the new duration if it's larger (i.e. the full file),
        // or if we have no duration yet.
        if (!prev || prev <= 0) return elDur;
        // If the new element duration is close to or larger than what we had, accept it
        if (elDur >= prev) return elDur;
        // Otherwise keep the existing (full) duration
        return prev;
      });
    };

    const onTime = () => {
      const actualTime = el.currentTime || 0;
      const virtualTime = actualTime + streamOffset;
      setCurrentTime(virtualTime);
      setDuration(prev => {
        const d = prev || 0;
        if (d > 0 && !isDragging) {
          setProgress(Math.min(100, (virtualTime / d) * 100));
        }
        return d;
      });
    };
    const onProg = () => {
      if (el.buffered.length > 0) {
        const bufferedEnd = el.buffered.end(el.buffered.length - 1);
        setDuration(d => {
          const currentDuration = d || 0;
          if (currentDuration > 0 && currentDuration !== Infinity) {
            setBuffered(Math.min(100, ((streamOffset + bufferedEnd) / currentDuration) * 100));
          }
          return d;
        });
      }
    };
    const onEnded = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onPiPEnter = () => setIsPiP(true);
    const onPiPLeave = () => setIsPiP(false);

    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("progress", onProg);
    el.addEventListener("ended", onEnded);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("enterpictureinpicture", onPiPEnter);
    el.addEventListener("leavepictureinpicture", onPiPLeave);

    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("progress", onProg);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("enterpictureinpicture", onPiPEnter);
      el.removeEventListener("leavepictureinpicture", onPiPLeave);
    };
  }, [videoSrc, isDragging, streamOffset]);

  /* ─────────────────────────────────────────────────────
     RESUME MODAL ACTIONS
  ───────────────────────────────────────────────────── */
  const handleRestart = () => {
    const el = videoRef.current;
    if (activeAudio !== 0) {
      setStreamOffset(0);
      setVideoSrc(getStreamUrl(video.path, activeAudio, 0));
      setIsBuffering(true);
      setTimeout(() => {
        const v = videoRef.current;
        if (!v) return;
        const onCanPlay = () => {
          v.play().catch(e => console.warn(e));
          v.removeEventListener("canplay", onCanPlay);
        };
        v.addEventListener("canplay", onCanPlay);
        v.load();
      }, 50);
    } else {
      if (el) { el.currentTime = 0; el.play(); }
    }
    setIsPlaying(true);
    setResumeState("done");
  };

  const handleContinue = () => {
    const el = videoRef.current;
    if (activeAudio !== 0) {
      setStreamOffset(resumeTime);
      setVideoSrc(getStreamUrl(video.path, activeAudio, resumeTime));
      setIsBuffering(true);
      setTimeout(() => {
        const v = videoRef.current;
        if (!v) return;
        const onCanPlay = () => {
          v.play().catch(e => console.warn(e));
          v.removeEventListener("canplay", onCanPlay);
        };
        v.addEventListener("canplay", onCanPlay);
        v.load();
      }, 50);
    } else {
      if (el) { el.currentTime = resumeTime; el.play(); }
    }
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
    else { el.pause(); setIsPlaying(false); }
  }, []);

  const seek = (value) => {
    const el = videoRef.current;
    if (!el || !duration) return;
    const pct = Number(value);
    const targetTime = (pct / 100) * duration;

    if (activeAudio !== 0) {
      setStreamOffset(targetTime);
      setVideoSrc(getStreamUrl(video.path, activeAudio, targetTime));
      setIsBuffering(true);
      if (!isPlaying) setIsPlaying(true);
      setTimeout(() => {
        const v = videoRef.current;
        if (!v) return;
        const onCanPlay = () => { v.play().catch(e => console.warn(e)); v.removeEventListener('canplay', onCanPlay); };
        const onError = () => { setIsBuffering(false); showToast('Stream failed — try again'); v.removeEventListener('error', onError); };
        v.addEventListener('canplay', onCanPlay);
        v.addEventListener('error', onError);
        v.load();
      }, 50);
    } else {
      el.currentTime = targetTime;
    }
    
    setProgress(pct);
    setCurrentTime(targetTime);
  };

  const skip = useCallback((seconds) => {
    const el = videoRef.current;
    if (!el) return;
    setCurrentTime(prevTime => {
      const targetTime = Math.max(0, Math.min(duration || Infinity, prevTime + seconds));
      if (activeAudio !== 0) {
        // Debounce: accumulate rapid skips into one stream request
        clearTimeout(skipDebounceRef.current);
        setStreamOffset(targetTime);
        setIsBuffering(true);
        skipDebounceRef.current = setTimeout(() => {
          setVideoSrc(getStreamUrl(video.path, activeAudio, targetTime));
          setTimeout(() => {
            const v = videoRef.current;
            if (!v) return;
            const onCanPlay = () => { v.play().catch(e => console.warn(e)); v.removeEventListener('canplay', onCanPlay); };
            const onError = () => { setIsBuffering(false); v.removeEventListener('error', onError); };
            v.addEventListener('canplay', onCanPlay);
            v.addEventListener('error', onError);
            v.load();
          }, 30);
        }, 400);
      } else {
        el.currentTime = targetTime;
      }
      return targetTime;
    });
  }, [duration, activeAudio, video.path]);

  /* ─────────────────────────────────────────────────────
     MEDIA SESSION API — PiP title + OS media controls
     Must be placed AFTER skip is declared.
  ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: video.title || "CineSphere",
      artist: metaLine || "CineSphere",
      album: subLine || "",
      artwork: video.image
        ? [
          { src: video.image, sizes: "96x96", type: "image/jpeg" },
          { src: video.image, sizes: "512x512", type: "image/jpeg" },
        ]
        : [],
    });

    const ms = navigator.mediaSession;
    ms.setActionHandler("play", () => { videoRef.current?.play(); setIsPlaying(true); });
    ms.setActionHandler("pause", () => { videoRef.current?.pause(); setIsPlaying(false); });
    ms.setActionHandler("seekbackward", (d) => skip(-(d?.seekOffset ?? 10)));
    ms.setActionHandler("seekforward", (d) => skip(d?.seekOffset ?? 10));
    ms.setActionHandler("stop", () => { videoRef.current?.pause(); setIsPlaying(false); onBack?.(); });

    return () => {
      navigator.mediaSession.metadata = null;
      ["play", "pause", "seekbackward", "seekforward", "stop"].forEach((a) => {
        // eslint-disable-next-line no-unused-vars
        try { navigator.mediaSession.setActionHandler(a, null); } catch (err) { /* ignore */ }
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
    // Don't close immediately, maybe just go back to main menu
    setSettingsView("main");
  };

  /* ─────────────────────────────────────────────────────
     CC (SUBTITLE TRACKS — JS-based rendering)
  ───────────────────────────────────────────────────── */
  const toggleCCTrack = (index) => {
    const newActive = activeCC === index ? -1 : index;
    setActiveCC(newActive);
    setSettingsView("main");
    if (newActive === -1) {
      setCcCues([]);
      setCcText("");
    }
  };

  // Load cues when activeCC changes — serve from client cache if available,
  // otherwise fetch (backend will also cache so it's fast after the first load)
  useEffect(() => {
    if (activeCC < 0 || !video.path || !textTracks[activeCC]) {
      setTimeout(() => {
        setCcCues([]);
        setCcText("");
      }, 0);
      return;
    }
    let cancelled = false;
    const track = textTracks[activeCC];
    const key = `${video.path}:${track.order}`;

    // Serve instantly from client cache
    if (_ccCueCache.has(key)) {
      setTimeout(() => setCcCues(_ccCueCache.get(key)), 0);
      return;
    }

    // Not cached yet — fetch (will also warm the backend cache)
    setTimeout(() => {
      setCcCues([]);
      setCcText("");
    }, 0);
    fetch(getSubtitleUrl(video.path, track.order))
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(vttText => {
        if (cancelled) return;
        const cues = parseVtt(vttText);
        _ccCueCache.set(key, cues);
        setCcCues(cues);
      })
      .catch(err => { if (!cancelled) console.warn('CC fetch failed:', err.message); });

    return () => { cancelled = true; };
  }, [activeCC, video.path, textTracks]);

  // Update displayed subtitle on timeupdate
  useEffect(() => {
    if (ccCues.length === 0) { setTimeout(() => setCcText(""), 0); return; }
    const el = videoRef.current;
    if (!el) return;

    const onTime = () => {
      const vt = (el.currentTime || 0) + streamOffset;
      // Binary-style search for the active cue
      let found = "";
      for (let i = 0; i < ccCues.length; i++) {
        if (vt >= ccCues[i].start && vt <= ccCues[i].end) {
          found = ccCues[i].text;
          break;
        }
        if (ccCues[i].start > vt) break; // cues are sorted, no need to continue
      }
      setCcText(found);
    };
    el.addEventListener('timeupdate', onTime);
    return () => el.removeEventListener('timeupdate', onTime);
  }, [ccCues, streamOffset]);

  /* ─────────────────────────────────────────────────────
     AUDIO TRACKS — switch via backend stream endpoint
  ───────────────────────────────────────────────────── */
  const switchAudioTrack = (index) => {
    if (index === activeAudio) return;
    if (!video.path) return;

    const el = videoRef.current;
    const currentVirtualTime = (el ? el.currentTime : 0) + streamOffset;
    const wasPlaying = el ? !el.paused : false;

    setActiveAudio(index);
    setShowSettings(false);
    setIsBuffering(true);
    showToast(`Switching audio track…`);

    if (index === 0) {
      // Switching back to direct play (original file)
      setStreamOffset(0);
      setVideoSrc(video.videoUrl);

      setTimeout(() => {
        const v = videoRef.current;
        if (!v) return;

        const onCanPlay = () => {
          v.currentTime = currentVirtualTime;
          if (wasPlaying) v.play().catch(e => console.warn(e));
          v.removeEventListener('canplay', onCanPlay);
        };
        const onError = () => {
          setIsBuffering(false);
          showToast('Failed to load audio track');
          v.removeEventListener('error', onError);
        };
        v.addEventListener('canplay', onCanPlay);
        v.addEventListener('error', onError);
        v.load();
      }, 50);
    } else {
      // Switching to an alternate audio track via FFmpeg stream
      setStreamOffset(currentVirtualTime);
      setVideoSrc(getStreamUrl(video.path, index, currentVirtualTime));

      setTimeout(() => {
        const v = videoRef.current;
        if (!v) return;

        const onCanPlay = () => {
          if (wasPlaying) v.play().catch(e => console.warn(e));
          v.removeEventListener('canplay', onCanPlay);
        };
        const onError = () => {
          setIsBuffering(false);
          showToast('Failed to load audio track');
          v.removeEventListener('error', onError);
        };
        v.addEventListener('canplay', onCanPlay);
        v.addEventListener('error', onError);
        v.load();
      }, 50);
    }
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
        case "KeyF": e.preventDefault(); toggleFullscreen(); break;
        case "KeyM": e.preventDefault(); toggleMute(); break;
        case "ArrowRight": e.preventDefault(); skip(10); fireSeekIndicator("right"); showPlayerControls(); break;
        case "ArrowLeft": e.preventDefault(); skip(-10); fireSeekIndicator("left"); showPlayerControls(); break;
        case "ArrowUp": e.preventDefault(); changeVolume(Math.min(1, volume + 0.1)); break;
        case "ArrowDown": e.preventDefault(); changeVolume(Math.max(0, volume - 0.1)); break;
        default: break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, volume, isFullscreen, resumeState, skip, togglePlay]);

  /* ── Seek tooltip ── */
  const handleSeekHover = (e) => {
    const bar = seekWrapRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setHoverTime({ pct, time: (pct / 100) * duration });
  };

  const handleDownload = () => {
    if (!video.videoUrl) return;
    const a = document.createElement("a");
    a.href = video.videoUrl;
    a.download = video.title || "video.mp4";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleCopyLink = async () => {
    if (!navigator.clipboard || !video.videoUrl) return;
    try {
      await navigator.clipboard.writeText(video.videoUrl);
      showToast("Link copied to clipboard!");
    } catch (err) {
      console.error(err);
      showToast("Failed to copy link");
    }
  };

  /* ─────────────────────────────────────────────────────
     REUSABLE CONTROL NODES
  ───────────────────────────────────────────────────── */
  const getActiveAudioLabel = () => {
    if (audioTracks.length === 0) return probeLoading ? "Loading…" : "Default";
    const t = audioTracks[activeAudio];
    if (!t) return "Default";
    return LANG_NAMES[t.language] || t.language?.toUpperCase() || `Track ${activeAudio + 1}`;
  };

  const getActiveCCLabel = () => {
    if (activeCC === -1) return "Off";
    const t = textTracks[activeCC];
    if (!t) return "Off";
    return LANG_NAMES[t.language] || t.language?.toUpperCase() || `Track ${activeCC + 1}`;
  };

  const closeSettings = () => {
    setShowSettings(false);
    setTimeout(() => setSettingsView("main"), 200);
  };

  const closeMobileSheet = () => {
    setMobileSheet(null);
    setTimeout(() => setSettingsView("main"), 200);
  };

  const ccButtonNode = textTracks.length > 0 && (
    <div className="cs-control-group" style={{ position: "relative" }}>
      <button
        className="cs-control-btn"
        onClick={(e) => { e.stopPropagation(); setShowCCMenu(p => !p); setShowSpeedMenu(false); setShowSettings(false); }}
        title="Subtitles/CC"
      >
        <MdClosedCaption size={24} style={{ color: activeCC >= 0 ? "#ff2a2a" : "#fff" }} />
      </button>
      {showCCMenu && (
        <div className="cs-speed-menu cs-cc-menu">
          <div className="cs-speed-menu-title">Subtitles/CC</div>
          <div
            className={`cs-speed-option ${activeCC === -1 ? "active" : ""}`}
            onClick={(e) => { e.stopPropagation(); toggleCCTrack(-1); setShowCCMenu(false); }}
          >
            Off
          </div>
          {textTracks.map((track, i) => (
            <div
              key={track.order}
              className={`cs-speed-option ${activeCC === i ? "active" : ""}`}
              onClick={(e) => { e.stopPropagation(); toggleCCTrack(i); setShowCCMenu(false); }}
            >
              {LANG_NAMES[track.language] || track.language?.toUpperCase() || `Track ${i + 1}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const speedButtonNode = (
    <div className="cs-control-group" style={{ position: "relative" }}>
      <button
        className="cs-control-btn"
        onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(p => !p); setShowCCMenu(false); setShowSettings(false); }}
        title="Playback Speed"
      >
        <MdSpeed size={24} />
      </button>
      {showSpeedMenu && (
        <div className="cs-speed-menu">
          <div className="cs-speed-menu-title">Playback Speed</div>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
            <div
              key={s}
              className={`cs-speed-option ${playbackSpeed === s ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setSpeed(s);
                setShowSpeedMenu(false);
              }}
            >
              {s === 1 ? "Normal" : s + "x"}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const settingsButtonNode = (
    <div className="cs-speed-wrap">
      <button
        className={"cs-control-btn" + (showSettings ? " cs-control-btn-active" : "")}
        onClick={(e) => { 
          e.stopPropagation(); 
          setShowCCMenu(false);
          setShowSpeedMenu(false);
          if (showSettings) {
            closeSettings();
          } else {
            setShowSettings(true);
            setSettingsView("main");
          }
        }}
        title="Settings"
      >
        <MdSettings size={22} />
      </button>
      {showSettings && (
        <div className="cs-settings-popup">
          {settingsView === "main" && (
            <div className="cs-settings-panel">
              <button className="cs-settings-row" onClick={(e) => { e.stopPropagation(); setSettingsView("speed"); }}>
                <div className="cs-settings-row-left">
                  <MdSpeed size={20} />
                  <span>Playback speed</span>
                </div>
                <div className="cs-settings-row-right">
                  <span>{playbackSpeed === 1 ? "Normal" : `${playbackSpeed}x`}</span>
                  <MdChevronRight size={20} />
                </div>
              </button>
              <button className="cs-settings-row" onClick={(e) => { e.stopPropagation(); setSettingsView("audio"); }}>
                <div className="cs-settings-row-left">
                  <MdAudiotrack size={20} />
                  <span>Audio track</span>
                </div>
                <div className="cs-settings-row-right">
                  <span>{getActiveAudioLabel()}</span>
                  <MdChevronRight size={20} />
                </div>
              </button>
              <button className="cs-settings-row" onClick={(e) => { e.stopPropagation(); setSettingsView("cc"); }}>
                <div className="cs-settings-row-left">
                  <MdClosedCaption size={20} />
                  <span>Subtitles/CC</span>
                </div>
                <div className="cs-settings-row-right">
                  <span>{getActiveCCLabel()}</span>
                  <MdChevronRight size={20} />
                </div>
              </button>
            </div>
          )}

          {settingsView === "speed" && (
            <div className="cs-settings-panel">
              <div className="cs-settings-header" onClick={(e) => { e.stopPropagation(); setSettingsView("main"); }}>
                <MdChevronLeft size={24} />
                <span>Playback speed</span>
              </div>
              <div className="cs-settings-options">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    className={"cs-settings-option" + (playbackSpeed === s ? " cs-settings-option-active" : "")}
                    onClick={(e) => { e.stopPropagation(); setSpeed(s); }}
                  >
                    {playbackSpeed === s && <MdCheckCircle size={16} className="cs-check-icon" />}
                    <span className={playbackSpeed !== s ? "cs-no-icon-padding" : ""}>{s === 1 ? "Normal" : `${s}x`}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {settingsView === "audio" && (
            <div className="cs-settings-panel">
              <div className="cs-settings-header" onClick={(e) => { e.stopPropagation(); setSettingsView("main"); }}>
                <MdChevronLeft size={24} />
                <span>Audio track</span>
              </div>
              <div className="cs-settings-options">
                {audioTracks.length === 0 ? (
                   <p className="cs-settings-empty">{probeLoading ? "Loading…" : "Default audio only"}</p>
                ) : (
                  audioTracks.map((t, i) => (
                    <button
                      key={i}
                      className={"cs-settings-option" + (activeAudio === i ? " cs-settings-option-active" : "")}
                      onClick={(e) => { e.stopPropagation(); switchAudioTrack(i); }}
                    >
                      {activeAudio === i && <MdCheckCircle size={16} className="cs-check-icon" />}
                      <span className={activeAudio !== i ? "cs-no-icon-padding" : ""}>{LANG_NAMES[t.language] || t.language?.toUpperCase() || `Track ${i + 1}`}</span>
                      {t.channels ? <span className="cs-channels-badge">{t.channels > 2 ? `${t.channels}.1` : "Stereo"}</span> : null}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {settingsView === "cc" && (
            <div className="cs-settings-panel">
              <div className="cs-settings-header" onClick={(e) => { e.stopPropagation(); setSettingsView("main"); }}>
                <MdChevronLeft size={24} />
                <span>Subtitles/CC</span>
              </div>
              <div className="cs-settings-options">
                {textTracks.length === 0 ? (
                  <p className="cs-settings-empty">{probeLoading ? "Loading…" : "No subtitles available"}</p>
                ) : (
                  <>
                    <button
                      className={"cs-settings-option" + (activeCC === -1 ? " cs-settings-option-active" : "")}
                      onClick={(e) => { e.stopPropagation(); toggleCCTrack(-1); }}
                    >
                      {activeCC === -1 && <MdCheckCircle size={16} className="cs-check-icon" />}
                      <span className={activeCC !== -1 ? "cs-no-icon-padding" : ""}>Off</span>
                    </button>
                    {textTracks.map((t, i) => (
                      <button
                        key={i}
                        className={"cs-settings-option" + (activeCC === i ? " cs-settings-option-active" : "")}
                        onClick={(e) => { e.stopPropagation(); toggleCCTrack(i); }}
                      >
                        {activeCC === i && <MdCheckCircle size={16} className="cs-check-icon" />}
                        <span className={activeCC !== i ? "cs-no-icon-padding" : ""}>{LANG_NAMES[t.language] || t.language?.toUpperCase() || `Track ${i + 1}`}</span>
                        {t.forced ? <span className="cs-channels-badge">FORCED</span> : null}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  /* ─────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────── */
  return (
    <section className="cs-player-page">

      {/* ── Toast notification (#1) ── */}
      {toast && (
        <div className="cs-player-toast">
          <MdCheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{toast}</span>
        </div>
      )}

      {/* ── Resume modal ── */}
      {resumeState === "asking" && (
        <div className="cs-resume-modal-backdrop">
          <div className="cs-resume-modal">
            <div className="cs-resume-modal-icon">▶</div>
            <h3 className="cs-resume-modal-title">Resume Watching?</h3>
            <p className="cs-resume-modal-subtitle">
              You left off at <strong>{formatTimeRaw(resumeTime)}</strong>
            </p>
            {probeLoading && (
              <p style={{ fontSize: 12, opacity: 0.5, margin: '4px 0 0' }}>Loading tracks…</p>
            )}
            <div className="cs-resume-modal-actions">
              <button className="cs-resume-btn cs-resume-btn-secondary" onClick={handleRestart} disabled={probeLoading} style={probeLoading ? { opacity: 0.4, pointerEvents: 'none' } : {}}>↺ Restart</button>
              <button className="cs-resume-btn cs-resume-btn-primary" onClick={handleContinue} disabled={probeLoading} style={probeLoading ? { opacity: 0.4, pointerEvents: 'none' } : {}}>▶ Continue</button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className={`cs-player-card${isFullscreen ? " cs-player-card-fullscreen" : ""}${!showControls && isFullscreen ? " cs-player-hide-cursor" : ""}`}
      >
        {/* Header — always visible, now sits above the video */}
        <div className={`cs-player-header ${isMobile ? "cs-player-header-mobile" : ""}`}>
          <div className="cs-player-header-left">
            <button className="cs-ios-back-btn" onClick={onBack} aria-label="Back">
              <IoArrowBack size={18} />
            </button>
            <div>
              <h2 className="cs-player-title">{video.title}</h2>
              {metaLine && <p className="cs-player-subtitle">{metaLine}</p>}
              {subLine && <p className="cs-player-subtitle cs-player-subtitle-small">{subLine}</p>}
            </div>
          </div>

          {!isMobile && (
            <div className="cs-player-shortcuts-hint">
              <span><kbd>Space</kbd> Play/Pause</span>
              <span><kbd>←</kbd><kbd>→</kbd> Seek ±10s</span>
              <span><kbd>M</kbd> Mute</span>
              <span><kbd>F</kbd> Fullscreen</span>
            </div>
          )}
        </div>

        {/* Video wrapper */}
        <div
          className={`cs-video-wrapper ${isMobile ? "cs-video-wrapper-mobile" : ""}${!showControls && isPlaying && !isFullscreen ? " cs-player-hide-cursor" : ""}`}
          onMouseMove={showPlayerControls}
          onTouchStart={showPlayerControls}
          onClick={handleVideoAreaClick}
        >
          <div className="cs-video-inner">
            <video ref={videoRef} className="cs-video" playsInline>
              <source src={videoSrc} />
            </video>

            {/* JS-rendered subtitle overlay */}
            {ccText && (
              <div className="cs-subtitle-overlay">
                <span className="cs-subtitle-text">{ccText}</span>
              </div>
            )}

            {isBuffering && (
              <div className="cs-video-buffering"><div className="cs-spinner" /></div>
            )}

            {/* ── Centre play/pause flash ── */}
            {playPauseFlash && (
              <div className="cs-center-flash">
                {playPauseFlash === "play"
                  ? <MdPlayArrow size={72} />
                  : <MdPause size={72} />}
              </div>
            )}

            {/* ── Seek indicator (left / right ripple) ── */}
            {seekIndicator && (
              <div className={`cs-seek-indicator cs-seek-indicator-${seekIndicator.side}`}>
                <div className="cs-seek-ripple" />
                <span className="cs-seek-indicator-icon">
                  {seekIndicator.side === "left"
                    ? <MdReplay10 size={48} />
                    : <MdForward10 size={48} />}
                </span>
                <span className="cs-seek-indicator-text">
                  {seekIndicator.side === "left" ? "-10s" : "+10s"}
                </span>
              </div>
            )}

            {/* Mobile top controls (CC, Speed, Settings) */}
            {isMobile && (
              <div className={"cs-mobile-top-controls " + (showControls ? "cs-player-controls-visible" : "cs-player-controls-hidden")} onClick={(e) => e.stopPropagation()}>
                <div className="cs-mobile-top-right">
                  <button
                    className="cs-control-btn"
                    onClick={(e) => { e.stopPropagation(); setMobileSheet(mobileSheet === 'speed' ? null : 'speed'); }}
                    title="Playback Speed"
                  >
                    <MdSpeed size={20} />
                  </button>
                  {textTracks.length > 0 && (
                    <button
                      className="cs-control-btn"
                      onClick={(e) => { e.stopPropagation(); setMobileSheet(mobileSheet === 'cc' ? null : 'cc'); }}
                      title="Subtitles/CC"
                    >
                      <MdClosedCaption size={20} style={{ color: activeCC >= 0 ? '#ff2a2a' : '#fff' }} />
                    </button>
                  )}
                  <button
                    className="cs-control-btn"
                    onClick={(e) => { e.stopPropagation(); setMobileSheet(mobileSheet === 'settings' ? null : 'settings'); setSettingsView('main'); }}
                    title="Settings"
                  >
                    <MdSettings size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Mobile center controls */}
            {isMobile && (
              <div className={"cs-mobile-center-controls " + (showControls ? "cs-player-controls-visible" : "cs-player-controls-hidden")} onClick={(e) => e.stopPropagation()}>
                <button className="cs-control-btn" onClick={() => skip(-10)}>
                  <MdFastRewind size={36} />
                </button>
                <button className="cs-control-btn cs-play-btn" onClick={togglePlay}>
                  {isPlaying ? <MdPause size={44} /> : <MdPlayArrow size={44} />}
                </button>
                <button className="cs-control-btn" onClick={() => skip(10)}>
                  <MdFastForward size={36} />
                </button>
              </div>
            )}
          </div>

          {/* Mobile bottom sheet backdrop */}
          {isMobile && mobileSheet && (
            <div
              className="cs-mobile-sheet-backdrop"
              onClick={closeMobileSheet}
            />
          )}

          {/* Mobile bottom sheet */}
          {isMobile && mobileSheet && (
            <div className="cs-mobile-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="cs-mobile-sheet-handle" />

              {/* Speed sheet */}
              {mobileSheet === 'speed' && (
                <div className="cs-mobile-sheet-content">
                  <div className="cs-mobile-sheet-title">
                    <MdSpeed size={20} />
                    <span>Playback Speed</span>
                  </div>
                  <div className="cs-mobile-sheet-options">
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        className={"cs-mobile-sheet-option" + (playbackSpeed === s ? " active" : "")}
                        onClick={() => { setSpeed(s); closeMobileSheet(); }}
                      >
                        {playbackSpeed === s && <MdCheckCircle size={18} className="cs-mobile-sheet-check" />}
                        <span>{s === 1 ? "Normal" : `${s}x`}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CC sheet */}
              {mobileSheet === 'cc' && (
                <div className="cs-mobile-sheet-content">
                  <div className="cs-mobile-sheet-title">
                    <MdClosedCaption size={20} />
                    <span>Subtitles / CC</span>
                  </div>
                  <div className="cs-mobile-sheet-options">
                    <button
                      className={"cs-mobile-sheet-option" + (activeCC === -1 ? " active" : "")}
                      onClick={() => { toggleCCTrack(-1); closeMobileSheet(); }}
                    >
                      {activeCC === -1 && <MdCheckCircle size={18} className="cs-mobile-sheet-check" />}
                      <span>Off</span>
                    </button>
                    {textTracks.map((t, i) => (
                      <button
                        key={t.order}
                        className={"cs-mobile-sheet-option" + (activeCC === i ? " active" : "")}
                        onClick={() => { toggleCCTrack(i); closeMobileSheet(); }}
                      >
                        {activeCC === i && <MdCheckCircle size={18} className="cs-mobile-sheet-check" />}
                        <span>{LANG_NAMES[t.language] || t.language?.toUpperCase() || `Track ${i + 1}`}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings sheet — multi-level */}
              {mobileSheet === 'settings' && settingsView === 'main' && (
                <div className="cs-mobile-sheet-content">
                  <div className="cs-mobile-sheet-title">
                    <MdSettings size={20} />
                    <span>Settings</span>
                  </div>
                  <div className="cs-mobile-sheet-options">
                    <button className="cs-mobile-sheet-row" onClick={() => setSettingsView('speed')}>
                      <div className="cs-mobile-sheet-row-left"><MdSpeed size={20} /><span>Playback speed</span></div>
                      <div className="cs-mobile-sheet-row-right"><span>{playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}</span><MdChevronRight size={22} /></div>
                    </button>
                    <button className="cs-mobile-sheet-row" onClick={() => setSettingsView('audio')}>
                      <div className="cs-mobile-sheet-row-left"><MdAudiotrack size={20} /><span>Audio track</span></div>
                      <div className="cs-mobile-sheet-row-right"><span>{getActiveAudioLabel()}</span><MdChevronRight size={22} /></div>
                    </button>
                    <button className="cs-mobile-sheet-row" onClick={() => setSettingsView('cc')}>
                      <div className="cs-mobile-sheet-row-left"><MdClosedCaption size={20} /><span>Subtitles/CC</span></div>
                      <div className="cs-mobile-sheet-row-right"><span>{getActiveCCLabel()}</span><MdChevronRight size={22} /></div>
                    </button>
                  </div>
                </div>
              )}

              {mobileSheet === 'settings' && settingsView === 'speed' && (
                <div className="cs-mobile-sheet-content">
                  <div className="cs-mobile-sheet-back" onClick={() => setSettingsView('main')}>
                    <MdChevronLeft size={24} /><span>Playback speed</span>
                  </div>
                  <div className="cs-mobile-sheet-options">
                    {SPEEDS.map((s) => (
                      <button key={s} className={"cs-mobile-sheet-option" + (playbackSpeed === s ? " active" : "")} onClick={() => { setSpeed(s); closeMobileSheet(); }}>
                        {playbackSpeed === s && <MdCheckCircle size={18} className="cs-mobile-sheet-check" />}
                        <span>{s === 1 ? "Normal" : `${s}x`}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mobileSheet === 'settings' && settingsView === 'audio' && (
                <div className="cs-mobile-sheet-content">
                  <div className="cs-mobile-sheet-back" onClick={() => setSettingsView('main')}>
                    <MdChevronLeft size={24} /><span>Audio track</span>
                  </div>
                  <div className="cs-mobile-sheet-options">
                    {audioTracks.length === 0 ? (
                      <p className="cs-mobile-sheet-empty">{probeLoading ? 'Loading…' : 'Default audio only'}</p>
                    ) : audioTracks.map((t, i) => (
                      <button key={i} className={"cs-mobile-sheet-option" + (activeAudio === i ? " active" : "")} onClick={() => { switchAudioTrack(i); closeMobileSheet(); }}>
                        {activeAudio === i && <MdCheckCircle size={18} className="cs-mobile-sheet-check" />}
                        <span>{LANG_NAMES[t.language] || t.language?.toUpperCase() || `Track ${i + 1}`}</span>
                        {t.channels ? <span className="cs-channels-badge">{t.channels > 2 ? `${t.channels}.1` : 'Stereo'}</span> : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mobileSheet === 'settings' && settingsView === 'cc' && (
                <div className="cs-mobile-sheet-content">
                  <div className="cs-mobile-sheet-back" onClick={() => setSettingsView('main')}>
                    <MdChevronLeft size={24} /><span>Subtitles/CC</span>
                  </div>
                  <div className="cs-mobile-sheet-options">
                    {textTracks.length === 0 ? (
                      <p className="cs-mobile-sheet-empty">{probeLoading ? 'Loading…' : 'No subtitles available'}</p>
                    ) : (
                      <>
                        <button className={"cs-mobile-sheet-option" + (activeCC === -1 ? " active" : "")} onClick={() => { toggleCCTrack(-1); closeMobileSheet(); }}>
                          {activeCC === -1 && <MdCheckCircle size={18} className="cs-mobile-sheet-check" />}
                          <span>Off</span>
                        </button>
                        {textTracks.map((t, i) => (
                          <button key={i} className={"cs-mobile-sheet-option" + (activeCC === i ? " active" : "")} onClick={() => { toggleCCTrack(i); closeMobileSheet(); }}>
                            {activeCC === i && <MdCheckCircle size={18} className="cs-mobile-sheet-check" />}
                            <span>{LANG_NAMES[t.language] || t.language?.toUpperCase() || `Track ${i + 1}`}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
                  value={isDragging ? dragProgress : progress}
                  onMouseDown={() => { setIsDragging(true); setDragProgress(progress); }}
                  onTouchStart={() => { setIsDragging(true); setDragProgress(progress); }}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setDragProgress(val);
                    if (activeAudio === 0) seek(val);
                  }}
                  onMouseUp={(e) => {
                    setIsDragging(false);
                    if (activeAudio !== 0) seek(e.target.value);
                  }}
                  onTouchEnd={(e) => {
                    setIsDragging(false);
                    if (activeAudio !== 0) seek(e.target.value);
                  }}
                  className="cs-seek-slider"
                  style={{ "--progress": `${isDragging ? dragProgress : progress}%`, "--buffered": `${Math.max(progress, buffered)}%` }}
                  aria-label="Seek"
                />
              </div>

              {/* Controls row */}
              <div className="cs-controls-row">
                {/* Left group */}
                <div className="cs-controls-left">
                  {!isMobile && (
                    <>
                      <button className="cs-control-btn" onClick={() => skip(-10)} title="Rewind 10s (←)">
                        <MdFastRewind size={24} />
                      </button>
                      <button className="cs-control-btn cs-play-btn" onClick={togglePlay} title="Play/Pause (Space)">
                        {isPlaying ? <MdPause size={30} /> : <MdPlayArrow size={30} />}
                      </button>
                      <button className="cs-control-btn" onClick={() => skip(10)} title="Forward 10s (→)">
                        <MdFastForward size={24} />
                      </button>
                    </>
                  )}
                  <button className="cs-control-btn" onClick={(e) => { e.stopPropagation(); toggleMute(); }} title="Mute (M)">
                    {isMuted || volume === 0 ? <MdVolumeOff size={22} /> : <MdVolumeUp size={22} />}
                  </button>
                  {!isMobile && (
                    <input
                      type="range" min="0" max="1" step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => changeVolume(Number(e.target.value))}
                      className="cs-volume-slider"
                      style={{ "--volume": `${(isMuted ? 0 : volume) * 100}%` }}
                      aria-label="Volume"
                    />
                  )}
                  {/* Removed speedButtonNode from mobile left controls */}
                  <span className="cs-time-display">
                    {formatTimeRaw(currentTime)} / {formatTimeRaw(duration)}
                  </span>
                </div>

                {/* Right group */}
                <div className="cs-controls-right">
                  {!isMobile && (
                    <>
                      {speedButtonNode}
                      {ccButtonNode}
                      {settingsButtonNode}
                      {document.pictureInPictureEnabled && (
                        <button className="cs-control-btn" onClick={(e) => { e.stopPropagation(); togglePiP(); }} title="Picture in Picture">
                          {isPiP ? <MdPictureInPictureAlt size={22} /> : <MdPictureInPicture size={22} />}
                        </button>
                      )}
                    </>
                  )}



                  {/* Fullscreen */}
                  <button className="cs-control-btn" onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} title="Fullscreen (F)">
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