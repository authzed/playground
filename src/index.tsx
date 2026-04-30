import "@fontsource/roboto/index.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./index.css";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
