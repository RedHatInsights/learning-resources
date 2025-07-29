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
import { FiltersMetadata } from '../../../utils/FiltersCategoryInterface';

// This is a mock interface and data.
interface APIDoc {
  name: string;
  services: string[];
  url: string;
}

const mockApiDocs: APIDoc[] = [
  {
    name: 'Provisioning API',
    services: ['RHEL', 'Ansible'],
    url: 'https://developers.redhat.com/api-catalog/provisioning',
  },
  {
    name: 'Cost Management API',
    services: ['OpenShift'],
    url: 'https://developers.redhat.com/api-catalog/cost-management',
  },
  {
    name: 'User Access API',
    services: ['RHEL', 'Settings'],
    url: 'https://developers.redhat.com/api-catalog/user-access',
  },
];

// Bundle name mapping to get abbreviated names
const getBundleDisplayName = (bundleValue: string): string => {
  const fullName = FiltersMetadata[bundleValue];
  if (!fullName) {
    return bundleValue.charAt(0).toUpperCase() + bundleValue.slice(1);
  }
  // Extract abbreviated name by taking the part before parentheses
  return fullName.split(' (')[0];
};

// API Item Component
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
                    {getBundleDisplayName(service)}
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
  const [bundleTitle, setBundleTitle] = useState<string>('');
  const [bundleId, setBundleId] = useState<string>('');

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { bundleTitle: currentBundleTitle, bundleId: currentBundleId } =
      chrome.getBundleData() || {};
    setBundleTitle(currentBundleTitle);
    setBundleId(currentBundleId);
  }, [chrome]);

  const isHomePage =
    !bundleTitle ||
    bundleTitle.toLowerCase() === 'home' ||
    bundleTitle.toLowerCase() === 'landing';

  const displayBundleName = bundleId ? getBundleDisplayName(bundleId) : '';

  const filteredResources = useMemo(() => {
    if (activeToggle === 'bundle' && !isHomePage) {
      return mockApiDocs.filter((resource) =>
        resource.services.includes(displayBundleName)
      );
    }
    return mockApiDocs;
  }, [activeToggle, isHomePage, displayBundleName]);

  const paginatedResources = useMemo(() => {
    const startIndex = (page - 1) * perPage;
    return filteredResources.slice(startIndex, startIndex + perPage);
  }, [filteredResources, page, perPage]);

  const handleSetPage = (
    _event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
    newPage: number
  ) => {
    setPage(newPage);
  };

  const handlePerPageSelect = (
    _event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
    newPerPage: number,
    newPage: number
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
    <Stack hasGutter className="pf-v6-u-h-100">
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
          >
            API Documentation Catalog
          </Button>
        </Content>
      </StackItem>

      <StackItem>
        <Toolbar id="api-resources-results-toolbar">
          <ToolbarContent>
            <ToolbarItem>
              <Content>API Documentation ({filteredResources.length})</Content>
            </ToolbarItem>
            <ToolbarItem>
              {!isHomePage && (
                <ToggleGroup aria-label="Filter by scope">
                  <ToggleGroupItem
                    text="All"
                    buttonId="all-toggle"
                    isSelected={activeToggle === 'all'}
                    onChange={(event, isSelected) =>
                      handleToggleChange(event, isSelected, 'all')
                    }
                  />
                  <ToggleGroupItem
                    text={displayBundleName}
                    buttonId="bundle-toggle"
                    isSelected={activeToggle === 'bundle'}
                    onChange={(event, isSelected) =>
                      handleToggleChange(event, isSelected, 'bundle')
                    }
                  />
                </ToggleGroup>
              )}
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </StackItem>

      <StackItem isFilled className="pf-v6-u-overflow-hidden">
        <div className="pf-v6-u-h-100 pf-v6-u-overflow-y-auto">
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
