import { ItemKind, ItemMeta, isItemKind, metaForKind } from '../meta';
import {
  ConditionProp,
  Field,
  componentTypes,
  dataTypes,
  validatorTypes,
} from '@data-driven-forms/react-form-renderer';
import React from 'react';
import { ChromeAPI } from '@redhat-cloud-services/types';
import {
  NAME_BUNDLES,
  NAME_DESCRIPTION,
  NAME_DURATION,
  NAME_KIND,
  NAME_TAGS,
  NAME_TITLE,
  NAME_URL,
  REQUIRED,
} from './common';
import { panelOverviewStepName } from './panel-overview';
import { FilterData } from '../../../utils/FiltersCategoryInterface';

export type Bundles = ReturnType<ChromeAPI['getAvailableBundles']>;

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

const DETAILS_STEP_PREFIX = 'step-details-';

export function isDetailsStep(name: string): boolean {
  return name.startsWith(DETAILS_STEP_PREFIX);
}

export function detailsStepName(kind: ItemKind): string {
  return `${DETAILS_STEP_PREFIX}${kind}`;
}

export function makeDetailsStep({
  kind,
  bundles,
  downloadStep,
  filterData,
}: {
  kind: ItemKind;
  bundles: Bundles;
  downloadStep: string;
  filterData: FilterData;
}) {
  const meta = metaForKind(kind);

  const fields: Field[] = [];

  fields.push(
    {
      component: componentTypes.PLAIN_TEXT,
      name: 'internal-text-details-description',
      label:
        'Share the details required to populate a card in the correct places.',
    },
    {
      component: componentTypes.SELECT,
      name: NAME_BUNDLES,
      label: 'Associated bundle(s)',
      simpleValue: true,
      isMulti: true,
      placeholder: 'Select all that apply',
      options: bundles.map((b) => ({
        value: b.id,
        label: `${b.title} (${b.id})`,
      })),
      isRequired: true,
      validate: [REQUIRED],
    },
    {
      component: 'lr-tag-filter-selector',
      name: NAME_TAGS,
      label: 'Resource tags(s)',
      filterData,
      isRequired: true,
      validate: [REQUIRED],
    },
    {
      component: componentTypes.TEXT_FIELD,
      name: NAME_TITLE,
      label: 'Resource title',
      placeholder: 'Title to display on card',
      isRequired: true,
      validate: [REQUIRED],
    },
    {
      component: componentTypes.TEXTAREA,
      name: NAME_DESCRIPTION,
      label: 'Resource description',
      placeholder:
        "Short description of resource and will auto-truncate on card with '...' after 3 lines of text.",
      isRequired: true,
      validate: [REQUIRED],
      resizeOrientation: 'vertical',
    }
  );

  if (meta.fields.duration) {
    fields.push({
      component: 'lr-number-input',
      name: NAME_DURATION,
      label: 'Duration',
      unit: <span className="pf-v6-u-text-nowrap">minutes</span>,
      dataType: dataTypes.NUMBER,
      initialValue: 0,
      minValue: 0,
      isRequired: true,
      validate: [REQUIRED],
    });
  }

  if (meta.fields.url) {
    fields.push({
      component: componentTypes.TEXT_FIELD,
      name: NAME_URL,
      label: 'Endpoint URL',
      placeholder: 'http://url.redhat.com/docs-n-things',
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
    nextStep: meta.hasTasks ? panelOverviewStepName(kind) : downloadStep,
    buttonLabels: {
      next: meta.hasTasks
        ? `Approve card and create ${meta.displayName} panel`
        : 'Approve card and generate files',
    },
  };
}
