const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loading...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
    contextBridge.exposeInMainWorld('electronAPI', {
        // Chrome windows
        getChromeWindows: () => ipcRenderer.invoke('get-chrome-windows'),
        
        // Capture management
        startCapture: (options) => ipcRenderer.invoke('start-capture', options),
        stopCapture: () => ipcRenderer.invoke('stop-capture'),
        
        // Streaming management
        startStream: (options) => ipcRenderer.invoke('start-stream', options),
        stopStream: () => ipcRenderer.invoke('stop-stream'),
        
        // Configuration management
        saveProfile: (profile) => ipcRenderer.invoke('save-profile', profile),
        getProfiles: () => ipcRenderer.invoke('get-profiles'),
        deleteProfile: (profileId) => ipcRenderer.invoke('delete-profile', profileId),
        
        saveSRTServer: (server) => ipcRenderer.invoke('save-srt-server', server),
        getSRTServers: () => ipcRenderer.invoke('get-srt-servers'),
        deleteSRTServer: (serverId) => ipcRenderer.invoke('delete-srt-server', serverId),
        
        // Event listeners
        onCaptureEvent: (callback) => ipcRenderer.on('capture-event', callback),
        onStreamEvent: (callback) => ipcRenderer.on('stream-event', callback),
        
        // Embedded Browser APIs
        showEmbeddedBrowser: (url) => ipcRenderer.invoke('show-embedded-browser', url),
        hideEmbeddedBrowser: () => ipcRenderer.invoke('hide-embedded-browser'),
        toggleEmbeddedBrowser: (url) => ipcRenderer.invoke('toggle-embedded-browser', url),
        navigateEmbeddedBrowser: (url) => ipcRenderer.invoke('navigate-embedded-browser', url),
        getEmbeddedBrowserUrl: () => ipcRenderer.invoke('get-embedded-browser-url'),
        getEmbeddedBrowserTitle: () => ipcRenderer.invoke('get-embedded-browser-title'),
        
        // Remove listeners
        removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
    });
    
    console.log('Preload script loaded successfully');
} catch (error) {
    console.error('Error in preload script:', error);
}
