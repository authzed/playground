import { defineConfig } from "cypress";

export default defineConfig({
  retries: 0,
  pageLoadTimeout: 120000, // 120 seconds
  defaultCommandTimeout: 10000, // 10 seconds
  requestTimeout: 11000, // 11 seconds
  responseTimeout: 60000, // 60 seconds
  viewportHeight: 768,
  viewportWidth: 1400,
  chromeWebSecurity: false,
  video: true,
  screenshotOnRunFailure: true,

  e2e: {
    baseUrl: "http://localhost:5173",
    specPattern: ["cypress/integration/**/*.spec.{js,ts}", "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}"],
  },
});
