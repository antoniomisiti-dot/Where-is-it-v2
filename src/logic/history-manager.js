import { bus } from '../core/event-bus.js';
import { Config } from '../core/config.js';

export class HistoryManager {
  constructor(storageAdapter) {
    this.storage = storageAdapter;
    this.history = [];
  }

  async init() {
    this.history = await this.storage.getHistory();
    bus.emit('history:loaded', { history: this.history });
    bus.emit('history:updated', { history: this.history });
  }

  async saveLocation(position) {
    const entry = {
      id: Date.now(),
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      note: '',
      timestamp: Date.now()
    };
    this.history.unshift(entry);
    await this.storage.saveHistory(this.history);
    bus.emit('location:saved', { entry, history: this.history });
    bus.emit('history:updated', { history: this.history });
  }

  async addNoteToLast(note) {
    if (this.history.length === 0) return;
    this.history[0].note = note.trim().substring(0, Config.NOTE_MAX_LENGTH);
    await this.storage.saveHistory(this.history);
    bus.emit('history:updated', { history: this.history });
  }

  async updateNote(id, note) {
    const item = this.history.find(h => h.id === id);
    if (!item) return;
    item.note = note.trim().substring(0, Config.NOTE_MAX_LENGTH);
    await this.storage.saveHistory(this.history);
    bus.emit('history:updated', { history: this.history });
  }

  async deletePoint(id) {
    this.history = this.history.filter(h => h.id !== id);
    await this.storage.saveHistory(this.history);
    bus.emit('history:updated', { history: this.history });
  }

  async clearAll() {
    this.history = [];
    await this.storage.saveHistory(this.history);
    bus.emit('history:updated', { history: this.history });
  }

  getLatest() {
    return this.history[0] || null;
  }

  getHistory() {
    return this.history;
  }
}