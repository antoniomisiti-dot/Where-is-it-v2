/**
 * Business Logic Layer - Collection Service
 * Handles collection management operations
 */

import { storageAdapter } from './dataLayer.js';
import { eventBus, EVENTS } from '../core/eventBus.js';

export class CollectionService {
  constructor() {
    this.currentCollection = 'default';
  }

  /**
   * Initialize collections
   * @returns {Promise<Array>} List of collections
   */
  async init() {
    await storageAdapter.init();
    return await this.getCollections();
  }

  /**
   * Get all collections
   * @returns {Promise<Array>} Array of collections
   */
  async getCollections() {
    return await storageAdapter.getCollections();
  }

  /**
   * Get current active collection
   * @returns {string} Current collection ID
   */
  getCurrentCollection() {
    return this.currentCollection;
  }

  /**
   * Set current active collection
   * @param {string} collectionId - Collection ID to switch to
   */
  setCurrentCollection(collectionId) {
    this.currentCollection = collectionId;
    eventBus.emit(EVENTS.COLLECTION_SWITCHED, { collectionId });
  }

  /**
   * Create a new collection
   * @param {string} name - Collection name
   * @returns {Promise<Object>} Created collection
   */
  async createCollection(name) {
    const collection = await storageAdapter.createCollection(name);
    eventBus.emit(EVENTS.COLLECTION_CREATED, collection);
    eventBus.emit(EVENTS.DATA_CHANGED, { type: 'collection_created', collection });
    return collection;
  }

  /**
   * Update a collection
   * @param {string} id - Collection ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated collection or null
   */
  async updateCollection(id, updates) {
    const collection = await storageAdapter.updateCollection(id, updates);
    if (collection) {
      eventBus.emit(EVENTS.COLLECTION_UPDATED, collection);
      eventBus.emit(EVENTS.DATA_CHANGED, { type: 'collection_updated', collection });
    }
    return collection;
  }

  /**
   * Delete a collection
   * @param {string} id - Collection ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteCollection(id) {
    if (id === 'default') {
      throw new Error('Cannot delete default collection');
    }
    
    const success = await storageAdapter.deleteCollection(id);
    if (success) {
      eventBus.emit(EVENTS.COLLECTION_DELETED, { id });
      eventBus.emit(EVENTS.DATA_CHANGED, { type: 'collection_deleted', id });
      
      // Switch to default if we deleted the current collection
      if (this.currentCollection === id) {
        this.currentCollection = 'default';
      }
    }
    return success;
  }

  /**
   * Get items count for a collection
   * @param {string} collectionId - Collection ID
   * @returns {Promise<number>} Number of items
   */
  async getItemsCount(collectionId) {
    const items = await storageAdapter.getAll(collectionId);
    return items.length;
  }

  /**
   * Export collections data
   * @param {Array|null} collections - Collections to export (null for all)
   * @returns {Promise<Object>} Export data object
   */
  async exportData(collections = null) {
    const exportData = await storageAdapter.exportData(collections);
    eventBus.emit(EVENTS.DATA_EXPORTED, exportData);
    return exportData;
  }

  /**
   * Import collections data
   * @param {Object} data - Import data object
   * @returns {Promise<Array>} List of imported collection names
   */
  async importData(data) {
    const importedCollections = await storageAdapter.importData(data);
    eventBus.emit(EVENTS.DATA_IMPORTED, { collections: importedCollections });
    return importedCollections;
  }

  /**
   * Clear all data (reset to defaults)
   * @returns {Promise<boolean>} Success status
   */
  async clearAll() {
    const success = await storageAdapter.clearAll();
    if (success) {
      this.currentCollection = 'default';
      eventBus.emit(EVENTS.DATA_CLEARED, { type: 'all_cleared' });
    }
    return success;
  }
}

// Export singleton instance
export const collectionService = new CollectionService();
export default collectionService;
