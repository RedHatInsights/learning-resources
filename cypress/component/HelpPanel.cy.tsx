import React from 'react';
import HelpPanel from '../../src/components/HelpPanel';

describe('HelpPanel', () => {
  it('should display basic setup', () => {
    const toggleDrawerSpy = cy.spy();
    cy.mount(<HelpPanel toggleDrawer={toggleDrawerSpy} />);

    cy.contains('Help').should('be.visible');
    cy.contains('Get started').should('be.visible');
  })

  it('should call close callback', () => {
    const toggleDrawerSpy = cy.spy();
    cy.mount(<HelpPanel toggleDrawer={toggleDrawerSpy} />);

    cy.get('[aria-label="Close drawer panel"]').click();
    cy.wrap(toggleDrawerSpy).should('have.been.called');
  })

  it('should switch sub tabs', () => {
    const toggleDrawerSpy = cy.spy();
    cy.mount(<HelpPanel toggleDrawer={toggleDrawerSpy} />);

    cy.contains('Learn').click();
    cy.get('#help-panel-learn').should('be.visible');

    cy.contains('APIs').click();
    cy.get('#help-panel-api').should('be.visible');
  })

  it('should create new panel tab', () => {
    const toggleDrawerSpy = cy.spy();
    cy.mount(<HelpPanel toggleDrawer={toggleDrawerSpy} />);

    cy.get('.lr-c-help-panel-custom-tabs').within(() => {
      cy.get('.pf-v6-c-tabs__item').should('have.length', 1)
    });

    cy.get('[aria-label="Add tab"]').click();

    cy.get('.lr-c-help-panel-custom-tabs').within(() => {
      cy.get('.pf-v6-c-tabs__item').should('have.length', 2)
    });
  })

  it('should change title and category of tab', () => {
    const toggleDrawerSpy = cy.spy();
    cy.mount(<HelpPanel toggleDrawer={toggleDrawerSpy} />);


    cy.get('[aria-label="Add tab"]').click();

    cy.contains('Learn').click();
    cy.get('#help-panel-learn').should('be.visible');
    cy.get('#help-panel-learn').type('New title');
    cy.wait(2001);
    cy.get('.lr-c-help-panel-custom-tabs').within(() => {
      cy.contains('New title').should('be.visible');
    });
  })

  it('should close tab', () => {
    const toggleDrawerSpy = cy.spy();
    cy.mount(<HelpPanel toggleDrawer={toggleDrawerSpy} />);

    cy.get('[aria-label="Add tab"]').click();

    cy.get('.lr-c-help-panel-custom-tabs').within(() => {
      cy.get('.pf-v6-c-tabs__item').should('have.length', 2)
    });

    cy.get('.lr-c-help-panel-custom-tabs').within(() => {
      cy.get('[aria-label="Close tab"]').last().click();
    });

    cy.get('.lr-c-help-panel-custom-tabs').within(() => {
      cy.get('.pf-v6-c-tabs__item').should('have.length', 1)
    });

    cy.get('#help-panel-search').should('be.visible');
  })
});