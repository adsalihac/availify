import type { AvailabilityStatus, StoreMatch } from "../types";
import type { AvailabilityProvider, ProviderInput } from "./types";
import { fetchWithTimeout, unique } from "./helpers";

export class GooglePlayProvider
  implements AvailabilityProvider<{ matches: StoreMatch[] }>
{
  id = "googlePlay" as const;
  label = "Google Play Store";

  async check(input: ProviderInput) {
    const query = encodeURIComponent(input.name);
    const url = `https://play.google.com/store/search?q=${query}&c=apps`;

    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Google Play search failed (${response.status})`);
    }

    const html = await response.text();
    const matches = unique(
      Array.from(
        html.matchAll(/\/store\/apps\/details\?id=([a-zA-Z0-9._-]+)/g),
        (match) => match[1],
      ),
    ).slice(0, 5);

    const results: StoreMatch[] = matches.map((id) => ({
      name: id,
      packageName: id,
      url: `https://play.google.com/store/apps/details?id=${id}`,
    }));

    const status: AvailabilityStatus =
      results.length > 0 ? "taken" : "available";

    return {
      status,
      data: { matches: results },
    };
  }
}
