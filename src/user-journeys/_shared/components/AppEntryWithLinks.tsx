import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  AllQuickStartStates,
  QuickStartContextProvider,
  useValuesForQuickStartContext,
} from '@patternfly/quickstarts';
import { IntlProvider } from 'react-intl';
import { MockConsolePageWithLinks } from './MockConsolePageWithLinks';

interface AppEntryWithLinksProps {
  initialRoute?: string;
  bundle?: string;
}

const locale = 'en';

/**
 * Wrapper component for in-page link user journey tests.
 * Provides a mock console environment with HelpPanelLink components
 * wired to actually open the Help Panel.
 *
 * NOTE: useChrome and Unleash are mocked at the webpack level via .storybook/main.ts
 */
export const AppEntryWithLinks: React.FC<AppEntryWithLinksProps> = ({
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
          <MockConsolePageWithLinks bundle={bundle} />
        </MemoryRouter>
      </QuickStartContextProvider>
    </IntlProvider>
  );
};
