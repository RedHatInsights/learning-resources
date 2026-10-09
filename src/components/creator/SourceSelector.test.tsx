import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { FormRenderer, FormSpy } from '@data-driven-forms/react-form-renderer';
import SourceSelector from './SourceSelector';
import { CreatorWizardContext, ResumePR } from './context';
import {
  getCreatorPR,
  getRepoQuickstartContent,
  listCreatorPRs,
  listRepoQuickstarts,
} from '../../utils/createQuickstartPR';

jest.mock('../../utils/createQuickstartPR', () => ({
  listRepoQuickstarts: jest.fn(),
  getRepoQuickstartContent: jest.fn(),
  listCreatorPRs: jest.fn(),
  getCreatorPR: jest.fn(),
}));

const mockedListRepoQuickstarts = listRepoQuickstarts as jest.MockedFunction<
  typeof listRepoQuickstarts
>;
const mockedGetRepoQuickstartContent =
  getRepoQuickstartContent as jest.MockedFunction<
    typeof getRepoQuickstartContent
  >;
const mockedListCreatorPRs = listCreatorPRs as jest.MockedFunction<
  typeof listCreatorPRs
>;
const mockedGetCreatorPR = getCreatorPR as jest.MockedFunction<
  typeof getCreatorPR
>;

const renderSelector = (
  setResumePR = jest.fn(),
  resumePR: ResumePR | null = null
) => {
  render(
    <CreatorWizardContext.Provider
      value={{
        files: [],
        onChangeCurrentStage: jest.fn(),
        resetCreator: jest.fn(),
        resumePR,
        setResumePR,
        loadedName: resumePR?.slug ?? null,
        setLoadedName: jest.fn(),
      }}
    >
      <FormRenderer
        onSubmit={() => {}}
        initialValues={{ source: resumePR ? `pr:${resumePR.number}` : '' }}
        schema={{
          fields: [{ name: 'source', component: 'lr-source-selector' }],
        }}
        componentMapper={{ 'lr-source-selector': SourceSelector }}
      >
        {({ formFields }) => (
          <form>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {formFields as any}
            <FormSpy subscription={{ values: true }}>
              {({ values }) => (
                <output data-testid="source-value">{values.source}</output>
              )}
            </FormSpy>
          </form>
        )}
      </FormRenderer>
    </CreatorWizardContext.Provider>
  );
  return { setResumePR };
};

describe('SourceSelector', () => {
  beforeEach(() => {
    mockedListRepoQuickstarts.mockResolvedValue([
      { name: 'live-doc', displayName: 'Live Doc' },
    ]);
    mockedGetRepoQuickstartContent.mockResolvedValue({
      name: 'live-doc',
      files: [
        {
          name: 'live-doc.yml',
          content:
            'metadata:\n  name: live-doc\nspec:\n  displayName: Live Doc\n',
        },
      ],
    });
    mockedListCreatorPRs.mockResolvedValue([
      {
        number: 11,
        title: 'feat(quickstarts): create demo',
        htmlUrl: 'https://github.com/org/repo/pull/11',
        branchName: 'qs-create-demo-1',
        slug: 'demo',
      },
    ]);
    mockedGetCreatorPR.mockResolvedValue({
      number: 11,
      title: 'feat(quickstarts): create demo',
      htmlUrl: 'https://github.com/org/repo/pull/11',
      branchName: 'qs-create-demo-1',
      slug: 'demo',
      files: [
        {
          name: 'demo.yml',
          content:
            'metadata:\n  name: demo\nspec:\n  displayName: Demo From PR\n',
        },
      ],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to From repository with Start from scratch', async () => {
    renderSelector();
    expect(
      screen.getByRole('button', { name: /from repository/i })
    ).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /start from scratch/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Live Doc' })
      ).toBeInTheDocument();
    });
  });

  it('loads an open PR and stores resume identity', async () => {
    const { setResumePR } = renderSelector();

    fireEvent.click(screen.getByRole('button', { name: /continue open pr/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: /#11 feat\(quickstarts\): create demo/,
        })
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /#11 feat\(quickstarts\): create demo/,
      })
    );

    await waitFor(() => {
      expect(mockedGetCreatorPR).toHaveBeenCalledWith(11);
      expect(setResumePR).toHaveBeenCalledWith({
        number: 11,
        branchName: 'qs-create-demo-1',
        slug: 'demo',
      });
    });
  });

  it('retains the PR mode when the selector remounts with a resumed PR', async () => {
    renderSelector(jest.fn(), {
      number: 11,
      branchName: 'qs-create-demo-1',
      slug: 'demo',
    });
    expect(
      screen.getByRole('button', { name: /continue open pr/i })
    ).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(mockedListCreatorPRs).toHaveBeenCalled());
    expect(screen.getByTestId('source-value')).toHaveTextContent('pr:11');
  });

  it('ignores a pending PR load after switching back to scratch', async () => {
    let resolvePR!: (value: Awaited<ReturnType<typeof getCreatorPR>>) => void;
    mockedGetCreatorPR.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePR = resolve;
      })
    );
    const { setResumePR } = renderSelector();
    fireEvent.click(screen.getByRole('button', { name: /continue open pr/i }));
    fireEvent.click(await screen.findByRole('button', { name: /#11/ }));
    expect(screen.getByTestId('source-value')).toBeEmptyDOMElement();

    fireEvent.click(screen.getByRole('button', { name: /from repository/i }));
    fireEvent.click(
      await screen.findByRole('button', { name: /start from scratch/i })
    );
    await act(async () => {
      resolvePR({
        number: 11,
        title: 'Demo',
        htmlUrl: 'https://github.com/org/repo/pull/11',
        branchName: 'qs-create-demo-1',
        slug: 'demo',
        files: [{ name: 'demo.yaml', content: 'spec:\n  displayName: Demo\n' }],
      });
    });

    expect(screen.getByTestId('source-value')).toHaveTextContent('__scratch__');
    expect(setResumePR.mock.calls.every(([value]) => value === null)).toBe(
      true
    );
  });

  it('keeps a failed PR selection invalid and clears the resume target', async () => {
    mockedGetCreatorPR.mockResolvedValueOnce({
      number: 11,
      title: 'Demo',
      htmlUrl: 'https://github.com/org/repo/pull/11',
      branchName: 'qs-create-demo-1',
      slug: 'demo',
      files: [{ name: 'metadata.yaml', content: 'name: demo\n' }],
    });
    const { setResumePR } = renderSelector();
    fireEvent.click(screen.getByRole('button', { name: /continue open pr/i }));
    fireEvent.click(await screen.findByRole('button', { name: /#11/ }));
    expect(
      await screen.findByText('No quickstart YAML file found.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('source-value')).toBeEmptyDOMElement();
    expect(setResumePR).toHaveBeenLastCalledWith(null);
  });
});
