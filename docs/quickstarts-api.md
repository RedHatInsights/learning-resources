# QuickStarts API

Learning Resources provides the QuickStarts API for managing QuickStart tutorials across the Hybrid Cloud Console. This API is exposed via Module Federation and can be consumed by any federated module.

## Available Hooks

| Hook | Purpose | State Type |
|------|---------|------------|
| `useQuickstartsStore` | Manage shared QuickStart state (Chrome drawer) | Shared globally |
| `useScopedQuickStart` | Isolated QuickStart state for custom UI | Isolated per instance |

---

## useQuickstartsStore

A shared store for managing QuickStarts across all federated modules. Use this when you want to interact with Chrome's QuickStart drawer.

### Usage

```tsx
import { useRemoteHook } from '@scalprum/react-core';

function MyComponent() {
  const { hookResult, loading, error } = useRemoteHook({
    scope: 'learningResources',
    module: './quickstarts/useQuickstartsStore'
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  // Set quickstarts for your app
  hookResult?.setQuickstarts('myApp', myQuickstartsArray);

  // Activate a quickstart (opens Chrome's drawer)
  hookResult?.activateQuickstart('my-quickstart-name');

  return <div>...</div>;
}
```

### API Reference

#### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `quickstarts` | `{ [key: string]: QuickStart[] }` | QuickStarts organized by app namespace |
| `activeQuickStartID` | `string` | Currently active QuickStart ID |
| `allQuickStartStates` | `{ [key: string]: QuickStartState }` | Progress states for all QuickStarts |
| `accountId` | `string \| undefined` | Account ID for progress persistence |
| `activeQuickStart` | `QuickStart \| null` | The currently active QuickStart object |

#### Actions

| Method | Description |
|--------|-------------|
| `setQuickstarts(app, quickstarts)` | Set QuickStarts for an app namespace |
| `addQuickstart(app, quickstart)` | Add a single QuickStart to an app namespace |
| `clearQuickstarts(activeId?)` | Clear all QuickStarts, optionally keeping active one |
| `setActiveQuickStartID(id)` | Set the active QuickStart (opens drawer) |
| `toggleQuickstart(id)` | Toggle a QuickStart open/closed |
| `setAllQuickStartStates(states)` | Update progress states |
| `activateQuickstart(name)` | Fetch and activate a QuickStart by name from API |
| `loadProgress()` | Load saved progress from API |
| `setAccountId(id)` | Set account ID for progress persistence |

#### Helpers

| Method | Description |
|--------|-------------|
| `getAllQuickstarts()` | Returns all QuickStarts as a flat array |
| `getQuickstartByName(name)` | Find a QuickStart by its metadata name |

---

## useScopedQuickStart

A hook for creating isolated QuickStart state. Use this when you need to render QuickStarts in custom UI (e.g., HelpPanel tabs) without affecting Chrome's drawer.

### Usage

```tsx
import { useRemoteHook } from '@scalprum/react-core';

function MyHelpPanel() {
  const { hookResult: useScopedQuickStart, loading } = useRemoteHook({
    scope: 'learningResources',
    module: './quickstarts/useScopedQuickStart'
  });

  if (loading || !useScopedQuickStart) return null;

  // Create an isolated controller
  const controller = useScopedQuickStart({ quickStarts: myQuickStarts });

  // Activate a QuickStart (only affects this instance)
  controller.setActiveQuickStartID('my-quickstart');

  // Render QuickStart content
  if (controller.activeQuickStart) {
    return <QuickStartPanelContent quickStart={controller.activeQuickStart} />;
  }

  return <div>Select a QuickStart</div>;
}
```

### API Reference

#### Options

```typescript
interface ScopedControllerOptions {
  quickStarts?: QuickStart[];  // QuickStarts available in this scope
}
```

#### Controller Properties

| Property | Type | Description |
|----------|------|-------------|
| `activeQuickStart` | `QuickStart \| null` | Currently active QuickStart |
| `activeQuickStartID` | `string` | Active QuickStart ID |
| `allQuickStartStates` | `AllQuickStartStates` | Progress states |

#### Controller Methods

| Method | Description |
|--------|-------------|
| `setActiveQuickStartID(id)` | Set the active QuickStart |
| `setAllQuickStartStates(states)` | Update progress states |
| `restartQuickStart()` | Restart the active QuickStart |

---

## Shared vs Scoped: When to Use Which

```
┌─────────────────────────────────────────────────────────────────┐
│                     useQuickstartsStore                         │
│                      (Shared State)                             │
│                                                                 │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐                    │
│   │  App A  │    │  App B  │    │  App C  │                    │
│   └────┬────┘    └────┬────┘    └────┬────┘                    │
│        │              │              │                          │
│        └──────────────┼──────────────┘                          │
│                       ▼                                         │
│              ┌────────────────┐                                 │
│              │  Chrome Drawer │                                 │
│              └────────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    useScopedQuickStart                          │
│                     (Isolated State)                            │
│                                                                 │
│   ┌─────────────┐         ┌─────────────┐                      │
│   │ HelpPanel A │         │ HelpPanel B │                      │
│   │ ┌─────────┐ │         │ ┌─────────┐ │                      │
│   │ │ State A │ │         │ │ State B │ │                      │
│   │ └─────────┘ │         │ └─────────┘ │                      │
│   └─────────────┘         └─────────────┘                      │
│        (isolated)              (isolated)                       │
└─────────────────────────────────────────────────────────────────┘
```

| Use Case | Recommended Hook |
|----------|-----------------|
| Open QuickStart in Chrome's drawer | `useQuickstartsStore` |
| Embed QuickStart in custom sidebar | `useScopedQuickStart` |
| Multiple independent QuickStart panels | `useScopedQuickStart` |
| Share QuickStart state across apps | `useQuickstartsStore` |

---

## Migration from Chrome API

The `useChrome().quickStarts` API is deprecated. Here's how to migrate:

### Setting QuickStarts

**Before (deprecated):**
```tsx
const { quickStarts } = useChrome();
quickStarts.set('myApp', myQuickstartsArray);
```

**After:**
```tsx
const { hookResult } = useRemoteHook({
  scope: 'learningResources',
  module: './quickstarts/useQuickstartsStore'
});
hookResult?.setQuickstarts('myApp', myQuickstartsArray);
```

### Activating a QuickStart

**Before (deprecated):**
```tsx
const { quickStarts } = useChrome();
await quickStarts.activateQuickstart('my-quickstart');
```

**After:**
```tsx
const { hookResult } = useRemoteHook({
  scope: 'learningResources',
  module: './quickstarts/useQuickstartsStore'
});
await hookResult?.activateQuickstart('my-quickstart');
```

### Using Scoped QuickStarts

**Before (deprecated):**
```tsx
const { quickStarts } = useChrome();
const controller = quickStarts.useScopedQuickStart({ quickStarts: myQS });
```

**After:**
```tsx
const { hookResult: useScopedQuickStart } = useRemoteHook({
  scope: 'learningResources',
  module: './quickstarts/useScopedQuickStart'
});
const controller = useScopedQuickStart?.({ quickStarts: myQS });
```

---

## TypeScript Support

Types are re-exported from the hook modules so external consumers can use the federated module path:

```typescript
import type { QuickStart, QuickStartState } from '@patternfly/quickstarts';

// For useScopedQuickStart: import types from the same federated module as the hook
import type {
  AllQuickStartStates,
  ScopedControllerOptions,
  ScopedQuickStartController,
} from 'learning-resources/quickstarts/useScopedQuickStart';
```

---

## See Also

- [PatternFly QuickStarts Documentation](https://www.patternfly.org/extensions/quickstarts/about-quick-starts)
- [Module Federation Documentation](https://webpack.js.org/concepts/module-federation/)
- [Scalprum useRemoteHook](https://github.com/scalprum/scaffolding/blob/main/packages/react-core/docs/use-remote-hook.md)
