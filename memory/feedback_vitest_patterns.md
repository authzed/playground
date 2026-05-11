---
name: Vitest browser mode patterns (current)
description: Correct patterns for Vitest 4.x browser mode with Playwright in this project
type: feedback
---

Do NOT use `as any` on the plugins array in vitest configs — that was a Vitest 2.x workaround for internal Vite version conflicts, not needed in 4.x.

**Why:** In Vitest 4.x with consistent Vite plugin versions, there are no type conflicts.

**How to apply:** Write `plugins: [react(), svgr(), tailwindcss()]` without any cast.

---

Use a single `vitest.config.ts` with `test.projects` for unit and browser projects — no separate `vitest.config.browser.ts`.

**Why:** The user prefers not specifying `--config` on every invocation. `test.projects` with inline configs (using a `test:` wrapper per project) handles both in one file.

**How to apply:** `test.projects: [{ test: { name: "unit", ... } }, { test: { name: "browser", browser: { ... } } }]`

---

In Vitest browser mode, `expect` is from `vitest`, not `vitest/browser`. `page` is from `vitest/browser`.

---

`render()` and `renderHook()` from `vitest-browser-react` return Promises — always `await` them.

---

The `CSSLocatorImpl` pattern from memory was a Vitest 2.x workaround. In 4.x, use semantic locators (`page.getByRole`, `page.getByText`, etc.) from `vitest/browser`.
