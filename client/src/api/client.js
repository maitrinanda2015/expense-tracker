const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

let authToken = null;
let unauthorizedHandler = null;

export const setAuthToken = (token) => {
  authToken = token;
};

/** Called with the error code when an authenticated request gets a 401. */
export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

export class ApiError extends Error {
  constructor(message, status, code, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** { field: message } for showing server validation errors next to inputs. */
  get fieldErrors() {
    return Object.fromEntries((this.details || []).map((d) => [d.field, d.message]));
  }
}

/** Builds "?a=1&b=2", skipping empty values. */
export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export async function request(path, { method = 'GET', body, query, signal, raw = false } = {}) {
  const headers = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let payload;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}${buildQuery(query)}`, { method, headers, body: payload, signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, 'NETWORK_ERROR');
  }

  if (!res.ok) {
    let error = {};
    try {
      error = (await res.json()).error || {};
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 401 && authToken && unauthorizedHandler) unauthorizedHandler(error.code);
    throw new ApiError(error.message || `Request failed (${res.status})`, res.status, error.code, error.details);
  }

  if (raw) return res;
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path, query, options) => request(path, { query, ...options }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

/** Download an authenticated file (CSV export, attachment) via a blob URL. */
export async function downloadFile(path, query, fallbackName = 'download') {
  const res = await request(path, { query, raw: true });
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = match ? match[1] : fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
