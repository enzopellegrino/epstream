const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { EventEmitter } = require('events');
const { desktopCapturer } = require('electron');

ffmpeg.setFfmpegPath(ffmpegPath);

class CaptureManager extends EventEmitter {
  constructor() {
    super();
    this.isCapturing = false;
    this.captureStream = null;
    this.selectedSource = null;
    this.ffmpegProcess = null;
  }

  async startCapture(options) {
    if (this.isCapturing) {
      throw new Error('Capture already in progress');
    }

    try {
      const { sourceId, resolution = '1920x1080', frameRate = 30 } = options;
      
      this.selectedSource = sourceId;
      this.isCapturing = true;

      let source;
      
      // Handle embedded browser as special case
      if (sourceId === 'embedded-browser') {
        // For embedded browser, we need to find the main Electron window 
        // since the webview is part of it
        const sources = await desktopCapturer.getSources({
          types: ['window'],
          thumbnailSize: { width: 150, height: 150 }
        });
        
        // Look for the main Electron window
        source = sources.find(s => 
          s.name.includes('Chrome Stream Capture') || 
          s.name.includes('Electron') ||
          s.name.toLowerCase().includes('stream capture')
        );
        
        if (!source) {
          // Fallback: use the first available source
          source = sources[0];
        }
        
        console.log('Using Electron window for embedded browser capture:', source?.name);
      } else {
        // Get sources from desktopCapturer for regular windows
        const sources = await desktopCapturer.getSources({
          types: ['window'],
          thumbnailSize: { width: 150, height: 150 }
        });

        source = sources.find(s => s.id === sourceId);
      }
      
      if (!source) {
        throw new Error('Source not found');
      }

      // Store source information for streaming
      this.captureSource = source;
      
      this.emit('capture-started', {
        sourceId,
        resolution,
        frameRate,
        sourceName: sourceId === 'embedded-browser' ? 'Embedded Browser' : source.name
      });

      return {
        success: true,
        message: 'Capture started successfully',
        source: source.name
      };

    } catch (error) {
      this.isCapturing = false;
      this.emit('capture-error', error);
      throw error;
    }
  }

  async stopCapture() {
    if (!this.isCapturing) {
      return { success: false, message: 'No capture in progress' };
    }

    try {
      if (this.ffmpegProcess) {
        this.ffmpegProcess.kill('SIGTERM');
        this.ffmpegProcess = null;
      }

      this.isCapturing = false;
      this.selectedSource = null;
      this.captureSource = null;

      this.emit('capture-stopped');

      return {
        success: true,
        message: 'Capture stopped successfully'
      };

    } catch (error) {
      this.emit('capture-error', error);
      throw error;
    }
  }

  getCaptureStatus() {
    return {
      isCapturing: this.isCapturing,
      selectedSource: this.selectedSource,
      source: this.captureSource
    };
  }

  getCaptureSource() {
    return this.captureSource;
  }
}

module.exports = CaptureManager;
