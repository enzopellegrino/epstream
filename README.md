# Chrome Stream Capture

Una potente applicazione Electron per catturare finestre Chrome e trasmetterle in streaming tramite protocollo SRT.

## Caratteristiche

- 🖥️ **Cattura Finestre Chrome**: Rileva e cattura automaticamente le finestre Chrome aperte
- 📡 **Streaming SRT**: Trasmissione video in tempo reale tramite protocollo SRT
- ⚙️ **Gestione Profili**: Salva e gestisci profili di configurazione personalizzati
- 🖥️ **Server SRT**: Configura e gestisci server SRT esterni
- 📊 **Monitoraggio**: Dashboard in tempo reale per monitorare cattura e streaming
- 🎯 **Risoluzione 1920x1080**: Supporto nativo per Full HD
- 🔧 **Cross-Platform**: Supporto per Windows e macOS
- ☁️ **Cloud Ready**: Ottimizzato per EC2 G4.xlarge su Windows

## Tecnologie

- **Electron** - Framework principale cross-platform
- **Node.js** - Runtime JavaScript
- **FFmpeg** - Elaborazione video integrata
- **SRT Protocol** - Streaming video a bassa latenza
- **Electron Store** - Persistenza configurazioni

## Installazione

### Download Release
Scarica l'ultima versione dalle [GitHub Releases](../../releases):
- **Windows**: `.exe` installer
- **macOS**: `.dmg` package

### Build da Sorgente

```bash
# Clona il repository
git clone https://github.com/[username]/chrome-stream-capture.git
cd chrome-stream-capture

# Installa le dipendenze
npm install

# Avvia in modalità sviluppo
npm run dev

# Build per produzione
npm run build
```

## Configurazione

### Server SRT
1. Vai alla tab "SRT Servers"
2. Clicca "Add New Server"
3. Inserisci:
   - Nome server
   - Host/IP
   - Porta (default: 9999)
   - Modalità (Caller/Listener)
   - Latenza
   - Passphrase (opzionale)

### Profili di Cattura
1. Vai alla tab "Profiles"
2. Clicca "Add New Profile"
3. Configura:
   - Risoluzione video
   - Frame rate
   - Bitrate
   - Server SRT di destinazione

## Utilizzo

### Cattura Finestre Chrome
1. Apri Chrome con le finestre da catturare
2. Vai alla tab "Capture"
3. Clicca "Refresh Windows" per aggiornare la lista
4. Seleziona la finestra desiderata
5. Configura risoluzione e frame rate
6. Clicca "Start Capture"

### Streaming SRT
1. Assicurati che la cattura sia attiva
2. Vai alla tab "Stream"
3. Seleziona un server SRT configurato
4. Inserisci stream key (opzionale)
5. Configura bitrate e preset di encoding
6. Clicca "Start Stream"

### Monitoraggio
- La barra di stato mostra lo stato di cattura e streaming
- I log sono disponibili nella tab "Logs"
- Le informazioni di streaming sono visibili nel pannello "Stream Status"

## Configurazione EC2 G4.xlarge

Per l'utilizzo su Amazon EC2 G4.xlarge (Windows):

### Prerequisiti
- Istanza EC2 G4.xlarge con Windows Server
- Driver GPU NVIDIA installati
- Chrome installato
- Accesso RDP o GUI

### Setup
1. Scarica e installa l'applicazione
2. Configura i server SRT remoti
3. Avvia Chrome con le finestre da catturare
4. Configura i profili per il streaming

### Ottimizzazioni GPU
L'applicazione sfrutta automaticamente l'accelerazione hardware della GPU NVIDIA per:
- Encoding video H.264
- Riduzione latenza
- Migliori prestazioni di streaming

## API e Configurazioni

### Formati URL SRT Supportati
```
srt://host:port?mode=caller&latency=120&maxbw=10000k
srt://host:port?mode=listener&passphrase=mykey&streamid=stream123
```

### Preset di Qualità
- **Ultra Low (480p)**: 1 Mbps, preset ultrafast
- **Low (720p)**: 2.5 Mbps, preset veryfast  
- **Medium (1080p)**: 5 Mbps, preset veryfast
- **High (1080p)**: 8 Mbps, preset fast
- **Ultra High (1080p)**: 12 Mbps, preset medium

## Risoluzione Problemi

### Chrome Windows Non Rilevate
- Assicurati che Chrome sia in esecuzione
- Prova a riavviare l'applicazione
- Verifica i permessi di accesso allo schermo

### Errori di Streaming SRT
- Verifica la connessione di rete
- Controlla le configurazioni del server SRT
- Testa la connessione con "Test Connection"

### Problemi di Performance
- Riduci il bitrate di streaming
- Usa preset di encoding più veloci
- Verifica le risorse disponibili del sistema

## Sviluppo

### Struttura Progetto
```
src/
├── main/           # Processo principale Electron
├── renderer/       # Interfaccia utente
├── capture/        # Gestione cattura video
├── streaming/      # Gestione streaming SRT
├── config/         # Gestione configurazioni
└── utils/          # Utilità comuni
```

### Script Disponibili
- `npm start` - Avvia l'applicazione
- `npm run dev` - Modalità sviluppo con DevTools
- `npm run build` - Build per tutte le piattaforme
- `npm run build:win` - Build solo per Windows
- `npm run build:mac` - Build solo per macOS

### Debug
Usa `npm run dev` per aprire l'applicazione con DevTools attivi.

## Contributi

1. Fork del repository
2. Crea un branch per la feature (`git checkout -b feature/amazing-feature`)
3. Commit delle modifiche (`git commit -m 'Add amazing feature'`)
4. Push del branch (`git push origin feature/amazing-feature`)
5. Apri una Pull Request

## Licenza

Questo progetto è sotto licenza MIT. Vedi il file [LICENSE](LICENSE) per i dettagli.

## Supporto

Per supporto e segnalazione bug:
- Apri un [Issue](../../issues) su GitHub
- Controlla la documentazione nella tab "Logs" dell'applicazione

## Roadmap

- [ ] Supporto per streaming multipli simultanei
- [ ] Registrazione video locale
- [ ] Streaming RTMP/RTMPS
- [ ] Plugin per OBS Studio
- [ ] Supporto audio
- [ ] Streaming cloud integrato
