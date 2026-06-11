/**
 * Mock @scalprum/react-core for Storybook
 * Based on insights-rbac-ui pattern
 */

// Mock Models object for virtual assistant
const mockModels = {
  ASK_RED_HAT: 'mock-ask-red-hat-model',
};

// Mock useLoadModule hook - returns mock module and loading: false
export const useLoadModule = () => [mockModels, { loading: false }];

// Mock useRemoteHook - returns empty hook result and loading: false
export const useRemoteHook = () => ({
  hookResult: [null, () => {}], // Mock state and setState
  loading: false
});

// Mock useGetState - returns empty state
export const useGetState = () => ({});

// Mock other exports that might be needed
export const initialize = () => {};
export const getScalprum = () => ({});
