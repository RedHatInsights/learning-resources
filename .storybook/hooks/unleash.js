/**
 * Mock @unleash/proxy-client-react for Storybook
 * Based on insights-rbac-ui pattern
 */

const enabledFlags = new Set([
  'platform.chrome.help-panel_search',
]);

// Mock useFlag hook - returns true for explicitly enabled flags
export const useFlag = (flagName) => enabledFlags.has(flagName);

// Mock other exports
export const FlagProvider = ({ children }) => children;
export const UnleashClient = class {};
export const useUnleashContext = () => ({});
export const useVariant = () => ({ name: 'disabled', enabled: false });
export const useFlags = () =>
  [...enabledFlags].map((name) => ({ name, enabled: true }));
