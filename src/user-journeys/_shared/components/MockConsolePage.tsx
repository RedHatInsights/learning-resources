import React, { useState } from 'react';
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
import { MockHeader } from './MockHeader';
import './MockConsolePage.scss';

interface MockConsolePageProps {
  bundle?: string;
}

/**
 * Mock console page for testing Help Panel in Storybook.
 * Simulates the Red Hat Console environment with realistic content.
 */
export const MockConsolePage: React.FC<MockConsolePageProps> = ({
  bundle = 'insights',
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setIsDrawerOpen((prev) => !prev);
  };

  const panelContent = (
    <DrawerPanelContent
      id="mock-help-panel-drawer"
      data-ouia-component-id="help-panel-drawer"
      widths={{ default: 'width_50' }}
    >
      <HelpPanelContent toggleDrawer={toggleDrawer} />
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
                <Card>
                  <CardTitle>System Status</CardTitle>
                  <CardBody>
                    Monitor the health and performance of your systems. View
                    critical alerts, warnings, and recommendations.
                  </CardBody>
                </Card>

                <Card>
                  <CardTitle>Advisor Recommendations</CardTitle>
                  <CardBody>
                    Get proactive recommendations to improve system stability,
                    performance, and security across your infrastructure.
                  </CardBody>
                </Card>

                <Card>
                  <CardTitle>Vulnerability Management</CardTitle>
                  <CardBody>
                    Identify and prioritize security vulnerabilities across your
                    Red Hat systems with actionable remediation steps.
                  </CardBody>
                </Card>

                <Card>
                  <CardTitle>Compliance</CardTitle>
                  <CardBody>
                    Ensure your systems meet security compliance standards with
                    automated scanning and reporting capabilities.
                  </CardBody>
                </Card>

                <Card>
                  <CardTitle>Patch Management</CardTitle>
                  <CardBody>
                    Stay up to date with the latest patches and updates. View
                    available patches and their impact on your systems.
                  </CardBody>
                </Card>

                <Card>
                  <CardTitle>Configuration Drift</CardTitle>
                  <CardBody>
                    Track and compare system configurations to identify
                    unexpected changes and ensure consistency across your
                    infrastructure.
                  </CardBody>
                </Card>
              </Gallery>

              <div style={{ marginTop: '2rem' }}>
                <Title
                  headingLevel="h2"
                  size="xl"
                  style={{ marginBottom: '1rem' }}
                >
                  Getting Started
                </Title>
                <Card>
                  <CardBody>
                    <p style={{ marginBottom: '1rem' }}>
                      Welcome to Red Hat Insights! Click the question mark icon
                      in the header to access learning resources, documentation,
                      and support.
                    </p>
                    <p>
                      The assistance panel provides quick access to tutorials,
                      API documentation, and links to Red Hat support resources.
                    </p>
                  </CardBody>
                </Card>
              </div>
            </PageSection>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </Page>
  );
};
