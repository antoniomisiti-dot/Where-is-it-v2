/**
 * Event Bus - Central event system for decoupled communication
 * Publish-Subscribe pattern implementation
 */

class EventBus {
  constructor() {
    this.events = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (!this.events.has(event)) return;
    
    const callbacks = this.events.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
    
    // Clean up empty event arrays
    if (callbacks.length === 0) {
      this.events.delete(event);
    }
  }

  /**
   * Emit an event with optional data
   * @param {string} event - Event name
   * @param {*} data - Data to pass to callbacks
   */
  emit(event, data) {
    if (!this.events.has(event)) return;
    
    const callbacks = this.events.get(event);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    });
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first trigger)
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  once(event, callback) {
    const unsubscribe = this.on(event, (data) => {
      unsubscribe();
      callback(data);
    });
    return unsubscribe;
  }

  /**
   * Clear all events or a specific event
   * @param {string} [event] - Optional event name to clear
   */
  clear(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get the number of subscribers for an event
   * @param {string} event - Event name
   * @returns {number} Number of subscribers
   */
  listenerCount(event) {
    if (!this.events.has(event)) return 0;
    return this.events.get(event).length;
  }
}

// Create singleton instance
export const eventBus = new EventBus();

// Event constants for type safety
export const EVENTS = {
  // App lifecycle
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error',
  
  // Location events
  LOCATION_SAVING: 'location:saving',
  LOCATION_SAVED: 'location:saved',
  LOCATION_SAVE_ERROR: 'location:save-error',
  LOCATION_DELETED: 'location:deleted',
  LOCATION_UPDATED: 'location:updated',
  
  // Collection events
  COLLECTION_CREATED: 'collection:created',
  COLLECTION_UPDATED: 'collection:updated',
  COLLECTION_DELETED: 'collection:deleted',
  COLLECTION_SWITCHED: 'collection:switched',
  
  // UI events
  UI_SHOW_HISTORY: 'ui:show-history',
  UI_HIDE_HISTORY: 'ui:hide-history',
  UI_SHOW_MODAL: 'ui:show-modal',
  UI_HIDE_MODAL: 'ui:hide-modal',
  UI_SHOW_TOAST: 'ui:show-toast',
  UI_UPDATE_BUTTON_STATE: 'ui:update-button-state',
  
  // Data events
  DATA_CHANGED: 'data:changed',
  DATA_EXPORTED: 'data:exported',
  DATA_IMPORTED: 'data:imported',
  DATA_CLEARED: 'data:cleared'
};

export default eventBus;
