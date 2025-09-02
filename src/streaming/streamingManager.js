const EventEmitter = require('events');
const { spawn } = require('child_process');
const path = require('path');

class StreamingManager extends EventEmitter {
  constructor() {
    super();
    this.ffmpegProcess = null;
    this.isStreaming = false;
    this.streamConfig = null;
  }

  // Check if FFmpeg is available
  checkFFmpegAvailable() {
    return new Promise((resolve) => {
      // Try multiple possible paths
      const possiblePaths = [
        '/usr/local/bin/ffmpeg',
        '/opt/homebrew/bin/ffmpeg',
        '/Users/enzo.pellegrino/homebrew/bin/ffmpeg',
        'ffmpeg'
      ];

      let ffmpegPath = null;
      for (const path of possiblePaths) {
        try {
          const testProcess = spawn(path, ['-version']);
          testProcess.on('close', (code) => {
            if (code === 0 && !ffmpegPath) {
              ffmpegPath = path;
              resolve(ffmpegPath);
            }
          });
        } catch (error) {
          // Continue to next path
        }
      }

      // Default fallback
      setTimeout(() => {
        if (!ffmpegPath) {
          resolve('/Users/enzo.pellegrino/homebrew/bin/ffmpeg');
        }
      }, 1000);
    });
  }

  async startStream(options) {
    try {
      if (this.isStreaming) {
        this.emit('stream-error', 'Already streaming');
        return false;
      }

      const { srtUrl, resolution = '1920x1080', bitrate = '5000k', preset = 'veryfast', profile = 'high', captureSource } = options;
      
      // Get system FFmpeg path
      const systemFFmpegPath = await this.checkFFmpegAvailable();

      this.streamConfig = options;
      this.isStreaming = true;

      // Build FFmpeg command for SRT streaming based on platform
      let ffmpegArgs = [];

      if (process.platform === 'win32') {
        // Windows using gdigrab
        ffmpegArgs = [
          '-f', 'gdigrab',
          '-framerate', '30',
          '-video_size', resolution,
          '-i', `title=${captureSource}`,
          '-c:v', 'libx264',
          '-preset', preset,
          '-profile:v', profile,
          '-b:v', bitrate,
          '-maxrate', bitrate,
          '-bufsize', `${parseInt(bitrate) * 2}k`,
          '-pix_fmt', 'yuv420p',
          '-g', '60',
          '-keyint_min', '60',
          '-f', 'mpegts',
          srtUrl
        ];
      } else if (process.platform === 'darwin') {
        // macOS: Check if it's embedded browser or regular window
        if (options.captureSource && options.captureSource.id === 'embedded-browser') {
          console.log('Setting up capture for embedded browser - using screen capture');
          // For embedded browser, capture screen 0 (main display)
          ffmpegArgs = [
            '-f', 'avfoundation',
            '-framerate', '60',  // Use supported framerate
            '-pixel_format', 'uyvy422',
            '-i', '2:none',  // Screen capture device 0 (index 2 in device list)
            '-c:v', 'libx264',
            '-preset', preset,
            '-profile:v', profile,
            '-b:v', bitrate,
            '-maxrate', bitrate,
            '-bufsize', `${parseInt(bitrate) * 2}k`,
            '-pix_fmt', 'yuv420p',
            '-vf', `scale=${resolution}`,
            '-g', '60',
            '-keyint_min', '60',
            '-f', 'mpegts',
            srtUrl
          ];
        } else {
          // Standard screen capture for other windows
          ffmpegArgs = [
            '-f', 'avfoundation',
            '-framerate', '60',  // Use supported framerate
            '-pixel_format', 'uyvy422',
            '-i', '2:none',  // Screen capture device 0 (index 2 in device list)
            '-c:v', 'libx264',
            '-preset', preset,
            '-profile:v', profile,
            '-b:v', bitrate,
            '-maxrate', bitrate,
            '-bufsize', `${parseInt(bitrate) * 2}k`,
            '-pix_fmt', 'yuv420p',
            '-vf', `scale=${resolution}`,
            '-g', '60',
            '-keyint_min', '60',
            '-f', 'mpegts',
            srtUrl
          ];
        }
        
        // Log that we're capturing for the specific window
        console.log(`Capturing screen for Chrome window: ${captureSource}`);
        this.emit('stream-log', `Targeting Chrome window: ${captureSource}`);
      } else {
        // Linux using x11grab
        ffmpegArgs = [
          '-f', 'x11grab',
          '-framerate', '30',
          '-video_size', resolution,
          '-i', ':0.0',
          '-c:v', 'libx264',
          '-preset', preset,
          '-profile:v', profile,
          '-b:v', bitrate,
          '-maxrate', bitrate,
          '-bufsize', `${parseInt(bitrate) * 2}k`,
          '-pix_fmt', 'yuv420p',
          '-g', '60',
          '-keyint_min', '60',
          '-f', 'mpegts',
          srtUrl
        ];
      }

      console.log('Starting FFmpeg with args:', ffmpegArgs);

      this.ffmpegProcess = spawn(systemFFmpegPath, ffmpegArgs);

      this.ffmpegProcess.stdout.on('data', (data) => {
        this.emit('stream-data', data.toString());
      });

      this.ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();
        this.emit('stream-log', output);
        console.log('FFmpeg log:', output);
        
        // Check for connection status
        if (output.includes('Connection established') || output.includes('Opening')) {
          this.emit('stream-connected');
        } else if (output.includes('Connection failed') || output.includes('Error')) {
          this.emit('stream-error', output);
        }
      });

      this.ffmpegProcess.on('close', (code) => {
        console.log('FFmpeg process closed with code:', code);
        this.isStreaming = false;
        this.ffmpegProcess = null;
        this.emit('stream-ended', code);
      });

      this.ffmpegProcess.on('error', (error) => {
        console.error('FFmpeg process error:', error);
        this.isStreaming = false;
        this.ffmpegProcess = null;
        this.emit('stream-error', error.message);
      });

      return true;

    } catch (error) {
      console.error('Error starting stream:', error);
      this.isStreaming = false;
      this.emit('stream-error', error.message);
      return false;
    }
  }

  async stopStream() {
    try {
      if (this.ffmpegProcess) {
        this.ffmpegProcess.kill('SIGTERM');
        this.ffmpegProcess = null;
      }
      this.isStreaming = false;
      this.emit('stream-stopped');
      return true;
    } catch (error) {
      console.error('Error stopping stream:', error);
      return false;
    }
  }

  getStreamStatus() {
    return {
      isStreaming: this.isStreaming,
      config: this.streamConfig
    };
  }

  async testSRTConnection(srtUrl) {
    try {
      const systemFFmpegPath = await this.checkFFmpegAvailable();
      
      return new Promise((resolve) => {
        const testArgs = [
          '-f', 'lavfi',
          '-i', 'testsrc=duration=1:size=640x480:rate=30',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-t', '1',
          '-f', 'mpegts',
          srtUrl
        ];

        const testProcess = spawn(systemFFmpegPath, testArgs);
        let hasError = false;

        testProcess.stderr.on('data', (data) => {
          const output = data.toString();
          if (output.includes('Connection refused') || output.includes('failed')) {
            hasError = true;
          }
        });

        testProcess.on('close', (code) => {
          resolve(!hasError && code === 0);
        });

        testProcess.on('error', () => {
          resolve(false);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (testProcess && !testProcess.killed) {
            testProcess.kill();
            resolve(false);
          }
        }, 10000);
      });
    } catch (error) {
      console.error('Error testing SRT connection:', error);
      return false;
    }
  }
}

module.exports = StreamingManager;
