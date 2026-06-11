import { test, expect } from '@playwright/test';
import { disableCookiePrompt, PAGE_LOAD_TIMEOUT, FEEDBACK_SUBMISSION_TIMEOUT, openHelpPanel, navigateToFeedbackTab, waitForHelpPanelTabsLoaded } from './test-utils';

/**
 * Feedback Tests
 *
 * Migrated from IQE: iqe_platform_ui/tests/test_feedback.py
 *
 * These tests verify that the feedback functionality works correctly in the help panel:
 * - Opening and closing feedback forms
 * - Submitting feedback and creating JIRA tickets in CRCFEEDBK project
 *
 * Requirements:
 * - PLATFORM_UI-FEEDBACK
 * - PLATFORM_UI-INSIGHTS_CHROME
 */

test.describe('Feedback - Help Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Block trustarc cookie prompts
    await disableCookiePrompt(page);

    // Navigate to home page - authentication state is already loaded from global setup
    await page.goto('/', { waitUntil: 'load', timeout: PAGE_LOAD_TIMEOUT });

    // Wait for chrome header to be fully loaded
    await expect(page.getByText('Hi,')).toBeVisible();
  });

  test('should open feedback form, test navigation, and submit successfully', async ({ page }) => {
    // Step 1-4: Open help panel and navigate to Feedback tab
    await openHelpPanel(page);
    await waitForHelpPanelTabsLoaded(page);
    await navigateToFeedbackTab(page);

    const feedbackHomeTitle = page.locator('[data-ouia-component-id="feedback-home-title"]');

    // Step 5: Test Back button navigation flow
    // Open form
    await page.getByText('Share general feedback').click();
    const feedbackTextarea = page.locator('#feedback-description-text');
    await expect(feedbackTextarea).toBeVisible();

    // Click Back and verify return to home
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(feedbackHomeTitle).toBeVisible();

    // Step 6: Test submission flow (restart from feedback home)
    // Open form again
    await page.getByText('Share general feedback').click();
    await expect(feedbackTextarea).toBeVisible();

    // Fill in feedback with random text
    const randomText = `AutoTest-${Math.random().toString(36).substring(2, 18)}`;
    await feedbackTextarea.fill(`Testing insights feedback submission via Playwright automation. Random ID: ${randomText}`);

    // Submit the feedback
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();

    // Step 7: Verify success message is displayed
    await expect(page.getByText(/feedback shared successfully/i)).toBeVisible({ timeout: FEEDBACK_SUBMISSION_TIMEOUT });
    await expect(page.getByText(/thank you/i)).toBeVisible();

    // Step 8: Verify success state shows "Share more feedback" option
    await expect(page.getByRole('button', { name: /share more feedback/i })).toBeVisible();

    // Note: Actual JIRA ticket verification is not performed in this automated test.
    // The feedback creates a ticket in https://issues.redhat.com/projects/CRCFEEDBK/issues/
    // Manual verification may be needed to confirm ticket creation with correct labels:
    // - learning-resources
    // - help-panel-feedback
  });
});
