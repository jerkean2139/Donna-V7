"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  value: number;
  durationMs?: number;
  className?: string;
}

// Animated number that counts from 0 up to `value` once on mount. Respects
// prefers-reduced-motion by jumping straight to the final value.
export function CountUp({ value, durationMs = 900, className }: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const startedAt = useRef<number | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || value === 0) {
      const id = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(id);
    }

    const tick = (now: number) => {
      if (startedAt.current === null) startedAt.current = now;
      const elapsed = now - startedAt.current;
      const t = Math.min(elapsed / durationMs, 1);
      // easeOutExpo for a snappy, decelerating count.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(Math.round(eased * value));
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
      }
    };

    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      startedAt.current = null;
    };
  }, [value, durationMs]);

  return (
    <span className={className} aria-label={String(value)}>
      {display}
    </span>
  );
}
