/// <reference types="cypress" />

describe("Playground", () => {
  beforeEach(() => {
    cy.visitPlayground();
  });

  it("displays tutorial", () => {
    cy.get(".react-joyride__tooltip")
      .contains("Welcome!")
      .should("have.length", 1);
  });

  it("can dismiss tutorial", () => {
    cy.contains("Skip").click();
    cy.reload();
    cy.contains("Welcome!").should("not.exist");
  });

  it("displays header buttons", () => {
    cy.dismissTour();
    cy.get("a").contains("Discuss on Discord").should("exist");
    cy.get("header > button").contains("Select Example Schema").should("exist");
    cy.get("header > button").contains("Share").should("exist");
    cy.get("header > button").contains("Download").should("exist");
    cy.get("header > button").contains("Load From File").should("exist");
    cy.contains("Sign In To Import").should("exist");
  });

  it("default validation succeeds", () => {
    cy.dismissTour();
    cy.waitForWasm();
    cy.tab("Assertions");
    cy.get("button").contains("Run").click();
    cy.contains("Validated!").should("exist");
  });
});
