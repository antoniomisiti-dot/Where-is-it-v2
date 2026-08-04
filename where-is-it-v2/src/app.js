/**
 * src/app.js
 * Entry point dell'applicazione.
 * Inizializza tutti i moduli e avvia l'app.
 */

import { eventBus, EVENTS } from './core/event-bus.js';
import * as business from './layers/business.js';
import * as ui from './layers/ui.js';

/**
 * Inizializza l'applicazione
 */
async function initApp() {
    try {
        console.log('Initializing Where is it? app...');

        // 1. Inizializza UI Layer (setup DOM e event listeners)
        ui.init();

        // 2. Inizializza Business Layer (carica dati da IndexedDB)
        await business.init();

        // 3. Registra Service Worker per offline support
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('SW registered:', registration.scope);
                    })
                    .catch(error => {
                        console.log('SW registration failed:', error);
                    });
            });
        }

        console.log('App initialized successfully!');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        eventBus.emit(EVENTS.APP_ERROR, error);
    }
}

// Avvia l'app quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export per debug/testing
export { initApp };
