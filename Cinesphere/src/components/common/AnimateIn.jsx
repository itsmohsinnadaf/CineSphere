// src/components/common/AnimateIn.jsx
// Lightweight scroll-triggered reveal wrapper using IntersectionObserver.
// Wraps children and fades them in with a slide-up when they enter the viewport.

import { useEffect, useRef, useState } from "react";

/**
 * @param {object} props
 * @param {"fade-up"|"fade-scale"|"slide-left"|"slide-right"|"cinematic"} [props.variant="fade-up"]
 * @param {number}  [props.delay=0]       — extra delay in ms
 * @param {number}  [props.duration=0.55] — transition duration in seconds
 * @param {number}  [props.threshold=0.12] — IntersectionObserver threshold
 * @param {string}  [props.className] — extra className
 * @param {React.CSSProperties} [props.style]
 * @param {React.ReactNode} props.children
 */
export default function AnimateIn({
  variant = "fade-up",
  delay = 0,
  duration = 0.55,
  threshold = 0.12,
  className = "",
  style = {},
  children,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Toggle: animate in when entering, animate out when leaving
        setVisible(entry.isIntersecting);
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const variants = {
    "fade-up": {
      from: { opacity: 0, transform: "translateY(28px)" },
      to:   { opacity: 1, transform: "translateY(0)" },
    },
    "fade-scale": {
      from: { opacity: 0, transform: "scale(0.92)" },
      to:   { opacity: 1, transform: "scale(1)" },
    },
    "slide-left": {
      from: { opacity: 0, transform: "translateX(-24px)" },
      to:   { opacity: 1, transform: "translateX(0)" },
    },
    "slide-right": {
      from: { opacity: 0, transform: "translateX(24px)" },
      to:   { opacity: 1, transform: "translateX(0)" },
    },
    // Dramatic cinematic entrance — slides up + scales + slight rotation
    "cinematic": {
      from: { opacity: 0, transform: "translateY(60px) scale(0.88) rotate(-1.5deg)", filter: "blur(6px)" },
      to:   { opacity: 1, transform: "translateY(0) scale(1) rotate(0deg)", filter: "blur(0px)" },
    },
  };

  const v = variants[variant] || variants["fade-up"];
  const easing = "cubic-bezier(0.16, 1, 0.3, 1)";

  const transitionStyle = {
    ...style,
    ...(visible ? v.to : v.from),
    transition: [
      `opacity ${duration}s ${easing} ${delay}ms`,
      `transform ${duration}s ${easing} ${delay}ms`,
      `filter ${duration}s ${easing} ${delay}ms`,
    ].join(", "),
    willChange: "opacity, transform, filter",
  };

  return (
    <div ref={ref} className={className} style={transitionStyle}>
      {children}
    </div>
  );
}
