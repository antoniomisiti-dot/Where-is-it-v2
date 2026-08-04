/**
 * src/utils/helpers.js
 * Funzioni utility riutilizzabili per formattazione, validazione e manipolazione dati.
 */

/**
 * Formatta una data ISO in stringa leggibile
 * @param {string} isoString - Data in formato ISO
 * @returns {string} Data formattata
 */
export function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Oggi
    if (date.toDateString() === now.toDateString()) {
        return `Oggi alle ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Ieri
    if (date.toDateString() === yesterday.toDateString()) {
        return `Ieri alle ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Altri giorni
    return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Restituisce il badge temporale per un item
 * @param {string} isoString - Data in formato ISO
 * @returns {object|null} Oggetto con tipo e testo del badge, o null se nessun badge
 */
export function getTimeBadge(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
        return { type: 'today', text: 'Today' };
    }

    if (date.toDateString() === yesterday.toDateString()) {
        return { type: 'yesterday', text: 'Yesterday' };
    }

    return null;
}

/**
 * Calcola la distanza tra due coordinate GPS (formula di Haversine)
 * @param {number} lat1 - Latitudine punto 1
 * @param {number} lng1 - Longitudine punto 1
 * @param {number} lat2 - Latitudine punto 2
 * @param {number} lng2 - Longitudine punto 2
 * @returns {number} Distanza in metri
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Raggio terrestre in metri
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Genera un URL per Google Maps o Apple Maps in base alla piattaforma
 * @param {number} lat - Latitudine
 * @param {number} lng - Longitudine
 * @returns {string} URL della mappa
 */
export function getMapsUrl(lat, lng) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
        return `http://maps.apple.com/?ll=${lat},${lng}`;
    }
    
    return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Apre l'URL della mappa in una nuova scheda
 * @param {number} lat - Latitudine
 * @param {number} lng - Longitudine
 */
export function openInMaps(lat, lng) {
    const url = getMapsUrl(lat, lng);
    window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Condivide una posizione usando Web Share API o fallback clipboard
 * @param {number} lat - Latitudine
 * @param {number} lng - Longitudine
 * @param {string} note - Nota opzionale
 * @returns {Promise<boolean>} True se la condivisione è andata a buon fine
 */
export async function shareLocation(lat, lng, note = '') {
    const mapsUrl = getMapsUrl(lat, lng);
    const text = note 
        ? `Ho trovato questo posto: "${note}"\n${mapsUrl}`
        : `Guarda dove sono: ${mapsUrl}`;

    // Web Share API
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Where is it?',
                text: text,
                url: mapsUrl
            });
            return true;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Share error:', err);
            }
        }
    }

    // Fallback: copia negli appunti
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Clipboard error:', err);
        return false;
    }
}

/**
 * Escape di caratteri HTML per prevenire XSS
 * @param {string} str - Stringa da sanitizzare
 * @returns {string} Stringa safe
 */
export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Tronca una stringa a una lunghezza massima
 * @param {string} str - Stringa da troncare
 * @param {number} maxLength - Lunghezza massima
 * @returns {string} Stringa troncata
 */
export function truncate(str, maxLength) {
    if (!str || str.length <= maxLength) return str;
    return str.slice(0, maxLength) + '...';
}

/**
 * Genera un ID casuale (fallback per browser vecchi senza crypto.randomUUID)
 * @returns {string} ID univoco
 */
export function generateId() {
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    // Fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
