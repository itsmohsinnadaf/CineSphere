// src/components/common/CustomCursor.jsx
// Premium cinematic custom cursor — dot + magnetic ring + trail glow
import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const dotRef  = useRef(null);
  const ringRef = useRef(null);
  const glowRef = useRef(null);

  const pos     = useRef({ x: -200, y: -200 });
  const ringPos = useRef({ x: -200, y: -200 });
  const raf     = useRef(null);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on pointer devices
    if (window.matchMedia("(hover: none)").matches) return;

    const onMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
    };

    const onDown = () => {
      dotRef.current?.classList.add("cs-cursor-dot--click");
      ringRef.current?.classList.add("cs-cursor-ring--click");
    };
    const onUp = () => {
      dotRef.current?.classList.remove("cs-cursor-dot--click");
      ringRef.current?.classList.remove("cs-cursor-ring--click");
    };

    const onEnterLink = (e) => {
      const el = e.target.closest("a,button,[role=button],[tabindex],.cs-hero-card,.cs-big-card,.cs-folder-card,.cs-item-card,.cs-fs-thumb");
      if (el) {
        dotRef.current?.classList.add("cs-cursor-dot--hover");
        ringRef.current?.classList.add("cs-cursor-ring--hover");
        glowRef.current?.classList.add("cs-cursor-glow--hover");
      }
    };
    const onLeaveLink = (e) => {
      const el = e.target.closest("a,button,[role=button],[tabindex],.cs-hero-card,.cs-big-card,.cs-folder-card,.cs-item-card,.cs-fs-thumb");
      if (el) {
        dotRef.current?.classList.remove("cs-cursor-dot--hover");
        ringRef.current?.classList.remove("cs-cursor-ring--hover");
        glowRef.current?.classList.remove("cs-cursor-glow--hover");
      }
    };

    // Smooth ring follows with lerp
    const lerp = (a, b, t) => a + (b - a) * t;
    const animate = () => {
      const { x, y } = pos.current;

      // Dot — snap
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
      // Glow — snap
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
      // Ring — lerp (magnetic lag)
      ringPos.current.x = lerp(ringPos.current.x, x, 0.14);
      ringPos.current.y = lerp(ringPos.current.y, y, 0.14);
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringPos.current.x}px, ${ringPos.current.y}px) translate(-50%, -50%)`;
      }

      raf.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseover", onEnterLink);
    document.addEventListener("mouseout", onLeaveLink);
    raf.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseover", onEnterLink);
      document.removeEventListener("mouseout", onLeaveLink);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Ambient glow orb */}
      <div ref={glowRef} className="cs-cursor-glow" aria-hidden="true" />
      {/* Lagging magnetic ring */}
      <div ref={ringRef} className="cs-cursor-ring" aria-hidden="true" />
      {/* Precise dot */}
      <div ref={dotRef}  className="cs-cursor-dot"  aria-hidden="true" />
    </>
  );
}
