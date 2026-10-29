# ArtisanConnect Marketplace

ArtisanConnect helps customers discover skilled makers, browse their work, and commission custom pieces through a warm, seller-style marketplace experience.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/artisanconnect/src/pages/` — marketplace home, browse, storefront, requests, dashboard, and artisan profile editor
- `artifacts/artisanconnect/src/components/` — shared shell, search, maker cards, and media preview components
- `artifacts/api-server/src/routes/marketplace.ts` — marketplace API routes and seeded development data
- `lib/api-spec/openapi.yaml` — source of truth for marketplace and upload contracts
- `artifacts/artisanconnect/src/index.css` — shared visual theme and motion utilities

## Architecture decisions

- The first build uses the generated OpenAPI client hooks end to end so the UI surface is contract-driven.
- Marketplace screens use seeded development data so the preview is useful immediately rather than empty.
- Portfolio uploads support image and video selection with client previews and an API upload flow; media URLs are normalized through the API storage path.
- The app stays role-light for the first build: dashboard role switching is a product preview affordance rather than a full authentication wall.

## Product

- Search and browse artisans by craft, region, category, and sort order.
- View seller-style artisan storefronts with ratings, trust signals, stats, and image/video portfolio work.
- Save makers locally in the UI, share artisan profiles, and start a commission request.
- Browse and create customer requests with budgets, deadlines, locations, and proposal counts.
- Review activity history and switch between customer and artisan dashboard views.
- Edit an artisan profile and add portfolio work using image/video file selection and live previews.

## User preferences

- The user wants an eye-catching, interactive marketplace interface inspired by major commerce products, not a plain CRUD dashboard.
- The user specifically cares about working video previews after upload.

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen`.
- The frontend and API are separate managed workflows; restart both after contract or route changes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
