import React from 'react';
import {
  Button,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';

interface MockHeaderProps {
  onHelpClick: () => void;
  isDrawerOpen: boolean;
}

/**
 * Mock console header for testing Help Panel.
 * Mimics the Red Hat Console header with a Help button.
 */
export const MockHeader: React.FC<MockHeaderProps> = ({
  onHelpClick,
  isDrawerOpen,
}) => {
  return (
    <Masthead>
      <MastheadMain>
        <MastheadBrand>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
            Red Hat Hybrid Cloud Console
          </span>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Toolbar isFullHeight>
          <ToolbarContent>
            <ToolbarGroup align={{ default: 'alignEnd' }}>
              <ToolbarItem>
                <Button
                  variant="plain"
                  onClick={onHelpClick}
                  icon={<QuestionCircleIcon />}
                  data-ouia-component-id="help-panel-toggle-button"
                  aria-label="Toggle help panel"
                  aria-expanded={isDrawerOpen}
                  aria-controls="mock-help-panel-drawer"
                >
                  Help
                </Button>
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );
};
