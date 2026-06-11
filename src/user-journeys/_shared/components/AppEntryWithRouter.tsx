import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  AllQuickStartStates,
  QuickStartContextProvider,
  useValuesForQuickStartContext,
} from '@patternfly/quickstarts';
import { IntlProvider } from 'react-intl';
import { MockConsolePage } from './MockConsolePage';

interface AppEntryWithRouterProps {
  initialRoute?: string;
  bundle?: string;
}

const locale = 'en';

/**
 * Wrapper component for user journey tests.
 * Provides a mock console environment with Help Panel for testing.
 *
 * NOTE: useChrome and Unleash are mocked at the webpack level via .storybook/main.ts
 */
export const AppEntryWithRouter: React.FC<AppEntryWithRouterProps> = ({
  initialRoute = '/',
  bundle = 'insights',
}) => {
  const [quickStartStates, setQuickStartStates] = useState<AllQuickStartStates>(
    {}
  );

  const quickStartContextValue = useValuesForQuickStartContext({
    allQuickStarts: [],
    activeQuickStartID: '',
    setActiveQuickStartID: () => {},
    allQuickStartStates: quickStartStates,
    setAllQuickStartStates: setQuickStartStates,
    useQueryParams: false,
  });

  return (
    <IntlProvider locale={locale} defaultLocale="en">
      <QuickStartContextProvider value={quickStartContextValue}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <MockConsolePage bundle={bundle} />
        </MemoryRouter>
      </QuickStartContextProvider>
    </IntlProvider>
  );
};
