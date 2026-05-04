import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Content,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  Flex,
  FlexItem,
  Label,
  Pagination,
  PaginationProps,
  Spinner,
  Stack,
  StackItem,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import { useIntl } from 'react-intl';
import messages from '../../../Messages';
import {
  fetchBundleInfo,
  fetchBundles,
} from '../../../utils/fetchBundleInfoAPI';
import { getBundleDisplayName } from '../../../utils/bundleUtils';

interface APIDoc {
  name: string;
  displayName: string; // Formatted name with version (e.g., "Notifications v1.0")
  services: string[];
  url: string;
}

/**
 * Extracts version number from API URL
 * @param url - The API URL (e.g., "https://example.com/api/notifications/v1.0")
 * @returns Version string (e.g., "v1.0") or null if no version found
 */
const extractVersionFromUrl = (url: string): string | null => {
  // Match patterns like /v1, /v2.0, /v1.2.3, etc.
  const versionMatch = url.match(/\/v(\d+(?:\.\d+)*)\/?/i);
  if (versionMatch) {
    return `v${versionMatch[1]}`;
  }
  return null;
};

/**
 * Common acronyms in API names that should be fully uppercased
 */
const KNOWN_ACRONYMS = new Set([
  'api',
  'apis',
  'rbac',
  'iam',
  'sso',
  'ui',
  'cli',
  'sdk',
  'rest',
  'http',
  'https',
  'json',
  'xml',
  'html',
  'css',
  'url',
]);

/**
 * Capitalizes the first letter of each word in a string
 * Handles known acronyms (like "API", "RBAC") by uppercasing them entirely
 * Handles hyphenated and underscored names (e.g., "virtual-assistant" → "Virtual-Assistant")
 * @param str - The string to capitalize
 * @returns Capitalized string
 */
const capitalizeWords = (str: string): string => {
  // Split into tokens that include both word segments and delimiters (spaces, hyphens, underscores)
  // Regex captures: words (one or more non-delimiter chars) OR delimiters
  const tokens = str.match(/([^\s\-_]+)|[\s\-_]/g) || [];

  return tokens
    .map((token) => {
      // If it's a delimiter (space, hyphen, underscore), return as-is
      if (/^[\s\-_]$/.test(token)) {
        return token;
      }

      const lowerToken = token.toLowerCase();

      // Check if it's a known acronym
      if (KNOWN_ACRONYMS.has(lowerToken)) {
        return token.toUpperCase();
      }

      // Preserve already all-uppercase words (acronyms not in our list)
      if (token === token.toUpperCase() && token.length > 1) {
        return token;
      }

      // Capitalize first letter, lowercase the rest
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join('');
};

/**
 * Removes common API-related suffixes from the name
 * @param name - The raw API name from backend (e.g., "advisor api", "notifications")
 * @returns Name without API suffix (e.g., "advisor", "notifications")
 */
const stripApiSuffix = (name: string): string => {
  // Remove "api", "apis" suffix (case insensitive, with optional trailing whitespace)
  return name.replace(/\s*(api|apis)\s*$/i, '').trim();
};

/**
 * Formats the API name with capitalization and version number
 * @param name - The raw API name from backend (e.g., "notifications", "advisor api")
 * @param url - The API URL to extract version from
 * @returns Formatted display name (e.g., "Notifications v1.0", "Advisor v1.0")
 */
const formatApiDisplayName = (name: string, url: string): string => {
  const nameWithoutApiSuffix = stripApiSuffix(name);
  const capitalizedName = capitalizeWords(nameWithoutApiSuffix);
  const version = extractVersionFromUrl(url);
  return version ? `${capitalizedName} ${version}` : capitalizedName;
};

/**
 * Gets the base console URL based on the current environment
 * Uses Chrome API's getEnvironment() to determine environment
 * @param environment - Environment string from chrome.getEnvironment() ('prod', 'stage', 'qa', etc.)
 * @returns Base console URL (e.g., "https://console.redhat.com" or "https://console.stage.redhat.com")
 */
export const getConsoleBaseUrl = (environment: string): string => {
  // Stage environments (including frhStage for federal stage)
  if (environment === 'stage' || environment === 'frhStage') {
    return 'https://console.stage.redhat.com';
  }

  // Production (prod and all other environments default to production console)
  return 'https://console.redhat.com';
};

/**
 * Converts backend API URL to console docs URL (environment-aware)
 * @param name - The raw API name (e.g., "notifications", "rbac")
 * @param url - The backend URL to extract version from
 * @param environment - Environment string from chrome.getEnvironment()
 * @returns Console API docs URL (e.g., "https://console.redhat.com/docs/api/notifications/v2")
 */
export const convertToConsoleDocsUrl = (
  name: string,
  url: string,
  environment: string
): string => {
  const nameWithoutApiSuffix = stripApiSuffix(name).toLowerCase();
  const version = extractVersionFromUrl(url);
  const baseUrl = getConsoleBaseUrl(environment);

  if (version) {
    // Remove decimal points from version (v1.0 → v1, v2.0 → v2)
    const majorVersion = version.split('.')[0];
    return `${baseUrl}/docs/api/${nameWithoutApiSuffix}/${majorVersion}`;
  }

  // Fallback if no version found
  return `${baseUrl}/docs/api/${nameWithoutApiSuffix}`;
};

const mapBundleInfoWithTitles = async (): Promise<APIDoc[]> => {
  try {
    const [bundleInfoList, bundles] = await Promise.all([
      fetchBundleInfo(),
      fetchBundles(),
    ]);

    const mapped = bundleInfoList.map((bundleInfo) => {
      const services = bundleInfo.bundleLabels.map((bundleLabel) => {
        const matchingBundle = bundles.find(
          (bundle) => bundle.id === bundleLabel
        );
        return (
          getBundleDisplayName(bundleLabel, {
            fallbackTitle: matchingBundle?.title,
          }) ?? bundleLabel
        );
      });

      return {
        name: bundleInfo.frontendName,
        displayName: formatApiDisplayName(
          bundleInfo.frontendName,
          bundleInfo.url
        ),
        services,
        url: bundleInfo.url,
      };
    });

    // Deduplicate by name + version (so different versions of the same API are shown separately)
    const byNameAndVersion = new Map<string, APIDoc>();
    for (const doc of mapped) {
      // Use displayName as the unique key since it includes version
      const key = doc.displayName.toLowerCase().trim();
      const existing = byNameAndVersion.get(key);
      if (existing) {
        // If exact duplicate (same name and version), merge services
        const mergedServices = [
          ...new Set([...existing.services, ...doc.services]),
        ];
        byNameAndVersion.set(key, {
          ...existing,
          services: mergedServices,
        });
      } else {
        byNameAndVersion.set(key, doc);
      }
    }
    return Array.from(byNameAndVersion.values());
  } catch (error) {
    console.error('Error mapping bundle info with titles:', error);
    return [];
  }
};

const APIResourceItem: React.FC<{ resource: APIDoc }> = ({ resource }) => {
  const chrome = useChrome();

  const handleResourceClick = () => {
    const environment = chrome.getEnvironment();
    const consoleDocsUrl = convertToConsoleDocsUrl(
      resource.name,
      resource.url,
      environment
    );
    // Navigate within the same page (keeps help panel open)
    window.location.href = consoleDocsUrl;
  };

  return (
    <Flex
      alignItems={{ default: 'alignItemsFlexStart' }}
      spaceItems={{ default: 'spaceItemsSm' }}
    >
      <FlexItem flex={{ default: 'flex_1' }}>
        <Flex
          direction={{ default: 'row' }}
          spaceItems={{ default: 'spaceItemsLg' }}
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Button
              variant="link"
              onClick={handleResourceClick}
              isInline
              className="pf-v6-u-text-align-left pf-v6-u-p-0"
            >
              {resource.displayName}
            </Button>
          </FlexItem>
          <FlexItem>
            <Flex spaceItems={{ default: 'spaceItemsXs' }}>
              {resource.services.map((service, index) => (
                <FlexItem key={index}>
                  <Label color="grey" variant="filled" isCompact>
                    {service}
                  </Label>
                </FlexItem>
              ))}
            </Flex>
          </FlexItem>
        </Flex>
      </FlexItem>
    </Flex>
  );
};

const APIPanelContent: React.FC = () => {
  const intl = useIntl();
  const chrome = useChrome();
  const [activeToggle, setActiveToggle] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [apiDocs, setApiDocs] = useState<APIDoc[]>([]);

  useEffect(() => {
    const loadApiDocs = async () => {
      const docs = await mapBundleInfoWithTitles();
      setApiDocs(docs);
    };

    loadApiDocs();
  }, []);

  const {
    bundleId = '',
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
  } = chrome.getBundleData?.() || {};
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const availableBundles = chrome.getAvailableBundles?.() || [];

  const displayBundleName =
    getBundleDisplayName(bundleId, {
      fallbackTitle: availableBundles.find((b) => b.id === bundleId)?.title,
    }) ?? bundleId;

  const isHomePage =
    !displayBundleName ||
    displayBundleName.toLowerCase() === 'home' ||
    displayBundleName.toLowerCase() === 'landing';

  const filteredResources = useMemo(() => {
    if (activeToggle === 'bundle' && !isHomePage) {
      return apiDocs.filter((resource) =>
        resource.services.includes(displayBundleName)
      );
    }
    return apiDocs;
  }, [activeToggle, isHomePage, displayBundleName, apiDocs]);

  const paginatedResources = useMemo(() => {
    const startIndex = (page - 1) * perPage;
    return filteredResources.slice(startIndex, startIndex + perPage);
  }, [filteredResources, page, perPage]);

  const handleSetPage: PaginationProps['onSetPage'] = (_event, newPage) => {
    setPage(newPage);
  };

  const handlePerPageSelect: PaginationProps['onPerPageSelect'] = (
    _event,
    newPerPage,
    newPage
  ) => {
    setPerPage(newPerPage);
    setPage(newPage);
  };

  const handleToggleChange = (
    _event:
      | React.MouseEvent<MouseEvent>
      | React.KeyboardEvent<Element>
      | MouseEvent,
    isSelected: boolean,
    value: string
  ) => {
    if (isSelected) {
      setActiveToggle(value);
    }
  };

  return (
    <Stack
      hasGutter
      className="pf-v6-u-h-100"
      data-ouia-component-id="help-panel-api-root"
    >
      <StackItem>
        <Content>
          {intl.formatMessage(messages.apiPanelDescription)}{' '}
          <Button
            variant="link"
            component="a"
            href="https://console.redhat.com/docs/api"
            isInline
            data-ouia-component-id="help-panel-api-docs-link"
          >
            {intl.formatMessage(messages.apiDocumentationCatalogLinkText)}
          </Button>
        </Content>
      </StackItem>

      <StackItem>
        <Toolbar
          id="api-resources-results-toolbar"
          data-ouia-component-id="help-panel-api-results-toolbar"
        >
          <ToolbarContent>
            <ToolbarItem>
              <Content>
                {intl.formatMessage(messages.apiDocumentationCountLabel)} (
                {filteredResources.length})
              </Content>
            </ToolbarItem>
            <ToolbarItem>
              {!isHomePage && (
                <ToggleGroup
                  isCompact
                  aria-label="Filter by scope"
                  data-ouia-component-id="help-panel-api-scope-toggle"
                >
                  <ToggleGroupItem
                    text={intl.formatMessage(messages.allToggleText)}
                    buttonId="all-toggle"
                    isSelected={activeToggle === 'all'}
                    onChange={(event, isSelected) =>
                      handleToggleChange(event, isSelected, 'all')
                    }
                    data-ouia-component-id="help-panel-api-toggle-all"
                  />
                  <ToggleGroupItem
                    text={displayBundleName}
                    buttonId="bundle-toggle"
                    isSelected={activeToggle === 'bundle'}
                    onChange={(event, isSelected) =>
                      handleToggleChange(event, isSelected, 'bundle')
                    }
                    data-ouia-component-id="help-panel-api-toggle-bundle"
                  />
                </ToggleGroup>
              )}
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </StackItem>

      <StackItem isFilled className="pf-v6-u-overflow-hidden">
        <div
          className="pf-v6-u-h-100 pf-v6-u-overflow-y-auto"
          data-ouia-component-id="help-panel-api-resources-list"
        >
          {paginatedResources.length > 0 ? (
            <DataList aria-label="API resources">
              {paginatedResources.map((resource) => (
                <DataListItem key={resource.displayName}>
                  <DataListItemRow>
                    <DataListItemCells
                      dataListCells={[
                        <DataListCell key="resource-content" isFilled>
                          <APIResourceItem resource={resource} />
                        </DataListCell>,
                      ]}
                    />
                  </DataListItemRow>
                </DataListItem>
              ))}
            </DataList>
          ) : (
            <Content>
              <p>{intl.formatMessage(messages.noApiDocsMessage)}</p>
            </Content>
          )}
        </div>
      </StackItem>

      {filteredResources.length > 0 && (
        <StackItem>
          <Pagination
            itemCount={filteredResources.length}
            perPage={perPage}
            page={page}
            onSetPage={handleSetPage}
            onPerPageSelect={handlePerPageSelect}
            isCompact
            data-ouia-component-id="help-panel-api-pagination"
          />
        </StackItem>
      )}
    </Stack>
  );
};

const APIPanel: React.FC<{
  setNewActionTitle: (title: string) => void;
}> = () => {
  return (
    <Suspense fallback={<Spinner size="lg" />}>
      <APIPanelContent />
    </Suspense>
  );
};

export default APIPanel;
