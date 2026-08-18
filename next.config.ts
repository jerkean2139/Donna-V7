import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Content-Security-Policy. Clerk and Sentry each need specific script/connect/
// frame allowances, and Clerk's hosts vary by instance, so the exact origins
// are provided via env with sensible defaults:
//   NEXT_PUBLIC_CLERK_CSP_ORIGINS  extra origins for Clerk (e.g. your Frontend
//                                  API + accounts domain), space-separated
//   NEXT_PUBLIC_SENTRY_CSP_ORIGINS extra origins for Sentry ingest
//   CSP_ENFORCE=true               switch from Content-Security-Policy-Report-
//                                  Only (default) to enforcing
// Report-Only is the default so a missing origin surfaces as a console report
// instead of a white screen — flip CSP_ENFORCE once verified against prod Clerk.
const clerkOrigins = (process.env.NEXT_PUBLIC_CLERK_CSP_ORIGINS ?? "")
  .split(/\s+/)
  .filter(Boolean);
const sentryOrigins = (process.env.NEXT_PUBLIC_SENTRY_CSP_ORIGINS ?? "")
  .split(/\s+/)
  .filter(Boolean);

const clerkDefaults = ["https://*.clerk.accounts.dev", "https://*.clerk.com", "https://clerk.com"];
const sentryDefault = ["https://*.ingest.sentry.io", "https://*.ingest.us.sentry.io"];
const turnstile = ["https://challenges.cloudflare.com"];

function join(...groups: string[][]): string {
  return Array.from(new Set(groups.flat())).join(" ");
}

const csp = [
  `default-src 'self'`,
  // Next.js injects small inline bootstrap scripts; 'unsafe-inline' is required
  // for them (nonce-based hardening is a follow-up). Clerk + Turnstile scripts.
  `script-src 'self' 'unsafe-inline' ${join(clerkDefaults, clerkOrigins, turnstile)}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  // XHR/fetch/WebSocket targets: Clerk API + Sentry ingest.
  `connect-src 'self' ${join(clerkDefaults, clerkOrigins, sentryDefault, sentryOrigins)}`,
  // Clerk renders its components (UserButton, OrganizationSwitcher) and
  // Turnstile challenge in frames.
  `frame-src 'self' ${join(clerkDefaults, clerkOrigins, turnstile)}`,
  `worker-src 'self' blob:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const cspHeaderName =
  process.env.CSP_ENFORCE === "true"
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";

const securityHeaders = [
  { key: cspHeaderName, value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// Uploads source maps at build time so Sentry shows real stack traces
// instead of minified ones. Silently no-ops (no source-map upload, no
// wrapping errors) when SENTRY_AUTH_TOKEN is unset, so local dev and PR
// builds without the token still build fine.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "kean-on-biz",
  project: process.env.SENTRY_PROJECT ?? "donna-v7",
  silent: true,
  widenClientFileUpload: true,
});
