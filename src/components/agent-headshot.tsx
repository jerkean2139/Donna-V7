// Deterministic, generated agent headshots -- ported and simplified from
// Agent Nine (VYBEKODERZ-BASEBALL-TEAM). Zero image assets (CSP-clean), fully
// derived from the agent name so the same agent always looks the same.

const PALETTE = ["#00d4ff", "#7b2fff", "#00ff9c", "#ffd93d", "#ff6b9d", "#5b8cff"];

function hash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function agentColor(name: string): string {
  return PALETTE[hash(name) % PALETTE.length]!;
}

export function AgentHeadshot({ name, size = 72 }: { name: string; size?: number }) {
  const seed = hash(name);
  const color = agentColor(name);
  const faceShape = seed % 3;
  const eyeStyle = seed % 4;
  const uid = `${seed}-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ borderRadius: "16%" }}
      role="img"
      aria-label={`${name} avatar`}
    >
      <defs>
        <radialGradient id={`bg-${uid}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0a0c12" stopOpacity="1" />
        </radialGradient>
        <radialGradient id={`face-${uid}`} cx="50%" cy="45%" r="45%">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#bg-${uid})`} />
      <g transform="translate(50, 48)">
        {faceShape === 0 && (
          <ellipse cx="0" cy="0" rx="22" ry="24" fill={`url(#face-${uid})`} stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />
        )}
        {faceShape === 1 && (
          <path d="M-20,-18 L-22,4 L-18,20 L0,24 L18,20 L22,4 L20,-18 L0,-24 Z" fill={`url(#face-${uid})`} stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />
        )}
        {faceShape === 2 && (
          <path d="M-18,-20 Q-24,0 -16,20 Q0,28 16,20 Q24,0 18,-20 Q0,-28 -18,-20 Z" fill={`url(#face-${uid})`} stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />
        )}
        <g>
          {eyeStyle === 0 && (
            <>
              <ellipse cx="-9" cy="-4" rx="5" ry="3.5" fill="rgba(0,0,0,0.4)" stroke={color} strokeWidth="0.6" />
              <ellipse cx="9" cy="-4" rx="5" ry="3.5" fill="rgba(0,0,0,0.4)" stroke={color} strokeWidth="0.6" />
              <circle cx="-9" cy="-4" r="2" fill={color} />
              <circle cx="9" cy="-4" r="2" fill={color} />
            </>
          )}
          {eyeStyle === 1 && (
            <>
              <rect x="-14" y="-7" width="10" height="5" rx="1" fill="rgba(0,0,0,0.4)" stroke={color} strokeWidth="0.6" />
              <rect x="4" y="-7" width="10" height="5" rx="1" fill="rgba(0,0,0,0.4)" stroke={color} strokeWidth="0.6" />
              <rect x="-12" y="-6" width="3" height="3" fill={color} />
              <rect x="6" y="-6" width="3" height="3" fill={color} />
            </>
          )}
          {eyeStyle === 2 && (
            <>
              <path d="M-14,-4 L-9,-7 L-4,-4 L-9,-1 Z" fill="rgba(0,0,0,0.4)" stroke={color} strokeWidth="0.6" />
              <path d="M4,-4 L9,-7 L14,-4 L9,-1 Z" fill="rgba(0,0,0,0.4)" stroke={color} strokeWidth="0.6" />
              <circle cx="-9" cy="-4" r="1.5" fill={color} />
              <circle cx="9" cy="-4" r="1.5" fill={color} />
            </>
          )}
          {eyeStyle === 3 && (
            <>
              <circle cx="-9" cy="-4" r="5" fill="rgba(0,0,0,0.4)" stroke={color} strokeWidth="0.6" />
              <circle cx="9" cy="-4" r="5" fill="rgba(0,0,0,0.4)" stroke={color} strokeWidth="0.6" />
              <circle cx="-9" cy="-4" r="2.5" fill={color} fillOpacity="0.85" />
              <circle cx="9" cy="-4" r="2.5" fill={color} fillOpacity="0.85" />
            </>
          )}
        </g>
        <line x1="-6" y1="8" x2="6" y2="8" stroke={color} strokeWidth="0.6" strokeOpacity="0.5" />
      </g>
    </svg>
  );
}
