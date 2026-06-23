import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import CreatorWizard, { CreatorWizardProps } from './CreatorWizard';
import { ExtendedQuickstart } from '../../utils/fetchQuickstarts';

jest.mock('@redhat-cloud-services/frontend-components/useChrome', () => ({
  __esModule: true,
  useChrome: () => ({
    getAvailableBundles: () => [],
    getBundle: () => '',
    quickStarts: { set: jest.fn() },
  }),
}));

jest.mock(
  '@redhat-cloud-services/frontend-components-utilities/helpers',
  () => ({ downloadFile: jest.fn() })
);

jest.mock('./CreatorYAMLView', () => {
  const Mock = () => <div data-testid="yaml-view" />;
  Mock.displayName = 'MockYAMLView';
  return { __esModule: true, default: Mock };
});

let capturedInitialValues: Record<string, unknown> | undefined;
let capturedOnChangeSpec: jest.Mock;

jest.mock('@data-driven-forms/react-form-renderer', () => {
  const actual = jest.requireActual('@data-driven-forms/react-form-renderer');
  return {
    ...actual,
    FormRenderer: (props: {
      initialValues?: Record<string, unknown>;
      children: (opts: { formFields: React.ReactNode }) => React.ReactNode;
    }) => {
      capturedInitialValues = props.initialValues;
      return (
        <div data-testid="mock-form-renderer">
          {props.children?.({ formFields: null })}
        </div>
      );
    },
    FormSpy: ({
      children,
    }: {
      children?: (state: {
        values: Record<string, unknown>;
      }) => React.ReactNode;
    }) => {
      return children?.({ values: capturedInitialValues ?? {} }) ?? null;
    },
  };
});

jest.mock('@data-driven-forms/pf4-component-mapper/component-mapper', () => ({
  __esModule: true,
  default: {},
}));

const makeQS = (
  overrides: Partial<ExtendedQuickstart['spec']> = {}
): ExtendedQuickstart => ({
  metadata: { name: 'test-qs', tags: [] },
  spec: {
    displayName: 'Test QS',
    description: 'A test quickstart',
    icon: null,
    ...overrides,
  },
});

const makeProps = (
  overrides: Partial<CreatorWizardProps> = {}
): CreatorWizardProps => {
  capturedOnChangeSpec = jest.fn();
  return {
    onChangeKind: jest.fn(),
    onChangeQuickStartSpec: capturedOnChangeSpec,
    onChangeBundles: jest.fn(),
    onChangeCurrentStage: jest.fn(),
    resetCreator: jest.fn(),
    onChangeTags: jest.fn(),
    onChangeMetadataTags: jest.fn(),
    files: [],
    filterData: { categories: [] },
    quickStart: makeQS(),
    currentBundles: [],
    currentTags: {},
    currentKind: null,
    ...overrides,
  };
};

describe('CreatorWizard', () => {
  beforeEach(() => {
    capturedInitialValues = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('field stability (no spazzing on input)', () => {
    it('does not recompute initialValues when quickStart prop changes', () => {
      const props = makeProps({
        quickStart: makeQS({ displayName: 'Original' }),
      });
      const { rerender } = render(<CreatorWizard {...props} />);
      const first = capturedInitialValues;

      rerender(
        <CreatorWizard
          {...props}
          quickStart={makeQS({ displayName: 'Changed' })}
        />
      );

      expect(capturedInitialValues).toBe(first);
      expect(capturedInitialValues?.title).toBe('Original');
    });

    it('does not recompute initialValues when currentKind/bundles/tags change', () => {
      const props = makeProps();
      const { rerender } = render(<CreatorWizard {...props} />);
      const first = capturedInitialValues;

      rerender(
        <CreatorWizard
          {...props}
          currentKind="documentation"
          currentBundles={['insights']}
          currentTags={{ content: ['quickstart'] }}
        />
      );

      expect(capturedInitialValues).toBe(first);
    });

    it('recomputes initialValues when switching wizard <-> YAML', async () => {
      const props = makeProps({
        quickStart: makeQS({ displayName: 'Before' }),
      });
      const { rerender } = render(<CreatorWizard {...props} />);
      expect(capturedInitialValues?.title).toBe('Before');

      act(() => {
        screen.getByRole('tab', { name: /creator/i }).click();
      });

      rerender(
        <CreatorWizard
          {...props}
          quickStart={makeQS({ displayName: 'After' })}
        />
      );

      act(() => {
        screen.getByRole('tab', { name: /wizard/i }).click();
      });

      await waitFor(() => {
        expect(capturedInitialValues?.title).toBe('After');
      });
    });
  });

  describe('URL field does not error on normal input', () => {
    it('sets link for a valid URL', async () => {
      render(
        <CreatorWizard
          {...makeProps({
            quickStart: makeQS({
              link: { text: 'Docs', href: 'https://docs.redhat.com' },
            }),
            currentKind: 'documentation',
          })}
        />
      );

      await waitFor(() => {
        expect(capturedOnChangeSpec).toHaveBeenCalledWith(
          expect.objectContaining({
            link: expect.objectContaining({
              href: 'https://docs.redhat.com',
            }),
          })
        );
      });
    });

    it('does not set link for partial/invalid URL input', async () => {
      render(
        <CreatorWizard
          {...makeProps({
            quickStart: makeQS({
              link: { text: 'Docs', href: 'not-a-url' },
            }),
            currentKind: 'documentation',
          })}
        />
      );

      await waitFor(() => {
        expect(capturedOnChangeSpec).toHaveBeenCalledWith(
          expect.objectContaining({ link: undefined })
        );
      });
    });

    it('does not set link when URL field is empty', async () => {
      render(
        <CreatorWizard
          {...makeProps({
            quickStart: makeQS(),
            currentKind: 'documentation',
          })}
        />
      );

      await waitFor(() => {
        expect(capturedOnChangeSpec).toHaveBeenCalledWith(
          expect.objectContaining({ link: undefined })
        );
      });
    });
  });
});
