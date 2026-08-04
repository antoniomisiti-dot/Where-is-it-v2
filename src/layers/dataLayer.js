/**
 * Data Layer - Storage Adapter Pattern
 * Abstracts the storage mechanism (localStorage, IndexedDB, remote API)
 */

import { generateId } from '../utils/stringUtils.js';

/**
 * Base Storage Adapter Interface
 * All storage adapters must implement these methods
 */
export class StorageAdapter {
  constructor() {
    if (this.constructor === StorageAdapter) {
      throw new Error('StorageAdapter is an abstract class');
    }
  }

  async init() {
    throw new Error('Method "init()" must be implemented');
  }

  async getAll(collection = 'default') {
    throw new Error('Method "getAll()" must be implemented');
  }

  async getById(id, collection = 'default') {
    throw new Error('Method "getById()" must be implemented');
  }

  async add(item, collection = 'default') {
    throw new Error('Method "add()" must be implemented');
  }

  async update(id, item, collection = 'default') {
    throw new Error('Method "update()" must be implemented');
  }

  async delete(id, collection = 'default') {
    throw new Error('Method "delete()" must be implemented');
  }

  async clear(collection = 'default') {
    throw new Error('Method "clear()" must be implemented');
  }

  async exportData(collections = null) {
    throw new Error('Method "exportData()" must be implemented');
  }

  async importData(data) {
    throw new Error('Method "importData()" must be implemented');
  }
}

/**
 * LocalStorage Adapter - Current implementation
 * Maintains backward compatibility with existing data
 */
export class LocalStorageAdapter extends StorageAdapter {
  constructor(prefix = 'whereisit_') {
    super();
    this.prefix = prefix;
    this.STORAGE_KEY = `${prefix}history_v5`;
    this.COLLECTIONS_KEY = `${prefix}collections_v1`;
  }

  async init() {
    // Ensure collections structure exists
    if (!localStorage.getItem(this.COLLECTIONS_KEY)) {
      const defaultCollection = {
        id: 'default',
        name: 'Default',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      localStorage.setItem(this.COLLECTIONS_KEY, JSON.stringify([defaultCollection]));
    }
    return Promise.resolve();
  }

  _getKey(collection) {
    return collection === 'default' 
      ? this.STORAGE_KEY 
      : `${this.prefix}collection_${collection}`;
  }

  _getCollectionKey(collectionId) {
    return `${this.prefix}collection_${collectionId}`;
  }

  async getAll(collection = 'default') {
    try {
      const key = this._getKey(collection);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  async getById(id, collection = 'default') {
    const items = await this.getAll(collection);
    return items.find(item => item.id === id) || null;
  }

  async add(item, collection = 'default') {
    try {
      const items = await this.getAll(collection);
      const newItem = {
        ...item,
        id: item.id || generateId(),
        createdAt: item.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      items.unshift(newItem);
      localStorage.setItem(this._getKey(collection), JSON.stringify(items));
      return newItem;
    } catch (error) {
      console.error('Error adding to localStorage:', error);
      throw error;
    }
  }

  async update(id, item, collection = 'default') {
    try {
      const items = await this.getAll(collection);
      const index = items.findIndex(i => i.id === id);
      if (index === -1) return null;
      
      items[index] = {
        ...items[index],
        ...item,
        updatedAt: Date.now()
      };
      localStorage.setItem(this._getKey(collection), JSON.stringify(items));
      return items[index];
    } catch (error) {
      console.error('Error updating localStorage:', error);
      throw error;
    }
  }

  async delete(id, collection = 'default') {
    try {
      const items = await this.getAll(collection);
      const filtered = items.filter(i => i.id !== id);
      localStorage.setItem(this._getKey(collection), JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting from localStorage:', error);
      throw error;
    }
  }

  async clear(collection = 'default') {
    try {
      if (collection === 'default') {
        localStorage.removeItem(this.STORAGE_KEY);
      } else {
        localStorage.removeItem(this._getCollectionKey(collection));
      }
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      throw error;
    }
  }

  // Collection management
  async getCollections() {
    try {
      const data = localStorage.getItem(this.COLLECTIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading collections:', error);
      return [];
    }
  }

  async createCollection(name) {
    try {
      const collections = await this.getCollections();
      const newCollection = {
        id: generateId(),
        name: name.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      collections.push(newCollection);
      localStorage.setItem(this.COLLECTIONS_KEY, JSON.stringify(collections));
      
      // Initialize empty array for this collection
      localStorage.setItem(this._getCollectionKey(newCollection.id), JSON.stringify([]));
      
      return newCollection;
    } catch (error) {
      console.error('Error creating collection:', error);
      throw error;
    }
  }

  async updateCollection(id, updates) {
    try {
      const collections = await this.getCollections();
      const index = collections.findIndex(c => c.id === id);
      if (index === -1) return null;
      
      collections[index] = {
        ...collections[index],
        ...updates,
        updatedAt: Date.now()
      };
      localStorage.setItem(this.COLLECTIONS_KEY, JSON.stringify(collections));
      return collections[index];
    } catch (error) {
      console.error('Error updating collection:', error);
      throw error;
    }
  }

  async deleteCollection(id) {
    try {
      if (id === 'default') {
        throw new Error('Cannot delete default collection');
      }
      
      const collections = await this.getCollections();
      const filtered = collections.filter(c => c.id !== id);
      localStorage.setItem(this.COLLECTIONS_KEY, JSON.stringify(filtered));
      
      // Delete the collection data
      localStorage.removeItem(this._getCollectionKey(id));
      
      return true;
    } catch (error) {
      console.error('Error deleting collection:', error);
      throw error;
    }
  }

  async exportData(collections = null) {
    try {
      const exportObj = {
        version: 1,
        exportedAt: Date.now(),
        collections: []
      };

      let colsToExport = collections;
      if (!colsToExport) {
        colsToExport = await this.getCollections();
      }

      for (const col of colsToExport) {
        const items = await this.getAll(col.id);
        exportObj.collections.push({
          ...col,
          items: items
        });
      }

      return exportObj;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  async importData(data) {
    try {
      if (!data || !data.collections || !Array.isArray(data.collections)) {
        throw new Error('Invalid import data format');
      }

      const importedCollections = [];
      
      for (const colData of data.collections) {
        // Create or get collection
        let collection = await this._findCollectionByName(colData.name);
        
        if (!collection) {
          collection = await this.createCollection(colData.name);
        }
        
        // Import items
        if (colData.items && Array.isArray(colData.items)) {
          const existingItems = await this.getAll(collection.id);
          const existingIds = new Set(existingItems.map(i => i.id));
          
          for (const item of colData.items) {
            if (!existingIds.has(item.id)) {
              await this.add(item, collection.id);
            }
          }
        }
        
        importedCollections.push(collection.name);
      }

      return importedCollections;
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  async _findCollectionByName(name) {
    const collections = await this.getCollections();
    return collections.find(c => c.name === name) || null;
  }

  async clearAll() {
    try {
      const collections = await this.getCollections();
      
      // Clear all collection data
      for (const col of collections) {
        localStorage.removeItem(this._getCollectionKey(col.id));
      }
      
      // Clear collections index
      localStorage.removeItem(this.COLLECTIONS_KEY);
      
      // Reinitialize with default collection
      await this.init();
      
      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storageAdapter = new LocalStorageAdapter();
export default storageAdapter;
