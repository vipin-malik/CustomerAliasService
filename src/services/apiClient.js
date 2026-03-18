import appConfig from '../config/appConfig';

const BASE_URL = appConfig.api.baseUrl;

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

  if (response.status === 204) return null;
  return response.json();
}

// Resolve a single alias — returns the response even if unresolved (isResolved=false)
export async function resolveAlias(aliasName, assetClass) {
  const url = `${BASE_URL}/resolve`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aliasName, assetClass }),
  });
  // Always parse JSON — the API returns a ResolveResponse even for unresolved
  return response.json();
}

// Bulk resolve
export async function resolveAliasesBulk(aliases) {
  const url = `${BASE_URL}/resolve-bulk`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aliases }),
  });
  return response.json();
}

// Get all investor mappings (paginated)
export async function getInvestorMappings({ page = 1, pageSize = 25, search } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  if (search) params.append('search', search);
  const response = await fetch(`/api/v1/investor-mappings?${params}`);
  return response.json();
}

// Get grouped investors (paginated)
export async function getGroupedInvestors({ page = 1, pageSize = 25, search, assetClass } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  if (search) params.append('search', search);
  if (assetClass) params.append('assetClass', assetClass);
  const response = await fetch(`/api/v1/grouped-investors?${params}`);
  return response.json();
}

// ─── Legacy endpoints (kept for Mappings page) ─────────────────
export async function getMappings({ page = 1, pageSize = 20, search, assetClass } = {}) {
  return getInvestorMappings({ page, pageSize, search });
}

export async function createMapping(data) {
  return request('/mappings', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateMapping(id, data) {
  return request(`/mappings/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteMapping(id) {
  return request(`/mappings/${id}`, { method: 'DELETE' });
}

export async function addAliasToMapping(id, alias) {
  return request(`/mappings/${id}/aliases`, { method: 'POST', body: JSON.stringify({ alias }) });
}

export async function removeAliasFromMapping(id, alias) {
  const encodedAlias = encodeURIComponent(alias);
  return request(`/mappings/${id}/aliases/${encodedAlias}`, { method: 'DELETE' });
}
