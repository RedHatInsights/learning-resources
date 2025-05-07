import React, { SyntheticEvent, useState } from 'react';
import { QuickStart, QuickStartType } from '@patternfly/quickstarts';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Content,
  ContentVariants,
  Icon,
  Label,
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
    <Card className="lr-c-global-learning-resources-quickstart__card">
      <Content className="lr-c-global-learning-resources-quickstart__card--content">
        <CardTitle
          component="div"
          className="lr-c-global-learning-resources-quickstart__card--title"
          onClick={() => {
            if (quickStart.spec.type?.text === QUICK_START_TYPE.text) {
              chrome.quickStarts.activateQuickstart(quickStart.metadata.name);
            } else {
              window.open(quickStart.spec.link?.href, '_blank');
            }
          }}
        >
          <div className="lr-c-global-learning-resources-quickstart__card--title-container">
            <Content component={ContentVariants.h4}>
              {quickStart.spec.displayName}
            </Content>
          </div>
          <Button
            icon={
              isBookmarked ? <BookmarkedIcon /> : <OutlinedBookmarkedIcon />
            }
            onClick={(e) => {
              e.stopPropagation(); // Prevent the event from propagating to the Title's onClick
              handleBookmark(e);
            }}
            variant="plain"
            aria-label={
              quickStart.metadata.favorite
                ? 'Unbookmark learning resource'
                : 'Bookmark learning resource'
            }
          />
        </CardTitle>
        <CardBody
          component="div"
          className="lr-c-global-learning-resources-quickstart__card--cardbody"
        >
          <div className="lr-c-global-learning-resources-quickstart__card--body pf-v6-u-mb-md">
            <Label isCompact color={labelColor} className="pf-v6-u-mr-sm">
              {quickStart.spec.type?.text}
            </Label>
            <Content
              component={ContentVariants.small}
              className="lr-c-global-learning-resources-quickstart__card--hostname"
            >
              {quickStartURL.hostname}
            </Content>
          </div>
          <Content
            component={ContentVariants.p}
            className="lr-c-global-learning-resources-quickstart__card--description"
          >
            {quickStart.spec.description}
          </Content>
        </CardBody>
        <CardFooter className="lr-c-global-learning-resources-quickstart__card--footer">
          <Content component={ContentVariants.small} className="pf-v6-u-mb-sm">
            {quickStartTags[TagsEnum.ProductFamilies].map((item, index) => (
              <span
                key={index}
                className="pf-v6-u-mr-xs lr-c-global-learning-resources-quickstart__card--footer-span"
              >
                <img
                  src={item.icon}
                  alt={item.cardLabel}
                  className="lr-c-global-learning-resources-quickstart__card--footer-icon pf-v6-u-mr-xs"
                />
                {item.cardLabel}
              </span>
            ))}
          </Content>
          <Content component={ContentVariants.small}>
            {quickStartTags[TagsEnum.UseCase].length > 0 ? (
              <Icon className="pf-v6-u-mr-sm">
                <TagIcon />
              </Icon>
            ) : undefined}
            {quickStartTags[TagsEnum.UseCase]
              .map((item) => item?.cardLabel)
              .join(', ')}
          </Content>
        </CardFooter>
      </Content>
    </Card>
  );
};

export default GlobalLearningResourcesQuickstartItem;
