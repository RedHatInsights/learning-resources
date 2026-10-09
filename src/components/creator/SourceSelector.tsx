import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Content,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  SearchInput,
  Spinner,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import {
  UseFieldApiConfig,
  useFieldApi,
  useFormApi,
} from '@data-driven-forms/react-form-renderer';
import {
  CreatorPREntry,
  RepoQuickstartEntry,
  getCreatorPR,
  getRepoQuickstartContent,
  listCreatorPRs,
  listRepoQuickstarts,
} from '../../utils/createQuickstartPR';
import { CreatorWizardContext } from './context';
import { clearQuickstartFields, hydrateFromFiles } from './hydrateFromFiles';

const SOURCE_SCRATCH = '__scratch__';
const SOURCE_MODE_REPO = 'repo';
const SOURCE_MODE_PR = 'pr';

const SourceSelector = (props: UseFieldApiConfig) => {
  const { input } = useFieldApi(props);
  const formApi = useFormApi();
  const { resumePR, setResumePR, setLoadedName } =
    useContext(CreatorWizardContext);

  const [mode, setMode] = useState<
    typeof SOURCE_MODE_REPO | typeof SOURCE_MODE_PR
  >(resumePR ? SOURCE_MODE_PR : SOURCE_MODE_REPO);
  const [quickstarts, setQuickstarts] = useState<RepoQuickstartEntry[]>([]);
  const [creatorPRs, setCreatorPRs] = useState<CreatorPREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loadingName, setLoadingName] = useState<string | null>(null);
  const selectionRequest = useRef(0);

  useEffect(
    () => () => {
      selectionRequest.current++;
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (mode === SOURCE_MODE_REPO) {
          const entries = await listRepoQuickstarts();
          if (!cancelled) setQuickstarts(entries);
        } else {
          const prs = await listCreatorPRs();
          if (!cancelled) setCreatorPRs(prs);
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load sources'
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const filteredQuickstarts = useMemo(() => {
    const needle = search.toLowerCase();
    return quickstarts.filter(
      (qs) =>
        (qs.name ?? '').toLowerCase().includes(needle) ||
        (qs.displayName ?? '').toLowerCase().includes(needle)
    );
  }, [quickstarts, search]);

  const filteredPRs = useMemo(() => {
    const needle = search.toLowerCase();
    return creatorPRs.filter(
      (pr) =>
        pr.title.toLowerCase().includes(needle) ||
        String(pr.number).includes(needle) ||
        (pr.slug ?? '').toLowerCase().includes(needle)
    );
  }, [creatorPRs, search]);

  const handleSelectScratch = () => {
    selectionRequest.current++;
    setLoadingName(null);
    setError(null);
    input.onChange(SOURCE_SCRATCH);
    clearQuickstartFields(formApi);
    setResumePR(null);
    setLoadedName(null);
  };

  const handleSelectRepo = async (name: string) => {
    const request = ++selectionRequest.current;
    setLoadingName(name);
    input.onChange('');
    setError(null);
    clearQuickstartFields(formApi);
    setResumePR(null);
    setLoadedName(null);
    try {
      const content = await getRepoQuickstartContent(name);
      if (request !== selectionRequest.current) return;
      const hydrateError = hydrateFromFiles(content.files, formApi);
      if (hydrateError) {
        setError(hydrateError);
      } else {
        setLoadedName(content.name || name);
        input.onChange(name);
      }
    } catch (err) {
      if (request === selectionRequest.current) {
        setError(
          err instanceof Error ? err.message : 'Failed to load quickstart'
        );
      }
    } finally {
      if (request === selectionRequest.current) setLoadingName(null);
    }
  };

  const handleSelectPR = async (pr: CreatorPREntry) => {
    const request = ++selectionRequest.current;
    const key = `pr:${pr.number}`;
    setLoadingName(key);
    input.onChange('');
    setError(null);
    clearQuickstartFields(formApi);
    setResumePR(null);
    setLoadedName(null);
    try {
      const content = await getCreatorPR(pr.number);
      if (request !== selectionRequest.current) return;
      const hydrateError = hydrateFromFiles(content.files, formApi);
      if (hydrateError) {
        setError(hydrateError);
        setResumePR(null);
        return;
      }
      setResumePR({
        number: content.number,
        branchName: content.branchName,
        slug: content.slug,
      });
      setLoadedName(content.slug || null);
      input.onChange(key);
    } catch (err) {
      if (request === selectionRequest.current) {
        setError(
          err instanceof Error ? err.message : 'Failed to load pull request'
        );
      }
    } finally {
      if (request === selectionRequest.current) setLoadingName(null);
    }
  };

  const handleModeChange = (
    next: typeof SOURCE_MODE_REPO | typeof SOURCE_MODE_PR
  ) => {
    if (next === mode) return;
    selectionRequest.current++;
    setLoadingName(null);
    setMode(next);
    setSearch('');
    setError(null);
    input.onChange('');
    clearQuickstartFields(formApi);
    setResumePR(null);
    setLoadedName(null);
  };

  const selected = input.value;

  return (
    <div>
      <div className="pf-v6-c-form__group">
        <Content component="p">
          Start a new pull request from scratch or a live doc, or continue an
          open creator PR (updates that PR instead of opening another).
        </Content>
      </div>
      <div className="pf-v6-c-form__group pf-v6-u-mb-md">
        <ToggleGroup aria-label="Source type">
          <ToggleGroupItem
            text="From repository"
            buttonId="source-mode-repo"
            isSelected={mode === SOURCE_MODE_REPO}
            onChange={(_event, selectedMode) => {
              if (selectedMode) handleModeChange(SOURCE_MODE_REPO);
            }}
          />
          <ToggleGroupItem
            text="Continue open PR"
            buttonId="source-mode-pr"
            isSelected={mode === SOURCE_MODE_PR}
            onChange={(_event, selectedMode) => {
              if (selectedMode) handleModeChange(SOURCE_MODE_PR);
            }}
          />
        </ToggleGroup>
      </div>
      <div className="pf-v6-c-form__group">
        <label className="pf-v6-c-form__label">
          <span className="pf-v6-c-form__label-text">
            {mode === SOURCE_MODE_PR
              ? 'Select an open pull request'
              : 'Select source'}
          </span>
          <span className="pf-v6-c-form__label-required" aria-hidden="true">
            {' '}
            *
          </span>
        </label>
        <div className="pf-v6-c-form__group-control">
          <SearchInput
            placeholder={
              mode === SOURCE_MODE_PR
                ? 'Search open PRs...'
                : 'Search quickstarts...'
            }
            value={search}
            onChange={(_event, value) => setSearch(value)}
            onClear={() => setSearch('')}
            className="pf-v6-u-mb-sm"
          />

          {loading && <Spinner size="lg" className="pf-v6-u-mt-md" />}

          {error && (
            <Alert
              variant="danger"
              title="Error"
              isInline
              className="pf-v6-u-mt-md"
            >
              {error}
            </Alert>
          )}

          {!loading && !error && mode === SOURCE_MODE_REPO && (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <DataList aria-label="Source selection" isCompact>
                <DataListItem
                  key="scratch"
                  aria-labelledby="source-scratch"
                  className={selected === SOURCE_SCRATCH ? 'pf-m-selected' : ''}
                >
                  <DataListItemRow>
                    <DataListItemCells
                      dataListCells={[
                        <DataListCell key="name">
                          <button
                            id="source-scratch"
                            type="button"
                            className={`pf-v6-c-button pf-m-link pf-m-inline${
                              selected === SOURCE_SCRATCH ? ' pf-m-current' : ''
                            }`}
                            onClick={handleSelectScratch}
                            style={{
                              fontWeight:
                                selected === SOURCE_SCRATCH ? 700 : 400,
                            }}
                          >
                            Start from scratch
                          </button>
                        </DataListCell>,
                      ]}
                    />
                  </DataListItemRow>
                </DataListItem>
                {filteredQuickstarts.map((qs) => (
                  <DataListItem
                    key={qs.name}
                    aria-labelledby={`source-${qs.name}`}
                    className={selected === qs.name ? 'pf-m-selected' : ''}
                  >
                    <DataListItemRow>
                      <DataListItemCells
                        dataListCells={[
                          <DataListCell key="name">
                            <button
                              id={`source-${qs.name}`}
                              type="button"
                              className={`pf-v6-c-button pf-m-link pf-m-inline${
                                selected === qs.name ? ' pf-m-current' : ''
                              }`}
                              onClick={() => handleSelectRepo(qs.name)}
                              disabled={loadingName !== null}
                              style={{
                                fontWeight: selected === qs.name ? 700 : 400,
                              }}
                            >
                              {qs.displayName || qs.name}
                              {loadingName === qs.name && (
                                <Spinner size="sm" className="pf-v6-u-ml-sm" />
                              )}
                            </button>
                          </DataListCell>,
                        ]}
                      />
                    </DataListItemRow>
                  </DataListItem>
                ))}
                {filteredQuickstarts.length === 0 && quickstarts.length > 0 && (
                  <DataListItem key="empty">
                    <DataListItemRow>
                      <DataListItemCells
                        dataListCells={[
                          <DataListCell key="empty-msg">
                            No quickstarts found
                          </DataListCell>,
                        ]}
                      />
                    </DataListItemRow>
                  </DataListItem>
                )}
              </DataList>
            </div>
          )}

          {!loading && !error && mode === SOURCE_MODE_PR && (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {creatorPRs.length === 0 ? (
                <Alert
                  variant="info"
                  title="No open creator pull requests"
                  isInline
                  className="pf-v6-u-mt-md"
                >
                  Open pull requests submitted by the Quickstarts Creator appear
                  here.
                </Alert>
              ) : (
                <DataList aria-label="Open creator pull requests" isCompact>
                  {filteredPRs.map((pr) => {
                    const key = `pr:${pr.number}`;
                    return (
                      <DataListItem
                        key={pr.number}
                        aria-labelledby={`source-pr-${pr.number}`}
                        className={selected === key ? 'pf-m-selected' : ''}
                      >
                        <DataListItemRow>
                          <DataListItemCells
                            dataListCells={[
                              <DataListCell key="name">
                                <button
                                  id={`source-pr-${pr.number}`}
                                  type="button"
                                  className={`pf-v6-c-button pf-m-link pf-m-inline${
                                    selected === key ? ' pf-m-current' : ''
                                  }`}
                                  onClick={() => handleSelectPR(pr)}
                                  disabled={loadingName !== null}
                                  style={{
                                    fontWeight: selected === key ? 700 : 400,
                                  }}
                                >
                                  #{pr.number} {pr.title}
                                  {pr.slug ? ` (${pr.slug})` : ''}
                                  {loadingName === key && (
                                    <Spinner
                                      size="sm"
                                      className="pf-v6-u-ml-sm"
                                    />
                                  )}
                                </button>
                              </DataListCell>,
                            ]}
                          />
                        </DataListItemRow>
                      </DataListItem>
                    );
                  })}
                  {filteredPRs.length === 0 && (
                    <DataListItem key="empty">
                      <DataListItemRow>
                        <DataListItemCells
                          dataListCells={[
                            <DataListCell key="empty-msg">
                              No matching pull requests
                            </DataListCell>,
                          ]}
                        />
                      </DataListItemRow>
                    </DataListItem>
                  )}
                </DataList>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SourceSelector;
