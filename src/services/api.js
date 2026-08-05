const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const getApiBaseUrl = () =>
  window.localStorage.getItem('panelforge.apiBaseUrl') || DEFAULT_API_BASE_URL;

export const setApiBaseUrl = (url) => {
  window.localStorage.setItem('panelforge.apiBaseUrl', url.replace(/\/$/, ''));
};

export const getAssetUrl = (url) => {
  if (!url || url.startsWith('http')) return url || '';
  const origin = getApiBaseUrl().replace(/\/api$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

const request = async (path, options = {}) => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, options);
  if (response.ok) return response.status === 204 ? null : response.json();

  let message = `Request failed (${response.status})`;
  try {
    const body = await response.json();
    message = body.detail || body.message || message;
  } catch {
    // The server did not provide a JSON error body.
  }
  throw new ApiError(message, response.status);
};

export const fetchHistoryApi = () => request('/comics').then((data) => data.comics || []);
export const fetchComicByIdApi = (id) => request(`/comics/${encodeURIComponent(id)}`);

export const generateStoryApi = (prompt, mode, sceneCount = 0) =>
  request('/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: prompt, mode, num_scenes: sceneCount }),
  });

export const deleteStoryApi = (id) =>
  request(`/comics/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const pauseStoryApi = (id) =>
  request(`/comics/${encodeURIComponent(id)}/pause`, { method: 'POST' });
export const resumeStoryApi = (id) =>
  request(`/comics/${encodeURIComponent(id)}/resume`, { method: 'POST' });
export const regenerateThumbnailApi = (id) =>
  request(`/comics/${encodeURIComponent(id)}/thumbnail`, { method: 'POST' });
