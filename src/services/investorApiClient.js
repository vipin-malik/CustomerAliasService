import appConfig from '../config/appConfig';

const BASE_URL = appConfig.investorApi.baseUrl;

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// Fetch investor names from Postgres (paginated)
export async function getInvestors({ page = 1, pageSize = 25, search } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.append('search', search);
  return request(`?${params}`);
}

// Fetch all investor names (for bulk resolution)
export async function getAllInvestorNames({ search } = {}) {
  const params = new URLSearchParams({ pageSize: '10000' });
  if (search) params.append('search', search);
  return request(`?${params}`);
}
