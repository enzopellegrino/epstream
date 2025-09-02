const { spawn } = require('child_process');
const ffmpegStatic = require('ffmpeg-static');

class FFmpegDetector {
  static async findBestFFmpeg() {
    console.log('🔍 Detecting best FFmpeg installation...');
    
    // Try system FFmpeg paths first (these usually have more features like SRT)
    const systemPaths = process.platform === 'win32' ? [
      'ffmpeg', // Windows PATH
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe'
    ] : [
      '/usr/local/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg', 
      '/Users/enzo.pellegrino/homebrew/bin/ffmpeg',
      '/usr/bin/ffmpeg',
      'ffmpeg' // System PATH
    ];

    // Test system FFmpeg paths
    for (const ffmpegPath of systemPaths) {
      try {
        console.log(`🧪 Testing ${ffmpegPath}...`);
        const isAvailable = await this.testFFmpegPath(ffmpegPath);
        
        if (isAvailable) {
          const supportsSRT = await this.checkSRTSupport(ffmpegPath);
          console.log(`✅ ${ffmpegPath} found - SRT support: ${supportsSRT}`);
          
          return {
            path: ffmpegPath,
            supportsSRT: supportsSRT,
            isSystem: true
          };
        }
      } catch (error) {
        console.log(`❌ ${ffmpegPath} not available`);
      }
    }

    // Fallback to ffmpeg-static (embedded, no SRT support)
    console.log('⚠️ No system FFmpeg found, using ffmpeg-static fallback');
    return {
      path: ffmpegStatic,
      supportsSRT: false,
      isSystem: false
    };
  }

  static async testFFmpegPath(ffmpegPath) {
    return new Promise((resolve) => {
      try {
        const testProcess = spawn(ffmpegPath, ['-version'], { stdio: 'ignore' });
        
        testProcess.on('close', (code) => {
          resolve(code === 0);
        });
        
        testProcess.on('error', () => {
          resolve(false);
        });
        
        // Timeout after 3 seconds
        setTimeout(() => resolve(false), 3000);
      } catch (error) {
        resolve(false);
      }
    });
  }

  static async checkSRTSupport(ffmpegPath) {
    return new Promise((resolve) => {
      try {
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
        
        // Timeout after 3 seconds
        setTimeout(() => resolve(false), 3000);
      } catch (error) {
        resolve(false);
      }
    });
  }

  static async checkSystemRequirements() {
    const ffmpegInfo = await this.findBestFFmpeg();
    
    const requirements = {
      ffmpeg: {
        available: true,
        path: ffmpegInfo.path,
        version: await this.getFFmpegVersion(ffmpegInfo.path),
        isSystem: ffmpegInfo.isSystem
      },
      srt: {
        supported: ffmpegInfo.supportsSRT,
        message: ffmpegInfo.supportsSRT ? 
          'SRT streaming available' : 
          'SRT not supported - please install FFmpeg with SRT support for streaming'
      }
    };

    return requirements;
  }

  static async getFFmpegVersion(ffmpegPath) {
    return new Promise((resolve) => {
      try {
        const testProcess = spawn(ffmpegPath, ['-version']);
        let output = '';
        
        testProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        testProcess.on('close', () => {
          const versionMatch = output.match(/ffmpeg version ([^\s]+)/);
          resolve(versionMatch ? versionMatch[1] : 'unknown');
        });
        
        testProcess.on('error', () => {
          resolve('unknown');
        });
        
        setTimeout(() => resolve('unknown'), 3000);
      } catch (error) {
        resolve('unknown');
      }
    });
  }
}

module.exports = FFmpegDetector;
