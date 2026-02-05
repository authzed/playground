import { defineConfig } from "cypress";

export default defineConfig({
  retries: 1,
  defaultCommandTimeout: 10000,
  requestTimeout: 11000,
  responseTimeout: 60000,
  viewportHeight: 768,
  viewportWidth: 1400,
  chromeWebSecurity: false,

  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: ["cypress/integration/**/*.spec.{js,ts}", "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}"],
  },
});
