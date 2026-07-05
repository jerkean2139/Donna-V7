import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Baseline security headers for every route. A full Content-Security-Policy is
// deliberately deferred until the production Clerk domain is known (Clerk needs
// script/frame/connect allowances that vary per instance) — see AUDIT.md
// DECISIONS_NEEDED before adding one blindly.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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
