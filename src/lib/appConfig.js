const DEFAULT_VARIANT = 'openfinance';

function inferVariant() {
  if (typeof window === 'undefined') return DEFAULT_VARIANT;
  const host = window.location.hostname.toLowerCase();
  if (host.includes('macy')) return 'macyfinance';
  if (host.includes('open')) return 'openfinance';
  return import.meta.env.VITE_APP_VARIANT || DEFAULT_VARIANT;
}

export const APP_VARIANT = import.meta.env.VITE_APP_VARIANT || inferVariant();
export const IS_MACYFINANCE_VARIANT = APP_VARIANT === 'macyfinance';
export const APP_NAME = IS_MACYFINANCE_VARIANT ? 'MacyFinance' : 'OpenFinance';
export const APP_TAGLINE = IS_MACYFINANCE_VARIANT
  ? 'Private, synced finance'
  : 'Private bank CSV dashboard';
export const AUTH_REQUIRED = IS_MACYFINANCE_VARIANT;
export const MACY_LOGIN_EMAIL = import.meta.env.VITE_MACY_LOGIN_EMAIL || '';

export function getAppStoragePrefix() {
  return IS_MACYFINANCE_VARIANT ? 'macyfinance' : 'openfinance';
}

export function getAppKey(key) {
  return `${getAppStoragePrefix()}:${key}`;
}

export function loadAppJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  const candidates = [getAppKey(key), key];
  for (const candidate of candidates) {
    const raw = window.localStorage.getItem(candidate);
    if (raw === null) continue;
    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch {
      return raw;
    }
  }
  return fallback;
}

export function saveAppJson(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getAppKey(key), JSON.stringify(value));
  } catch {
    // ignore storage errors and keep the app usable
  }
}

export function removeAppJson(key) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(getAppKey(key));
  window.localStorage.removeItem(key);
}

