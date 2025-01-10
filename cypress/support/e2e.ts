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
import './commands';

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // TODO: Ignore transient network errors until either browser caching
  // or js fixtures are supported
  // https://github.com/cypress-io/cypress/issues/18335
  // https://github.com/cypress-io/cypress/issues/1271
  if (err.message.includes('Uncaught NetworkError')) {
    return false;
  }
});
