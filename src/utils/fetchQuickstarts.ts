import { ChromeAPI } from '@redhat-cloud-services/types';
import { API_BASE, FAVORITES, FavoriteQuickStart } from './toggleFavorite';
import { QUICKSTARTS } from '../hooks/useQuickStarts';
import axios from 'axios';
import { QuickStart } from '@patternfly/quickstarts';
import { ObjectMetadata } from '@patternfly/quickstarts/dist/ConsoleInternal/module/k8s/types';

export interface Tag {
  kind: string;
  value: string;
}

export interface TaggedMetadata extends ObjectMetadata {
  tags: Tag[];
  favorite?: boolean;
  externalDocumentation?: boolean;
  otherResource?: boolean;
  learningPath?: boolean;
}

export interface ExtendedQuickstart extends QuickStart {
  metadata: TaggedMetadata;
}

export type FetchQuickstartsOptions = {
  'product-families'?: string[];
  content?: string[];
  'use-case'?: string[];
  'display-name'?: string;
  bundle?: string;
};

export const loaderOptionsFalllback: FetchQuickstartsOptions = {
  'product-families': [],
  content: [],
  'use-case': [],
  'display-name': '',
};

async function fetchQuickstarts(
  getUser: ChromeAPI['auth']['getUser'],
  options?: FetchQuickstartsOptions
) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not logged in');
  }
  const account = user.identity.internal?.account_id;

  const quickstartsPath = `${API_BASE}/${QUICKSTARTS}`;

  const contentPromise = axios
    .get<{ data: { content: ExtendedQuickstart }[] }>(quickstartsPath, {
      params: {
        account,
        ...options,
        'display-name':
          options?.['display-name']?.trim() === ''
            ? ''
            : options?.['display-name'],
      },
    })
    .then(({ data }) => {
      return data.data.map(({ content }) => content);
    });

  const favoritesPromise = account
    ? axios
        .get<{ data: FavoriteQuickStart[] }>(`${API_BASE}/${FAVORITES}`, {
          params: { account },
        })
        .then(({ data }) => data.data)
    : Promise.resolve<FavoriteQuickStart[]>([]);

  const [content, favorites] = await Promise.all([
    contentPromise,
    favoritesPromise,
  ]);

  const hashMap: { [key: string]: boolean } = {};

  favorites.forEach((item) => {
    hashMap[item.quickstartName] = item.favorite;
  });

  return content.map((item) => {
    const name = item?.metadata?.name;
    return {
      ...item,
      metadata: {
        ...item?.metadata,
        favorite: !!hashMap[name],
      },
    };
  });
}

export default fetchQuickstarts;
