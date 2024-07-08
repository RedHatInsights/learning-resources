import {
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

function makeDetailsStep(kind: ItemKind, bundles: Bundles): object {
  const meta = itemKindMeta[kind];

  const fields = [];

  fields.push(
    {
      component: componentTypes.TEXT_FIELD,
      name: 'title',
      label: 'Title',
      isRequired: true,
      validate: [REQUIRED],
    },
    {
      component: componentTypes.SELECT,
      name: 'bundles',
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
      name: 'description',
      label: 'Description',
      isRequired: true,
      validate: [REQUIRED],
    }
  );

  if (meta.fields.duration) {
    fields.push({
      component: componentTypes.TEXT_FIELD,
      name: 'duration',
      label: 'Duration',
      dataType: dataTypes.NUMBER,
      isRequired: true,
      validate: [REQUIRED],
    });
  }

  if (meta.fields.url) {
    fields.push({
      component: componentTypes.TEXT_FIELD,
      name: 'url',
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
  };
}

export default function makeSchema(chrome: ChromeAPI): Schema {
  const bundles = chrome.getAvailableBundles();

  return {
    fields: [
      {
        component: componentTypes.WIZARD,
        name: 'wizard-learning-resource',
        isDynamic: true,
        fields: [
          {
            name: 'step-type',
            title: 'Select content type',
            fields: [
              {
                component: componentTypes.SELECT,
                name: 'type',
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
        ],
      },
    ],
  };
}
