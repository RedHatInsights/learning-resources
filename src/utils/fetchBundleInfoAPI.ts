import axios from 'axios';

interface BundleInfo {
  bundleLabels: string[];
  frontendName: string;
  url: string;
}

interface NavItem {
  appId: string;
  filterable: boolean;
  href: string;
  id: string;
  title: string;
}

interface Bundle {
  id: string;
  navItems: NavItem[];
  title: string;
}

export const fetchBundleInfo = async () => {
  try {
    const response = await axios.get<BundleInfo[]>(
      '/api/chrome-service/v1/static/api-specs-generated.json'
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching bundle info:', error);
    throw error;
  }
};

export const fetchBundles = async () => {
  try {
    const response = await axios.get<Bundle[]>(
      '/api/chrome-service/v1/static/bundles-generated.json'
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching bundles:', error);
    throw error;
  }
};
