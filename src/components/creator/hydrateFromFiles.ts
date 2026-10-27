import YAML from 'yaml';
import { PRFile } from '../../utils/createQuickstartPR';
import {
  NAME_BUNDLES,
  NAME_DESCRIPTION,
  NAME_DURATION,
  NAME_ICON,
  NAME_KIND,
  NAME_METADATA_NAME,
  NAME_PANEL_INTRODUCTION,
  NAME_PREREQUISITES,
  NAME_TAGS,
  NAME_TASKS_ARRAY,
  NAME_TASK_TITLES,
  NAME_TITLE,
  NAME_URL,
} from './steps/common';
import { ALL_KIND_ENTRIES, ItemKind } from './meta';

type FormChanger = { change: (name: string, value: unknown) => void };

const normalizeKindLabel = (value: string) =>
  value.toLowerCase().replace(/\s+/g, '');

export function detectKindFromSpec(
  spec: Record<string, unknown> | undefined
): ItemKind | null {
  const typeObj = spec?.type as Record<string, unknown> | undefined;
  const typeText = typeObj?.text;
  if (typeof typeText !== 'string') return null;
  for (const [kind, meta] of ALL_KIND_ENTRIES) {
    if (normalizeKindLabel(meta.displayName) === normalizeKindLabel(typeText)) {
      return kind;
    }
  }
  return null;
}

export function clearQuickstartFields(formApi: FormChanger) {
  formApi.change(NAME_KIND, undefined);
  formApi.change(NAME_METADATA_NAME, undefined);
  formApi.change(NAME_TITLE, undefined);
  formApi.change(NAME_DESCRIPTION, undefined);
  formApi.change(NAME_DURATION, undefined);
  formApi.change(NAME_URL, undefined);
  formApi.change(NAME_BUNDLES, undefined);
  formApi.change(NAME_TAGS, undefined);
  formApi.change(NAME_PREREQUISITES, undefined);
  formApi.change(NAME_PANEL_INTRODUCTION, undefined);
  formApi.change(NAME_TASK_TITLES, undefined);
  formApi.change(NAME_TASKS_ARRAY, undefined);
  formApi.change(NAME_ICON, undefined);
}

export function quickstartYamlFromFiles(files: PRFile[]): string {
  const yamlFile = files.find(
    (f) =>
      (f.name.endsWith('.yml') || f.name.endsWith('.yaml')) &&
      !f.name.startsWith('metadata.')
  );
  if (!yamlFile) {
    throw new Error('No quickstart YAML file found.');
  }

  const parsed = YAML.parse(yamlFile.content);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The quickstart YAML is empty or not valid.');
  }

  const metadataFile = files.find((f) => f.name.startsWith('metadata.'));
  if (metadataFile) {
    const meta = YAML.parse(metadataFile.content);
    if (Array.isArray(meta?.tags)) {
      parsed.metadata = { ...parsed.metadata, tags: meta.tags };
    }
  }
  const { kind, metadata, spec, ...rest } = parsed;
  return YAML.stringify(
    { kind: kind || 'QuickStarts', metadata, spec, ...rest },
    { lineWidth: 0, nullStr: '~' }
  );
}

export function hydrateFromFiles(
  files: PRFile[],
  formApi: FormChanger
): string | null {
  let parsed;
  try {
    parsed = YAML.parse(quickstartYamlFromFiles(files));
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid quickstart YAML.';
  }

  const spec = parsed.spec || {};
  const metadata = parsed.metadata || {};

  if (metadata.name) formApi.change(NAME_METADATA_NAME, metadata.name);

  const detectedKind = detectKindFromSpec(spec);
  if (detectedKind) {
    formApi.change(NAME_KIND, detectedKind);
  }

  if (spec.displayName) formApi.change(NAME_TITLE, spec.displayName);
  if (spec.description) formApi.change(NAME_DESCRIPTION, spec.description);
  if (spec.icon !== undefined) formApi.change(NAME_ICON, spec.icon);
  if (spec.durationMinutes !== undefined)
    formApi.change(NAME_DURATION, spec.durationMinutes);
  if (spec.link?.href) formApi.change(NAME_URL, spec.link.href);
  if (spec.prerequisites)
    formApi.change(NAME_PREREQUISITES, spec.prerequisites);
  if (spec.introduction)
    formApi.change(NAME_PANEL_INTRODUCTION, spec.introduction);

  if (spec.tasks && Array.isArray(spec.tasks)) {
    formApi.change(
      NAME_TASK_TITLES,
      spec.tasks.map((t: { title?: string }) => t.title || '')
    );
    formApi.change(
      NAME_TASKS_ARRAY,
      spec.tasks.map(
        (t: {
          description?: string;
          review?: {
            instructions?: string;
            failedTaskHelp?: string;
          };
        }) => ({
          description: t.description,
          enable_work_check: !!t.review,
          work_check_instructions: t.review?.instructions,
          work_check_help: t.review?.failedTaskHelp,
        })
      )
    );
  }

  const bundles: string[] = [];
  const tagsByKind: { [kind: string]: string[] } = {};
  if (Array.isArray(metadata.tags)) {
    metadata.tags.forEach((tag: { kind?: string; value?: string }) => {
      if (tag.kind === 'bundle' && tag.value) {
        bundles.push(tag.value);
      } else if (tag.kind && tag.value) {
        if (!tagsByKind[tag.kind]) tagsByKind[tag.kind] = [];
        tagsByKind[tag.kind].push(tag.value);
      }
    });
  }
  formApi.change(NAME_BUNDLES, bundles);
  formApi.change(NAME_TAGS, tagsByKind);

  return null;
}
