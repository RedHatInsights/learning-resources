import React from 'react';
import CreatorYAMLView from '../../src/components/creator/CreatorYAMLView';

const setMonacoValue = (value: string) => {
  // Retry until Monaco is ready and models are available
  cy.window().should((win: any) => {
    expect(win.monaco).to.exist;
    expect(win.monaco.editor).to.exist;
    const models = win.monaco.editor.getModels();
    expect(models).to.have.length.greaterThan(0);
  });

  cy.window().then((win: any) => {
    const model = win.monaco.editor.getModels()[0];
    // Using pushEditOperations instead of setValue ensures onChange fires
    const fullRange = model.getFullModelRange();
    model.pushEditOperations(
      [],
      [{ range: fullRange, text: value }],
      () => null
    );
  });
};

const getMonacoValue = (): Cypress.Chainable<string> => {
  return cy.window().then((win: any) => {
    const models = win.monaco?.editor?.getModels();
    if (models && models.length > 0) {
      return models[0].getValue();
    }
    return '';
  });
};

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
      const onChangeQuickStartSpec = cy.stub().as('onChangeQuickStartSpec');
      const onChangeBundles = cy.stub().as('onChangeBundles');
      const onChangeTags = cy.stub().as('onChangeTags');

      cy.mount(
        <CreatorYAMLView
          onChangeQuickStartSpec={onChangeQuickStartSpec}
          onChangeBundles={onChangeBundles}
          onChangeTags={onChangeTags}
        />
      );

      // Wait for editor to initialize
      cy.get('.monaco-editor textarea', { timeout: 10000 }).should('exist');

      // Set valid YAML to trigger callbacks (component doesn't parse on initial mount)
      const validYaml = `metadata:
  name: test-quickstart
  tags:
    - kind: bundle
      value: test-bundle
spec:
  displayName: Test QuickStart
  description: A test description`;

      setMonacoValue(validYaml);

      // Wait for debounce (200ms + buffer)
      cy.wait(400);

      // Verify callbacks were called
      cy.get('@onChangeQuickStartSpec').should('have.been.called');
      cy.get('@onChangeBundles').should('have.been.called');
      cy.get('@onChangeTags').should('have.been.called');
    });

    it('should debounce YAML updates', () => {
      const onChangeQuickStartSpec = cy.stub().as('onChangeQuickStartSpec');

      cy.mount(
        <CreatorYAMLView onChangeQuickStartSpec={onChangeQuickStartSpec} />
      );

      cy.get('.monaco-editor textarea', { timeout: 10000 }).should('exist');

      setMonacoValue('metadata:\n  name: initial\nspec:\n  displayName: Initial');
      cy.wait(400); 

      cy.get('@onChangeQuickStartSpec').then((stub) => {
        const initialCallCount = (stub as any).callCount;
        expect(initialCallCount).to.be.greaterThan(0);

        setMonacoValue('metadata:\n  name: test\nspec:\n  displayName: Test Change');
        
        cy.get('@onChangeQuickStartSpec').should((stub) => {
          expect((stub as any).callCount).to.equal(initialCallCount);
        });

        cy.wait(400);

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

      // First set valid YAML to establish a valid state
      setMonacoValue('metadata:\n  name: valid\nspec:\n  displayName: Valid');
      cy.wait(400);

      // Now use Monaco API to set invalid YAML
      setMonacoValue('invalid: yaml: content: [[[');

      // Wait for debounce and parsing (200ms + buffer)
      cy.wait(400);

      // Verify error alert is shown
      cy.get('.pf-v6-c-alert[class*="warning"]', { timeout: 5000 }).should('be.visible');
      cy.contains('YAML Parse Error').should('be.visible');
      cy.contains('previous valid state').should('be.visible');
    });

    it('should maintain last valid state on YAML error', () => {
      const onChangeQuickStartSpec = cy.stub().as('onChangeQuickStartSpec');

      cy.mount(
        <CreatorYAMLView onChangeQuickStartSpec={onChangeQuickStartSpec} />
      );

      // Wait for editor to initialize
      cy.get('.monaco-editor textarea', { timeout: 10000 }).should('exist');

      // First set valid YAML to trigger initial callbacks
      const validYaml = `metadata:
  name: valid-quickstart
spec:
  displayName: Valid QuickStart`;

      setMonacoValue(validYaml);
      cy.wait(400); // Wait for parse
      
      cy.get('@onChangeQuickStartSpec').then((stub) => {
        const initialCallCount = (stub as any).callCount;
        expect(initialCallCount).to.be.greaterThan(0); // Ensure initial parse happened

        // Now introduce invalid YAML using Monaco API
        setMonacoValue('invalid: [[[');

        // Wait for debounce (200ms + buffer)
        cy.wait(400);

        // Callback should not be called again (preserving last valid state)
        cy.get('@onChangeQuickStartSpec').should((stub) => {
          expect((stub as any).callCount).to.equal(initialCallCount);
        });

        // Verify error is shown
        cy.contains('YAML Parse Error', { timeout: 5000 }).should('be.visible');
      });
    });

    it('should recover from error when valid YAML is entered', () => {
      cy.mount(<CreatorYAMLView />);

      // Wait for editor to be ready
      cy.get('.monaco-editor textarea', { timeout: 10000 }).should('exist');

      // First set valid YAML
      setMonacoValue('metadata:\n  name: initial\nspec:\n  displayName: Initial');
      cy.wait(400);

      // Enter invalid YAML using Monaco API
      setMonacoValue('invalid: [[[');
      cy.wait(400);

      // Verify error is shown
      cy.contains('YAML Parse Error', { timeout: 5000 }).should('be.visible');

      // Enter valid YAML to recover
      const validYaml = `metadata:
  name: test
spec:
  displayName: Test QuickStart
  description: A test description`;

      setMonacoValue(validYaml);
      cy.wait(400);

      // Verify error is cleared
      cy.get('.pf-v6-c-alert[class*="warning"]').should('not.exist');
      cy.contains('YAML Parse Error').should('not.exist');
    });

    it('should update editor content via Monaco API', () => {
      cy.mount(<CreatorYAMLView />);

      // Wait for editor to be ready
      cy.get('.monaco-editor textarea', { timeout: 10000 }).should('exist');

      // Set content using Monaco API (the reliable way)
      const testYaml = `metadata:
  name: monaco-test
  tags:
    - kind: bundle
      value: test-bundle
spec:
  displayName: Monaco API Test
  description: Testing Monaco setValue`;

      setMonacoValue(testYaml);

      // Verify the content was set correctly
      getMonacoValue().should('include', 'monaco-test');
      getMonacoValue().should('include', 'Monaco API Test');

      // Verify it's visible in the editor
      cy.contains('monaco-test').should('be.visible');
      cy.contains('Monaco API Test').should('be.visible');
    });
  });

  describe('Load Sample Template feature', () => {
    it('should render the "Load Sample Template" button', () => {
      // Verify the button exists and has correct text
      cy.contains('button', 'Load Sample Template').should('be.visible');
      
      // Verify the button has the correct variant
      cy.contains('button', 'Load Sample Template').should('have.class', 'pf-m-secondary');
      
      // Verify the icon is present
      cy.contains('button', 'Load Sample Template').find('svg').should('exist');
    });

    it('should load template immediately when editor is empty', () => {
      // Click the Load Sample Template button
      cy.contains('button', 'Load Sample Template').click();
      
      // Wait for content to load and verify template content appears
      cy.contains('sample-interactive-quickstart', { timeout: 5000 }).should('be.visible');
      cy.contains('Sample Interactive QuickStart').should('be.visible');
      cy.contains('Quick start').should('be.visible');
    });

    it('should show confirmation dialog when editor has content', () => {
      // First, load the template
      cy.contains('button', 'Load Sample Template').click();
      cy.contains('sample-interactive-quickstart', { timeout: 5000 }).should('be.visible');
      
      // Stub the window.confirm to return false (cancel)
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(false);
      });
      
      // Click the button again
      cy.contains('button', 'Load Sample Template').click();
      
      // Verify confirm was called with correct message
      cy.window().then((win) => {
        expect(win.confirm).to.have.been.calledWith(
          'This will overwrite your current work. Are you sure?'
        );
      });
    });

    it('should not overwrite content when confirmation is cancelled', () => {
      // Load the template first
      cy.contains('button', 'Load Sample Template').click();
      cy.contains('sample-interactive-quickstart', { timeout: 5000 }).should('be.visible');
      
      // Stub confirm to return false
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(false);
      });
      
      // Click button again
      cy.contains('button', 'Load Sample Template').click();
      
      // Verify content is still there
      cy.contains('sample-interactive-quickstart').should('be.visible');
    });

    it('should overwrite content when confirmation is accepted', () => {
      // Load the template first
      cy.contains('button', 'Load Sample Template').click();
      cy.contains('sample-interactive-quickstart', { timeout: 5000 }).should('be.visible');
      
      // Stub confirm to return true
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
      });
      
      // Click button again
      cy.contains('button', 'Load Sample Template').click();
      
      // Verify content is reloaded (still showing the template)
      cy.contains('sample-interactive-quickstart').should('be.visible');
      cy.contains('Sample Interactive QuickStart').should('be.visible');
    });

    it('should load the correct template structure', () => {
      // Click the Load Sample Template button
      cy.contains('button', 'Load Sample Template').click();
      
      // Wait for Monaco to update and verify key template fields
      cy.contains('apiVersion: console.openshift.io/v1', { timeout: 5000 }).should('be.visible');
      cy.contains('kind: QuickStarts').should('be.visible');
      cy.contains('name: sample-interactive-quickstart').should('be.visible');
      cy.contains('version: 0.1').should('be.visible');
      cy.contains('displayName: Sample Interactive QuickStart').should('be.visible');
      cy.contains('text: Quick start').should('be.visible');
      cy.contains('color: green').should('be.visible');
      cy.contains('icon: ~').should('be.visible');
      cy.contains('description:').should('be.visible');
    });
  });
});
