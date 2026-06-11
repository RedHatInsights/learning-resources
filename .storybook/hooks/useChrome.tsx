/**
 * Mock useChrome for Storybook
 * Based on insights-rbac-ui pattern
 */

import { defaultMockChrome } from '../mocks/chromeMock';

export default function useChrome() {
  // Return the mock chrome from window if available
  if (typeof window !== 'undefined' && window.insights?.chrome) {
    // @ts-ignore
    return window.insights.chrome;
  }

  // Fallback to shared mock
  return defaultMockChrome;
}

// Named export for compatibility
export { useChrome };
