const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const FormData = require('form-data');
const fetch = require('node-fetch');

function generateJobAlertVideo(company_name, designation, location, batch, apply_link) {
    return new Promise(async (resolve, reject) => {
        try {
            // Create canvas element
            const canvas = createCanvas(1080, 1920);
            const ctx = canvas.getContext('2d');
            
            // Load background image
            const bgImagePath = path.join(__dirname, 'image', 'bg.png');
            const bgImg = await loadImage(bgImagePath);
            
            // Animation settings
            const fps = 30;
            const duration = 30; // seconds
            const totalFrames = fps * duration;
            const framesDir = path.join(__dirname, 'frames');
            
            // Create frames directory
            if (!fs.existsSync(framesDir)) {
                fs.mkdirSync(framesDir);
            }
            
            console.log('Generating animated frames...');
            
            // Generate frames with animations
            for (let frame = 0; frame < totalFrames; frame++) {
                const progress = frame / fps; // Current time in seconds
                
                // Clear canvas with white background
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Animation timings
                const bgFadeStart = 0.2;
                const bgFadeEnd = 1.0;
                const dateStart = 0.3;
                const jobAlertStart = 0.7;
                const companyStart = 1.1;
                const designationStart = 1.5;
                const detailsStart = 2.0;
                
                // Background fade in animation
                if (progress >= bgFadeStart) {
                    let bgAlpha = 1;
                    if (progress < bgFadeEnd) {
                        bgAlpha = (progress - bgFadeStart) / (bgFadeEnd - bgFadeStart);
                    }
                    
                    ctx.globalAlpha = bgAlpha;
                    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
                    ctx.globalAlpha = 1;
                }
                
                // Text animation helper function
                const animateText = (text, x, y, startTime, font, color, slideDirection = 'up') => {
                    if (progress >= startTime) {
                        let alpha = 1;
                        let offsetY = 0;
                        let offsetX = 0;
                        
                        const animDuration = 0.6;
                        if (progress < startTime + animDuration) {
                            const animProgress = (progress - startTime) / animDuration;
                            alpha = easeOutCubic(animProgress);
                            
                            // Slide in animation
                            switch(slideDirection) {
                                case 'up':
                                    offsetY = (1 - easeOutCubic(animProgress)) * 30;
                                    break;
                                case 'left':
                                    offsetX = (1 - easeOutCubic(animProgress)) * 50;
                                    break;
                                case 'right':
                                    offsetX = -(1 - easeOutCubic(animProgress)) * 50;
                                    break;
                            }
                        }
                        
                        ctx.globalAlpha = alpha;
                        ctx.fillStyle = color;
                        ctx.font = font;
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(text, x + offsetX, y + offsetY);
                        ctx.globalAlpha = 1;
                    }
                };
                
                // Date animation
                const today = new Date();
                const day = today.getDate();
                const monthShort = today.toLocaleString('en-US', { month: 'short' });
                const year = today.getFullYear();
                const dateString = `${day} ${monthShort} ${year}`;
                animateText(dateString, 100, 240, dateStart, 'bold 24px Arial, sans-serif', '#7C7C7C', 'left');
                
                // Job Alert title animation
                animateText('Job Alert!', 100, 300, jobAlertStart, 'bold 56px Arial, sans-serif', '#D40B0B', 'up');
                
                // Company name animation
                const companyText = `${company_name} is Hiring`;
                animateText(companyText, 100, 400, companyStart, 'bold 48px Arial, sans-serif', '#2C2C2C', 'right');
                
                // Designation animation
                animateText(designation, 100, 455, designationStart, 'bold 48px Arial, sans-serif', '#0736FE', 'left');
                
                // Job details animations with staggered timing
                animateText(`Location: ${location}`, 100, 580, detailsStart, 'bold 40px Arial, sans-serif', '#2C2C2C', 'up');
                animateText(`Batch: ${batch}`, 100, 630, detailsStart + 0.3, 'bold 40px Arial, sans-serif', '#2C2C2C', 'up');
                animateText(`Apply: ${apply_link}`, 100, 680, detailsStart + 0.6, 'bold 40px Arial, sans-serif', '#2C2C2C', 'up');
                
                // Add subtle pulsing effect to "Job Alert!" after 10 seconds
                if (progress > 10 && progress < 25) {
                    const pulseProgress = (progress - 10) * 2; // Speed up pulse
                    const pulseAlpha = 0.1 + 0.1 * Math.sin(pulseProgress * Math.PI);
                    
                    ctx.globalAlpha = pulseAlpha;
                    ctx.fillStyle = '#D40B0B';
                    ctx.font = 'bold 56px Arial, sans-serif';
                    ctx.fillText('Job Alert!', 100, 300);
                    ctx.globalAlpha = 1;
                }
                
                // Save frame
                const frameBuffer = canvas.toBuffer('image/png');
                const frameFilename = path.join(framesDir, `frame_${String(frame).padStart(6, '0')}.png`);
                fs.writeFileSync(frameFilename, frameBuffer);
                
                // Log progress
                if (frame % 90 === 0 || frame === totalFrames - 1) {
                    console.log(`Generated frame ${frame + 1}/${totalFrames} (${((frame + 1) / totalFrames * 100).toFixed(1)}%)`);
                }
            }
            
            // Create video from frames
            const videoFilename = `job-alert-video-${Date.now()}.mp4`;
            const videoPath = path.join(__dirname, videoFilename);
            const musicPath = path.join(__dirname, 'assets', 'reelmusic.mp3');
            
            console.log('Creating video from frames...');
            
            // Create FFmpeg command for frame sequence
            let ffmpegCommand;
            
            if (fs.existsSync(musicPath)) {
                // Create video with music
                ffmpegCommand = ffmpeg()
                    .input(path.join(framesDir, 'frame_%06d.png'))
                    .inputOptions([
                        '-framerate', fps.toString()
                    ])
                    .input(musicPath)
                    .outputOptions([
                        '-c:v libx264',
                        '-c:a aac',
                        '-pix_fmt yuv420p',
                        '-r', fps.toString(),
                        '-t', duration.toString(),
                        '-shortest'
                    ]);
            } else {
                // Create video without audio
                console.warn('Creating video without audio...');
                ffmpegCommand = ffmpeg()
                    .input(path.join(framesDir, 'frame_%06d.png'))
                    .inputOptions([
                        '-framerate', fps.toString()
                    ])
                    .outputOptions([
                        '-c:v libx264',
                        '-pix_fmt yuv420p',
                        '-r', fps.toString(),
                        '-t', duration.toString()
                    ]);
            }
            
            ffmpegCommand
                .output(videoPath)
                .on('start', (commandLine) => {
                    console.log('FFmpeg started with command:', commandLine);
                })
                .on('progress', (progress) => {
                    console.log('Video processing: ' + progress.percent + '% done');
                })
                .on('end', async () => {
                    console.log('Video processing finished');
                    
                    // Clean up frames directory
                    cleanupFrames(framesDir);
                    
                    try {
                        // Upload to tmpfiles.org
                        const downloadUrl = await uploadToTmpFiles(videoPath);
                        console.log('Download URL:', downloadUrl);
                        
                        // Delete the video file after successful upload
                        fs.unlinkSync(videoPath);
                        console.log('Local video file deleted after upload');
                        
                        resolve({
                            filename: videoFilename,
                            downloadUrl: downloadUrl
                        });
                    } catch (uploadError) {
                        console.error('Upload error:', uploadError);
                        
                        // Still delete the local file even if upload failed
                        if (fs.existsSync(videoPath)) {
                            fs.unlinkSync(videoPath);
                            console.log('Local video file deleted (upload failed)');
                        }
                        
                        resolve({
                            filename: videoFilename,
                            downloadUrl: null,
                            error: 'Upload failed'
                        });
                    }
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    // Clean up frames and video
                    cleanupFrames(framesDir);
                    if (fs.existsSync(videoPath)) {
                        fs.unlinkSync(videoPath);
                    }
                    reject(err);
                })
                .run();
                
        } catch (error) {
            reject(error);
        }
    });
}

// Easing function for smooth animations
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// Clean up frames directory
function cleanupFrames(framesDir) {
    if (fs.existsSync(framesDir)) {
        const files = fs.readdirSync(framesDir);
        files.forEach(file => {
            fs.unlinkSync(path.join(framesDir, file));
        });
        fs.rmdirSync(framesDir);
        console.log('Cleaned up frames directory');
    }
}

async function uploadToTmpFiles(filePath) {
    try {
        const form = new FormData();
        const fileStream = fs.createReadStream(filePath);
        form.append('file', fileStream);
        
        const response = await fetch('https://tmpfiles.org/api/v1/upload', {
            method: 'POST',
            body: form
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // tmpfiles.org returns a URL like https://tmpfiles.org/12345
            // We need to convert it to direct download link
            const directUrl = result.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            return directUrl;
        } else {
            throw new Error('Upload failed: ' + JSON.stringify(result));
        }
    } catch (error) {
        console.error('Error uploading to tmpfiles.org:', error);
        throw error;
    }
}

// Example usage:
async function example() {
    try {
        console.log('Starting animated video generation...');
        const result = await generateJobAlertVideo(
            "TechCorp Solutions", 
            "Senior Software Developer", 
            "Bangalore, India", 
            "2024-2025", 
            "https://example.com/apply"
        );
        
        console.log('Video generated successfully!');
        console.log(`File saved: ${result.filename}`);
        if (result.downloadUrl) {
            console.log(`Download URL: ${result.downloadUrl}`);
        }
        
        return result;
    } catch (error) {
        console.error('Error generating video:', error);
    }
}

// Export the function for use in other modules
module.exports = {
    generateJobAlertVideo,
    uploadToTmpFiles
};

// Call example function if running directly
if (require.main === module) {
    example();
}