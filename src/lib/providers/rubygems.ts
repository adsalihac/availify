import type { AvailabilityStatus } from "../types";
import type { AvailabilityProvider, ProviderInput } from "./types";
import { fetchWithTimeout } from "./helpers";
import { toCompactLower } from "../utils";

export class RubyGemsProvider
  implements AvailabilityProvider<{ gemName: string; url: string }>
{
  id = "rubygems" as const;
  label = "RubyGems";

  async check(input: ProviderInput) {
    try {
      const gemName = toCompactLower(input.name);
      const url = `https://rubygems.org/api/v1/gems/${encodeURIComponent(gemName)}.json`;
      const response = await fetchWithTimeout(url);
      const status: AvailabilityStatus =
        response.status === 404 ? "available" : response.ok ? "taken" : "error";
      return {
        status,
        data: { gemName, url: `https://rubygems.org/gems/${gemName}` },
      };
    } catch {
      const gemName = toCompactLower(input.name);
      return {
        status: "error" as AvailabilityStatus,
        data: { gemName, url: `https://rubygems.org/gems/${gemName}` },
        error: "Unable to check RubyGems.",
      };
    }
  }
}
