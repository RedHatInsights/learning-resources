import React from 'react';
import { CreatorFiles } from './types';
import { CreatorWizardStage } from './meta';

export type ResumePR = {
  number: number;
  branchName: string;
  slug: string;
};

export const CreatorWizardContext = React.createContext<{
  files: CreatorFiles;
  onChangeCurrentStage: (stage: CreatorWizardStage) => void;
  resetCreator: () => void;
  resumePR: ResumePR | null;
  setResumePR: (value: ResumePR | null) => void;
}>({
  files: [],
  onChangeCurrentStage: () => {},
  resetCreator: () => {},
  resumePR: null,
  setResumePR: () => {},
});
