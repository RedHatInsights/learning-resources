import {
  Schema,
  componentTypes,
  dataTypes,
  validatorTypes,
} from '@data-driven-forms/react-form-renderer';
import { isItemKind, itemKindMeta } from './meta';
import { ChromeAPI } from '@redhat-cloud-services/types';

const REQUIRED = {
  type: validatorTypes.REQUIRED,
} as const;

export default function makeSchema(chrome: ChromeAPI): Schema {
  return {
    fields: [
      {
        component: componentTypes.WIZARD,
        name: 'wizard-field',
        isDynamic: true,
        fields: [
          {
            name: 'overview',
            title: 'Overview',
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
                options: chrome.getAvailableBundles().map((b) => ({
                  value: b.id,
                  label: `${b.title} (${b.id})`,
                })),
              },
              {
                component: componentTypes.TEXT_FIELD,
                name: 'duration',
                label: 'Duration',
                isRequired: true,
                dataType: dataTypes.NUMBER,
                validate: [REQUIRED],
                condition: {
                  when: 'type',
                  is: (type: string | undefined) => {
                    return (
                      typeof type === 'string' &&
                      isItemKind(type) &&
                      itemKindMeta[type]?.fields?.duration === true
                    );
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}
