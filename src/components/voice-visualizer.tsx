"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

export interface VoiceVisualizerHandle {
  // Inject an amplitude spike — called on each spoken word boundary so the
  // waveform visibly reacts to Donna's speech rhythm.
  surge: () => void;
}

interface VoiceVisualizerProps {
  active: boolean;
  ref?: Ref<VoiceVisualizerHandle>;
  className?: string;
}

const BAR_COUNT = 56;

// Dense, mirrored spectrum that bounces to Donna's voice. speechSynthesis
// output can't be tapped for real FFT data in browsers, so the motion is a
// smooth layered-noise waveform whose envelope is driven by speaking state and
// punched by word-boundary "surges" — reading as genuinely speech-reactive.
export function VoiceVisualizer({ active, ref, className }: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const envelopeRef = useRef(0); // 0..1 overall loudness, eased toward target
  const surgeRef = useRef(0); // transient boost from word boundaries
  const phaseRef = useRef(0);
  // Per-bar smoothed heights for fluid motion.
  const heightsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));

  useImperativeHandle(ref, () => ({
    surge: () => {
      surgeRef.current = Math.min(surgeRef.current + 0.6, 1);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Deterministic per-bar noise so bars differ but don't jitter randomly.
    const seed = (i: number, t: number) =>
      Math.sin(i * 0.7 + t * 2.1) * 0.5 +
      Math.sin(i * 1.9 - t * 3.3) * 0.3 +
      Math.sin(i * 0.31 + t * 5.0) * 0.2;

    const render = (tMs: number) => {
      const t = tMs / 1000;
      phaseRef.current = t;

      // Ease the loudness envelope toward the target (speaking vs idle).
      const target = active ? 0.72 : 0.12;
      envelopeRef.current += (target - envelopeRef.current) * 0.08;
      surgeRef.current *= 0.9; // decay surges
      const env = envelopeRef.current + surgeRef.current * (active ? 0.5 : 0);

      ctx.clearRect(0, 0, width, height);

      const mid = height / 2;
      const gap = 2;
      const barW = Math.max((width - gap * (BAR_COUNT - 1)) / BAR_COUNT, 1);
      const heights = heightsRef.current;

      for (let i = 0; i < BAR_COUNT; i += 1) {
        // Bell-shaped falloff toward the edges → dense center like the ref.
        const dist = Math.abs(i - (BAR_COUNT - 1) / 2) / ((BAR_COUNT - 1) / 2);
        const bell = Math.pow(1 - dist, 1.6) * 0.85 + 0.15;
        const raw = reduce ? 0.4 : (seed(i, t) * 0.5 + 0.5);
        const targetH = raw * env * bell;
        // Smooth each bar toward its target for fluid motion.
        heights[i] += (targetH - heights[i]) * (reduce ? 1 : 0.35);
        const h = Math.max(heights[i] * (mid - 2), 1.5);

        const x = i * (barW + gap);
        ctx.fillStyle = "rgba(0,0,0,0)";
        // Mirror around the middle.
        const grad = ctx.createLinearGradient(0, mid - h, 0, mid + h);
        grad.addColorStop(0, "#a78bfa");
        grad.addColorStop(0.5, "#22d3ee");
        grad.addColorStop(1, "#a78bfa");
        ctx.fillStyle = grad;
        ctx.shadowColor = "rgba(34,211,238,0.7)";
        ctx.shadowBlur = active ? 8 : 3;
        const r = Math.min(barW / 2, 2);
        roundedBar(ctx, x, mid - h, barW, h * 2, r);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    if (reduce) {
      // Draw a single static frame.
      render(0);
    } else {
      rafRef.current = requestAnimationFrame(render);
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

function roundedBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}
