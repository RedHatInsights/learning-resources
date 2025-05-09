import React, { Suspense } from 'react';
import { Viewer } from './Viewer';
import { suspenseLoader as useSuspenseLoader } from '@redhat-cloud-services/frontend-components-utilities/useSuspenseLoader';
import fetchAllData from './utils/fetchAllData';
import GlobalLearningResourcesContentFallback from './components/GlobalLearningResourcesPage/GlobalLearningResourcesContentFallback';

const AppEntry = (props: { bundle: string }) => {
  const { loader, purgeCache } = useSuspenseLoader(fetchAllData);
  return (
    <Suspense fallback={<GlobalLearningResourcesContentFallback />}>
      <Viewer {...props} loader={loader} purgeCache={purgeCache} />
    </Suspense>
  );
};

export default AppEntry;
