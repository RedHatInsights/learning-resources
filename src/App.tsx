import React, { useEffect } from 'react';

import './App.scss';
import { QuickStart } from '@patternfly/quickstarts';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';

const App = () => {
  const chrome = useChrome();

  const { quickStarts } = chrome;
  const { Catalog } = quickStarts;

  useEffect(() => {
    fetch(`/api/quickstarts/v1/quickstarts?bundle=settings`)
      .then<{ data: { content: QuickStart }[] }>((response) => response.json())
      .then(({ data }) =>
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        quickStarts.set(
          'settings',
          data.map(({ content }) => content)
        )
      )
      .catch((err) => {
        console.log(err.message);
      });
  }, []);

  return <Catalog />;
};

export default App;
