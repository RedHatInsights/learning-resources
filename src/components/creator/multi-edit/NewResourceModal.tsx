import React, { useEffect, useMemo, useRef } from 'react';
import {
  AnyObject,
  Field,
  FormRenderer,
  Schema,
  componentTypes,
} from '@data-driven-forms/react-form-renderer';
import pf4ComponentMapper from '@data-driven-forms/pf4-component-mapper/component-mapper';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import { ALL_ITEM_KINDS, ItemKind, isItemKind, metaForKind } from '../meta';
import { Bundles, makeDetailsStep } from '../steps/details';
import { makeKindStep } from '../steps/kind';
import {
  NAME_BUNDLES,
  NAME_DESCRIPTION,
  NAME_DURATION,
  NAME_KIND,
  NAME_METADATA_NAME,
  NAME_TAGS,
  NAME_TITLE,
  NAME_URL,
} from '../steps/common';
import DdfNumberInput from '../../DdfNumberInput';
import TagsSelector from '../TagsSelector';
import { FilterData } from '../../../utils/FiltersCategoryInterface';
import { listRepoQuickstarts } from '../../../utils/createQuickstartPR';
import { scaffoldResource, slugify } from './scaffold';

type NewResourceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, buffer: string) => void;
  /** Names already in the workspace. */
  taken: string[];
  filterData: FilterData;
};

const TITLE_ID = 'mr-new-resource-title';

const componentMapper = {
  ...pf4ComponentMapper,
  'lr-number-input': DdfNumberInput,
  'lr-tag-filter-selector': TagsSelector,
};

/** Why an ID cannot be used for a new resource, if it cannot. */
type IdProblem = (id: string) => string | undefined;

const nameOf = (values: AnyObject): string =>
  values[NAME_METADATA_NAME] || slugify(values[NAME_TITLE] ?? '');

/**
 * The single-resource wizard's content type and details steps, ending where
 * that wizard moves on to the panel and tasks. The ID is checked against the
 * workspace and repository, through whichever field it comes from.
 */
export function makeNewResourceSchema(
  bundles: Bundles,
  filterData: FilterData,
  idProblem: IdProblem
): Schema {
  const checkId = (field: Field): Field => {
    if (field.name === NAME_METADATA_NAME) {
      return {
        ...field,
        validate: [
          ...(field.validate ?? []),
          (value?: string) => (value ? idProblem(value) : undefined),
        ],
      };
    }
    if (field.name === NAME_TITLE) {
      // Without its own ID the title supplies one, so a clash shows here.
      return {
        ...field,
        validate: [
          ...(field.validate ?? []),
          (value: string | undefined, values?: AnyObject) => {
            if (values?.[NAME_METADATA_NAME] || !value?.trim())
              return undefined;
            const id = slugify(value);
            if (!id) return 'This title gives no resource ID. Set one below.';
            const problem = idProblem(id);
            return problem && `${problem} Change the title or set an ID below.`;
          },
        ],
      };
    }
    return field;
  };

  const detailsSteps = ALL_ITEM_KINDS.map((kind) => {
    // Without a next step this is the last one, so it submits.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { nextStep, buttonLabels, ...step } = makeDetailsStep({
      kind,
      bundles,
      downloadStep: '',
      filterData,
      showResourceId: true,
    });
    return {
      ...step,
      fields: [
        ...step.fields.map(checkId),
        ...(metaForKind(kind).hasTasks
          ? [
              {
                component: componentTypes.PLAIN_TEXT,
                name: 'internal-text-new-quickstart',
                label:
                  'A starter panel and task are added to the YAML. Fill them in once the resource is in your workspace.',
              },
            ]
          : []),
      ],
    };
  });

  return {
    fields: [
      {
        component: componentTypes.WIZARD,
        name: 'wizard-new-resource',
        inModal: true,
        title: 'New resource',
        description:
          'Add this resource to your workspace. Save the workspace to include it in the pull request.',
        titleId: TITLE_ID,
        ModalProps: {
          'aria-labelledby': TITLE_ID,
          // Appended to the wizard's own class without a space. Modals render
          // outside the app root, where its scoped styles stop.
          className: ' learning-resources lr-c-multi-edit-new',
        },
        isDynamic: true,
        crossroads: [NAME_KIND],
        buttonLabels: {
          next: 'Next',
          submit: 'Add to workspace',
          back: 'Back',
          cancel: 'Cancel',
        },
        fields: [makeKindStep(), ...detailsSteps],
      },
    ],
  };
}

/** The YAML a finished wizard adds to the workspace. */
export function scaffoldFromValues(values: AnyObject): {
  name: string;
  buffer: string;
} {
  const kind = values[NAME_KIND] as ItemKind;
  const meta = metaForKind(kind);
  const name = nameOf(values);
  return {
    name,
    buffer: scaffoldResource({
      kind,
      name,
      title: (values[NAME_TITLE] ?? '').trim(),
      description: (values[NAME_DESCRIPTION] ?? '').trim(),
      // A value typed for another type is kept, but only used where it applies.
      url: meta.fields.url ? (values[NAME_URL] ?? '').trim() : undefined,
      durationMinutes:
        meta.fields.duration && typeof values[NAME_DURATION] === 'number'
          ? values[NAME_DURATION]
          : undefined,
      bundles: values[NAME_BUNDLES] ?? [],
      tags: values[NAME_TAGS] ?? {},
    }),
  };
}

/**
 * Scaffolds a new resource with the same steps and fields as the
 * single-resource creator, then hands it to the workspace as YAML.
 */
const NewResourceModal: React.FC<NewResourceModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  taken,
  filterData,
}) => {
  const chrome = useChrome();
  // Read by the validators, so the schema stays put while they change.
  const takenRef = useRef(taken);
  takenRef.current = taken;
  const repoNames = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    let stale = false;
    // Best effort: the save itself refuses a directory that already exists.
    listRepoQuickstarts()
      .then((list) => {
        if (!stale) repoNames.current = new Set(list.map((e) => e.name));
      })
      .catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [isOpen]);

  const schema = useMemo(
    () =>
      makeNewResourceSchema(chrome.getAvailableBundles(), filterData, (id) =>
        takenRef.current.includes(id)
          ? 'A resource with this ID is already in the workspace.'
          : repoNames.current.has(id)
          ? 'A resource with this ID already exists in the repository.'
          : undefined
      ),
    [filterData]
  );

  // Mounted only while open, so every wizard starts fresh.
  if (!isOpen) return null;

  return (
    <FormRenderer
      schema={schema}
      componentMapper={componentMapper}
      onCancel={onClose}
      onSubmit={(values: AnyObject) => {
        if (typeof values[NAME_KIND] !== 'string') return;
        if (!isItemKind(values[NAME_KIND])) return;
        const { name, buffer } = scaffoldFromValues(values);
        onCreate(name, buffer);
        onClose();
      }}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {({ formFields }) => <>{formFields as any}</>}
    </FormRenderer>
  );
};

export default NewResourceModal;
