import React, { useMemo, useState } from 'react';
import {
  Alert,
  AlertVariant,
  Button,
  ClipboardCopy,
  ClipboardCopyVariant,
  Content,
  ContentVariants,
  ExpandableSection,
  Flex,
  FlexItem,
  List,
  ListItem,
  Progress,
  Radio,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExternalLinkAltIcon,
  FireIcon,
  InfoCircleIcon,
  LightbulbIcon,
  TimesIcon,
} from '@patternfly/react-icons';
import { renderToStaticMarkup } from 'react-dom/server';
import { useIntl } from 'react-intl';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ExtendedQuickstart } from '../../../utils/fetchQuickstarts';
import messages from '../../../Messages';
import './QuickstartPanel.scss';

// Configure marked for safe rendering with custom link renderer
// Links open in new tab for better UX
const renderer = new marked.Renderer();
renderer.link = ({ href, title, text }) => {
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
};

marked.setOptions({
  breaks: true,
  gfm: true,
  renderer,
});

// Task status enum matching PatternFly quickstarts
enum TaskStatus {
  INIT = 'init',
  VISITED = 'visited',
  REVIEW = 'review',
  SUCCESS = 'success',
  FAILED = 'failed',
}

// Admonition type mapping matching PatternFly quickstarts
type AdmonitionConfig = {
  variant: AlertVariant;
  customIcon?: React.ReactNode;
};

const admonitionToAlertVariantMap: Record<string, AdmonitionConfig> = {
  NOTE: { variant: AlertVariant.info },
  TIP: { variant: AlertVariant.custom, customIcon: <LightbulbIcon /> },
  IMPORTANT: { variant: AlertVariant.danger },
  CAUTION: { variant: AlertVariant.warning, customIcon: <FireIcon /> },
  WARNING: { variant: AlertVariant.warning },
};

/**
 * Creates a PatternFly Alert component as HTML string for admonitions.
 * This matches how the PF quickstarts library renders admonitions.
 */
const createAdmonitionHtml = (type: string, content: string): string => {
  const normalizedType = type.toUpperCase();
  const config = admonitionToAlertVariantMap[normalizedType] || admonitionToAlertVariantMap.NOTE;
  
  // Parse inline markdown in the content
  const processedContent = marked.parseInline(content) as string;
  const sanitizedContent = DOMPurify.sanitize(processedContent);
  
  // Render PatternFly Alert as static HTML
  const alertElement = (
    <Alert
      variant={config.variant}
      {...(config.customIcon && { customIcon: config.customIcon })}
      isInline
      title={normalizedType}
      className="pfext-markdown-admonition"
    >
      <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
    </Alert>
  );
  
  return renderToStaticMarkup(alertElement);
};

/**
 * Creates a ClipboardCopy component as HTML string for copyable code.
 */
const createClipboardCopyHtml = (code: string, isBlock: boolean): string => {
  const clipboardElement = (
    <ClipboardCopy
      isReadOnly
      hoverTip="Copy"
      clickTip="Copied"
      variant={isBlock ? ClipboardCopyVariant.expansion : ClipboardCopyVariant.inline}
      className="lr-c-clipboard-copy"
    >
      {code.trim()}
    </ClipboardCopy>
  );
  
  return renderToStaticMarkup(clipboardElement);
};

/**
 * Processes PatternFly quickstart syntax in markdown content.
 * Handles the following PF quickstart extensions:
 * - [content]{{admonition type}} - note/warning boxes (renders as PF Alert)
 * - `code`{{copy}} - inline copyable code (renders as PF ClipboardCopy)
 * - ```code```{{copy}} - block copyable code (renders as PF ClipboardCopy)
 * - [content]{{accordion "title"}} - collapsible sections
 * - {{highlight selector}} - UI highlighting (removed, not applicable in panel)
 * - [text]{{highlight selector}} - clickable highlights (extract text only)
 */
const preprocessQuickstartMarkdown = (content: string): string => {
  let processed = content;

  // Handle PF quickstart admonition format: [content]{{admonition type}}
  processed = processed.replace(
    /\[([^\]]+)\]\{\{admonition\s+(\w+)\}\}/gi,
    (_match, admonitionContent: string, type: string) => {
      return createAdmonitionHtml(type, admonitionContent);
    }
  );

  // Handle legacy/alternative admonition format: {{#admonition type}}...{{/admonition}}
  processed = processed.replace(
    /\{\{#?admonition\s+(\w+)\}\}([\s\S]*?)\{\{\/admonition\}\}/gi,
    (_match, type: string, admonitionContent: string) => {
      return createAdmonitionHtml(type, admonitionContent);
    }
  );

  // Handle accordion format: [content]{{accordion "title"}}
  // Convert to a simple expandable section appearance
  processed = processed.replace(
    /\[([^\]]+)\]\{\{accordion\s+["']([^"']+)["']\}\}/gi,
    (_match, accordionContent: string, title: string) => {
      return `<details class="lr-c-accordion"><summary class="lr-c-accordion__title">${title}</summary><div class="lr-c-accordion__content">${accordionContent.trim()}</div></details>`;
    }
  );

  // Handle inline copy: `code`{{copy}} - render as PF ClipboardCopy
  processed = processed.replace(
    /`([^`]+)`\{\{copy\}\}/gi,
    (_match, code: string) => createClipboardCopyHtml(code, false)
  );

  // Handle block copy: ```code```{{copy}} - render as PF ClipboardCopy
  processed = processed.replace(
    /```([\s\S]*?)```\{\{copy\}\}/gi,
    (_match, code: string) => createClipboardCopyHtml(code, true)
  );

  // Handle highlight with text: [text]{{highlight selector}} - extract just the text
  processed = processed.replace(
    /\[([^\]]+)\]\{\{highlight\s+[^}]+\}\}/gi,
    (_match, text: string) => `<strong>${text}</strong>`
  );

  // Remove standalone highlight directives: {{highlight selector}}
  processed = processed.replace(/\{\{highlight\s+[^}]+\}\}/gi, '');

  // Remove any remaining {{...}} template syntax
  processed = processed.replace(/\{\{[^}]*\}\}/g, '');

  return processed;
};

// Helper component to render markdown content
const MarkdownContent: React.FC<{ content: string; className?: string }> = ({
  content,
  className,
}) => {
  const html = useMemo(() => {
    try {
      const preprocessed = preprocessQuickstartMarkdown(content);
      const parsed = marked.parse(preprocessed) as string;
      return DOMPurify.sanitize(parsed);
    } catch {
      return DOMPurify.sanitize(content);
    }
  }, [content]);

  return (
    <div
      className={`lr-c-markdown-content ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

interface QuickstartPanelProps {
  quickstartData?: ExtendedQuickstart;
  onClose?: () => void;
}

const QuickstartPanel: React.FC<QuickstartPanelProps> = ({
  quickstartData,
  onClose,
}) => {
  const intl = useIntl();
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(-1); // -1 means overview
  const [isPrerequisitesExpanded, setIsPrerequisitesExpanded] = useState(false);
  const [taskStatuses, setTaskStatuses] = useState<Record<number, TaskStatus>>(
    {}
  );

  if (!quickstartData) {
    return (
      <Content>
        <p>{intl.formatMessage(messages.quickstartNoDataAvailable)}</p>
      </Content>
    );
  }

  const { spec } = quickstartData;
  const tasks = spec.tasks || [];
  const isOverview = currentTaskIndex === -1;
  const currentTask = !isOverview ? tasks[currentTaskIndex] : null;

  // Calculate completed tasks count
  const completedTasksCount = Object.values(taskStatuses).filter(
    (status) => status === TaskStatus.SUCCESS || status === TaskStatus.FAILED
  ).length;

  const progress =
    tasks.length > 0 ? (completedTasksCount / tasks.length) * 100 : 0;

  const handleStartQuickstart = () => {
    setCurrentTaskIndex(0);
    if (taskStatuses[0] === undefined) {
      setTaskStatuses((prev) => ({ ...prev, [0]: TaskStatus.VISITED }));
    }
  };

  const handleNext = () => {
    if (currentTaskIndex < tasks.length - 1) {
      const nextIndex = currentTaskIndex + 1;
      setCurrentTaskIndex(nextIndex);
      if (taskStatuses[nextIndex] === undefined) {
        setTaskStatuses((prev) => ({ ...prev, [nextIndex]: TaskStatus.VISITED }));
      }
    } else {
      // Last task, go back to overview
      setCurrentTaskIndex(-1);
    }
  };

  const handleBack = () => {
    if (currentTaskIndex === 0) {
      setCurrentTaskIndex(-1); // Back to overview
    } else if (currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1);
    }
  };

  const handleRestart = () => {
    setTaskStatuses({});
    setCurrentTaskIndex(0);
    setTaskStatuses({ 0: TaskStatus.VISITED });
  };

  const handleTaskClick = (index: number) => {
    setCurrentTaskIndex(index);
    if (taskStatuses[index] === undefined) {
      setTaskStatuses((prev) => ({ ...prev, [index]: TaskStatus.VISITED }));
    }
  };

  const handleTaskReview = (status: TaskStatus) => {
    setTaskStatuses((prev) => ({ ...prev, [currentTaskIndex]: status }));
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const getTaskIcon = (index: number) => {
    const status = taskStatuses[index];
    if (status === TaskStatus.SUCCESS) {
      return (
        <CheckCircleIcon className="lr-c-task-icon lr-c-task-icon--success" />
      );
    }
    if (status === TaskStatus.FAILED) {
      return (
        <ExclamationCircleIcon className="lr-c-task-icon lr-c-task-icon--failed" />
      );
    }
    return <span className="lr-c-task-number">{index + 1}</span>;
  };

  // Check if current task has been reviewed
  const currentTaskStatus = taskStatuses[currentTaskIndex];
  const isTaskReviewed =
    currentTaskStatus === TaskStatus.SUCCESS ||
    currentTaskStatus === TaskStatus.FAILED;

  // Render overview (introduction + task list)
  if (isOverview) {
    return (
      <div
        className="lr-c-help-panel-quickstart"
        data-ouia-component-id="help-panel-quickstart-overview"
      >
        <Stack hasGutter className="lr-c-quickstart-content">
          {/* Header with title and external link */}
          <StackItem>
            <Flex
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
              alignItems={{ default: 'alignItemsFlexStart' }}
            >
              <FlexItem flex={{ default: 'flex_1' }}>
                <Title headingLevel="h2" className="lr-c-quickstart-title">
                  {spec.displayName}
                </Title>
              </FlexItem>
              {spec.link?.href && (
                <FlexItem>
                  <Button
                    variant="plain"
                    component="a"
                    href={spec.link.href}
                    target="_blank"
                    aria-label={intl.formatMessage(
                      messages.quickstartOpenInNewWindow
                    )}
                    icon={<ExternalLinkAltIcon />}
                  />
                </FlexItem>
              )}
            </Flex>
          </StackItem>

          {/* Duration text */}
          {spec.durationMinutes && (
            <StackItem>
              <Content
                component={ContentVariants.small}
                className="lr-c-quickstart-duration"
              >
                {intl.formatMessage(messages.quickstartDurationLabel, {
                  minutes: spec.durationMinutes,
                })}
              </Content>
            </StackItem>
          )}

          {/* Progress bar - only show if tasks have been started */}
          {tasks.length > 0 && completedTasksCount > 0 && (
            <StackItem>
              <Progress
                value={progress}
                title={intl.formatMessage(messages.quickstartProgressTitle)}
                measureLocation="outside"
                label={intl.formatMessage(messages.quickstartTasksCompleted, {
                  completed: completedTasksCount,
                  total: tasks.length,
                })}
              />
            </StackItem>
          )}

          {/* Introduction */}
          {spec.introduction && (
            <StackItem>
              <MarkdownContent content={spec.introduction} />
            </StackItem>
          )}

          {/* Description fallback */}
          {spec.description && !spec.introduction && (
            <StackItem>
              <MarkdownContent content={spec.description} />
            </StackItem>
          )}

          {/* Prerequisites */}
          {spec.prerequisites && spec.prerequisites.length > 0 && (
            <StackItem>
              <ExpandableSection
                toggleText={intl.formatMessage(
                  messages.quickstartViewPrerequisites,
                  { count: spec.prerequisites.length }
                )}
                isExpanded={isPrerequisitesExpanded}
                onToggle={(_event, expanded) =>
                  setIsPrerequisitesExpanded(expanded)
                }
                className="lr-c-quickstart-prerequisites"
              >
                <List>
                  {spec.prerequisites.map((prereq, index) => (
                    <ListItem key={index}>
                      <MarkdownContent
                        content={prereq}
                        className="lr-c-markdown-inline"
                      />
                    </ListItem>
                  ))}
                </List>
              </ExpandableSection>
            </StackItem>
          )}

          {/* Task list */}
          {tasks.length > 0 && (
            <StackItem>
              <Content
                component={ContentVariants.p}
                className="lr-c-quickstart-task-intro"
              >
                {intl.formatMessage(messages.quickstartTaskListIntro, {
                  count: tasks.length,
                })}
              </Content>
              <List isPlain className="lr-c-quickstart-task-list">
                {tasks.map((task, index) => (
                  <ListItem key={index} className="lr-c-quickstart-task-item">
                    <Button
                      variant="link"
                      isInline
                      onClick={() => handleTaskClick(index)}
                      className="lr-c-quickstart-task-link"
                      ouiaId={`help-panel-quickstart-task-${index}`}
                    >
                      <Flex
                        spaceItems={{ default: 'spaceItemsSm' }}
                        alignItems={{ default: 'alignItemsCenter' }}
                      >
                        <FlexItem>{getTaskIcon(index)}</FlexItem>
                        <FlexItem>{task.title}</FlexItem>
                      </Flex>
                    </Button>
                  </ListItem>
                ))}
              </List>
            </StackItem>
          )}

          {/* Start button */}
          {tasks.length > 0 && (
            <StackItem className="lr-c-quickstart-footer">
              <Button
                variant="primary"
                onClick={handleStartQuickstart}
                ouiaId="help-panel-quickstart-start-button"
              >
                {completedTasksCount > 0
                  ? intl.formatMessage(messages.quickstartContinue)
                  : intl.formatMessage(messages.quickstartNext)}
              </Button>
            </StackItem>
          )}
        </Stack>
      </div>
    );
  }

  // Render task view
  return (
    <div
      className="lr-c-help-panel-quickstart lr-c-help-panel-quickstart--task-view"
      data-ouia-component-id="help-panel-quickstart-task"
    >
      {/* Blue header */}
      <div className="lr-c-quickstart-header">
        <div className="lr-c-quickstart-header__content">
          <Title headingLevel="h2" className="lr-c-quickstart-header__title">
            {spec.displayName}
          </Title>
          {spec.durationMinutes && (
            <Content
              component={ContentVariants.small}
              className="lr-c-quickstart-header__duration"
            >
              Quick start • {spec.durationMinutes} minutes
            </Content>
          )}
        </div>
        {onClose && (
          <Button
            variant="plain"
            onClick={handleClose}
            aria-label="Close"
            className="lr-c-quickstart-header__close"
          >
            <TimesIcon />
          </Button>
        )}
      </div>

      {/* Task content */}
      <div className="lr-c-quickstart-body">
        <Stack hasGutter>
          {/* Task indicator with number and title */}
          <StackItem>
            <Flex
              spaceItems={{ default: 'spaceItemsSm' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem>
                <span className="lr-c-task-number">{currentTaskIndex + 1}</span>
              </FlexItem>
              <FlexItem>
                <span className="lr-c-quickstart-task-indicator">
                  {currentTask?.title}{' '}
                  <span className="lr-c-quickstart-task-indicator__progress">
                    {currentTaskIndex + 1} of {tasks.length}
                  </span>
                </span>
              </FlexItem>
            </Flex>
          </StackItem>

          {/* Task description */}
          {currentTask?.description && (
            <StackItem className="lr-c-task-description">
              <MarkdownContent content={currentTask.description} />
            </StackItem>
          )}

          {/* Check your work section */}
          {currentTask?.review?.instructions && (
            <StackItem>
              <div className="lr-c-quickstart-review">
                <div className="lr-c-quickstart-review__header">
                  <InfoCircleIcon className="lr-c-quickstart-review__icon" />
                  <span className="lr-c-quickstart-review__title">
                    {intl.formatMessage(messages.quickstartCheckYourWork)}
                  </span>
                </div>
                <div className="lr-c-quickstart-review__content">
                  <MarkdownContent content={currentTask.review.instructions} />

                  {/* Review radio buttons */}
                  <div className="lr-c-quickstart-review__actions">
                    <Radio
                      id={`review-success-${currentTaskIndex}`}
                      name={`review-${currentTaskIndex}`}
                      label={intl.formatMessage(messages.quickstartReviewYes)}
                      isChecked={currentTaskStatus === TaskStatus.SUCCESS}
                      onChange={() => handleTaskReview(TaskStatus.SUCCESS)}
                      className="lr-c-quickstart-review__radio"
                    />
                    <Radio
                      id={`review-failed-${currentTaskIndex}`}
                      name={`review-${currentTaskIndex}`}
                      label={intl.formatMessage(messages.quickstartReviewNo)}
                      isChecked={currentTaskStatus === TaskStatus.FAILED}
                      onChange={() => handleTaskReview(TaskStatus.FAILED)}
                      className="lr-c-quickstart-review__radio"
                    />
                  </div>

                  {/* Failed task help */}
                  {currentTaskStatus === TaskStatus.FAILED &&
                    currentTask.review.failedTaskHelp && (
                      <div className="lr-c-quickstart-review__failed-help">
                        <MarkdownContent
                          content={currentTask.review.failedTaskHelp}
                        />
                      </div>
                    )}
                </div>
              </div>
            </StackItem>
          )}

          {/* Footer with Next, Back, Restart buttons */}
          <StackItem className="lr-c-quickstart-footer">
            <Flex spaceItems={{ default: 'spaceItemsMd' }}>
              <FlexItem>
                <Button
                  variant="primary"
                  onClick={handleNext}
                  ouiaId="help-panel-quickstart-next-button"
                >
                  {intl.formatMessage(messages.quickstartNext)}
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="secondary"
                  onClick={handleBack}
                  ouiaId="help-panel-quickstart-back-button"
                >
                  {intl.formatMessage(messages.quickstartBack)}
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="link"
                  onClick={handleRestart}
                  ouiaId="help-panel-quickstart-restart-button"
                >
                  {intl.formatMessage(messages.quickstartRestart)}
                </Button>
              </FlexItem>
            </Flex>
          </StackItem>
        </Stack>
      </div>
    </div>
  );
};

export default QuickstartPanel;
