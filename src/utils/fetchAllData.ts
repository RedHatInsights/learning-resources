import fetchFilters from './fetchFilters';
import fetchQuickstarts, { FetchQuickstartsOptions } from './fetchQuickstarts';
import { ChromeAPI } from '@redhat-cloud-services/types';

export type FetchAllDataResponse = [
  Awaited<ReturnType<typeof fetchFilters>>,
  Awaited<ReturnType<typeof fetchQuickstarts>>
];

export const loaderOptionsDefault: FetchQuickstartsOptions = {
  'product-families': [],
  content: [],
  'use-case': [],
  'display-name': '',
};

function fetchAllData(
  getUser: ChromeAPI['auth']['getUser'],
  options?: FetchQuickstartsOptions
): Promise<FetchAllDataResponse> {
  return Promise.all([fetchFilters(), fetchQuickstarts(getUser, options)]);
}

export default fetchAllData;
