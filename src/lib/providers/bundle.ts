import type { AvailabilityStatus, BundleIdResult } from "../types";
import type { AvailabilityProvider, ProviderInput } from "./types";
import { fetchWithTimeout } from "./helpers";

export class BundleIdProvider
  implements AvailabilityProvider<{ results: BundleIdResult[] }>
{
  id = "bundleIds" as const;
  label = "Bundle Identifiers";

  async check(input: ProviderInput) {
    const results = await Promise.all(
      input.bundleIds.map(async (bundleId) => {
        const url = `https://itunes.apple.com/lookup?bundleId=${bundleId}&country=us`;
        const response = await fetchWithTimeout(url, {
          headers: {
            "User-Agent": "AppNameChecker/1.0",
          },
        });

        if (!response.ok) {
          throw new Error(`Bundle lookup failed (${response.status})`);
        }

        const data = (await response.json()) as { resultCount?: number };
        const taken = (data.resultCount ?? 0) > 0;

        return {
          bundleId,
          status: taken ? "taken" : "available",
        } as BundleIdResult;
      }),
    );

    const status: AvailabilityStatus = results.every(
      (result) => result.status === "available",
    )
      ? "available"
      : results.some((result) => result.status === "available")
        ? "partial"
        : "taken";

    return {
      status,
      data: { results },
    };
  }
}
