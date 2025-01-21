import "@fontsource/roboto/index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const container = document.getElementById("root")
if (container) {
createRoot(
    container
).render(
  <React.StrictMode>
    <App withRouter={BrowserRouter} />
  </React.StrictMode>,
);
}
