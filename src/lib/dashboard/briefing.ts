import type {
  CognitiveObjectStatus,
  CognitiveObjectType,
  RiskLevel,
} from "../cognitive-object/types";

// A minimal, serializable snapshot of a cognitive object — just what the
// welcome briefing needs. Kept plain (no Date) so it survives the server →
// client boundary; `createdAt` is an ISO string.
export interface BriefingObject {
  id: string;
  title: string;
  objectType: CognitiveObjectType;
  status: CognitiveObjectStatus;
  riskLevel: RiskLevel;
  createdAt: string;
}

export interface BriefingInput {
  now: Date;
  // When the user last opened the dashboard (from localStorage). Null on the
  // very first visit from this browser.
  since: Date | null;
  userName?: string | null;
  objects: BriefingObject[];
  approvalsNeeded: number;
  graphLinks: number;
}

export interface Briefing {
  greeting: string;
  headline: string;
  // Short visual bullet lines shown as captions under the animation.
  lines: string[];
  // The full script the voice reads aloud.
  spokenText: string;
  isFirstVisit: boolean;
  newObjectCount: number;
  openObjectCount: number;
  approvalsNeeded: number;
}

const CLOSED_STATUSES: ReadonlySet<CognitiveObjectStatus> = new Set([
  "executed",
  "archived",
]);

function timeOfDayGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// Join clauses into natural speech: "a, b, and c".
function sentenceList(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export function buildBriefing(input: BriefingInput): Briefing {
  const { now, since, objects, approvalsNeeded, graphLinks } = input;
  const name = input.userName?.trim();
  const greeting = timeOfDayGreeting(now);
  const isFirstVisit = since === null;

  const openObjectCount = objects.filter((object) => !CLOSED_STATUSES.has(object.status)).length;
  const newObjects = since
    ? objects.filter((object) => new Date(object.createdAt).getTime() > since.getTime())
    : [];
  const newObjectCount = newObjects.length;

  const address = name ? `${greeting}, ${name}.` : `${greeting}.`;
  const lines: string[] = [];
  const spoken: string[] = [];

  if (isFirstVisit) {
    spoken.push(`${address} Welcome to Donna, your intelligence operating system.`);
    if (objects.length === 0) {
      lines.push("No cognitive objects yet");
      lines.push("Create your first to begin");
      spoken.push(
        "You don't have any cognitive objects yet. Create your first one and I'll start tracking every decision, risk, and outcome that matters.",
      );
    } else {
      lines.push(`${plural(openObjectCount, "open object")}`);
      if (approvalsNeeded > 0) lines.push(`${plural(approvalsNeeded, "approval")} needed`);
      lines.push(`${plural(graphLinks, "graph link")}`);
      spoken.push(
        `Your workspace already holds ${plural(openObjectCount, "open object")}${
          approvalsNeeded > 0 ? `, with ${plural(approvalsNeeded, "awaiting your approval")}` : ""
        }. Let's get into it.`,
      );
    }

    return {
      greeting,
      headline: name ? `Welcome, ${name}` : "Welcome to Donna",
      lines,
      spokenText: spoken.join(" "),
      isFirstVisit,
      newObjectCount,
      openObjectCount,
      approvalsNeeded,
    };
  }

  spoken.push(`${address} Welcome back to Donna.`);

  // "While you were away" — only the deltas since last visit.
  const awayClauses: string[] = [];
  if (newObjectCount > 0) {
    awayClauses.push(`${plural(newObjectCount, "new cognitive object")} ${newObjectCount === 1 ? "was" : "were"} created`);
    lines.push(`${plural(newObjectCount, "new object")} since your last visit`);
  }
  if (approvalsNeeded > 0) {
    awayClauses.push(`${plural(approvalsNeeded, "decision")} ${approvalsNeeded === 1 ? "is" : "are"} waiting for your approval`);
    lines.push(`${plural(approvalsNeeded, "approval")} needed`);
  }

  if (awayClauses.length > 0) {
    spoken.push(`While you were away, ${sentenceList(awayClauses)}.`);
  } else {
    spoken.push("Nothing new since your last visit.");
    lines.push("All caught up — nothing new");
  }

  // Always ground them in the current state of the workspace.
  spoken.push(
    `Across the workspace you have ${plural(openObjectCount, "open object")} and ${plural(graphLinks, "graph link")}.`,
  );
  lines.push(`${plural(openObjectCount, "open object")} · ${plural(graphLinks, "graph link")}`);

  if (newObjectCount > 0) {
    const newest = newObjects
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]!;
    spoken.push(`The most recent is "${newest.title}".`);
  }

  return {
    greeting,
    headline: name ? `Welcome back, ${name}` : "Welcome back",
    lines,
    spokenText: spoken.join(" "),
    isFirstVisit,
    newObjectCount,
    openObjectCount,
    approvalsNeeded,
  };
}
