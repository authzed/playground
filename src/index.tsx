import "@fontsource/roboto/index.css";
import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// TODO: use React.createRoot
ReactDOM.render(
  <React.StrictMode>
    <App withRouter={BrowserRouter} />
  </React.StrictMode>,
  document.getElementById("root")
);
