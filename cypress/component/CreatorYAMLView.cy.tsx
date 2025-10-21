import React from 'react';
import CreatorYAMLView from '../../src/components/creator/CreatorYAMLView';

describe('CreatorYAMLView', () => {
  beforeEach(() => {
    cy.mount(<CreatorYAMLView />);
  });

  it('should display placeholder content with proper semantics', () => {
    // Verify the heading is present and uses correct level
    cy.get('h4').contains('Creator Mode (YAML)').should('be.visible');

    // Verify the placeholder message is visible
    cy.contains('The YAML editor will be implemented here.').should('be.visible');

    // Verify an icon is present (visual indicator for empty state)
    cy.get('svg').should('be.visible');
  });
});
