# Help Panel User Journey Template

This template shows how to create a new Help Panel tab user journey using the shared helpers.

## Example: Creating an "APIs" Tab Journey

```typescript
import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { expect, waitFor, within } from 'storybook/test';
import { AppEntryWithRouter } from './_shared/components/AppEntryWithRouter';
import {
  helpPanelMswHandlers,
  waitForPageLoad,
  openHelpPanel,
  navigateToTab,
} from './_shared/helpPanelJourneyHelpers';

/**
 * User Journey: Help Panel - APIs Tab
 *
 * Tests the API documentation discovery workflow.
 */

const meta: Meta<typeof AppEntryWithRouter> = {
  title: 'User Journeys/Help Panel/APIs Tab',
  component: AppEntryWithRouter,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: helpPanelMswHandlers,
    },
    docs: {
      description: {
        component: `
# Help Panel - APIs Tab User Journey

Tests the API documentation discovery workflow.
        `,
      },
    },
  },
  args: {
    initialRoute: '/',
    bundle: 'insights',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Manual Testing Entry Point
 */
export const ManualTesting: Story = {};

/**
 * 01 / Page Loads
 */
export const Step01_PageLoads: Story = {
  name: '01 / Page Loads',
  play: async ({ canvasElement }) => {
    await waitForPageLoad(canvasElement);
  },
};

/**
 * 02 / Open Help Panel
 */
export const Step02_OpenHelpPanel: Story = {
  name: '02 / Open Help Panel',
  play: async ({ canvasElement }) => {
    await openHelpPanel(canvasElement);
  },
};

/**
 * 03 / Navigate to APIs Tab
 */
export const Step03_NavigateToAPIsTab: Story = {
  name: '03 / Navigate to APIs Tab',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Navigate to APIs tab
    await navigateToTab(canvasElement, 'APIs');

    // Wait for API documentation content to load
    await waitFor(
      async () => {
        const apiContent = canvas.queryByText(/API documentation/i);
        if (!apiContent) {
          throw new Error('APIs tab content did not load');
        }
      },
      { timeout: 5000 }
    );

    console.log('UJ: ✅ APIs tab verified and content loaded');
  },
};

/**
 * 04 / Filter API Documentation
 * Add your specific test steps here
 */
export const Step04_FilterAPIDocumentation: Story = {
  name: '04 / Filter API Documentation',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Navigate to APIs tab
    await navigateToTab(canvasElement, 'APIs');

    // Your tab-specific test logic here
    // Example: Select a filter, verify results, etc.

    console.log('UJ: ✅ API documentation filtered successfully');
  },
};
```

## Available Helper Functions

### `helpPanelMswHandlers`
Array of MSW handlers that mock the learning resources API endpoints (filters, quickstarts, favorites).

**Usage:**
```typescript
parameters: {
  msw: {
    handlers: helpPanelMswHandlers,
  },
}
```

### `waitForPageLoad(canvasElement)`
Waits for the console page to load and verifies the Help button and header are present.

**Usage:**
```typescript
play: async ({ canvasElement }) => {
  await waitForPageLoad(canvasElement);
}
```

### `openHelpPanel(canvasElement)`
Opens the Help Panel drawer and verifies it opened successfully.

**Usage:**
```typescript
play: async ({ canvasElement }) => {
  await openHelpPanel(canvasElement);
}
```

### `navigateToTab(canvasElement, tabName)`
Opens the Help Panel and navigates to the specified tab.

**Parameters:**
- `canvasElement`: The Storybook canvas element
- `tabName`: The name of the tab (e.g., "Learn", "APIs", "Support", "Feedback")

**Usage:**
```typescript
play: async ({ canvasElement }) => {
  await navigateToTab(canvasElement, 'APIs');
  // Now the APIs tab is active
}
```

## Tips

1. **Always use the shared helpers** for common operations (page load, opening help panel, navigating to tabs)
2. **Focus on tab-specific logic** in your test steps
3. **Use descriptive step names** like "01 / Page Loads", "02 / Open Help Panel", "03 / Navigate to Tab"
4. **Add console.log statements** to track progress during test execution
5. **Use waitFor with timeouts** for async operations to avoid flaky tests
