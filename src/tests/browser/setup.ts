import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// Point @monaco-editor/react's loader at the bundled monaco so useMonaco()
// resolves deterministically in tests instead of fetching from a CDN.
loader.config({ monaco });

// wasm_exec.js is in index.html for the real app, but Vitest browser mode
// uses its own test page, so we load it manually here.
await new Promise<void>((resolve, reject) => {
  const script = document.createElement("script");
  script.src = "/wasm_exec.js";
  script.onload = () => resolve();
  script.onerror = () => reject(new Error("Failed to load wasm_exec.js"));
  document.head.appendChild(script);
});
