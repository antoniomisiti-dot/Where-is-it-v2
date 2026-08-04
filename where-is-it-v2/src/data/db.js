/**
 * src/data/db.js
 * Layer di accesso ai dati basato su IndexedDB.
 * Sostituisce localStorage per permettere capacità illimitata e query complesse.
 */

const DB_NAME = 'WhereIsItDB';
const DB_VERSION = 1;

// Nomi degli Object Store
const STORE_COLLECTIONS = 'collections';
const STORE_ITEMS = 'items';

let dbInstance = null;

/**
 * Inizializza il database e crea gli store se non esistono.
 * Viene chiamato automaticamente al primo accesso.
 */
function openDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // 1. Store per le Collezioni (Metadata)
            if (!db.objectStoreNames.contains(STORE_COLLECTIONS)) {
                const collectionStore = db.createObjectStore(STORE_COLLECTIONS, { keyPath: 'id' });
                collectionStore.createIndex('createdAt', 'createdAt', { unique: false });
                collectionStore.createIndex('name', 'name', { unique: false });
            }

            // 2. Store per gli Item (Punti GPS)
            if (!db.objectStoreNames.contains(STORE_ITEMS)) {
                const itemStore = db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
                itemStore.createIndex('collectionId', 'collectionId', { unique: false });
                itemStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            console.error('Errore apertura DB:', event.target.error);
            reject(event.target.error);
        };
    });
}

// --- Operazioni sulle Collezioni ---

export async function createCollection(name) {
    const db = await openDB();
    const tx = db.transaction(STORE_COLLECTIONS, 'readwrite');
    const store = tx.objectStore(STORE_COLLECTIONS);

    const collection = {
        id: crypto.randomUUID(),
        name: name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
        const request = store.add(collection);
        request.onsuccess = () => resolve(collection);
        request.onerror = () => reject(request.error);
    });
}

export async function getAllCollections() {
    const db = await openDB();
    const tx = db.transaction(STORE_COLLECTIONS, 'readonly');
    const store = tx.objectStore(STORE_COLLECTIONS);
    const index = store.index('createdAt');

    return new Promise((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => {
            resolve(request.result.reverse()); 
        };
        request.onerror = () => reject(request.error);
    });
}

export async function updateCollection(id, newName) {
    const db = await openDB();
    const tx = db.transaction(STORE_COLLECTIONS, 'readwrite');
    const store = tx.objectStore(STORE_COLLECTIONS);

    return new Promise((resolve, reject) => {
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
            const collection = getRequest.result;
            if (!collection) return reject(new Error('Collezione non trovata'));
            
            collection.name = newName;
            collection.updatedAt = new Date().toISOString();
            
            const putRequest = store.put(collection);
            putRequest.onsuccess = () => resolve(collection);
            putRequest.onerror = () => reject(putRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

export async function deleteCollection(id) {
    const db = await openDB();
    
    const tx = db.transaction([STORE_COLLECTIONS, STORE_ITEMS], 'readwrite');
    
    tx.objectStore(STORE_COLLECTIONS).delete(id);

    const itemStore = tx.objectStore(STORE_ITEMS);
    const index = itemStore.index('collectionId');
    const range = IDBKeyRange.only(id);
    
    index.openCursor(range).onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            cursor.delete();
            cursor.continue();
        }
    };

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

// --- Operazioni sugli Item (Punti GPS) ---

export async function addItem(itemData) {
    const db = await openDB();
    const tx = db.transaction(STORE_ITEMS, 'readwrite');
    const store = tx.objectStore(STORE_ITEMS);

    const item = {
        id: crypto.randomUUID(),
        collectionId: itemData.collectionId,
        lat: itemData.lat,
        lng: itemData.lng,
        note: itemData.note || '',
        timestamp: new Date().toISOString(),
        address: itemData.address || null
    };

    return new Promise((resolve, reject) => {
        const request = store.add(item);
        request.onsuccess = () => resolve(item);
        request.onerror = () => reject(request.error);
    });
}

export async function getItemsByCollection(collectionId) {
    const db = await openDB();
    const tx = db.transaction(STORE_ITEMS, 'readonly');
    const store = tx.objectStore(STORE_ITEMS);
    const index = store.index('collectionId');

    return new Promise((resolve, reject) => {
        const request = index.getAll(collectionId);
        request.onsuccess = () => {
            const results = request.result.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function updateItem(id, updates) {
    const db = await openDB();
    const tx = db.transaction(STORE_ITEMS, 'readwrite');
    const store = tx.objectStore(STORE_ITEMS);

    return new Promise((resolve, reject) => {
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
            const item = getRequest.result;
            if (!item) return reject(new Error('Item non trovato'));

            Object.assign(item, updates, { updatedAt: new Date().toISOString() });

            const putRequest = store.put(item);
            putRequest.onsuccess = () => resolve(item);
            putRequest.onerror = () => reject(putRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

export async function deleteItem(id) {
    const db = await openDB();
    const tx = db.transaction(STORE_ITEMS, 'readwrite');
    const store = tx.objectStore(STORE_ITEMS);

    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

export async function exportCollectionToJSON(collectionId) {
    const items = await getItemsByCollection(collectionId);
    return JSON.stringify(items, null, 2);
}

export async function wipeDatabase() {
    if(confirm("Sei sicuro? Questo cancellerà TUTTI i dati locali.")) {
        indexedDB.deleteDatabase(DB_NAME);
        dbInstance = null;
        window.location.reload();
    }
}
