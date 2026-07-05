"use client";

import { useState } from "react";

// Shows the copy-paste embed snippet for a widget key with a copy button.
export function SnippetBlock({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wide text-text-muted">Embed snippet</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(snippet).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              },
              () => setCopied(false),
            );
          }}
          className="font-mono text-[10px] text-cyan transition-opacity hover:opacity-80"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mt-1 overflow-x-auto rounded-lg border border-border-default bg-bg-base p-3 font-mono text-[11px] text-text-secondary">
        {snippet}
      </pre>
    </div>
  );
}
