import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Nav } from "../components/Nav";
import { FloatingOrbs } from "../components/FloatingOrbs";
import { BootIntro } from "../components/BootIntro";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass-strong rounded-3xl p-10">
        <h1 className="text-7xl font-display font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Lost in orbit</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page drifted off. Let's get you back on track.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-[image:var(--gradient-neon)] px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 transition"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass-strong rounded-3xl p-10">
        <h1 className="text-xl font-display font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-xl bg-[image:var(--gradient-neon)] px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Suhail Personal AI — AI Study Companion for B.Tech CSE (AI & ML)" },
      {
        name: "description",
        content:
          "Suhail Personal AI — an AI-powered study companion for B.Tech CSE (AI & ML). Every subject, unit and topic explained with a 24/7 AI tutor.",
      },
      { name: "author", content: "Suhail Ali" },
      { property: "og:title", content: "Suhail Personal AI — AI Study Companion" },
      {
        property: "og:description",
        content:
          "AI-powered study companion built by Suhail Ali for B.Tech CSE (AI & ML). Notes, tutor, PYQs and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Suhail Personal AI" },
      { name: "twitter:description", content: "AI-powered study companion by Suhail Ali." },
      { name: "theme-color", content: "#8b5cf6" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Suhail AI" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", href: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <BootIntro />
      <FloatingOrbs />
      <Nav />
      <main className="pt-24">
        <Outlet />
      </main>
      
      <footer className="mt-24 border-t border-white/5 py-8 text-center text-sm text-muted-foreground">
        Built by{" "}
        <a
          href="https://instagram.com/_ig_suhail_37"
          target="_blank"
          rel="noreferrer"
          className="text-neon hover:underline"
        >
          Suhail Ali
        </a>{" "}
        · B.Tech CSE (AI & ML) · Suhail Personal AI
      </footer>
    </QueryClientProvider>
  );
}
