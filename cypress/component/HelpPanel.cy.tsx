import React, { useEffect, useRef, useState } from 'react';
import { FlagProvider, IConfig } from '@unleash/proxy-client-react';
import { IntlProvider } from 'react-intl';
import * as chrome from '@redhat-cloud-services/frontend-components/useChrome';
import HelpPanel from '../../src/components/HelpPanel';
import ScalprumProvider from '@scalprum/react-core';
import { initialize, removeScalprum } from '@scalprum/core';
import messages from '../../src/Messages';

const defaultFlags: IConfig['bootstrap'] = [{
      name: 'platform.chrome.help-panel_knowledge-base',
      enabled: true,
      impressionData: false,
      variant: {name: 'disabled', enabled: false},
    }, {
      name: 'platform.chrome.help-panel_search',
      enabled: true,
      impressionData: false,
      variant: {name: 'disabled', enabled: false},
    }]

// Helper function to get message text for testing
const getMessageText = (messageKey: keyof typeof messages): string => {
  return messages[messageKey].defaultMessage;
};

const Wrapper = ({ children, flags = defaultFlags }: { children: React.ReactNode, flags?: IConfig['bootstrap'] }) => {
  const [isReady, setIsReady] = useState(false);
  const scalprum = useRef(
    initialize({
      appsConfig: {
        virtualAssistant: {
          name: 'virtualAssistant',
          manifestLocation: '/foo/bar.json',
        },
      },
    })
  );

  useEffect(() => {
    // mock the module
    scalprum.current.exposedModules['virtualAssistant#state/globalState'] = {
      default: {foo: 'bar'},
      useVirtualAssistant: () => ([]),
      Models: {}
    };

    setIsReady(true);
    return () => {
      removeScalprum();
    };
  }, []);

  if (!isReady) {
    return null;
  }
  return (
    <IntlProvider locale="en" defaultLocale="en">
      <ScalprumProvider scalprum={scalprum.current}>
        <FlagProvider config={{
          appName: 'test-app',
          url: 'https://unleash.example.com/api/',
          clientKey: '123',
          bootstrap: flags
        }}>
          {children}
        </FlagProvider>
      </ScalprumProvider>
    </IntlProvider>
  );
}

describe('HelpPanel', () => {
  it('should display basic setup', () => {
    const toggleDrawerSpy = cy.spy();
    cy.mount(
      <Wrapper>
        <HelpPanel toggleDrawer={toggleDrawerSpy} />
      </Wrapper>
    );

    cy.contains('Help').should('be.visible');
    cy.contains('Find help').should('be.visible');
    // Should default to Learn tab
    cy.contains(getMessageText('learnPanelDescription'), { timeout: 10000 }).should('be.visible');
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
    cy.contains('Find help').should('be.visible');
    cy.contains(getMessageText('knowledgeBaseTitle')).should('not.exist');
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
    cy.contains(getMessageText('learnPanelDescription'), { timeout: 10000 }).should('be.visible');

    cy.contains('APIs').click();
    cy.contains(getMessageText('apiDocumentationCountLabel')).should('be.visible');
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
    cy.contains(getMessageText('apiDocumentationCountLabel')).should('be.visible');

    cy.contains(`${getMessageText('apiDocumentationCountLabel')} (3)`, { timeout: 10000 }).should('be.visible');
    cy.contains('Provisioning API').should('be.visible');
    cy.contains('Cost Management API').should('be.visible');
    cy.contains('User Access API').should('be.visible');

    cy.contains('RHEL').should('be.visible');
    cy.contains('Ansible').should('be.visible');
    cy.contains('OpenShift').should('be.visible');
    cy.contains('Settings').should('be.visible');

    // Check external link
    cy.contains(getMessageText('apiDocumentationCatalogLinkText'))
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

    // Force click the Learn tab since it's visually there but Cypress thinks it's hidden
    cy.contains('Learn').click({ force: true });

    // Wait for the learn panel to load completely
    cy.contains(getMessageText('learnPanelDescription'), { timeout: 10000 }).should('be.visible');
    cy.contains(getMessageText('allLearningCatalogLinkText')).should('be.visible');

    // Check for text content that should be visible after loading
    cy.contains(getMessageText('contentTypeLabel')).should('be.visible');
    cy.contains(getMessageText('showBookmarkedOnlyLabel')).should('be.visible');
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

    // Should show Learn panel content after closing the extra tab
    cy.contains(getMessageText('learnPanelDescription')).should('be.visible');
  })

  it('should change tab title when switching sub-tabs', () => {
    const toggleDrawerSpy = cy.spy();
    cy.mount(
      <Wrapper>
        <HelpPanel toggleDrawer={toggleDrawerSpy} />
      </Wrapper>
    );
    cy.contains('Find help').should('be.visible');
    cy.contains(getMessageText('knowledgeBaseTitle')).click();

    cy.get('.lr-c-help-panel-custom-tabs').within(() => {
      cy.get('.pf-v6-c-tabs__item').first().should('contain.text', getMessageText('knowledgeBaseTitle'));
    });
  });

  it('should create new tab and maintain focus when closing different tab', () => {
    const toggleDrawerSpy = cy.spy();
    cy.mount(
      <Wrapper>
        <HelpPanel toggleDrawer={toggleDrawerSpy} />
      </Wrapper>
    );

    cy.get('[aria-label="Add tab"]').click();
    cy.get('[aria-label="Add tab"]').click();

    cy.get('.lr-c-help-panel-custom-tabs').within(() => {
      cy.get('.pf-v6-c-tabs__item').should('have.length', 3);
    });

    cy.get('.lr-c-help-panel-custom-tabs').within(() => {
      cy.get('.pf-v6-c-tabs__item').last().click();
    });

    cy.get('.lr-c-help-panel-custom-tabs').within(() => {
      cy.get('.pf-v6-c-tabs__item').eq(1).within(() => {
        cy.get('[aria-label="Close tab"]').click();
      });
    });

    cy.get('.lr-c-help-panel-custom-tabs').within(() => {
      cy.get('.pf-v6-c-tabs__item').should('have.length', 2);
    });
  });

  it('should display search tab when feature flag is enabled', () => {
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

    cy.get('[data-ouia-component-id="help-panel-subtab-search"]').should('be.visible');
  });

  it('should not display search tab when feature flag is disabled', () => {
    const toggleDrawerSpy = cy.spy();
    const disabledFlags = [
      {
        name: 'platform.chrome.help-panel_knowledge-base',
        enabled: true,
        impressionData: false,
        variant: { name: 'disabled', enabled: false },
      },
      {
        name: 'platform.chrome.help-panel_search',
        enabled: false,
        impressionData: false,
        variant: { name: 'disabled', enabled: false },
      },
    ];

    cy.stub(chrome, 'useChrome').returns({
      getBundleData: () => ({
        bundleId: 'rhel',
        bundleTitle: 'RHEL',
      }),
    } as any);

    cy.mount(
      <Wrapper flags={disabledFlags}>
        <HelpPanel toggleDrawer={toggleDrawerSpy} />
      </Wrapper>
    );

    cy.get('[data-ouia-component-id="help-panel-subtab-search"]').should('not.exist');
  });

  it('should verify search tab accessibility and interactions', () => {
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

    cy.get('[data-ouia-component-id="help-panel-subtab-search"]').should('be.visible');
    cy.get('[data-ouia-component-id="help-panel-subtab-search"]')
      .should('have.attr', 'role', 'tab')
      .should('have.attr', 'aria-selected');

    cy.contains('Learn').click({ force: true });
    cy.contains(getMessageText('learnPanelDescription'), { timeout: 10000 }).should('be.visible');

    cy.get('[data-ouia-component-id="help-panel-subtab-search"]').should('be.visible');
  });

  it('should click search tab and see search panel description', () => {
    const toggleDrawerSpy = cy.spy();
    cy.stub(chrome, 'useChrome').returns({
      getBundleData: () => ({
        bundleId: 'rhel',
        bundleTitle: 'RHEL',
      }),
    } as any);

    cy.intercept('GET', '/api/learning-resources/v1/quickstarts*', {
      statusCode: 200,
      body: [],
    });

    cy.intercept('GET', '/api/chrome-service/v1/static/api-specs-generated.json', {
      statusCode: 200,
      body: [],
    });

    cy.intercept('GET', '/api/chrome-service/v1/static/bundles-generated.json', {
      statusCode: 200,
      body: [],
    });

    cy.mount(
      <Wrapper>
        <HelpPanel toggleDrawer={toggleDrawerSpy} />
      </Wrapper>
    );

    cy.get('[data-ouia-component-id="help-panel-subtab-search"]').should('be.visible');

    cy.get('[data-ouia-component-id="help-panel-subtab-search"]').click();

    cy.contains(getMessageText('searchPanelDescription')).should('be.visible');
  });

});
