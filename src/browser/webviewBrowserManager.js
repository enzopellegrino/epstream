class WebviewBrowserManager {
  constructor() {
    this.isVisible = false;
    this.currentUrl = null;
    this.webview = null;
  }

  // Metodi per compatibilità con l'interfaccia esistente
  showBrowser(url = 'https://www.youtube.com') {
    // Questo sarà gestito dal renderer process
    return {
      success: true,
      message: 'Show browser command sent',
      url: url
    };
  }

  hideBrowser() {
    // Questo sarà gestito dal renderer process
    return {
      success: true,
      message: 'Hide browser command sent'
    };
  }

  toggleBrowser(url = 'https://www.youtube.com') {
    // Questo sarà gestito dal renderer process
    return {
      success: true,
      message: this.isVisible ? 'Hide browser command sent' : 'Show browser command sent',
      url: url
    };
  }

  navigateTo(url) {
    // Questo sarà gestito dal renderer process
    return {
      success: true,
      message: 'Navigate command sent',
      url: url
    };
  }

  getCurrentUrl() {
    return this.currentUrl;
  }

  getTitle() {
    return this.currentTitle || null;
  }

  // Metodi per aggiornare lo stato dal renderer
  updateState(isVisible, url, title) {
    this.isVisible = isVisible;
    this.currentUrl = url;
    this.currentTitle = title;
  }

  resizeBrowser(bounds) {
    // Non necessario con webview - si ridimensiona automaticamente
  }

  destroy() {
    this.isVisible = false;
    this.currentUrl = null;
    this.currentTitle = null;
  }
}

module.exports = WebviewBrowserManager;
