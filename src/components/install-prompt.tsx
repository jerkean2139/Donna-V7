"use client";

import { useCallback, useEffect, useState } from "react";

// The beforeinstallprompt event isn't in the default TS DOM lib.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SNOOZE_KEY = "donna:installSnoozedUntil";
const SNOOZE_DAYS = 14;

function isSnoozed(): boolean {
  const raw = window.localStorage.getItem(SNOOZE_KEY);
  return raw ? Date.now() < Number(raw) : false;
}

function snooze(): void {
  window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 864e5));
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari exposes this non-standard flag when launched from the home screen.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  const iOS = /iphone|ipad|ipod/i.test(ua);
  const webkit = /webkit/i.test(ua);
  const notOtherBrowser = !/crios|fxios|edgios|opios/i.test(ua);
  return iOS && webkit && notOtherBrowser;
}

type Mode = "hidden" | "prompt" | "ios";

export function InstallPrompt() {
  const [mode, setMode] = useState<Mode>("hidden");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || isSnoozed()) return;

    // Chromium / Android / desktop: capture the event and offer a real install.
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setMode("prompt");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const onInstalled = () => setMode("hidden");
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari has no install event — show a share-sheet hint instead, but
    // only after a short delay so it doesn't greet a first-time visitor.
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIosSafari()) {
      iosTimer = setTimeout(() => setMode((m) => (m === "hidden" ? "ios" : m)), 4000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = useCallback(() => {
    snooze();
    setMode("hidden");
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setMode("hidden");
  }, [deferred]);

  if (mode === "hidden") return null;

  return (
    <div
      role="dialog"
      aria-label="Install Donna"
      // Sits above the mobile bottom nav (which is h≈64px + safe area).
      className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static PWA icon, no optimization needed */}
          <img src="/icon-192.png" alt="" width={40} height={40} className="rounded-lg" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-950">Install Donna</p>
          {mode === "prompt" ? (
            <p className="mt-0.5 text-sm text-slate-600">
              Add it to your home screen for a full-screen, app-like experience.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-slate-600">
              Tap the Share button, then <span className="font-medium">Add to Home Screen</span>.
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            {mode === "prompt" && (
              <button
                type="button"
                onClick={install}
                className="rounded-lg bg-slate-950 px-3.5 py-1.5 text-sm font-medium text-white"
              >
                Install
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
