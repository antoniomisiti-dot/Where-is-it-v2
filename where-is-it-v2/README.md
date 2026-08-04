# Where is it? v2

PWA modulare per salvare e ritrovare la posizione dei tuoi oggetti. 100% locale, privacy-first.

## 🚀 Features

- **Salvataggio GPS** con alta precisione
- **Collezioni multiple** per organizzare i tuoi luoghi
- **Note opzionali** per ogni posizione
- **Cronologia** con badge temporali (Today/Yesterday)
- **Condivisione nativa** (Web Share API)
- **Mappe integrate** (Apple Maps su iOS, Google Maps altrove)
- **Offline-first** con Service Worker
- **Export/Import** dati in JSON
- **Privacy totale**: nessun tracking, nessun account, tutto locale

## 🏗️ Architettura

L'app segue un'architettura modulare a layer:

```
src/
├── core/           # Event Bus (comunicazione tra moduli)
├── data/           # Data Layer (IndexedDB)
├── layers/         # Business Logic e UI Layer
├── utils/          # Funzioni helper
└── app.js          # Entry point
```

### Layer

1. **Data Layer** (`db.js`): Accesso a IndexedDB per storage illimitato
2. **Business Layer** (`business.js`): Regole di business e gestione stato
3. **UI Layer** (`ui.js`): Rendering DOM e gestione eventi utente

### Comunicazione

Tutti i moduli comunicano tramite **Event Bus** (pattern Pub/Sub), permettendo:
- Disaccoppiamento completo tra i layer
- Sostituibilità dei componenti (es. swap IndexedDB ↔ Backend)
- Testing isolato di ogni modulo

## 🛠️ Sviluppo

### Prerequisiti

- Browser moderno con supporto a ES6 Modules e IndexedDB
- Server HTTPS (o localhost) per Service Worker e Geolocation

### Installazione

```bash
# Clona il repository
git clone https://github.com/antoniomisiti-dot/Where-is-it-v2.git

# Naviga nella cartella
cd Where-is-it-v2

# Avvia un server locale (opzionale, ma consigliato)
npx serve .
# oppure
python3 -m http.server 8000
```

### Struttura File

```
where-is-it-v2/
├── index.html          # HTML principale
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── assets/
│   └── style.css       # Stylesheet
└── src/
    ├── app.js          # Entry point
    ├── core/
    │   └── event-bus.js
    ├── data/
    │   └── db.js
    ├── layers/
    │   ├── business.js
    │   └── ui.js
    └── utils/
        └── helpers.js
```

## 📱 Installazione come PWA

1. Apri l'app nel browser (Chrome, Safari, Firefox)
2. Clicca su "Aggiungi a schermata home" o "Installa app"
3. L'app sarà disponibile offline come un'app nativa

## 🔒 Privacy

- ✅ Tutti i dati sono salvati localmente (IndexedDB)
- ✅ Nessun tracking o analytics
- ✅ Nessuna registrazione richiesta
- ✅ Export dati sempre disponibile
- ✅ Open source e auditabile

## 🚧 Roadmap

- [x] Refactoring modulare
- [x] IndexedDB e collezioni multiple
- [ ] Crittografia client-side (Web Crypto API)
- [ ] Sync multi-device (Zero-Knowledge)
- [ ] Notifiche push
- [ ] Mappa integrata (Leaflet/Mapbox)
- [ ] Foto allegate alle posizioni
- [ ] Dark/Light mode toggle

## 📄 License

MIT

---

**Where is it?** è sviluppato con ❤️ mantenendo la privacy come priorità assoluta.
