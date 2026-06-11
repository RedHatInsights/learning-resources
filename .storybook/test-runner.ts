/**
 * Storybook Test Runner Configuration
 *
 * This configuration runs automated tests against all stories to catch
 * console errors and warnings that may indicate bugs.
 */

import type { TestRunnerConfig } from '@storybook/test-runner';
import type { Page } from '@playwright/test';

// Track errors per story
const storyErrors = new Map<string, string[]>();
// Track console listeners per story to clean them up
const storyListeners = new Map<string, (msg: any) => void>();

/**
 * Error pattern with optional source scoping
 */
interface ErrorPattern {
  pattern: RegExp;
  label: string;
  source?: 'msw' | 'mock-route'; // Scope to specific sources
}

/**
 * Errors/warnings to ignore (scoped to test infrastructure)
 * These patterns only apply when they originate from MSW or mock routes
 */
const IGNORED_ERROR_PATTERNS: ErrorPattern[] = [
  // MSW mock API errors (intentional for testing error states)
  { pattern: /Failed to load resource.*status of (4\d{2}|5\d{2})/, label: 'MSW HTTP errors', source: 'msw' },
  { pattern: /Failed to load resource.*net::ERR_FAILED/, label: 'Network failures', source: 'msw' },
  { pattern: /AxiosError/, label: 'Axios errors', source: 'msw' },
  { pattern: /SyntaxError: Unexpected token.*Not Found.*is not valid JSON/, label: '404 HTML responses', source: 'msw' },

  // Storybook/Testing Library informational warnings (not scoped)
  { pattern: /You are using Testing Library's `screen` object/, label: 'Testing Library screen warning' },

  // MSW informational logs (scoped to MSW)
  { pattern: /MSW.*mock/i, label: 'MSW logs', source: 'msw' },
  { pattern: /^Request \{url:/, label: 'MSW request logs', source: 'msw' },
  { pattern: /^Handler:/, label: 'MSW handler logs', source: 'msw' },
  { pattern: /^Response \{status:/, label: 'MSW response logs', source: 'msw' },
  { pattern: /Worker script URL:/, label: 'MSW worker setup', source: 'msw' },
  { pattern: /Worker scope:/, label: 'MSW worker setup', source: 'msw' },

  // Add more patterns as needed when stories are created
];

/**
 * Critical error patterns that should fail tests
 */
const CRITICAL_ERROR_PATTERNS = [
  // React warnings that indicate real bugs
  /Warning: Failed.*type:/,
  /Warning: A props object containing a "key" prop is being spread/,
  /Warning: Encountered two children with the same key/,
  /Warning: Each child in a list should have a unique "key" prop/,
  /Warning: validateDOMNesting/,
  /Warning: Cannot update a component.*while rendering a different component/,

  // JavaScript runtime errors
  /Uncaught/,
  /TypeError/,
  /ReferenceError/,
  /Cannot read propert/,
  /is not a function/,

  // Router and i18n errors
  /No routes matched location/,
  /@formatjs\/intl Error FORMAT_ERROR/,
];

/**
 * Check if error should be ignored based on scoping rules
 * @param errorText - The console error/warning text
 * @param storyParameters - Story parameters (can contain ignoreConsoleErrors list)
 */
function shouldIgnoreError(errorText: string, storyParameters?: any): boolean {
  // Check if error is from MSW/mock infrastructure
  const isMswError = /msw|mock|handler|worker|AxiosError/i.test(errorText) ||
                     /Failed to load resource/.test(errorText);

  for (const { pattern, source } of IGNORED_ERROR_PATTERNS) {
    // If pattern has a source requirement, only match if error is from that source
    if (source && !isMswError) {
      continue;
    }

    if (pattern.test(errorText)) {
      return true;
    }
  }

  // Check story-specific ignore patterns if provided
  if (storyParameters?.testRunner?.ignoreConsoleErrors) {
    const ignorePatterns = storyParameters.testRunner.ignoreConsoleErrors;
    if (Array.isArray(ignorePatterns)) {
      return ignorePatterns.some((p: string | RegExp) => {
        const regex = typeof p === 'string' ? new RegExp(p) : p;
        return regex.test(errorText);
      });
    }
  }

  return false;
}

function isCriticalError(errorText: string): boolean {
  return CRITICAL_ERROR_PATTERNS.some((pattern) => pattern.test(errorText));
}

const config: TestRunnerConfig = {
  async preVisit(page: Page, context) {
    const { id, tags, parameters } = context;

    // Skip stories with 'test-skip' tag
    if (tags?.includes('test-skip')) {
      return;
    }

    // Set viewport size (matches Chromatic default)
    await page.setViewportSize({ width: 1200, height: 500 });

    // Initialize error collection for this story
    storyErrors.set(id, []);

    // Create a named console listener for this story
    const consoleListener = async (msg: any) => {
      const text = msg.text();
      const type = msg.type();

      // Only process warnings and errors
      if (type === 'warning' || type === 'error') {
        // Skip ignored patterns (with story parameter support)
        if (shouldIgnoreError(text, parameters)) {
          return;
        }

        console.log(`[BROWSER ${type.toUpperCase()}]: ${text}`);

        // Collect errors
        if (type === 'error') {
          const errors = storyErrors.get(id) || [];
          errors.push(text);
          storyErrors.set(id, errors);
        }

        // Collect critical warnings
        if (type === 'warning' && isCriticalError(text)) {
          const errors = storyErrors.get(id) || [];
          errors.push(text);
          storyErrors.set(id, errors);
        }
      }
    };

    // Store the listener so we can remove it later
    storyListeners.set(id, consoleListener);

    // Attach console listener to capture errors/warnings
    page.on('console', consoleListener);
  },

  async postVisit(page: Page, context) {
    const { id, title, name, tags } = context;

    // Skip stories with 'test-skip' tag
    if (tags?.includes('test-skip')) {
      return;
    }

    // Remove the console listener for this story
    const consoleListener = storyListeners.get(id);
    if (consoleListener) {
      page.off('console', consoleListener);
      storyListeners.delete(id);
    }

    const errors = storyErrors.get(id) || [];
    storyErrors.delete(id);

    // Fail the test if critical errors were found
    if (errors.length > 0) {
      const errorSummary = errors
        .map((err, i) => `  ${i + 1}. ${err.substring(0, 200)}${err.length > 200 ? '...' : ''}`)
        .join('\n');

      throw new Error(
        `Story "${title} > ${name}" failed due to ${errors.length} critical console error(s):\n\n${errorSummary}\n\n` +
          `These errors may indicate bugs that need to be fixed.\n` +
          `If these are intentional/expected errors, add them to IGNORED_ERROR_PATTERNS in test-runner.ts\n` +
          `or use story parameters: { testRunner: { ignoreConsoleErrors: [/pattern/] } }`
      );
    }
  },

  tags: {
    skip: ['test-skip'],
  },
};

export default config;
