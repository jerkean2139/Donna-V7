import { z } from "zod";
import { assertHostnameIsPublic, SsrfBlockedError } from "./ssrf";

export interface ReadToolSpec {
  name: string;
  description: string;
  kind: "read";
  inputSchema: z.ZodType<Record<string, unknown>>;
  execute(args: Record<string, unknown>): Promise<string>;
}

const webSearchInputSchema = z.object({ query: z.string().min(1).max(300) });

// Ported from KOB v2's web_search (donna/agent_tools.py): scrape DuckDuckGo's
// HTML endpoint rather than calling a paid search API. No credentials needed,
// so this can run for real in Phase 2 (unlike the act tools, which are
// stubbed until real integration credentials land in PR3).
export const webSearchTool: ReadToolSpec = {
  name: "web_search",
  description: "Search the web for information. Input: a search query.",
  kind: "read",
  inputSchema: webSearchInputSchema,
  async execute(rawArgs) {
    const { query } = webSearchInputSchema.parse(rawArgs);
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      await assertHostnameIsPublic(new URL(url).hostname);
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10_000),
      });
      const html = await response.text();
      const snippets = Array.from(html.matchAll(/class="result__snippet"[^>]*>(.*?)<\/a>/gs))
        .map((match) => (match[1] ?? "").replace(/<[^>]+>/g, "").trim())
        .filter(Boolean);
      return snippets.length > 0 ? snippets.slice(0, 5).join("\n") : "No results found.";
    } catch (error) {
      return `Search error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};

const webFetchInputSchema = z.object({ url: z.string().url() });

// Ported from KOB v2's web_fetch, same SSRF posture (see tools/ssrf.ts).
export const webFetchTool: ReadToolSpec = {
  name: "web_fetch",
  description: "Fetch a web page and extract its text content. Input: a URL.",
  kind: "read",
  inputSchema: webFetchInputSchema,
  async execute(rawArgs) {
    const { url } = webFetchInputSchema.parse(rawArgs);
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return "Error: Invalid URL.";
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Error: Only http/https URLs are allowed.";
    }

    try {
      await assertHostnameIsPublic(parsed.hostname);
    } catch (error) {
      if (error instanceof SsrfBlockedError) return `Error: ${error.message}`;
      throw error;
    }

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(15_000),
      });
      const html = await response.text();
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return text.slice(0, 3000);
    } catch (error) {
      return `Fetch error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};

export const READ_TOOLS: Record<string, ReadToolSpec> = {
  web_search: webSearchTool,
  web_fetch: webFetchTool,
};
