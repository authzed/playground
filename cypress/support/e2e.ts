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
Cypress.on("uncaught:exception", (err: Error) => {
  // https://github.com/suren-atoyan/monaco-react/issues/440
  // if (err.message.includes("operation is manually canceled")) {
  //   return false; // Prevents Cypress from failing the test
  // }
  //   // https://github.com/cypress-io/cypress/issues/28400
  //   if (err.message.match(`Uncaught NetworkError: Failed to execute 'importScripts' on 'WorkerGlobalScope'`)) {
  //       return false;
  //   }
    return true; // Let other exceptions fail the test
});
