import type { AvailabilityStatus, DomainResult } from "../types";
import type { AvailabilityProvider, ProviderInput } from "./types";
import { fetchWithTimeout } from "./helpers";

export class DomainProvider
  implements AvailabilityProvider<{ results: DomainResult[] }>
{
  id = "domains" as const;
  label = "Domains";

  async check(input: ProviderInput) {
    const results = await Promise.all(
      input.domains.map(async (domain) => {
        const url = `https://dns.google/resolve?name=${domain}&type=NS`;
        const response = await fetchWithTimeout(url);

        if (!response.ok) {
          throw new Error(`DNS lookup failed (${response.status})`);
        }

        const data = (await response.json()) as {
          Answer?: unknown[];
          Authority?: unknown[];
        };

        const taken =
          (data.Answer && data.Answer.length > 0) ||
          (data.Authority && data.Authority.length > 0);

        return {
          domain,
          status: taken ? "taken" : "available",
        } as DomainResult;
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
