# E2E Test Suite

This directory contains the Playwright E2E test suite for the Learning Resources Help Panel.

## Quick Start

### Prerequisites

- **VPN Connection**: Required to access `console.stage.redhat.com`
- **Node.js**: 20+
- **Playwright Browsers**: Install with `npx playwright install chromium`

### 1. Set Environment Variables

For local testing against stage, you need three environment variables:

```bash
export E2E_USER=<E2E_USER_PLACEHOLDER>
export E2E_PASSWORD='<E2E_PASSWORD_PLACEHOLDER>'
export E2E_PROXY=<E2E_PROXY_PLACEHOLDER>
```

**Credentials**: Contact your team for test account credentials. Do not commit real credentials to this repository.

**Proxy**: Required for local testing. The proxy is NOT needed in CI/CD (handled by Caddy).

### 2. Run Tests

```bash
# Run all Help Panel tests
npx playwright test

# Run specific tab
npx playwright test help-panel-learn-tab.spec.ts
npx playwright test help-panel-api-tab.spec.ts
npx playwright test help-panel-search-tab.spec.ts
npx playwright test help-panel-support-tab.spec.ts
npx playwright test help-panel-feedback-tab.spec.ts

# Run with visible browser
npx playwright test help-panel-learn-tab.spec.ts --headed

# Run specific test
npx playwright test help-panel-learn-tab.spec.ts -g "loads learning resources from API"
```

### One-Line Command

```bash
E2E_USER=<E2E_USER_PLACEHOLDER> E2E_PASSWORD='<E2E_PASSWORD_PLACEHOLDER>' E2E_PROXY=<E2E_PROXY_PLACEHOLDER> npx playwright test help-panel-learn-tab.spec.ts
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `E2E_USER` | Yes (local) | Username for stage authentication |
| `E2E_PASSWORD` | Yes (local) | Password for stage authentication |
| `E2E_PROXY` | Yes (local) | Proxy URL for routing through Red Hat network |
| `PLAYWRIGHT_BASE_URL` | No | Override target URL (default: `https://console.stage.redhat.com`) |

**Local vs CI/CD**:
- **Local**: All three env vars required (USER, PASSWORD, PROXY)
- **CI/CD**: Credentials from Vault, proxy handled by Caddy

---

## Test Coverage

### Test Files

| File | Tests | Description |
|------|-------|-------------|
| `help-panel-learn-tab.spec.ts` | 7 | Learning resources API, filtering, bookmarking |
| `help-panel-api-tab.spec.ts` | 5 | API documentation, bundle filtering |
| `help-panel-search-tab.spec.ts` | 11 | Search API, filters, recent queries |
| `help-panel-support-tab.spec.ts` | 8 | Support cases API, empty state |
| `help-panel-feedback-tab.spec.ts` | 12 | Feedback forms, bug reporting |
| **Total** | **43** | **Complete E2E coverage** |

### What We Test

✅ **Covered in E2E Tests**:
- API integration with real stage endpoints
- Data loading from backend services
- Filtering and scoping (bundle, content type)
- Search functionality and debouncing
- Bookmarking and favoriting
- External navigation (Customer Portal, API docs)
- Form interactions and validation
- localStorage persistence
- Empty states

❌ **NOT Tested** (covered by Storybook/unit tests):
- Pagination (common PatternFly table)
- Component rendering and visual layouts
- Filter chip interactions
- Debounce timing precision
- Data formatting utilities

See [`HELP_PANEL_E2E_TESTS.md`](./HELP_PANEL_E2E_TESTS.md) for detailed test documentation.

---

## Configuration Files

- **`playwright.config.ts`**: Main Playwright configuration
- **`global-setup-with-proxy.ts`**: Custom authentication with proxy support
- **`.auth/user.json`**: Saved authentication state (gitignored)

### Why Custom Global Setup?

The standard `@redhat-cloud-services/playwright-test-auth` package doesn't pass proxy configuration to the browser context during authentication. Our custom setup fixes this by explicitly passing the proxy from config to the browser context.

---

## Debugging

### View Traces

```bash
# Run with trace
npx playwright test help-panel-learn-tab.spec.ts --trace on

# View trace
npx playwright show-trace trace.zip
```

### Interactive Mode

```bash
# Step-through debugging
npx playwright test help-panel-learn-tab.spec.ts --debug

# UI mode
npx playwright test --ui
```

### View HTML Report

```bash
npx playwright show-report
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Lockdown page detected" | Proxy not configured or VPN disconnected | Set `E2E_PROXY` and connect to VPN |
| "Invalid login credentials" | Wrong username/password | Contact your team for test account credentials |
| Timeout waiting for elements | Stage environment missing data | Expected - tests are correct, stage data incomplete |
| Connection refused | Wrong URL or not on VPN | Use `https://console.stage.redhat.com` and connect VPN |

---

## CI/CD Integration

In Konflux pipelines:

```bash
# Credentials come from Vault
# Proxy is handled by Caddy (no E2E_PROXY needed)
npx playwright test
```

**Required Secrets**:
- `E2E_USER`
- `E2E_PASSWORD`

The proxy configuration is optional and only included when `E2E_PROXY` is set.

---

## Test Data Considerations

Tests run against **real stage data**:
- Support cases, bookmarks, and favorites vary by user
- Some tests use conditional logic for empty states
- Search queries use common terms likely to return results
- Bundle filtering tests adapt to available bundles

**Expected Test Failures**: Many tests currently fail on stage due to missing data for the test user. This indicates data issues, not test problems.

---

## Next Steps

After running tests:
1. Review failures - may indicate bugs or data gaps
2. Update selectors if UI changes
3. Add tests for new features
4. Maintain tests as APIs evolve

For detailed implementation patterns and examples, see [`HELP_PANEL_E2E_TESTS.md`](./HELP_PANEL_E2E_TESTS.md).
