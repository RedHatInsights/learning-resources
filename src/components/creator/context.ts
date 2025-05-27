import React from 'react';
import { CreatorFiles } from './types';
import { CreatorWizardStage } from './meta';

export const CreatorWizardContext = React.createContext<{
  files: CreatorFiles;
  onChangeCurrentStage: (stage: CreatorWizardStage) => void;
  resetCreator: () => void;
}>({
  files: [],
  onChangeCurrentStage: () => {},
  resetCreator: () => {},
});
