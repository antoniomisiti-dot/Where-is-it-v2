/**
 * Main Application Entry Point
 * Initializes all modules and starts the application
 */

import { eventBus, EVENTS } from './core/eventBus.js';
import { collectionService } from './layers/collectionService.js';
import { locationService } from './layers/businessLayer.js';
import { uiManager } from './layers/uiLayer.js';

class App {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('🚀 Initializing Where is it? app...');

      // Initialize collections and data layer
      await collectionService.init();

      // Initialize UI
      uiManager.init();

      // Expose methods to window for inline event handlers
      window.app = {
        openMap: (id) => uiManager.openMap(id),
        shareLocation: (id) => uiManager.shareLocation(id),
        deleteLocation: (id) => uiManager.deleteLocation(id)
      };

      // Emit ready event
      eventBus.emit(EVENTS.APP_READY);

      this.initialized = true;
      console.log('✅ App initialized successfully');

      // Register service worker
      this.registerServiceWorker();

    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      eventBus.emit(EVENTS.APP_ERROR, error);
    }
  }

  /**
   * Register service worker for offline support
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js');
        console.log('Service Worker registered:', registration.scope);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Get current version
   */
  getVersion() {
    return '2.0.0-modular';
  }
}

// Create and export app instance
export const app = new App();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

export default app;
