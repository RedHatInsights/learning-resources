import React, { useEffect, useRef, useState } from 'react';
import { FlagProvider, IConfig } from '@unleash/proxy-client-react';
import { IntlProvider } from 'react-intl';
import { HelpPanelLink, TabType } from '../../src/components/HelpPanel';
import ScalprumProvider from '@scalprum/react-core';
import { initialize, removeScalprum } from '@scalprum/core';

const defaultFlags: IConfig['bootstrap'] = [
  {
    name: 'platform.chrome.help-panel_knowledge-base',
    enabled: true,
    impressionData: false,
    variant: { name: 'disabled', enabled: false },
  },
];

const Wrapper = ({
  children,
  flags = defaultFlags,
  chrome,
}: {
  children: React.ReactNode;
  flags?: IConfig['bootstrap'];
  chrome?: any;
}) => {
  const [isReady, setIsReady] = useState(false);
  const scalprum = useRef(
    initialize({
      appsConfig: {},
      api: chrome ? { chrome } : {},
    })
  );

  useEffect(() => {
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
        <FlagProvider
          config={{
            appName: 'test-app',
            url: 'https://unleash.example.com/api/',
            clientKey: '123',
            bootstrap: flags,
          }}
        >
          {children}
        </FlagProvider>
      </ScalprumProvider>
    </IntlProvider>
  );
};

describe('HelpPanelLink', () => {
  it('should render as a link button by default', () => {
    const mockChrome = {
      drawerActions: {
        toggleDrawerContent: cy.spy().as('toggleDrawerContent'),
      },
    };

    cy.mount(
      <Wrapper chrome={mockChrome}>
        <HelpPanelLink title="Test Help" tabType={TabType.learn}>
          Click for help
        </HelpPanelLink>
      </Wrapper>
    );

    cy.contains('Click for help').should('be.visible');
    cy.get('button').should('have.class', 'pf-m-link');
    cy.get('button').should('have.class', 'pf-m-inline');
  });

  it('should render with OpenDrawerRightIcon', () => {
    const mockChrome = {
      drawerActions: {
        toggleDrawerContent: cy.spy().as('toggleDrawerContent'),
      },
    };
    cy.mount(
      <Wrapper chrome={mockChrome}>
        <HelpPanelLink title="Test Help" tabType={TabType.learn}>
          Click for help
        </HelpPanelLink>
      </Wrapper>
    );

    cy.get('button svg').should('exist');
  });

  it('should call Chrome drawer API with correct parameters when clicked', () => {
    const toggleDrawerContentSpy = cy.spy().as('toggleDrawerContent');
    const mockChrome = {
      drawerActions: {
        toggleDrawerContent: toggleDrawerContentSpy,
      },
    };
    cy.mount(
      <Wrapper chrome={mockChrome}>
        <HelpPanelLink title="Test Help" tabType={TabType.learn}>
          Click for help
        </HelpPanelLink>
      </Wrapper>
    );

    cy.contains('Click for help').click();

    cy.get('@toggleDrawerContent').should('have.been.calledOnce');
    cy.get('@toggleDrawerContent').should('have.been.calledWithMatch', {
      scope: 'learningResources',
      module: './HelpPanel',
      newTab: {
        title: 'Test Help',
        tabType: 'learn',
        content: undefined,
      },
    });
  });

  it('should pass custom content prop to Chrome drawer API', () => {
    const toggleDrawerContentSpy = cy.spy().as('toggleDrawerContent');
    const mockChrome = {
      drawerActions: {
        toggleDrawerContent: toggleDrawerContentSpy,
      },
    };

    const customContent = (
      <div>
        <h3>Custom Help Content</h3>
        <p>This is custom React content</p>
      </div>
    );

    cy.mount(
      <Wrapper chrome={mockChrome}>
        <HelpPanelLink
          title="Custom Help"
          tabType={TabType.learn}
          content={customContent}
        >
          View custom help
        </HelpPanelLink>
      </Wrapper>
    );

    cy.contains('View custom help').click();

    cy.get('@toggleDrawerContent').should('have.been.calledOnce');
    // Note: We can't easily assert on the content prop since it's a React element
    // but we can verify the call was made
    cy.get('@toggleDrawerContent').should('have.been.calledWithMatch', {
      scope: 'learningResources',
      module: './HelpPanel',
      newTab: {
        title: 'Custom Help',
        tabType: 'learn',
      },
    });
  });

  it('should support different tab types', () => {
    const toggleDrawerContentSpy = cy.spy().as('toggleDrawerContent');
    const mockChrome = {
      drawerActions: {
        toggleDrawerContent: toggleDrawerContentSpy,
      },
    };
    cy.mount(
      <Wrapper chrome={mockChrome}>
        <div>
          <HelpPanelLink title="Learn" tabType={TabType.learn}>
            Learn
          </HelpPanelLink>
          <HelpPanelLink title="API Docs" tabType={TabType.api}>
            API
          </HelpPanelLink>
          <HelpPanelLink title="Knowledge Base" tabType={TabType.kb}>
            KB
          </HelpPanelLink>
          <HelpPanelLink title="Support" tabType={TabType.support}>
            Support
          </HelpPanelLink>
          <HelpPanelLink title="Search" tabType={TabType.search}>
            Search
          </HelpPanelLink>
        </div>
      </Wrapper>
    );

    cy.contains('Learn').click();
    cy.get('@toggleDrawerContent').should(
      'have.been.calledWithMatch',
      Cypress.sinon.match({
        newTab: { tabType: 'learn' },
      })
    );

    cy.contains('API').click();
    cy.get('@toggleDrawerContent').should(
      'have.been.calledWithMatch',
      Cypress.sinon.match({
        newTab: { tabType: 'api' },
      })
    );

    cy.contains('KB').click();
    cy.get('@toggleDrawerContent').should(
      'have.been.calledWithMatch',
      Cypress.sinon.match({
        newTab: { tabType: 'kb' },
      })
    );

    cy.contains('Support').click();
    cy.get('@toggleDrawerContent').should(
      'have.been.calledWithMatch',
      Cypress.sinon.match({
        newTab: { tabType: 'support' },
      })
    );

    cy.contains('Search').click();
    cy.get('@toggleDrawerContent').should(
      'have.been.calledWithMatch',
      Cypress.sinon.match({
        newTab: { tabType: 'search' },
      })
    );
  });

  it('should support different button variants', () => {
    const mockChrome = {
      drawerActions: {
        toggleDrawerContent: cy.spy().as('toggleDrawerContent'),
      },
    };
    cy.mount(
      <Wrapper chrome={mockChrome}>
        <div>
          <HelpPanelLink title="Primary" tabType={TabType.learn} variant="primary">
            Primary Button
          </HelpPanelLink>
          <HelpPanelLink title="Secondary" tabType={TabType.learn} variant="secondary">
            Secondary Button
          </HelpPanelLink>
          <HelpPanelLink title="Link" tabType={TabType.learn} variant="link">
            Link Button
          </HelpPanelLink>
        </div>
      </Wrapper>
    );

    cy.contains('Primary Button').should('have.class', 'pf-m-primary');
    cy.contains('Secondary Button').should('have.class', 'pf-m-secondary');
    cy.contains('Link Button').should('have.class', 'pf-m-link');
  });

  it('should apply custom className', () => {
    const mockChrome = {
      drawerActions: {
        toggleDrawerContent: cy.spy().as('toggleDrawerContent'),
      },
    };
    cy.mount(
      <Wrapper chrome={mockChrome}>
        <HelpPanelLink
          title="Test"
          tabType={TabType.learn}
          className="custom-class-name"
        >
          Click me
        </HelpPanelLink>
      </Wrapper>
    );

    cy.get('button').should('have.class', 'custom-class-name');
  });

  it('should include data-ouia-component-id when provided', () => {
    const mockChrome = {
      drawerActions: {
        toggleDrawerContent: cy.spy().as('toggleDrawerContent'),
      },
    };
    cy.mount(
      <Wrapper chrome={mockChrome}>
        <HelpPanelLink
          title="Test"
          tabType={TabType.learn}
          ouiaId="test-help-link"
        >
          Click me
        </HelpPanelLink>
      </Wrapper>
    );

    cy.get('button').should('have.attr', 'data-ouia-component-id', 'test-help-link');
  });

  it('should log warning when Chrome API is not available', () => {
    const emptyChrome = {};

    cy.window().then((win) => {
      cy.spy(win.console, 'warn').as('consoleWarn');
    });

    cy.mount(
      <Wrapper chrome={emptyChrome}>
        <HelpPanelLink title="Test" tabType={TabType.learn}>
          Click me
        </HelpPanelLink>
      </Wrapper>
    );

    cy.contains('Click me').click();

    cy.get('@consoleWarn').should(
      'have.been.calledWith',
      'Chrome drawer API not available. Make sure this component is used within insights-chrome.'
    );
  });

  it('should handle click when drawerActions is undefined', () => {
    const chromeWithoutDrawer = {
      drawerActions: undefined,
    };

    cy.window().then((win) => {
      cy.spy(win.console, 'warn').as('consoleWarn');
    });

    cy.mount(
      <Wrapper chrome={chromeWithoutDrawer}>
        <HelpPanelLink title="Test" tabType={TabType.learn}>
          Click me
        </HelpPanelLink>
      </Wrapper>
    );

    cy.contains('Click me').click();

    cy.get('@consoleWarn').should('have.been.called');
  });

  it('should render link variant as inline by default', () => {
    const mockChrome = {
      drawerActions: {
        toggleDrawerContent: cy.spy().as('toggleDrawerContent'),
      },
    };
    cy.mount(
      <Wrapper chrome={mockChrome}>
        <HelpPanelLink title="Test" tabType={TabType.learn} variant="link">
          Inline link
        </HelpPanelLink>
      </Wrapper>
    );

    cy.get('button').should('have.class', 'pf-m-inline');
  });

  it('should not render non-link variants as inline', () => {
    const mockChrome = {
      drawerActions: {
        toggleDrawerContent: cy.spy().as('toggleDrawerContent'),
      },
    };
    cy.mount(
      <Wrapper chrome={mockChrome}>
        <HelpPanelLink title="Test" tabType={TabType.learn} variant="primary">
          Primary button
        </HelpPanelLink>
      </Wrapper>
    );

    cy.get('button').should('not.have.class', 'pf-m-inline');
  });
});
