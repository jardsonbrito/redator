# Repository Guidelines

## Project Structure & Module Organization
- `src/` React + TypeScript app code.
  - `pages/` route screens; `components/` reusable UI; `hooks/` custom hooks; `integrations/supabase/` API access; `lib/`, `utils/`, `types/` shared helpers and types.
- `public/` static assets served as-is.
- `supabase/migrations/` SQL migrations for schema changes.
- `docs/` product/feature notes and UI references.
- `dist/` production build output (do not edit).

## Build, Run, and Lint
- `npm run dev` — start Vite dev server at `http://localhost:8080`.
- `npm run build` — production build to `dist/`.
- `npm run preview` — serve the built app locally.
- `npm run lint` — run ESLint on TS/TSX.
- Use the `@/` alias for imports from `src` (e.g., `@/components/ui/toaster`).

## Coding Style & Naming Conventions
- TypeScript, 2-space indent; favor explicit types and avoid `any`.
- Components: PascalCase files/exports (e.g., `AdminHeader.tsx`).
- Hooks: camelCase starting with `use` (e.g., `useAuth.tsx`).
- Utilities: camelCase; constants UPPER_SNAKE_CASE; types/interfaces PascalCase.
- Keep quotes consistent with existing files; run `npm run lint` before pushing.

## Testing Guidelines
- No automated test runner is configured yet.
- If adding tests, prefer Vitest + React Testing Library; name files `*.test.ts(x)` beside source or under `__tests__/`.
- Use and update manual flows in root `teste-*.md` files when changing auth, routing, or UI flows.

## Commit & Pull Request Guidelines
- Follow Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:` with concise, present-tense messages.
- PRs include: clear description, linked issues, screenshots/GIFs for UI, and notes on env vars or Supabase migrations.
- Ensure `npm run lint` and `npm run build` pass; no type errors.

## Security & Configuration Tips
- Env: use `.env.local` (Vite loads it). Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`; optional `RESEND_API_KEY`.
- Do not commit real secrets. Provide placeholders in `.env.example`; keep `.env` out of PRs unless updating defaults.
- Prefer `npm` (repo includes `package-lock.json`); avoid mixing Yarn/Bun lockfiles.

## Agent-Specific Instructions
- Keep changes minimal and scoped; follow the directory conventions above.
- Prefer `@` imports over deep relative paths.
- Do not edit existing SQL migrations; add new files under `supabase/migrations/` with a timestamped prefix.

