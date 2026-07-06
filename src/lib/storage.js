// All data stays in this browser. Imported CSV text lives in IndexedDB
// (no practical size cap, unlike localStorage's ~5MB); nothing is ever
// sent to a server. v1 stored files in localStorage — migrated on load.

const LEGACY_KEY = 'of_files_v1';
const DB_NAME = 'openfinance';
const STORE = 'files';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function loadLegacyFiles() {
  try {
    const files = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
    return Array.isArray(files) ? files : [];
  } catch {
    return [];
  }
}

export async function loadStoredFiles() {
  try {
    const db = await openDb();
    const files = await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get('files');
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => reject(req.error);
    });
    if (files.length) return files;
    const legacy = loadLegacyFiles();
    if (legacy.length) {
      await saveStoredFiles(legacy);
      localStorage.removeItem(LEGACY_KEY);
    }
    return legacy;
  } catch {
    return loadLegacyFiles(); // e.g. IndexedDB disabled in private browsing
  }
}

export async function saveStoredFiles(files) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      // Local-manifest files live on disk, not in the browser.
      tx.objectStore(STORE).put(files.filter((f) => !f.local), 'files');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    return null;
  } catch (err) {
    return `Could not save imports: ${err.message}`;
  }
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
