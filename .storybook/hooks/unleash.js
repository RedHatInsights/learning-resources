/**
 * Mock @unleash/proxy-client-react for Storybook
 * Based on insights-rbac-ui pattern
 */

// List of enabled feature flags for Storybook
const ENABLED_FLAGS = [
  'platform.chrome.help-panel_knowledge-base', // Enable Knowledgebase tab
  'platform.chrome.help-panel_search', // Enable Search Tab
];

// Mock useFlag hook - returns true for enabled flags
export const useFlag = (flagName) => ENABLED_FLAGS.includes(flagName);

// Mock other exports
export const FlagProvider = ({ children }) => children;
export const UnleashClient = class {};
export const useUnleashContext = () => ({});
export const useVariant = () => ({ name: 'disabled', enabled: false });
export const useFlags = () =>
  ENABLED_FLAGS.map((name) => ({ name, enabled: true }));
