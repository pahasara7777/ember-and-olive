import { useEffect, useRef, useState } from 'react';

// Scroll-snap carousel with prev/next buttons. Auto-advances unless hovered, focused or reduced motion is on.
export default function Slider({ label, auto = 0, children }) {
  const track = useRef(null);
  const [paused, setPaused] = useState(false);

  const go = (dir) => {
    const el = track.current;
    if (!el?.firstElementChild) return;
    const step = el.firstElementChild.getBoundingClientRect().width + 20;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    el.scrollTo({ left: dir > 0 && end ? 0 : el.scrollLeft + dir * step, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!auto || paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => go(1), auto);
    return () => clearInterval(id);
  }, [auto, paused]);

  return (
    <div className="slider" role="group" aria-roledescription="carousel" aria-label={label}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="slides" ref={track}>{children}</div>
      <div className="slider-nav">
        <button type="button" className="icon-btn" onClick={() => go(-1)} aria-label={`Previous, ${label}`}>←</button>
        <button type="button" className="icon-btn" onClick={() => go(1)} aria-label={`Next, ${label}`}>→</button>
      </div>
    </div>
  );
}
