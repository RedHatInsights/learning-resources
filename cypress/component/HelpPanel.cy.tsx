import React from 'react';
import { FlagProvider, IConfig } from '@unleash/proxy-client-react';
import HelpPanel from '../../src/components/HelpPanel';

const defaultFlags: IConfig['bootstrap'] = [{
      name: 'platform.help-panel.kb',
      enabled: true,
      impressionData: false,
      variant: {name: 'disabled', enabled: false},
    }]

const Wrapper = ({ children, flags = defaultFlags }: { children: React.ReactNode, flags?: IConfig['bootstrap'] }) => (
  <FlagProvider config={{
    appName: 'test-app',
    url: 'https://unleash.example.com/api/',
    clientKey: '123',
    bootstrap: flags
  }}>
    {children}
  </FlagProvider>
);
describe('HelpPanel', () => {
  it('should display basic setup', () => {
    const toggleDrawerSpy = cy.spy();
    cy.mount(
      <Wrapper>
        <HelpPanel toggleDrawer={toggleDrawerSpy} />
      </Wrapper>
    );

    cy.contains('Help').should('be.visible');
    cy.contains('Get started').should('be.visible');
  })

  it('should not display sub tabs hidden by FF', () => {
    const toggleDrawerSpy = cy.spy();
    const disabledFlags = [{
      ...defaultFlags[0],
      enabled: false
    }]
    cy.mount(
      <Wrapper flags={disabledFlags}>
        <HelpPanel toggleDrawer={toggleDrawerSpy} />
      </Wrapper>
    );

    cy.contains('Help').should('be.visible');
    cy.contains('Get started').should('be.visible');
    cy.contains('Knowledge base').should('not.exist');
  })

  it('should call close callback', () => {
    const toggleDrawerSpy = cy.spy();
    cy.mount(
      <Wrapper>
        <HelpPanel toggleDrawer={toggleDrawerSpy} />
      </Wrapper>
    );

    cy.get('[aria-label="Close drawer panel"]').click();
    cy.wrap(toggleDrawerSpy).should('have.been.called');
  })

  it('should switch sub tabs', () => {
    const toggleDrawerSpy = cy.spy();
    cy.mount(
      <Wrapper>
        <HelpPanel toggleDrawer={toggleDrawerSpy} />
      </Wrapper>
    );

    cy.contains('Learn').click();
    cy.get('#help-panel-learn').should('be.visible');

    cy.contains('APIs').click();
    cy.get('#help-panel-api').should('be.visible');
  })

  it('should create new panel tab', () => {
    const toggleDrawerSpy = cy.spy();
    cy.mount(
      <Wrapper>
        <HelpPanel toggleDrawer={toggleDrawerSpy} />
      </Wrapper>
    );

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
    cy.mount(
      <Wrapper>
        <HelpPanel toggleDrawer={toggleDrawerSpy} />
      </Wrapper>
    );


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
    cy.mount(
      <Wrapper>
        <HelpPanel toggleDrawer={toggleDrawerSpy} />
      </Wrapper>
    );

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