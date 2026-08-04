import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// Point @monaco-editor/react's loader at the bundled monaco so useMonaco()
// resolves deterministically in tests instead of fetching from a CDN.
loader.config({ monaco });

// Tearing down an editor mid-lifecycle makes Monaco throw from its own disposal chain —
// "Canceled" from cancelled delayers, "TextModel got disposed before DiffEditorWidget model
// got reset" from the diff editor. Tests that unmount the playground hit these routinely, and
// Vitest fails a run on any unhandled error even when every test passed. Drop the ones that
// originate inside Monaco; everything else still propagates.
const isMonacoTeardownNoise = (value: unknown) => {
  const err = value as { stack?: string; message?: string; name?: string } | undefined;
  if (err?.name === "Canceled" || err?.message === "Canceled") return true;
  return typeof err?.stack === "string" && err.stack.includes("editor.api");
};

window.addEventListener("unhandledrejection", (event) => {
  if (isMonacoTeardownNoise(event.reason)) event.preventDefault();
});

window.addEventListener("error", (event) => {
  if (isMonacoTeardownNoise(event.error)) event.preventDefault();
});

// wasm_exec.js is in index.html for the real app, but Vitest browser mode
// uses its own test page, so we load it manually here.
await new Promise<void>((resolve, reject) => {
  const script = document.createElement("script");
  script.src = "/wasm_exec.js";
  script.onload = () => resolve();
  script.onerror = () => reject(new Error("Failed to load wasm_exec.js"));
  document.head.appendChild(script);
});
