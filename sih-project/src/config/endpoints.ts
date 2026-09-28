const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const browserProtocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const browserHostname =
  typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';

const defaultHttpBaseUrl = `${browserProtocol === 'https:' ? 'https:' : 'http:'}//${browserHostname}:8000`;
const defaultWebSocketBaseUrl = `${browserProtocol === 'https:' ? 'wss:' : 'ws:'}//${browserHostname}:8000`;

/**
 * Set VITE_API_BASE_URL and VITE_WS_BASE_URL when the frontend and backend do
 * not share the local hostname and port. Local development keeps the existing
 * localhost:8000 behavior by default.
 */
export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || defaultHttpBaseUrl,
);

export const WS_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_WS_BASE_URL || defaultWebSocketBaseUrl,
);
