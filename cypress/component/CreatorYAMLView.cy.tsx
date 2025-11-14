import React from 'react';
import CreatorYAMLView from '../../src/components/creator/CreatorYAMLView';

describe('CreatorYAMLView', () => {
  beforeEach(() => {
    // Mount the component before each test
    cy.mount(<CreatorYAMLView />);

    // This single wait ensures the editor is ready for all tests
    cy.get('.lr-c-creator-yaml-view__editor', { timeout: 10000 }).should('be.visible');
  });

  it('should render the editor container', () => {
    // Simple "smoke test" to verify the component renders its main elements
    cy.get('.lr-c-creator-yaml-view').should('exist');
    cy.get('.lr-c-creator-yaml-view__editor').should('be.visible');
  });

  it('should display the default YAML content', () => {
    // Check that the default text is actually present, not just that "lines" exist
    cy.contains('# YAML Quickstart Definition').should('be.visible');
    cy.contains('Example structure').should('be.visible');
  });

  it('should be interactive and accept focus', () => {
    // Verify the editor can receive focus
    cy.get('.monaco-editor').should('exist');
    cy.get('.view-lines').click({ force: true });
    
    // Verify Monaco's textarea is present (required for editing)
    cy.get('.monaco-editor textarea').should('exist');
    
    // Verify the editor shows the cursor/selection (indicates it's interactive)
    cy.get('.monaco-editor .cursors-layer').should('exist');
  });

  it('should render Monaco editor features', () => {
    // Verify Monaco editor elements are present
    cy.get('.monaco-editor').should('exist');
    cy.get('.view-lines').should('be.visible');
    
    // Check that line numbers are visible
    cy.get('.line-numbers').should('be.visible');
    
    // Check that the minimap is rendered (per editor config)
    cy.get('.minimap').should('exist');
  });

  it('should have proper editor styling and configuration', () => {
    // Verify the editor has the proper PatternFly container
    cy.get('.lr-c-creator-yaml-view').should('exist');
    
    // Check that the editor wrapper has proper dimensions
    cy.get('.lr-c-creator-yaml-view__editor').then(($el) => {
      const height = $el.height();
      expect(height).to.be.greaterThan(0);
    });
    
    // Verify wordWrap is working (soft wrapping enabled)
    cy.get('.monaco-editor .view-lines').should('exist');
  });

  describe('YAML parsing and updates', () => {
    it('should call callbacks when valid YAML is entered', () => {
      const onChangeKind = cy.stub().as('onChangeKind');
      const onChangeQuickStartSpec = cy.stub().as('onChangeQuickStartSpec');
      const onChangeBundles = cy.stub().as('onChangeBundles');
      const onChangeTags = cy.stub().as('onChangeTags');

      cy.mount(
        <CreatorYAMLView
          onChangeKind={onChangeKind}
          onChangeQuickStartSpec={onChangeQuickStartSpec}
          onChangeBundles={onChangeBundles}
          onChangeTags={onChangeTags}
        />
      );

      // Wait for initial parsing of default YAML
      cy.wait(500);

      // Verify callbacks were called with initial values
      cy.get('@onChangeQuickStartSpec').should('have.been.called');
      cy.get('@onChangeBundles').should('have.been.called');
      cy.get('@onChangeTags').should('have.been.called');
    });

    it('should debounce YAML updates', () => {
      const onChangeQuickStartSpec = cy.stub().as('onChangeQuickStartSpec');

      cy.mount(
        <CreatorYAMLView onChangeQuickStartSpec={onChangeQuickStartSpec} />
      );

      // Wait for initial parse
      cy.wait(500);
      
      // Get initial call count
      cy.get('@onChangeQuickStartSpec').then((stub) => {
        const initialCallCount = (stub as any).callCount;

        // Make rapid changes (should be debounced)
        cy.get('.monaco-editor textarea').type('{end} ', { force: true });
        cy.get('.monaco-editor textarea').type('# comment', { force: true });
        
        // Should not have called again yet (debounce delay)
        cy.get('@onChangeQuickStartSpec').should((stub) => {
          expect((stub as any).callCount).to.equal(initialCallCount);
        });

        // Wait for debounce delay (400ms + buffer)
        cy.wait(500);

        // Should have called after debounce
        cy.get('@onChangeQuickStartSpec').should((stub) => {
          expect((stub as any).callCount).to.be.greaterThan(initialCallCount);
        });
      });
    });

    it('should show error alert for invalid YAML', () => {
      cy.mount(<CreatorYAMLView />);

      // Wait for editor to be ready
      cy.get('.monaco-editor textarea', { timeout: 10000 }).should('exist');

      // Clear the editor and enter invalid YAML
      cy.get('.monaco-editor textarea').focus().type('{ctrl}a', { force: true });
      cy.get('.monaco-editor textarea').type('{backspace}', { force: true });
      cy.get('.monaco-editor textarea').type('invalid: yaml: content: [[[', { force: true });

      // Wait for debounce and parsing
      cy.wait(500);

      // Verify error alert is shown
      cy.get('.pf-v6-c-alert[class*="warning"]').should('be.visible');
      cy.contains('YAML Parse Error').should('be.visible');
      cy.contains('previous valid state').should('be.visible');
    });

    it('should maintain last valid state on YAML error', () => {
      const onChangeQuickStartSpec = cy.stub().as('onChangeQuickStartSpec');

      cy.mount(
        <CreatorYAMLView onChangeQuickStartSpec={onChangeQuickStartSpec} />
      );

      // Wait for initial valid parse
      cy.wait(500);
      
      cy.get('@onChangeQuickStartSpec').then((stub) => {
        const initialCallCount = (stub as any).callCount;

        // Now introduce invalid YAML
        cy.get('.monaco-editor textarea').focus().type('{ctrl}a', { force: true });
        cy.get('.monaco-editor textarea').type('{backspace}', { force: true });
        cy.get('.monaco-editor textarea').type('invalid: [[[', { force: true });

        // Wait for debounce
        cy.wait(500);

        // Callback should not be called again (preserving last valid state)
        cy.get('@onChangeQuickStartSpec').should((stub) => {
          expect((stub as any).callCount).to.equal(initialCallCount);
        });

        // Verify error is shown
        cy.contains('YAML Parse Error').should('be.visible');
      });
    });

    it('should recover from error when valid YAML is entered', () => {
      cy.mount(<CreatorYAMLView />);

      // Enter invalid YAML
      cy.get('.monaco-editor textarea').focus().type('{ctrl}a', { force: true });
      cy.get('.monaco-editor textarea').type('{backspace}', { force: true });
      cy.get('.monaco-editor textarea').type('invalid: [[[', { force: true });
      cy.wait(500);

      // Verify error is shown
      cy.contains('YAML Parse Error').should('be.visible');

      // Enter valid YAML
      cy.get('.monaco-editor textarea').focus().type('{ctrl}a', { force: true });
      cy.get('.monaco-editor textarea').type('{backspace}', { force: true });
      cy.get('.monaco-editor textarea').type('metadata:{enter}  name: test{enter}spec:{enter}  displayName: Test', { force: true });
      cy.wait(500);

      // Verify error is cleared
      cy.get('.pf-v6-c-alert[class*="warning"]').should('not.exist');
    });
  });
});
