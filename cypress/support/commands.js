import "cypress-wait-until";

// -- Parent commands --
// Navigate to the playground URL.
Cypress.Commands.add("visitPlayground", () => {
  cy.visit("/");
});

// Dismiss the tour elements if displayed.
Cypress.Commands.add("dismissTour", () => {
  cy.contains("Skip").click();
  cy.getCookie("dismiss-tour").then((val) => {
    if (!val) {
      cy.contains("Skip").click();
    }
  });
});

// Activate the tab with the given label.
Cypress.Commands.add("tab", (tabLabel) => {
  cy.get("div[aria-label=Tabs]").contains(tabLabel).click();
});

// Activate the panel with the given label.
Cypress.Commands.add("panel", (panelLabel) => {
  cy.get("button").contains(panelLabel).click();
});

// Get the text contents of the editor component.
Cypress.Commands.add("editorText", () => {
  return cy.get(".monaco-editor");
});

// Get the text contents of the panel component.
Cypress.Commands.add("panelText", () => {
  return cy.get("div[role=tabpanel] > div");
});

// Wait until WASM developer package is loaded
Cypress.Commands.add("waitForWasm", () => {
  cy.waitUntil(() => cy.window().then((win) => !!win.runSpiceDBDeveloperRequest), {
    errorMsg: "WASM development package not loaded",
    timeout: 30000,
    interval: 500,
  });
  return;
});

// -- Child commands --
// Asserts that all list items are present.
Cypress.Commands.add("containsAll", { prevSubject: "element" }, (subject, list) => {
  list.forEach((line) => {
    cy.wrap(subject).contains(line);
  });
});

//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
