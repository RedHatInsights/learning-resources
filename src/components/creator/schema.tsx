import {
  ConditionProp,
  Field,
  FormSpy,
  Schema,
  componentTypes,
  dataTypes,
  validatorTypes,
} from '@data-driven-forms/react-form-renderer';
import {
  ALL_ITEM_KINDS,
  ALL_KIND_ENTRIES,
  ItemKind,
  ItemMeta,
  isItemKind,
  metaForKind,
} from './meta';
import { ChromeAPI } from '@redhat-cloud-services/types';
import {
  WizardButtonsProps,
  WizardProps,
} from '@data-driven-forms/pf4-component-mapper';
import { WizardNextStepFunctionArgument } from '@data-driven-forms/pf4-component-mapper/wizard/wizard';
import React from 'react';
import { Button } from '@patternfly/react-core';

const CustomButtons = (props: WizardButtonsProps) => {
  return (
    <FormSpy
      subscription={{
        pristine: true,
        valid: true,
        validating: true,
        values: true, // The next step can depend on values.
      }}
    >
      {(state) => {
        // Ensure that the form never says "Submit", and hide the button on the
        // last step.

        const computedNext = props.nextStep
          ? props.selectNext(props.nextStep, () => state)
          : undefined;

        return (
          <>
            {computedNext !== undefined
              ? props.renderNextButton({ submitLabel: 'Next' })
              : null}
            <Button
              type="button"
              variant="secondary"
              isDisabled={props.disableBack}
              onClick={() => props.handlePrev()}
            >
              Back
            </Button>
          </>
        );
      }}
    </FormSpy>
  );
};

const REQUIRED = {
  type: validatorTypes.REQUIRED,
} as const;

function kindMetaCondition(test: (meta: ItemMeta) => boolean): ConditionProp {
  return {
    when: NAME_KIND,
    is: (kind: string | undefined) => {
      return (
        typeof kind === 'string' && isItemKind(kind) && test(metaForKind(kind))
      );
    },
  };
}

type Bundles = ReturnType<ChromeAPI['getAvailableBundles']>;

function detailsStepName(kind: ItemKind): string {
  return `step-details-${kind}`;
}

export const NAME_KIND = 'kind';
export const NAME_TITLE = 'title';
export const NAME_BUNDLES = 'bundles';
export const NAME_DESCRIPTION = 'description';
export const NAME_DURATION = 'duration';
export const NAME_URL = 'url';

export const NAME_PANEL_INTRODUCTION = 'panel-overview';
export const NAME_PREREQUISITES = 'prerequisites';
export const NAME_TASK_TITLES = 'task-titles';

const STEP_PANEL_OVERVIEW = 'step-panel-overview';
const STEP_DOWNLOAD = 'step-download';

function makeDetailsStep(kind: ItemKind, bundles: Bundles) {
  const meta = metaForKind(kind);

  const fields: Field[] = [];

  fields.push(
    {
      component: componentTypes.TEXT_FIELD,
      name: NAME_TITLE,
      label: 'Title',
      isRequired: true,
      validate: [REQUIRED],
    },
    {
      component: componentTypes.SELECT,
      name: NAME_BUNDLES,
      label: 'Bundles',
      simpleValue: true,
      isMulti: true,
      options: bundles.map((b) => ({
        value: b.id,
        label: `${b.title} (${b.id})`,
      })),
    },
    {
      component: componentTypes.TEXT_FIELD,
      name: NAME_DESCRIPTION,
      label: 'Description',
      isRequired: true,
      validate: [REQUIRED],
    }
  );

  if (meta.fields.duration) {
    fields.push({
      component: componentTypes.TEXT_FIELD,
      name: NAME_DURATION,
      label: 'Duration',
      dataType: dataTypes.NUMBER,
      isRequired: true,
      validate: [REQUIRED],
    });
  }

  if (meta.fields.url) {
    fields.push({
      component: componentTypes.TEXT_FIELD,
      name: NAME_URL,
      label: 'URL',
      isRequired: true,
      validate: [
        REQUIRED,
        {
          type: validatorTypes.URL,
        },
      ],
      condition: kindMetaCondition((meta) => meta.fields.url === true),
    });
  }

  return {
    name: detailsStepName(kind),
    title: `${meta.displayName} details`,
    fields: fields,
    nextStep: meta.hasTasks ? STEP_PANEL_OVERVIEW : STEP_DOWNLOAD,
  };
}

const MAX_TASKS = 10;

export const NAME_TASKS_ARRAY = 'tasks';
export const NAME_TASK_CONTENT = 'content';

const TASK_STEP_PREFIX = 'step-task-detail-';

function taskStepName(index: number): string {
  return `${TASK_STEP_PREFIX}${index}`;
}

export function taskFromStepName(name: string): number | null {
  if (name.startsWith(TASK_STEP_PREFIX)) {
    return parseInt(name.substring(TASK_STEP_PREFIX.length));
  }

  return null;
}

function makeTaskStep(index: number) {
  return {
    name: taskStepName(index),
    title: `Task ${index + 1}`,
    fields: [
      {
        component: componentTypes.TEXTAREA,
        name: `${NAME_TASKS_ARRAY}[${index}].${NAME_TASK_CONTENT}`,
        label: 'Task data (YAML)',
        resizeOrientation: 'vertical',
      },
      {
        component: 'lr-task-error',
        name: `internal-task-errors[${index}]`,
        index: index,
      },
    ],
    nextStep: ({ values }: WizardNextStepFunctionArgument) => {
      if (index + 1 < (values?.[NAME_TASK_TITLES]?.length ?? 0)) {
        return taskStepName(index + 1);
      }

      return STEP_DOWNLOAD;
    },
  };
}

export function makeSchema(chrome: ChromeAPI): Schema {
  const bundles = chrome.getAvailableBundles();

  const taskSteps = [];

  for (let i = 0; i < MAX_TASKS; ++i) {
    taskSteps.push(makeTaskStep(i));
  }

  const wizardProps: WizardProps & {
    component: string;
    name: string;
  } = {
    component: componentTypes.WIZARD,
    name: 'wizard-learning-resource',
    isDynamic: true,
    crossroads: [NAME_KIND, NAME_TASK_TITLES],
    fields: [
      {
        name: 'step-kind',
        title: 'Select content type',
        fields: [
          {
            component: componentTypes.SELECT,
            name: NAME_KIND,
            label: 'Type',
            simpleValue: true,
            options: ALL_KIND_ENTRIES.map(([name, value]) => ({
              value: name,
              label: value.displayName,
            })),
            isRequired: true,
            validate: [REQUIRED],
          },
        ],
        nextStep: {
          when: NAME_KIND,
          stepMapper: Object.fromEntries(
            ALL_ITEM_KINDS.map((kind) => [kind, detailsStepName(kind)])
          ),
        },
      },
      ...ALL_ITEM_KINDS.map((kind) => makeDetailsStep(kind, bundles)),
      {
        name: STEP_PANEL_OVERVIEW,
        title: 'Panel overview',
        fields: [
          {
            component: componentTypes.TEXTAREA,
            name: NAME_PANEL_INTRODUCTION,
            label: 'Introduction (Markdown)',
            resizeOrientation: 'vertical',
          },
          {
            component: componentTypes.FIELD_ARRAY,
            name: NAME_PREREQUISITES,
            label: 'Prerequisites',
            noItemsMessage: 'No prerequisites have been added.',
            fields: [
              {
                component: componentTypes.TEXT_FIELD,
                label: 'Prerequisite',
              },
            ],
          },
          {
            component: componentTypes.FIELD_ARRAY,
            name: NAME_TASK_TITLES,
            label: 'Tasks',
            minItems: 1,
            maxItems: MAX_TASKS,
            noItemsMessage: 'No tasks have been added.',
            initialValue: [''],
            fields: [
              {
                component: componentTypes.TEXT_FIELD,
                label: 'Title',
              },
            ],
          },
        ],
        nextStep: taskStepName(0),
      },
      ...taskSteps,
      {
        name: STEP_DOWNLOAD,
        title: 'Download files',
        fields: [
          {
            component: 'lr-download-files',
            name: 'internal-download',
          },
        ],
      },
    ],
  };

  const schema = {
    fields: [wizardProps],
  };

  for (const step of schema.fields) {
    if (step.component === componentTypes.WIZARD) {
      for (const page of step.fields) {
        // Add an lr-wizard-spy component to all wizard steps. It must be here (rather
        // than at the top level of the schema) so that it is inside the WizardContext.
        page.fields.push({
          component: 'lr-wizard-spy',
          name: `internal-wizard-spies.${page.name}`,
        });

        // Use custom buttons for each step.
        if (page.buttons === undefined) {
          page.buttons = CustomButtons;
        }
      }
    }
  }

  return schema;
}
