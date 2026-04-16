# Agents Guide — learning-resources

## Non-Negotiable Conventions

1. **Always use npm scripts** — never call `jest`, `eslint`, `cypress`, `playwright`, or `npx` directly. Use `npm test`, `npm run lint`, etc.
2. **PatternFly 6** — this repo uses PF6 (`@patternfly/react-core@^6.4.0`). Follow PF6 API conventions.
3. **TypeScript strict mode** — all new code must be TypeScript. `noImplicitAny` is enforced.
4. **Colocate tests with source** — unit tests go next to the file they test (e.g., `Foo.test.tsx` beside `Foo.tsx`).
5. **Colocate stories with source** — Storybook stories use the `.stories.tsx` suffix next to the component.
6. **SCSS scoping** — all styles must be scoped under `.learning-resources` or `.learningResources` (configured in `fec.config.js` `sassPrefix`).
7. **Chrome API abstraction** — always access Chrome functionality via the `useChrome` hook from `@redhat-cloud-services/frontend-components/useChrome`. Never import Chrome internals or other Chrome packages directly.
8. **Feature flags via Unleash** — use `useFlag` / `useFlags` from `@unleash/proxy-client-react`. Never hardcode feature availability.
9. **No direct API calls in components** — new API calls go in `src/utils/fetch*.ts` or `src/utils/toggleFavorite.ts`. Components consume data via hooks or props. **Known exceptions** (legacy — migrate when touching these files): `GlobalLearningResourcesQuickstartItem.tsx`, `LearnPanel.tsx`, `SearchResultItem.tsx` have inline `axios.post` for favorites (should use `toggleFavorite.ts`); `SupportPanel.tsx` and `FeedbackForm.tsx` have inline `fetch` calls for support-cases/feedback APIs.
10. **Sort imports** — ESLint enforces `sort-imports` (declaration sort is ignored, but member sort is enforced).

## Project Structure

```
learning-resources/
  src/
    AppEntry.tsx              # Root app entry, module federation mount
    Creator.tsx               # Creator tool entry point
    Viewer.tsx                # Main viewer entry point
    Messages.ts               # react-intl message definitions
    components/
      GlobalLearningResourcesPage/  # Main catalog page
      HelpPanel/                     # Help panel (loaded by insights-chrome)
      LearningResourcesWidget/      # Bookmarked widget (exposed via MF)
      creator/                       # Creator wizard + YAML editor
      common/                        # Shared components
      user-journeys/                 # User journey components
    hooks/
      useFilterMap.ts          # Filter state management
      useQuickStarts.ts        # Quickstart data hook
    utils/
      fetchQuickstarts.ts      # API: quickstarts service
      fetchAllData.ts          # Orchestrates all API calls
      fetchFilters.ts          # API: filter categories
      fetchBundleInfoAPI.ts    # API: bundle metadata
      toggleFavorite.ts        # Favorite/unfavorite operations
      bundleUtils.ts           # Bundle URL/name mapping
      openQuickStartInHelpPanel.ts  # Cross-component event
    store/
      openQuickstartInHelpPanelStore.ts  # Scalprum shared store
    data/
      quickstart-templates.ts  # YAML templates for creator
    types/
      index.d.ts               # Global type declarations
  docs/                        # Existing documentation
    CREATOR_GUIDE.md           # Creator tool user guide
    TECHNICAL_REFERENCE.md     # Comprehensive technical reference
    backend-fuzzy-search-integration.md  # Fuzzy search integration
  playwright/                  # E2E tests
    all-learning-resources.spec.ts
    help-panel.spec.ts
    test-utils.ts
  cypress/                     # Component tests
    component/
  .storybook/                  # Storybook configuration
    main.ts                    # Framework, addons, webpack aliases
    preview.tsx                # Global setup, MSW init, chrome mock
    test-runner.ts             # Automated story testing
    hooks/                     # Mock hooks (useChrome, unleash, scalprum)
    mocks/                     # Chrome API mock
  .tekton/                     # Konflux/Tekton CI pipelines
  .github/workflows/           # GitHub Actions CI
  config/                      # Jest setup, webpack config
```

## Module Federation

This app exposes 6 federated modules consumed by insights-chrome and other HCC apps:

| Module | Entry Point | Description |
|--------|-------------|-------------|
| `./RootApp` | `src/AppEntry.tsx` | Main app shell |
| `./BookmarkedLearningResourcesWidget` | `src/components/LearningResourcesWidget/LearningResourcesWidget` | Bookmarked resources widget |
| `./GlobalLearningResourcesPage` | `src/components/GlobalLearningResourcesPage/GlobalLearningResourcesPage` | Full catalog page |
| `./Creator` | `src/Creator.tsx` | Quickstart/resource creator tool |
| `./HelpPanel` | `src/components/HelpPanel/index.ts` | Help panel content (loaded by chrome) |
| `./HelpPanelLink` | `src/components/HelpPanel/HelpPanelLink.tsx` | Help panel link component |

**Shared singleton:** `react-router-dom` (singleton, any version)

**App URLs:** `/learning-resources`, `/learning-resources/creator`, and bundle-prefixed variants (`/settings/learning-resources`, `/ansible/learning-resources`, etc.)

## Application Parts

This application serves three distinct user-facing surfaces on console.redhat.com:

1. **All Learning Resources page** — The main catalog at `/learning-resources` showing all available learning resources (quickstarts, documentation, learning paths). Users can filter by product family, content type, and other categories. Component: `GlobalLearningResourcesPage`.

2. **Bundle-specific Learning Resources** — Each bundle (Ansible, OpenShift, Settings, Insights, Edge, IAM) has its own learning resources page at `/<bundle>/learning-resources`, pre-filtered to show only resources relevant to that bundle. Same component (`GlobalLearningResourcesPage`) with bundle context from the URL. Bundle mapping is handled by `src/utils/bundleUtils.ts`.

3. **Help Panel** — A side panel loaded by insights-chrome (not by this app directly) via the `./HelpPanel` federated module. It displays APIs, learning resources, support cases, and provides filtering/search capabilities. Controlled by feature flags (`help-panel_search`, `help-panel_knowledge-base`, `help-panel_direct-ask-redhat`). Component: `HelpPanel`.

Additionally, the **Creator tool** at `/learning-resources/creator` lets content authors build and preview quickstarts via a wizard or YAML editor. Gated by the `platform.chrome.quickstarts.creator` feature flag.

## Tech Stack

- **React** 18.3.1, **TypeScript** ^5.9.3 (strict mode)
- **PatternFly** React Core/Table ^6.4.0
- **Build:** FEC (frontend-components-config), Webpack Module Federation, SWC
- **State:** React hooks/context + Scalprum shared store (no Redux/Jotai)
- **API:** Axios ^1.13.2 → quickstarts backend service
- **i18n:** react-intl ^6.6.2
- **Feature flags:** Unleash proxy client ^4.5.2
- **Editor:** Monaco Editor ^0.55.1 (for YAML creator)
- **Forms:** Data Driven Forms ^4.1.4 (PF4 mapper for creator wizard)

## Key Feature Flags

| Flag | Controls |
|------|----------|
| `platform.chrome.help-panel_search` | Search tab in help panel |
| `platform.chrome.help-panel_knowledge-base` | KB tab in help panel |
| `platform.chrome.help-panel_direct-ask-redhat` | Virtual Assistant button |
| `platform.chrome.quickstarts.creator` | Creator tool access |

## Common Pitfalls

1. **Case-insensitive filesystem** — `claude.md` and `CLAUDE.md` map to the same file on macOS.
2. **Playwright baseline counts** — e2e tests have intentional hardcoded count assertions with tolerances. Do NOT remove them (reviewer-enforced).
3. **Storybook mocks** — Storybook aliases `useChrome`, `@unleash/proxy-client-react`, and `@scalprum/react-core` to local mocks in `.storybook/hooks/`. New external dependencies may need similar aliases.
4. **SWC platform bindings** — CI requires `@swc/core` platform binding fixes (see `.github/workflows/test.yml`).
5. **Playwright auth** — E2E tests use `@redhat-cloud-services/playwright-test-auth` for SSO login via global setup. Requires `E2E_USER` and `E2E_PASSWORD` env vars.
6. **Jest CSS** — SCSS/CSS imports are mapped to `identity-obj-proxy` in jest.config.js. Do NOT import styles in test files expecting real CSS.
7. **Data Driven Forms** — Creator wizard uses `@data-driven-forms/pf4-component-mapper` (PF4, NOT PF6). This is intentional — the DDF PF4 mapper works with PF6 at runtime.
8. **No Error Boundary** — the repo has no explicit React Error Boundary. Error states are handled per-component via fallback components.

## Documentation Index

### Agent Guidelines (docs/)
- `docs/testing-guidelines.md` — Testing patterns, frameworks, coverage
- `docs/security-guidelines.md` — Auth, feature flags, data access
- `docs/error-handling-guidelines.md` — Error patterns, fallback components
- `docs/integration-guidelines.md` — Module federation, Chrome API, Storybook, CI/CD

### Existing Documentation (docs/)
- `docs/TECHNICAL_REFERENCE.md` — Comprehensive technical documentation
- `docs/CREATOR_GUIDE.md` — Creator tool user guide
- `docs/backend-fuzzy-search-integration.md` — Fuzzy search API integration

### Architecture
- `ARCHITECTURE.md` — High-level architecture overview

### Storybook Documentation (src/docs/)
- `src/docs/Introduction.mdx` — Storybook introduction
- `src/docs/ComponentReference.mdx` — Component reference
- `src/docs/UserJourneys.mdx` — User journey documentation
- `src/docs/HelpPanelArchitecture.mdx` — Help panel architecture
