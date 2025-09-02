const { BrowserView, desktopCapturer } = require('electron');

class EmbeddedBrowserManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.browserView = null;
    this.isVisible = false;
  }

  createBrowserView() {
    if (this.browserView) {
      return this.browserView;
    }

    this.browserView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        webSecurity: false, // Per permettere streaming da domini esterni
        allowRunningInsecureContent: true
      }
    });

    // Non aggiungiamo automaticamente il browser view alla finestra
    // Questo verrà fatto solo quando showBrowser() viene chiamato
    
    // Setup events
    this.browserView.webContents.on('did-finish-load', () => {
      console.log('Embedded browser loaded:', this.browserView.webContents.getURL());
    });

    this.browserView.webContents.on('page-title-updated', (event, title) => {
      console.log('Page title updated:', title);
    });

    return this.browserView;
  }

  showBrowser(url = 'https://www.youtube.com') {
    if (!this.browserView) {
      this.createBrowserView();
    }

    // Se il browser view è stato rimosso, riaggiungilo
    if (!this.isVisible) {
      this.mainWindow.setBrowserView(this.browserView);
    }

    // Position the browser view in the dedicated browser container area
    // Dobbiamo calcolare la posizione della sezione browser nell'interfaccia
    const bounds = this.mainWindow.getBounds();
    const browserContainerHeight = 400; // Come definito nel CSS
    const headerHeight = 60; // Approssimativo header + tabs
    const controlsHeight = 200; // Spazio per i controlli sopra il browser container
    
    // Posiziona il browser nella sezione dedicata
    this.browserView.setBounds({ 
      x: 280, // Offset per lasciare spazio alla sidebar (se presente)
      y: headerHeight + controlsHeight,
      width: bounds.width - 320, // Larghezza meno sidebar e margini
      height: browserContainerHeight
    });

    this.browserView.webContents.loadURL(url);
    this.isVisible = true;

    return {
      success: true,
      message: 'Embedded browser shown',
      url: url
    };
  }

  hideBrowser() {
    if (this.browserView && this.isVisible) {
      // Nasconde completamente il browser view
      this.mainWindow.removeBrowserView(this.browserView);
      this.isVisible = false;
    }

    return {
      success: true,
      message: 'Embedded browser hidden'
    };
  }

  toggleBrowser(url) {
    if (this.isVisible) {
      return this.hideBrowser();
    } else {
      return this.showBrowser(url);
    }
  }

  navigateTo(url) {
    if (!this.browserView) {
      this.createBrowserView();
    }

    this.browserView.webContents.loadURL(url);
    return {
      success: true,
      message: 'Navigated to: ' + url,
      url: url
    };
  }

  getCurrentUrl() {
    if (!this.browserView) {
      return null;
    }

    return this.browserView.webContents.getURL();
  }

  getTitle() {
    if (!this.browserView) {
      return null;
    }

    return this.browserView.webContents.getTitle();
  }

  // Metodo per ottenere il MediaStream del browser embedded
  async getMediaStream() {
    if (!this.browserView) {
      throw new Error('Browser view not created');
    }

    // Usa l'API di Electron per catturare il contenuto del BrowserView
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 150, height: 150 }
    });

    // Trova la finestra del browser embedded
    const browserSource = sources.find(source => 
      source.name.includes('Electron') || 
      source.name.includes(this.getTitle())
    );

    return browserSource;
  }

  resizeBrowser(bounds) {
    if (this.browserView && this.isVisible) {
      // Calcola la nuova posizione basata sui bounds della finestra
      const browserContainerHeight = 400;
      const headerHeight = 60;
      const controlsHeight = 200;
      
      this.browserView.setBounds({
        x: 280,
        y: headerHeight + controlsHeight,
        width: bounds.width - 320,
        height: browserContainerHeight
      });
    }
  }

  // Metodo per ottenere le coordinate corrette del browser container
  getBrowserContainerBounds() {
    const bounds = this.mainWindow.getBounds();
    const browserContainerHeight = 400;
    const headerHeight = 60;
    const controlsHeight = 200;
    
    return {
      x: 280,
      y: headerHeight + controlsHeight,
      width: bounds.width - 320,
      height: browserContainerHeight
    };
  }

  destroy() {
    if (this.browserView) {
      this.mainWindow.removeBrowserView(this.browserView);
      this.browserView.webContents.close();
      this.browserView = null;
      this.isVisible = false;
    }
  }
}

module.exports = EmbeddedBrowserManager;
