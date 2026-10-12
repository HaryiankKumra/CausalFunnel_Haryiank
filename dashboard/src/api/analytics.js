/**
 * API client module for user analytics backend.
 * Uses environment variable VITE_API_URL if provided, else defaults to http://localhost:5000.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      const errorMsg = errorBody.error || `HTTP error! Status: ${res.status}`;
      throw new Error(errorMsg);
    }

    return await res.json();
  } catch (err) {
    console.error(`API request failed for ${endpoint}:`, err);
    throw err;
  }
}

/** Check API health */
export async function getHealth() {
  return request('/api/health');
}

/** Get dashboard high-level metrics & recent events */
export async function getOverview() {
  return request('/api/overview');
}

/** Get all aggregated sessions */
export async function getSessions() {
  return request('/api/sessions');
}

/** Get chronological events for a specific session */
export async function getSessionEvents(sessionId) {
  return request(`/api/sessions/${encodeURIComponent(sessionId)}/events`);
}

/** Get distinct tracked page URLs */
export async function getTrackedPages() {
  return request('/api/pages');
}

/** Get click heatmap coordinates for a specific page */
export async function getHeatmap(pageUrl) {
  return request(`/api/heatmap?page_url=${encodeURIComponent(pageUrl)}`);
}
