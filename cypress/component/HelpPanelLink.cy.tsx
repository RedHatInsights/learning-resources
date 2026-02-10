import React from 'react';
import { FlagProvider, IConfig } from '@unleash/proxy-client-react';
import { IntlProvider } from 'react-intl';
import * as chrome from '@redhat-cloud-services/frontend-components/useChrome';
import { HelpPanelLink, TabType } from '../../src/components/HelpPanel';

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
}: {
  children: React.ReactNode;
  flags?: IConfig['bootstrap'];
}) => {
  return (
    <IntlProvider locale="en" defaultLocale="en">
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
    </IntlProvider>
  );
};

describe('HelpPanelLink', () => {
  it('should render as a link button by default', () => {
    const chromeStub = cy.stub(chrome, 'useChrome').returns({
      drawerActions: {
        toggleDrawerContent: cy.spy().as('toggleDrawerContent'),
      },
    } as any);

    cy.mount(
      <Wrapper>
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
    cy.stub(chrome, 'useChrome').returns({
      drawerActions: {
        toggleDrawerContent: cy.spy().as('toggleDrawerContent'),
      },
    } as any);

    cy.mount(
      <Wrapper>
        <HelpPanelLink title="Test Help" tabType={TabType.learn}>
          Click for help
        </HelpPanelLink>
      </Wrapper>
    );

    cy.get('button svg').should('exist');
  });

  it('should call Chrome drawer API with correct parameters when clicked', () => {
    const toggleDrawerContentSpy = cy.spy().as('toggleDrawerContent');
    cy.stub(chrome, 'useChrome').returns({
      drawerActions: {
        toggleDrawerContent: toggleDrawerContentSpy,
      },
    } as any);

    cy.mount(
      <Wrapper>
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

  it('should pass URL prop to Chrome drawer API', () => {
    const toggleDrawerContentSpy = cy.spy().as('toggleDrawerContent');
    cy.stub(chrome, 'useChrome').returns({
      drawerActions: {
        toggleDrawerContent: toggleDrawerContentSpy,
      },
    } as any);

    cy.mount(
      <Wrapper>
        <HelpPanelLink
          title="Documentation"
          tabType={TabType.learn}
          url="https://docs.example.com/guide"
        >
          View docs
        </HelpPanelLink>
      </Wrapper>
    );

    cy.contains('View docs').click();

    cy.get('@toggleDrawerContent').should('have.been.calledWithMatch', {
      scope: 'learningResources',
      module: './HelpPanel',
      newTab: {
        title: 'Documentation',
        tabType: 'learn',
        url: 'https://docs.example.com/guide',
      },
    });
  });

  it('should pass custom content prop to Chrome drawer API', () => {
    const toggleDrawerContentSpy = cy.spy().as('toggleDrawerContent');
    cy.stub(chrome, 'useChrome').returns({
      drawerActions: {
        toggleDrawerContent: toggleDrawerContentSpy,
      },
    } as any);

    const customContent = (
      <div>
        <h3>Custom Help Content</h3>
        <p>This is custom React content</p>
      </div>
    );

    cy.mount(
      <Wrapper>
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
    cy.stub(chrome, 'useChrome').returns({
      drawerActions: {
        toggleDrawerContent: toggleDrawerContentSpy,
      },
    } as any);

    cy.mount(
      <Wrapper>
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
    cy.stub(chrome, 'useChrome').returns({
      drawerActions: {
        toggleDrawerContent: cy.spy().as('toggleDrawerContent'),
      },
    } as any);

    cy.mount(
      <Wrapper>
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
    cy.stub(chrome, 'useChrome').returns({
      drawerActions: {
        toggleDrawerContent: cy.spy().as('toggleDrawerContent'),
      },
    } as any);

    cy.mount(
      <Wrapper>
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
    cy.stub(chrome, 'useChrome').returns({
      drawerActions: {
        toggleDrawerContent: cy.spy().as('toggleDrawerContent'),
      },
    } as any);

    cy.mount(
      <Wrapper>
        <HelpPanelLink
          title="Test"
          tabType={TabType.learn}
          data-ouia-component-id="test-help-link"
        >
          Click me
        </HelpPanelLink>
      </Wrapper>
    );

    cy.get('[data-ouia-component-id="test-help-link"]').should('exist');
  });

  it('should log warning when Chrome API is not available', () => {
    cy.stub(chrome, 'useChrome').returns({} as any);

    cy.window().then((win) => {
      cy.spy(win.console, 'warn').as('consoleWarn');
    });

    cy.mount(
      <Wrapper>
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
    cy.stub(chrome, 'useChrome').returns({
      drawerActions: undefined,
    } as any);

    cy.window().then((win) => {
      cy.spy(win.console, 'warn').as('consoleWarn');
    });

    cy.mount(
      <Wrapper>
        <HelpPanelLink title="Test" tabType={TabType.learn}>
          Click me
        </HelpPanelLink>
      </Wrapper>
    );

    cy.contains('Click me').click();

    cy.get('@consoleWarn').should('have.been.called');
  });

  it('should render link variant as inline by default', () => {
    cy.stub(chrome, 'useChrome').returns({
      drawerActions: {
        toggleDrawerContent: cy.spy().as('toggleDrawerContent'),
      },
    } as any);

    cy.mount(
      <Wrapper>
        <HelpPanelLink title="Test" tabType={TabType.learn} variant="link">
          Inline link
        </HelpPanelLink>
      </Wrapper>
    );

    cy.get('button').should('have.class', 'pf-m-inline');
  });

  it('should not render non-link variants as inline', () => {
    cy.stub(chrome, 'useChrome').returns({
      drawerActions: {
        toggleDrawerContent: cy.spy().as('toggleDrawerContent'),
      },
    } as any);

    cy.mount(
      <Wrapper>
        <HelpPanelLink title="Test" tabType={TabType.learn} variant="primary">
          Primary button
        </HelpPanelLink>
      </Wrapper>
    );

    cy.get('button').should('not.have.class', 'pf-m-inline');
  });
});
