export type AvailabilityStatus = "available" | "taken" | "partial" | "error";

export interface StoreMatch {
  name: string;
  url: string;
  developer?: string;
  bundleId?: string;
  packageName?: string;
}

export interface DomainResult {
  domain: string;
  status: AvailabilityStatus;
}

export interface BundleIdResult {
  bundleId: string;
  status: AvailabilityStatus;
}

export interface ProviderResult<T> {
  status: AvailabilityStatus;
  data: T;
  error?: string;
}

export interface CheckResponse {
  name: string;
  normalized: string;
  variants: string[];
  score: {
    value: number;
    label: string;
  };
  providers: {
    apple: ProviderResult<{ matches: StoreMatch[] }>;
    googlePlay: ProviderResult<{ matches: StoreMatch[] }>;
    domains: ProviderResult<{ results: DomainResult[] }>;
    github: ProviderResult<{ username: AvailabilityStatus; org: AvailabilityStatus }>;
    bundleIds: ProviderResult<{ results: BundleIdResult[] }>;
  };
  suggestions: string[];
  timings: {
    totalMs: number;
  };
}
