# Availify

Availify is an app name availability checker for product teams, indie hackers, and startup founders.

Given a candidate app name, Availify checks the most common launch surfaces and reports availability in seconds:

- Apple App Store
- Google Play Store
- Domain names (com, app, io, dev, co)
- GitHub username and organization handles
- Common bundle identifier patterns

It also computes an overall availability score, proposes deterministic fallback names, and lets you copy or export results.

## Product Overview

Availify helps you validate naming risk before branding or development work gets too far.

### What you get

- Fast multi-provider checks from one input
- Normalized name variants and preview suggestions
- Availability score with quality label
- Suggested alternative names when conflicts exist
- Copy-ready bundle identifiers
- JSON export of full availability report
- Recent searches and command palette actions

### Why Availify

Name checks are usually scattered across many tabs and tools. Availify centralizes those checks, so you can evaluate launch viability with one flow.

## How It Works

1. Enter a name in the UI.
2. The client submits the request to `POST /api/check`.
3. Provider checks run in parallel for stores, domains, GitHub, and bundle IDs.
4. Results are merged into a unified response with score, suggestions, and timing.

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
	"providers": {},
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
		utils.ts                # normalization, scoring, suggestions
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

No license file is currently included. Add one before distributing or using this project in production.
