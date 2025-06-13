import React, { useEffect, useState } from 'react';
import {
  Button,
  Content,
  ContentVariants,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Icon,
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
import {
  Table,
  TableVariant,
  Tbody,
  Td,
  Thead,
  Tr,
} from '@patternfly/react-table';

const SUPPORT_CASE_URL =
  'https://access.redhat.com/support/cases/#/case/new/get-support?caseCreate=true';

type Case = {
  id: string;
  caseNumber: string;
  summary: string;
  lastModifiedById: string;
  status: string;
};

const columnNames = {
  summary: 'Title',
  status: 'Status',
};

const statusTypes = {
  customerWaiting: 'Waiting on Customer',
  redHatWaiting: 'Waiting on Red Hat',
};

export const statusIcons = (status: string) => {
  const statusMapper = {
    [statusTypes.customerWaiting]: (
      <Icon className="pf-t--global--icon--color--status--info--default">
        {status} <AttentionBellIcon />{' '}
      </Icon>
    ),
    [statusTypes.redHatWaiting]: (
      <Icon>
        {status} <InProgressIcon />{' '}
      </Icon>
    ),
  };
  return statusMapper[status] ?? '';
};
const SupportPanel: React.FunctionComponent = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const chrome = useChrome();
  const [isLoading, setIsLoading] = useState(false);

  const getUrl = (env: string) =>
    `https://api.access${
      env === 'stage' || env === 'frhStage' ? '.stage' : ''
    }.redhat.com/support/v1/cases/filter`;

  const fetchSupportCases = async () => {
    const token = await chrome.auth.getToken();
    const user = await chrome.auth.getUser();
    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        createdBySSOName: `${user?.identity.user?.username}`,
      }),
    };

    try {
      const response = await fetch(getUrl(chrome.getEnvironment()), options);
      const { cases } = await response.json();
      setCases(cases || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Unable to fetch support cases', error);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchSupportCases();
  }, []);

  return (
    <>
      {isLoading ? (
        <SkeletonTable rows={3} />
      ) : cases.length === 0 ? (
        <EmptyState
          icon={HeadsetIcon}
          titleText={
            <Title headingLevel="h4" size="lg">
              No open support cases
            </Title>
          }
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>
            <Stack>
              <StackItem>
                We can&apos;t find any active support cases opened by you.
              </StackItem>
            </Stack>
          </EmptyStateBody>
          <Button
            variant="link"
            icon={<ExternalLinkAltIcon />}
            iconPosition="end"
            href={SUPPORT_CASE_URL}
            onClick={() => {
              window.open(SUPPORT_CASE_URL, '_blank');
            }}
          >
            Open a support case
          </Button>
        </EmptyState>
      ) : (
        <>
          <Content component={ContentVariants.p}>
            Quickly see the status on all of your open support cases. To manage
            support cases or open a new one, visit the{' '}
            <Content
              component={ContentVariants.a}
              isVisitedLink
              href={SUPPORT_CASE_URL}
            >
              Customer Portal
            </Content>
          </Content>
          <Table variant={TableVariant.compact}>
            <Thead>My open support cases ({cases.length})</Thead>
            <Tbody>
              {cases.map((c) => (
                <Tr key={c.id}>
                  <Td
                    dataLabel={columnNames.summary}
                    className="pf-v6-u-text-wrap"
                  >
                    <Button
                      variant="link"
                      icon={<ExternalLinkAltIcon />}
                      iconPosition="end"
                      component="a"
                      href={`https://access.redhat.com/support/cases/#/case/${c.caseNumber}`}
                    >
                      {c.summary}
                    </Button>
                  </Td>
                  <Td dataLabel={columnNames.status}>
                    {statusIcons(c.status)}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      )}
    </>
  );
};

export default SupportPanel;
