const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const Store = require('electron-store');
const CaptureManager = require('../capture/captureManager');
const StreamingManager = require('../streaming/streamingManager');
const WebviewBrowserManager = require('../browser/webviewBrowserManager');

// Initialize configuration store
const store = new Store();

let mainWindow;
let captureManager;
let streamingManager;
let embeddedBrowserManager;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // Abilita il supporto per webview
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools only if explicitly requested
  if (process.argv.includes('--debug') || process.argv.includes('--inspect')) {
    mainWindow.webContents.openDevTools();
  }
  
  // Always open DevTools in development for debugging
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Log when page is ready
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('Renderer process loaded successfully');
  });

  // Handle any loading errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load renderer:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (captureManager) {
      captureManager.stopCapture();
    }
    if (streamingManager) {
      streamingManager.stopStream();
    }
    if (embeddedBrowserManager) {
      embeddedBrowserManager.destroy();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  
  // Initialize managers
  captureManager = new CaptureManager();
  streamingManager = new StreamingManager();
  embeddedBrowserManager = new WebviewBrowserManager();

  // Setup event forwarding to renderer
  streamingManager.on('stream-log', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('stream-event', { type: 'log', data });
    }
  });

  streamingManager.on('stream-connected', () => {
    if (mainWindow) {
      mainWindow.webContents.send('stream-event', { type: 'connected' });
    }
  });

  streamingManager.on('stream-error', (error) => {
    if (mainWindow) {
      mainWindow.webContents.send('stream-event', { type: 'error', data: error });
    }
  });

  captureManager.on('capture-started', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('capture-event', { type: 'started', data });
    }
  });

  captureManager.on('capture-error', (error) => {
    if (mainWindow) {
      mainWindow.webContents.send('capture-event', { type: 'error', data: error });
    }
  });

  // Create default SRT server if none exist
  const existingServers = store.get('srtServers', []);
  if (existingServers.length === 0) {
    const defaultServer = {
      id: 'default-test-server',
      name: 'Test SRT Server',
      description: 'Local test server for development',
      host: 'localhost',
      port: 9999,
      mode: 'caller',
      latency: 120,
      passphrase: '',
      streamid: '',
      maxbw: '10000k',
      pbkeylen: 16,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.set('srtServers', [defaultServer]);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-chrome-windows', async () => {
  try {
    console.log('Getting Chrome windows...');
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 150, height: 150 }
    });
    
    console.log('Total sources found:', sources.length);
    
    // Filter Chrome windows - expanded search criteria
    const chromeWindows = sources.filter(source => {
      const name = source.name.toLowerCase();
      const isChrome = name.includes('chrome') || 
                      name.includes('google chrome') ||
                      name.includes('google') ||
                      name.includes('chromium') ||
                      source.name === 'Google'; // Exact match
      if (isChrome) {
        console.log('Found Chrome/Google window:', source.name);
      }
      return isChrome;
    });
    
    console.log('Chrome windows found:', chromeWindows.length);
    
    return chromeWindows;
  } catch (error) {
    console.error('Error getting Chrome windows:', error);
    return [];
  }
});

ipcMain.handle('start-capture', async (event, options) => {
  try {
    return await captureManager.startCapture(options);
  } catch (error) {
    console.error('Error starting capture:', error);
    throw error;
  }
});

ipcMain.handle('stop-capture', async () => {
  try {
    return await captureManager.stopCapture();
  } catch (error) {
    console.error('Error stopping capture:', error);
    throw error;
  }
});

ipcMain.handle('start-stream', async (event, options) => {
  try {
    return await streamingManager.startStream(options);
  } catch (error) {
    console.error('Error starting stream:', error);
    throw error;
  }
});

ipcMain.handle('stop-stream', async () => {
  try {
    return await streamingManager.stopStream();
  } catch (error) {
    console.error('Error stopping stream:', error);
    throw error;
  }
});

// Configuration handlers
ipcMain.handle('save-profile', (event, profile) => {
  const profiles = store.get('profiles', []);
  const existingIndex = profiles.findIndex(p => p.id === profile.id);
  
  if (existingIndex >= 0) {
    profiles[existingIndex] = profile;
  } else {
    profiles.push(profile);
  }
  
  store.set('profiles', profiles);
  return true;
});

ipcMain.handle('get-profiles', () => {
  return store.get('profiles', []);
});

ipcMain.handle('delete-profile', (event, profileId) => {
  const profiles = store.get('profiles', []);
  const filteredProfiles = profiles.filter(p => p.id !== profileId);
  store.set('profiles', filteredProfiles);
  return true;
});

ipcMain.handle('save-srt-server', (event, server) => {
  const servers = store.get('srtServers', []);
  const existingIndex = servers.findIndex(s => s.id === server.id);
  
  if (existingIndex >= 0) {
    servers[existingIndex] = server;
  } else {
    servers.push(server);
  }
  
  store.set('srtServers', servers);
  return true;
});

ipcMain.handle('get-srt-servers', () => {
  return store.get('srtServers', []);
});

ipcMain.handle('delete-srt-server', (event, serverId) => {
  const servers = store.get('srtServers', []);
  const filteredServers = servers.filter(s => s.id !== serverId);
  store.set('srtServers', filteredServers);
  return true;
});

// Embedded Browser IPC handlers
ipcMain.handle('show-embedded-browser', (event, url) => {
  return embeddedBrowserManager.showBrowser(url);
});

ipcMain.handle('hide-embedded-browser', () => {
  return embeddedBrowserManager.hideBrowser();
});

ipcMain.handle('toggle-embedded-browser', (event, url) => {
  return embeddedBrowserManager.toggleBrowser(url);
});

ipcMain.handle('navigate-embedded-browser', (event, url) => {
  return embeddedBrowserManager.navigateTo(url);
});

ipcMain.handle('get-embedded-browser-url', () => {
  return embeddedBrowserManager.getCurrentUrl();
});

ipcMain.handle('get-embedded-browser-title', () => {
  return embeddedBrowserManager.getTitle();
});

module.exports = { mainWindow };
