import React from 'react';
import { FlagProvider, IConfig } from '@unleash/proxy-client-react';
import * as chrome from '@redhat-cloud-services/frontend-components/useChrome';
import HelpPanel from '../../src/components/HelpPanel';

const defaultFlags: IConfig['bootstrap'] = [{
      name: 'platform.chrome.help-panel_knowledge-base',
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
    cy.stub(chrome, 'useChrome').returns({
      getBundleData: () => ({
        bundleId: 'rhel',
        bundleTitle: 'RHEL',
      }),
    } as any);
    cy.mount(
      <Wrapper>
        <HelpPanel toggleDrawer={toggleDrawerSpy} />
      </Wrapper>
    );

    cy.contains('Learn').click();
    // Wait for the learn panel to load and check for the description text
    cy.contains('Find product documentation, quick starts, learning paths, and more', { timeout: 10000 }).should('be.visible');
    
    cy.contains('APIs').click();
    cy.contains('API Documentation').should('be.visible');
  })

  it('should display API panel features', () => {
    const toggleDrawerSpy = cy.spy();
    
    cy.intercept('GET', '/api/chrome-service/v1/static/api-specs-generated.json', {
      statusCode: 200,
      body: [
        {
          bundleLabels: ['rhel', 'ansible'],
          frontendName: 'Provisioning API',
          url: 'https://developers.redhat.com/api-catalog/provisioning',
        },
        {
          bundleLabels: ['openshift'],
          frontendName: 'Cost Management API',
          url: 'https://developers.redhat.com/api-catalog/cost-management',
        },
        {
          bundleLabels: ['rhel', 'settings'],
          frontendName: 'User Access API',
          url: 'https://developers.redhat.com/api-catalog/user-access',
        },
      ],
    });

    cy.intercept('GET', '/api/chrome-service/v1/static/bundles-generated.json', {
      statusCode: 200,
      body: [
        { id: 'rhel', title: 'RHEL', navItems: [] },
        { id: 'ansible', title: 'Ansible', navItems: [] },
        { id: 'openshift', title: 'OpenShift', navItems: [] },
        { id: 'settings', title: 'Settings', navItems: [] },
      ],
    });

    cy.stub(chrome, 'useChrome').returns({
      getBundleData: () => ({
        bundleId: 'rhel',
        bundleTitle: 'RHEL',
      }),
      getAvailableBundles: () => [{ id: 'rhel', title: 'RHEL' }],
    } as any);

    cy.mount(
      <Wrapper>
        <HelpPanel toggleDrawer={toggleDrawerSpy} />
      </Wrapper>
    );

    cy.contains('APIs').click();
    cy.contains('API Documentation').should('be.visible');

    cy.contains('API Documentation (3)', { timeout: 10000 }).should('be.visible');
    cy.contains('Provisioning API').should('be.visible');
    cy.contains('Cost Management API').should('be.visible');
    cy.contains('User Access API').should('be.visible');

    cy.contains('RHEL').should('be.visible');
    cy.contains('Ansible').should('be.visible');
    cy.contains('OpenShift').should('be.visible');
    cy.contains('Settings').should('be.visible');

    // Check external link
    cy.contains('API Documentation Catalog')
      .should('have.attr', 'href', 'https://developers.redhat.com/api-catalog/')
      .should('have.attr', 'target', '_blank');
  });

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

  it('should display learn panel features', () => {
    const toggleDrawerSpy = cy.spy();
    cy.mount(
      <Wrapper>
        <HelpPanel toggleDrawer={toggleDrawerSpy} />
      </Wrapper>
    );

    cy.get('[aria-label="Add tab"]').click();

    cy.contains('Learn').click();
    // Wait for the learn panel to load completely
    cy.contains('Find product documentation, quick starts, learning paths, and more', { timeout: 10000 }).should('be.visible');
    cy.contains('All Learning Catalog').should('be.visible');
    
    // Check for text content that should be visible after loading
    cy.contains('Content type').should('be.visible');
    cy.contains('Show bookmarked only').should('be.visible');
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
