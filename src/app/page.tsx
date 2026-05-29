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
] as const;

type ProgressState = Record<(typeof progressLabels)[number]["key"], ProgressStatus>;

function EmptyState() {
  return (
    <div className="col-span-12 rounded-3xl border border-border bg-white px-8 py-12 text-center shadow-[0_20px_60px_-40px_rgba(15,23,42,0.25)]">
      <p className="text-sm font-medium text-secondary">
        Start by entering an app name.
      </p>
      <p className="mt-2 text-sm text-secondary">
        We&apos;ll instantly check App Store, Play Store, Domains, Bundle IDs, and
        GitHub availability.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-secondary">
        <span className="rounded-full border border-border px-3 py-1">
          Terminal-grade results
        </span>
        <span className="rounded-full border border-border px-3 py-1">
          Instant suggestions
        </span>
        <span className="rounded-full border border-border px-3 py-1">
          Copy-ready bundles
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
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
  });
  const [toast, setToast] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [starCount, setStarCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/adsalihac/availify")
      .then((r) => r.json())
      .then((d) => { if (typeof d.stargazers_count === "number") setStarCount(d.stargazers_count); })
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
        googlePlay:
          data.providers.googlePlay.status === "error" ? "error" : "complete",
        domains: data.providers.domains.status === "error" ? "error" : "complete",
        github: data.providers.github.status === "error" ? "error" : "complete",
        bundleIds:
          data.providers.bundleIds.status === "error" ? "error" : "complete",
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
      });
      setError(null);
      setResults(null);
      updateRecent(normalized);
      mutation.mutate(normalized);
    },
    [mutation, updateRecent],
  );

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
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />

      <header className="sticky top-0 z-10 border-b border-white/20 bg-white/60 shadow-[0_1px_24px_-8px_rgba(15,23,42,0.08)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <AppIcon size={36} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-primary">
                Availify
              </span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-secondary">
                Developer Utility
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/adsalihac/availify"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/50 px-3 py-2 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm transition hover:border-amber-400/60 hover:bg-amber-50/60 hover:text-amber-600"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5 fill-current"
              >
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
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/50 px-4 py-2 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm transition hover:border-primary/40 hover:bg-white/80"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-4 w-4 fill-current"
              >
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

      <main className="relative mx-auto flex w-full max-w-[1200px] flex-1 grow flex-col gap-12 px-6 pb-24 pt-12">
        <header className="mx-auto flex w-full max-w-3xl flex-col items-center text-center gap-4">
          <h1 className="text-[40px] font-bold leading-[1.05] text-primary md:text-[48px]">
            Availify          </h1>
          <p className="text-[14px] font-medium text-secondary md:text-[15px]">
            Check App Store, Play Store, Domains, Bundle IDs, and GitHub
            availability in seconds.
          </p>
        </header>

        <section className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 md:flex-row"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="MyAwesomeApp"
                className="h-14 w-full rounded-2xl border border-border bg-white px-4 text-[15px] font-medium text-primary shadow-[0_15px_45px_-35px_rgba(15,23,42,0.3)] outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 placeholder:text-secondary/70"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-secondary md:inline-flex">
                ⌘ K
              </span>
            </div>
            <button
              type="submit"
              className="h-14 rounded-2xl bg-primary px-6 text-sm font-semibold text-white shadow-[0_15px_45px_-35px_rgba(15,23,42,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_55px_-35px_rgba(15,23,42,0.5)] active:translate-y-0"
            >
              Check Availability
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
            <span className="uppercase tracking-[0.2em]">Preview</span>
            {previewVariants.length > 0 ? (
              previewVariants.map((variant) => (
                <span
                  key={variant}
                  className="rounded-full border border-border px-2 py-1 font-medium text-primary"
                >
                  {variant}
                </span>
              ))
            ) : (
              <span className="text-secondary">
                Start typing to generate variations
              </span>
            )}
          </div>

          {recentSearches.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-secondary">
              <span className="uppercase tracking-[0.2em]">
                Recent searches
              </span>
              {recentSearches.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSearch(name)}
                  className="rounded-full border border-border px-3 py-1 text-primary transition hover:border-primary"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-12 gap-6">
          {error && (
            <div className="col-span-12 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {showProgress && (
            <ProgressTerminal steps={progressSteps} />
          )}

          {mutation.isPending && (
            <>
              <SkeletonCard height="h-48" />
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

              <div className="col-span-12 grid grid-cols-12 gap-6">
                {/* Apple App Store card */}
                <div className="col-span-12 rounded-2xl border border-border bg-white px-6 py-5 md:col-span-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] font-semibold text-primary">
                      Apple App Store
                    </h3>
                    <AvailabilityBadge status={results.providers.apple.status} />
                  </div>
                  <div className="mt-4 space-y-2 text-[14px] text-secondary">
                    {results.providers.apple.error && (
                      <p className="text-rose-600">
                        {results.providers.apple.error}
                      </p>
                    )}
                    {results.providers.apple.data.matches.length > 0 ? (
                      results.providers.apple.data.matches.map((match) => (
                        <a
                          key={match.url}
                          href={match.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-primary transition hover:border-primary"
                        >
                          <div>
                            <p className="text-sm font-medium">{match.name}</p>
                            <p className="text-xs text-secondary">
                              {match.bundleId ?? "Bundle ID unavailable"}
                            </p>
                          </div>
                          <span className="text-xs text-secondary">
                            {match.developer ?? "Apple"}
                          </span>
                        </a>
                      ))
                    ) : (
                      <p className="text-secondary">
                        No direct matches found. This name looks available.
                      </p>
                    )}
                  </div>

                  {/* Apple Bundle IDs: com.company.* and app.* formats */}
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-secondary">
                      iOS Bundle Identifiers
                    </p>
                    <div className="space-y-2">
                      {results.providers.bundleIds.data.results
                        .filter(
                          (b) =>
                            b.bundleId.startsWith("com.company.") ||
                            b.bundleId.startsWith("app."),
                        )
                        .map((bundle) => (
                          <div
                            key={bundle.bundleId}
                            className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-primary">
                                {bundle.bundleId}
                              </p>
                              <p className="text-xs text-secondary">Bundle ID</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <AvailabilityBadge status={bundle.status} />
                              <button
                                type="button"
                                onClick={() => handleCopy(bundle.bundleId)}
                                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-primary transition hover:border-primary"
                              >
                                {copiedValue === bundle.bundleId
                                  ? "Copied"
                                  : "Copy"}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Google Play Store card */}
                <div className="col-span-12 rounded-2xl border border-border bg-white px-6 py-5 md:col-span-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] font-semibold text-primary">
                      Google Play Store
                    </h3>
                    <AvailabilityBadge
                      status={results.providers.googlePlay.status}
                    />
                  </div>
                  <div className="mt-4 space-y-2 text-[14px] text-secondary">
                    {results.providers.googlePlay.error && (
                      <p className="text-rose-600">
                        {results.providers.googlePlay.error}
                      </p>
                    )}
                    {results.providers.googlePlay.data.matches.length > 0 ? (
                      results.providers.googlePlay.data.matches.map((match) => (
                        <a
                          key={match.url}
                          href={match.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-primary transition hover:border-primary"
                        >
                          <div>
                            <p className="text-sm font-medium">{match.name}</p>
                            <p className="text-xs text-secondary">
                              {match.packageName}
                            </p>
                          </div>
                          <span className="text-xs text-secondary">
                            View app
                          </span>
                        </a>
                      ))
                    ) : (
                      <p className="text-secondary">
                        No direct matches found. This name looks available.
                      </p>
                    )}
                  </div>

                  {/* Android Bundle IDs: com.* and io.* formats */}
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-secondary">
                      Android Package Names
                    </p>
                    <div className="space-y-2">
                      {results.providers.bundleIds.data.results
                        .filter(
                          (b) =>
                            (b.bundleId.startsWith("com.") &&
                              !b.bundleId.startsWith("com.company.")) ||
                            b.bundleId.startsWith("io."),
                        )
                        .map((bundle) => (
                          <div
                            key={bundle.bundleId}
                            className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-primary">
                                {bundle.bundleId}
                              </p>
                              <p className="text-xs text-secondary">
                                Package Name
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <AvailabilityBadge status={bundle.status} />
                              <button
                                type="button"
                                onClick={() => handleCopy(bundle.bundleId)}
                                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-primary transition hover:border-primary"
                              >
                                {copiedValue === bundle.bundleId
                                  ? "Copied"
                                  : "Copy"}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="col-span-12 rounded-2xl border border-border bg-white px-6 py-5 md:col-span-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] font-semibold text-primary">
                      Domains
                    </h3>
                    <AvailabilityBadge status={results.providers.domains.status} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {results.providers.domains.data.results.map((domain) => (
                      <span
                        key={domain.domain}
                        className={clsx(
                          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                          domain.status === "available" &&
                            "border-emerald-200 bg-emerald-50 text-emerald-700",
                          domain.status === "taken" &&
                            "border-rose-200 bg-rose-50 text-rose-700",
                          domain.status === "error" &&
                            "border-zinc-200 bg-zinc-100 text-zinc-600",
                        )}
                      >
                        {domain.status === "available" ? "✓" : "✕"}{" "}
                        {domain.domain}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="col-span-12 rounded-2xl border border-border bg-white px-6 py-5 md:col-span-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] font-semibold text-primary">
                      GitHub
                    </h3>
                    <AvailabilityBadge status={results.providers.github.status} />
                  </div>
                  <div className="mt-4 space-y-3 text-[14px]">
                    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-primary">
                          github.com/{results.normalized}
                        </p>
                        <p className="text-xs text-secondary">Username</p>
                      </div>
                      <AvailabilityBadge
                        status={results.providers.github.data.username}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-primary">
                          github.com/orgs/{results.normalized}
                        </p>
                        <p className="text-xs text-secondary">Organization</p>
                      </div>
                      <AvailabilityBadge
                        status={results.providers.github.data.org}
                      />
                    </div>
                  </div>
                </div>


                {isUnavailable && results.suggestions.length > 0 && (
                  <div className="col-span-12 rounded-2xl border border-border bg-white px-6 py-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[16px] font-semibold text-primary">
                        Name Suggestions
                      </h3>
                      <span className="text-xs uppercase tracking-[0.2em] text-secondary">
                        Deterministic
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {results.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setQuery(suggestion);
                            handleSearch(suggestion);
                          }}
                          className="rounded-full border border-border px-3 py-1 text-sm text-primary transition hover:border-primary"
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

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-6 right-6 rounded-full border border-border bg-white px-4 py-2 text-xs font-medium text-primary shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

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
