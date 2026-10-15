import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Content,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ProgressStep,
  ProgressStepper,
  Radio,
  Select,
  SelectList,
  SelectOption,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import { ALL_KIND_ENTRIES, ItemKind, metaForKind } from '../meta';
import { listRepoQuickstarts } from '../../../utils/createQuickstartPR';
import { RESOURCE_NAME_PATTERN, scaffoldResource, slugify } from './scaffold';
import { QUICKSTARTS_DIR } from './workspace';

type NewResourceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, buffer: string) => void;
  /** Names already in the workspace. */
  taken: string[];
};

const STEPS = [
  { id: 'kind', title: 'Select content type' },
  { id: 'details', title: 'Resource details' },
  { id: 'placement', title: 'Placement' },
] as const;

/** The fields each step validates before moving on. */
const STEP_FIELDS = [
  ['kind'],
  ['title', 'name', 'description', 'url'],
  ['bundles'],
];

const isHttpUrl = (s: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(s).protocol);
  } catch {
    return false;
  }
};

const ErrorHelper: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <FormHelperText>
      <HelperText>
        <HelperTextItem variant="error">{message}</HelperTextItem>
      </HelperText>
    </FormHelperText>
  ) : null;

type Bundle = { id: string; title: string };

/** Multi-select for bundles, labelled the way the single-resource wizard is. */
const BundleSelect: React.FC<{
  bundles: Bundle[];
  selected: string[];
  onChange: (selected: string[]) => void;
}> = ({ bundles, selected, onChange }) => {
  const [isOpen, setOpen] = useState(false);
  const titleOf = (id: string) => bundles.find((b) => b.id === id)?.title ?? id;
  const toggle = (id: string) =>
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id]
    );
  return (
    <>
      <Select
        role="menu"
        isOpen={isOpen}
        selected={selected}
        onSelect={(_e, value) => toggle(value as string)}
        onOpenChange={setOpen}
        isScrollable
        maxMenuHeight="240px"
        toggle={(ref: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={ref}
            id="mr-bundles"
            onClick={() => setOpen((open) => !open)}
            isExpanded={isOpen}
            isFullWidth
          >
            {selected.length === 0
              ? 'Select all that apply'
              : `${selected.length} selected`}
          </MenuToggle>
        )}
      >
        <SelectList aria-label="Associated bundles">
          {bundles.map((b) => (
            <SelectOption
              key={b.id}
              value={b.id}
              hasCheckbox
              isSelected={selected.includes(b.id)}
            >
              {b.title} ({b.id})
            </SelectOption>
          ))}
        </SelectList>
      </Select>
      {selected.length > 0 && (
        <LabelGroup className="pf-v6-u-mt-sm" numLabels={6}>
          {selected.map((id) => (
            <Label
              key={id}
              variant="outline"
              onClose={() => toggle(id)}
              closeBtnAriaLabel={`Remove ${titleOf(id)}`}
            >
              {titleOf(id)}
            </Label>
          ))}
        </LabelGroup>
      )}
    </>
  );
};

/**
 * Scaffolds a new resource in three short steps, the way the single-resource
 * creator walks through them. Everything else is edited in YAML afterwards,
 * like the resources around it.
 */
const NewResourceModal: React.FC<NewResourceModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  taken,
}) => {
  const chrome = useChrome();
  const bundles = useMemo<Bundle[]>(() => chrome.getAvailableBundles(), []);
  const [step, setStep] = useState(0);
  // Validation shows on a step once Next was tried there.
  const [attempted, setAttempted] = useState<Set<number>>(new Set());
  const [kind, setKind] = useState<ItemKind | null>(null);
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [isEditingName, setEditingName] = useState(false);
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [selectedBundles, setSelectedBundles] = useState<string[]>([]);
  const [repoNames, setRepoNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setAttempted(new Set());
    setKind(null);
    setTitle('');
    setName('');
    setNameEdited(false);
    setEditingName(false);
    setDescription('');
    setUrl('');
    setSelectedBundles([]);
    let stale = false;
    // Best effort: the save itself refuses a directory that already exists.
    listRepoQuickstarts()
      .then((list) => {
        if (!stale) setRepoNames(new Set(list.map((e) => e.name)));
      })
      .catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [isOpen]);

  // The ID follows the title until the author edits it.
  const effectiveName = nameEdited ? name : slugify(title);
  // A URL typed for one type is kept when switching, but only used where the
  // type has a link.
  const needsUrl = !!kind && !!metaForKind(kind).fields.url;

  // A clash is worth showing as soon as it is typed; a missing ID only once
  // Next was tried.
  const nameClash = !effectiveName
    ? null
    : !RESOURCE_NAME_PATTERN.test(effectiveName)
    ? 'Use lowercase letters, numbers, and single hyphens.'
    : taken.includes(effectiveName)
    ? 'A resource with this ID is already in the workspace.'
    : repoNames.has(effectiveName)
    ? 'A resource with this ID already exists in the repository.'
    : null;
  const errors: Record<string, string | null> = {
    kind: kind ? null : 'Select a content type.',
    title: title.trim() ? null : 'A title is required.',
    name: effectiveName ? nameClash : 'A resource ID is required.',
    description: description.trim() ? null : 'A description is required.',
    url: !needsUrl
      ? null
      : !url.trim()
      ? 'A URL is required.'
      : !isHttpUrl(url.trim())
      ? 'Enter an http(s) URL.'
      : null,
    bundles:
      bundles.length > 0 && selectedBundles.length === 0
        ? 'Select at least one bundle.'
        : null,
  };
  const stepValid = (i: number) => STEP_FIELDS[i].every((f) => !errors[f]);
  const shown = (field: string) => {
    const i = STEP_FIELDS.findIndex((fields) => fields.includes(field));
    return attempted.has(i) ? errors[field] : null;
  };
  const nameError = nameClash ?? shown('name');

  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    setAttempted((old) => new Set(old).add(step));
    if (!stepValid(step)) {
      // A problem with the generated ID has to be visible to be fixed.
      if (step === 1 && errors.name) setEditingName(true);
      return;
    }
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    onCreate(
      effectiveName,
      scaffoldResource({
        kind: kind as ItemKind,
        name: effectiveName,
        title: title.trim(),
        description: description.trim(),
        url: needsUrl ? url.trim() : undefined,
        bundles: selectedBundles,
      })
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width="680px"
      aria-labelledby="mr-new-resource-title"
      // Modals render outside the app root, where its scoped styles stop.
      className="learning-resources lr-c-multi-edit-new"
    >
      <ModalHeader
        title="New resource"
        labelId="mr-new-resource-title"
        description="Add this resource to your workspace. Save the workspace to include it in the pull request."
      />
      <ModalBody>
        <ProgressStepper
          isCenterAligned
          isCompact
          aria-label="New resource steps"
          className="pf-v6-u-mb-lg"
        >
          {STEPS.map((s, i) => (
            <ProgressStep
              key={s.id}
              id={`mr-new-step-${s.id}`}
              titleId={`mr-new-step-${s.id}-title`}
              variant={i < step ? 'success' : i === step ? 'info' : 'pending'}
              isCurrent={i === step}
              aria-label={`${s.title}${
                i < step ? ', completed' : i === step ? ', current step' : ''
              }`}
            >
              {s.title}
            </ProgressStep>
          ))}
        </ProgressStepper>
        <Form
          id="mr-new-resource-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleNext();
          }}
        >
          {step === 0 && (
            <FormGroup
              label="Select content type"
              role="radiogroup"
              isStack
              isRequired
              fieldId="mr-kind"
            >
              <Content component="p">
                Learning resources are grouped by their &apos;content
                type&apos;.
              </Content>
              {ALL_KIND_ENTRIES.map(([id, meta]) => (
                <Radio
                  key={id}
                  id={`mr-kind-${id}`}
                  name="mr-kind"
                  label={meta.displayName}
                  isChecked={kind === id}
                  onChange={() => setKind(id)}
                />
              ))}
              {kind === 'quickstart' && (
                <HelperText>
                  <HelperTextItem>
                    A starter panel and task are generated. Refine them in YAML
                    once the resource is in your workspace.
                  </HelperTextItem>
                </HelperText>
              )}
              <ErrorHelper message={shown('kind')} />
            </FormGroup>
          )}

          {step === 1 && (
            <>
              <FormGroup label="Resource title" isRequired fieldId="mr-title">
                <TextInput
                  id="mr-title"
                  isRequired
                  value={title}
                  validated={shown('title') ? 'error' : 'default'}
                  onChange={(_e, value) => setTitle(value)}
                  placeholder="Title to display on card"
                  autoFocus
                />
                <ErrorHelper message={shown('title')} />
              </FormGroup>
              <FormGroup
                label="Resource ID (metadata.name)"
                isRequired
                fieldId="mr-name"
              >
                {isEditingName ? (
                  <TextInput
                    id="mr-name"
                    isRequired
                    value={effectiveName}
                    validated={nameError ? 'error' : 'default'}
                    onChange={(_e, value) => {
                      setNameEdited(true);
                      setName(value);
                    }}
                  />
                ) : (
                  <div className="lr-c-multi-edit-new__id">
                    <code>{effectiveName || 'Generated from the title'}</code>
                    <Button
                      variant="link"
                      isInline
                      onClick={() => setEditingName(true)}
                      aria-label="Edit resource ID"
                    >
                      Edit
                    </Button>
                  </div>
                )}
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant={nameError ? 'error' : 'default'}>
                      {nameError ??
                        `Names the folder ${QUICKSTARTS_DIR}/${
                          effectiveName || '<id>'
                        }/. Changing the title never changes it; changing the ID later moves the resource.`}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              <FormGroup
                label="Resource description"
                isRequired
                fieldId="mr-description"
              >
                <TextArea
                  id="mr-description"
                  isRequired
                  value={description}
                  rows={2}
                  resizeOrientation="vertical"
                  validated={shown('description') ? 'error' : 'default'}
                  onChange={(_e, value) => setDescription(value)}
                  placeholder="Short description, truncated on the card after 3 lines."
                />
                <ErrorHelper message={shown('description')} />
              </FormGroup>
              {needsUrl && (
                <FormGroup label="Endpoint URL" isRequired fieldId="mr-url">
                  <TextInput
                    id="mr-url"
                    type="url"
                    isRequired
                    value={url}
                    validated={shown('url') ? 'error' : 'default'}
                    onChange={(_e, value) => setUrl(value)}
                    placeholder="https://docs.redhat.com/..."
                  />
                  <ErrorHelper message={shown('url')} />
                </FormGroup>
              )}
            </>
          )}

          {step === 2 && (
            <FormGroup
              label="Associated bundle(s)"
              isRequired={bundles.length > 0}
              fieldId="mr-bundles"
            >
              {bundles.length > 0 ? (
                <BundleSelect
                  bundles={bundles}
                  selected={selectedBundles}
                  onChange={setSelectedBundles}
                />
              ) : (
                <Content component="p">No bundles are available.</Content>
              )}
              <FormHelperText>
                <HelperText>
                  <HelperTextItem
                    variant={shown('bundles') ? 'error' : 'default'}
                  >
                    {shown('bundles') ??
                      'Other tags can be added in YAML once the resource is in your workspace.'}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" type="submit" form="mr-new-resource-form">
          {isLast ? 'Add to workspace' : 'Next'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setStep(step - 1)}
          isDisabled={step === 0}
        >
          Back
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default NewResourceModal;
