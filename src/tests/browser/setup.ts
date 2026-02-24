// Load wasm_exec.js (sets up window.Go, required for WASM services)
await new Promise<void>((resolve, reject) => {
  const script = document.createElement("script");
  script.src = "/wasm_exec.js";
  script.onload = () => resolve();
  script.onerror = reject;
  document.head.appendChild(script);
});

// Suppress transient network errors (mirrors Cypress uncaught:exception handler)
window.addEventListener("unhandledrejection", (event) => {
  if (
    event.reason?.message?.includes("NetworkError") ||
    event.reason?.message?.includes("Failed to fetch")
  ) {
    event.preventDefault();
  }
});
