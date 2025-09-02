const { randomUUID } = require('crypto');

class ConfigManager {
  constructor() {
    this.profiles = [];
    this.srtServers = [];
  }

  // Profile Management
  createProfile(profileData) {
    const profile = {
      id: randomUUID(),
      name: profileData.name,
      description: profileData.description || '',
      captureSettings: {
        resolution: profileData.resolution || '1920x1080',
        frameRate: profileData.frameRate || 30,
        windowTitle: profileData.windowTitle || ''
      },
      encodingSettings: {
        codec: profileData.codec || 'libx264',
        bitrate: profileData.bitrate || '5000k',
        preset: profileData.preset || 'veryfast',
        profile: profileData.profile || 'high',
        keyFrameInterval: profileData.keyFrameInterval || 60
      },
      srtSettings: {
        serverId: profileData.srtServerId || '',
        streamKey: profileData.streamKey || '',
        latency: profileData.latency || 120,
        maxBandwidth: profileData.maxBandwidth || '10000k'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return profile;
  }

  validateProfile(profile) {
    const errors = [];

    if (!profile.name || profile.name.trim() === '') {
      errors.push('Profile name is required');
    }

    if (!profile.captureSettings.resolution) {
      errors.push('Resolution is required');
    }

    if (!profile.encodingSettings.bitrate) {
      errors.push('Bitrate is required');
    }

    if (!profile.srtSettings.serverId) {
      errors.push('SRT server is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // SRT Server Management
  createSRTServer(serverData) {
    const server = {
      id: randomUUID(),
      name: serverData.name,
      description: serverData.description || '',
      host: serverData.host,
      port: serverData.port || 9999,
      mode: serverData.mode || 'caller', // caller, listener
      passphrase: serverData.passphrase || '',
      streamid: serverData.streamid || '',
      latency: serverData.latency || 120,
      maxbw: serverData.maxbw || '10000k',
      pbkeylen: serverData.pbkeylen || 16,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return server;
  }

  validateSRTServer(server) {
    const errors = [];

    if (!server.name || server.name.trim() === '') {
      errors.push('Server name is required');
    }

    if (!server.host || server.host.trim() === '') {
      errors.push('Host is required');
    }

    if (!server.port || isNaN(server.port) || server.port < 1 || server.port > 65535) {
      errors.push('Valid port number is required (1-65535)');
    }

    if (server.mode && !['caller', 'listener'].includes(server.mode)) {
      errors.push('Mode must be either "caller" or "listener"');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Generate SRT URL
  generateSRTUrl(server, streamKey = '') {
    let url = `srt://${server.host}:${server.port}`;
    const params = [];

    if (server.mode) {
      params.push(`mode=${server.mode}`);
    }

    if (server.latency) {
      params.push(`latency=${server.latency}`);
    }

    if (server.maxbw) {
      params.push(`maxbw=${server.maxbw}`);
    }

    if (server.passphrase) {
      params.push(`passphrase=${encodeURIComponent(server.passphrase)}`);
      params.push(`pbkeylen=${server.pbkeylen}`);
    }

    if (server.streamid || streamKey) {
      params.push(`streamid=${encodeURIComponent(server.streamid || streamKey)}`);
    }

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return url;
  }

  // Export/Import configurations
  exportConfig(profiles, servers) {
    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      profiles: profiles || [],
      srtServers: servers || []
    };
  }

  importConfig(configData) {
    const errors = [];

    if (!configData.version) {
      errors.push('Invalid configuration file: missing version');
    }

    if (!Array.isArray(configData.profiles)) {
      errors.push('Invalid configuration file: profiles must be an array');
    }

    if (!Array.isArray(configData.srtServers)) {
      errors.push('Invalid configuration file: srtServers must be an array');
    }

    // Validate profiles
    if (configData.profiles) {
      configData.profiles.forEach((profile, index) => {
        const validation = this.validateProfile(profile);
        if (!validation.isValid) {
          errors.push(`Profile ${index + 1}: ${validation.errors.join(', ')}`);
        }
      });
    }

    // Validate servers
    if (configData.srtServers) {
      configData.srtServers.forEach((server, index) => {
        const validation = this.validateSRTServer(server);
        if (!validation.isValid) {
          errors.push(`SRT Server ${index + 1}: ${validation.errors.join(', ')}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: configData
    };
  }

  // Default configurations
  getDefaultProfile() {
    return this.createProfile({
      name: 'Default Profile',
      description: 'Default streaming profile',
      resolution: '1920x1080',
      frameRate: 30,
      bitrate: '5000k',
      preset: 'veryfast',
      profile: 'high'
    });
  }

  getDefaultSRTServer() {
    return this.createSRTServer({
      name: 'Local SRT Server',
      description: 'Local SRT server for testing',
      host: 'localhost',
      port: 9999,
      mode: 'caller',
      latency: 120
    });
  }

  // Preset configurations
  getQualityPresets() {
    return {
      'ultra-low': {
        name: 'Ultra Low (480p)',
        resolution: '854x480',
        bitrate: '1000k',
        preset: 'ultrafast',
        profile: 'baseline'
      },
      'low': {
        name: 'Low (720p)',
        resolution: '1280x720',
        bitrate: '2500k',
        preset: 'veryfast',
        profile: 'main'
      },
      'medium': {
        name: 'Medium (1080p)',
        resolution: '1920x1080',
        bitrate: '5000k',
        preset: 'veryfast',
        profile: 'high'
      },
      'high': {
        name: 'High (1080p)',
        resolution: '1920x1080',
        bitrate: '8000k',
        preset: 'fast',
        profile: 'high'
      },
      'ultra-high': {
        name: 'Ultra High (1080p)',
        resolution: '1920x1080',
        bitrate: '12000k',
        preset: 'medium',
        profile: 'high'
      }
    };
  }
}

module.exports = ConfigManager;
