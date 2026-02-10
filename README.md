[![Build Status](https://travis-ci.org/RedHatInsights/frontend-starter-app.svg?branch=master)](https://travis-ci.org/RedHatInsights/frontend-starter-app)

# Learning resources
React.js starter app for Red Hat Insights products that includes Patternfly 5 and shared Red Hat cloud service frontend components.

## Initial etc/hosts setup
In order to access the https://[env].foo.redhat.com in your browser, you have to add entries to your `/etc/hosts` file. This is a **one-time** setup (unless you modify hosts) on each machine.

To setup the hosts file run following command:
```bash
npm run patch:hosts
```

If this command throws an error, run it as a `sudo`:
```bash
sudo npm run patch:hosts
```

## Getting started

1. ```npm install```

2. ```PROXY=true npm run start:beta```

3. Open browser in URL listed in the terminal output

Update `config/dev.webpack.config.js` according to your application URL. [Read more](https://github.com/RedHatInsights/frontend-components/tree/master/packages/config#useproxy).

### Testing

`npm run verify` will run `npm run lint` (eslint) and `npm test` (Jest)

## Deploying

- The starter repo uses Travis to deploy the webpack build to another Github repo defined in `.travis.yml`
  - That Github repo has the following branches:
    - `ci-beta` (deployed by pushing to `master` or `main` on this repo)
    - `ci-stable` (deployed by pushing to `ci-stable` on this repo)
    - `qa-beta` (deployed by pushing to `qa-beta` on this repo)
    - `qa-stable` (deployed by pushing to `qa-stable` on this repo)
    - `prod-beta` (deployed by pushing to `prod-beta` on this repo)
    - `prod-stable` (deployed by pushing to `prod-stable` on this repo)
- Travis uploads results to RedHatInsight's [codecov](https://codecov.io) account. To change the account, modify CODECOV_TOKEN on https://travis-ci.com/.

## HelpPanelLink

A link component that opens the help panel drawer with specific content in a new tab. Uses Chrome's drawer API to open the help panel.

**Usage via Module Federation:**

```tsx
import React, { lazy, Suspense } from 'react';

// Lazy load the component from the federated module
const HelpPanelLink = lazy(() =>
  import('learningResources/HelpPanelLink').then(module => ({
    default: module.default
  }))
);

// Import the TabType enum
const TabType = lazy(() =>
  import('learningResources/HelpPanelLink').then(module => ({
    default: module.TabType
  }))
);

// Use it in your component
function MyComponent() {
  return (
    <p>
      Need help?{' '}
      <Suspense fallback={<span>Loading...</span>}>
        <HelpPanelLink
          title="Configure Slack Integration"
          tabType="learn"
          url="https://docs.example.com/slack-config"
        >
          Learn how to configure Slack
        </HelpPanelLink>
      </Suspense>
    </p>
  );
}
```

**Alternative: Using custom content instead of URL**

```tsx
<HelpPanelLink
  title="Getting Started"
  tabType="learn"
  content={
    <div>
      <h3>Welcome!</h3>
      <p>Here's how to get started...</p>
    </div>
  }
>
  View getting started guide
</HelpPanelLink>
```

**Props:**
- `title: string` - Title for the tab
- `tabType: TabType` - Type of content (`'learn'`, `'api'`, `'kb'`, `'support'`, `'search'`)
- `url?: string` - URL to load in iframe (note: may be blocked by some sites due to X-Frame-Options)
- `content?: ReactNode` - Custom React content to display (alternative to URL)
- `children: ReactNode` - Link text
- `variant?: ButtonProps['variant']` - Button variant (default: `'link'`)
- `className?: string` - Additional CSS class
- `data-ouia-component-id?: string` - Testing identifier

**Note:** Must be used within insights-chrome environment. The component uses `chrome.drawerActions.toggleDrawerContent()` to open the help panel.


