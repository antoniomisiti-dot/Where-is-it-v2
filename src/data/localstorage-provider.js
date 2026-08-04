import { Config } from '../core/config.js';

export class LocalStorageProvider {
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(Config.STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  saveAll(data) {
    localStorage.setItem(Config.STORAGE_KEY, JSON.stringify(data));
  }
}