/**
 * src/core/event-bus.js
 * Sistema centrale di comunicazione tra i moduli.
 * Implementa il pattern Pub/Sub per disaccoppiare UI, Logic e Data layers.
 */

class EventBus {
    constructor() {
        this.events = {};
    }

    /**
     * Sottoscrive un listener a un evento specifico
     * @param {string} event - Nome dell'evento
     * @param {Function} callback - Funzione da eseguire quando l'evento viene emesso
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        return () => this.off(event, callback); // Return unsubscribe function
    }

    /**
     * Rimuove un listener da un evento
     * @param {string} event - Nome dell'evento
     * @param {Function} callback - Funzione da rimuovere
     */
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    /**
     * Emette un evento con dati opzionali
     * @param {string} event - Nome dell'evento
     * @param {any} data - Dati da passare ai listener
     */
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for "${event}":`, error);
            }
        });
    }

    /**
     * Una volta: ascolta un evento solo per la prossima emissione
     * @param {string} event - Nome dell'evento
     * @param {Function} callback - Funzione da eseguire
     */
    once(event, callback) {
        const unsubscribe = this.on(event, (data) => {
            callback(data);
            unsubscribe();
        });
        return unsubscribe;
    }

    /**
     * Rimuove tutti i listener da un evento o da tutti gli eventi
     * @param {string} [event] - Nome dell'evento (opzionale, se assente rimuove tutto)
     */
    clear(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
}

// Export istanza singleton
export const eventBus = new EventBus();

// Costanti per i nomi degli eventi (previene typo errors)
export const EVENTS = {
    // Collection Events
    COLLECTION_CREATED: 'collection:created',
    COLLECTION_UPDATED: 'collection:updated',
    COLLECTION_DELETED: 'collection:deleted',
    COLLECTION_SWITCHED: 'collection:switched',
    COLLECTIONS_LOADED: 'collections:loaded',

    // Item Events
    ITEM_SAVED: 'item:saved',
    ITEM_UPDATED: 'item:updated',
    ITEM_DELETED: 'item:deleted',
    ITEMS_LOADED: 'items:loaded',

    // UI Events
    UI_SHOW_TOAST: 'ui:show-toast',
    UI_SHOW_MODAL: 'ui:show-modal',
    UI_HIDE_MODAL: 'ui:hide-modal',
    UI_UPDATE_STATUS: 'ui:update-status',
    UI_REFRESH_HISTORY: 'ui:refresh-history',
    UI_REFRESH_COLLECTIONS: 'ui:refresh-collections',

    // App Lifecycle
    APP_INITIALIZED: 'app:initialized',
    APP_ERROR: 'app:error'
};
