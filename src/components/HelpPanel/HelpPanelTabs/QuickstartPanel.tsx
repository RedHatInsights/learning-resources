import React, { useMemo, useState } from 'react';
import {
  Button,
  Content,
  ContentVariants,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  List,
  ListItem,
  Progress,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExternalLinkAltIcon,
  OutlinedClockIcon,
} from '@patternfly/react-icons';
import { marked } from 'marked';
import { ExtendedQuickstart } from '../../../utils/fetchQuickstarts';
import './QuickstartPanel.scss';

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Strips custom PatternFly quickstart syntax ({{...}}) from markdown content.
 * The standard markdown (bold, links, lists) is handled by the marked library.
 */
const preprocessQuickstartMarkdown = (content: string): string => {
  // Remove all {{...}} template syntax (admonition, highlight, copy, etc.)
  // These are PatternFly quickstart-specific extensions not supported by standard markdown
  let processed = content.replace(/\{\{[^}]*\}\}/g, '');

  // Clean up orphaned brackets that were part of [text]{{directive}} patterns
  // But preserve valid markdown links [text](url)
  processed = processed.replace(/\[([^\]]+)\](?!\()/g, '$1');

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
      return marked.parse(preprocessed) as string;
    } catch {
      return content;
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
  setNewActionTitle: (title: string) => void;
  quickstartData?: ExtendedQuickstart;
}

const QuickstartPanel: React.FC<QuickstartPanelProps> = ({
  quickstartData,
}) => {
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(-1); // -1 means overview
  const [isPrerequisitesExpanded, setIsPrerequisitesExpanded] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());

  if (!quickstartData) {
    return (
      <Content>
        <p>No quickstart data available.</p>
      </Content>
    );
  }

  const { spec } = quickstartData;
  const tasks = spec.tasks || [];
  const isOverview = currentTaskIndex === -1;
  const currentTask = !isOverview ? tasks[currentTaskIndex] : null;
  const progress =
    tasks.length > 0 ? (completedTasks.size / tasks.length) * 100 : 0;

  const handleNext = () => {
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    }
  };

  const handleBack = () => {
    setCurrentTaskIndex(currentTaskIndex - 1);
  };

  const handleTaskClick = (index: number) => {
    setCurrentTaskIndex(index);
  };

  const handleMarkComplete = () => {
    setCompletedTasks((prev) => new Set([...prev, currentTaskIndex]));
    if (currentTaskIndex < tasks.length - 1) {
      handleNext();
    }
  };

  // Render overview (introduction + task list)
  if (isOverview) {
    return (
      <Stack
        hasGutter
        className="lr-c-help-panel-quickstart"
        data-ouia-component-id="help-panel-quickstart-overview"
      >
        {/* Header with title */}
        <StackItem>
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsFlexStart' }}
          >
            <FlexItem flex={{ default: 'flex_1' }}>
              <Title headingLevel="h2">{spec.displayName}</Title>
            </FlexItem>
            {spec.link?.href && (
              <FlexItem>
                <Button
                  variant="plain"
                  component="a"
                  href={spec.link.href}
                  target="_blank"
                  aria-label="Open in new window"
                  icon={<ExternalLinkAltIcon />}
                />
              </FlexItem>
            )}
          </Flex>
        </StackItem>

        {/* Duration badge */}
        {spec.durationMinutes && (
          <StackItem>
            <Label color="blue" icon={<OutlinedClockIcon />}>
              Quick start | {spec.durationMinutes} minutes
            </Label>
          </StackItem>
        )}

        {/* Progress bar */}
        {tasks.length > 0 && completedTasks.size > 0 && (
          <StackItem>
            <Progress
              value={progress}
              title="Progress"
              measureLocation="outside"
              label={`${completedTasks.size} of ${tasks.length} tasks completed`}
            />
          </StackItem>
        )}

        {/* Introduction */}
        {spec.introduction && (
          <StackItem>
            <MarkdownContent content={spec.introduction} />
          </StackItem>
        )}

        {/* Description */}
        {spec.description && !spec.introduction && (
          <StackItem>
            <MarkdownContent content={spec.description} />
          </StackItem>
        )}

        {/* Prerequisites */}
        {spec.prerequisites && spec.prerequisites.length > 0 && (
          <StackItem>
            <ExpandableSection
              toggleText={`View prerequisites (${spec.prerequisites.length})`}
              isExpanded={isPrerequisitesExpanded}
              onToggle={(_event, expanded) =>
                setIsPrerequisitesExpanded(expanded)
              }
              data-ouia-component-id="help-panel-quickstart-prerequisites"
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
            <Content component={ContentVariants.p} className="pf-v6-u-mb-sm">
              <strong>
                In this quick start, you will complete {tasks.length} task
                {tasks.length > 1 ? 's' : ''}:
              </strong>
            </Content>
            <List isPlain className="lr-c-quickstart-task-list">
              {tasks.map((task, index) => {
                const isCompleted = completedTasks.has(index);
                return (
                  <ListItem key={index} className="lr-c-quickstart-task-item">
                    <Button
                      variant="link"
                      isInline
                      onClick={() => handleTaskClick(index)}
                      className="lr-c-quickstart-task-link"
                      data-ouia-component-id={`help-panel-quickstart-task-${index}`}
                    >
                      <Flex
                        spaceItems={{ default: 'spaceItemsSm' }}
                        alignItems={{ default: 'alignItemsCenter' }}
                      >
                        <FlexItem>
                          {isCompleted ? (
                            <CheckCircleIcon color="var(--pf-t--global--icon--color--status--success--default)" />
                          ) : (
                            <span className="lr-c-task-number">
                              {index + 1}
                            </span>
                          )}
                        </FlexItem>
                        <FlexItem>{task.title}</FlexItem>
                      </Flex>
                    </Button>
                  </ListItem>
                );
              })}
            </List>
          </StackItem>
        )}

        {/* Start button */}
        {tasks.length > 0 && (
          <StackItem>
            <Button
              variant="primary"
              onClick={() => setCurrentTaskIndex(0)}
              data-ouia-component-id="help-panel-quickstart-start-button"
            >
              Start
            </Button>
          </StackItem>
        )}
      </Stack>
    );
  }

  // Render task view
  return (
    <Stack
      hasGutter
      className="lr-c-help-panel-quickstart"
      data-ouia-component-id="help-panel-quickstart-task"
    >
      {/* Back to overview link */}
      <StackItem>
        <Button
          variant="link"
          onClick={handleBack}
          icon={<ArrowLeftIcon />}
          isInline
          className="pf-v6-u-p-0"
        >
          {currentTaskIndex === 0 ? 'Back to overview' : 'Back'}
        </Button>
      </StackItem>

      {/* Task progress indicator */}
      <StackItem>
        <Label color="blue" isCompact>
          {currentTaskIndex + 1} of {tasks.length}
        </Label>
      </StackItem>

      {/* Task title */}
      <StackItem>
        <Title headingLevel="h3">{currentTask?.title}</Title>
      </StackItem>

      {/* Task description */}
      {currentTask?.description && (
        <StackItem className="lr-c-task-description">
          <MarkdownContent content={currentTask.description} />
        </StackItem>
      )}

      {/* Review section */}
      {currentTask?.review?.instructions && (
        <StackItem>
          <Title headingLevel="h4">Check your work</Title>
          <MarkdownContent content={currentTask.review.instructions} />
        </StackItem>
      )}

      {/* Navigation buttons */}
      <StackItem>
        <Flex spaceItems={{ default: 'spaceItemsSm' }}>
          {!completedTasks.has(currentTaskIndex) && (
            <FlexItem>
              <Button
                variant="primary"
                onClick={handleMarkComplete}
                data-ouia-component-id="help-panel-quickstart-complete-button"
              >
                {currentTaskIndex < tasks.length - 1
                  ? 'Mark complete & next'
                  : 'Mark complete'}
              </Button>
            </FlexItem>
          )}
          {completedTasks.has(currentTaskIndex) &&
            currentTaskIndex < tasks.length - 1 && (
              <FlexItem>
                <Button
                  variant="primary"
                  onClick={handleNext}
                  data-ouia-component-id="help-panel-quickstart-next-button"
                >
                  Next
                </Button>
              </FlexItem>
            )}
          {currentTaskIndex === tasks.length - 1 &&
            completedTasks.has(currentTaskIndex) && (
              <FlexItem>
                <Button
                  variant="secondary"
                  onClick={() => setCurrentTaskIndex(-1)}
                  data-ouia-component-id="help-panel-quickstart-finish-button"
                >
                  Back to overview
                </Button>
              </FlexItem>
            )}
        </Flex>
      </StackItem>
    </Stack>
  );
};

export default QuickstartPanel;
