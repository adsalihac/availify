import type { AvailabilityStatus } from "../types";
import type { AvailabilityProvider, ProviderInput } from "./types";
import { fetchWithTimeout } from "./helpers";
import { toCompactLower } from "../utils";

export interface SocialPlatformResult {
  id: string;
  name: string;
  username: string;
  profileUrl: string;
  status: AvailabilityStatus;
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function checkUrl(url: string): Promise<AvailabilityStatus> {
  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/json,*/*",
        },
        redirect: "follow",
      },
      4000,
    );
    if (res.status === 404 || res.status === 410) return "available";
    if (res.ok || res.status === 301 || res.status === 302 || res.status === 303) return "taken";
    return "error";
  } catch {
    return "error";
  }
}

interface Platform {
  id: string;
  name: string;
  profileUrl: (u: string) => string;
  checkUrl?: (u: string) => string; // separate URL for server-side check
  blocked?: boolean;                // platform blocks server checks entirely
}

const PLATFORMS: Platform[] = [
  {
    id: "instagram",
    name: "Instagram",
    profileUrl: (u) => `https://www.instagram.com/${u}/`,
    blocked: true, // requires login / blocks bots
  },
  {
    id: "twitter",
    name: "X / Twitter",
    profileUrl: (u) => `https://x.com/${u}`,
    blocked: true, // requires login / blocks bots
  },
  {
    id: "tiktok",
    name: "TikTok",
    profileUrl: (u) => `https://www.tiktok.com/@${u}`,
    checkUrl: (u) => `https://www.tiktok.com/@${u}`,
  },
  {
    id: "reddit",
    name: "Reddit",
    profileUrl: (u) => `https://www.reddit.com/u/${u}`,
    checkUrl: (u) => `https://www.reddit.com/user/${u}/about.json`,
  },
  {
    id: "medium",
    name: "Medium",
    profileUrl: (u) => `https://medium.com/@${u}`,
    blocked: true, // blocks server requests
  },
  {
    id: "youtube",
    name: "YouTube",
    profileUrl: (u) => `https://www.youtube.com/@${u}`,
    checkUrl: (u) => `https://www.youtube.com/@${u}`,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    profileUrl: (u) => `https://www.linkedin.com/in/${u}`,
    blocked: true, // requires login
  },
  {
    id: "facebook",
    name: "Facebook",
    profileUrl: (u) => `https://www.facebook.com/${u}`,
    blocked: true, // blocks bots
  },
  {
    id: "discord",
    name: "Discord",
    profileUrl: (u) => `https://discord.gg/${u}`,
    checkUrl: (u) => `https://discord.com/invite/${u}`,
  },
  {
    id: "producthunt",
    name: "Product Hunt",
    profileUrl: (u) => `https://www.producthunt.com/@${u}`,
    checkUrl: (u) => `https://www.producthunt.com/@${u}`,
  },
];

export class SocialProvider
  implements AvailabilityProvider<{ results: SocialPlatformResult[] }>
{
  id = "social" as const;
  label = "Social Media";

  async check(input: ProviderInput) {
    const username = toCompactLower(input.name);

    const results: SocialPlatformResult[] = await Promise.all(
      PLATFORMS.map(async (platform) => {
        const profileUrl = platform.profileUrl(username);
        let status: AvailabilityStatus;

        if (platform.blocked) {
          status = "error"; // cannot check server-side, user must verify manually
        } else {
          const url = platform.checkUrl ? platform.checkUrl(username) : profileUrl;
          status = await checkUrl(url);
        }

        return { id: platform.id, name: platform.name, username, profileUrl, status };
      }),
    );

    const available = results.filter((r) => r.status === "available").length;
    const checked = results.filter((r) => r.status !== "error").length;
    const overallStatus: AvailabilityStatus =
      checked === 0 ? "error"
        : available === checked ? "available"
        : available === 0 ? "taken"
        : "partial";

    return { status: overallStatus, data: { results } };
  }
}
