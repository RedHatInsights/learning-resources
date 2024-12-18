import React, { SyntheticEvent, useState } from 'react';
import { QuickStart, QuickStartType } from '@patternfly/quickstarts';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Icon,
  Label,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { TagIcon } from '@patternfly/react-icons';
import { API_BASE, FAVORITES } from '../../hooks/useQuickStarts';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import axios from 'axios';
import './GlobalLearningResourcesQuickstartItem.scss';
import { BookmarkedIcon, OutlinedBookmarkedIcon } from '../common/BookmarkIcon';
import { Filter } from '../../utils/filtersInterface';
import { TagsEnum } from '../../utils/tagsEnum';

interface GlobalLearningResourcesQuickstartItemProps {
  quickStart: QuickStart;
  purgeCache: () => void;
  quickStartTags: {
    [TagsEnum.ProductFamilies]: Filter[];
    [TagsEnum.UseCase]: Filter[];
  };
}

const GlobalLearningResourcesQuickstartItem: React.FC<
  GlobalLearningResourcesQuickstartItemProps
> = ({ quickStart, purgeCache, quickStartTags }) => {
  const chrome = useChrome();
  const [isBookmarked, setIsBookmarked] = useState(
    quickStart.metadata.favorite
  );
  const quickStartURL = new URL(
    quickStart.spec.link?.href ?? 'https://docs.redhat.com/'
  );
  const labelColor = quickStart.spec.type?.color;
  const QUICK_START_TYPE: QuickStartType = {
    text: 'Quick start',
    color: 'green',
  };

  const handleBookmark = async (e: SyntheticEvent<Element, Event>) => {
    const user = await chrome.auth.getUser();
    if (!user) {
      throw new Error('User not logged in');
    }
    const account = user.identity.internal?.account_id;
    e.preventDefault();
    e.stopPropagation();
    try {
      setIsBookmarked((flag: boolean) => !flag);
      await axios.post(`${API_BASE}/${FAVORITES}?account=${account}`, {
        quickstartName: quickStart.metadata.name,
        favorite: !isBookmarked,
      });
      purgeCache();
    } catch (error) {
      setIsBookmarked(quickStart.metadata.favorite);
    }
  };

  return (
    <Card
      className="lr-c-global-learning-resources-quickstart__card"
      onClick={() => {
        if (quickStart.spec.type?.text === QUICK_START_TYPE.text) {
          chrome.quickStarts.activateQuickstart(quickStart.metadata.name);
        } else {
          window.open(quickStart.spec.link?.href, '_blank');
        }
      }}
      isClickable
    >
      <TextContent className="lr-c-global-learning-resources-quickstart__card--content">
        <CardTitle
          component="div"
          className="lr-c-global-learning-resources-quickstart__card--title"
        >
          <div className="lr-c-global-learning-resources-quickstart__card--title-container">
            <Text component={TextVariants.h3}>
              {quickStart.spec.displayName}
            </Text>
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation(); // Prevent the event from propagating to the Card's onClick
              handleBookmark(e);
            }}
            variant="plain"
            aria-label={
              quickStart.metadata.favorite
                ? 'Unbookmark learning resource'
                : 'Bookmark learning resource'
            }
          >
            {isBookmarked ? <BookmarkedIcon /> : <OutlinedBookmarkedIcon />}
          </Button>
        </CardTitle>
        <CardBody component="div">
          <div className="lr-c-global-learning-resources-quickstart__card--body">
            <Label isCompact color={labelColor}>
              {quickStart.spec.type?.text}
            </Label>
            <Text component={TextVariants.small}>{quickStartURL.hostname}</Text>
          </div>
          <Text component={TextVariants.p}>{quickStart.spec.description}</Text>
        </CardBody>
        <CardFooter className="lr-c-global-learning-resources-quickstart__card--footer">
          <Text component={TextVariants.small} className="pf-v5-u-mb-sm">
            {quickStartTags[TagsEnum.ProductFamilies].map((item, index) => (
              <span
                key={index}
                className="lr-c-global-learning-resources-quickstart__card--footer-span"
              >
                <img
                  src={item.icon}
                  alt={item.cardLabel}
                  className="lr-c-global-learning-resources-quickstart__card--footer-icon"
                />
                {item.cardLabel}
              </span>
            ))}
          </Text>
          <Text component={TextVariants.small}>
            {quickStartTags[TagsEnum.UseCase].length > 0 ? (
              <Icon className="pf-v5-u-mr-sm">
                <TagIcon />
              </Icon>
            ) : undefined}
            {quickStartTags[TagsEnum.UseCase]
              .map((item) => item?.cardLabel)
              .join(', ')}
          </Text>
        </CardFooter>
      </TextContent>
    </Card>
  );
};

export default GlobalLearningResourcesQuickstartItem;
