import type { AvailabilityStatus } from "../types";
import type { AvailabilityProvider, ProviderInput } from "./types";
import { fetchWithTimeout } from "./helpers";
import { toCompactLower } from "../utils";

export class NpmProvider
  implements AvailabilityProvider<{ packageName: string; url: string }>
{
  id = "npm" as const;
  label = "npm";

  async check(input: ProviderInput) {
    const packageName = toCompactLower(input.name);
    const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;

    const response = await fetchWithTimeout(url, {
      headers: { Accept: "application/json" },
    });

    const status: AvailabilityStatus =
      response.status === 404 ? "available" : response.ok ? "taken" : "error";

    return {
      status,
      data: {
        packageName,
        url: `https://www.npmjs.com/package/${packageName}`,
      },
    };
  }
}
