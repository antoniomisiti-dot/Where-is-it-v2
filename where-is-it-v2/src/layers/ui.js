/**
 * src/layers/ui.js
 * UI Layer.
 * Gestisce il rendering e gli eventi dell'interfaccia utente.
 * Ascolta gli eventi dal Business Layer e aggiorna il DOM.
 */

import { eventBus, EVENTS } from '../core/event-bus.js';
import { formatDate, getTimeBadge, escapeHtml, shareLocation, openInMaps } from '../utils/helpers.js';
import * as business from './business.js';

// Riferimenti DOM
let elements = {};

/**
 * Inizializza i riferimenti DOM e setup degli event listener
 */
export function init() {
    // Cache elementi DOM
    elements = {
        btnSaveLocation: document.getElementById('btn-save-location'),
        btnCollections: document.getElementById('btn-collections'),
        btnClearHistory: document.getElementById('btn-clear-history'),
        currentCollectionName: document.getElementById('current-collection-name'),
        itemsCount: document.getElementById('items-count'),
        historyList: document.getElementById('history-list'),
        collectionsList: document.getElementById('collections-list'),
        noteSheet: document.getElementById('note-sheet'),
        collectionsSheet: document.getElementById('collections-sheet'),
        privacyModal: document.getElementById('privacy-modal'),
        toast: document.getElementById('toast'),
        noteInput: document.getElementById('note-input'),
        btnSaveNote: document.getElementById('btn-save-note'),
        btnSkipNote: document.getElementById('btn-skip-note'),
        btnCloseCollections: document.getElementById('btn-close-collections'),
        btnCreateCollection: document.getElementById('btn-create-collection'),
        btnExportAll: document.getElementById('btn-export-all'),
        btnImportData: document.getElementById('btn-import-data'),
        fileImport: document.getElementById('file-import'),
        btnClosePrivacy: document.getElementById('btn-close-privacy')
    };

    setupEventListeners();
    subscribeToEvents();
}

/**
 * Setup degli event listener per i bottoni e input
 */
function setupEventListeners() {
    // Salva posizione
    elements.btnSaveLocation.addEventListener('click', handleSaveLocation);

    // Apri gestore collezioni
    elements.btnCollections.addEventListener('click', () => {
        showSheet(elements.collectionsSheet);
    });

    // Cancella cronologia
    elements.btnClearHistory.addEventListener('click', () => {
        business.clearAllItems();
    });

    // Salva nota
    elements.btnSaveNote.addEventListener('click', () => {
        const note = elements.noteInput.value.trim();
        business.completeItemSave(note);
        elements.noteInput.value = '';
    });

    // Skip nota
    elements.btnSkipNote.addEventListener('click', () => {
        business.cancelItemSave();
        elements.noteInput.value = '';
    });

    // Chiudi sheet collezioni
    elements.btnCloseCollections.addEventListener('click', () => {
        hideSheet(elements.collectionsSheet);
    });

    // Crea nuova collezione
    elements.btnCreateCollection.addEventListener('click', async () => {
        const name = prompt('Nome della collezione:');
        if (name && name.trim()) {
            await business.createCollection(name.trim());
        }
    });

    // Esporta tutti i dati
    elements.btnExportAll.addEventListener('click', handleExportAll);

    // Importa dati
    elements.btnImportData.addEventListener('click', () => {
        elements.fileImport.click();
    });

    elements.fileImport.addEventListener('change', handleFileImport);

    // Chiudi modal privacy
    elements.btnClosePrivacy.addEventListener('click', () => {
        hideModal(elements.privacyModal);
        localStorage.setItem('whereisit_privacy_seen', 'true');
    });

    // Click fuori dalle sheet per chiuderle
    document.addEventListener('click', (e) => {
        if (e.target === elements.noteSheet) {
            business.cancelItemSave();
            elements.noteInput.value = '';
        }
        if (e.target === elements.collectionsSheet) {
            hideSheet(elements.collectionsSheet);
        }
    });
}

/**
 * Sottoscrive ai eventi del Business Layer
 */
function subscribeToEvents() {
    // App inizializzata
    eventBus.on(EVENTS.APP_INITIALIZED, (data) => {
        elements.currentCollectionName.textContent = data.currentCollectionName;
        
        // Mostra modal privacy al primo avvio
        const privacySeen = localStorage.getItem('whereisit_privacy_seen');
        if (!privacySeen) {
            showModal(elements.privacyModal);
        }
    });

    // Items caricati - renderizza cronologia
    eventBus.on(EVENTS.ITEMS_LOADED, renderHistory);

    // Aggiorna stato/contatore
    eventBus.on(EVENTS.UI_UPDATE_STATUS, (count) => {
        elements.itemsCount.textContent = count;
    });

    // Refresh cronologia
    eventBus.on(EVENTS.UI_REFRESH_HISTORY, () => {
        const state = business.getState();
        // Triggera un reload degli item
        eventBus.emit(EVENTS.ITEMS_LOADED, []); // Placeholder, verrà sovrascritto
    });

    // Refresh collezioni
    eventBus.on(EVENTS.UI_REFRESH_COLLECTIONS, renderCollections);

    // Show/Hide Modal
    eventBus.on(EVENTS.UI_SHOW_MODAL, (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) showModal(modal);
    });

    eventBus.on(EVENTS.UI_HIDE_MODAL, () => {
        hideSheet(elements.noteSheet);
        hideSheet(elements.collectionsSheet);
        hideModal(elements.privacyModal);
    });

    // Toast notification
    eventBus.on(EVENTS.UI_SHOW_TOAST, showToast);

    // Errore app
    eventBus.on(EVENTS.APP_ERROR, (error) => {
        console.error('App error:', error);
        showToast('Si è verificato un errore');
    });
}

/**
 * Gestisce il click su "Salva Posizione"
 */
async function handleSaveLocation() {
    elements.btnSaveLocation.disabled = true;
    elements.btnSaveLocation.textContent = 'Localizzazione...';

    try {
        const position = await getCurrentPosition();
        business.prepareItemSave({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
        });
    } catch (error) {
        console.error('Geolocation error:', error);
        showToast('Impossibile ottenere la posizione');
    } finally {
        elements.btnSaveLocation.disabled = false;
        elements.btnSaveLocation.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
            Salva Posizione
        `;
    }
}

/**
 * Ottiene la posizione corrente con Geolocation API
 */
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation non supportata'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

/**
 * Renderizza la lista della cronologia
 */
function renderHistory(items) {
    elements.historyList.innerHTML = '';

    if (!items || items.length === 0) {
        elements.historyList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Nessuna posizione salvata</p>';
        return;
    }

    items.forEach(item => {
        const badge = getTimeBadge(item.timestamp);
        const dateStr = formatDate(item.timestamp);
        const note = item.note || 'Senza nota';

        const itemEl = document.createElement('div');
        itemEl.className = 'history-item';
        itemEl.innerHTML = `
            <div class="history-item-content">
                <div class="history-item-note">${escapeHtml(note)}</div>
                <div class="history-item-meta">
                    ${dateStr}
                    ${badge ? `<span class="badge badge-${badge.type}">${badge.text}</span>` : ''}
                </div>
            </div>
            <div class="history-item-actions">
                <button class="icon-btn btn-share" aria-label="Condividi">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"/>
                        <circle cx="6" cy="12" r="3"/>
                        <circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                </button>
                <button class="icon-btn btn-maps" aria-label="Apri mappa">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                        <line x1="8" y1="2" x2="8" y2="18"/>
                        <line x1="16" y1="6" x2="16" y2="22"/>
                    </svg>
                </button>
                <button class="icon-btn btn-delete" aria-label="Elimina">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </button>
            </div>
        `;

        // Event listeners per i bottoni
        itemEl.querySelector('.btn-share').addEventListener('click', (e) => {
            e.stopPropagation();
            shareLocation(item.lat, item.lng, item.note);
        });

        itemEl.querySelector('.btn-maps').addEventListener('click', (e) => {
            e.stopPropagation();
            openInMaps(item.lat, item.lng);
        });

        itemEl.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            business.deleteItem(item.id);
        });

        // Click sull'item per aprire la mappa
        itemEl.addEventListener('click', () => {
            openInMaps(item.lat, item.lng);
        });

        elements.historyList.appendChild(itemEl);
    });
}

/**
 * Renderizza la lista delle collezioni
 */
function renderCollections(collections) {
    elements.collectionsList.innerHTML = '';
    const state = business.getState();

    collections.forEach(collection => {
        const collectionEl = document.createElement('div');
        collectionEl.className = `collection-item ${collection.id === state.currentCollectionId ? 'active' : ''}`;
        
        const itemCount = '...'; // Potremmo contare gli item se necessario
        
        collectionEl.innerHTML = `
            <div>
                <div class="collection-item-name">${escapeHtml(collection.name)}</div>
                <div class="collection-item-meta">${itemCount} item • Creato: ${formatDate(collection.createdAt)}</div>
            </div>
            <div class="collection-item-actions">
                <button class="icon-btn btn-rename" aria-label="Rinomina">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="icon-btn btn-delete-collection" aria-label="Elimina">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </button>
            </div>
        `;

        // Switch collezione al click
        collectionEl.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                business.switchCollection(collection.id);
                hideSheet(elements.collectionsSheet);
            }
        });

        // Rinomina
        collectionEl.querySelector('.btn-rename').addEventListener('click', (e) => {
            e.stopPropagation();
            const newName = prompt('Nuovo nome:', collection.name);
            if (newName && newName.trim()) {
                business.renameCollection(collection.id, newName.trim());
            }
        });

        // Elimina
        collectionEl.querySelector('.btn-delete-collection').addEventListener('click', (e) => {
            e.stopPropagation();
            business.deleteCollection(collection.id);
        });

        elements.collectionsList.appendChild(collectionEl);
    });
}

/**
 * Mostra una bottom sheet
 */
function showSheet(sheet) {
    sheet.classList.add('active');
    document.body.style.overflow = 'hidden'; // Previene scroll
}

/**
 * Nasconde una bottom sheet
 */
function hideSheet(sheet) {
    sheet.classList.remove('active');
    document.body.style.overflow = '';
}

/**
 * Mostra un modal
 */
function showModal(modal) {
    modal.classList.add('active');
}

/**
 * Nasconde un modal
 */
function hideModal(modal) {
    modal.classList.remove('active');
}

/**
 * Mostra un toast notification
 */
function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('active');

    setTimeout(() => {
        elements.toast.classList.remove('active');
    }, 3000);
}

/**
 * Gestisce l'esportazione di tutti i dati
 */
async function handleExportAll() {
    try {
        const data = await business.exportAllData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `where-is-it-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Backup esportato con successo!');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Errore nell\'esportazione');
    }
}

/**
 * Gestisce l'importazione da file
 */
async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        await business.importData(text);
        showToast('Dati importati con successo!');
    } catch (error) {
        console.error('Import error:', error);
        showToast('Errore nell\'importazione');
    }

    // Reset input file
    elements.fileImport.value = '';
}
