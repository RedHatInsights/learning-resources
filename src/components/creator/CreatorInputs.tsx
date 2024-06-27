import {
  FormGroup,
  NumberInput,
  Radio,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import React from 'react';
import SelectMultiTypeahead from '../SelectMultiTypeahead';
import { ItemKind, itemKindMeta } from './meta';

export type InputProps<T> = {
  value: T;
  onChange: (newValue: T) => void;
};

export const TypeInput = ({ value, onChange }: InputProps<ItemKind | null>) => {
  const elementId = `rc-input-type`;

  return (
    <FormGroup label="Select content type" isRequired fieldId={elementId}>
      <FormGroup
        id={elementId}
        role="radiogroup"
        aria-label="Select content type"
      >
        {Object.entries(itemKindMeta).map(([rawName, meta]) => {
          const name = rawName as keyof typeof itemKindMeta;

          return (
            <Radio
              key={name}
              id={`cr-input-type-${name}`}
              name="cr-input-type"
              isChecked={value === name}
              onChange={(_, isChecked) => {
                if (isChecked) {
                  onChange(name);
                } else if (value === name) {
                  onChange(null);
                }
              }}
              label={meta.displayName}
            ></Radio>
          );
        })}
      </FormGroup>
    </FormGroup>
  );
};

export const BundleInput = ({ value, onChange }: InputProps<string[]>) => {
  const { getAvailableBundles } = useChrome();
  const bundles = getAvailableBundles();
  const elementId = `rc-input-bundle`;

  return (
    <FormGroup label="Bundles" isRequired fieldId={elementId}>
      <SelectMultiTypeahead
        options={bundles.map((b) => ({
          value: b.id,
          children: `${b.title} (${b.id})`,
        }))}
        selected={value}
        onChangeSelected={onChange}
      />
    </FormGroup>
  );
};

export const TitleInput = ({ value, onChange }: InputProps<string>) => {
  const elementId = `rc-input-title`;

  return (
    <FormGroup label="Title" isRequired fieldId={elementId}>
      <TextInput
        id={elementId}
        isRequired
        type="text"
        value={value}
        onChange={(_, value) => onChange(value)}
        aria-label="Resource title"
        placeholder="Title to display on card"
      />
    </FormGroup>
  );
};

export const DescriptionInput = ({ value, onChange }: InputProps<string>) => {
  const elementId = `rc-input-description`;

  return (
    <FormGroup label="Description" isRequired fieldId={elementId}>
      <TextArea
        id={elementId}
        isRequired
        type="text"
        value={value}
        onChange={(_, value) => onChange(value)}
        aria-label="Resource title"
        placeholder="Short description of resource and will auto-truncate with '...' after 3 lines"
        rows={3}
        resizeOrientation="vertical"
      ></TextArea>
    </FormGroup>
  );
};

export const UrlInput = ({ value, onChange }: InputProps<string>) => {
  const elementId = `rc-input-url`;

  return (
    <FormGroup label="Resource URL" isRequired fieldId={elementId}>
      <TextInput
        id={elementId}
        isRequired
        type="url"
        value={value}
        onChange={(_, value) => onChange(value)}
        aria-label="Resource URL"
        placeholder="https://url.redhat.com/docs-n-things"
      ></TextInput>
    </FormGroup>
  );
};

export const DurationInput = ({ value, onChange }: InputProps<number>) => {
  const elementId = `rc-input-duration`;

  return (
    <FormGroup
      label="Approximate completion time"
      isRequired
      fieldId={elementId}
    >
      <NumberInput
        id={elementId}
        type="number"
        value={value}
        unit="minutes"
        onChange={(event) =>
          onChange(Math.max(0, parseInt(event.currentTarget.value, 10)))
        }
        onPlus={() => onChange(Math.max(0, value + 1))}
        onMinus={() => onChange(Math.max(0, value - 1))}
        inputAriaLabel="Approximate completion time"
        minusBtnAriaLabel="Decrease approximate completion time"
        plusBtnAriaLabel="Increase approximate completion time"
        min={0}
      />
    </FormGroup>
  );
};
