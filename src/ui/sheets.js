import { bus } from '../core/event-bus.js';
import { formatBadge, formatTime, escapeHtml } from '../utils/formatters.js';
import { Icons } from './components.js';

export class Sheets {
  constructor() {
    this.els = this.bindElements();
    this.bindEvents();
    this.bindBus();
  }

  bindElements() {
    return {
      overlayHistory: document.getElementById('overlay-history'),
      sheetHistory: document.getElementById('sheet-history'),
      closeHistory: document.getElementById('close-history'),
      historyList: document.getElementById('history-list'),
      btnClearAll: document.getElementById('btn-clear-all'),
      overlayPrivacy: document.getElementById('overlay-privacy'),
      sheetPrivacy: document.getElementById('sheet-privacy'),
      closePrivacy: document.getElementById('close-privacy')
    };
  }

  bindEvents() {
    this.els.closeHistory.addEventListener('click', () => this.closeHistory());
    this.els.overlayHistory.addEventListener('click', () => this.closeHistory());
    this.els.btnClearAll.addEventListener('click', () => bus.emit('user:clear-all'));

    this.els.closePrivacy.addEventListener('click', () => this.closePrivacy());
    this.els.overlayPrivacy.addEventListener('click', () => this.closePrivacy());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeHistory();
        this.closePrivacy();
      }
    });
  }

  bindBus() {
    bus.on('history:updated', ({ history }) => {
      if (this.els.sheetHistory.classList.contains('active')) {
        this.renderHistory(history);
      }
    });
  }

  openHistory() {
    bus.emit('history:requested');
    this.renderHistory(window.__history || []);
    this.els.overlayHistory.classList.add('active');
    this.els.sheetHistory.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeHistory() {
    this.els.overlayHistory.classList.remove('active');
    this.els.sheetHistory.classList.remove('active');
    document.body.style.overflow = '';
  }

  openPrivacy() {
    this.els.overlayPrivacy.classList.add('active');
    this.els.sheetPrivacy.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closePrivacy() {
    this.els.overlayPrivacy.classList.remove('active');
    this.els.sheetPrivacy.classList.remove('active');
    document.body.style.overflow = '';
  }

  renderHistory(history) {
    window.__history = history; // cache for re-render when sheet is open
    const container = this.els.historyList;
    const clearBtn = this.els.btnClearAll;

    if (history.length === 0) {
      container.innerHTML = '<div class="empty-history">History is empty.</div>';
      clearBtn.style.display = 'none';
      return;
    }

    clearBtn.style.display = 'inline-block';

    container.innerHTML = history.map(item => {
      const noteDisplay = item.note
        ? `<span class="history-note">${escapeHtml(item.note)}</span>`
        : `<span class="history-note"><em>Unnamed location</em></span>`;
      return `
        <div class="history-item" data-id="${item.id}">
          <div class="history-main">
            <div class="history-info">
              <span class="badge">${formatBadge(item.timestamp)}</span>
              ${noteDisplay}
              <span class="history-date">at ${formatTime(item.timestamp)}</span>
            </div>
            <div class="history-actions">
              <button class="btn-icon-small btn-edit" title="Edit note">${Icons.edit}</button>
              <button class="btn-icon-small btn-share" title="Share">${Icons.share}</button>
              <button class="btn-icon-small btn-map" title="Open map">${Icons.map}</button>
              <button class="btn-icon-small danger btn-delete" title="Delete">${Icons.trash}</button>
            </div>
          </div>
          <div class="history-edit">
            <input type="text" class="edit-input" value="${escapeHtml(item.note || '')}" maxlength="50" placeholder="Note...">
            <button class="btn-icon-confirm btn-confirm" title="Save">✓</button>
            <button class="btn-icon-confirm btn-cancel" title="Cancel">✕</button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.history-item').forEach(el => {
      const id = parseInt(el.dataset.id);
      const main = el.querySelector('.history-main');
      const editBox = el.querySelector('.history-edit');
      const editInput = el.querySelector('.edit-input');

      el.querySelector('.btn-edit').addEventListener('click', () => {
        main.style.display = 'none';
        editBox.classList.add('active');
        editInput.focus();
      });

      el.querySelector('.btn-confirm').addEventListener('click', () => {
        bus.emit('user:edit-note', { id, note: editInput.value });
      });

      el.querySelector('.btn-cancel').addEventListener('click', () => {
        this.renderHistory(history);
      });

      el.querySelector('.btn-map').addEventListener('click', () => {
        bus.emit('user:open-point-map', { id });
      });

      el.querySelector('.btn-share').addEventListener('click', () => {
        bus.emit('user:share-point', { id });
      });

      el.querySelector('.btn-delete').addEventListener('click', () => {
        if (confirm('Delete this location from history?')) {
          bus.emit('user:delete-point', { id });
        }
      });
    });
  }
}