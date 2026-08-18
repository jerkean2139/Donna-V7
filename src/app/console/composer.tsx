"use client";

import { useRef } from "react";
import { sendConsoleMessageAction } from "./actions";

// Message composer. Submits to the server action (works without JS via the
// form action); the client bits just clear the field and keep focus after send.
export function Composer() {
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form
      ref={formRef}
      action={sendConsoleMessageAction}
      className="donna-card flex items-end gap-2 rounded-2xl p-2"
      onSubmit={() => {
        // Optimistic clear; the server revalidate re-renders the thread.
        requestAnimationFrame(() => formRef.current?.reset());
      }}
    >
      <textarea
        name="message"
        required
        rows={1}
        maxLength={4000}
        placeholder="Tell Donna what you need — she'll route it to the right agent…"
        className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <button
        type="submit"
        aria-label="Send"
        className="shrink-0 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 px-4 py-2.5 font-semibold text-[#06080f]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </form>
  );
}
