/**
 * Mock @unleash/proxy-client-react for Storybook
 * Based on insights-rbac-ui pattern
 */

const enabledFlags = [
  { name: 'platform.chrome.help-panel_search', enabled: true },
];

export const useFlag = (flagName) => {
  const match = enabledFlags.find((f) => f.name === flagName);
  return match ? match.enabled : false;
};

export const FlagProvider = ({ children }) => children;
export const UnleashClient = class {};
export const useUnleashContext = () => ({});
export const useVariant = () => ({ name: 'disabled', enabled: false });
export const useFlags = () => enabledFlags;
