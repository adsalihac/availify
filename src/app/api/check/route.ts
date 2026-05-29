import { NextRequest, NextResponse } from "next/server";
import type { CheckResponse, ProviderResult } from "@/lib/types";
import {
  AppleProvider,
  BundleIdProvider,
  DomainProvider,
  GithubProvider,
  GooglePlayProvider,
  NpmProvider,
  PyPIProvider,
  SocialProvider,
} from "@/lib/providers";
import {
  calculateScore,
  generateBundleIds,
  generateDomains,
  generateSuggestions,
  generateVariants,
  normalizeName,
  toCompactLower,
} from "@/lib/utils";

const CACHE_TTL_MS = 1000 * 60 * 10;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 12;

const cache = new Map<string, { expiresAt: number; value: CheckResponse }>();
const rateLimits = new Map<string, { resetAt: number; count: number }>();

function getClientId(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(clientId: string) {
  const now = Date.now();
  const entry = rateLimits.get(clientId);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + RATE_WINDOW_MS;
    rateLimits.set(clientId, { resetAt, count: 1 });
    return { allowed: true, resetAt };
  }

  if (entry.count >= RATE_MAX) {
    return { allowed: false, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, resetAt: entry.resetAt };
}

function emptyProvider<T>(data: T, message: string): ProviderResult<T> {
  return { status: "error", data, error: message };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const rawName = typeof body?.name === "string" ? body.name : "";
  const name = normalizeName(rawName);

  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: "Please provide a valid app name." },
      { status: 400 },
    );
  }

  const clientId = getClientId(request);
  const rate = checkRateLimit(clientId);
  if (!rate.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": retryAfter.toString() } },
    );
  }

  const cacheKey = name.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.value, { status: 200 });
  }

  const variants = generateVariants(name);
  const bundleIds = generateBundleIds(name);
  const domains = generateDomains(name);
  const start = Date.now();

  const providers = [
    new AppleProvider(),
    new GooglePlayProvider(),
    new DomainProvider(),
    new GithubProvider(),
    new BundleIdProvider(),
    new NpmProvider(),
    new PyPIProvider(),
    new SocialProvider(),
  ];

  const providerResults = await Promise.all(
    providers.map(async (provider) => {
      try {
        const result = await provider.check({
          name,
          normalized: name,
          variants,
          bundleIds,
          domains,
        });
        return [provider.id, result] as const;
      } catch (error) {
        console.error(`[${provider.id}]`, error);
        if (provider.id === "domains") {
          return [
            provider.id,
            emptyProvider(
              {
                results: domains.map((domain) => ({
                  domain,
                  status: "error",
                })),
              },
              "Unable to check domains.",
            ),
          ] as const;
        }
        if (provider.id === "bundleIds") {
          return [
            provider.id,
            emptyProvider(
              {
                results: bundleIds.map((bundleId) => ({
                  bundleId,
                  status: "error",
                })),
              },
              "Unable to check bundle IDs.",
            ),
          ] as const;
        }
        if (provider.id === "github") {
          return [
            provider.id,
            emptyProvider(
              { username: "error", org: "error" },
              "Unable to check GitHub.",
            ),
          ] as const;
        }
        if (provider.id === "npm") {
          const pName = toCompactLower(name);
          return [
            provider.id,
            emptyProvider(
              { packageName: pName, url: `https://www.npmjs.com/package/${pName}` },
              "Unable to check npm registry.",
            ),
          ] as const;
        }
        if (provider.id === "pypi") {
          const pName = toCompactLower(name);
          return [
            provider.id,
            emptyProvider(
              { packageName: pName, url: `https://pypi.org/project/${pName}` },
              "Unable to check PyPI.",
            ),
          ] as const;
        }
        if (provider.id === "social") {
          return [
            provider.id,
            emptyProvider({ results: [] }, "Unable to check social media."),
          ] as const;
        }
        return [
          provider.id,
          emptyProvider({ matches: [] }, `Unable to check ${provider.label}.`),
        ] as const;
      }
    }),
  );

  const providerMap = Object.fromEntries(providerResults) as CheckResponse["providers"];

  const response: CheckResponse = {
    name,
    normalized: name.toLowerCase(),
    variants,
    score: { value: 0, label: "" },
    providers: providerMap,
    suggestions: generateSuggestions(name),
    timings: { totalMs: Date.now() - start },
  };

  response.score = calculateScore(response);

  cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: response,
  });

  return NextResponse.json(response, { status: 200 });
}
