import React from 'react';
import './App.scss';
import { AppContext, AppNavigationPart } from './AppContext';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import { Route, Routes, useNavigate } from 'react-router-dom';
import Viewer from './Viewer';
import Creator from './Creator';
import { useFlag } from '@unleash/proxy-client-react';

const routes: Record<AppNavigationPart, string> = {
  viewer: '/',
  creator: '/creator',
};

export const App = ({ bundle }: { bundle: string }) => {
  const navigate = useNavigate();
  const { getBundle } = useChrome();
  const creatorEnabled = useFlag('platform.learning-resources.creator');

  return (
    <AppContext.Provider
      value={{
        onNavigate: creatorEnabled
          ? (newPart) => {
              let dest = routes[newPart];
              if (dest.startsWith('/')) dest = dest.substring(1);
              navigate(`/${getBundle()}/learning-resources/${dest}`);
            }
          : undefined,
      }}
    >
      <Routes>
        <Route path={routes.viewer} element={<Viewer bundle={bundle} />} />

        {creatorEnabled ? (
          <Route path={routes.creator} element={<Creator />} />
        ) : null}
      </Routes>
    </AppContext.Provider>
  );
};
