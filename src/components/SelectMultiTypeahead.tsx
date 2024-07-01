import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { MenuToggleElement } from '@patternfly/react-core/dist/js';
import {
  Button,
  Chip,
  ChipGroup,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  SelectOptionProps,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import TimesIcon from '@patternfly/react-icons/dist/dynamic/icons/times-icon';

const SelectMultiTypeahead = ({
  options,
  selected,
  onChangeSelected,
}: {
  options: SelectOptionProps[];
  selected: string[];
  onChangeSelected: (newSelections: string[]) => void;
}) => {
  // Cache initial options to avoid having to deal with them changing.
  const initialOptions = useMemo(() => options, []);

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectOptions, setSelectOptions] =
    useState<SelectOptionProps[]>(options);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const textInputRef = useRef<HTMLInputElement>();
  const elementId = `multi-typeahead-select`;

  useEffect(() => {
    let newSelectOptions: SelectOptionProps[] = initialOptions;

    // Filter menu items based on the text input value when one exists
    if (inputValue) {
      newSelectOptions = initialOptions.filter((menuItem) =>
        String(menuItem.children)
          .toLowerCase()
          .includes(inputValue.toLowerCase())
      );

      // When no options are found after filtering, display 'No results found'
      if (!newSelectOptions.length) {
        newSelectOptions = [
          {
            isDisabled: false,
            children: `No results found for "${inputValue}"`,
            value: undefined,
          },
        ];
      }

      // Open the menu when the input value changes and the new value is not empty
      if (!isOpen) {
        setIsOpen(true);
      }
    }

    setSelectOptions(newSelectOptions);
    setFocusedItemIndex(null);
    setActiveItem(null);
  }, [inputValue]);

  const handleMenuArrowKeys = (key: string) => {
    let indexToFocus;

    if (isOpen) {
      if (key === 'ArrowUp') {
        // When no index is set or at the first index, focus to the last, otherwise decrement focus index
        if (focusedItemIndex === null || focusedItemIndex === 0) {
          indexToFocus = selectOptions.length - 1;
        } else {
          indexToFocus = focusedItemIndex - 1;
        }
      }

      if (key === 'ArrowDown') {
        // When no index is set or at the last index, focus to the first, otherwise increment focus index
        if (
          focusedItemIndex === null ||
          focusedItemIndex === selectOptions.length - 1
        ) {
          indexToFocus = 0;
        } else {
          indexToFocus = focusedItemIndex + 1;
        }
      }

      if (indexToFocus !== undefined) {
        setFocusedItemIndex(indexToFocus);
        const focusedItem = selectOptions.filter(
          (option) => !option.isDisabled
        )[indexToFocus];
        setActiveItem(
          `select-multi-typeahead-${focusedItem.value.replaceAll(/\s/g, '-')}`
        );
      }
    }
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const enabledMenuItems = selectOptions.filter(
      (menuItem) => !menuItem.isDisabled
    );
    const [firstMenuItem] = enabledMenuItems;
    const focusedItem = focusedItemIndex
      ? enabledMenuItems[focusedItemIndex]
      : firstMenuItem;

    switch (event.key) {
      // Select the first available option
      case 'Enter':
        if (!isOpen) {
          setIsOpen((prevIsOpen) => !prevIsOpen);
        } else if (isOpen && focusedItem.value !== undefined) {
          onSelect(focusedItem.value as string);
        }
        break;
      case 'Tab':
      case 'Escape':
        setIsOpen(false);
        setActiveItem(null);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        event.preventDefault();
        handleMenuArrowKeys(event.key);
        break;
    }
  };

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const onTextInputChange = (
    _event: React.FormEvent<HTMLInputElement>,
    value: string
  ) => {
    setInputValue(value);
  };

  const onSelect = (value: string | null) => {
    if (value !== null) {
      onChangeSelected(
        selected.includes(value)
          ? selected.filter((selection) => selection !== value)
          : [...selected, value]
      );
    }

    textInputRef.current?.focus();
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      variant="typeahead"
      aria-label="Multi typeahead menu toggle"
      onClick={onToggleClick}
      innerRef={toggleRef}
      isExpanded={isOpen}
      isFullWidth
    >
      <TextInputGroup isPlain>
        <TextInputGroupMain
          value={inputValue}
          onClick={onToggleClick}
          onChange={onTextInputChange}
          onKeyDown={onInputKeyDown}
          id="multi-typeahead-select-input"
          autoComplete="off"
          innerRef={textInputRef}
          placeholder="Select a state"
          {...(activeItem && { 'aria-activedescendant': activeItem })}
          role="combobox"
          isExpanded={isOpen}
          aria-controls="select-multi-typeahead-listbox"
        >
          <ChipGroup aria-label="Current selections">
            {selected.map((selection, index) => (
              <Chip
                key={index}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onSelect(selection);
                }}
              >
                {selection}
              </Chip>
            ))}
          </ChipGroup>
        </TextInputGroupMain>
        <TextInputGroupUtilities>
          {selected.length > 0 && (
            <Button
              variant="plain"
              onClick={() => {
                setInputValue('');
                onChangeSelected([]);
                textInputRef?.current?.focus();
              }}
              aria-label="Clear input value"
            >
              <TimesIcon aria-hidden />
            </Button>
          )}
        </TextInputGroupUtilities>
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <Select
      id={elementId}
      isOpen={isOpen}
      selected={selected}
      onSelect={(ev, selection) => onSelect(selection as string)}
      onOpenChange={() => setIsOpen(false)}
      toggle={toggle}
    >
      <SelectList isAriaMultiselectable id={`${elementId}-listbox`}>
        {selectOptions.map((option, index) => (
          <SelectOption
            key={
              typeof option.value === 'string' ||
              typeof option.value === 'number'
                ? `value:${option.value}`
                : `index:${index}`
            }
            isFocused={focusedItemIndex === index}
            className={option.className}
            id={`${elementId}-${
              option.value?.replace(' ', '-') ?? 'undefined'
            }`}
            {...option}
            ref={null}
          />
        ))}
      </SelectList>
    </Select>
  );
};

export default SelectMultiTypeahead;
