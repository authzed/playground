/// <reference types="cypress" />

describe('Navigation', () => {
  beforeEach(() => {
    cy.visitPlayground();
    cy.dismissTour();
  })

  it('displays schema tab', () => {
    cy.tab('Schema');
    // Default editor content
    cy.editorText()
      .containsAll([
        'definition user {}',
        'definition resource {',
        '}',
      ]);
    // Sub-menu buttons
    cy.get('button')
      .contains('Format')
      .should('exist');
  });

  it('displays relationships tab', () => {
    cy.tab('Test Relationships');
    // Editor mode buttons
    cy.get('[aria-label="relationship editor view"]')
    // Grid view
    cy.contains('Highlight same types, objects and relations')
    cy.get('[aria-label="code editor"]').click()
    // Text view
    cy.editorText()
      .contains('resource:anotherresource#writer@user:somegal');
  });

  it('displays assertions tab', () => {
    cy.tab('Assertions');
    // Default editor content
    cy.editorText()
      .containsAll([
        'assertTrue',
        'assertFalse',
      ]);
    // Sub-menu buttons
    cy.contains('Validation not run')
      .should('exist');
    cy.get('button')
      .contains('Run')
      .should('exist');
  });

  it('displays expected relations tab', () => {
    cy.tab('Expected Relations');
    // No default editor content
    // Sub-menu buttons    
    cy.contains('Validation not run')
      .should('exist');
    cy.get('button')
      .contains('Run')
      .should('exist');
    cy.get('button')
      .contains('Re-Generate')
      .should('exist');
    cy.get('button')
      .contains('Compute and Diff')
      .should('exist');
  });

  it('displays panels', () => {
    cy.waitForWasm();
    cy.panel('Problems');
    cy.panelText()
      .contains('No problems found');
    cy.panel('Check Watches');
    cy.panelText()
      .find('table.MuiTable-root');
    cy.panel('System Visualization')
    cy.panelText()
      .find('div.vis-network');
    cy.panel('Last Validation Run');
    cy.panelText()
      .contains('Validation Not Run');
  });
});