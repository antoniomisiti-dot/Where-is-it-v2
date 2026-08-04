/**
 * UI Layer - DOM Manipulation and Event Handling
 * Listens to events and updates the UI accordingly
 */

import { eventBus, EVENTS } from '../core/eventBus.js';
import { locationService } from '../layers/businessLayer.js';
import { collectionService } from '../layers/collectionService.js';
import { formatBadge, formatTime } from '../utils/dateUtils.js';
import { escapeHtml } from '../utils/stringUtils.js';
import { openMap, sharePoint } from '../utils/shareUtils.js';

export class UIManager {
  constructor() {
    this.elements = {};
    this.isHistoryOpen = false;
    this.pendingLocation = null;
  }

  /**
   * Initialize UI elements and event listeners
   */
  init() {
    this.cacheElements();
    this.setupEventListeners();
    this.subscribeToEvents();
  }

  /**
   * Cache DOM elements for performance
   */
  cacheElements() {
    this.elements = {
      saveBtn: document.getElementById('save-btn'),
      historyBtn: document.getElementById('history-btn'),
      privacyBtn: document.getElementById('privacy-btn'),
      noteBox: document.querySelector('.note-box'),
      noteInput: document.getElementById('note-input'),
      noteSaveBtn: document.getElementById('note-save-btn'),
      noteSkipBtn: document.getElementById('note-skip-btn'),
      historyList: document.getElementById('history-list'),
      historySheet: document.getElementById('history-sheet'),
      historyCloseBtn: document.getElementById('history-close-btn'),
      clearAllBtn: document.getElementById('clear-all-btn'),
      privacyModal: document.getElementById('privacy-modal'),
      privacyCloseBtn: document.getElementById('privacy-close-btn'),
      collectionSelect: document.getElementById('collection-select'),
      collectionNameDisplay: document.getElementById('collection-name')
    };
  }

  /**
   * Setup native event listeners
   */
  setupEventListeners() {
    // Save location button
    this.elements.saveBtn?.addEventListener('click', () => this.handleSaveLocation());

    // History button
    this.elements.historyBtn?.addEventListener('click', () => this.toggleHistory());

    // Privacy button
    this.elements.privacyBtn?.addEventListener('click', () => this.showPrivacyModal());

    // Note buttons
    this.elements.noteSaveBtn?.addEventListener('click', () => this.handleNoteSave());
    this.elements.noteSkipBtn?.addEventListener('click', () => this.handleNoteSkip());

    // History close
    this.elements.historyCloseBtn?.addEventListener('click', () => this.toggleHistory());

    // Clear all
    this.elements.clearAllBtn?.addEventListener('click', () => this.handleClearAll());

    // Privacy modal close
    this.elements.privacyCloseBtn?.addEventListener('click', () => this.hidePrivacyModal());

    // Close modals on outside click
    window.addEventListener('click', (e) => {
      if (e.target === this.elements.historySheet) {
        this.toggleHistory();
      }
      if (e.target === this.elements.privacyModal) {
        this.hidePrivacyModal();
      }
    });
  }

  /**
   * Subscribe to EventBus events
   */
  subscribeToEvents() {
    eventBus.on(EVENTS.LOCATION_SAVED, (data) => this.onLocationSaved(data));
    eventBus.on(EVENTS.LOCATION_SAVE_ERROR, (error) => this.onLocationSaveError(error));
    eventBus.on(EVENTS.DATA_CHANGED, () => this.renderHistory());
    eventBus.on(EVENTS.COLLECTION_SWITCHED, () => {
      this.renderHistory();
      this.updateCollectionDisplay();
    });
  }

  /**
   * Handle save location button click
   */
  async handleSaveLocation() {
    this.updateButtonState(true);
    
    try {
      const position = await this.getCurrentPosition();
      this.pendingLocation = position;
      this.showNoteBox();
    } catch (error) {
      this.showToast(error.message, 'error');
      this.updateButtonState(false);
    }
  }

  /**
   * Get current GPS position
   */
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        }),
        (error) => {
          let message = 'Unable to retrieve location.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out.';
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  /**
   * Show note input box
   */
  showNoteBox() {
    this.elements.noteBox?.classList.add('active');
    this.elements.noteInput?.focus();
  }

  /**
   * Hide note input box
   */
  hideNoteBox() {
    this.elements.noteBox?.classList.remove('active');
    if (this.elements.noteInput) {
      this.elements.noteInput.value = '';
    }
    this.pendingLocation = null;
    this.updateButtonState(false);
  }

  /**
   * Handle note save
   */
  async handleNoteSave() {
    const note = this.elements.noteInput?.value || '';
    await this.saveLocation(note);
    this.hideNoteBox();
  }

  /**
   * Handle note skip
   */
  async handleNoteSkip() {
    await this.saveLocation('');
    this.hideNoteBox();
  }

  /**
   * Save location to storage
   */
  async saveLocation(note) {
    if (!this.pendingLocation) return;

    try {
      await locationService.saveLocation({
        latitude: this.pendingLocation.latitude,
        longitude: this.pendingLocation.longitude,
        note: note,
        accuracy: this.pendingLocation.accuracy
      });
      this.showToast('Location saved!', 'success');
    } catch (error) {
      this.showToast('Failed to save location.', 'error');
      console.error(error);
    }
  }

  /**
   * Toggle history panel
   */
  async toggleHistory() {
    this.isHistoryOpen = !this.isHistoryOpen;
    
    if (this.isHistoryOpen) {
      await this.renderHistory();
      this.elements.historySheet?.classList.add('active');
    } else {
      this.elements.historySheet?.classList.remove('active');
    }
  }

  /**
   * Render history list
   */
  async renderHistory() {
    const locations = await locationService.getLocations();
    
    if (!this.elements.historyList) return;

    if (locations.length === 0) {
      this.elements.historyList.innerHTML = `
        <div class="empty-state">
          <p>No locations saved yet.</p>
        </div>
      `;
      return;
    }

    this.elements.historyList.innerHTML = locations.map(location => `
      <div class="history-item" data-id="${location.id}">
        <div class="history-item-content">
          <div class="history-item-header">
            <span class="badge">${escapeHtml(formatBadge(location.createdAt))}</span>
            <span class="time">${formatTime(location.createdAt)}</span>
          </div>
          ${location.note ? `<p class="note">${escapeHtml(location.note)}</p>` : ''}
          <div class="coords">
            ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
          </div>
        </div>
        <div class="history-item-actions">
          <button class="btn-icon map-btn" title="Open in map" onclick="window.app.openMap('${location.id}')">
            🗺️
          </button>
          <button class="btn-icon share-btn" title="Share" onclick="window.app.shareLocation('${location.id}')">
            📤
          </button>
          <button class="btn-icon delete-btn" title="Delete" onclick="window.app.deleteLocation('${location.id}')">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Open location in map
   */
  async openMap(id) {
    const location = await locationService.getLocation(id);
    if (location) {
      openMap(location.latitude, location.longitude);
    }
  }

  /**
   * Share location
   */
  async shareLocation(id) {
    const location = await locationService.getLocation(id);
    if (location) {
      const success = await sharePoint(location.latitude, location.longitude, location.note);
      if (success) {
        this.showToast('Shared successfully!', 'success');
      }
    }
  }

  /**
   * Delete location
   */
  async deleteLocation(id) {
    if (confirm('Delete this location?')) {
      try {
        await locationService.deleteLocation(id);
        this.showToast('Location deleted', 'success');
        await this.renderHistory();
      } catch (error) {
        this.showToast('Failed to delete location', 'error');
      }
    }
  }

  /**
   * Handle clear all locations
   */
  async handleClearAll() {
    const count = await locationService.getCount();
    if (count === 0) {
      this.showToast('No locations to clear', 'info');
      return;
    }

    if (confirm(`Delete all ${count} locations? This cannot be undone.`)) {
      try {
        await locationService.clearLocations();
        this.showToast('All locations cleared', 'success');
        this.toggleHistory();
      } catch (error) {
        this.showToast('Failed to clear locations', 'error');
      }
    }
  }

  /**
   * Show privacy modal
   */
  showPrivacyModal() {
    this.elements.privacyModal?.classList.add('active');
  }

  /**
   * Hide privacy modal
   */
  hidePrivacyModal() {
    this.elements.privacyModal?.classList.remove('active');
  }

  /**
   * Update button state during loading
   */
  updateButtonState(loading) {
    if (!this.elements.saveBtn) return;
    
    if (loading) {
      this.elements.saveBtn.disabled = true;
      this.elements.saveBtn.innerHTML = '<span class="spinner"></span> Getting location...';
    } else {
      this.elements.saveBtn.disabled = false;
      this.elements.saveBtn.innerHTML = '📍 Save My Location';
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    // Simple alert for now - can be enhanced with a proper toast component
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * Update collection display
   */
  updateCollectionDisplay() {
    // Placeholder for collection UI updates
    const currentCollection = collectionService.getCurrentCollection();
    if (this.elements.collectionNameDisplay) {
      this.elements.collectionNameDisplay.textContent = currentCollection;
    }
  }

  /**
   * Handle location saved event
   */
  onLocationSaved(location) {
    console.log('Location saved:', location);
  }

  /**
   * Handle location save error
   */
  onLocationSaveError(error) {
    console.error('Location save error:', error);
    this.showToast('Failed to save location', 'error');
    this.updateButtonState(false);
  }
}

// Export singleton instance
export const uiManager = new UIManager();
export default uiManager;
