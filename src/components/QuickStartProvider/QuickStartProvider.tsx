import React, { useEffect, useRef } from 'react';
import {
  QuickStartContainer,
  QuickStartContainerProps,
} from '@patternfly/quickstarts';
import '@patternfly/quickstarts/dist/quickstarts.css';
import { useQuickstartsStore } from '../../stores/quickstartsStore';
import useQuickstartLinkStore, {
  createQuickstartLinkMarkupExtension,
} from './useQuickstartLinkStore';

export interface QuickStartProviderProps {
  /** Child components to render inside the provider */
  children: React.ReactNode;
  /** Account ID for progress persistence */
  accountId?: string;
  /** Language for quickstart content (default: 'en') */
  language?: string;
  /** Whether to show card footers in the catalog (default: false) */
  showCardFooters?: boolean;
  /** Whether to always show task review (default: true) */
  alwaysShowTaskReview?: boolean;
}

/**
 * QuickStartProvider wraps the PatternFly QuickStartContainer and connects it
 * to the shared quickstarts store. This component should be mounted at the root
 * of your application to enable quickstart functionality.
 *
 * @example
 * ```tsx
 * <QuickStartProvider accountId={user.accountId}>
 *   <App />
 * </QuickStartProvider>
 * ```
 */
export const QuickStartProvider: React.FC<QuickStartProviderProps> = ({
  children,
  accountId,
  language = 'en',
  showCardFooters = false,
  alwaysShowTaskReview = true,
}) => {
  const {
    getAllQuickstarts,
    activeQuickStartID,
    allQuickStartStates,
    setActiveQuickStartID,
    setAllQuickStartStates,
    setAccountId,
    loadProgress,
  } = useQuickstartsStore();
  const quickstartLinkStore = useQuickstartLinkStore();

  // Track which accountId we've initialized to prevent duplicate calls
  const initializedAccountIdRef = useRef<string | undefined>(undefined);

  // Initialize account and load progress only once per unique accountId
  useEffect(() => {
    if (accountId && accountId !== initializedAccountIdRef.current) {
      initializedAccountIdRef.current = accountId;
      setAccountId(accountId);
      loadProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]); // Only depend on accountId prop

  // Get quickstarts - this will update when store state changes
  const quickStarts = getAllQuickstarts();

  const quickStartProps: QuickStartContainerProps = {
    quickStarts,
    activeQuickStartID,
    allQuickStartStates,
    setActiveQuickStartID:
      setActiveQuickStartID as QuickStartContainerProps['setActiveQuickStartID'],
    setAllQuickStartStates:
      setAllQuickStartStates as unknown as QuickStartContainerProps['setAllQuickStartStates'],
    showCardFooters,
    language,
    alwaysShowTaskReview,
    markdown: {
      extensions: [createQuickstartLinkMarkupExtension(quickstartLinkStore)],
    },
  };

  return (
    <QuickStartContainer {...quickStartProps}>{children}</QuickStartContainer>
  );
};

export default QuickStartProvider;
