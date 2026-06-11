import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { HelpPanelLink } from './HelpPanelLink';

// Define TabType enum locally to avoid importing from mapper which has dependencies
enum TabType {
  'search' = 'search',
  'learn' = 'learn',
  'kb' = 'kb',
  'api' = 'api',
  'support' = 'support',
  'va' = 'va',
  'feedback' = 'feedback',
  'quickstart' = 'quickstart',
}

// Mock useChrome hook
const mockToggleDrawerContent = jest.fn();
const mockChrome = {
  drawerActions: {
    toggleDrawerContent: mockToggleDrawerContent,
  },
};

jest.mock('@redhat-cloud-services/frontend-components/useChrome', () => ({
  __esModule: true,
  default: jest.fn(() => mockChrome),
}));

describe('HelpPanelLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the link with children text', () => {
      render(
        <HelpPanelLink title="Test Tab" tabType={TabType.learn}>
          Click here for help
        </HelpPanelLink>
      );

      expect(screen.getByText('Click here for help')).toBeInTheDocument();
    });

    it('renders as a button with link variant by default', () => {
      render(
        <HelpPanelLink title="Test Tab" tabType={TabType.learn}>
          Help
        </HelpPanelLink>
      );

      const button = screen.getByRole('button', { name: /help/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('pf-m-link');
    });

    it('renders with custom variant when specified', () => {
      render(
        <HelpPanelLink
          title="Test Tab"
          tabType={TabType.learn}
          variant="primary"
        >
          Help
        </HelpPanelLink>
      );

      const button = screen.getByRole('button', { name: /help/i });
      expect(button).toHaveClass('pf-m-primary');
    });

    it('renders with OpenDrawerRightIcon', () => {
      const { container } = render(
        <HelpPanelLink title="Test Tab" tabType={TabType.learn}>
          Help
        </HelpPanelLink>
      );

      // PatternFly icons are rendered as svg
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      render(
        <HelpPanelLink
          title="Test Tab"
          tabType={TabType.learn}
          className="custom-class"
        >
          Help
        </HelpPanelLink>
      );

      const button = screen.getByRole('button', { name: /help/i });
      expect(button).toHaveClass('custom-class');
    });

    it('renders with ouiaId when provided', () => {
      render(
        <HelpPanelLink
          title="Test Tab"
          tabType={TabType.learn}
          ouiaId="test-help-link"
        >
          Help
        </HelpPanelLink>
      );

      const button = screen.getByRole('button', { name: /help/i });
      expect(button).toHaveAttribute(
        'data-ouia-component-id',
        'test-help-link'
      );
    });
  });

  describe('Chrome API Integration', () => {
    it('calls toggleDrawerContent with correct parameters when clicked', () => {
      render(
        <HelpPanelLink title="Getting Started" tabType={TabType.learn}>
          View guide
        </HelpPanelLink>
      );

      const button = screen.getByRole('button', { name: /view guide/i });
      fireEvent.click(button);

      expect(mockToggleDrawerContent).toHaveBeenCalledTimes(1);
      expect(mockToggleDrawerContent).toHaveBeenCalledWith({
        scope: 'learningResources',
        module: './HelpPanel',
        newTab: {
          title: 'Getting Started',
          tabType: TabType.learn,
          content: undefined,
        },
      });
    });

    it('passes custom content when provided', () => {
      const customContent = <div>Custom content here</div>;

      render(
        <HelpPanelLink
          title="Custom Tab"
          tabType={TabType.api}
          content={customContent}
        >
          Open API docs
        </HelpPanelLink>
      );

      const button = screen.getByRole('button', { name: /open api docs/i });
      fireEvent.click(button);

      expect(mockToggleDrawerContent).toHaveBeenCalledWith({
        scope: 'learningResources',
        module: './HelpPanel',
        newTab: {
          title: 'Custom Tab',
          tabType: TabType.api,
          content: customContent,
        },
      });
    });

    it('supports all tab types', () => {
      const tabTypes = [
        TabType.learn,
        TabType.api,
        TabType.kb,
        TabType.search,
        TabType.support,
        TabType.va,
        TabType.feedback,
      ];

      tabTypes.forEach((tabType) => {
        mockToggleDrawerContent.mockClear();

        const { unmount } = render(
          <HelpPanelLink title="Test" tabType={tabType}>
            Click
          </HelpPanelLink>
        );

        const button = screen.getByRole('button', { name: /click/i });
        fireEvent.click(button);

        expect(mockToggleDrawerContent).toHaveBeenCalledWith(
          expect.objectContaining({
            newTab: expect.objectContaining({
              tabType,
            }),
          })
        );

        unmount();
      });
    });
  });

  describe('Error Handling', () => {
    it('logs warning when Chrome API is not available', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock useChrome to return null
      const useChromeMock =
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('@redhat-cloud-services/frontend-components/useChrome').default;
      useChromeMock.mockReturnValue(null);

      render(
        <HelpPanelLink title="Test" tabType={TabType.learn}>
          Help
        </HelpPanelLink>
      );

      const button = screen.getByRole('button', { name: /help/i });
      fireEvent.click(button);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Chrome drawer API not available. Make sure this component is used within insights-chrome.'
      );
      expect(mockToggleDrawerContent).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
      useChromeMock.mockReturnValue(mockChrome);
    });

    it('logs warning when drawerActions is missing', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const useChromeMock =
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('@redhat-cloud-services/frontend-components/useChrome').default;
      useChromeMock.mockReturnValue({});

      render(
        <HelpPanelLink title="Test" tabType={TabType.learn}>
          Help
        </HelpPanelLink>
      );

      const button = screen.getByRole('button', { name: /help/i });
      fireEvent.click(button);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(mockToggleDrawerContent).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
      useChromeMock.mockReturnValue(mockChrome);
    });

    it('logs warning when toggleDrawerContent is missing', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const useChromeMock =
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('@redhat-cloud-services/frontend-components/useChrome').default;
      useChromeMock.mockReturnValue({ drawerActions: {} });

      render(
        <HelpPanelLink title="Test" tabType={TabType.learn}>
          Help
        </HelpPanelLink>
      );

      const button = screen.getByRole('button', { name: /help/i });
      fireEvent.click(button);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(mockToggleDrawerContent).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
      useChromeMock.mockReturnValue(mockChrome);
    });
  });

  describe('Complex Content', () => {
    it('renders complex React content in children', () => {
      const { container } = render(
        <HelpPanelLink title="Test" tabType={TabType.learn}>
          <span>
            Click <strong>here</strong> for help
          </span>
        </HelpPanelLink>
      );

      // Check that all parts of the content are rendered
      expect(screen.getByText('here')).toBeInTheDocument();
      expect(container.textContent).toContain('Click');
      expect(container.textContent).toContain('for help');
      // Verify the strong tag exists
      expect(container.querySelector('strong')).toBeInTheDocument();
    });

    it('passes complex React content to drawer API', () => {
      const ComplexContent = () => (
        <div>
          <h2>Title</h2>
          <p>Description</p>
          <button>Action</button>
        </div>
      );

      render(
        <HelpPanelLink
          title="Complex"
          tabType={TabType.learn}
          content={<ComplexContent />}
        >
          Open
        </HelpPanelLink>
      );

      const button = screen.getByRole('button', { name: /open/i });
      fireEvent.click(button);

      const callArg = mockToggleDrawerContent.mock.calls[0][0];
      expect(callArg.newTab.content).toBeDefined();
      expect(callArg.newTab.content.type).toBe(ComplexContent);
    });
  });

  describe('Accessibility', () => {
    it('has proper button role', () => {
      render(
        <HelpPanelLink title="Test" tabType={TabType.learn}>
          Help
        </HelpPanelLink>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('is keyboard accessible', () => {
      render(
        <HelpPanelLink title="Test" tabType={TabType.learn}>
          Help
        </HelpPanelLink>
      );

      const button = screen.getByRole('button', { name: /help/i });
      button.focus();

      expect(document.activeElement).toBe(button);
    });
  });
});
