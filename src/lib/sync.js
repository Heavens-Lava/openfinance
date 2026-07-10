// Browser-side client for the raft-sync companion process (see
// ../../raft-sync/src/appServer.js in the sibling repo). Connects as a
// plain WebSocket client — the browser can't run a WS server or do mDNS
// itself, so a local Node process does that; this module only talks to
// whatever that process exposes on --app-port.
//
// Deliberately optional: if the companion process isn't running (most
// users won't have it — this is milestone 4 of a separate depth project,
// not a required part of openfinance), everything falls back to
// localStorage exactly as before. Sync is additive, not a hard
// dependency — openfinance must keep working standalone.
//
// Currently syncs exactly two keyspaces, matching what App.jsx persists
// to localStorage today:
//   - category overrides: key = `catOverride:${transactionId}`
//   - categorization rules: key = `rule:${keyword}`
// Imported transactions/files are NOT synced (see raft-sync's
// docs/DESIGN.md milestone 4 notes for why: they're large, derived from
// CSVs, not directly user-edited — a bad fit for a small command log).

const DEFAULT_PORT = 7001;
const RECONNECT_DELAY_MS = 2000;

function makeClient(port) {
  let ws = null;
  let connected = false;
  const listeners = new Set(); // (entries: [{key, value}]) => void
  let latestEntries = [];
  let reconnectTimer = null;

  function notify() {
    for (const fn of listeners) fn(latestEntries);
  }

  function connect() {
    try {
      ws = new WebSocket(`ws://localhost:${port}`);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      connected = true;
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === 'state') {
        latestEntries = msg.entries;
        notify();
      }
    };

    ws.onclose = () => {
      connected = false;
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose fires right after for connection failures; cleanup happens there.
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_DELAY_MS);
  }

  connect();

  return {
    isConnected: () => connected,
    write(key, value) {
      if (!connected || !ws || ws.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify({ type: 'write', command: { key, value } }));
      return true;
    },
    subscribe(fn) {
      listeners.add(fn);
      fn(latestEntries); // replay current state immediately
      return () => listeners.delete(fn);
    },
    getEntries: () => latestEntries,
  };
}

let sharedClient = null;

// Call once; safe to call multiple times (returns the same client).
// port defaults to 7001, matching `node bin/device.js --app-port 7001`
// in raft-sync's manual demo — override if you run the companion process
// on a different port.
export function getSyncClient(port = DEFAULT_PORT) {
  if (typeof WebSocket === 'undefined') return null; // non-browser environment (SSR/tests)
  if (!sharedClient) sharedClient = makeClient(port);
  return sharedClient;
}

// ---- localStorage-backed key/value store with optional sync ----------
//
// Drop-in replacement for the loadJson(key, fallback) + localStorage.setItem
// pattern App.jsx already uses for catOverrides/rules, except every write
// also goes through the sync client (if connected) so it propagates to
// other devices. Reads are always served from localStorage / in-memory
// state for instant, offline-first UI — synced updates from other devices
// arrive asynchronously via the subscribe callback and get written back
// to localStorage same as a local edit would.

export function createSyncedStore(namespace, { port = DEFAULT_PORT } = {}) {
  const client = getSyncClient(port);
  const localStorageKeyFor = (entryKey) => `${namespace}:${entryKey}`;

  function readAllLocal() {
    const result = {};
    for (let i = 0; i < localStorage.length; i++) {
      const lsKey = localStorage.key(i);
      const prefix = `${namespace}:`;
      if (lsKey && lsKey.startsWith(prefix)) {
        try {
          result[lsKey.slice(prefix.length)] = JSON.parse(localStorage.getItem(lsKey));
        } catch {
          /* skip malformed entry */
        }
      }
    }
    return result;
  }

  function set(entryKey, value) {
    localStorage.setItem(localStorageKeyFor(entryKey), JSON.stringify(value));
    client?.write(`${namespace}:${entryKey}`, value);
  }

  function subscribeToRemoteUpdates(onChange) {
    if (!client) return () => {};
    return client.subscribe((entries) => {
      const prefix = `${namespace}:`;
      let changed = false;
      for (const entry of entries) {
        if (!entry.key.startsWith(prefix)) continue;
        const entryKey = entry.key.slice(prefix.length);
        const lsKey = localStorageKeyFor(entryKey);
        const current = localStorage.getItem(lsKey);
        const incoming = JSON.stringify(entry.value);
        if (current !== incoming) {
          localStorage.setItem(lsKey, incoming);
          changed = true;
        }
      }
      if (changed) onChange(readAllLocal());
    });
  }

  return { get: readAllLocal, set, subscribeToRemoteUpdates, isConnected: () => client?.isConnected() ?? false };
}
