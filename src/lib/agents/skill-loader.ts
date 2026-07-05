import { readFileSync } from "node:fs";
import { join } from "node:path";

// Deliberately NOT `new URL("./skills", import.meta.url)`: Turbopack
// statically analyzes that pattern and tries to bundle the target as a
// module, which fails because "./skills" is a directory, not a file
// (confirmed by an actual `next build` failure -- don't reintroduce it).
// process.cwd() is the project root for `next dev`, `next build`, and
// `next start` alike, by Next.js convention.
const SKILLS_DIR = join(process.cwd(), "src/lib/agents/skills");

// Ported from KOB v2's _load_skill (donna/agent_router.py): strip the YAML
// frontmatter, keep the markdown body as the agent's system prompt.
//
// Plain fs.readFileSync works here because V7 deploys via Nixpacks/`next
// start` against the full repo checkout (railway.json), not a pruned
// `output: "standalone"` bundle -- if that ever changes, these paths need
// outputFileTracingIncludes in next.config.ts or the reads will silently
// 404 in production.
export function loadSkill(skillPath: string): string {
  const fullPath = join(SKILLS_DIR, skillPath);
  let content: string;
  try {
    content = readFileSync(fullPath, "utf-8");
  } catch {
    return "You are a helpful specialist agent.";
  }

  if (content.startsWith("---")) {
    const end = content.indexOf("---", 3);
    if (end > 0) {
      return content.slice(end + 3).trim();
    }
  }
  return content;
}
