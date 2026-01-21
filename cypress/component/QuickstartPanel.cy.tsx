import React from 'react';
import { IntlProvider } from 'react-intl';
import QuickstartPanel from '../../src/components/HelpPanel/HelpPanelTabs/QuickstartPanel';
import { ExtendedQuickstart } from '../../src/utils/fetchQuickstarts';

// Wrapper component to provide IntlProvider context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntlProvider locale="en" defaultLocale="en">
    {children}
  </IntlProvider>
);

// Mock quickstart data for testing
const createMockQuickstart = (
  overrides: Partial<ExtendedQuickstart['spec']> = {}
): ExtendedQuickstart => ({
  apiVersion: 'console.openshift.io/v1',
  kind: 'QuickStarts',
  metadata: {
    name: 'test-quickstart',
    tags: [
      { kind: 'product-family', value: 'ansible' },
      { kind: 'content', value: 'Quick start' },
    ],
    favorite: false,
  },
  spec: {
    displayName: 'Test Quickstart Title',
    durationMinutes: 15,
    icon: null,
    introduction:
      'This is the **introduction** with some markdown content including a [link](https://example.com).',
    description: 'This is the description text.',
    prerequisites: [
      'You need prerequisite one',
      'You need **prerequisite two** with markdown',
      'You need prerequisite three',
    ],
    tasks: [
      {
        title: 'First Task',
        description:
          'This is the first task description with **bold text** and `inline code`.',
        review: {
          instructions:
            'Did you complete the first task? Check these steps:\n1. Step one\n2. Step two',
          failedTaskHelp: 'Try again if you failed.',
        },
      },
      {
        title: 'Second Task',
        description: 'This is the second task description.',
        review: {
          instructions: 'Verify the second task is complete.',
          failedTaskHelp: 'Try again.',
        },
      },
      {
        title: 'Third Task',
        description: 'This is the third and final task.',
        review: {
          instructions: 'All done!',
          failedTaskHelp: 'Check your work.',
        },
      },
    ],
    type: {
      text: 'Quick start',
      color: 'green',
    },
    link: {
      href: 'https://example.com/quickstart',
      text: 'View documentation',
    },
    ...overrides,
  },
});

describe('QuickstartPanel', () => {
  describe('Empty State', () => {
    it('should display "No quickstart data available" when no data is provided', () => {
      cy.mount(
        <TestWrapper>
          <QuickstartPanel />
        </TestWrapper>
      );
      cy.contains('No quickstart data available.').should('be.visible');
    });

    it('should display "No quickstart data available" when quickstartData is undefined', () => {
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={undefined} />
        </TestWrapper>
      );
      cy.contains('No quickstart data available.').should('be.visible');
    });
  });

  describe('Overview Rendering', () => {
    it('should render the quickstart title', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.contains('h2', 'Test Quickstart Title').should('be.visible');
    });

    it('should render the duration', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.contains('Quick start | 15 minutes').should('be.visible');
    });

    it('should not render duration when durationMinutes is not provided', () => {
      const mockData = createMockQuickstart({ durationMinutes: undefined });
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.contains('minutes').should('not.exist');
    });

    it('should render the introduction with markdown parsed', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('.lr-c-markdown-content')
        .first()
        .within(() => {
          cy.get('strong').should('contain.text', 'introduction');
          cy.get('a')
            .should('have.attr', 'href', 'https://example.com')
            .and('contain.text', 'link');
        });
    });

    it('should render description when introduction is not provided', () => {
      const mockData = createMockQuickstart({
        introduction: undefined,
        description: 'Fallback description text',
      });
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.contains('Fallback description text').should('be.visible');
    });

    it('should render external link button when link is provided', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('a[aria-label="Open in new window"]')
        .should('have.attr', 'href', 'https://example.com/quickstart')
        .and('have.attr', 'target', '_blank');
    });

    it('should render the Next button on overview', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('[data-ouia-component-id="help-panel-quickstart-start-button"]')
        .should('be.visible')
        .and('contain.text', 'Next');
    });
  });

  describe('Prerequisites', () => {
    it('should render prerequisites toggle with correct count', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.contains('View prerequisites (3)').should('be.visible');
    });

    it('should expand prerequisites when clicked', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.contains('You need prerequisite one').should('not.be.visible');
      cy.contains('View prerequisites (3)').click();
      cy.contains('You need prerequisite one').should('be.visible');
      cy.contains('prerequisite two').should('be.visible');
      cy.contains('You need prerequisite three').should('be.visible');
    });

    it('should not render prerequisites section when none exist', () => {
      const mockData = createMockQuickstart({ prerequisites: [] });
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.contains('View prerequisites').should('not.exist');
    });
  });

  describe('Task List', () => {
    it('should render task count text', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.contains('In this quick start, you will complete 3 tasks:').should(
        'be.visible'
      );
    });

    it('should render singular task text for one task', () => {
      const mockData = createMockQuickstart({
        tasks: [
          {
            title: 'Only Task',
            description: 'Single task',
          },
        ],
      });
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.contains('In this quick start, you will complete 1 task:').should(
        'be.visible'
      );
    });

    it('should render all task titles with numbers', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('.lr-c-task-number').eq(0).should('contain.text', '1');
      cy.get('.lr-c-task-number').eq(1).should('contain.text', '2');
      cy.get('.lr-c-task-number').eq(2).should('contain.text', '3');
      cy.contains('First Task').should('be.visible');
      cy.contains('Second Task').should('be.visible');
      cy.contains('Third Task').should('be.visible');
    });

    it('should navigate to task when clicking on task in list', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('[data-ouia-component-id="help-panel-quickstart-task-1"]').click();
      cy.contains('h3', 'Second Task').should('be.visible');
      cy.contains('2 of 3').should('be.visible');
    });
  });

  describe('Task Navigation', () => {
    it('should navigate to first task when clicking Next', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('[data-ouia-component-id="help-panel-quickstart-start-button"]').click();
      cy.get('[data-ouia-component-id="help-panel-quickstart-task"]').should('exist');
      cy.contains('First Task').should('be.visible');
      cy.contains('1 of 3').should('be.visible');
    });

    it('should show Next, Back, and Restart buttons in task view', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('[data-ouia-component-id="help-panel-quickstart-start-button"]').click();
      cy.get('[data-ouia-component-id="help-panel-quickstart-next-button"]').should('be.visible');
      cy.get('[data-ouia-component-id="help-panel-quickstart-back-button"]').should('be.visible');
      cy.get('[data-ouia-component-id="help-panel-quickstart-restart-button"]').should('be.visible');
    });

    it('should navigate back to overview when clicking Back on first task', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('[data-ouia-component-id="help-panel-quickstart-start-button"]').click();
      cy.contains('First Task').should('be.visible');
      cy.get('[data-ouia-component-id="help-panel-quickstart-back-button"]').click();
      cy.get('[data-ouia-component-id="help-panel-quickstart-overview"]').should('exist');
      cy.contains('h2', 'Test Quickstart Title').should('be.visible');
    });

    it('should navigate to previous task when clicking Back', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      // Go to second task
      cy.get('[data-ouia-component-id="help-panel-quickstart-task-1"]').click();
      cy.contains('Second Task').should('be.visible');
      // Click back
      cy.get('[data-ouia-component-id="help-panel-quickstart-back-button"]').click();
      cy.contains('First Task').should('be.visible');
    });

    it('should restart quickstart when clicking Restart', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      // Go to second task
      cy.get('[data-ouia-component-id="help-panel-quickstart-task-1"]').click();
      cy.contains('Second Task').should('be.visible');
      // Click restart
      cy.get('[data-ouia-component-id="help-panel-quickstart-restart-button"]').click();
      // Should be back on first task
      cy.contains('First Task').should('be.visible');
      cy.contains('1 of 3').should('be.visible');
    });
  });

  describe('Task Content', () => {
    it('should render task description with markdown', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('[data-ouia-component-id="help-panel-quickstart-start-button"]').click();
      cy.get('.lr-c-task-description').within(() => {
        cy.get('strong').should('contain.text', 'bold text');
        cy.get('code').should('contain.text', 'inline code');
      });
    });

    it('should render "Check your work" section with review instructions', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('[data-ouia-component-id="help-panel-quickstart-start-button"]').click();
      cy.contains('h4', 'Check your work').should('be.visible');
      cy.contains('Did you complete the first task?').should('be.visible');
    });

  });

  describe('Task Review', () => {
    it('should show Yes/No radio buttons for review', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('[data-ouia-component-id="help-panel-quickstart-start-button"]').click();
      cy.contains('label', 'Yes').should('be.visible');
      cy.contains('label', 'No').should('be.visible');
    });

    it('should show failed help text when selecting No', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('[data-ouia-component-id="help-panel-quickstart-start-button"]').click();
      cy.contains('label', 'No').click();
      cy.contains('Try again if you failed.').should('be.visible');
    });

    it('should navigate to next task when clicking Next', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('[data-ouia-component-id="help-panel-quickstart-start-button"]').click();
      cy.get('[data-ouia-component-id="help-panel-quickstart-next-button"]').click();
      cy.contains('Second Task').should('be.visible');
      cy.contains('2 of 3').should('be.visible');
    });
  });

  describe('Progress Tracking', () => {
    it('should not show progress bar initially', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('.pf-v6-c-progress').should('not.exist');
    });

    it('should show progress bar after completing a task', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      // Start and complete first task
      cy.get('[data-ouia-component-id="help-panel-quickstart-start-button"]').click();
      cy.contains('label', 'Yes').click();
      // Go to next task then back to overview
      cy.get('[data-ouia-component-id="help-panel-quickstart-next-button"]').click();
      cy.get('[data-ouia-component-id="help-panel-quickstart-back-button"]').click();
      cy.get('[data-ouia-component-id="help-panel-quickstart-back-button"]').click();
      // Progress bar should be visible
      cy.get('.pf-v6-c-progress').should('be.visible');
      cy.contains('1 of 3 tasks completed').should('be.visible');
    });

    it('should show checkmark icon for completed tasks in overview', () => {
      const mockData = createMockQuickstart();
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      // Complete first task
      cy.get('[data-ouia-component-id="help-panel-quickstart-start-button"]').click();
      cy.contains('label', 'Yes').click();
      // Navigate back to overview via Back button
      cy.get('[data-ouia-component-id="help-panel-quickstart-back-button"]').click();
      // First task should have checkmark
      cy.get('[data-ouia-component-id="help-panel-quickstart-task-0"]').within(() => {
        cy.get('.lr-c-task-icon--success').should('exist');
        cy.get('.lr-c-task-number').should('not.exist');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle quickstart with no tasks', () => {
      const mockData = createMockQuickstart({ tasks: [] });
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.contains('h2', 'Test Quickstart Title').should('be.visible');
      cy.contains('In this quick start').should('not.exist');
      cy.get('[data-ouia-component-id="help-panel-quickstart-start-button"]').should('not.exist');
    });

    it('should handle task without review section', () => {
      const mockData = createMockQuickstart({
        tasks: [
          {
            title: 'Task Without Review',
            description: 'Just a description',
          },
        ],
      });
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('[data-ouia-component-id="help-panel-quickstart-start-button"]').click();
      cy.contains('h3', 'Task Without Review').should('be.visible');
      cy.contains('Check your work').should('not.exist');
    });

    it('should handle task without description', () => {
      const mockData = createMockQuickstart({
        tasks: [
          {
            title: 'Task Without Description',
            review: {
              instructions: 'Review this',
              failedTaskHelp: 'Help text',
            },
          },
        ],
      });
      cy.mount(
        <TestWrapper>
          <QuickstartPanel quickstartData={mockData} />
        </TestWrapper>
      );
      cy.get('[data-ouia-component-id="help-panel-quickstart-start-button"]').click();
      cy.contains('h3', 'Task Without Description').should('be.visible');
      cy.get('.lr-c-task-description').should('not.exist');
    });
  });
});
