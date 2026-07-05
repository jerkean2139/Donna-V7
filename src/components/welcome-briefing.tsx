"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildBriefing, type Briefing, type BriefingObject } from "@/lib/dashboard/briefing";

interface WelcomeBriefingProps {
  tenantId: string;
  userName: string | null;
  objects: BriefingObject[];
  approvalsNeeded: number;
  graphLinks: number;
}

interface BriefingInit {
  briefing: Briefing;
  voiceSupported: boolean;
}

// Bar count for the equalizer; each gets a staggered animation delay.
const BAR_COUNT = 7;

export function WelcomeBriefing({
  tenantId,
  userName,
  objects,
  approvalsNeeded,
  graphLinks,
}: WelcomeBriefingProps) {
  const [init, setInit] = useState<BriefingInit | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const didInit = useRef(false);

  // One-time, post-hydration initialization. Reads the last-visit timestamp
  // from localStorage (browser-only, so it can't run during SSR/render),
  // stamps this visit, then computes the "while you were away" briefing.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const key = `donna:lastVisit:${tenantId}`;
    const raw = window.localStorage.getItem(key);
    const since = raw ? new Date(raw) : null;
    window.localStorage.setItem(key, new Date().toISOString());

    const briefing = buildBriefing({
      now: new Date(),
      since,
      userName,
      objects,
      approvalsNeeded,
      graphLinks,
    });

    setInit({ briefing, voiceSupported: "speechSynthesis" in window });
  }, [tenantId, userName, objects, approvalsNeeded, graphLinks]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    if (!init || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(init.briefing.spokenText);
    utterance.rate = 1.02;
    utterance.pitch = 1;
    const preferred = window.speechSynthesis
      .getVoices()
      .find((voice) => /en(-|_)?(US|GB)/i.test(voice.lang) && /natural|google|samantha|aria/i.test(voice.name));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [init]);

  // Cancel any in-flight speech when navigating away.
  useEffect(() => () => stopSpeaking(), [stopSpeaking]);

  const toggle = useCallback(() => {
    if (speaking) {
      stopSpeaking();
    } else {
      speak();
    }
  }, [speaking, speak, stopSpeaking]);

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={() => setDismissed(false)}
        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
      >
        <span aria-hidden="true">🎙️</span> Replay briefing
      </button>
    );
  }

  if (!init) {
    // Reserve height so the dashboard doesn't jump when the briefing mounts.
    return <div className="mt-2 h-[220px] animate-pulse rounded-2xl bg-slate-100" aria-hidden="true" />;
  }

  const { briefing, voiceSupported } = init;

  return (
    <section
      aria-label="Welcome briefing"
      data-speaking={speaking}
      className="donna-briefing relative mt-2 overflow-hidden rounded-2xl p-6 sm:p-8"
    >
      <button
        type="button"
        onClick={() => {
          stopSpeaking();
          setDismissed(true);
        }}
        aria-label="Dismiss briefing"
        className="absolute right-4 top-4 z-10 rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>

      <div className="relative flex flex-col items-center gap-5 text-center">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={speaking}
          aria-label={speaking ? "Stop the spoken briefing" : "Play the spoken briefing"}
          className="donna-mic group relative flex h-24 w-24 items-center justify-center rounded-full"
          disabled={!voiceSupported}
        >
          <span className="donna-ring" aria-hidden="true" />
          <span className="donna-ring donna-ring-2" aria-hidden="true" />

          {speaking ? (
            <span className="donna-eq" aria-hidden="true">
              {Array.from({ length: BAR_COUNT }).map((_, index) => (
                <span key={index} style={{ animationDelay: `${index * 90}ms` }} />
              ))}
            </span>
          ) : (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="text-cyan-100">
              <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" strokeLinecap="round" />
            </svg>
          )}
        </button>

        <div className="donna-onair" aria-hidden="true">
          <span className="donna-onair-dot" /> {speaking ? "ON AIR" : voiceSupported ? "TAP TO PLAY" : "BRIEFING"}
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{briefing.headline}</h2>
          <p className="mt-1 text-sm text-cyan-200/80">Your intelligence operating system</p>
        </div>

        {/* Visual captions — the same information the voice conveys, so the
            briefing is fully usable with sound off. aria-live announces it. */}
        <ul aria-live="polite" className="flex flex-wrap items-center justify-center gap-2">
          {briefing.lines.map((line, index) => (
            <li
              key={index}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-slate-100"
            >
              {line}
            </li>
          ))}
        </ul>

        {!voiceSupported && (
          <p className="text-xs text-slate-400">
            Voice playback isn&apos;t available in this browser — your briefing is shown above.
          </p>
        )}
      </div>
    </section>
  );
}
