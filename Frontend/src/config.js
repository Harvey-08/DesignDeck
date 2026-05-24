/**
 * Frontend Configuration
 * 
 * All URLs are read from environment variables (VITE_ prefix).
 * Set these in Frontend/.env
 * 
 * Required env vars:
 *   VITE_API_URL  — Backend HTTP URL  (e.g. http://localhost:5000)
 *   VITE_WS_URL   — Backend WebSocket URL (e.g. ws://localhost:5000)
 */

export const BACKEND_URL = import.meta.env.VITE_API_URL;
export const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api`;
export const WS_BASE_URL = import.meta.env.VITE_WS_URL;
