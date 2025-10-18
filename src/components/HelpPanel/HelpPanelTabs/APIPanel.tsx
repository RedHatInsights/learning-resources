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
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import {
  fetchBundleInfo,
  fetchBundles,
} from '../../../utils/fetchBundleInfoAPI';

interface APIDoc {
  name: string;
  services: string[];
  url: string;
}

const mapBundleInfoWithTitles = async (): Promise<APIDoc[]> => {
  try {
    const [bundleInfoList, bundles] = await Promise.all([
      fetchBundleInfo(),
      fetchBundles(),
    ]);

    return bundleInfoList.map((bundleInfo) => {
      const services = bundleInfo.bundleLabels.map((bundleLabel) => {
        const matchingBundle = bundles.find(
          (bundle) => bundle.id === bundleLabel
        );
        return matchingBundle ? matchingBundle.title : bundleLabel;
      });

      return {
        name: bundleInfo.frontendName,
        services,
        url: bundleInfo.url,
      };
    });
  } catch (error) {
    console.error('Error mapping bundle info with titles:', error);
    return [];
  }
};

const APIResourceItem: React.FC<{ resource: APIDoc }> = ({ resource }) => {
  const handleResourceClick = () => {
    window.open(resource.url, '_blank');
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
              icon={<ExternalLinkAltIcon />}
              iconPosition="end"
            >
              {resource.name}
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
    availableBundles.find((b) => b.id === bundleId)?.title || bundleId;

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
          Browse the APIs for Hybrid Cloud Console services. See full API
          documentation on the{' '}
          <Button
            variant="link"
            component="a"
            target="_blank"
            icon={<ExternalLinkAltIcon />}
            href="https://developers.redhat.com/api-catalog/"
            isInline
            iconPosition="end"
            data-ouia-component-id="help-panel-api-docs-link"
          >
            API Documentation Catalog
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
              <Content>API Documentation ({filteredResources.length})</Content>
            </ToolbarItem>
            <ToolbarItem>
              {!isHomePage && (
                <ToggleGroup
                  aria-label="Filter by scope"
                  data-ouia-component-id="help-panel-api-scope-toggle"
                >
                  <ToggleGroupItem
                    text="All"
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
                <DataListItem key={resource.name}>
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
              <p>No API documentation found matching your criteria.</p>
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
