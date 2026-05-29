import type { AvailabilityStatus } from "../types";
import type { AvailabilityProvider, ProviderInput } from "./types";
import { fetchWithTimeout } from "./helpers";
import { toCompactLower } from "../utils";

export class PyPIProvider
  implements AvailabilityProvider<{ packageName: string; url: string }>
{
  id = "pypi" as const;
  label = "PyPI";

  async check(input: ProviderInput) {
    const packageName = toCompactLower(input.name);
    const url = `https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`;

    const response = await fetchWithTimeout(url, {
      headers: { Accept: "application/json" },
    });

    const status: AvailabilityStatus =
      response.status === 404 ? "available" : response.ok ? "taken" : "error";

    return {
      status,
      data: {
        packageName,
        url: `https://pypi.org/project/${packageName}`,
      },
    };
  }
}
