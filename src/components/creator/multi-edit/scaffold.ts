import YAML from 'yaml';
import { ItemKind, metaForKind } from '../meta';

export interface NewResourceDetails {
  kind: ItemKind;
  name: string;
  title: string;
  description: string;
  /** External link, for every kind except quick starts. */
  url?: string;
  bundles: string[];
}

/** Directory names the repository and its seeder accept. */
export const RESOURCE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugify = (title: string) =>
  title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-+)|(-+$)/g, '');

/**
 * The combined document for a new resource, in the same shape existing
 * resources are edited in: the content file with its tags under
 * `metadata.tags`. Saving splits it into metadata.yml and <name>.yml.
 */
export function scaffoldResource(details: NewResourceDetails): string {
  const meta = metaForKind(details.kind);
  const spec: Record<string, unknown> = {
    version: 0.1,
    type: { text: meta.displayName, color: meta.tagColor },
    displayName: details.title,
    icon: null,
    description: details.description,
  };
  if (meta.fields.url) {
    spec.link = { href: details.url ?? '', text: 'View documentation' };
  }
  if (meta.hasTasks) {
    Object.assign(spec, {
      durationMinutes: 10,
      introduction: 'Describe what the user will accomplish.',
      tasks: [
        {
          title: 'First task',
          description: 'Describe the steps for this task.',
          review: {
            instructions: 'Did you complete the task?',
            failedTaskHelp: 'Review the steps and try again.',
          },
        },
      ],
    });
  }

  return YAML.stringify(
    {
      apiVersion: 'console.openshift.io/v1',
      kind: 'QuickStarts',
      metadata: {
        name: details.name,
        ...meta.extraMetadata,
        tags: details.bundles.map((value) => ({ kind: 'bundle', value })),
      },
      spec,
    },
    { lineWidth: 0, nullStr: '~' }
  );
}
