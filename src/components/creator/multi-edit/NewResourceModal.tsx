import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Radio,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import { ALL_KIND_ENTRIES, ItemKind } from '../meta';
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

const KIND_HINTS: Record<ItemKind, string> = {
  documentation: 'A card linking to product documentation.',
  quickstart: 'Step-by-step tasks shown in the quick start panel.',
  learningPath: 'A card linking to a learning path.',
  other: 'A card linking to any other resource.',
};

const isHttpUrl = (s: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(s).protocol);
  } catch {
    return false;
  }
};

/**
 * Scaffolds a new resource from a handful of fields. Everything else is
 * edited in YAML afterwards, like the resources around it.
 */
const NewResourceModal: React.FC<NewResourceModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  taken,
}) => {
  const chrome = useChrome();
  const bundles = useMemo(() => chrome.getAvailableBundles(), []);
  const [kind, setKind] = useState<ItemKind>('documentation');
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [selectedBundles, setSelectedBundles] = useState<string[]>([]);
  const [repoNames, setRepoNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    setKind('documentation');
    setTitle('');
    setName('');
    setNameEdited(false);
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

  const effectiveName = nameEdited ? name : slugify(title);
  const needsUrl = kind !== 'quickstart';

  const nameError = !effectiveName
    ? null
    : !RESOURCE_NAME_PATTERN.test(effectiveName)
    ? 'Use lowercase letters, numbers, and single hyphens.'
    : taken.includes(effectiveName)
    ? 'A resource with this name is already in the workspace.'
    : repoNames.has(effectiveName)
    ? 'A resource with this name already exists in the repository.'
    : null;
  const urlError =
    needsUrl && url && !isHttpUrl(url) ? 'Enter an http(s) URL.' : null;

  const canCreate =
    title.trim() !== '' &&
    effectiveName !== '' &&
    !nameError &&
    (!needsUrl || (url !== '' && !urlError));

  const handleCreate = () => {
    if (!canCreate) return;
    onCreate(
      effectiveName,
      scaffoldResource({
        kind,
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
      variant="medium"
      aria-labelledby="mr-new-resource-title"
      // Modals render outside the app root, where its scoped styles stop.
      className="learning-resources"
    >
      <ModalHeader
        title="New resource"
        labelId="mr-new-resource-title"
        description="Creates the resource's files in this pull request. You can refine everything in YAML afterwards."
      />
      <ModalBody>
        <Form
          id="mr-new-resource-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <FormGroup label="Type" role="radiogroup" isStack fieldId="mr-kind">
            {ALL_KIND_ENTRIES.map(([id, meta]) => (
              <Radio
                key={id}
                id={`mr-kind-${id}`}
                name="mr-kind"
                label={meta.displayName}
                description={KIND_HINTS[id]}
                isChecked={kind === id}
                onChange={() => setKind(id)}
              />
            ))}
          </FormGroup>
          <FormGroup label="Title" isRequired fieldId="mr-title">
            <TextInput
              id="mr-title"
              isRequired
              value={title}
              onChange={(_e, value) => setTitle(value)}
              placeholder="e.g. Getting started with Inventory"
              autoFocus
            />
          </FormGroup>
          <FormGroup label="Directory name" isRequired fieldId="mr-name">
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
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={nameError ? 'error' : 'default'}>
                  {nameError ??
                    `${QUICKSTARTS_DIR}/${
                      effectiveName || '<name>'
                    }/ — cannot be changed after the first save.`}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          {needsUrl && (
            <FormGroup label="Link URL" isRequired fieldId="mr-url">
              <TextInput
                id="mr-url"
                type="url"
                isRequired
                value={url}
                validated={urlError ? 'error' : 'default'}
                onChange={(_e, value) => setUrl(value)}
                placeholder="https://docs.redhat.com/..."
              />
              {urlError && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant="error">{urlError}</HelperTextItem>
                  </HelperText>
                </FormHelperText>
              )}
            </FormGroup>
          )}
          <FormGroup label="Description" fieldId="mr-description">
            <TextArea
              id="mr-description"
              value={description}
              rows={2}
              resizeOrientation="vertical"
              onChange={(_e, value) => setDescription(value)}
            />
          </FormGroup>
          {bundles.length > 0 && (
            <FormGroup label="Bundles" fieldId="mr-bundles" role="group">
              <div className="lr-c-multi-edit__bundle-grid">
                {bundles.map((b) => (
                  <Checkbox
                    key={b.id}
                    id={`mr-bundle-${b.id}`}
                    label={b.title}
                    isChecked={selectedBundles.includes(b.id)}
                    onChange={(_e, checked) =>
                      setSelectedBundles((old) =>
                        checked ? [...old, b.id] : old.filter((x) => x !== b.id)
                      )
                    }
                  />
                ))}
              </div>
            </FormGroup>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          type="submit"
          form="mr-new-resource-form"
          isDisabled={!canCreate}
        >
          Create resource
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default NewResourceModal;
