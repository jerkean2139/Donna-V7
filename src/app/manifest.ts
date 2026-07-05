import type { MetadataRoute } from "next";

// Web app manifest (served at /manifest.webmanifest) — makes Donna installable
// as a standalone PWA on mobile and desktop.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Donna V7 — Manumation Intelligence Layer",
    short_name: "Donna",
    description:
      "The intelligence operating system for teams and AI to make better decisions together.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
