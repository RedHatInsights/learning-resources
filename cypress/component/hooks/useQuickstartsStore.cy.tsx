import React from 'react';
import { useQuickstartsStore } from '../../../src/stores/quickstartsStore';
import { QuickStart } from '@patternfly/quickstarts';

// Mock QuickStart data for testing
const mockQuickStarts: QuickStart[] = [
  {
    metadata: {
      name: 'quickstart-1',
    },
    spec: {
      displayName: 'First QuickStart',
      description: 'Description for first quickstart',
      icon: null,
      tasks: [
        {
          title: 'Task 1',
          description: 'Do something',
        },
      ],
    },
  },
  {
    metadata: {
      name: 'quickstart-2',
    },
    spec: {
      displayName: 'Second QuickStart',
      description: 'Description for second quickstart',
      icon: null,
      tasks: [
        {
          title: 'Task 1',
          description: 'Do something else',
        },
        {
          title: 'Task 2',
          description: 'Do another thing',
        },
      ],
    },
  },
];

// Test component that uses the hook and exposes state to the DOM
const TestComponent = () => {
  const store = useQuickstartsStore();

  return (
    <div>
      {/* State displays */}
      <div data-cy="active-id">{store.activeQuickStartID || '(empty)'}</div>
      <div data-cy="active-qs-name">{store.activeQuickStart?.metadata.name || '(null)'}</div>
      <div data-cy="active-qs-display-name">{store.activeQuickStart?.spec.displayName || '(null)'}</div>
      <div data-cy="all-states">{JSON.stringify(store.allQuickStartStates)}</div>
      <div data-cy="quickstarts-count">{store.getAllQuickstarts().length}</div>
      <div data-cy="quickstarts-keys">{Object.keys(store.quickstarts).join(',') || '(none)'}</div>
      <div data-cy="account-id">{store.accountId || '(undefined)'}</div>

      {/* Control buttons - setQuickstarts */}
      <button data-cy="set-quickstarts" onClick={() => store.setQuickstarts('myApp', mockQuickStarts)}>
        Set QuickStarts
      </button>
      <button data-cy="set-quickstarts-other" onClick={() => store.setQuickstarts('otherApp', [mockQuickStarts[0]])}>
        Set QuickStarts Other App
      </button>

      {/* Control buttons - addQuickstart */}
      <button data-cy="add-quickstart" onClick={() => store.addQuickstart('myApp', mockQuickStarts[0])}>
        Add QuickStart
      </button>

      {/* Control buttons - clearQuickstarts */}
      <button data-cy="clear-quickstarts" onClick={() => store.clearQuickstarts()}>
        Clear QuickStarts
      </button>
      <button data-cy="clear-quickstarts-keep-active" onClick={() => store.clearQuickstarts(store.activeQuickStartID)}>
        Clear QuickStarts (Keep Active)
      </button>

      {/* Control buttons - setActiveQuickStartID */}
      <button data-cy="set-active-qs1" onClick={() => store.setActiveQuickStartID('quickstart-1')}>
        Set Active QS1
      </button>
      <button data-cy="set-active-qs2" onClick={() => store.setActiveQuickStartID('quickstart-2')}>
        Set Active QS2
      </button>
      <button data-cy="clear-active" onClick={() => store.setActiveQuickStartID('')}>
        Clear Active
      </button>

      {/* Control buttons - toggleQuickstart */}
      <button data-cy="toggle-qs1" onClick={() => store.toggleQuickstart('quickstart-1')}>
        Toggle QS1
      </button>

      {/* Control buttons - setAllQuickStartStates */}
      <button
        data-cy="set-progress"
        onClick={() =>
          store.setAllQuickStartStates({
            'quickstart-1': { taskNumber: 2, status: 'Complete' },
          })
        }
      >
        Set Progress
      </button>
      <button
        data-cy="set-multiple-progress"
        onClick={() =>
          store.setAllQuickStartStates({
            'quickstart-1': { taskNumber: 2, status: 'Complete' },
            'quickstart-2': { taskNumber: 1, status: 'In Progress' },
          })
        }
      >
        Set Multiple Progress
      </button>

      {/* Control buttons - setAccountId */}
      <button data-cy="set-account-id" onClick={() => store.setAccountId('12345')}>
        Set Account ID
      </button>

      {/* Control buttons - getQuickstartByName */}
      <div data-cy="found-qs-name">{store.getQuickstartByName('quickstart-1')?.spec.displayName || '(not found)'}</div>
    </div>
  );
};

// Component for testing shared state across multiple instances
const SharedStateTestComponent = () => {
  const store1 = useQuickstartsStore();
  const store2 = useQuickstartsStore();

  return (
    <div>
      <div data-cy="instance1-count">{store1.getAllQuickstarts().length}</div>
      <div data-cy="instance2-count">{store2.getAllQuickstarts().length}</div>
      <div data-cy="instance1-active-id">{store1.activeQuickStartID || '(empty)'}</div>
      <div data-cy="instance2-active-id">{store2.activeQuickStartID || '(empty)'}</div>

      <button data-cy="instance1-set-quickstarts" onClick={() => store1.setQuickstarts('myApp', mockQuickStarts)}>
        Instance 1: Set QuickStarts
      </button>
      <button data-cy="instance1-set-active" onClick={() => store1.setActiveQuickStartID('quickstart-1')}>
        Instance 1: Set Active
      </button>
    </div>
  );
};

describe('useQuickstartsStore Hook', () => {
  beforeEach(() => {
    // Reset the store state before each test by clearing quickstarts
    cy.mount(<TestComponent />);
    cy.get('[data-cy="clear-quickstarts"]').click();
    cy.get('[data-cy="clear-active"]').click();
  });

  describe('initialization', () => {
    it('should initialize with default empty state', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="active-id"]').should('contain', '(empty)');
      cy.get('[data-cy="active-qs-name"]').should('contain', '(null)');
      cy.get('[data-cy="all-states"]').should('contain', '{}');
      cy.get('[data-cy="quickstarts-count"]').should('contain', '0');
    });
  });

  describe('setQuickstarts', () => {
    it('should set quickstarts for an app', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="set-quickstarts"]').click();

      cy.get('[data-cy="quickstarts-count"]').should('contain', '2');
      cy.get('[data-cy="quickstarts-keys"]').should('contain', 'myApp');
    });

    it('should replace quickstarts when called again for same app', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="set-quickstarts"]').click();
      cy.get('[data-cy="quickstarts-count"]').should('contain', '2');

      // Set quickstarts for other app (which only has 1)
      cy.get('[data-cy="set-quickstarts-other"]').click();
      cy.get('[data-cy="quickstarts-count"]').should('contain', '3'); // 2 from myApp + 1 from otherApp
    });

    it('should support multiple app namespaces', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="set-quickstarts"]').click();
      cy.get('[data-cy="set-quickstarts-other"]').click();

      cy.get('[data-cy="quickstarts-keys"]').should('contain', 'myApp');
      cy.get('[data-cy="quickstarts-keys"]').should('contain', 'otherApp');
    });
  });

  describe('addQuickstart', () => {
    it('should add a quickstart to an app namespace', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="add-quickstart"]').click();

      cy.get('[data-cy="quickstarts-count"]').should('contain', '1');
    });

    it('should append to existing quickstarts', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="add-quickstart"]').click();
      cy.get('[data-cy="add-quickstart"]').click();

      cy.get('[data-cy="quickstarts-count"]').should('contain', '2');
    });
  });

  describe('clearQuickstarts', () => {
    it('should clear all quickstarts', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="set-quickstarts"]').click();
      cy.get('[data-cy="quickstarts-count"]').should('contain', '2');

      cy.get('[data-cy="clear-quickstarts"]').click();

      cy.get('[data-cy="quickstarts-count"]').should('contain', '0');
      cy.get('[data-cy="quickstarts-keys"]').should('contain', '(none)');
    });

    it('should keep active quickstart when clearing', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="set-quickstarts"]').click();
      cy.get('[data-cy="set-active-qs1"]').click();
      cy.get('[data-cy="quickstarts-count"]').should('contain', '2');

      cy.get('[data-cy="clear-quickstarts-keep-active"]').click();

      cy.get('[data-cy="quickstarts-count"]').should('contain', '1');
      cy.get('[data-cy="active-qs-name"]').should('contain', 'quickstart-1');
    });
  });

  describe('setActiveQuickStartID', () => {
    it('should set the active quickstart ID', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="set-quickstarts"]').click();
      cy.get('[data-cy="set-active-qs1"]').click();

      cy.get('[data-cy="active-id"]').should('contain', 'quickstart-1');
      cy.get('[data-cy="active-qs-name"]').should('contain', 'quickstart-1');
      cy.get('[data-cy="active-qs-display-name"]').should('contain', 'First QuickStart');
    });

    it('should clear active quickstart when set to empty string', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="set-quickstarts"]').click();
      cy.get('[data-cy="set-active-qs1"]').click();
      cy.get('[data-cy="active-id"]').should('contain', 'quickstart-1');

      cy.get('[data-cy="clear-active"]').click();

      cy.get('[data-cy="active-id"]').should('contain', '(empty)');
      cy.get('[data-cy="active-qs-name"]').should('contain', '(null)');
    });

    it('should switch between different quickstarts', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="set-quickstarts"]').click();

      cy.get('[data-cy="set-active-qs1"]').click();
      cy.get('[data-cy="active-qs-display-name"]').should('contain', 'First QuickStart');

      cy.get('[data-cy="set-active-qs2"]').click();
      cy.get('[data-cy="active-qs-display-name"]').should('contain', 'Second QuickStart');
    });

    it('should return null for activeQuickStart when ID does not match any quickstart', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="set-quickstarts"]').click();
      cy.get('[data-cy="set-active-qs1"]').click();
      cy.get('[data-cy="active-qs-name"]').should('contain', 'quickstart-1');

      // Clear quickstarts but keep active ID
      cy.get('[data-cy="clear-quickstarts"]').click();

      cy.get('[data-cy="active-id"]').should('contain', 'quickstart-1');
      cy.get('[data-cy="active-qs-name"]').should('contain', '(null)');
    });
  });

  describe('toggleQuickstart', () => {
    it('should open quickstart when closed', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="set-quickstarts"]').click();
      cy.get('[data-cy="active-id"]').should('contain', '(empty)');

      cy.get('[data-cy="toggle-qs1"]').click();

      cy.get('[data-cy="active-id"]').should('contain', 'quickstart-1');
    });

    it('should close quickstart when already active', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="set-quickstarts"]').click();
      cy.get('[data-cy="toggle-qs1"]').click();
      cy.get('[data-cy="active-id"]').should('contain', 'quickstart-1');

      cy.get('[data-cy="toggle-qs1"]').click();

      cy.get('[data-cy="active-id"]').should('contain', '(empty)');
    });
  });

  describe('setAllQuickStartStates', () => {
    it('should update quickstart progress states', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="set-progress"]').click();

      cy.get('[data-cy="all-states"]').should('contain', '"quickstart-1":{"taskNumber":2,"status":"Complete"}');
    });

    it('should handle multiple quickstart states', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="set-multiple-progress"]').click();

      cy.get('[data-cy="all-states"]').should('contain', '"quickstart-1"').and('contain', '"quickstart-2"');
    });
  });

  describe('setAccountId', () => {
    it('should set the account ID', () => {
      cy.mount(<TestComponent />);

      cy.get('[data-cy="account-id"]').should('contain', '(undefined)');

      cy.get('[data-cy="set-account-id"]').click();

      cy.get('[data-cy="account-id"]').should('contain', '12345');
    });
  });

  describe('helper methods', () => {
    describe('getAllQuickstarts', () => {
      it('should return flat array of all quickstarts', () => {
        cy.mount(<TestComponent />);

        cy.get('[data-cy="set-quickstarts"]').click();
        cy.get('[data-cy="set-quickstarts-other"]').click();

        // 2 from myApp + 1 from otherApp = 3 total
        cy.get('[data-cy="quickstarts-count"]').should('contain', '3');
      });
    });

    describe('getQuickstartByName', () => {
      it('should find quickstart by name', () => {
        cy.mount(<TestComponent />);

        cy.get('[data-cy="found-qs-name"]').should('contain', '(not found)');

        cy.get('[data-cy="set-quickstarts"]').click();

        cy.get('[data-cy="found-qs-name"]').should('contain', 'First QuickStart');
      });
    });
  });

  describe('shared state across instances', () => {
    it('should share quickstarts state across multiple hook instances', () => {
      cy.mount(<SharedStateTestComponent />);

      cy.get('[data-cy="instance1-count"]').should('contain', '0');
      cy.get('[data-cy="instance2-count"]').should('contain', '0');

      cy.get('[data-cy="instance1-set-quickstarts"]').click();

      // Both instances should see the same quickstarts
      cy.get('[data-cy="instance1-count"]').should('contain', '2');
      cy.get('[data-cy="instance2-count"]').should('contain', '2');
    });

    it('should share activeQuickStartID across multiple hook instances', () => {
      cy.mount(<SharedStateTestComponent />);

      cy.get('[data-cy="instance1-set-quickstarts"]').click();

      cy.get('[data-cy="instance1-active-id"]').should('contain', '(empty)');
      cy.get('[data-cy="instance2-active-id"]').should('contain', '(empty)');

      cy.get('[data-cy="instance1-set-active"]').click();

      // Both instances should see the same active ID
      cy.get('[data-cy="instance1-active-id"]').should('contain', 'quickstart-1');
      cy.get('[data-cy="instance2-active-id"]').should('contain', 'quickstart-1');
    });
  });
});
