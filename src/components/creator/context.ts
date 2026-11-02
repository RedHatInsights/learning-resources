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
  /**
   * Folder name of the resource loaded from the repository or an open PR.
   * Submitting under a different name renames it, which is called out.
   */
  loadedName: string | null;
  setLoadedName: (value: string | null) => void;
}>({
  files: [],
  onChangeCurrentStage: () => {},
  resetCreator: () => {},
  resumePR: null,
  setResumePR: () => {},
  loadedName: null,
  setLoadedName: () => {},
});
