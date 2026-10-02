import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Content,
  ContentVariants,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Icon,
  Pagination,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import SkeletonTable from '@redhat-cloud-services/frontend-components/SkeletonTable';
import ExternalLinkAltIcon from '@patternfly/react-icons/dist/dynamic/icons/external-link-alt-icon';
import HeadsetIcon from '@patternfly/react-icons/dist/dynamic/icons/headset-icon';
import AttentionBellIcon from '@patternfly/react-icons/dist/dynamic/icons/attention-bell-icon';
import InProgressIcon from '@patternfly/react-icons/dist/dynamic/icons/in-progress-icon';
import { Table, TableVariant, Tbody, Td, Tr } from '@patternfly/react-table';
import { useIntl } from 'react-intl';
import messages from '../../../Messages';
import {
  SupportCase,
  fetchSupportCases,
} from '../../../utils/fetchSupportCases';

const SUPPORT_CASE_URL =
  'https://access.redhat.com/support/cases/#/case/new/get-support?caseCreate=true';

const columnNames = {
  summary: 'Title',
  status: 'Status',
};

const statusTypes = {
  customerWaiting: 'Waiting on Customer',
  redHatWaiting: 'Waiting on Red Hat',
};

// Spacing between status text and icon: --pf-t--global--spacer--sm (.5rem / 8px)
// https://www.patternfly.org/design-foundations/spacers#spacer-tokens
const statusContentClass =
  'pf-v6-u-display-inline-flex pf-v6-u-align-items-center pf-v6-u-text-nowrap';
const statusIconSpacerStyle = {
  marginInlineStart: 'var(--pf-t--global--spacer--sm)',
};

export const statusIcons = (status: string) => {
  const statusMapper = {
    [statusTypes.customerWaiting]: (
      <span className={statusContentClass}>
        <span>{status}</span>
        <Icon
          className="pf-t--global--icon--color--status--info--default"
          style={statusIconSpacerStyle}
          isInline
        >
          <AttentionBellIcon />
        </Icon>
      </span>
    ),
    [statusTypes.redHatWaiting]: (
      <span className={statusContentClass}>
        <span>{status}</span>
        <Icon style={statusIconSpacerStyle} isInline>
          <InProgressIcon />
        </Icon>
      </span>
    ),
  };
  return statusMapper[status] ?? status;
};
const SupportPanel: React.FunctionComponent = () => {
  const intl = useIntl();
  const [cases, setCases] = useState<SupportCase[]>([]);
  const chrome = useChrome();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const onSetPage = (
    _event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
    newPage: number
  ) => {
    setPage(newPage);
  };

  const onPerPageSelect = (
    _event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
    newPerPage: number,
    newPage: number
  ) => {
    setPerPage(newPerPage);
    setPage(newPage);
  };

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setHasError(false);
    fetchSupportCases(chrome.auth, chrome.getEnvironment(), controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setCases(data);
          setPage(1);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error('Unable to fetch support cases', error);
          setHasError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <>
      {isLoading ? (
        <SkeletonTable rows={3} />
      ) : hasError ? (
        <Alert
          variant="danger"
          isInline
          title={intl.formatMessage(messages.supportCasesLoadError)}
        />
      ) : cases.length === 0 ? (
        <EmptyState
          icon={HeadsetIcon}
          titleText={intl.formatMessage(messages.noOpenSupportCasesTitle)}
          headingLevel="h4"
          variant={EmptyStateVariant.lg}
          data-ouia-component-id="help-panel-support-empty-state"
        >
          <EmptyStateBody>
            <Stack>
              <StackItem>
                {intl.formatMessage(messages.noSupportCasesMessage)}
              </StackItem>
            </Stack>
          </EmptyStateBody>
          <Button
            variant="link"
            icon={<ExternalLinkAltIcon />}
            iconPosition="end"
            href={SUPPORT_CASE_URL}
            onClick={() => {
              window.open(SUPPORT_CASE_URL, '_blank', 'noopener,noreferrer');
            }}
            data-ouia-component-id="help-panel-open-support-case-button"
          >
            {intl.formatMessage(messages.openSupportCaseButtonText)}
          </Button>
        </EmptyState>
      ) : (
        <>
          <Content component={ContentVariants.p}>
            {intl.formatMessage(messages.supportPanelDescription)}{' '}
            <Content
              component={ContentVariants.a}
              isVisitedLink
              href={SUPPORT_CASE_URL}
            >
              {intl.formatMessage(messages.customerPortalLinkText)}
            </Content>
          </Content>
          <Title headingLevel="h3" size="md">
            {intl.formatMessage(messages.supportCasesTableTitle)} (
            {cases.length})
          </Title>
          <Table
            variant={TableVariant.compact}
            data-ouia-component-id="help-panel-support-cases-table"
          >
            <Tbody>
              {cases.slice((page - 1) * perPage, page * perPage).map((c) => (
                <Tr key={c.id}>
                  <Td dataLabel={columnNames.summary} modifier="wrap">
                    <a
                      href={`https://access.redhat.com/support/cases/#/case/${c.caseNumber}`}
                    >
                      {c.summary} <ExternalLinkAltIcon key="icon" />
                    </a>
                  </Td>
                  <Td
                    dataLabel={columnNames.status}
                    className="pf-v6-u-text-nowrap"
                  >
                    {statusIcons(c.status)}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Pagination
            itemCount={cases.length}
            perPage={perPage}
            page={page}
            onSetPage={onSetPage}
            widgetId="compact-example"
            onPerPageSelect={onPerPageSelect}
            isCompact
            data-ouia-component-id="help-panel-support-pagination"
          />
        </>
      )}
    </>
  );
};

export default SupportPanel;
