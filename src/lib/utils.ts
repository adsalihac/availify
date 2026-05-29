import type { AvailabilityStatus, CheckResponse } from "./types";

export function normalizeName(input: string) {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, " ");
}

export function toKebabCase(input: string) {
  return normalizeName(input)
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function toCompactLower(input: string) {
  return normalizeName(input).toLowerCase().replace(/[\s-]+/g, "");
}

export function toStudly(input: string) {
  const words = normalizeName(input)
    .split(/[\s-]+/g)
    .filter(Boolean);
  return words.map((word) => word[0]?.toUpperCase() + word.slice(1)).join("");
}

export function generateVariants(input: string) {
  const compact = toCompactLower(input);
  const kebab = toKebabCase(input);
  const original = normalizeName(input);
  return Array.from(new Set([compact, kebab, original].filter(Boolean)));
}

export function generateDomains(input: string) {
  const compact = toCompactLower(input);
  const tlds = ["com", "app", "io", "dev", "co", "xyz", "me"];
  return tlds.map((tld) => `${compact}.${tld}`);
}

export function generateBundleIds(input: string) {
  const compact = toCompactLower(input);
  return [
    `com.${compact}`,
    `com.company.${compact}`,
    `app.${compact}`,
    `io.${compact}`,
  ];
}

export function generateSuggestions(input: string) {
  const base = toStudly(input);
  if (!base) return [];
  const prefixes = ["Get", "Use", "Try"];
  const suffixes = ["HQ", "Labs", "AI"];
  const suggestions = [
    `${base}${suffixes[0]}`,
    `${prefixes[0]}${base}`,
    `${prefixes[1]}${base}`,
    `${base}${suffixes[1]}`,
    `${base}${suffixes[2]}`,
    `${prefixes[2]}${base}`,
  ];
  return Array.from(new Set(suggestions));
}

export function scoreLabel(score: number) {
  if (score >= 85) return "Excellent Availability";
  if (score >= 65) return "Good Availability";
  if (score >= 40) return "Mixed Availability";
  return "Limited Availability";
}

export function calculateScore(response: CheckResponse) {
  const statuses: AvailabilityStatus[] = [];
  statuses.push(response.providers.apple.status);
  statuses.push(response.providers.googlePlay.status);
  statuses.push(response.providers.github.data.username);
  statuses.push(response.providers.github.data.org);
  statuses.push(response.providers.npm.status);
  statuses.push(response.providers.pypi.status);
  response.providers.domains.data.results.forEach((d) => statuses.push(d.status));
  response.providers.bundleIds.data.results.forEach((b) => statuses.push(b.status));
  response.providers.social.data.results.forEach((s) => statuses.push(s.status));

  const total = statuses.filter(s => s !== "error").length || 1;
  const weighted = statuses.reduce((acc, status) => {
    if (status === "available") return acc + 1;
    if (status === "partial") return acc + 0.5;
    return acc;
  }, 0) / total;

  const value = Math.round(weighted * 100);
  return { value, label: scoreLabel(value) };
}
