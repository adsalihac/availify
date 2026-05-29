import type { AvailabilityStatus } from "../types";
import type { AvailabilityProvider, ProviderInput } from "./types";
import { fetchWithTimeout } from "./helpers";
import { toCompactLower } from "../utils";

export class CratesProvider
  implements AvailabilityProvider<{ crateName: string; url: string }>
{
  id = "crates" as const;
  label = "Crates.io";

  async check(input: ProviderInput) {
    try {
      const crateName = toCompactLower(input.name);
      const url = `https://crates.io/api/v1/crates/${encodeURIComponent(crateName)}`;
      const response = await fetchWithTimeout(url, {
        headers: { "User-Agent": "availify/1.0" },
      });
      const status: AvailabilityStatus =
        response.status === 404 ? "available" : response.ok ? "taken" : "error";
      return {
        status,
        data: { crateName, url: `https://crates.io/crates/${crateName}` },
      };
    } catch {
      const crateName = toCompactLower(input.name);
      return {
        status: "error" as AvailabilityStatus,
        data: { crateName, url: `https://crates.io/crates/${crateName}` },
        error: "Unable to check Crates.io.",
      };
    }
  }
}
