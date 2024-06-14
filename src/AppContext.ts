import React from 'react';

export type AppNavigationPart = 'viewer' | 'creator';

type AppContextType = {
  onNavigate?: (part: AppNavigationPart) => void;
};

const AppContextDefaults: AppContextType = {
  onNavigate: undefined,
};

export const AppContext =
  React.createContext<AppContextType>(AppContextDefaults);
