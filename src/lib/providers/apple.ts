import type { AvailabilityStatus, StoreMatch } from "../types";
import type { AvailabilityProvider, ProviderInput } from "./types";
import { fetchWithTimeout } from "./helpers";

export class AppleProvider
  implements AvailabilityProvider<{ matches: StoreMatch[] }>
{
  id = "apple" as const;
  label = "Apple App Store";

  async check(input: ProviderInput) {
    const query = encodeURIComponent(input.variants.join(" "));
    const url = `https://itunes.apple.com/search?term=${query}&entity=software&limit=5&country=us`;

    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "AppNameChecker/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Apple search failed (${response.status})`);
    }

    const data = (await response.json()) as {
      results?: Array<{
        trackName?: string;
        bundleId?: string;
        sellerName?: string;
        trackViewUrl?: string;
      }>;
    };

    const matches: StoreMatch[] =
      data.results?.map((result) => ({
        name: result.trackName ?? "Unknown App",
        bundleId: result.bundleId,
        developer: result.sellerName,
        url: result.trackViewUrl ?? "https://apps.apple.com",
      })) ?? [];

    const status: AvailabilityStatus =
      matches.length > 0 ? "taken" : "available";

    return {
      status,
      data: { matches },
    };
  }
}
