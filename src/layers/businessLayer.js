/**
 * Business Logic Layer - Location Service
 * Handles all location-related operations
 */

import { storageAdapter } from './dataLayer.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { sanitizeNote } from '../utils/stringUtils.js';

export class LocationService {
  constructor() {
    this.currentCollection = 'default';
  }

  /**
   * Set the active collection for operations
   * @param {string} collectionId - Collection ID to switch to
   */
  setCollection(collectionId) {
    this.currentCollection = collectionId;
    eventBus.emit(EVENTS.COLLECTION_SWITCHED, { collectionId });
  }

  /**
   * Get current active collection
   * @returns {string} Current collection ID
   */
  getCurrentCollection() {
    return this.currentCollection;
  }

  /**
   * Save a new location
   * @param {Object} locationData - { latitude, longitude, note? }
   * @returns {Promise<Object>} Saved location item
   */
  async saveLocation(locationData) {
    try {
      eventBus.emit(EVENTS.LOCATION_SAVING, locationData);
      
      const sanitizedNote = sanitizeNote(locationData.note);
      const item = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        note: sanitizedNote || '',
        accuracy: locationData.accuracy || null
      };

      const savedItem = await storageAdapter.add(item, this.currentCollection);
      
      eventBus.emit(EVENTS.LOCATION_SAVED, savedItem);
      eventBus.emit(EVENTS.DATA_CHANGED, { type: 'location_added', item: savedItem });
      
      return savedItem;
    } catch (error) {
      eventBus.emit(EVENTS.LOCATION_SAVE_ERROR, error);
      throw error;
    }
  }

  /**
   * Get all locations in current collection
   * @returns {Promise<Array>} Array of location items
   */
  async getLocations() {
    return await storageAdapter.getAll(this.currentCollection);
  }

  /**
   * Get a specific location by ID
   * @param {string} id - Location ID
   * @returns {Promise<Object|null>} Location item or null
   */
  async getLocation(id) {
    return await storageAdapter.getById(id, this.currentCollection);
  }

  /**
   * Update a location's note
   * @param {string} id - Location ID
   * @param {string} note - New note
   * @returns {Promise<Object|null>} Updated location or null
   */
  async updateNote(id, note) {
    const updated = await storageAdapter.update(id, { 
      note: sanitizeNote(note) 
    }, this.currentCollection);
    
    if (updated) {
      eventBus.emit(EVENTS.LOCATION_UPDATED, updated);
      eventBus.emit(EVENTS.DATA_CHANGED, { type: 'location_updated', item: updated });
    }
    
    return updated;
  }

  /**
   * Delete a location
   * @param {string} id - Location ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteLocation(id) {
    const success = await storageAdapter.delete(id, this.currentCollection);
    
    if (success) {
      eventBus.emit(EVENTS.LOCATION_DELETED, { id });
      eventBus.emit(EVENTS.DATA_CHANGED, { type: 'location_deleted', id });
    }
    
    return success;
  }

  /**
   * Clear all locations in current collection
   * @returns {Promise<boolean>} Success status
   */
  async clearLocations() {
    const success = await storageAdapter.clear(this.currentCollection);
    
    if (success) {
      eventBus.emit(EVENTS.DATA_CLEARED, { type: 'locations_cleared', collection: this.currentCollection });
    }
    
    return success;
  }

  /**
   * Get locations count
   * @returns {Promise<number>} Number of locations
   */
  async getCount() {
    const locations = await this.getLocations();
    return locations.length;
  }
}

// Export singleton instance
export const locationService = new LocationService();
export default locationService;
