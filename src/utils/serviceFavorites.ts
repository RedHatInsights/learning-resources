import axios from 'axios';

const CHROME_SERVICE_API = '/api/chrome-service/v1';
const USER_IDENTITY_URL = `${CHROME_SERVICE_API}/user`;
const FAVORITE_PAGES_URL = `${CHROME_SERVICE_API}/favorite-pages`;

export interface FavoritePage {
  pathname: string;
  favorite: boolean;
}

function extractPages(responseData: unknown): FavoritePage[] {
  if (Array.isArray(responseData)) return responseData;
  if (
    responseData &&
    typeof responseData === 'object' &&
    'data' in responseData &&
    Array.isArray((responseData as { data: unknown }).data)
  ) {
    return (responseData as { data: FavoritePage[] }).data;
  }
  return [];
}

export async function fetchFavoritePages(): Promise<FavoritePage[]> {
  const response = await axios.get(USER_IDENTITY_URL);
  const body = response.data?.data ?? response.data;
  if (body && Array.isArray(body.favoritePages)) {
    return body.favoritePages;
  }
  return [];
}

export async function toggleFavoritePage(
  pathname: string,
  favorite: boolean
): Promise<FavoritePage[]> {
  const response = await axios.post(
    FAVORITE_PAGES_URL,
    { pathname, favorite },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return extractPages(response.data);
}
