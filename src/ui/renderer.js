import { bus } from '../core/event-bus.js';
import { formatBadge, formatTime } from '../utils/formatters.js';
import { Icons } from './components.js';

export class Renderer {
  constructor() {
    this.els = this.bindElements();
    this.bindEvents();
    this.bindBus();
  }

  bindElements() {
    return {
      btnSave: document.getElementById('btn-save'),
      noteBox: document.getElementById('note-box'),
      noteInput: document.getElementById('note-input'),
      btnSaveNote: document.getElementById('btn-save-note'),
      btnSkipNote: document.getElementById('btn-skip-note'),
      statusBox: document.getElementById('status-box'),
      statusTime: document.getElementById('status-time'),
      statusNote: document.getElementById('status-note'),
      btnFind: document.getElementById('btn-find'),
      btnShare: document.getElementById('btn-share'),
      btnHistory: document.getElementById('btn-history'),
      btnInfo: document.getElementById('btn-info')
    };
  }

  bindEvents() {
    this.els.btnSave.addEventListener('click', () => bus.emit('user:save-location'));
    this.els.btnSaveNote.addEventListener('click', () => {
      bus.emit('user:save-note', { note: this.els.noteInput.value });
    });
    this.els.btnSkipNote.addEventListener('click', () => bus.emit('user:skip-note'));
    this.els.btnFind.addEventListener('click', () => bus.emit('user:open-last-map'));
    this.els.btnShare.addEventListener('click', () => bus.emit('user:share-last'));
    this.els.btnHistory.addEventListener('click', () => bus.emit('user:open-history'));
    this.els.btnInfo.addEventListener('click', () => bus.emit('user:open-privacy'));
    this.els.noteInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        bus.emit('user:save-note', { note: this.els.noteInput.value });
      }
    });
  }

  bindBus() {
    bus.on('history:updated', ({ history }) => this.updateHome(history));
    bus.on('location:saved', () => this.showNoteBox());
    bus.on('note:saved', () => this.hideNoteBox());
    bus.on('note:skipped', () => this.hideNoteBox());
  }

  updateHome(history) {
    const has = history.length > 0;
    this.els.btnFind.disabled = !has;
    this.els.btnShare.disabled = !has;

    if (has) {
      const latest = history[0];
      this.els.statusTime.textContent = `${formatBadge(latest.timestamp)} at ${formatTime(latest.timestamp)}`;
      this.els.statusNote.textContent = latest.note || 'No note';
      this.els.statusBox.classList.add('active');
    } else {
      this.els.statusBox.classList.remove('active');
    }
  }

  showNoteBox() {
    this.els.noteInput.value = '';
    this.els.noteBox.classList.add('active');
    setTimeout(() => this.els.noteInput.focus(), 100);
  }

  hideNoteBox() {
    this.els.noteBox.classList.remove('active');
  }

  setSaveLoading(loading) {
    this.els.btnSave.disabled = loading;
    if (loading) {
      this.els.btnSave.innerHTML = '<span class="spinner"></span> Acquiring...';
    } else {
      this.els.btnSave.innerHTML = `${Icons.pin} Save location`;
    }
  }
}