import { useContext, useState } from 'react';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import {
  PRResponse,
  createQuickstartPR,
  listRepoQuickstarts,
} from '../../utils/createQuickstartPR';
import { CreatorWizardContext } from './context';

export function useCreatePR(quickstartName: string | null) {
  const { files, resumePR, setResumePR } = useContext(CreatorWizardContext);
  const chrome = useChrome();

  const [prLoading, setPrLoading] = useState(false);
  const [prResult, setPrResult] = useState<PRResponse | null>(null);
  const [prError, setPrError] = useState<string | null>(null);

  const canCreatePR =
    files.length > 0 &&
    !!quickstartName &&
    quickstartName !== 'untitled-quickstart';

  const handleCreatePR = async () => {
    if (!canCreatePR || !quickstartName || prLoading) return;
    setPrLoading(true);
    setPrResult(null);
    setPrError(null);
    try {
      const safeName = quickstartName
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^[-.]+|[-.]+$/g, '');
      if (!safeName) {
        setPrError('Quickstart name is not valid for a branch name.');
        setPrLoading(false);
        return;
      }

      // Keep the exact existing directory when resuming. The backend uses the
      // submitted metadata to determine whether the quickstart moved.
      const directoryName = resumePR?.slug || safeName;

      let isUpdate = false;
      if (resumePR) {
        isUpdate = true;
      } else {
        try {
          const repoEntries = await listRepoQuickstarts();
          isUpdate = repoEntries.some((e) => e.name === quickstartName);
        } catch {
          // If repo check fails, default to create
        }
      }

      const prefix = isUpdate ? 'update' : 'create';
      let commitMessage = `feat(quickstarts): ${prefix} ${directoryName}`;
      const user = await chrome.auth.getUser();
      const identity = user?.identity?.user;
      if (identity?.email) {
        const name =
          [identity.first_name, identity.last_name].filter(Boolean).join(' ') ||
          identity.email;
        commitMessage += `\n\nCo-authored-by: ${name} <${identity.email}>`;
      }

      const branchName = resumePR
        ? resumePR.branchName
        : `qs-${prefix}-${safeName}-${Date.now()}`;

      const result = await createQuickstartPR(files, {
        branchName,
        commitMessage,
        prTitle: `feat(quickstarts): ${prefix} ${directoryName}`,
        prBody: `${
          isUpdate ? 'Updating' : 'Adding new'
        } quickstart via the Quickstarts Creator tool.\n\nDirectory: docs/quickstarts/${directoryName}/`,
        isUpdate,
        directoryName,
        ...(isUpdate
          ? { existingPath: `docs/quickstarts/${directoryName}/` }
          : {}),
        ...(resumePR ? { prNumber: resumePR.number } : {}),
      });
      setPrResult(result);
      // The backend moves the directory when metadata.name changes. Remember
      // the new slug so another edit prunes the directory from the last save.
      if (resumePR && result.status === 'updated') {
        setResumePR({ ...resumePR, slug: safeName });
      }
    } catch (err) {
      setPrError(
        err instanceof Error
          ? err.message
          : resumePR
          ? 'Failed to update PR'
          : 'Failed to create PR'
      );
    } finally {
      setPrLoading(false);
    }
  };

  return {
    prLoading,
    prResult,
    prError,
    canCreatePR,
    handleCreatePR,
    setPrResult,
    setPrError,
    resumePR,
  };
}
