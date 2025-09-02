# EPStream - Chrome Window Capture & SRT Streaming

🎥 **Professional Chrome window capture tool with SRT streaming support**

EPStream è un'applicazione desktop cross-platform che permette di catturare finestre Chrome e trasmettere il contenuto via protocollo SRT (Secure Reliable Transport) verso server esterni.

## ✨ Funzionalità Principali

- 🖥️ **Cattura Finestre Chrome**: Cattura specifica finestre di Google Chrome
- 📡 **Streaming SRT**: Trasmissione video via protocollo SRT
- 🌐 **Browser Integrato**: Browser Chromium embedded nell'applicazione
- ⚙️ **Configurazione Avanzata**: Bitrate, risoluzione e preset personalizzabili
- 🔄 **Multi-Piattaforma**: Supporto completo per macOS, Windows e Linux
- 🛡️ **Auto-Detection**: Rilevamento automatico FFmpeg di sistema vs embedded

## 📋 Requisiti di Sistema

### FFmpeg con Supporto SRT (Raccomandato)

Per utilizzare le funzionalità di streaming SRT, è necessario avere FFmpeg installato sul sistema con supporto SRT:

#### macOS
```bash
# Con Homebrew
brew install ffmpeg

# Verifica supporto SRT
ffmpeg -protocols | grep srt
```

#### Windows
1. Scarica FFmpeg con supporto SRT da [ffmpeg.org](https://ffmpeg.org/download.html)
2. Estrai in `C:\ffmpeg\`
3. Aggiungi `C:\ffmpeg\bin` al PATH di sistema
4. Verifica: `ffmpeg -protocols | findstr srt`

#### Linux (Ubuntu/Debian)
```bash
# Installa FFmpeg
sudo apt update && sudo apt install ffmpeg

# Verifica supporto SRT
ffmpeg -protocols | grep srt
```

### Fallback Automatico

Se FFmpeg di sistema non è disponibile, l'applicazione userà automaticamente una versione embedded (senza supporto SRT). In questo caso:
- ✅ Cattura schermo funziona
- ❌ Streaming SRT non disponibile
- ⚠️ Viene mostrato un avviso all'utente

## 🚀 Installazione

### Download Release

Scarica l'installer appropriato dalla [pagina delle release](https://github.com/enzopellegrino/epstream/releases):

- **macOS Intel**: `EPStream-1.0.0.dmg`
- **macOS Apple Silicon**: `EPStream-1.0.0-arm64.dmg`
- **Windows Installer**: `EPStream Setup 1.0.0.exe`
- **Windows Portatile**: `EPStream 1.0.0.exe`
- **Linux AppImage**: `EPStream-1.0.0.AppImage`
- **Linux Debian**: `epstream_1.0.0_amd64.deb`

### Installazione Sviluppo

```bash
# Clona il repository
git clone https://github.com/enzopellegrino/epstream.git
cd epstream

# Installa dipendenze
npm install

# Avvia in modalità sviluppo
npm run dev

# Build per produzione
npm run build:mac    # macOS
npm run build:win    # Windows
npm run build:linux  # Linux
npm run build:all    # Tutte le piattaforme
```

## 🎯 Utilizzo

### 1. Configurazione Server SRT
- Inserisci l'URL del server SRT (es: `srt://server.example.com:9999`)
- Configura il bitrate desiderato (1-50 Mbps)

### 2. Selezione Sorgente
- **Finestre Chrome**: Seleziona una finestra Chrome specifica
- **Browser Integrato**: Usa il browser embedded
- **Desktop**: Cattura l'intero schermo

### 3. Avvio Streaming
- Clicca "Start Streaming"
- Monitora lo stato nella console
- Usa "Stop Streaming" per interrompere

## 🔧 Configurazione Avanzata

### Preset Video
- **ultrafast**: Minima latenza, qualità base
- **veryfast**: Buon compromesso (default)
- **fast**: Qualità migliore, latency maggiore
- **medium**: Alta qualità

### Risoluzioni Supportate
- 1920x1080 (Full HD) - Default
- 1280x720 (HD)
- 3840x2160 (4K)
- Personalizzata

### Bitrate
- **1-5 Mbps**: Streaming a banda ridotta
- **5-15 Mbps**: Qualità standard (raccomandato)
- **15-50 Mbps**: Alta qualità

## 🛠️ Architettura Tecnica

```
src/
├── main/               # Processo principale Electron
├── renderer/           # Interfaccia utente
├── capture/            # Gestione cattura video
├── streaming/          # Gestione streaming SRT
├── browser/            # Browser integrato
└── utils/              # Utilità (FFmpeg detection)
```

### Componenti Principali

- **Main Process**: Gestione finestra e API di sistema
- **Capture Manager**: Interfaccia con desktopCapturer di Electron
- **Streaming Manager**: Controllo processi FFmpeg
- **FFmpeg Detector**: Auto-rilevamento capabilities FFmpeg
- **Browser Manager**: Gestione webview integrato

## 🐛 Risoluzione Problemi

### "SRT protocol not supported"
- Installa FFmpeg di sistema con supporto SRT
- Verifica con: `ffmpeg -protocols | grep srt`

### "No Chrome windows found"
- Assicurati che Google Chrome sia in esecuzione
- Prova a ricaricare la lista sorgenti

### Errori di Connessione SRT
- Verifica l'URL del server SRT
- Controlla firewall e porte di rete
- Testa la connessione con tools esterni

### Performance Issues
- Riduci il bitrate o la risoluzione
- Usa preset più veloci (ultrafast/veryfast)
- Chiudi applicazioni non necessarie

## 📊 Logs e Debug

L'applicazione fornisce logs dettagliati:
- Console integrata nell'app
- Log FFmpeg in tempo reale
- Stato connessione SRT
- Performance metrics

## 🤝 Contribuire

1. Fork del repository
2. Crea un branch per la feature (`git checkout -b feature/amazing-feature`)
3. Commit delle modifiche (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Apri una Pull Request

## 📝 Licenza

Questo progetto è sotto licenza MIT. Vedi il file [LICENSE](LICENSE) per dettagli.

## 🙏 Riconoscimenti

- [Electron](https://electronjs.org/) - Framework desktop
- [FFmpeg](https://ffmpeg.org/) - Elaborazione video
- [SRT Alliance](https://www.srtalliance.org/) - Protocollo streaming

---

**Sviluppato da Enzo Pellegrino** | [GitHub](https://github.com/enzopellegrino/epstream)
