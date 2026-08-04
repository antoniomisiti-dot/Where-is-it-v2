import { bus } from './event-bus.js';
import { Config } from './config.js';
import { StorageAdapter } from '../data/storage-adapter.js';
import { LocalStorageProvider } from '../data/localstorage-provider.js';
import { HistoryManager } from '../logic/history-manager.js';
import { CollectionManager } from '../logic/collection-manager.js';
import { Renderer } from '../ui/renderer.js';
import { Sheets } from '../ui/sheets.js';
import { openMap, sharePoint } from '../utils/geo.js';

// --- Instantiate layers ---
const provider = new LocalStorageProvider();
const storage = new StorageAdapter(provider);
const historyManager = new HistoryManager(storage);
const collectionManager = new CollectionManager();
const renderer = new Renderer();
const sheets = new Sheets();

// --- Event Wiring ---

// User wants to save a location
bus.on('user:save-location', () => {
  renderer.setSaveLoading(true);
  if (!('geolocation' in navigator)) {
    alert('Geolocation is not supported by this browser.');
    renderer.setSaveLoading(false);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      historyManager.saveLocation(pos);
      renderer.setSaveLoading(false);
    },
    (err) => {
      let msg = 'Error retrieving location.';
      if (err.code === err.PERMISSION_DENIED) msg = 'Geolocation permission denied.';
      else if (err.code === err.POSITION_UNAVAILABLE) msg = 'Location unavailable.';
      else if (err.code === err.TIMEOUT) msg = 'Request timed out.';
      alert(msg);
      renderer.setSaveLoading(false);
    },
    Config.GEO_OPTIONS
  );
});

// Note flow
bus.on('user:save-note', ({ note }) => {
  historyManager.addNoteToLast(note);
  bus.emit('note:saved');
});

bus.on('user:skip-note', () => {
  bus.emit('note:skipped');
});

// Quick actions
bus.on('user:open-last-map', () => {
  const latest = historyManager.getLatest();
  if (latest) openMap(latest.lat, latest.lng);
});

bus.on('user:share-last', () => {
  const latest = historyManager.getLatest();
  if (latest) sharePoint(latest.lat, latest.lng, latest.note);
});

// Sheets
bus.on('user:open-history', () => sheets.openHistory());
bus.on('user:open-privacy', () => sheets.openPrivacy());

// History item actions
bus.on('user:delete-point', ({ id }) => historyManager.deletePoint(id));
bus.on('user:clear-all', () => historyManager.clearAll());
bus.on('user:edit-note', ({ id, note }) => historyManager.updateNote(id, note));
bus.on('user:share-point', ({ id }) => {
  const item = historyManager.getHistory().find(h => h.id === id);
  if (item) sharePoint(item.lat, item.lng, item.note);
});
bus.on('user:open-point-map', ({ id }) => {
  const item = historyManager.getHistory().find(h => h.id === id);
  if (item) openMap(item.lat, item.lng);
});

// --- Bootstrap ---
document.addEventListener('DOMContentLoaded', async () => {
  await historyManager.init();

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('SW registered'))
      .catch(err => console.error('SW error:', err));
  }
});