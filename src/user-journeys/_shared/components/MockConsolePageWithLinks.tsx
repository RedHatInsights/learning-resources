import React, { useEffect, useState } from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DrawerPanelContent,
  Gallery,
  Page,
  PageSection,
  Title,
} from '@patternfly/react-core';
import HelpPanelContent from '../../../components/HelpPanel/HelpPanelContent';
import { HelpPanelLink } from '../../../components/HelpPanel/HelpPanelLink';
import { HelpPanelTabContent } from '../../../components/HelpPanel/HelpPanelLink';
import { TabType } from '../../../components/HelpPanel/HelpPanelTabs/helpPanelTabsMapper';
import { MockHeader } from './MockHeader';
import './MockConsolePage.scss';

interface MockConsolePageWithLinksProps {
  bundle?: string;
}

/**
 * Mock console page with HelpPanelLink components for testing in-page link functionality.
 * Wires up the Chrome mock's drawerActions.toggleDrawerContent to actually open the
 * Help Panel with the correct tab content.
 */
export const MockConsolePageWithLinks: React.FC<
  MockConsolePageWithLinksProps
> = ({ bundle = 'insights' }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newTab, setNewTab] = useState<HelpPanelTabContent | undefined>();

  // Wire up the Chrome mock's toggleDrawerContent to actually open the drawer.
  // React state setters are stable across renders, so this is safe.
  // Captures and restores any previous drawerActions on cleanup to avoid
  // leaking mock mutations across stories.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chrome = (window as any).insights?.chrome;
      if (chrome) {
        const previousDrawerActions = chrome.drawerActions;
        chrome.drawerActions = {
          ...previousDrawerActions,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          toggleDrawerContent: (data: any) => {
            setIsDrawerOpen(true);
            if (data?.newTab) {
              setNewTab(data.newTab);
            }
          },
        };
        return () => {
          chrome.drawerActions = previousDrawerActions;
        };
      }
    }
  }, []);

  const toggleDrawer = () => {
    setIsDrawerOpen((prev) => !prev);
  };

  const panelContent = (
    <DrawerPanelContent
      id="mock-help-panel-drawer"
      data-ouia-component-id="help-panel-drawer"
      widths={{ default: 'width_50' }}
    >
      <HelpPanelContent toggleDrawer={toggleDrawer} newTab={newTab} />
    </DrawerPanelContent>
  );

  return (
    <Page
      className="mock-console-page"
      masthead={
        <MockHeader onHelpClick={toggleDrawer} isDrawerOpen={isDrawerOpen} />
      }
    >
      <Drawer isExpanded={isDrawerOpen} position="right">
        <DrawerContent panelContent={panelContent}>
          <DrawerContentBody>
            <PageSection>
              <Title
                headingLevel="h1"
                size="2xl"
                style={{ marginBottom: '2rem' }}
              >
                Red Hat {bundle === 'insights' ? 'Insights' : 'Console'}{' '}
                Overview
              </Title>

              <Gallery hasGutter minWidths={{ default: '300px' }}>
                <Card data-ouia-component-id="card-getting-started">
                  <CardTitle>Getting Started</CardTitle>
                  <CardBody>
                    <p style={{ marginBottom: '1rem' }}>
                      New to Red Hat Insights? Check out our getting started
                      guide for tutorials and resources.
                    </p>
                    <HelpPanelLink
                      title="Getting Started Guide"
                      tabType={TabType.learn}
                      ouiaId="in-page-learn-link"
                    >
                      View getting started guide
                    </HelpPanelLink>
                  </CardBody>
                </Card>

                <Card data-ouia-component-id="card-api-docs">
                  <CardTitle>API Integration</CardTitle>
                  <CardBody>
                    <p style={{ marginBottom: '1rem' }}>
                      Explore the Insights API to integrate with your workflows
                      and automate operations.
                    </p>
                    <HelpPanelLink
                      title="API Documentation"
                      tabType={TabType.api}
                      ouiaId="in-page-api-link"
                    >
                      View API documentation
                    </HelpPanelLink>
                  </CardBody>
                </Card>

                <Card data-ouia-component-id="card-support">
                  <CardTitle>Need Help?</CardTitle>
                  <CardBody>
                    <p style={{ marginBottom: '1rem' }}>
                      Having issues? Contact our support team for assistance
                      with your Red Hat products.
                    </p>
                    <HelpPanelLink
                      title="Support"
                      tabType={TabType.support}
                      ouiaId="in-page-support-link"
                    >
                      Get support
                    </HelpPanelLink>
                  </CardBody>
                </Card>

                <Card data-ouia-component-id="card-custom-content">
                  <CardTitle>Feature Guide</CardTitle>
                  <CardBody>
                    <p style={{ marginBottom: '1rem' }}>
                      View contextual help for this specific feature with custom
                      content.
                    </p>
                    <HelpPanelLink
                      title="Feature Help"
                      tabType={TabType.learn}
                      content={
                        <div data-ouia-component-id="custom-help-content">
                          <h3>Feature Help</h3>
                          <p>
                            This is custom help content passed via
                            HelpPanelLink.
                          </p>
                          <p>
                            It demonstrates how in-page links can open the help
                            panel with specific, contextual content relevant to
                            the current page.
                          </p>
                        </div>
                      }
                      ouiaId="in-page-custom-content-link"
                    >
                      View feature help
                    </HelpPanelLink>
                  </CardBody>
                </Card>

                <Card data-ouia-component-id="card-knowledgebase">
                  <CardTitle>Knowledge Base</CardTitle>
                  <CardBody>
                    <p style={{ marginBottom: '1rem' }}>
                      Search our knowledge base for articles and solutions to
                      common issues.
                    </p>
                    <HelpPanelLink
                      title="Knowledge Base"
                      tabType={TabType.kb}
                      ouiaId="in-page-kb-link"
                    >
                      Browse knowledge base
                    </HelpPanelLink>
                  </CardBody>
                </Card>

                <Card data-ouia-component-id="card-feedback">
                  <CardTitle>Share Feedback</CardTitle>
                  <CardBody>
                    <p style={{ marginBottom: '1rem' }}>
                      Help us improve the console by sharing your experience and
                      suggestions.
                    </p>
                    <HelpPanelLink
                      title="Share feedback"
                      tabType={TabType.feedback}
                      ouiaId="in-page-feedback-link"
                    >
                      Give feedback
                    </HelpPanelLink>
                  </CardBody>
                </Card>
              </Gallery>
            </PageSection>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </Page>
  );
};
