# Help Panel E2E Tests

This directory contains comprehensive E2E tests for all Help Panel tabs, covering API integration and critical user flows on stage/production.

## Test Files

| File | JIRA Ticket | Description |
|------|-------------|-------------|
| `help-panel-learn-tab.spec.ts` | RHCLOUD-45255 | Tests learning resources API, filtering, bookmarking |
| `help-panel-api-tab.spec.ts` | RHCLOUD-45256 | Tests API documentation loading, bundle filtering |
| `help-panel-search-tab.spec.ts` | RHCLOUD-45258 | Tests search API, filters, recent queries, bookmarking/favoriting |
| `help-panel-support-tab.spec.ts` | RHCLOUD-45259 | Tests support cases API, empty state, external navigation |
| `help-panel-feedback-tab.spec.ts` | RHCLOUD-45774 | Tests feedback forms, bug reporting, research opportunities |

## What We Test

### ✅ Covered in E2E Tests
- **API Integration**: Real API calls to stage endpoints
- **Data Loading**: Verify resources load from backend
- **Filtering/Scoping**: Bundle filtering, content type filtering
- **Search Functionality**: Search execution, debouncing, result display
- **Bookmarking/Favoriting**: Persisting user preferences via API
- **External Navigation**: Links to Customer Portal, API docs
- **Form Interactions**: Filling forms, validation, state changes
- **Recent History**: localStorage persistence (search queries)
- **Empty States**: No data scenarios
- **Status Indicators**: Icons, labels, badges

### ❌ NOT Tested (Covered by Storybook/Unit Tests)
- **Pagination**: Common PatternFly table component
- **UI Component Rendering**: Component states, visual layouts
- **Filter Chip Interactions**: Removal, clearing
- **Debounce Timing**: Exact millisecond delays
- **Data Formatting**: String manipulation, date formatting

## Running the Tests

### Run all Help Panel E2E tests:
```bash
npm run test:e2e -- help-panel
```

### Run a specific tab:
```bash
npm run test:e2e -- help-panel-learn-tab
npm run test:e2e -- help-panel-api-tab
npm run test:e2e -- help-panel-search-tab
npm run test:e2e -- help-panel-support-tab
npm run test:e2e -- help-panel-feedback-tab
```

### Run in headed mode (see browser):
```bash
npm run test:e2e -- help-panel-learn-tab --headed
```

### Run specific test:
```bash
npm run test:e2e -- help-panel-learn-tab -g "loads learning resources from API"
```

## Test Structure

Each test file follows this structure:

```typescript
test.describe('help panel - {Tab Name}', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Disable cookie prompts
    // 2. Navigate to dashboard
    // 3. Wait for chrome header
    // 4. Open help panel
    // 5. Navigate to specific tab
  });

  test('test case name', async ({ page }) => {
    // Test implementation
  });
});
```

## Key Patterns

### Waiting for API Responses
```typescript
// Wait for data to load
await expect(page.locator('[data-ouia-component-id="resource-list"]'))
  .toBeVisible({ timeout: 15000 });
```

### Testing External Links
```typescript
const popupPromise = page.waitForEvent('popup', { timeout: 10000 });
await linkButton.click();
const popup = await popupPromise;
expect(popup.url()).toMatch(/access\.redhat\.com/);
await popup.close();
```

### Extracting Counts
```typescript
const toolbar = page.locator('[data-ouia-component-id="toolbar"]');
const text = await toolbar.textContent();
const match = text?.match(/Results \((\d+)\)/);
const count = match ? parseInt(match[1], 10) : 0;
```

### Conditional Tests (Empty vs Data States)
```typescript
const emptyState = page.locator('[data-ouia-component-id="empty-state"]');
const isEmptyVisible = await emptyState.isVisible();

if (isEmptyVisible) {
  // Test empty state behavior
} else {
  // Test data display behavior
}
```

## Test Data Considerations

- Tests run against **real stage data**
- Support cases, bookmarks, and favorites may vary by user
- Some tests use conditional logic to handle empty states
- Search queries use common terms likely to return results
- Bundle filtering tests check for toggle visibility (not all pages have bundles)

## Debugging

### View test output with trace:
```bash
npm run test:e2e -- help-panel-learn-tab --trace on
```

### View detailed logs:
```bash
npm run test:e2e -- help-panel-learn-tab --debug
```

### Common Issues

1. **Timeout errors**: API is slow on stage, increase timeout in test
2. **Empty state when expecting data**: User has no bookmarks/cases/etc.
3. **Element not found**: Check data-ouia-component-id selector
4. **Popup blocked**: Browser may block new tabs in headless mode

## CI/CD Integration

These tests are designed to run on stage environment as part of E2E test suite:

```yaml
# Example CI configuration
- name: Run Help Panel E2E Tests
  run: npm run test:e2e -- help-panel
  env:
    PLAYWRIGHT_ENV: stage
```

## Coverage Summary

| Tab | Tests | API Calls Tested | Key Features |
|-----|-------|------------------|--------------|
| Learn | 7 | fetchAllData, bookmark API | Filtering, bookmarking, bundle scope |
| API | 5 | fetchBundleInfo, fetchBundles | Bundle filtering, external links |
| Search | 11 | fetchAllData, fetchBundles, favorites API | Search, filters, recent queries, bookmarking |
| Support | 8 | Support cases API | Empty state, case display, external links |
| Feedback | 12 | Feedback submission API | Forms, validation, breadcrumbs |
| **Total** | **43** | **Multiple APIs** | **Complete E2E coverage** |

## Next Steps

After running tests on stage:
1. Review any failures - may indicate real bugs or data issues
2. Update selectors if UI changes
3. Add new tests for new features
4. Maintain tests as APIs evolve
