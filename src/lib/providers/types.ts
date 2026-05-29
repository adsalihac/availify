import type { AvailabilityStatus } from "../types";

export interface ProviderInput {
  name: string;
  normalized: string;
  variants: string[];
  bundleIds: string[];
  domains: string[];
}

export interface ProviderResponse<T> {
  status: AvailabilityStatus;
  data: T;
  error?: string;
}

export interface AvailabilityProvider<T> {
  id: string;
  label: string;
  check(input: ProviderInput): Promise<ProviderResponse<T>>;
}
