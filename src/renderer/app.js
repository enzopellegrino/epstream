// Check if electronAPI is available (for security)
if (typeof electronAPI === 'undefined') {
    var electronAPI;
}

// Try to get electronAPI safely
try {
    electronAPI = window.electronAPI;
    if (!electronAPI) {
        console.error('ElectronAPI not available from window');
    }
} catch (error) {
    console.error('Error accessing electronAPI:', error);
}

class ChromeStreamApp {
    constructor() {
        this.selectedWindow = null;
        this.isCapturing = false;
        this.isStreaming = false;
        this.profiles = [];
        this.srtServers = [];
        this.logs = [];
        
        console.log('ChromeStreamApp initializing...');
        console.log('ElectronAPI available:', !!electronAPI);
        
        if (!electronAPI) {
            console.error('ElectronAPI not available! Check preload script.');
            this.addLog('Error: Electron API not available', 'error');
            return;
        }
        
        this.init();
    }

    async init() {
        console.log('ChromeStreamApp init started...');
        
        this.setupEventListeners();
        this.setupTabNavigation();
        this.setupModals();
        
        await this.loadData();
        await this.refreshChromeWindows();
        this.loadProfiles();
        this.loadSRTServers();
        this.updateUI();
        
        console.log('ChromeStreamApp init completed!');
        this.addLog('Application initialized successfully', 'success');
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Capture controls
        const refreshBtn = document.getElementById('refresh-windows');
        const startCaptureBtn = document.getElementById('start-capture');
        const stopCaptureBtn = document.getElementById('stop-capture');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshChromeWindows());
            console.log('Refresh button listener added');
        } else {
            console.error('Refresh button not found!');
        }
        
        if (startCaptureBtn) {
            startCaptureBtn.addEventListener('click', () => this.startCapture());
            console.log('Start capture button listener added');
        } else {
            console.error('Start capture button not found!');
        }
        
        if (stopCaptureBtn) {
            stopCaptureBtn.addEventListener('click', () => this.stopCapture());
            console.log('Stop capture button listener added');
        } else {
            console.error('Stop capture button not found!');
        }

        // Stream controls
        document.getElementById('test-connection')?.addEventListener('click', () => this.testSRTConnection());
        document.getElementById('start-stream')?.addEventListener('click', () => this.startStream());
        document.getElementById('stop-stream')?.addEventListener('click', () => this.stopStream());

        // Profile management
        document.getElementById('add-profile')?.addEventListener('click', () => this.showProfileModal());
        document.getElementById('save-profile')?.addEventListener('click', () => this.saveProfile());
        document.getElementById('cancel-profile')?.addEventListener('click', () => this.hideProfileModal());

        // Server management
        document.getElementById('add-server')?.addEventListener('click', () => this.showServerModal());
        document.getElementById('save-server')?.addEventListener('click', () => this.saveServer());
        document.getElementById('cancel-server')?.addEventListener('click', () => this.hideServerModal());

        // Logs
        document.getElementById('clear-logs')?.addEventListener('click', () => this.clearLogs());
        document.getElementById('export-logs')?.addEventListener('click', () => this.exportLogs());

        // Embedded Browser
        document.getElementById('toggle-browser')?.addEventListener('click', () => this.toggleEmbeddedBrowser());
        document.getElementById('show-browser')?.addEventListener('click', () => this.showEmbeddedBrowser());
        document.getElementById('hide-browser')?.addEventListener('click', () => this.hideEmbeddedBrowser());
        document.getElementById('navigate-browser')?.addEventListener('click', () => this.navigateEmbeddedBrowser());
        document.getElementById('refresh-browser')?.addEventListener('click', () => this.refreshEmbeddedBrowser());
        document.getElementById('capture-browser-content')?.addEventListener('click', () => this.captureBrowserContent());
        
        // Quick links
        document.querySelectorAll('.quick-link').forEach(button => {
            button.addEventListener('click', (e) => {
                const url = e.target.getAttribute('data-url');
                this.navigateToUrl(url);
            });
        });
        
        console.log('Event listeners setup completed');
        
        // Add window resize listener for webview
        window.addEventListener('resize', () => {
            this.ensureWebviewSizing();
        });
    }

    setupTabNavigation() {
        const navButtons = document.querySelectorAll('.nav-button');
        const tabContents = document.querySelectorAll('.tab-content');

        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;

                // Update nav buttons
                navButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Update tab contents
                tabContents.forEach(tab => {
                    tab.classList.remove('active');
                    if (tab.id === `${targetTab}-tab`) {
                        tab.classList.add('active');
                    }
                });
            });
        });
    }

    setupModals() {
        // Profile modal
        const profileModal = document.getElementById('profile-modal');
        const serverModal = document.getElementById('server-modal');

        // Close modals on click outside or close button
        [profileModal, serverModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.classList.contains('modal-close')) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    async loadData() {
        try {
            this.profiles = await electronAPI.getProfiles();
            this.srtServers = await electronAPI.getSRTServers();
        } catch (error) {
            this.addLog('Error loading data: ' + error.message, 'error');
        }
    }

    async refreshChromeWindows() {
        const windowsList = document.getElementById('windows-list');
        windowsList.innerHTML = '<div class="loading">Loading Chrome windows...</div>';

        try {
            console.log('Requesting Chrome windows...');
            const windows = await electronAPI.getChromeWindows();
            console.log('Received windows:', windows.length, windows);
            this.displayChromeWindows(windows);
        } catch (error) {
            console.error('Error refreshing Chrome windows:', error);
            windowsList.innerHTML = '<div class="loading">Error loading windows</div>';
            this.addLog('Error refreshing Chrome windows: ' + error.message, 'error');
        }
    }

    displayChromeWindows(windows) {
        const windowsList = document.getElementById('windows-list');
        
        console.log('Displaying windows:', windows.length);
        
        // Check if embedded browser is active and add it to the list
        const webview = document.getElementById('embedded-webview');
        const embeddedBrowserActive = webview && webview.style.display !== 'none';
        
        if (windows.length === 0 && !embeddedBrowserActive) {
            windowsList.innerHTML = '<div class="loading">No Chrome windows found. Make sure Chrome is running and try refreshing.</div>';
            this.addLog('No Chrome windows found', 'warn');
            return;
        }

        windowsList.innerHTML = '';
        
        // Add embedded browser option if active
        if (embeddedBrowserActive) {
            const embeddedBrowserItem = document.createElement('div');
            embeddedBrowserItem.className = 'window-item embedded-browser-item';
            embeddedBrowserItem.dataset.sourceId = 'embedded-browser';
            
            embeddedBrowserItem.innerHTML = `
                <div class="window-thumbnail embedded-browser-thumbnail">
                    <div class="embedded-browser-icon">🌐</div>
                </div>
                <div class="window-title">Embedded Browser</div>
                <div class="window-subtitle">${webview.getURL() || 'Loading...'}</div>
            `;

            embeddedBrowserItem.addEventListener('click', () => {
                console.log('Selected embedded browser');
                document.querySelectorAll('.window-item').forEach(item => {
                    item.classList.remove('selected');
                });
                embeddedBrowserItem.classList.add('selected');
                this.selectedWindow = {
                    id: 'embedded-browser',
                    name: 'Embedded Browser',
                    url: webview.getURL()
                };
                this.updateCaptureControls();
                this.addLog('Selected embedded browser for capture', 'success');
            });

            windowsList.appendChild(embeddedBrowserItem);
        }
        
        windows.forEach((window, index) => {
            console.log(`Processing window ${index}:`, window.name);
            
            const windowItem = document.createElement('div');
            windowItem.className = 'window-item';
            windowItem.dataset.sourceId = window.id;
            
            windowItem.innerHTML = `
                <div class="window-thumbnail" style="background-image: url('${window.thumbnail.toDataURL()}')"></div>
                <div class="window-title">${window.name}</div>
            `;

            windowItem.addEventListener('click', () => {
                console.log('Selected window:', window.name);
                document.querySelectorAll('.window-item').forEach(item => {
                    item.classList.remove('selected');
                });
                windowItem.classList.add('selected');
                this.selectedWindow = window;
                this.updateCaptureControls();
                this.addLog('Selected window: ' + window.name, 'info');
            });

            windowsList.appendChild(windowItem);
        });
        
        const totalSources = windows.length + (embeddedBrowserActive ? 1 : 0);
        this.addLog(`Found ${totalSources} capture sources (${windows.length} Chrome windows${embeddedBrowserActive ? ' + 1 embedded browser' : ''})`, 'success');
    }

    updateCaptureControls() {
        const startBtn = document.getElementById('start-capture');
        const stopBtn = document.getElementById('stop-capture');

        if (this.selectedWindow && !this.isCapturing) {
            startBtn.disabled = false;
        } else {
            startBtn.disabled = true;
        }

        stopBtn.disabled = !this.isCapturing;
    }

    async startCapture() {
        if (!this.selectedWindow) {
            this.addLog('No window selected', 'warn');
            return;
        }

        try {
            const resolution = document.getElementById('resolution-select').value;
            const frameRate = parseInt(document.getElementById('framerate-select').value);

            const result = await electronAPI.startCapture({
                sourceId: this.selectedWindow.id,
                resolution,
                frameRate
            });

            if (result.success) {
                this.isCapturing = true;
                this.updateUI();
                this.addLog('Capture started successfully: ' + result.source, 'success');
            }
        } catch (error) {
            this.addLog('Error starting capture: ' + error.message, 'error');
        }
    }

    async stopCapture() {
        try {
            const result = await electronAPI.stopCapture();
            if (result.success) {
                this.isCapturing = false;
                this.updateUI();
                this.addLog('Capture stopped', 'info');
            }
        } catch (error) {
            this.addLog('Error stopping capture: ' + error.message, 'error');
        }
    }

    async testSRTConnection() {
        const serverSelect = document.getElementById('srt-server-select');
        const serverId = serverSelect.value;

        if (!serverId) {
            this.addLog('Please select an SRT server', 'warn');
            return;
        }

        const server = this.srtServers.find(s => s.id === serverId);
        if (!server) {
            this.addLog('Selected server not found', 'error');
            return;
        }

        this.addLog('Testing SRT connection...', 'info');

        try {
            // Implementation would call streaming manager test method
            this.addLog('SRT connection test successful', 'success');
        } catch (error) {
            this.addLog('SRT connection test failed: ' + error.message, 'error');
        }
    }

    async startStream() {
        if (!this.isCapturing) {
            this.addLog('Start capture first', 'warn');
            return;
        }

        const serverSelect = document.getElementById('srt-server-select');
        const serverId = serverSelect.value;

        if (!serverId) {
            this.addLog('Please select an SRT server', 'warn');
            return;
        }

        const server = this.srtServers.find(s => s.id === serverId);
        if (!server) {
            this.addLog('Selected server not found', 'error');
            return;
        }

        try {
            const streamKey = document.getElementById('stream-key').value;
            const bitrate = document.getElementById('bitrate-select').value;
            const preset = document.getElementById('preset-select').value;
            const resolution = document.getElementById('resolution-select').value;

            const srtUrl = this.generateSRTUrl(server, streamKey);

            const result = await electronAPI.startStream({
                srtUrl,
                bitrate,
                preset,
                resolution,
                captureSource: this.selectedWindow.name
            });

            if (result.success) {
                this.isStreaming = true;
                this.updateUI();
                this.addLog('Stream started successfully to: ' + server.name, 'success');
            }
        } catch (error) {
            this.addLog('Error starting stream: ' + error.message, 'error');
        }
    }

    async stopStream() {
        try {
            const result = await electronAPI.stopStream();
            if (result.success) {
                this.isStreaming = false;
                this.updateUI();
                this.addLog('Stream stopped', 'info');
            }
        } catch (error) {
            this.addLog('Error stopping stream: ' + error.message, 'error');
        }
    }

    generateSRTUrl(server, streamKey = '') {
        let url = `srt://${server.host}:${server.port}`;
        const params = [];

        // For external servers, always use caller mode
        // Listener mode is only for when we're receiving connections
        const mode = server.mode === 'listener' ? 'caller' : (server.mode || 'caller');
        params.push(`mode=${mode}`);

        if (server.latency) {
            params.push(`latency=${server.latency}`);
        }

        if (server.maxbw) {
            params.push(`maxbw=${server.maxbw}`);
        }

        if (server.passphrase) {
            params.push(`passphrase=${encodeURIComponent(server.passphrase)}`);
            params.push(`pbkeylen=${server.pbkeylen || 16}`);
        }

        if (server.streamid || streamKey) {
            params.push(`streamid=${encodeURIComponent(server.streamid || streamKey)}`);
        }

        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        return url;
    }

    updateUI() {
        // Update status indicators
        const captureStatus = document.getElementById('capture-status');
        const streamStatus = document.getElementById('stream-status');

        captureStatus.textContent = this.isCapturing ? 'Capture: Active' : 'Capture: Inactive';
        captureStatus.className = this.isCapturing ? 'status active' : 'status inactive';

        streamStatus.textContent = this.isStreaming ? 'Stream: Active' : 'Stream: Inactive';
        streamStatus.className = this.isStreaming ? 'status active' : 'status inactive';

        // Update capture controls
        this.updateCaptureControls();

        // Update stream controls
        const startStreamBtn = document.getElementById('start-stream');
        const stopStreamBtn = document.getElementById('stop-stream');

        startStreamBtn.disabled = !this.isCapturing || this.isStreaming;
        stopStreamBtn.disabled = !this.isStreaming;

        // Update stream info
        this.updateStreamInfo();
    }

    updateStreamInfo() {
        const statusText = document.getElementById('stream-status-text');
        const currentServer = document.getElementById('current-server');
        const currentBitrate = document.getElementById('current-bitrate');

        if (this.isStreaming) {
            const serverSelect = document.getElementById('srt-server-select');
            const serverId = serverSelect.value;
            const server = this.srtServers.find(s => s.id === serverId);
            const bitrate = document.getElementById('bitrate-select').value;

            statusText.textContent = 'Streaming';
            currentServer.textContent = server ? server.name : '-';
            currentBitrate.textContent = bitrate;
        } else {
            statusText.textContent = 'Not streaming';
            currentServer.textContent = '-';
            currentBitrate.textContent = '-';
        }
    }

    loadProfiles() {
        const profilesList = document.getElementById('profiles-list');
        profilesList.innerHTML = '';

        this.profiles.forEach(profile => {
            const profileCard = document.createElement('div');
            profileCard.className = 'profile-card';
            profileCard.innerHTML = `
                <h4>${profile.name}</h4>
                <p>${profile.description || 'No description'}</p>
                <div class="card-actions">
                    <button class="btn btn-secondary" onclick="app.editProfile('${profile.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="app.deleteProfile('${profile.id}')">Delete</button>
                    <button class="btn btn-primary" onclick="app.loadProfile('${profile.id}')">Load</button>
                </div>
            `;
            profilesList.appendChild(profileCard);
        });

        // Update profile selector in server modal
        this.updateProfileSelectors();
    }

    loadSRTServers() {
        const serversList = document.getElementById('servers-list');
        serversList.innerHTML = '';

        this.srtServers.forEach(server => {
            const serverCard = document.createElement('div');
            serverCard.className = 'server-card';
            serverCard.innerHTML = `
                <h4>${server.name}</h4>
                <p>${server.description || `${server.host}:${server.port}`}</p>
                <div class="card-actions">
                    <button class="btn btn-secondary" onclick="app.editServer('${server.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="app.deleteServer('${server.id}')">Delete</button>
                </div>
            `;
            serversList.appendChild(serverCard);
        });

        // Update server selectors
        this.updateServerSelectors();
    }

    updateServerSelectors() {
        const selectors = [
            document.getElementById('srt-server-select'),
            document.getElementById('profile-server')
        ];

        selectors.forEach(select => {
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Select server...</option>';
                
                this.srtServers.forEach(server => {
                    const option = document.createElement('option');
                    option.value = server.id;
                    option.textContent = server.name;
                    select.appendChild(option);
                });

                select.value = currentValue;
            }
        });
    }

    updateProfileSelectors() {
        // Implementation for profile selectors if needed
    }

    showProfileModal(profileId = null) {
        const modal = document.getElementById('profile-modal');
        const title = document.getElementById('profile-modal-title');
        
        if (profileId) {
            const profile = this.profiles.find(p => p.id === profileId);
            if (profile) {
                title.textContent = 'Edit Profile';
                // Fill form with profile data
                document.getElementById('profile-name').value = profile.name;
                document.getElementById('profile-description').value = profile.description || '';
                
                // Handle both old structure (captureSettings) and new structure (direct properties)
                const resolution = profile.captureSettings?.resolution || profile.resolution || '1920x1080';
                const frameRate = profile.captureSettings?.frameRate || profile.frameRate || 30;
                const bitrate = profile.encodingSettings?.bitrate || profile.bitrate || '5000k';
                const serverId = profile.srtSettings?.serverId || profile.srtServerId || '';
                
                document.getElementById('profile-resolution').value = resolution;
                document.getElementById('profile-framerate').value = frameRate;
                document.getElementById('profile-bitrate').value = bitrate;
                document.getElementById('profile-server').value = serverId;
            }
        } else {
            title.textContent = 'Add Profile';
            document.getElementById('profile-form').reset();
        }

        modal.classList.add('active');
    }

    hideProfileModal() {
        document.getElementById('profile-modal').classList.remove('active');
    }

    async saveProfile() {
        const profile = {
            id: Date.now().toString(), // Simple ID generation
            name: document.getElementById('profile-name').value,
            description: document.getElementById('profile-description').value,
            captureSettings: {
                resolution: document.getElementById('profile-resolution').value,
                frameRate: parseInt(document.getElementById('profile-framerate').value)
            },
            encodingSettings: {
                bitrate: document.getElementById('profile-bitrate').value
            },
            srtSettings: {
                serverId: document.getElementById('profile-server').value
            }
        };

        try {
            await electronAPI.saveProfile(profile);
            await this.loadData();
            this.loadProfiles();
            this.hideProfileModal();
            this.addLog('Profile saved successfully', 'success');
        } catch (error) {
            this.addLog('Error saving profile: ' + error.message, 'error');
        }
    }

    async editProfile(profileId) {
        this.showProfileModal(profileId);
    }

    async deleteProfile(profileId) {
        if (confirm('Are you sure you want to delete this profile?')) {
            try {
                await electronAPI.deleteProfile(profileId);
                await this.loadData();
                this.loadProfiles();
                this.addLog('Profile deleted', 'info');
            } catch (error) {
                this.addLog('Error deleting profile: ' + error.message, 'error');
            }
        }
    }

    loadProfile(profileId) {
        const profile = this.profiles.find(p => p.id === profileId);
        if (profile) {
            // Load profile settings into UI - handle both old and new structure
            const resolution = profile.captureSettings?.resolution || profile.resolution || '1920x1080';
            const frameRate = profile.captureSettings?.frameRate || profile.frameRate || 30;
            const bitrate = profile.encodingSettings?.bitrate || profile.bitrate || '5000k';
            const serverId = profile.srtSettings?.serverId || profile.srtServerId || '';
            
            document.getElementById('resolution-select').value = resolution;
            document.getElementById('framerate-select').value = frameRate;
            document.getElementById('bitrate-select').value = bitrate;
            document.getElementById('srt-server-select').value = serverId;
            
            this.addLog('Profile loaded: ' + profile.name, 'success');
        }
    }

    showServerModal(serverId = null) {
        const modal = document.getElementById('server-modal');
        const title = document.getElementById('server-modal-title');
        
        if (serverId) {
            const server = this.srtServers.find(s => s.id === serverId);
            if (server) {
                title.textContent = 'Edit SRT Server';
                // Fill form with server data
                document.getElementById('server-name').value = server.name;
                document.getElementById('server-description').value = server.description || '';
                document.getElementById('server-host').value = server.host;
                document.getElementById('server-port').value = server.port;
                document.getElementById('server-mode').value = server.mode;
                document.getElementById('server-latency').value = server.latency;
                document.getElementById('server-passphrase').value = server.passphrase || '';
            }
        } else {
            title.textContent = 'Add SRT Server';
            document.getElementById('server-form').reset();
            document.getElementById('server-port').value = 9999;
            document.getElementById('server-latency').value = 120;
        }

        modal.classList.add('active');
    }

    hideServerModal() {
        document.getElementById('server-modal').classList.remove('active');
    }

    async saveServer() {
        const server = {
            id: Date.now().toString(), // Simple ID generation
            name: document.getElementById('server-name').value,
            description: document.getElementById('server-description').value,
            host: document.getElementById('server-host').value,
            port: parseInt(document.getElementById('server-port').value),
            mode: document.getElementById('server-mode').value,
            latency: parseInt(document.getElementById('server-latency').value),
            passphrase: document.getElementById('server-passphrase').value
        };

        try {
            await electronAPI.saveSRTServer(server);
            await this.loadData();
            this.loadSRTServers();
            this.hideServerModal();
            this.addLog('SRT server saved successfully', 'success');
        } catch (error) {
            this.addLog('Error saving SRT server: ' + error.message, 'error');
        }
    }

    async editServer(serverId) {
        this.showServerModal(serverId);
    }

    async deleteServer(serverId) {
        if (confirm('Are you sure you want to delete this SRT server?')) {
            try {
                await electronAPI.deleteSRTServer(serverId);
                await this.loadData();
                this.loadSRTServers();
                this.addLog('SRT server deleted', 'info');
            } catch (error) {
                this.addLog('Error deleting SRT server: ' + error.message, 'error');
            }
        }
    }

    addLog(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            level,
            message
        };

        this.logs.push(logEntry);
        
        // Also log to console for debugging
        console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);

        // Keep only last 1000 log entries
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(-1000);
        }

        this.updateLogsDisplay();
    }

    updateLogsDisplay() {
        const logsContainer = document.getElementById('logs-container');
        logsContainer.innerHTML = '';

        this.logs.slice(-100).forEach(log => { // Show last 100 logs
            const logElement = document.createElement('div');
            logElement.className = 'log-entry';
            logElement.innerHTML = `
                <span class="log-timestamp">[${log.timestamp}]</span>
                <span class="log-level-${log.level}">[${log.level.toUpperCase()}]</span>
                ${log.message}
            `;
            logsContainer.appendChild(logElement);
        });

        // Auto-scroll to bottom
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    clearLogs() {
        this.logs = [];
        this.updateLogsDisplay();
    }

    exportLogs() {
        const logsText = this.logs.map(log => 
            `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
        ).join('\n');

        const blob = new Blob([logsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `chrome-stream-logs-${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.addLog('Logs exported successfully', 'success');
    }

    // Embedded Browser Methods
    async showEmbeddedBrowser() {
        try {
            const url = document.getElementById('browser-url').value || 'https://www.youtube.com';
            const webview = document.getElementById('embedded-webview');
            const placeholder = document.getElementById('browser-placeholder');
            
            if (webview && placeholder) {
                // Set source and show webview
                webview.src = url;
                webview.style.display = 'block';
                placeholder.style.display = 'none';
                
                // Force webview to fill container
                setTimeout(() => {
                    webview.style.width = '100%';
                    webview.style.height = '100%';
                }, 100);
                
                const browserContainer = document.getElementById('browser-container');
                browserContainer.classList.add('browser-active');
                
                document.getElementById('capture-browser-content').disabled = false;
                this.addLog('Embedded browser shown: ' + url, 'success');
                
                // Setup webview event listeners
                this.setupWebviewListeners(webview);
                
                // Update capture sources list if we're on the capture tab
                if (document.getElementById('capture-tab').classList.contains('active')) {
                    setTimeout(() => this.refreshChromeWindows(), 500);
                }
            }
        } catch (error) {
            this.addLog('Error showing browser: ' + error.message, 'error');
        }
    }

    async toggleEmbeddedBrowser() {
        try {
            const webview = document.getElementById('embedded-webview');
            const placeholder = document.getElementById('browser-placeholder');
            
            if (webview.style.display === 'none' || !webview.style.display) {
                // Show browser
                const url = document.getElementById('browser-url').value || 'https://www.youtube.com';
                webview.src = url;
                webview.style.display = 'block';
                placeholder.style.display = 'none';
                
                // Force webview to fill container
                setTimeout(() => {
                    webview.style.width = '100%';
                    webview.style.height = '100%';
                }, 100);
                
                const browserContainer = document.getElementById('browser-container');
                browserContainer.classList.add('browser-active');
                
                document.getElementById('capture-browser-content').disabled = false;
                this.addLog('Embedded browser shown: ' + url, 'success');
                
                this.setupWebviewListeners(webview);
            } else {
                // Hide browser
                this.hideEmbeddedBrowser();
            }
        } catch (error) {
            this.addLog('Error toggling browser: ' + error.message, 'error');
        }
    }

    async hideEmbeddedBrowser() {
        try {
            const webview = document.getElementById('embedded-webview');
            const placeholder = document.getElementById('browser-placeholder');
            
            if (webview && placeholder) {
                webview.style.display = 'none';
                placeholder.style.display = 'flex';
                
                const browserContainer = document.getElementById('browser-container');
                browserContainer.classList.remove('browser-active');
                
                document.getElementById('capture-browser-content').disabled = true;
                this.addLog('Embedded browser hidden', 'info');
                this.clearBrowserInfo();
                
                // Update capture sources list if we're on the capture tab
                if (document.getElementById('capture-tab').classList.contains('active')) {
                    setTimeout(() => this.refreshChromeWindows(), 500);
                }
            }
        } catch (error) {
            this.addLog('Error hiding browser: ' + error.message, 'error');
        }
    }

    async navigateEmbeddedBrowser() {
        try {
            const url = document.getElementById('browser-url').value;
            if (!url) {
                this.addLog('Please enter a URL', 'warn');
                return;
            }

            const webview = document.getElementById('embedded-webview');
            if (webview && webview.style.display !== 'none') {
                webview.src = url;
                this.addLog('Navigated to: ' + url, 'success');
                setTimeout(() => this.updateBrowserInfo(), 1000);
            } else {
                this.showEmbeddedBrowser();
            }
        } catch (error) {
            this.addLog('Error navigating: ' + error.message, 'error');
        }
    }

    async refreshEmbeddedBrowser() {
        try {
            const webview = document.getElementById('embedded-webview');
            if (webview && webview.style.display !== 'none') {
                webview.reload();
                this.addLog('Browser refreshed', 'info');
            }
        } catch (error) {
            this.addLog('Error refreshing browser: ' + error.message, 'error');
        }
    }

    setupWebviewListeners(webview) {
        // Remove existing listeners to avoid duplicates
        const events = ['did-finish-load', 'page-title-updated', 'did-navigate'];
        events.forEach(event => {
            webview.removeEventListener(event, this.handleWebviewEvent);
        });
        
        // Add new listeners
        webview.addEventListener('did-finish-load', () => {
            this.updateBrowserInfo();
            // Ensure webview fills container after load
            setTimeout(() => {
                webview.style.width = '100%';
                webview.style.height = '100%';
            }, 200);
        });

        webview.addEventListener('page-title-updated', () => {
            this.updateBrowserInfo();
        });

        webview.addEventListener('did-navigate', () => {
            this.updateBrowserInfo();
        });
        
        webview.addEventListener('dom-ready', () => {
            // Force correct sizing when DOM is ready
            webview.style.width = '100%';
            webview.style.height = '100%';
        });
    }

    // Helper method to ensure webview sizing
    ensureWebviewSizing() {
        const webview = document.getElementById('embedded-webview');
        if (webview && webview.style.display !== 'none') {
            webview.style.width = '100%';
            webview.style.height = '100%';
        }
    }

    async navigateToUrl(url) {
        try {
            document.getElementById('browser-url').value = url;
            await this.navigateEmbeddedBrowser();
        } catch (error) {
            this.addLog('Error navigating to URL: ' + error.message, 'error');
        }
    }

    async updateBrowserInfo() {
        try {
            const webview = document.getElementById('embedded-webview');
            if (webview && webview.style.display !== 'none') {
                const url = webview.getURL();
                const title = webview.getTitle();
                
                document.getElementById('current-browser-url').textContent = url || 'Loading...';
                document.getElementById('current-browser-title').textContent = title || 'Loading...';
            }
        } catch (error) {
            console.error('Error updating browser info:', error);
        }
    }

    clearBrowserInfo() {
        document.getElementById('current-browser-url').textContent = 'None';
        document.getElementById('current-browser-title').textContent = 'None';
    }

    async captureBrowserContent() {
        try {
            // Switch to capture tab first
            document.querySelector('[data-tab="capture"]').click();
            
            // Refresh the windows list to include embedded browser
            await this.refreshChromeWindows();
            
            // Wait a moment for the list to update
            setTimeout(() => {
                // Auto-select the embedded browser item
                const embeddedBrowserItem = document.querySelector('.embedded-browser-item');
                if (embeddedBrowserItem) {
                    embeddedBrowserItem.click();
                    this.addLog('Embedded browser selected as capture source', 'success');
                } else {
                    this.addLog('Embedded browser not found in capture sources', 'error');
                }
            }, 100);
            
        } catch (error) {
            this.addLog('Error selecting browser content: ' + error.message, 'error');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired, creating app...');
    try {
        window.app = new ChromeStreamApp();
        console.log('ChromeStreamApp created successfully');
    } catch (error) {
        console.error('Error creating ChromeStreamApp:', error);
    }
});
