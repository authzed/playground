// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";

// Handle uncaught exceptions
Cypress.on("uncaught:exception", (err: { msg: string }) => {
  // https://github.com/suren-atoyan/monaco-react/issues/440
  if (err.msg.includes("operation is manually canceled")) {
    return false; // Prevents Cypress from failing the test
  }
});
