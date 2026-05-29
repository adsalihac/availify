# Availify

[Features](#features) · [Getting Started](#getting-started) · [API Reference](#api-reference) · [Contributing](#contributing)

Availify is an app name availability checker for product teams, indie hackers, and startup founders.

Given a candidate app name, Availify checks the most common launch surfaces and reports availability in seconds:

- Apple App Store
- Google Play Store
- Domain names (com, app, io, dev, co)
- GitHub username and organization handles
- npm package names
- PyPI package names
- Docker Hub image names
- Homebrew formula names
- Crates.io crate names
- RubyGems gem names
- Common bundle identifier patterns
- Social media handles

It also computes an overall availability score, analyzes brand and phonetic quality, proposes deterministic fallback names, and ships developer-friendly copy/export tools.

## Product Overview

Availify helps you validate naming risk before branding or development work gets too far.

## Features

- Multi-platform name checks across app stores, domains, code registries, package ecosystems, and social handles
- Live progress terminal showing each provider as it completes
- Instant variant preview while typing
- Recent searches stored locally for fast retries
- Command palette with search, copy, and export actions
- Availability score with a detailed provider breakdown
- Brand score with naming tips
- Phonetic score to estimate pronounceability
- Deterministic fallback name suggestions when conflicts exist
- Trademark shortcut links for USPTO, EUIPO, and WIPO
- Copy-ready bundle identifiers
- Exportable JSON results
- Developer tools panel with generated `package.json` and `.env` snippets

### Why Availify

Name checks are usually scattered across many tabs and tools. Availify centralizes those checks, so you can evaluate launch viability with one flow.

### Platforms covered

- Apple App Store
- Google Play Store
- GitHub usernames and organizations
- Domains: `.com`, `.app`, `.io`, `.dev`, `.co`
- npm
- PyPI
- Docker Hub
- Homebrew
- Crates.io
- RubyGems
- Bundle ID candidates
- Social media checks for Instagram, X/Twitter, TikTok, Reddit, Medium, YouTube, LinkedIn, Facebook, Discord, and Product Hunt

Some social platforms restrict automated checks server-side. In those cases, Availify surfaces the profile targets so they can be verified manually.

## How It Works

1. Enter a name in the UI.
2. The client submits the request to `POST /api/check`.
3. Provider checks run in parallel across stores, domains, registries, package ecosystems, social handles, and bundle IDs.
4. Results are merged into a unified response with availability score, brand analysis, phonetic analysis, suggestions, and timing.

The API includes in-memory protections:

- Response cache: 10 minutes per normalized name
- Rate limit: 12 requests per minute per client IP

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- TanStack Query
- Framer Motion

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+ (or equivalent package manager)

### Install and run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run start` - Run production server
- `npm run lint` - Run ESLint

## API Reference

### `POST /api/check`

Checks availability across all configured providers.

Request body:

```json
{
	"name": "Availify"
}
```

Success response shape:

```json
{
	"name": "Availify",
	"normalized": "availify",
	"variants": ["availify", "Availify"],
	"score": { "value": 82, "label": "Good Availability" },
	"brandScore": {
		"score": 90,
		"label": "Strong Brand",
		"tips": []
	},
	"phoneticScore": {
		"score": 80,
		"label": "Easy to say"
	},
	"providers": {
		"apple": {},
		"googlePlay": {},
		"domains": {},
		"github": {},
		"bundleIds": {},
		"npm": {},
		"pypi": {},
		"social": {},
		"dockerHub": {},
		"homebrew": {},
		"crates": {},
		"rubygems": {}
	},
	"suggestions": ["AvailifyHQ", "GetAvailify"],
	"timings": { "totalMs": 312 }
}
```

Error responses:

- `400` when input name is invalid
- `429` when rate limit is exceeded (`Retry-After` header is returned)

## Project Structure

```text
src/
	app/
		api/check/route.ts      # availability orchestration endpoint
		page.tsx                # main UI
	components/               # reusable UI blocks
	lib/
		providers/              # provider implementations
		hooks.ts                # utility hooks
		types.ts                # shared data contracts
		utils.ts                # normalization, scoring, naming analysis
```

## Contributing

Contributions are welcome.

### Development flow

1. Fork the repository.
2. Create a feature branch from `main`.
3. Install dependencies and run the app locally.
4. Make focused changes with clear commit messages.
5. Run checks before opening a pull request.

```bash
npm run lint
npm run build
```

### Pull request checklist

- Scope is clear and limited to one change theme.
- README/docs are updated when behavior changes.
- Lint passes locally.
- UI/API behavior is validated manually.

### Contribution ideas

- Add additional provider integrations
- Improve scoring weights and suggestion quality
- Add tests for utilities and route behavior
- Improve accessibility and mobile UX polish

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
