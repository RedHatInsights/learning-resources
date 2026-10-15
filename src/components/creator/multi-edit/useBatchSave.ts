import { Dispatch, useState } from 'react';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import {
  BatchPRMetadata,
  QuickstartsAPIError,
  submitBatchPR,
} from '../../../utils/createQuickstartPR';
import { WorkspaceAction, WorkspaceState, snapshotChanges } from './workspace';

export interface SaveDetails {
  commitMessage: string;
  /** Used only when the save opens a new PR. */
  prTitle?: string;
  prBody?: string;
}

export interface SaveError {
  message: string;
  /** 409 means the PR moved on; the author has to reload before saving. */
  isConflict: boolean;
}

export function useBatchSave(
  state: WorkspaceState,
  dispatch: Dispatch<WorkspaceAction>
) {
  const chrome = useChrome();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<SaveError | null>(null);

  const save = async (details: SaveDetails): Promise<boolean> => {
    if (saving) return false;

    // Capture the exact text being sent now, so edits made while the request
    // is in flight stay dirty instead of being marked saved.
    const snapshot = snapshotChanges(state);
    if (snapshot.resources.length === 0) return false;
    if (snapshot.problems.length > 0) {
      setError({
        message: snapshot.problems
          .map((p) => `${p.resource}: ${p.message}`)
          .join('\n'),
        isConflict: false,
      });
      return false;
    }

    setSaving(true);
    setError(null);
    try {
      let commitMessage = details.commitMessage.trim();
      const user = await chrome.auth.getUser();
      const identity = user?.identity?.user;
      if (identity?.email) {
        const name =
          [identity.first_name, identity.last_name].filter(Boolean).join(' ') ||
          identity.email;
        commitMessage += `\n\nCo-authored-by: ${name} <${identity.email}>`;
      }

      const metadata: BatchPRMetadata = state.pr
        ? {
            prNumber: state.pr.number,
            expectedHeadSha: state.pr.headSha,
            commitMessage,
            userEmail: identity?.email,
          }
        : {
            branchName: state.pendingBranchName,
            baseSha: state.baseSha ?? undefined,
            commitMessage,
            prTitle: details.prTitle?.trim(),
            prBody: details.prBody?.trim() || undefined,
            userEmail: identity?.email,
          };

      const response = await submitBatchPR(metadata, snapshot.resources);
      dispatch({
        type: 'saved',
        response,
        sent: snapshot.sent,
        reverted: snapshot.reverted.map((r) => r.name),
        deleted: snapshot.deleted.map((d) => d.name),
        restored: snapshot.restored.map((d) => d.name),
      });
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save changes.';
      setError({
        message,
        // A name collision is also a 409, but reloading the PR will not help;
        // its message says what to do instead.
        isConflict:
          err instanceof QuickstartsAPIError &&
          err.status === 409 &&
          !message.includes('already exists'),
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { save, saving, error, clearError: () => setError(null) };
}
