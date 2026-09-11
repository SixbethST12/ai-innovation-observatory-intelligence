/**
 * api.js — HTTP client for the Observatory FastAPI backend.
 *
 * PURPOSE:
 *   Central place for all backend calls. Components import functions
 *   from here instead of using axios directly.
 *
 * RESPONSIBILITIES:
 *   1. Configure axios with the API base URL.
 *   2. Export typed-ish helper functions per endpoint.
 *
 * USED BY:
 *   - pages/Overview.jsx
 *   - pages/Publications.jsx
 *   - pages/Trends.jsx
 *   - pages/Search.jsx
 */

import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const client = axios.create({ baseURL: BASE });

export const getStats = () => client.get("/stats").then(r => r.data);

export const getPublications = (params = {}) =>
  client.get("/publications", { params }).then(r => r.data);

export const getPublication = (id) =>
  client.get(`/publications/${id}`).then(r => r.data);

export const searchPublications = (q, params = {}) =>
  client.get("/search", { params: { q, ...params } }).then(r => r.data);

export const getTrends = () => client.get("/trends").then(r => r.data);

export const getTrendTimeline = () =>
  client.get("/trends/timeline").then(r => r.data);

export const getEmerging = (months_back = 3, top_n = 5) =>
  client.get("/trends/emerging", { params: { months_back, top_n } }).then(r => r.data);

export const getInstitutions = () =>
  client.get("/trends/institutions").then(r => r.data);
