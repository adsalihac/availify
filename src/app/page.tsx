"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";
import type { CheckResponse } from "@/lib/types";
import { generateVariants, normalizeName } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/hooks";
import { AvailabilityBadge } from "@/components/availability-badge";
import { CommandPalette } from "@/components/command-palette";
import { ProgressTerminal, ProgressStatus } from "@/components/progress-terminal";
import { ScoreCard } from "@/components/score-card";
import { SkeletonCard } from "@/components/skeleton-card";
import { AppIcon } from "@/components/app-icon";

const STORAGE_KEY = "availify:recent";

const progressLabels = [
  { key: "apple", label: "Apple App Store" },
  { key: "googlePlay", label: "Google Play Store" },
  { key: "domains", label: "Domains" },
  { key: "github", label: "GitHub" },
  { key: "bundleIds", label: "Bundle IDs" },
  { key: "npm", label: "npm Registry" },
] as const;

type ProgressState = Record<(typeof progressLabels)[number]["key"], ProgressStatus>;

const platforms = [
  { label: "App Store" },
  { label: "Play Store" },
  { label: "Domains" },
  { label: "GitHub" },
  { label: "npm" },
  { label: "Bundle IDs" },
];

function EmptyState() {
  return (
    <div className="col-span-12">
      <div className="flex flex-col items-center gap-8 rounded-3xl border border-border bg-white px-8 py-16 text-center shadow-[0_20px_60px_-40px_rgba(15,23,42,0.15)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111827] shadow-lg">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="4" width="10" height="10" rx="2.5" fill="white" opacity="0.9"/>
            <rect x="18" y="4" width="10" height="10" rx="2.5" fill="white" opacity="0.9"/>
            <rect x="4" y="18" width="10" height="10" rx="2.5" fill="white" opacity="0.9"/>
            <circle cx="23" cy="23" r="7" fill="#16a34a"/>
            <path d="M20.2 23l2 2 3.6-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-primary">Start by entering an app name</p>
          <p className="mt-2 max-w-sm text-sm text-secondary">
            We&apos;ll instantly check availability across all major platforms.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {platforms.map((p) => (
            <span
              key={p.label}
              className="rounded-full border border-border bg-white px-4 py-1.5 text-xs font-medium text-secondary shadow-sm"
            >
              {p.label}
            </span>
          ))}
        </div>
        <div className="grid w-full max-w-lg grid-cols-3 gap-3 text-left">
          {[
            { title: "Parallel checks", desc: "All platforms verified simultaneously" },
            { title: "Copy-ready", desc: "Bundle IDs and handles at a click" },
            { title: "Smart suggestions", desc: "Alt names when yours is taken" },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold text-primary">{item.title}</p>
              <p className="mt-0.5 text-[11px] text-secondary">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    const q = new URLSearchParams(window.location.search).get("q");
    return q ? q.trim() : "";
  });
  const [results, setResults] = useState<CheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [progress, setProgress] = useState<ProgressState>({
    apple: "checking",
    googlePlay: "checking",
    domains: "checking",
    github: "checking",
    bundleIds: "checking",
    npm: "checking",
  });
  const [toast, setToast] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [starCount, setStarCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/adsalihac/availify")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.stargazers_count === "number") setStarCount(d.stargazers_count);
      })
      .catch(() => {});
  }, []);

  const debouncedQuery = useDebouncedValue(query, 240);
  const previewVariants = useMemo(
    () => (debouncedQuery ? generateVariants(debouncedQuery) : []),
    [debouncedQuery],
  );

  const mutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json()) as CheckResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to check availability.");
      }
      return data;
    },
    onSuccess: (data) => {
      setResults(data);
      setError(null);
      setProgress({
        apple: data.providers.apple.status === "error" ? "error" : "complete",
        googlePlay: data.providers.googlePlay.status === "error" ? "error" : "complete",
        domains: data.providers.domains.status === "error" ? "error" : "complete",
        github: data.providers.github.status === "error" ? "error" : "complete",
        bundleIds: data.providers.bundleIds.status === "error" ? "error" : "complete",
        npm: data.providers.npm.status === "error" ? "error" : "complete",
      });
    },
    onError: (err: Error) => {
      setError(err.message);
      setResults(null);
      setProgress({
        apple: "error",
        googlePlay: "error",
        domains: "error",
        github: "error",
        bundleIds: "error",
        npm: "error",
      });
    },
  });

  const updateRecent = useCallback((name: string) => {
    setRecentSearches((prev) => {
      const next = [name, ...prev.filter((item) => item !== name)].slice(0, 6);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleSearch = useCallback(
    (value: string) => {
      const normalized = normalizeName(value);
      if (!normalized || normalized.length < 2) {
        setError("Enter a valid app name to begin.");
        return;
      }
      setProgress({
        apple: "checking",
        googlePlay: "checking",
        domains: "checking",
        github: "checking",
        bundleIds: "checking",
        npm: "checking",
      });
      setError(null);
      setResults(null);
      updateRecent(normalized);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("q", normalized);
        window.history.pushState({}, "", url.toString());
      }
      mutation.mutate(normalized);
    },
    [mutation, updateRecent],
  );

  // Auto-run from ?q= on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q && q.trim().length >= 2) {
      const trimmed = q.trim();
      setTimeout(() => handleSearch(trimmed), 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSearch(query);
  };

  const handleCopy = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(value);
    setToast("Copied to clipboard");
    setTimeout(() => setCopiedValue(null), 1500);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleCopyResults = useCallback(async () => {
    if (!results) return;
    await navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    setToast("Results copied");
    setTimeout(() => setToast(null), 2000);
  }, [results]);

  const handleExport = useCallback(() => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${results.normalized}-availability.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToast("Report exported");
    setTimeout(() => setToast(null), 2000);
  }, [results]);

  const handleShareURL = useCallback(async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setToast("Shareable link copied!");
    setTimeout(() => setToast(null), 2500);
  }, []);

  const progressSteps = progressLabels.map((step) => ({
    ...step,
    status: progress[step.key],
  }));

  const showProgress = mutation.isPending || results;

  const isUnavailable =
    results &&
    (results.providers.apple.status !== "available" ||
      results.providers.googlePlay.status !== "available" ||
      results.providers.github.status !== "available" ||
      results.providers.domains.status !== "available" ||
      results.providers.bundleIds.status !== "available");

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/20 bg-white/60 shadow-[0_1px_24px_-8px_rgba(15,23,42,0.08)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <AppIcon size={34} />
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-primary">
                Availify
              </span>
              <span className="text-[10px] uppercase tracking-[0.22em] text-secondary">
                Name Checker
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/adsalihac/availify"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm transition hover:border-amber-400/60 hover:bg-amber-50/60 hover:text-amber-600"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.872 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
              </svg>
              Star
              {starCount !== null && (
                <span className="rounded-full bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-700">
                  {starCount >= 1000 ? `${(starCount / 1000).toFixed(1)}k` : starCount}
                </span>
              )}
            </a>
            <a
              href="https://github.com/adsalihac"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/50 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm transition hover:border-primary/40 hover:bg-white/80"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Contribute
            </a>
          </div>
        </div>
      </header>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        recentSearches={recentSearches}
        onSearchFocus={() => inputRef.current?.focus()}
        onSelectRecent={(name) => {
          setQuery(name);
          handleSearch(name);
        }}
        onCopyResults={handleCopyResults}
        onExportReport={handleExport}
      />

      <main className="relative mx-auto flex w-full max-w-[1200px] flex-1 grow flex-col gap-10 px-6 pb-24 pt-10">
        {/* Hero */}
        <header className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-1.5 text-xs font-medium text-secondary shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Free · Open Source · No API key required
          </div>
          <h1 className="text-[44px] font-extrabold leading-[1.04] tracking-tight text-primary md:text-[56px]">
            Availify
          </h1>
          <p className="max-w-lg text-[15px] font-medium text-secondary">
            Instantly check your app name across App Store, Play Store, Domains,
            GitHub, npm, and Bundle IDs — all in one shot.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {platforms.map((p) => (
              <span
                key={p.label}
                className="rounded-full border border-border bg-white px-3 py-1 text-[11px] font-medium text-secondary shadow-sm"
              >
                {p.label}
              </span>
            ))}
          </div>
        </header>

        {/* Search */}
        <section className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="MyAwesomeApp"
                className="h-14 w-full rounded-2xl border border-border bg-white px-5 text-[15px] font-semibold text-primary shadow-[0_8px_32px_-16px_rgba(15,23,42,0.18)] outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20 placeholder:font-normal placeholder:text-secondary/60"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-lg border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-secondary md:inline-flex">
                ⌘ K
              </span>
            </div>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="h-14 rounded-2xl bg-[#111827] px-7 text-sm font-semibold text-white shadow-[0_8px_32px_-16px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:bg-[#1f2937] hover:shadow-[0_12px_40px_-16px_rgba(15,23,42,0.45)] active:translate-y-0 disabled:opacity-60"
            >
              {mutation.isPending ? "Checking…" : "Check Availability"}
            </button>
          </form>

          {/* Preview variants */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
            <span className="font-semibold uppercase tracking-[0.18em]">Preview</span>
            {previewVariants.length > 0 ? (
              previewVariants.map((variant) => (
                <span
                  key={variant}
                  className="rounded-lg border border-border bg-white px-2.5 py-1 font-medium text-primary"
                >
                  {variant}
                </span>
              ))
            ) : (
              <span className="text-secondary/70">Start typing to see variations</span>
            )}
          </div>

          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold uppercase tracking-[0.18em] text-secondary">Recent</span>
              {recentSearches.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => { setQuery(name); handleSearch(name); }}
                  className="rounded-lg border border-border bg-white px-3 py-1 font-medium text-primary shadow-sm transition hover:border-primary"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Results */}
        <section className="grid grid-cols-12 gap-5">
          {error && (
            <div className="col-span-12 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          {showProgress && <ProgressTerminal steps={progressSteps} />}

          {mutation.isPending && (
            <>
              <SkeletonCard height="h-40" />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {!mutation.isPending && results && (
            <>
              <ScoreCard score={results.score.value} label={results.score.label} />

              {/* Share row */}
              <div className="col-span-12 flex items-center justify-between">
                <p className="text-sm font-medium text-secondary">
                  Results for <span className="font-bold text-primary">&ldquo;{results.name}&rdquo;</span>
                  <span className="ml-2 text-xs text-secondary">· {results.timings.totalMs}ms</span>
                </p>
                <button
                  type="button"
                  onClick={handleShareURL}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition hover:border-primary"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M10 2h4v4M14 2l-6 6M6 4H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Share results
                </button>
              </div>

              <div className="col-span-12 grid grid-cols-12 gap-5">
                {/* Apple App Store */}
                <div className="col-span-12 rounded-2xl border border-border bg-white px-6 py-5 md:col-span-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                        </svg>
                      </div>
                      <h3 className="text-[15px] font-semibold text-primary">Apple App Store</h3>
                    </div>
                    <AvailabilityBadge status={results.providers.apple.status} />
                  </div>
                  <div className="mt-4 space-y-2">
                    {results.providers.apple.error && (
                      <p className="text-sm text-rose-600">{results.providers.apple.error}</p>
                    )}
                    {results.providers.apple.data.matches.length > 0 ? (
                      results.providers.apple.data.matches.map((match) => (
                        <a
                          key={match.url}
                          href={match.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 transition hover:border-primary hover:bg-slate-50"
                        >
                          <div>
                            <p className="text-sm font-medium text-primary">{match.name}</p>
                            <p className="text-xs text-secondary">{match.bundleId ?? "Bundle ID unavailable"}</p>
                          </div>
                          <span className="text-xs text-secondary">{match.developer ?? "Apple"}</span>
                        </a>
                      ))
                    ) : (
                      <p className="text-sm text-secondary">No direct matches found. This name looks available.</p>
                    )}
                  </div>
                  {/* iOS Bundle IDs */}
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary">iOS Bundle Identifiers</p>
                    <div className="space-y-2">
                      {results.providers.bundleIds.data.results
                        .filter((b) => b.bundleId.startsWith("com.company.") || b.bundleId.startsWith("app."))
                        .map((bundle) => (
                          <div key={bundle.bundleId} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                            <div>
                              <p className="font-mono text-xs font-medium text-primary">{bundle.bundleId}</p>
                              <p className="text-[11px] text-secondary">Bundle ID</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <AvailabilityBadge status={bundle.status} />
                              <button
                                type="button"
                                onClick={() => handleCopy(bundle.bundleId)}
                                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-primary transition hover:border-primary"
                              >
                                {copiedValue === bundle.bundleId ? "Copied!" : "Copy"}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Google Play Store */}
                <div className="col-span-12 rounded-2xl border border-border bg-white px-6 py-5 md:col-span-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white shadow-sm">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none">
                          {/* Green — top-left to center */}
                          <path d="M1.22 0.406a1.5 1.5 0 0 0-.22.802v21.584c0 .297.086.572.222.802l.034.033 12.09-12.09v-.285L1.256.373l-.036.033z" fill="#32BBFF"/>
                          {/* Blue — right arrow tip */}
                          <path d="M17.396 16.667l-4.03-4.032v-.285l4.032-4.031.09.052 4.773 2.712c1.363.774 1.363 2.04 0 2.815l-4.773 2.71-.092.059z" fill="#FFD400"/>
                          {/* Yellow — bottom-left */}
                          <path d="M17.488 16.608L13.366 12.5 1.22 24.593c.45.476 1.192.533 2.027.06l14.24-8.045" fill="#FF3333"/>
                          {/* Red — top-left */}
                          <path d="M17.488 7.392L3.248.346C2.413-.127 1.671-.07 1.22.407l12.146 12.093 4.122-4.108z" fill="#00CC76"/>
                        </svg>
                      </div>
                      <h3 className="text-[15px] font-semibold text-primary">Google Play Store</h3>
                    </div>
                    <AvailabilityBadge status={results.providers.googlePlay.status} />
                  </div>
                  <div className="mt-4 space-y-2">
                    {results.providers.googlePlay.error && (
                      <p className="text-sm text-rose-600">{results.providers.googlePlay.error}</p>
                    )}
                    {results.providers.googlePlay.data.matches.length > 0 ? (
                      results.providers.googlePlay.data.matches.map((match) => (
                        <a
                          key={match.url}
                          href={match.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 transition hover:border-primary hover:bg-slate-50"
                        >
                          <div>
                            <p className="text-sm font-medium text-primary">{match.name}</p>
                            <p className="text-xs text-secondary">{match.packageName}</p>
                          </div>
                          <span className="text-xs text-secondary">View app</span>
                        </a>
                      ))
                    ) : (
                      <p className="text-sm text-secondary">No direct matches found. This name looks available.</p>
                    )}
                  </div>
                  {/* Android Package Names */}
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary">Android Package Names</p>
                    <div className="space-y-2">
                      {results.providers.bundleIds.data.results
                        .filter((b) => (b.bundleId.startsWith("com.") && !b.bundleId.startsWith("com.company.")) || b.bundleId.startsWith("io."))
                        .map((bundle) => (
                          <div key={bundle.bundleId} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                            <div>
                              <p className="font-mono text-xs font-medium text-primary">{bundle.bundleId}</p>
                              <p className="text-[11px] text-secondary">Package Name</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <AvailabilityBadge status={bundle.status} />
                              <button
                                type="button"
                                onClick={() => handleCopy(bundle.bundleId)}
                                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-primary transition hover:border-primary"
                              >
                                {copiedValue === bundle.bundleId ? "Copied!" : "Copy"}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Domains */}
                <div className="col-span-12 rounded-2xl border border-border bg-white px-6 py-5 md:col-span-7">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-slate-50">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <circle cx="12" cy="12" r="9"/>
                          <path d="M12 3c-2.5 3-4 5.7-4 9s1.5 6 4 9M12 3c2.5 3 4 5.7 4 9s-1.5 6-4 9M3 12h18" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <h3 className="text-[15px] font-semibold text-primary">Domains</h3>
                    </div>
                    <AvailabilityBadge status={results.providers.domains.status} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {results.providers.domains.data.results.map((domain) => (
                      <div
                        key={domain.domain}
                        className={clsx(
                          "flex flex-col gap-1 rounded-xl border px-3 py-2.5",
                          domain.status === "available" && "border-emerald-200 bg-emerald-50",
                          domain.status === "taken" && "border-rose-200 bg-rose-50",
                          domain.status === "error" && "border-zinc-200 bg-zinc-50",
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <span className={clsx(
                            "text-[11px] font-semibold",
                            domain.status === "available" && "text-emerald-600",
                            domain.status === "taken" && "text-rose-600",
                            domain.status === "error" && "text-zinc-500",
                          )}>
                            {domain.status === "available" ? "✓" : "✕"}
                          </span>
                          <span className={clsx(
                            "text-xs font-medium",
                            domain.status === "available" && "text-emerald-700",
                            domain.status === "taken" && "text-rose-700",
                            domain.status === "error" && "text-zinc-600",
                          )}>
                            {domain.domain}
                          </span>
                        </div>
                        {domain.status === "available" && (
                          <a
                            href={`https://www.namecheap.com/domains/registration/results/?domain=${domain.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-semibold text-emerald-600 underline-offset-2 hover:underline"
                          >
                            Register →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* npm */}
                <div className="col-span-12 rounded-2xl border border-border bg-white px-6 py-5 md:col-span-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#CB3837]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true">
                          <path d="M0 0v24h24V0H0zm19.2 19.2H12v-9.6H9.6v9.6H4.8V4.8h14.4v14.4z"/>
                        </svg>
                      </div>
                      <h3 className="text-[15px] font-semibold text-primary">npm Registry</h3>
                    </div>
                    <AvailabilityBadge status={results.providers.npm.status} />
                  </div>
                  <div className="mt-4">
                    {results.providers.npm.error ? (
                      <p className="text-sm text-rose-600">{results.providers.npm.error}</p>
                    ) : (
                      <div className="rounded-xl border border-border px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-mono text-sm font-medium text-primary">
                              {results.providers.npm.data.packageName}
                            </p>
                            <p className="text-xs text-secondary">npm package name</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <AvailabilityBadge status={results.providers.npm.status} />
                            {results.providers.npm.status === "available" && (
                              <button
                                type="button"
                                onClick={() => handleCopy(`npm install ${results.providers.npm.data.packageName}`)}
                                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-primary transition hover:border-primary"
                              >
                                {copiedValue === `npm install ${results.providers.npm.data.packageName}` ? "Copied!" : "Copy install"}
                              </button>
                            )}
                            {results.providers.npm.status === "taken" && (
                              <a
                                href={results.providers.npm.data.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-primary transition hover:border-primary"
                              >
                                View →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {results.providers.npm.status === "available" && (
                      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                        <p className="font-mono text-xs text-secondary">
                          <span className="text-secondary">$</span>{" "}
                          <span className="font-medium text-primary">npm install {results.providers.npm.data.packageName}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* GitHub */}
                <div className="col-span-12 rounded-2xl border border-border bg-white px-6 py-5 md:col-span-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#24292f]">
                        <svg viewBox="0 0 16 16" className="h-4 w-4 fill-white" aria-hidden="true">
                          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                        </svg>
                      </div>
                      <h3 className="text-[15px] font-semibold text-primary">GitHub</h3>
                    </div>
                    <AvailabilityBadge status={results.providers.github.status} />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                      <div>
                        <p className="font-mono text-sm font-medium text-primary">github.com/{results.normalized}</p>
                        <p className="text-xs text-secondary">Username</p>
                      </div>
                      <AvailabilityBadge status={results.providers.github.data.username} />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                      <div>
                        <p className="font-mono text-sm font-medium text-primary">github.com/orgs/{results.normalized}</p>
                        <p className="text-xs text-secondary">Organization</p>
                      </div>
                      <AvailabilityBadge status={results.providers.github.data.org} />
                    </div>
                  </div>
                </div>

                {/* Name Suggestions */}
                {isUnavailable && results.suggestions.length > 0 && (
                  <div className="col-span-12 rounded-2xl border border-border bg-white px-6 py-5 md:col-span-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[15px] font-semibold text-primary">Name Suggestions</h3>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary">Deterministic</span>
                    </div>
                    <p className="mt-1 text-xs text-secondary">Click a suggestion to check its availability.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {results.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => { setQuery(suggestion); handleSearch(suggestion); }}
                          className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-primary shadow-sm transition hover:border-primary hover:bg-slate-50"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!mutation.isPending && !results && !error && <EmptyState />}
        </section>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-20 right-6 z-50 rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-primary shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="sticky bottom-0 z-10 border-t border-white/20 bg-white/60 shadow-[0_-1px_24px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4 text-xs text-secondary">
          <a
            href="https://github.com/adsalihac"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-primary"
          >
            © {new Date().getFullYear()} adsalihac
          </a>
          <div className="flex items-center gap-4">
            <a
              href="https://buymeacoffee.com/adsalihac"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50/60 px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm backdrop-blur-sm transition hover:border-amber-400/60 hover:bg-amber-100/80"
            >
              <span>☕</span>
              Buy me a coffee
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
