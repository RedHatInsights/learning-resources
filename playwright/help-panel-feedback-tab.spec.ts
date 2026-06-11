import { test, expect } from '@playwright/test';
import { disableCookiePrompt } from './test-utils';

test.describe('help panel - Feedback tab', () => {
  test.beforeEach(async ({ page }): Promise<void> => {
    // Block trustarc cookie prompts
    await disableCookiePrompt(page);

    // Navigate to dashboard - authentication state is already loaded from global setup
    await page.goto('/', { waitUntil: 'load', timeout: 60000 });

    // Tier 1: Wait for chrome header to be fully loaded
    await expect(page.getByText('Hi,')).toBeVisible();

    // Open help panel
    await page.getByLabel('Toggle help panel').click();
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Navigate to Feedback subtab (nested under "Find help" in current deployed version)
    const feedbackTab = page.locator('[data-ouia-component-id="help-panel-tab-feedback"]');
    await feedbackTab.click();

    // Wait for feedback panel to load
    await page.waitForTimeout(1000);
  });

  test('displays feedback home with three options', async ({ page }) => {
    // Verify main title
    await expect(page.getByRole('heading', { name: /tell us about your experience/i })).toBeVisible();

    // Verify description with support link
    const supportLink = page.getByRole('link', { name: /open a support case/i });
    await expect(supportLink).toBeVisible();
    await expect(supportLink).toHaveAttribute('href', /support\/cases/);

    // Verify all three feedback cards are present
    await expect(page.getByText(/share general feedback/i)).toBeVisible();
    await expect(page.getByText(/report a bug/i)).toBeVisible();
    await expect(page.getByText(/inform the direction of red hat/i)).toBeVisible();

    // Verify card descriptions
    await expect(page.getByText(/what has your console experience/i)).toBeVisible();
    await expect(page.getByText(/describe the bug/i)).toBeVisible();
    await expect(page.getByText(/learn about opportunities to share your feedback/i)).toBeVisible();
  });

  test('opens Share Feedback form', async ({ page }) => {
    // Click "Share feedback" card
    const shareFeedbackCard = page.getByText(/what has your console experience/i);
    await shareFeedbackCard.click();

    await page.waitForTimeout(500);

    // Verify form is displayed by checking breadcrumb
    await expect(page.locator('.pf-v6-c-breadcrumb__item', { hasText: /share general feedback/i })).toBeVisible();

    // Verify textarea is present
    const textarea = page.locator('#feedback-description-text');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute('placeholder', /add your general feedback here/i);

    // Verify research opportunities checkbox
    const checkbox = page.locator('#feedback-checkbox');
    await expect(checkbox).toBeVisible();

    // Verify submit button
    await expect(page.getByRole('button', { name: /submit feedback/i })).toBeVisible();

    // Verify back button
    await expect(page.locator('button.pf-v6-c-button.pf-m-secondary', { hasText: /back/i })).toBeVisible();
  });

  test('displays email when research checkbox is checked - Share Feedback', async ({ page }) => {
    // Open Share Feedback form
    const shareFeedbackCard = page.getByText(/what has your console experience/i);
    await shareFeedbackCard.click();
    await page.waitForTimeout(500);

    // Check research opportunities checkbox
    const checkbox = page.locator('#feedback-checkbox');
    await checkbox.check();

    // Wait for email panel to appear
    await page.waitForTimeout(500);

    // Verify email is displayed in a raised panel
    const emailPanel = page.locator('.pf-v6-c-panel.pf-m-raised');
    await expect(emailPanel).toBeVisible();

    // Email should be displayed (format: user@example.com)
    const emailText = await emailPanel.textContent();
    expect(emailText).toMatch(/@/);
  });

  test('opens Report Bug form', async ({ page }) => {
    // Click "Report a bug" card
    const reportBugCard = page.getByText(/describe the bug/i);
    await reportBugCard.click();

    await page.waitForTimeout(500);

    // Verify form is displayed by checking breadcrumb
    await expect(page.locator('.pf-v6-c-breadcrumb__item', { hasText: /report a bug/i })).toBeVisible();

    // Verify support case link in description
    const supportLink = page.getByRole('link', { name: /open a support case/i });
    await expect(supportLink).toBeVisible();

    // Verify textarea is present
    const textarea = page.locator('#feedback-description-text');
    await expect(textarea).toBeVisible();

    // Verify research opportunities checkbox
    const checkbox = page.locator('#feedback-checkbox');
    await expect(checkbox).toBeVisible();

    // Verify submit button
    await expect(page.getByRole('button', { name: /submit feedback/i })).toBeVisible();

    // Verify back button
    await expect(page.locator('button.pf-v6-c-button.pf-m-secondary', { hasText: /back/i })).toBeVisible();
  });

  test('displays email when research checkbox is checked - Report Bug', async ({ page }) => {
    // Open Report Bug form
    const reportBugCard = page.getByText(/describe the bug/i);
    await reportBugCard.click();
    await page.waitForTimeout(500);

    // Check research opportunities checkbox
    const checkbox = page.locator('#feedback-checkbox');
    await checkbox.check();

    // Wait for email panel to appear
    await page.waitForTimeout(500);

    // Verify email is displayed
    const emailPanel = page.locator('.pf-v6-c-panel.pf-m-raised');
    await expect(emailPanel).toBeVisible();

    const emailText = await emailPanel.textContent();
    expect(emailText).toMatch(/@/);
  });

  test('opens Research Opportunities form', async ({ page }) => {
    // Click "Inform Red Hat's direction" card
    const researchCard = page.getByText(/learn about opportunities to share your feedback/i);
    await researchCard.click();

    await page.waitForTimeout(500);

    // Verify form is displayed by checking breadcrumb
    await expect(page.locator('.pf-v6-c-breadcrumb__item', { hasText: /inform the direction of red hat/i })).toBeVisible();

    // Verify user research team link in description
    const researchLink = page.getByRole('link', { name: /user research team/i });
    await expect(researchLink).toBeVisible();
    await expect(researchLink).toHaveAttribute('href', /redhat\.com.*user-research/);

    // Verify textarea is NOT present (hidden for research form)
    const textarea = page.locator('#feedback-description-text');
    await expect(textarea).not.toBeVisible();

    // Verify checkbox is present
    const checkbox = page.locator('#feedback-checkbox');
    await expect(checkbox).toBeVisible();

    // Verify submit button (should say "Join mailing list")
    await expect(page.getByRole('button', { name: /join mailing list/i })).toBeVisible();

    // Verify back button
    await expect(page.locator('button.pf-v6-c-button.pf-m-secondary', { hasText: /back/i })).toBeVisible();
  });

  test('displays email when checkbox is checked - Research Opportunities', async ({ page }) => {
    // Open Research Opportunities form
    const researchCard = page.getByText(/learn about opportunities to share your feedback/i);
    await researchCard.click();
    await page.waitForTimeout(500);

    // Check the checkbox
    const checkbox = page.locator('#feedback-checkbox');
    await checkbox.check();

    // Wait for email panel to appear
    await page.waitForTimeout(500);

    // Verify email is displayed
    const emailPanel = page.locator('.pf-v6-c-panel.pf-m-raised');
    await expect(emailPanel).toBeVisible();

    const emailText = await emailPanel.textContent();
    expect(emailText).toMatch(/@/);
  });

  test('navigates back from form to home using Back button', async ({ page }) => {
    // Open Share Feedback form
    const shareFeedbackCard = page.getByText(/what has your console experience/i);
    await shareFeedbackCard.click();
    await page.waitForTimeout(500);

    // Verify form is displayed
    await expect(page.locator('.pf-v6-c-breadcrumb__item', { hasText: /share general feedback/i })).toBeVisible();

    // Click Back button (be specific to avoid ambiguity - use the secondary button class)
    const backButton = page.locator('button.pf-v6-c-button.pf-m-secondary', { hasText: /back/i });
    await backButton.click();

    await page.waitForTimeout(500);

    // Verify we're back at home
    await expect(page.getByRole('heading', { name: /tell us about your experience/i })).toBeVisible();
    await expect(page.getByText(/what has your console experience/i)).toBeVisible();
  });

  test('navigates back from form to home using breadcrumb', async ({ page }) => {
    // Open Report Bug form
    const reportBugCard = page.getByText(/describe the bug/i);
    await reportBugCard.click();
    await page.waitForTimeout(500);

    // Verify form is displayed
    await expect(page.locator('.pf-v6-c-breadcrumb__item', { hasText: /report a bug/i })).toBeVisible();

    // Click the first breadcrumb link/button (home) to navigate back
    // In PF6, the clickable element is inside the breadcrumb item
    const firstBreadcrumbLink = page.locator('.pf-v6-c-breadcrumb__item a, .pf-v6-c-breadcrumb__item button').first();
    await firstBreadcrumbLink.click();
    await page.waitForTimeout(500);

    // Verify we're back at home
    await expect(page.getByRole('heading', { name: /tell us about your experience/i })).toBeVisible();
  });

  test('validates required fields before submission', async ({ page }) => {
    // Open Share Feedback form
    const shareFeedbackCard = page.getByText(/what has your console experience/i);
    await shareFeedbackCard.click();
    await page.waitForTimeout(500);

    // Try to submit without filling textarea
    const submitButton = page.getByRole('button', { name: /submit feedback/i });
    await expect(submitButton).toBeVisible();

    // Submit button might be disabled or show validation error
    const isDisabled = await submitButton.isDisabled();

    if (!isDisabled) {
      // Click submit and check for validation
      await submitButton.click();
      await page.waitForTimeout(500);

      // Should still be on form (not submitted) - check breadcrumb
      await expect(page.locator('.pf-v6-c-breadcrumb__item', { hasText: /share general feedback/i })).toBeVisible();
    } else {
      console.log('✓ Submit button disabled when required field is empty');
    }

    // Fill in textarea
    const textarea = page.locator('#feedback-description-text');
    await textarea.fill('This is my feedback about the console.');

    // Now submit button should be enabled or form should be valid
    await expect(submitButton).toBeEnabled();
  });

  test('can fill out complete feedback form', async ({ page }) => {
    // Open Share Feedback form
    const shareFeedbackCard = page.getByText(/what has your console experience/i);
    await shareFeedbackCard.click();
    await page.waitForTimeout(500);

    // Fill in textarea
    const textarea = page.locator('#feedback-description-text');
    await textarea.fill('The console is great! I really enjoy using the new dashboard features.');

    // Check research opportunities checkbox
    const checkbox = page.locator('#feedback-checkbox');
    await checkbox.check();

    // Verify email appears
    await expect(page.locator('.pf-v6-c-panel.pf-m-raised')).toBeVisible();

    // Verify submit button is enabled
    const submitButton = page.getByRole('button', { name: /submit feedback/i });
    await expect(submitButton).toBeEnabled();

    // Note: We don't actually submit because it requires real API endpoints
    // In production/stage, clicking submit would send the feedback
    console.log('✓ Feedback form can be completely filled out');
  });

  test('external links open in new tabs', async ({ page }) => {
    // Verify "Open a support case" link behavior
    const supportLink = page.getByRole('link', { name: /open a support case/i }).first();
    await expect(supportLink).toHaveAttribute('target', '_blank');
    await expect(supportLink).toHaveAttribute('rel', /noreferrer/);

    // Open Report Bug form
    const reportBugCard = page.getByText(/describe the bug/i);
    await reportBugCard.click();
    await page.waitForTimeout(500);

    // Verify support link in description
    const formSupportLink = page.getByRole('link', { name: /open a support case/i });
    await expect(formSupportLink).toHaveAttribute('target', '_blank');
    await expect(formSupportLink).toHaveAttribute('rel', /noreferrer/);

    // Go back and open Research form (be specific to avoid ambiguity)
    const backButton = page.locator('button.pf-v6-c-button.pf-m-secondary', { hasText: /back/i });
    await backButton.click();
    await page.waitForTimeout(500);

    const researchCard = page.getByText(/learn about opportunities to share your feedback/i);
    await researchCard.click();
    await page.waitForTimeout(500);

    // Verify user research team link
    const researchLink = page.getByRole('link', { name: /user research team/i });
    await expect(researchLink).toHaveAttribute('target', '_blank');
    await expect(researchLink).toHaveAttribute('rel', /noreferrer/);
  });
});
