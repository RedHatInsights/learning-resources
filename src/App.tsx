import React, { useState } from 'react';
import './App.scss';
import Viewer from './Viewer';
import Creator from './Creator';
import { AppContext, AppNavigationPart } from './AppContext';

export const App = ({ bundle }: { bundle: string }) => {
  const [state, setState] = useState<AppNavigationPart>('viewer');

  return (
    <AppContext.Provider value={{ onNavigate: (newPart) => setState(newPart) }}>
      {state === 'viewer' ? <Viewer bundle={bundle} /> : <Creator />}
    </AppContext.Provider>
  );
};
