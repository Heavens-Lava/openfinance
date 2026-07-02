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
