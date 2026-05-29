import type { AvailabilityStatus } from "../types";
import type { AvailabilityProvider, ProviderInput } from "./types";
import { fetchWithTimeout } from "./helpers";
import { toKebabCase } from "../utils";

export class HomebrewProvider
  implements AvailabilityProvider<{ formulaName: string; url: string }>
{
  id = "homebrew" as const;
  label = "Homebrew";

  async check(input: ProviderInput) {
    try {
      const formulaName = toKebabCase(input.name);
      const url = `https://formulae.brew.sh/api/formula/${encodeURIComponent(formulaName)}.json`;
      const response = await fetchWithTimeout(url);
      const status: AvailabilityStatus =
        response.status === 404 ? "available" : response.ok ? "taken" : "error";
      return {
        status,
        data: { formulaName, url: `https://formulae.brew.sh/formula/${formulaName}` },
      };
    } catch {
      const formulaName = toKebabCase(input.name);
      return {
        status: "error" as AvailabilityStatus,
        data: { formulaName, url: `https://formulae.brew.sh/formula/${formulaName}` },
        error: "Unable to check Homebrew.",
      };
    }
  }
}
