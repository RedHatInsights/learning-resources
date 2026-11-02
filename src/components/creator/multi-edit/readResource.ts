import {
  WorkspaceResourceSnapshot,
  getCreatorPRResource,
  getRepoQuickstartContent,
} from '../../../utils/createQuickstartPR';
import { QUICKSTARTS_DIR, WorkspacePR } from './workspace';

/**
 * Reads one resource. Inside a saved workspace it comes from the PR head, so
 * the branch it will be committed to and the buffer agree; otherwise it comes
 * from main along with the commit it was read at.
 */
export async function readResource(
  name: string,
  pr: WorkspacePR | null
): Promise<{ resource: WorkspaceResourceSnapshot; baseSha?: string }> {
  if (pr) {
    const { resource } = await getCreatorPRResource(
      pr.number,
      name,
      pr.headSha
    );
    return { resource };
  }
  const content = await getRepoQuickstartContent(name);
  const dir = `${QUICKSTARTS_DIR}/${content.name || name}`;
  return {
    baseSha: content.headSha,
    resource: {
      name: content.name || name,
      path: dir,
      files: content.files.map((f) => ({ ...f, path: `${dir}/${f.name}` })),
    },
  };
}
