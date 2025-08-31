// Video analysis and fixing script for Instagram compatibility
const fs = require('fs');
const { spawn } = require('child_process');

// Check if a command exists
function commandExists(command) {
  return new Promise((resolve) => {
    const process = spawn('which', [command]);
    process.on('close', (code) => {
      resolve(code === 0);
    });
    process.on('error', () => {
      resolve(false);
    });
  });
}

// Get video information using ffprobe
function getVideoInfo(filePath) {
  return new Promise((resolve, reject) => {
    const process = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ]);

    let output = '';
    let error = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      error += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(output);
          resolve(info);
        } catch (e) {
          reject(new Error(`Failed to parse ffprobe output: ${e.message}`));
        }
      } else {
        reject(new Error(`ffprobe failed: ${error}`));
      }
    });

    process.on('error', (err) => {
      reject(new Error(`Failed to run ffprobe: ${err.message}`));
    });
  });
}

// Analyze video for Instagram compatibility
function analyzeVideo(videoInfo) {
  const format = videoInfo.format;
  const videoStream = videoInfo.streams.find(s => s.codec_type === 'video');
  const audioStream = videoInfo.streams.find(s => s.codec_type === 'audio');

  console.log('\n=== VIDEO ANALYSIS ===');
  
  const issues = [];
  const recommendations = [];

  // Check format
  console.log(`📁 Container: ${format.format_name}`);
  if (!format.format_name.includes('mp4')) {
    issues.push('Container must be MP4');
    recommendations.push('Convert to MP4 container');
  }

  // Check duration
  const duration = parseFloat(format.duration);
  console.log(`⏱️ Duration: ${duration.toFixed(2)} seconds`);
  if (duration < 3 || duration > 90) {
    issues.push(`Duration ${duration.toFixed(2)}s (must be 3-90 seconds)`);
    if (duration > 90) {
      recommendations.push('Trim video to under 90 seconds');
    }
  }

  // Check file size
  const sizeInMB = parseInt(format.size) / (1024 * 1024);
  console.log(`💾 File size: ${sizeInMB.toFixed(2)} MB`);
  if (sizeInMB > 300) {
    issues.push(`File size ${sizeInMB.toFixed(2)}MB (must be under 300MB)`);
    recommendations.push('Reduce video quality or resolution');
  }

  if (videoStream) {
    console.log(`🎥 Video codec: ${videoStream.codec_name}`);
    console.log(`📐 Resolution: ${videoStream.width}x${videoStream.height}`);
    console.log(`🖼️ Frame rate: ${videoStream.r_frame_rate}`);

    // Check video codec
    if (videoStream.codec_name !== 'h264') {
      issues.push(`Video codec ${videoStream.codec_name} (must be H.264)`);
      recommendations.push('Re-encode with H.264 codec');
    }

    // Check resolution
    const width = videoStream.width;
    const height = videoStream.height;
    const aspectRatio = width / height;
    
    if (height < 540 || width < 540) {
      issues.push(`Resolution too low: ${width}x${height} (minimum 540x960)`);
      recommendations.push('Increase resolution to at least 540x960');
    }

    // Check aspect ratio
    console.log(`📏 Aspect ratio: ${aspectRatio.toFixed(2)}:1`);
    const minAspectRatio = 9/16; // 0.5625
    const maxAspectRatio = 16/9; // 1.7778
    
    if (aspectRatio < minAspectRatio || aspectRatio > maxAspectRatio) {
      issues.push(`Aspect ratio ${aspectRatio.toFixed(2)}:1 (must be between 9:16 and 16:9)`);
      recommendations.push('Crop or resize video to proper aspect ratio');
    }

    // Check frame rate
    const frameRate = eval(videoStream.r_frame_rate);
    console.log(`🎬 Frame rate: ${frameRate.toFixed(2)} fps`);
    if (frameRate < 23 || frameRate > 60) {
      issues.push(`Frame rate ${frameRate.toFixed(2)}fps (must be 23-60 fps)`);
      recommendations.push('Convert frame rate to 30fps or 60fps');
    }
  }

  if (audioStream) {
    console.log(`🔊 Audio codec: ${audioStream.codec_name}`);
    if (audioStream.codec_name !== 'aac') {
      issues.push(`Audio codec ${audioStream.codec_name} (must be AAC)`);
      recommendations.push('Re-encode audio with AAC codec');
    }
  } else {
    console.log('🔇 No audio stream found');
    recommendations.push('Consider adding audio track (optional but recommended)');
  }

  return { issues, recommendations };
}

// Generate ffmpeg command to fix issues
function generateFixCommand(issues, inputFile, outputFile) {
  const commands = [];
  
  // Basic conversion with Instagram-compatible settings
  commands.push('ffmpeg', '-i', inputFile);
  
  // Video settings
  commands.push('-c:v', 'libx264'); // H.264 codec
  commands.push('-preset', 'medium'); // Good quality/speed balance
  commands.push('-crf', '23'); // Good quality
  commands.push('-pix_fmt', 'yuv420p'); // Compatible pixel format
  
  // Audio settings
  commands.push('-c:a', 'aac'); // AAC codec
  commands.push('-b:a', '128k'); // Good audio quality
  
  // Frame rate
  commands.push('-r', '30'); // 30fps
  
  // Format
  commands.push('-f', 'mp4');
  commands.push('-movflags', '+faststart'); // Web optimization
  
  commands.push(outputFile);
  
  return commands;
}

async function main() {
  const videoFile = 'reel.mp4';
  
  console.log('🔍 Instagram Video Compatibility Checker');
  console.log('==========================================');
  
  if (!fs.existsSync(videoFile)) {
    console.log(`❌ Video file '${videoFile}' not found`);
    return;
  }

  // Check if ffprobe is available
  const hasFFprobe = await commandExists('ffprobe');
  if (!hasFFprobe) {
    console.log('❌ ffprobe not found. Please install FFmpeg:');
    console.log('   macOS: brew install ffmpeg');
    console.log('   Ubuntu: sudo apt install ffmpeg');
    console.log('   Windows: Download from https://ffmpeg.org/');
    
    // Basic file analysis without ffprobe
    const stats = fs.statSync(videoFile);
    const sizeInMB = stats.size / (1024 * 1024);
    console.log(`\n📊 Basic file info:`);
    console.log(`💾 File size: ${sizeInMB.toFixed(2)} MB`);
    
    if (sizeInMB > 300) {
      console.log(`⚠️ File size may be too large for Instagram (max 300MB)`);
    }
    
    return;
  }

  try {
    console.log(`\n📹 Analyzing ${videoFile}...`);
    const videoInfo = await getVideoInfo(videoFile);
    const { issues, recommendations } = analyzeVideo(videoInfo);

    console.log('\n=== COMPATIBILITY RESULTS ===');
    
    if (issues.length === 0) {
      console.log('✅ Video appears to be Instagram compatible!');
      console.log('💡 If you\'re still getting error 2207052, try:');
      console.log('   1. Using a different hosting service');
      console.log('   2. Re-encoding the video anyway (sometimes helps)');
      console.log('   3. Checking your Instagram account permissions');
    } else {
      console.log('❌ Issues found:');
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
      
      console.log('\n🔧 Recommendations:');
      recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });

      // Generate fix command
      const hasFFmpeg = await commandExists('ffmpeg');
      if (hasFFmpeg) {
        console.log('\n🛠️ Auto-fix command:');
        const fixCommand = generateFixCommand(issues, videoFile, 'reel_fixed.mp4');
        console.log(`   ${fixCommand.join(' ')}`);
        console.log('\n💡 Run this command to create a fixed version:');
        console.log(`   node -e "const {spawn} = require('child_process'); spawn('${fixCommand[0]}', ${JSON.stringify(fixCommand.slice(1))}, {stdio: 'inherit'})"`);
      }
    }

  } catch (error) {
    console.error('❌ Error analyzing video:', error.message);
  }
}

main();
