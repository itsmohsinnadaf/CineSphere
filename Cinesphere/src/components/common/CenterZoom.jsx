import { useEffect, useRef } from "react";

/**
 * A wrapper that scales up its children when they enter the "hotzone" 
 * in the middle of the viewport, and smoothly returns them to default size outside.
 */
export default function CenterZoom({ children, maxScale = 1.12, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let ticking = false;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const elCenterY = rect.top + rect.height / 2;
      const viewCenterY = window.innerHeight / 2;
      
      const distance = Math.abs(viewCenterY - elCenterY);
      // The "hotzone" distance from the center where the card is zoomed
      const hotzoneDistance = window.innerHeight / 3.5; 
      
      if (distance < hotzoneDistance) {
        el.style.transform = `scale(${maxScale})`;
      } else {
        el.style.transform = `scale(1)`;
      }
      
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Also re-calc on resize
    window.addEventListener("resize", onScroll, { passive: true });
    
    // Initial call
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [maxScale]);

  return (
    <div 
      ref={ref} 
      className={className} 
      style={{ 
        willChange: "transform", 
        transformOrigin: "center center",
        transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
      }}
    >
      {children}
    </div>
  );
}
