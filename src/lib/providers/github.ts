import type { AvailabilityStatus } from "../types";
import type { AvailabilityProvider, ProviderInput } from "./types";
import { fetchWithTimeout } from "./helpers";

export class GithubProvider
  implements
    AvailabilityProvider<{
      username: AvailabilityStatus;
      org: AvailabilityStatus;
    }>
{
  id = "github" as const;
  label = "GitHub";

  async check(input: ProviderInput) {
    const username = input.variants[0] || input.normalized;
    const userUrl = `https://api.github.com/users/${username}`;
    const orgUrl = `https://api.github.com/orgs/${username}`;

    const [userRes, orgRes] = await Promise.all([
      fetchWithTimeout(userUrl, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "AppNameChecker/1.0",
        },
      }),
      fetchWithTimeout(orgUrl, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "AppNameChecker/1.0",
        },
      }),
    ]);

    const usernameStatus: AvailabilityStatus =
      userRes.status === 404
        ? "available"
        : userRes.ok
          ? "taken"
          : "error";
    const orgStatus: AvailabilityStatus =
      orgRes.status === 404 ? "available" : orgRes.ok ? "taken" : "error";
    const status: AvailabilityStatus =
      usernameStatus === "error" || orgStatus === "error"
        ? "error"
        : usernameStatus === "available" && orgStatus === "available"
          ? "available"
          : usernameStatus === "available" || orgStatus === "available"
            ? "partial"
            : "taken";

    return {
      status,
      data: {
        username: usernameStatus,
        org: orgStatus,
      },
    };
  }
}
