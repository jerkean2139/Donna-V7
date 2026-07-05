import type { Metadata, Viewport } from "next";
import Link from "next/link";
import {
  ClerkProvider,
  OrganizationSwitcher,
  Show,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import { MainNav } from "@/components/main-nav";
import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Donna V7 | Manumation Intelligence Layer",
  description: "The Intelligence Layer for Cognitive Objects, Cognitive Graph, governance, and better human-AI decisions.",
  manifest: "/manifest.webmanifest",
  applicationName: "Donna",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Donna",
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>
          <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/80 backdrop-blur">
            <nav
              aria-label="Main navigation"
              className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4"
            >
              <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-ink">
                  <span className="donna-display text-lg font-bold">Donna</span>
                  <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent ring-1 ring-inset ring-accent/30">
                    OS
                  </span>
                </Link>
                <Show when="signed-in">
                  <div className="hidden items-center gap-6 sm:flex">
                    <MainNav />
                  </div>
                </Show>
              </div>
              <div className="flex items-center gap-4">
                <Show
                  when="signed-in"
                  fallback={
                    <SignInButton>
                      <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white">
                        Sign in
                      </button>
                    </SignInButton>
                  }
                >
                  <OrganizationSwitcher />
                  <UserButton />
                </Show>
              </div>
            </nav>
          </header>
          <div id="main-content" className="pb-20 sm:pb-0">
            {children}
          </div>
          <Show when="signed-in">
            <BottomNav />
          </Show>
          <InstallPrompt />
          <ServiceWorkerRegister />
        </ClerkProvider>
      </body>
    </html>
  );
}
