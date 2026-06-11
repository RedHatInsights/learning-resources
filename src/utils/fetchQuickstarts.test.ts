import axios from 'axios';
import fetchQuickstarts from './fetchQuickstarts';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockGetUser = () =>
  Promise.resolve({
    identity: { internal: { account_id: '123' } },
  });

describe('fetchQuickstarts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockImplementation((url) => {
      const path = url as string;
      if (path.includes('/favorites')) {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({
        data: { data: [] },
      });
    });
  });

  it('sends fuzzy=true when display-name is set and fuzzy option is true', async () => {
    await fetchQuickstarts(mockGetUser as never, {
      'display-name': 'ansible',
      fuzzy: true,
    });

    const quickstartsCall = mockedAxios.get.mock.calls.find((c) => {
      const url = c[0] as string;
      return (
        url.includes('/quickstarts') &&
        !url.includes('/filters') &&
        !url.includes('/favorites')
      );
    });
    expect(quickstartsCall).toBeDefined();
    const params = (
      quickstartsCall as [string, { params: Record<string, unknown> }]
    )[1]?.params;
    expect(params?.['display-name']).toBe('ansible');
    expect(params?.fuzzy).toBe(true);
  });

  it('does not send fuzzy when display-name is empty', async () => {
    await fetchQuickstarts(mockGetUser as never, {
      'display-name': '',
      fuzzy: true,
    });

    const quickstartsCall = mockedAxios.get.mock.calls.find((c) => {
      const url = c[0] as string;
      return (
        url.includes('/quickstarts') &&
        !url.includes('/filters') &&
        !url.includes('/favorites')
      );
    });
    const params = (
      quickstartsCall as [string, { params: Record<string, unknown> }]
    )[1]?.params;
    expect(params?.fuzzy).toBeUndefined();
  });

  it('does not send fuzzy when fuzzy option is false', async () => {
    await fetchQuickstarts(mockGetUser as never, {
      'display-name': 'ansible',
      fuzzy: false,
    });

    const quickstartsCall = mockedAxios.get.mock.calls.find((c) => {
      const url = c[0] as string;
      return (
        url.includes('/quickstarts') &&
        !url.includes('/filters') &&
        !url.includes('/favorites')
      );
    });
    const params = (
      quickstartsCall as [string, { params: Record<string, unknown> }]
    )[1]?.params;
    expect(params?.['display-name']).toBe('ansible');
    expect(params?.fuzzy).toBeUndefined();
  });
});
