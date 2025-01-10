import "@fontsource/roboto";
import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.render(
  <React.StrictMode>
    <App withRouter={BrowserRouter} />
  </React.StrictMode>,
  document.getElementById("root")
);
