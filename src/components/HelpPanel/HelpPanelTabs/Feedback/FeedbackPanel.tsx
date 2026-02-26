import React, { useState } from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import {
  BugIcon,
  CommentIcon,
  ExternalLinkAltIcon,
  RouteIcon,
} from '@patternfly/react-icons';
import { FormattedMessage, useIntl } from 'react-intl';
import messages from '../../../../Messages';
import { SubTabProps } from '../helpPanelTabsMapper';
import FeedbackForm from './FeedbackForm';
import FeedbackResult from './FeedbackResult';
import './FeedbackPanel.scss';

export type FeedbackPages =
  | 'feedbackHome'
  | 'feedbackOne'
  | 'reportBugOne'
  | 'informDirection'
  | 'feedbackError'
  | 'success';

const SUPPORT_CASE_URL =
  'https://access.redhat.com/support/cases/#/case/new/get-support?caseCreate=true&source=console';
const USER_RESEARCH_URL = 'https://www.redhat.com/en/about/user-research';

const FeedbackPanel: React.FC<SubTabProps> = ({ setNewActionTitle }) => {
  const intl = useIntl();
  const [modalPage, setModalPage] = useState<FeedbackPages>('feedbackHome');

  React.useEffect(() => {
    setNewActionTitle(intl.formatMessage(messages.shareFeedbackTabTitle));
  }, [setNewActionTitle, intl]);

  const handleBack = () => setModalPage('feedbackHome');
  const handleBreadcrumbClick = () => setModalPage('feedbackHome');

  const cardConfigs = [
    {
      title: messages.shareFeedback,
      body: messages.howIsConsoleExperience,
      icon: CommentIcon,
      page: 'feedbackOne' as const,
    },
    {
      title: messages.reportABug,
      body: messages.describeBugUrgentCases,
      icon: BugIcon,
      page: 'reportBugOne' as const,
    },
    {
      title: messages.informRedhatDirection,
      body: messages.researchOpportunities,
      icon: RouteIcon,
      page: 'informDirection' as const,
    },
  ];

  const [successType, setSuccessType] = useState<
    'feedback' | 'bug' | 'research' | null
  >(null);

  const getSuccessConfig = () => {
    switch (successType) {
      case 'bug':
        return {
          title: messages.bugReported,
          description: messages.thankYouForFeedback,
        };
      case 'research':
        return {
          title: messages.responseSent,
          description: messages.thankYouForInterest,
        };
      default:
        return {
          title: messages.feedbackSent,
          description: messages.thankYouForFeedback,
        };
    }
  };

  const createModalDescription = (isResearch = false) => (
    <Content component="p">
      {isResearch ? (
        <>
          {intl.formatMessage(messages.informDirectionDescription)}&nbsp;
          <Content
            component="a"
            href={USER_RESEARCH_URL}
            target="_blank"
            rel="noreferrer"
          >
            {intl.formatMessage(messages.userResearchTeam)}
          </Content>
          {intl.formatMessage(messages.directInfluence)}
        </>
      ) : (
        <>
          {intl.formatMessage(messages.describeBugUrgentCases)}{' '}
          <Content
            component="a"
            href={SUPPORT_CASE_URL}
            target="_blank"
            rel="noreferrer"
          >
            {intl.formatMessage(messages.openSupportCaseText)}
          </Content>
          .
        </>
      )}
    </Content>
  );

  const renderPage = () => {
    switch (modalPage) {
      case 'feedbackHome':
        return (
          <Stack hasGutter>
            <StackItem>
              <Content>
                <Content component={ContentVariants.h1}>
                  {intl.formatMessage(messages.tellAboutExperience)}
                </Content>
                <Content component="p">
                  <FormattedMessage
                    {...messages.helpUsImproveHCC}
                    values={{
                      supportLink: (
                        <Content
                          component="a"
                          href={SUPPORT_CASE_URL}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {intl.formatMessage(messages.openSupportCaseText)}
                          <ExternalLinkAltIcon className="feedback-external-link-icon" />
                        </Content>
                      ),
                    }}
                  />
                </Content>
              </Content>
            </StackItem>
            {cardConfigs.map((config, index) => {
              const IconComponent = config.icon;
              return (
                <StackItem key={index}>
                  <Card
                    isCompact
                    isClickable
                    onClick={() => setModalPage(config.page)}
                    className="feedback-card"
                  >
                    <CardTitle>
                      <Flex alignItems={{ default: 'alignItemsCenter' }}>
                        <FlexItem>
                          <IconComponent className="feedback-card-icon" />
                        </FlexItem>
                        <FlexItem>
                          <Content
                            component="p"
                            className="pf-v6-u-primary-color-100"
                          >
                            {intl.formatMessage(config.title)}
                          </Content>
                        </FlexItem>
                      </Flex>
                    </CardTitle>
                    <CardBody>{intl.formatMessage(config.body)}</CardBody>
                  </Card>
                </StackItem>
              );
            })}
          </Stack>
        );

      case 'feedbackOne':
        return (
          <FeedbackForm
            onBack={handleBack}
            onSubmit={() => {
              setSuccessType('feedback');
              setModalPage('success');
            }}
            onError={() => setModalPage('feedbackError')}
            modalTitle={intl.formatMessage(messages.shareFeedback)}
            modalDescription={intl.formatMessage(
              messages.shareFeedbackDescription
            )}
            feedbackType="Feedback"
            checkboxDescription={intl.formatMessage(
              messages.researchOpportunities
            )}
            submitTitle={intl.formatMessage(messages.submitFeedback)}
            onBreadcrumbClick={handleBreadcrumbClick}
          />
        );

      case 'reportBugOne':
        return (
          <FeedbackForm
            onBack={handleBack}
            onSubmit={() => {
              setSuccessType('bug');
              setModalPage('success');
            }}
            onError={() => setModalPage('feedbackError')}
            modalTitle={intl.formatMessage(messages.reportABug)}
            modalDescription={createModalDescription()}
            feedbackType="Bug"
            checkboxDescription={`${intl.formatMessage(
              messages.researchOpportunities
            )} ${intl.formatMessage(messages.weNeverSharePersonalInformation)}`}
            submitTitle={intl.formatMessage(messages.submitFeedback)}
            onBreadcrumbClick={handleBreadcrumbClick}
          />
        );

      case 'informDirection':
        return (
          <FeedbackForm
            onBack={handleBack}
            onSubmit={() => {
              setSuccessType('research');
              setModalPage('success');
            }}
            onError={() => setModalPage('feedbackError')}
            modalTitle={intl.formatMessage(messages.informRedhatDirection)}
            modalDescription={createModalDescription(true)}
            feedbackType="[Research Opportunities]"
            textAreaHidden={true}
            checkboxDescription={intl.formatMessage(
              messages.weNeverSharePersonalInformation
            )}
            submitTitle={intl.formatMessage(messages.joinMailingList)}
            onBreadcrumbClick={handleBreadcrumbClick}
          />
        );

      case 'success': {
        const config = getSuccessConfig();
        return (
          <FeedbackResult
            type="success"
            title={intl.formatMessage(config.title)}
            description={intl.formatMessage(config.description)}
            onBack={handleBack}
            onShareGeneralFeedback={() => setModalPage('feedbackOne')}
            onReportBug={() => setModalPage('reportBugOne')}
            onInformDirection={() => setModalPage('informDirection')}
          />
        );
      }

      case 'feedbackError':
        return (
          <FeedbackResult
            type="error"
            title={intl.formatMessage(messages.somethingWentWrong)}
            description={intl.formatMessage(messages.problemProcessingRequest)}
            onBack={handleBack}
          />
        );

      default:
        return null;
    }
  };

  return <div className="feedback-panel">{renderPage()}</div>;
};

export default FeedbackPanel;
