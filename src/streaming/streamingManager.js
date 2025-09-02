const EventEmitter = require('events');
const { spawn } = require('child_process');
const path = require('path');
const ffmpegStatic = require('ffmpeg-static');

class StreamingManager extends EventEmitter {
  constructor() {
    super();
    this.ffmpegProcess = null;
    this.isStreaming = false;
    this.streamConfig = null;
    this.ffmpegPath = null;
    this.supportsSRT = false;
  }

  // Check if FFmpeg supports SRT protocol
  async checkSRTSupport(ffmpegPath) {
    return new Promise((resolve) => {
      const testProcess = spawn(ffmpegPath, ['-protocols']);
      let output = '';
      
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.on('close', () => {
        const supportsSRT = output.toLowerCase().includes('srt');
        resolve(supportsSRT);
      });
      
      testProcess.on('error', () => {
        resolve(false);
      });
    });
  }

  // Check if FFmpeg is available and find the best one
  async checkFFmpegAvailable() {
    console.log('🔍 Checking FFmpeg availability...');
    
    // Try system FFmpeg paths first (these usually have SRT support)
    const systemPaths = process.platform === 'win32' ? [
      'ffmpeg', // Windows PATH
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe'
    ] : [
      '/usr/local/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg', 
      '/Users/enzo.pellegrino/homebrew/bin/ffmpeg',
      'ffmpeg' // System PATH
    ];

    // Test system FFmpeg paths
    for (const ffmpegPath of systemPaths) {
      try {
        console.log(`🧪 Testing ${ffmpegPath}...`);
        const testProcess = spawn(ffmpegPath, ['-version'], { stdio: 'ignore' });
        
        const result = await new Promise((resolve) => {
          testProcess.on('close', (code) => resolve(code === 0));
          testProcess.on('error', () => resolve(false));
          setTimeout(() => resolve(false), 2000); // Timeout
        });

        if (result) {
          const supportsSRT = await this.checkSRTSupport(ffmpegPath);
          console.log(`✅ ${ffmpegPath} found - SRT support: ${supportsSRT}`);
          
          if (supportsSRT) {
            this.ffmpegPath = ffmpegPath;
            this.supportsSRT = true;
            return { path: ffmpegPath, supportsSRT: true };
          }
        }
      } catch (error) {
        console.log(`❌ ${ffmpegPath} not available`);
      }
    }

    // Fallback to ffmpeg-static (no SRT support)
    console.log('⚠️ No system FFmpeg with SRT found, using ffmpeg-static fallback');
    this.ffmpegPath = ffmpegStatic;
    this.supportsSRT = false;
    return { path: ffmpegStatic, supportsSRT: false };
  }

  async startStream(options) {
    try {
      if (this.isStreaming) {
        this.emit('stream-error', 'Already streaming');
        return false;
      }

      const { srtUrl, resolution = '1920x1080', bitrate = '5000k', preset = 'veryfast', profile = 'high', captureSource } = options;
      
      // Get the best available FFmpeg
      const ffmpegInfo = await this.checkFFmpegAvailable();
      const ffmpegPath = ffmpegInfo.path;
      const supportsSRT = ffmpegInfo.supportsSRT;

      this.streamConfig = options;
      this.isStreaming = true;

      // Check if SRT streaming is requested but not supported
      if (srtUrl && srtUrl.startsWith('srt://') && !supportsSRT) {
        console.warn('⚠️ SRT streaming requested but FFmpeg does not support SRT protocol');
        this.emit('stream-warning', 'SRT protocol not supported by current FFmpeg. Please install FFmpeg with SRT support for streaming.');
        // Could fallback to RTMP or file output, or show error to user
        this.isStreaming = false;
        return false;
      }

      // Build FFmpeg command based on platform and capabilities
      let ffmpegArgs = [];
      
      // Determine output format and destination
      let outputFormat = 'mpegts';
      let outputDestination = srtUrl;
      
      if (!supportsSRT && srtUrl && srtUrl.startsWith('srt://')) {
        // Fallback for no SRT support - could use RTMP, file, or UDP
        console.warn('⚠️ Fallback: Converting SRT URL to UDP for compatibility');
        outputDestination = srtUrl.replace('srt://', 'udp://');
        outputFormat = 'mpegts';
      }

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
          '-f', outputFormat,
          outputDestination
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
            '-f', outputFormat,
            outputDestination
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
            '-f', outputFormat,
            outputDestination
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
          '-f', outputFormat,
          outputDestination
        ];
      }

      console.log('Starting FFmpeg with args:', ffmpegArgs);
      console.log(`Using FFmpeg: ${ffmpegPath} (SRT support: ${supportsSRT})`);

      this.ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);

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
