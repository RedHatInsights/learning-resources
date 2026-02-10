import React, { ReactNode } from 'react';
import { Button, ButtonProps } from '@patternfly/react-core';
import { OpenDrawerRightIcon } from '@patternfly/react-icons';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import { TabType } from './HelpPanelTabs/helpPanelTabsMapper';

export type HelpPanelTabContent = {
  id?: string;
  title: string;
  tabType: TabType;
  content?: ReactNode;
  url?: string;
};

export type HelpPanelLinkProps = {
  /** The title for the tab that will be created */
  title: string;
  /** The type of tab content to display (learn, api, kb, search, support) */
  tabType: TabType;
  /** Optional URL to fetch and display as HTML */
  url?: string;
  /** Optional custom React content to display in the tab */
  content?: ReactNode;
  /** The text/content to display in the link */
  children: ReactNode;
  /** Optional additional className */
  className?: string;
  /** Optional variant for the button (defaults to 'link') */
  variant?: ButtonProps['variant'];
  /** Optional data-ouia-component-id for testing */
  'data-ouia-component-id'?: string;
};

/**
 * HelpPanelLink is a link component that opens the help panel drawer
 * with specific content when clicked.
 *
 * Uses Chrome's drawer API to toggle the help panel and pass tab content.
 * The HelpPanel component receives the tab data and automatically opens it.
 *
 * @example
 * ```tsx
 * // With URL
 * <HelpPanelLink
 *   title="Documentation"
 *   tabType={TabType.learn}
 *   url="https://docs.example.com/guide"
 * >
 *   View documentation
 * </HelpPanelLink>
 *
 * // With custom content
 * <HelpPanelLink
 *   title="Getting Started"
 *   tabType={TabType.learn}
 *   content={
 *     <div>
 *       <h3>Welcome!</h3>
 *       <p>Here's how to get started...</p>
 *     </div>
 *   }
 * >
 *   View getting started guide
 * </HelpPanelLink>
 * ```
 */
export const HelpPanelLink: React.FC<HelpPanelLinkProps> = ({
  title,
  tabType,
  url,
  content,
  children,
  className,
  variant = 'link',
  'data-ouia-component-id': ouiaId,
}) => {
  const chrome = useChrome();

  const handleClick = () => {
    // Access Chrome API to toggle help panel with tab content
    if (chrome?.drawerActions?.toggleDrawerContent) {
      chrome.drawerActions.toggleDrawerContent({
        scope: 'learningResources',
        module: './HelpPanel',
        newTab: {
          title,
          tabType,
          url,
          content,
        },
      });
    } else {
      console.warn(
        'Chrome drawer API not available. Make sure this component is used within insights-chrome.'
      );
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      className={className}
      icon={<OpenDrawerRightIcon />}
      iconPosition="end"
      isInline={variant === 'link'}
      data-ouia-component-id={ouiaId}
    >
      {children}
    </Button>
  );
};

export default HelpPanelLink;
