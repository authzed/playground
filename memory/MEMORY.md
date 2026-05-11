# Playground Project Memory

## Project Overview

- SpiceDB Playground React app at `/home/tstirrat/authzed/playground`
- Stack: React 19, TypeScript, Vite 8, TanStack Router, Monaco Editor, Radix UI, Vitest 4

## Key Files

- `vite.config.ts` — Vite build config (includes `dev-share-api` server plugin, do NOT include this in test configs)
- `vitest.config.ts` — Single vitest config with `test.projects` for unit + browser
- `src/tests/browser/` — Browser (E2E-style) tests using Vitest browser mode
- `src/tests/browser/helpers.tsx` — `mountPlayground`, `clickTab`, `clickPanel`, `waitForWasm`
- `src/tests/browser/setup.ts` — Loads wasm_exec.js before browser tests

## Test Setup

- Unit tests: `yarn test` (`vitest --project unit`, node/jsdom per-file pragma, 85 tests)
- Browser tests: `yarn test:browser` (`vitest --project browser`, Playwright/Chromium)
- Cypress has been fully removed

## Browser Test Architecture

- `mountPlayground()` renders a `TestApp` component (in helpers.tsx) that wraps `FullPlayground` with all required providers and a memory-history TanStack Router pointed at `/`
- Uses memory history because Vitest browser mode has its own page URL that won't match app routes
- `wasm_exec.js` is loaded in `setup.ts` (it's in `public/` but not loaded by Vitest's test page, unlike the real `index.html`)

## Vitest 4.x Patterns (current)

- Do NOT use `as any` on plugins — was a Vitest 2.x workaround, not needed in 4.x
- `test.projects` inline configs need a `test:` wrapper: `{ test: { name: "unit", ... } }`
- `expect` from `vitest`, `page` from `vitest/browser`
- `render()` and `renderHook()` from `vitest-browser-react` return Promises — always `await`
- Use semantic locators: `page.getByRole()`, `page.getByText()` etc. (no `page.locator()` in 4.x)
- `expect.element(locator, { timeout })` — timeout goes on `expect.element()`, not the matcher

## Key UI Details (for writing browser tests)

- Tab roles: `role="tab"`, labels: "Schema", "Relationships", "Assertions", "Expected Relations", "Visualizer"
- Drawer panels: "Problems", "Check Watches", `zed` terminal (no System Visualization or Last Validation Run — removed)
- Validation button shows "Validated!" or "Validation not run"
- WASM gate: `window.runSpiceDBDeveloperRequest` set when WASM is ready
