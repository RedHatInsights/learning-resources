import React, { useState } from 'react';
import './App.scss';
import Viewer from './Viewer';
import Creator from './Creator';
import { AppContext, AppNavigationPart } from './AppContext';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';

export const App = ({ bundle }: { bundle: string }) => {
  const [state, setState] = useState<AppNavigationPart>('viewer');

  const {
    visibilityFunctions: { featureFlag },
  } = useChrome();

  const creatorEnabled = featureFlag(
    'platform.learning-resources.creator',
    true
  );

  return (
    <AppContext.Provider
      value={{
        onNavigate: creatorEnabled ? (newPart) => setState(newPart) : undefined,
      }}
    >
      {state === 'viewer' ? <Viewer bundle={bundle} /> : <Creator />}
    </AppContext.Provider>
  );
};
