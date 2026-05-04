import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import APIPanel, {
  convertToConsoleDocsUrl,
  getConsoleBaseUrl,
} from './APIPanel';
import {
  fetchBundleInfo,
  fetchBundles,
} from '../../../utils/fetchBundleInfoAPI';

// Mock the fetch functions
jest.mock('../../../utils/fetchBundleInfoAPI');

// Mock useChrome hook
jest.mock('@redhat-cloud-services/frontend-components/useChrome', () => ({
  useChrome: () => ({
    getBundleData: () => ({ bundleId: 'insights' }),
    getAvailableBundles: () => [{ id: 'insights', title: 'RHEL' }],
  }),
}));

const mockFetchBundleInfo = fetchBundleInfo as jest.MockedFunction<
  typeof fetchBundleInfo
>;
const mockFetchBundles = fetchBundles as jest.MockedFunction<
  typeof fetchBundles
>;

describe('APIPanel', () => {
  const mockSetNewActionTitle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', async () => {
    mockFetchBundleInfo.mockResolvedValue([]);
    mockFetchBundles.mockResolvedValue([]);

    render(
      <IntlProvider locale="en" defaultLocale="en">
        <APIPanel setNewActionTitle={mockSetNewActionTitle} />
      </IntlProvider>
    );

    // Wait for the empty state message
    await waitFor(() => {
      expect(
        screen.getByText(/No API documentation found matching your criteria/i)
      ).toBeInTheDocument();
    });
  });

  it('capitalizes API names correctly and strips API suffix', async () => {
    mockFetchBundleInfo.mockResolvedValue([
      {
        bundleLabels: ['insights'],
        frontendName: 'advisor api',
        url: 'https://developers.redhat.com/api-catalog/api/advisor',
      },
      {
        bundleLabels: ['insights'],
        frontendName: 'notifications',
        url: 'https://developers.redhat.com/api-catalog/api/notifications/v1',
      },
    ]);

    mockFetchBundles.mockResolvedValue([
      { id: 'insights', title: 'RHEL', navItems: [] },
    ]);

    render(
      <IntlProvider locale="en" defaultLocale="en">
        <APIPanel setNewActionTitle={mockSetNewActionTitle} />
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Advisor')).toBeInTheDocument();
    });

    expect(screen.getByText('Notifications v1')).toBeInTheDocument();
  });

  it('shows different versions separately', async () => {
    mockFetchBundleInfo.mockResolvedValue([
      {
        bundleLabels: ['insights'],
        frontendName: 'notifications',
        url: 'https://developers.redhat.com/api-catalog/api/notifications/v1',
      },
      {
        bundleLabels: ['insights'],
        frontendName: 'notifications',
        url: 'https://developers.redhat.com/api-catalog/api/notifications/v2.0',
      },
    ]);

    mockFetchBundles.mockResolvedValue([
      { id: 'insights', title: 'RHEL', navItems: [] },
    ]);

    render(
      <IntlProvider locale="en" defaultLocale="en">
        <APIPanel setNewActionTitle={mockSetNewActionTitle} />
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Notifications v1')).toBeInTheDocument();
    });

    expect(screen.getByText('Notifications v2.0')).toBeInTheDocument();
    expect(screen.getByText(/API Documentation \(2\)/i)).toBeInTheDocument();
  });

  it('handles APIs without version numbers', async () => {
    mockFetchBundleInfo.mockResolvedValue([
      {
        bundleLabels: ['insights'],
        frontendName: 'advisor api',
        url: 'https://developers.redhat.com/api-catalog/api/advisor',
      },
    ]);

    mockFetchBundles.mockResolvedValue([
      { id: 'insights', title: 'RHEL', navItems: [] },
    ]);

    render(
      <IntlProvider locale="en" defaultLocale="en">
        <APIPanel setNewActionTitle={mockSetNewActionTitle} />
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Advisor')).toBeInTheDocument();
    });

    // Should not have a version suffix
    expect(screen.queryByText(/Advisor v/)).not.toBeInTheDocument();
  });

  it('handles acronyms correctly', async () => {
    mockFetchBundleInfo.mockResolvedValue([
      {
        bundleLabels: ['iam'],
        frontendName: 'rbac',
        url: 'https://developers.redhat.com/api-catalog/api/rbac/v1',
      },
    ]);

    mockFetchBundles.mockResolvedValue([
      { id: 'iam', title: 'Identity & Access Management', navItems: [] },
    ]);

    render(
      <IntlProvider locale="en" defaultLocale="en">
        <APIPanel setNewActionTitle={mockSetNewActionTitle} />
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('RBAC v1')).toBeInTheDocument();
    });
  });

  it('strips various API suffix formats', async () => {
    mockFetchBundleInfo.mockResolvedValue([
      {
        bundleLabels: ['insights'],
        frontendName: 'notifications api',
        url: 'https://developers.redhat.com/api-catalog/api/notifications/v1',
      },
      {
        bundleLabels: ['insights'],
        frontendName: 'sources APIs',
        url: 'https://developers.redhat.com/api-catalog/api/sources/v2',
      },
      {
        bundleLabels: ['insights'],
        frontendName: 'advisor API  ',
        url: 'https://developers.redhat.com/api-catalog/api/advisor/v3',
      },
    ]);

    mockFetchBundles.mockResolvedValue([
      { id: 'insights', title: 'RHEL', navItems: [] },
    ]);

    render(
      <IntlProvider locale="en" defaultLocale="en">
        <APIPanel setNewActionTitle={mockSetNewActionTitle} />
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Notifications v1')).toBeInTheDocument();
    });

    // Verify "APIs" (plural) is also stripped
    expect(screen.getByText('Sources v2')).toBeInTheDocument();

    // Verify trailing whitespace is handled
    expect(screen.getByText('Advisor v3')).toBeInTheDocument();
  });

  it('handles hyphenated and underscored names correctly', async () => {
    mockFetchBundleInfo.mockResolvedValue([
      {
        bundleLabels: ['insights'],
        frontendName: 'virtual-assistant api',
        url: 'https://developers.redhat.com/api-catalog/api/virtual-assistant/v1',
      },
      {
        bundleLabels: ['insights'],
        frontendName: 'user_access api',
        url: 'https://developers.redhat.com/api-catalog/api/user-access/v2',
      },
      {
        bundleLabels: ['insights'],
        frontendName: 'cost-management',
        url: 'https://developers.redhat.com/api-catalog/api/cost-management',
      },
    ]);

    mockFetchBundles.mockResolvedValue([
      { id: 'insights', title: 'RHEL', navItems: [] },
    ]);

    render(
      <IntlProvider locale="en" defaultLocale="en">
        <APIPanel setNewActionTitle={mockSetNewActionTitle} />
      </IntlProvider>
    );

    await waitFor(() => {
      // Hyphenated words should be capitalized with hyphens preserved
      expect(screen.getByText('Virtual-Assistant v1')).toBeInTheDocument();
    });

    // Underscored words should be capitalized with underscores preserved
    expect(screen.getByText('User_Access v2')).toBeInTheDocument();

    // No version in URL
    expect(screen.getByText('Cost-Management')).toBeInTheDocument();
  });
});

describe('getConsoleBaseUrl', () => {
  it('returns production URL for prod environment', () => {
    expect(getConsoleBaseUrl('prod')).toBe('https://console.redhat.com');
  });

  it('returns stage URL for stage environment', () => {
    expect(getConsoleBaseUrl('stage')).toBe('https://console.stage.redhat.com');
  });

  it('returns stage URL for frhStage environment', () => {
    expect(getConsoleBaseUrl('frhStage')).toBe(
      'https://console.stage.redhat.com'
    );
  });

  it('returns production URL for qa environment (default)', () => {
    expect(getConsoleBaseUrl('qa')).toBe('https://console.redhat.com');
  });

  it('returns production URL for ci environment (default)', () => {
    expect(getConsoleBaseUrl('ci')).toBe('https://console.redhat.com');
  });
});

describe('convertToConsoleDocsUrl', () => {
  it('converts API name and version to console docs URL (production)', () => {
    const result = convertToConsoleDocsUrl(
      'notifications',
      'https://developers.redhat.com/api-catalog/api/notifications/v2.0',
      'prod'
    );

    expect(result).toBe('https://console.redhat.com/docs/api/notifications/v2');
  });

  it('converts API name and version to console docs URL (stage)', () => {
    const result = convertToConsoleDocsUrl(
      'notifications',
      'https://developers.redhat.com/api-catalog/api/notifications/v2.0',
      'stage'
    );

    expect(result).toBe(
      'https://console.stage.redhat.com/docs/api/notifications/v2'
    );
  });

  it('strips API suffix from name', () => {
    const result = convertToConsoleDocsUrl(
      'notifications api',
      'https://developers.redhat.com/api-catalog/api/notifications/v1',
      'prod'
    );

    expect(result).toBe('https://console.redhat.com/docs/api/notifications/v1');
  });

  it('handles APIs without version numbers', () => {
    const result = convertToConsoleDocsUrl(
      'advisor api',
      'https://developers.redhat.com/api-catalog/api/advisor',
      'prod'
    );

    expect(result).toBe('https://console.redhat.com/docs/api/advisor');
  });

  it('extracts only major version from v1.0', () => {
    const result = convertToConsoleDocsUrl(
      'notifications',
      'https://developers.redhat.com/api-catalog/api/notifications/v1.0',
      'prod'
    );

    expect(result).toBe('https://console.redhat.com/docs/api/notifications/v1');
  });

  it('extracts major version from v3.1.0', () => {
    const result = convertToConsoleDocsUrl(
      'sources',
      'https://developers.redhat.com/api-catalog/api/sources/v3.1.0',
      'prod'
    );

    expect(result).toBe('https://console.redhat.com/docs/api/sources/v3');
  });

  it('lowercases API name', () => {
    const result = convertToConsoleDocsUrl(
      'RBAC',
      'https://developers.redhat.com/api-catalog/api/rbac/v1',
      'prod'
    );

    expect(result).toBe('https://console.redhat.com/docs/api/rbac/v1');
  });

  it('handles frhStage environment correctly', () => {
    const result = convertToConsoleDocsUrl(
      'notifications',
      'https://developers.redhat.com/api-catalog/api/notifications/v2.0',
      'frhStage'
    );

    expect(result).toBe(
      'https://console.stage.redhat.com/docs/api/notifications/v2'
    );
  });
});
