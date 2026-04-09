import { Page, expect } from '@playwright/test';

// Re-export authentication utilities from shared package
export {
  disableCookiePrompt,
  login,
} from '@redhat-cloud-services/playwright-test-auth';

// Local utility - Path for learning resources
export const LEARNING_RESOURCES_PATH = '/learning-resources';

// Waits for the count to be within the specified range, then returns it
// This handles React rendering timing and filter application delays
export async function waitForCountInRange(page: Page, minCount: number, maxCount: number, timeout: number = 20000): Promise<number> {
  // Target the tab that shows a number (avoids matching placeholder "All learning resources ()")
  const countElement = page.getByText(/All learning resources \(\d+\)/).first();

  // Wait for element to exist
  await countElement.waitFor({ state: 'attached', timeout });

  // Poll until count is within range
  await expect(async () => {
    const text = await countElement.textContent();
    const match = text?.match(/All learning resources \((\d+)\)/);

    if (!match || !match[1]) {
      throw new Error(`Count not yet rendered: "${text}"`);
    }

    const count = parseInt(match[1], 10);

    if (isNaN(count)) {
      throw new Error(`Invalid count: "${match[1]}"`);
    }

    // Verify count is within expected range
    expect(count).toBeGreaterThanOrEqual(minCount);
    expect(count).toBeLessThanOrEqual(maxCount);
  }).toPass({ timeout });

  // Extract final count
  const text = await countElement.textContent();
  const match = text?.match(/All learning resources \((\d+)\)/);
  return parseInt(match![1], 10);
}

// Extracts the count from "All learning resources (N)" text
// Use waitForCountInRange if you need to wait for a specific range after filtering
export async function extractResourceCount(page: Page): Promise<number> {
  // Target the tab that already shows a number (avoids matching placeholder "All learning resources ()")
  const countElement = page.getByText(/All learning resources \(\d+\)/);

  await expect(countElement).toBeAttached({ timeout: 20000 });

  const countText = await countElement.first().textContent();
  const match = countText?.match(/All learning resources \((\d+)\)/);

  if (!match || !match[1]) {
    throw new Error(`Failed to extract valid count from text: "${countText}"`);
  }

  const actualCount = parseInt(match[1], 10);

  if (isNaN(actualCount) || actualCount <= 0) {
    throw new Error(`Failed to parse valid positive count from text: "${countText}". Extracted: "${match[1]}"`);
  }

  return actualCount;
}
