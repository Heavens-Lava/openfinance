// All data stays in this browser. Files are stored as raw CSV text in
// localStorage under one key; nothing is ever sent to a server.

const KEY = 'of_files_v1';

export function loadStoredFiles() {
  try {
    const files = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(files) ? files : [];
  } catch {
    return [];
  }
}

export function saveStoredFiles(files) {
  try {
    // Local-manifest files live on disk, not in the browser.
    localStorage.setItem(KEY, JSON.stringify(files.filter((f) => !f.local)));
    return null;
  } catch (err) {
    return err.name === 'QuotaExceededError'
      ? 'Browser storage is full — remove an imported file or use smaller exports.'
      : `Could not save: ${err.message}`;
  }
}

export function clearStoredFiles() {
  localStorage.removeItem(KEY);
}

const OVERRIDES_KEY = 'of_cat_overrides_v1';

export function loadCategoryOverrides() {
  try {
    const map = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}');
    return map && typeof map === 'object' ? map : {};
  } catch {
    return {};
  }
}

export function saveCategoryOverrides(map) {
  try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(map)); } catch { /* full — overrides just won't persist */ }
}

const RULES_KEY = 'of_rules_v1';

export function loadRules() {
  try {
    const rules = JSON.parse(localStorage.getItem(RULES_KEY) || '[]');
    return Array.isArray(rules) ? rules.filter((r) => r && r.keyword && r.category) : [];
  } catch {
    return [];
  }
}

export function saveRules(rules) {
  try { localStorage.setItem(RULES_KEY, JSON.stringify(rules)); } catch { /* full — rules just won't persist */ }
}
