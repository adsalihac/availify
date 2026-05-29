import type { AvailabilityStatus } from "../types";
import type { AvailabilityProvider, ProviderInput } from "./types";
import { fetchWithTimeout } from "./helpers";
import { toCompactLower } from "../utils";

export class DockerHubProvider
  implements AvailabilityProvider<{ imageName: string; url: string }>
{
  id = "dockerHub" as const;
  label = "Docker Hub";

  async check(input: ProviderInput) {
    try {
      const imageName = toCompactLower(input.name);
      const url = `https://hub.docker.com/v2/repositories/${encodeURIComponent(imageName)}/`;
      const response = await fetchWithTimeout(url);
      const status: AvailabilityStatus =
        response.status === 404 ? "available" : response.ok ? "taken" : "error";
      return {
        status,
        data: { imageName, url: `https://hub.docker.com/r/${imageName}` },
      };
    } catch {
      const imageName = toCompactLower(input.name);
      return {
        status: "error" as AvailabilityStatus,
        data: { imageName, url: `https://hub.docker.com/r/${imageName}` },
        error: "Unable to check Docker Hub.",
      };
    }
  }
}
