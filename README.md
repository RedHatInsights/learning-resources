[![Build Status](https://travis-ci.org/RedHatInsights/frontend-starter-app.svg?branch=master)](https://travis-ci.org/RedHatInsights/frontend-starter-app)

# Learning Resources

Learning Resources provides educational content and QuickStart tutorials for the Hybrid Cloud Console.

## Features

- **QuickStart Catalog** - Browse and manage QuickStart tutorials
- **QuickStart Creator** - Create custom QuickStart content
- **HelpPanel Integration** - Embedded help and learning resources
- **QuickStarts API** - Shared store for QuickStart state management

## QuickStarts API

Learning Resources owns the QuickStarts API, providing shared state management for QuickStart tutorials across all federated modules.

### Available Hooks (via Module Federation)

| Hook | Module Path | Purpose |
|------|-------------|---------|
| `useQuickstartsStore` | `learningResources/quickstarts/useQuickstartsStore` | Shared QuickStart state (Chrome drawer) |
| `useScopedQuickStart` | `learningResources/quickstarts/useScopedQuickStart` | Isolated state for custom UI |

For `useRemoteHook`, use `scope: 'learningResources'` and `module: './quickstarts/useQuickstartsStore'` (or `'./quickstarts/useScopedQuickStart'`).

### Quick Example

```tsx
import { useRemoteHook } from '@scalprum/react-core';

function MyComponent() {
  const { hookResult } = useRemoteHook({
    scope: 'learningResources',
    module: './quickstarts/useQuickstartsStore',
  });

  // Set quickstarts for your app
  hookResult?.setQuickstarts('myApp', myQuickstartsArray);

  // Activate a quickstart
  hookResult?.activateQuickstart('my-quickstart-name');
}
```

**[Full QuickStarts API Documentation →](./docs/quickstarts-api.md)**

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

## Documentation

- [QuickStarts API](docs/quickstarts-api.md) - Shared store and scoped controller for QuickStarts

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

