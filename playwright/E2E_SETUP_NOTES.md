# E2E Test Setup and Troubleshooting Notes

## Setup Required

### Environment Variables
```bash
E2E_USER=<E2E_USER_PLACEHOLDER>
E2E_PASSWORD='<E2E_PASSWORD_PLACEHOLDER>'
E2E_PROXY=<E2E_PROXY_PLACEHOLDER>
```

**Note:** Contact your team for test account credentials. Do not commit real credentials to this repository.

### Running Tests Locally

```bash
# Single test file
E2E_USER=<E2E_USER_PLACEHOLDER> E2E_PASSWORD='<E2E_PASSWORD_PLACEHOLDER>' E2E_PROXY=<E2E_PROXY_PLACEHOLDER> npx playwright test help-panel-learn-tab.spec.ts

# All help panel tests
E2E_USER=<E2E_USER_PLACEHOLDER> E2E_PASSWORD='<E2E_PASSWORD_PLACEHOLDER>' E2E_PROXY=<E2E_PROXY_PLACEHOLDER> npx playwright test help-panel
```

## Key Issues Resolved

### 1. Proxy Support Was Missing
**Problem:** The `@redhat-cloud-services/playwright-test-auth` package's global setup didn't pass the proxy configuration to the browser context.

**Solution:** Created custom global setup at `playwright/global-setup-with-proxy.ts` that properly passes the proxy from `playwright.config.ts`:

```typescript
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  baseURL: baseURL as string,
  proxy: proxy, // FIX: Pass proxy config from playwright.config.ts
});
```

### 2. Default Stage URL Was Placeholder
**Problem:** Config had `https://stage.foo.redhat.com:1337` as default.

**Solution:** Updated to real stage URL: `https://console.stage.redhat.com`

### 3. SSO Redirect Detection
**Finding:** Navigating to `/` triggers SSO redirect to:
```text
https://sso.stage.redhat.com/auth/realms/redhat-external/protocol/openid-connect/auth...
```

This is the expected behavior for unauthenticated users.

## Configuration Files

### playwright.config.ts
- Added proxy support: `...(process.env.E2E_PROXY && { proxy: { server: process.env.E2E_PROXY } })`
- Changed global setup to custom version: `./playwright/global-setup-with-proxy.ts`
- Updated default baseURL to `https://console.stage.redhat.com`

### playwright/global-setup-with-proxy.ts
Custom global setup that:
1. Reads proxy config from playwright.config.ts
2. Passes it to browser context
3. Performs SSO login
4. Saves authentication state to `./playwright/.auth/user.json`

## Current Test Status

### Learn Tab
- ✅ 2/6 tests passing
- ❌ 4/6 tests failing due to missing learning resources data
  - Likely stage environment doesn't have data for this user
  - Or API calls need longer timeouts

### Known Issues
1. **Empty Data State:** Some tests expect learning resources to be present but stage might not have seeded data for the test user
2. **Timing Issues:** Some assertions timeout waiting for elements (10s default)
3. **Bookmark buttons:** Not found, possibly no resources to bookmark

## Debugging Tips

### Run with headed mode (see browser)
```bash
E2E_USER=... E2E_PASSWORD=... E2E_PROXY=... npx playwright test help-panel-learn-tab.spec.ts --headed
```

### Generate trace for debugging
```bash
E2E_USER=... E2E_PASSWORD=... E2E_PROXY=... npx playwright test help-panel-learn-tab.spec.ts --trace on
npx playwright show-trace trace.zip
```

## CI/CD Considerations

In Tekton pipeline:
- Proxy is handled by Caddy server
- Credentials should come from vault/secrets
- Tests run in `mcr.microsoft.com/playwright:v1.59.0-jammy` container

## Next Steps

1. **Investigate data availability:** Check if learning resources exist on stage for test users
2. **Increase timeouts:** Some API calls might need longer than 15s on stage
3. **Add conditional checks:** Handle empty states gracefully in tests
4. **Alternative test users:** Consider using different test accounts with known data
