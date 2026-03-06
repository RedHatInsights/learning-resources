import React, { useEffect, useRef, useState } from 'react';
import { IntlProvider } from 'react-intl';
import ScalprumProvider from '@scalprum/react-core';
import { initialize, removeScalprum } from '@scalprum/core';
import SearchResultItem, {
  SearchResult,
} from '../../src/components/HelpPanel/HelpPanelTabs/SearchPanel/SearchResultItem';

const mockAuthUser = {
  identity: {
    user: { username: 'testuser' },
    internal: { account_id: '12345' },
  },
};

const makeChromeApi = (overrides: Record<string, any> = {}) => ({
  chrome: {
    getBundleData: () => ({
      bundleId: 'rhel',
      bundleTitle: 'RHEL',
    }),
    getAvailableBundles: () => [{ id: 'rhel', title: 'RHEL' }],
    auth: {
      getUser: () => Promise.resolve(mockAuthUser),
    },
    drawerActions: {},
    ...overrides,
  },
});

const Wrapper = ({
  children,
  api = makeChromeApi(),
}: {
  children: React.ReactNode;
  api?: Record<string, any>;
}) => {
  const [isReady, setIsReady] = useState(false);
  const scalprum = useRef(
    initialize({
      appsConfig: {
        virtualAssistant: {
          name: 'virtualAssistant',
          manifestLocation: '/foo/bar.json',
        },
      },
      api,
    })
  );

  useEffect(() => {
    setIsReady(true);
    return () => {
      removeScalprum();
    };
  }, []);

  if (!isReady) return null;

  return (
    <IntlProvider locale="en" defaultLocale="en">
      <ScalprumProvider scalprum={scalprum.current}>
        {children}
      </ScalprumProvider>
    </IntlProvider>
  );
};

const makeResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
  id: 'lr-test-resource',
  title: 'Test Learning Resource',
  description: 'A test description',
  type: 'documentation',
  url: 'https://example.com/doc',
  tags: [],
  bundleTags: ['rhel'],
  isBookmarked: false,
  resourceName: 'test-resource',
  ...overrides,
});

describe('SearchResultItem – bookmark functionality', () => {
  it('should show bookmark button for documentation type with resourceName', () => {
    cy.mount(
      <Wrapper>
        <SearchResultItem result={makeResult({ type: 'documentation' })} />
      </Wrapper>
    );

    cy.get('[aria-label="Bookmark learning resource"]').should('be.visible');
  });

  it('should show bookmark button for quickstart type with resourceName', () => {
    cy.mount(
      <Wrapper>
        <SearchResultItem
          result={makeResult({ type: 'quickstart', id: 'lr-qs-1' })}
        />
      </Wrapper>
    );

    cy.get('[aria-label="Bookmark learning resource"]').should('be.visible');
  });

  it('should not show bookmark button for api type', () => {
    cy.mount(
      <Wrapper>
        <SearchResultItem result={makeResult({ type: 'api' })} />
      </Wrapper>
    );

    cy.get('[aria-label="Bookmark learning resource"]').should('not.exist');
    cy.get('[aria-label="Unbookmark learning resource"]').should('not.exist');
  });

  it('should not show bookmark button for service type', () => {
    cy.mount(
      <Wrapper>
        <SearchResultItem result={makeResult({ type: 'service' })} />
      </Wrapper>
    );

    cy.get('[aria-label="Bookmark learning resource"]').should('not.exist');
  });

  it('should not show bookmark button when resourceName is missing', () => {
    cy.mount(
      <Wrapper>
        <SearchResultItem
          result={makeResult({
            type: 'documentation',
            resourceName: undefined,
          })}
        />
      </Wrapper>
    );

    cy.get('[aria-label="Bookmark learning resource"]').should('not.exist');
  });

  it('should show filled bookmark icon when already bookmarked', () => {
    cy.mount(
      <Wrapper>
        <SearchResultItem result={makeResult({ isBookmarked: true })} />
      </Wrapper>
    );

    cy.get('[aria-label="Unbookmark learning resource"]').should('be.visible');
    cy.get('[aria-label="Bookmark learning resource"]').should('not.exist');
  });

  it('should toggle bookmark state and call favorites API on click', () => {
    cy.intercept('POST', '/api/quickstarts/v1/favorites*', {
      statusCode: 200,
      body: { data: {} },
    }).as('favoritePost');

    const onBookmarkToggle = cy.stub().as('onBookmarkToggle');

    cy.mount(
      <Wrapper>
        <SearchResultItem
          result={makeResult({ isBookmarked: false })}
          onBookmarkToggle={onBookmarkToggle}
        />
      </Wrapper>
    );

    cy.get('[aria-label="Bookmark learning resource"]').click();

    cy.wait('@favoritePost').then((interception) => {
      expect(interception.request.body).to.deep.equal({
        quickstartName: 'test-resource',
        favorite: true,
      });
      expect(interception.request.url).to.include('account=12345');
    });

    cy.get('[aria-label="Unbookmark learning resource"]').should('be.visible');
    cy.get('@onBookmarkToggle').should(
      'have.been.calledWith',
      'test-resource',
      true
    );
  });

  it('should unbookmark a bookmarked resource on click', () => {
    cy.intercept('POST', '/api/quickstarts/v1/favorites*', {
      statusCode: 200,
      body: { data: {} },
    }).as('favoritePost');

    const onBookmarkToggle = cy.stub().as('onBookmarkToggle');

    cy.mount(
      <Wrapper>
        <SearchResultItem
          result={makeResult({ isBookmarked: true })}
          onBookmarkToggle={onBookmarkToggle}
        />
      </Wrapper>
    );

    cy.get('[aria-label="Unbookmark learning resource"]').click();

    cy.wait('@favoritePost').then((interception) => {
      expect(interception.request.body).to.deep.equal({
        quickstartName: 'test-resource',
        favorite: false,
      });
    });

    cy.get('[aria-label="Bookmark learning resource"]').should('be.visible');
    cy.get('@onBookmarkToggle').should(
      'have.been.calledWith',
      'test-resource',
      false
    );
  });

  it('should revert bookmark state on API failure', () => {
    cy.intercept('POST', '/api/quickstarts/v1/favorites*', {
      statusCode: 500,
      body: { error: 'Server error' },
    }).as('favoritePostFail');

    cy.mount(
      <Wrapper>
        <SearchResultItem result={makeResult({ isBookmarked: false })} />
      </Wrapper>
    );

    cy.get('[aria-label="Bookmark learning resource"]').click();
    cy.wait('@favoritePostFail');

    cy.get('[aria-label="Bookmark learning resource"]').should('be.visible');
  });

  it('should display the result title as a clickable link', () => {
    cy.mount(
      <Wrapper>
        <SearchResultItem result={makeResult({ title: 'My Custom Title' })} />
      </Wrapper>
    );

    cy.contains('My Custom Title').should('be.visible');
  });

  it('should show external link icon for non-quickstart results with a URL', () => {
    cy.mount(
      <Wrapper>
        <SearchResultItem
          result={makeResult({ type: 'documentation', url: 'https://example.com' })}
        />
      </Wrapper>
    );

    cy.get('.pf-v6-c-button.pf-m-link').within(() => {
      cy.get('svg.pf-v6-svg').should('exist');
    });
  });

  it('should not show external link icon for quickstart results', () => {
    cy.mount(
      <Wrapper>
        <SearchResultItem
          result={makeResult({ type: 'quickstart', id: 'lr-qs-1', url: '/quickstarts/qs-1' })}
        />
      </Wrapper>
    );

    cy.get('.pf-v6-c-button.pf-m-link').within(() => {
      cy.get('svg.pf-v6-svg').should('not.exist');
    });
  });

  it('should display bundle tag labels', () => {
    cy.mount(
      <Wrapper>
        <SearchResultItem
          result={makeResult({ bundleTags: ['rhel', 'openshift'] })}
        />
      </Wrapper>
    );

    cy.contains('.pf-v6-c-label', 'RHEL').should('be.visible');
    cy.contains('.pf-v6-c-label', 'OpenShift').should('be.visible');
  });
});
