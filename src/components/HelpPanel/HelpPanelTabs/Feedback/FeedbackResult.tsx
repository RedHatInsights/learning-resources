import React, { ReactNode } from 'react';
import {
  Button,
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  MenuToggle,
  MenuToggleElement,
  Title,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@patternfly/react-icons';
import { useIntl } from 'react-intl';
import messages from '../../../../Messages';
import './FeedbackResult.scss';

type ResultType = 'success' | 'error';

export type FeedbackResultProps = {
  type: ResultType;
  title: string;
  description: string | ReactNode;
  onBack: () => void;
  onShareGeneralFeedback?: () => void;
  onReportBug?: () => void;
  onInformDirection?: () => void;
};

const SUPPORT_CASE_URL =
  'https://access.redhat.com/support/cases/#/case/new/get-support?caseCreate=true&source=console';

const FeedbackResult: React.FC<FeedbackResultProps> = ({
  type,
  title,
  description,
  onBack,
  onShareGeneralFeedback,
  onReportBug,
  onInformDirection,
}) => {
  const intl = useIntl();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const isSuccess = type === 'success';
  const IconComponent = isSuccess ? CheckCircleIcon : ExclamationTriangleIcon;
  const buttonText = isSuccess
    ? intl.formatMessage(messages.close)
    : intl.formatMessage(messages.back);

  const renderDescription = () => {
    if (type === 'error') {
      return (
        <Content component="p" className="pf-v6-u-mb-lg">
          {description}{' '}
          <Content
            component="a"
            href={SUPPORT_CASE_URL}
            target="_blank"
            rel="noreferrer"
          >
            {intl.formatMessage(messages.redHatSupport)}
          </Content>
        </Content>
      );
    }

    return (
      <Content component="p" className="pf-v6-u-mb-lg">
        {description}
      </Content>
    );
  };

  const dropdownItems = [
    <DropdownItem
      key="shareGeneral"
      onClick={() => {
        setIsDropdownOpen(false);
        onShareGeneralFeedback?.();
      }}
    >
      {intl.formatMessage(messages.shareFeedback)}
    </DropdownItem>,
    <DropdownItem
      key="reportBug"
      onClick={() => {
        setIsDropdownOpen(false);
        onReportBug?.();
      }}
    >
      {intl.formatMessage(messages.reportABug)}
    </DropdownItem>,
    <DropdownItem
      key="informDirection"
      onClick={() => {
        setIsDropdownOpen(false);
        onInformDirection?.();
      }}
    >
      {intl.formatMessage(messages.informRedhatDirection)}
    </DropdownItem>,
  ];

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      isExpanded={isDropdownOpen}
      variant="secondary"
    >
      {intl.formatMessage(messages.shareMoreFeedback)}
    </MenuToggle>
  );

  return (
    <EmptyState>
      <IconComponent
        size={72}
        className="feedback-result-icon"
        color={
          isSuccess
            ? 'var(--pf-t--global--icon--color--status--success--default)'
            : 'var(--pf-t--global--icon--color--status--danger--default)'
        }
      />
      <Title headingLevel="h2" size="lg">
        {title}
      </Title>
      <EmptyStateBody>{renderDescription()}</EmptyStateBody>
      <EmptyStateFooter>
        {isSuccess ? (
          <EmptyStateActions>
            <Dropdown
              isOpen={isDropdownOpen}
              onSelect={() => setIsDropdownOpen(false)}
              onOpenChange={setIsDropdownOpen}
              toggle={toggle}
            >
              <DropdownList>{dropdownItems}</DropdownList>
            </Dropdown>
          </EmptyStateActions>
        ) : (
          <EmptyStateActions>
            <Button variant="primary" onClick={onBack}>
              {buttonText}
            </Button>
          </EmptyStateActions>
        )}
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default FeedbackResult;
