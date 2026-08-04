/**
 * src/layers/business.js
 * Business Logic Layer.
 * Gestisce le regole di business e coordina Data Layer e UI Layer tramite Event Bus.
 */

import { eventBus, EVENTS } from '../core/event-bus.js';
import * as db from '../data/db.js';
import { getTimeBadge, formatDate } from '../utils/helpers.js';

// Stato dell'applicazione
let state = {
    currentCollectionId: null,
    currentCollectionName: 'Default Collection',
    collections: [],
    pendingItem: null // Per il flusso di salvataggio con nota
};

/**
 * Inizializza il business layer caricando collezioni e item
 */
export async function init() {
    try {
        // Carica tutte le collezioni
        const collections = await db.getAllCollections();
        
        if (collections.length === 0) {
            // Crea una collezione default se non esistono
            const defaultCollection = await db.createCollection('Default Collection');
            collections.push(defaultCollection);
        }

        state.collections = collections;
        state.currentCollectionId = collections[0].id;
        state.currentCollectionName = collections[0].name;

        // Carica gli item della collezione corrente
        await loadCurrentCollectionItems();

        eventBus.emit(EVENTS.COLLECTIONS_LOADED, collections);
        eventBus.emit(EVENTS.APP_INITIALIZED, {
            currentCollectionId: state.currentCollectionId,
            currentCollectionName: state.currentCollectionName
        });

    } catch (error) {
        console.error('Error initializing app:', error);
        eventBus.emit(EVENTS.APP_ERROR, error);
    }
}

/**
 * Carica gli item della collezione corrente
 */
async function loadCurrentCollectionItems() {
    try {
        const items = await db.getItemsByCollection(state.currentCollectionId);
        eventBus.emit(EVENTS.ITEMS_LOADED, items);
        updateItemsCount(items.length);
    } catch (error) {
        console.error('Error loading items:', error);
        eventBus.emit(EVENTS.APP_ERROR, error);
    }
}

/**
 * Aggiorna il contatore degli item nell'UI
 */
function updateItemsCount(count) {
    eventBus.emit(EVENTS.UI_UPDATE_STATUS, `${count} item${count !== 1 ? 's' : ''}`);
}

/**
 * Crea una nuova collezione
 * @param {string} name - Nome della collezione
 */
export async function createCollection(name) {
    try {
        const collection = await db.createCollection(name);
        state.collections.unshift(collection); // Aggiungi in cima alla lista
        
        eventBus.emit(EVENTS.COLLECTION_CREATED, collection);
        eventBus.emit(EVENTS.UI_REFRESH_COLLECTIONS, state.collections);
        eventBus.emit(EVENTS.UI_SHOW_TOAST, `Collezione "${name}" creata!`);
        
        return collection;
    } catch (error) {
        console.error('Error creating collection:', error);
        eventBus.emit(EVENTS.UI_SHOW_TOAST, 'Errore nella creazione della collezione');
        throw error;
    }
}

/**
 * Cambia la collezione corrente
 * @param {string} collectionId - ID della collezione da selezionare
 */
export async function switchCollection(collectionId) {
    const collection = state.collections.find(c => c.id === collectionId);
    if (!collection) {
        eventBus.emit(EVENTS.UI_SHOW_TOAST, 'Collezione non trovata');
        return;
    }

    state.currentCollectionId = collectionId;
    state.currentCollectionName = collection.name;

    await loadCurrentCollectionItems();

    eventBus.emit(EVENTS.COLLECTION_SWITCHED, collection);
    eventBus.emit(EVENTS.UI_REFRESH_COLLECTIONS, state.collections);
}

/**
 * Rinomina una collezione
 * @param {string} collectionId - ID della collezione
 * @param {string} newName - Nuovo nome
 */
export async function renameCollection(collectionId, newName) {
    try {
        await db.updateCollection(collectionId, newName);
        
        const collection = state.collections.find(c => c.id === collectionId);
        if (collection) {
            collection.name = newName;
            collection.updatedAt = new Date().toISOString();
            
            if (state.currentCollectionId === collectionId) {
                state.currentCollectionName = newName;
            }
        }

        eventBus.emit(EVENTS.COLLECTION_UPDATED, collection);
        eventBus.emit(EVENTS.UI_REFRESH_COLLECTIONS, state.collections);
        eventBus.emit(EVENTS.UI_SHOW_TOAST, `Collezione rinominata in "${newName}"`);
    } catch (error) {
        console.error('Error renaming collection:', error);
        eventBus.emit(EVENTS.UI_SHOW_TOAST, 'Errore nel rinominare la collezione');
        throw error;
    }
}

/**
 * Elimina una collezione e tutti i suoi item
 * @param {string} collectionId - ID della collezione da eliminare
 */
export async function deleteCollection(collectionId) {
    if (!confirm('Sei sicuro di voler eliminare questa collezione e tutti i suoi item?')) {
        return;
    }

    try {
        await db.deleteCollection(collectionId);
        
        state.collections = state.collections.filter(c => c.id !== collectionId);

        // Se abbiamo eliminato la collezione corrente, passa alla prima disponibile
        if (state.currentCollectionId === collectionId && state.collections.length > 0) {
            await switchCollection(state.collections[0].id);
        }

        eventBus.emit(EVENTS.COLLECTION_DELETED, { id: collectionId });
        eventBus.emit(EVENTS.UI_REFRESH_COLLECTIONS, state.collections);
        eventBus.emit(EVENTS.UI_SHOW_TOAST, 'Collezione eliminata');
    } catch (error) {
        console.error('Error deleting collection:', error);
        eventBus.emit(EVENTS.UI_SHOW_TOAST, 'Errore nell\'eliminazione della collezione');
        throw error;
    }
}

/**
 * Prepara il salvataggio di un item (flusso con nota opzionale)
 * @param {object} locationData - Dati della posizione {lat, lng}
 */
export function prepareItemSave(locationData) {
    state.pendingItem = {
        ...locationData,
        collectionId: state.currentCollectionId
    };
    
    eventBus.emit(EVENTS.UI_SHOW_MODAL, 'note-sheet');
}

/**
 * Completa il salvataggio di un item con la nota
 * @param {string|null} note - Nota opzionale
 */
export async function completeItemSave(note) {
    if (!state.pendingItem) return;

    try {
        const itemData = {
            ...state.pendingItem,
            note: note || ''
        };

        const item = await db.addItem(itemData);
        
        // Ricarica gli item della collezione corrente
        await loadCurrentCollectionItems();

        eventBus.emit(EVENTS.ITEM_SAVED, item);
        eventBus.emit(EVENTS.UI_HIDE_MODAL);
        eventBus.emit(EVENTS.UI_SHOW_TOAST, 'Posizione salvata!');
        eventBus.emit(EVENTS.UI_REFRESH_HISTORY);

        state.pendingItem = null;
    } catch (error) {
        console.error('Error saving item:', error);
        eventBus.emit(EVENTS.UI_SHOW_TOAST, 'Errore nel salvataggio');
        throw error;
    }
}

/**
 * Annulla il salvataggio di un item (skip nota)
 */
export function cancelItemSave() {
    state.pendingItem = null;
    eventBus.emit(EVENTS.UI_HIDE_MODAL);
}

/**
 * Elimina un item dalla cronologia
 * @param {string} itemId - ID dell'item da eliminare
 */
export async function deleteItem(itemId) {
    try {
        await db.deleteItem(itemId);
        await loadCurrentCollectionItems();
        
        eventBus.emit(EVENTS.ITEM_DELETED, { id: itemId });
        eventBus.emit(EVENTS.UI_REFRESH_HISTORY);
        eventBus.emit(EVENTS.UI_SHOW_TOAST, 'Item eliminato');
    } catch (error) {
        console.error('Error deleting item:', error);
        eventBus.emit(EVENTS.UI_SHOW_TOAST, 'Errore nell\'eliminazione');
        throw error;
    }
}

/**
 * Elimina tutti gli item della collezione corrente
 */
export async function clearAllItems() {
    if (!confirm('Sei sicuro di voler cancellare tutta la cronologia?')) {
        return;
    }

    try {
        const items = await db.getItemsByCollection(state.currentCollectionId);
        
        for (const item of items) {
            await db.deleteItem(item.id);
        }

        await loadCurrentCollectionItems();
        eventBus.emit(EVENTS.UI_REFRESH_HISTORY);
        eventBus.emit(EVENTS.UI_SHOW_TOAST, 'Cronologia cancellata');
    } catch (error) {
        console.error('Error clearing items:', error);
        eventBus.emit(EVENTS.UI_SHOW_TOAST, 'Errore nel cancellare la cronologia');
        throw error;
    }
}

/**
 * Ottieni lo stato corrente dell'app
 */
export function getState() {
    return { ...state };
}

/**
 * Esporta tutti i dati in formato JSON
 */
export async function exportAllData() {
    try {
        const allData = {
            exportedAt: new Date().toISOString(),
            collections: state.collections,
            items: {}
        };

        for (const collection of state.collections) {
            const items = await db.getItemsByCollection(collection.id);
            allData.items[collection.id] = items;
        }

        return JSON.stringify(allData, null, 2);
    } catch (error) {
        console.error('Error exporting data:', error);
        throw error;
    }
}

/**
 * Importa dati da JSON
 * @param {object} jsonData - Dati da importare
 */
export async function importData(jsonData) {
    try {
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        
        let importedCollections = 0;
        let importedItems = 0;

        // Importa collezioni
        if (data.collections) {
            for (const collection of data.collections) {
                try {
                    await db.createCollection(collection.name);
                    importedCollections++;
                } catch (err) {
                    console.error('Error importing collection:', err);
                }
            }
        }

        // Ricarica stato
        await init();

        eventBus.emit(EVENTS.UI_SHOW_TOAST, `Importati ${importedCollections} collezioni`);
        return { success: true, collections: importedCollections, items: importedItems };
    } catch (error) {
        console.error('Error importing data:', error);
        eventBus.emit(EVENTS.UI_SHOW_TOAST, 'Errore nell\'importazione');
        throw error;
    }
}
