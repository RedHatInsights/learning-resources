import {
  AnyObject,
  ConditionProp,
  Schema,
  componentTypes,
  dataTypes,
  validatorTypes,
} from '@data-driven-forms/react-form-renderer';
import {
  ALL_ITEM_KINDS,
  ItemKind,
  ItemMeta,
  isItemKind,
  itemKindMeta,
} from './meta';
import { ChromeAPI } from '@redhat-cloud-services/types';

const REQUIRED = {
  type: validatorTypes.REQUIRED,
} as const;

function kindMetaCondition(test: (meta: ItemMeta) => boolean): ConditionProp {
  return {
    when: 'type',
    is: (kind: string | undefined) => {
      return (
        typeof kind === 'string' && isItemKind(kind) && test(itemKindMeta[kind])
      );
    },
  };
}

type Bundles = ReturnType<ChromeAPI['getAvailableBundles']>;

function detailsStepName(kind: ItemKind): string {
  return `step-details-${kind}`;
}

export const NAME_TYPE = 'type';
export const NAME_TITLE = 'title';
export const NAME_BUNDLES = 'bundles';
export const NAME_DESCRIPTION = 'description';
export const NAME_DURATION = 'duration';
export const NAME_URL = 'url';

export const NAME_PANEL_INTRODUCTION = 'panel-overview';
export const NAME_PREREQUISITES = 'prerequisites';
export const NAME_TASK_TITLES = 'task-titles';

function makeDetailsStep(kind: ItemKind, bundles: Bundles): object {
  const meta = itemKindMeta[kind];

  const fields = [];

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
    nextStep: meta.hasTasks ? 'step-panel-overview' : undefined,
  };
}

const MAX_TASKS = 10;

export const NAME_TASKS_ARRAY = 'tasks';
export const NAME_TASK_CONTENT = 'content';

function taskStepName(index: number): string {
  return `step-task-detail-${index}`;
}

function makeTaskStep(index: number): object {
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
    nextStep: ({ values }: { values: AnyObject }) => {
      if (index + 1 < (values[NAME_TASK_TITLES]?.length ?? 0)) {
        return taskStepName(index + 1);
      }

      return undefined;
    },
  };
}

export function makeSchema(chrome: ChromeAPI): Schema {
  const bundles = chrome.getAvailableBundles();

  const taskSteps = [];

  for (let i = 0; i < MAX_TASKS; ++i) {
    taskSteps.push(makeTaskStep(i));
  }

  return {
    fields: [
      {
        component: componentTypes.WIZARD,
        name: 'wizard-learning-resource',
        isDynamic: true,
        crossroads: [NAME_TYPE, NAME_TASK_TITLES],
        fields: [
          {
            name: 'step-type',
            title: 'Select content type',
            fields: [
              {
                component: componentTypes.SELECT,
                name: NAME_TYPE,
                label: 'Type',
                simpleValue: true,
                options: Object.entries(itemKindMeta).map(([name, value]) => ({
                  value: name,
                  label: value.displayName,
                })),
                isRequired: true,
                validate: [REQUIRED],
              },
            ],
            nextStep: {
              when: 'type',
              stepMapper: Object.fromEntries(
                ALL_ITEM_KINDS.map((kind) => [kind, detailsStepName(kind)])
              ),
            },
          },
          ...ALL_ITEM_KINDS.map((kind) => makeDetailsStep(kind, bundles)),
          {
            name: 'step-panel-overview',
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
        ],
      },
    ],
  };
}
