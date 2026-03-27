import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { IntlProvider } from 'react-intl';
import { QuickStart } from '@patternfly/quickstarts';
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test';
import GlobalLearningResourcesQuickstartItem from './GlobalLearningResourcesQuickstartItem';
import { getOpenQuickstartInHelpPanelStore } from '../../store/openQuickstartInHelpPanelStore';
import { TagsEnum } from '../../utils/tagsEnum';
import type { Filter } from '../../utils/filtersInterface';

const emptyTags: {
  [TagsEnum.ProductFamilies]: Filter[];
  [TagsEnum.UseCase]: Filter[];
} = {
  [TagsEnum.ProductFamilies]: [],
  [TagsEnum.UseCase]: [],
};

const quickStartCard: QuickStart = {
  apiVersion: 'console.openshift.io/v1',
  kind: 'QuickStarts',
  metadata: {
    name: 'catalog-qs-sample',
  },
  spec: {
    version: 0.1,
    displayName: 'Catalog Quick start sample',
    icon: <span aria-hidden />,
    description: 'Opens in the help panel when type is Quick start.',
    type: { text: 'Quick start', color: 'green' },
    link: { href: 'https://console.redhat.com/foo' },
  },
};

const documentationCard: QuickStart = {
  apiVersion: 'console.openshift.io/v1',
  kind: 'QuickStarts',
  metadata: {
    name: 'catalog-doc-sample',
  },
  spec: {
    version: 0.1,
    displayName: 'Catalog Documentation sample',
    icon: <span aria-hidden />,
    description: 'Opens in a new browser tab.',
    type: { text: 'Documentation' },
    link: { href: 'https://docs.redhat.com/example' },
  },
};

const ItemHarness: React.FC<{ quickStart: QuickStart }> = ({ quickStart }) => (
  <IntlProvider locale="en" defaultLocale="en">
    <div style={{ maxWidth: 420 }}>
      <GlobalLearningResourcesQuickstartItem
        quickStart={quickStart}
        purgeCache={() => {}}
        quickStartTags={emptyTags}
      />
    </div>
  </IntlProvider>
);

const meta: Meta<typeof ItemHarness> = {
  title: 'Components/Global Learning Resources/Quickstart Item',
  component: ItemHarness,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Quick start resources dispatch the shared store so the Help Panel can open a quickstart tab.
 */
export const QuickStartTitleOpensHelpPanel: Story = {
  args: { quickStart: quickStartCard },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    getOpenQuickstartInHelpPanelStore().updateState('CONSUMED_OPEN');

    const title = canvas.getByText('Catalog Quick start sample');
    await userEvent.click(title);

    await waitFor(() => {
      const { pendingOpen } = getOpenQuickstartInHelpPanelStore().getState();
      expect(pendingOpen?.quickstartId).toBe('catalog-qs-sample');
    });
  },
};

/**
 * Non–quick-start types use `window.open` with `_blank` (e.g. documentation links).
 */
export const DocumentationTitleOpensNewTab: Story = {
  args: { quickStart: documentationCard },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const openSpy = spyOn(window, 'open').mockImplementation(() => null);

    const title = canvas.getByText('Catalog Documentation sample');
    await userEvent.click(title);

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalled();
    });

    expect(openSpy.mock.calls[0][1]).toBe('_blank');
    expect(openSpy.mock.calls[0][2]).toBe('noopener,noreferrer');

    openSpy.mockRestore();
  },
};
