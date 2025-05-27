import React, { useId } from 'react';
import {
  Button,
  Flex,
  FlexItem,
  FormGroup,
  FormSection,
  TextInput,
} from '@patternfly/react-core';
import MinusCircleIcon from '@patternfly/react-icons/dist/dynamic/icons/minus-circle-icon';
import {
  UseFieldApiConfig,
  useFieldApi,
} from '@data-driven-forms/react-form-renderer';

const DEFAULT_VALUE: string[] = [];
const DEFAULT_LABEL = (index: number) => `Item ${index + 1}`;

const StringArrayInput = (props: UseFieldApiConfig) => {
  const id = useId();

  const { input, ...rest } = useFieldApi(props);
  const reactId = useId();
  const effectiveId = rest.id || reactId;

  const defaultItem = rest.defaultItem ?? '';

  const value: string[] = input.value ?? DEFAULT_VALUE;
  const itemLabel: (index: number) => string = rest.itemLabel ?? DEFAULT_LABEL;

  const minItems: number | undefined = rest.minItems;
  const maxItems: number | undefined = rest.maxItems;

  if (minItems !== undefined) {
    if (value.length < minItems) {
      const newValue = [...value];

      for (let i = 0; i < minItems - value.length; ++i) {
        newValue.push(defaultItem);
      }

      input.onChange(newValue);
    }
  }

  const canRemove = minItems === undefined || value.length > minItems;
  const canAdd = maxItems === undefined || value.length < maxItems;

  const addLabel = rest.addLabel ?? 'Add item';
  const addLabelIcon = rest.addLabelIcon;

  const fullMessage = rest.fullMessage ?? 'No more items can be added';

  return (
    <FormSection
      title={rest.label ?? 'Array'}
      id={effectiveId}
      name={input.name}
      className="pf-v6-u-m-0"
    >
      <div className="pf-v6-c-form pf-m-horizontal">
        {value.map((element, index) => {
          const elementId = `${id}-${index}-title`;

          return (
            <FormGroup
              key={index}
              label={itemLabel(index)}
              fieldId={elementId}
              isRequired
            >
              <Flex gap={{ default: 'gapNone' }}>
                <FlexItem grow={{ default: 'grow' }}>
                  <TextInput
                    id={elementId}
                    name={`${input.name}[index]`}
                    isRequired
                    type="text"
                    value={element}
                    onChange={(_, newItem) => {
                      const newValue = [...value];
                      newValue[index] = newItem;

                      input.onChange(newValue);
                    }}
                  />
                </FlexItem>

                {canRemove ? (
                  <FlexItem>
                    <Button
                      aria-label={`Remove item ${index + 1}`}
                      variant="plain"
                      icon={<MinusCircleIcon />}
                      onClick={() => input.onChange(value.toSpliced(index, 1))}
                    />
                  </FlexItem>
                ) : null}
              </Flex>
            </FormGroup>
          );
        })}
      </div>

      {canAdd ? (
        <Button
          variant="link"
          icon={addLabelIcon}
          onClick={() => input.onChange(value.concat(defaultItem))}
          isInline={true}
        >
          {addLabel}
        </Button>
      ) : (
        <span>{fullMessage}</span>
      )}
    </FormSection>
  );
};

export default StringArrayInput;
