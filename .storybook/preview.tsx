import type { Preview } from '@storybook/react-webpack5';
import '@patternfly/react-core/dist/styles/base.css';
import React from 'react';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { defaultMockChrome } from './mocks/chromeMock';

// Set up global chrome mock immediately
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.insights = { chrome: defaultMockChrome };
}

const preview: Preview = {
  beforeAll: async () => {
    // Initialize MSW with error on unhandled requests to catch missing mocks
    initialize({ onUnhandledRequest: 'warn' });
  },
  loaders: [mswLoader],
  parameters: {
    options: {
      storySort: {
        method: 'alphabetical',
        order: ['Documentation', 'User Journeys', 'Components', '*'],
      },
    },
    layout: 'fullscreen',
    actions: { argTypesRegex: '^on.*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
