const express = require('express');
const path = require('path');
const cors = require('cors');
const { generateJobAlertVideo } = require('./image');
const InstagramReelsUploader = require('./reel');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API endpoint to provide environment variables to frontend
app.get('/api/config', (req, res) => {
    res.json({
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
        SUPABASE_URL: process.env.SUPABASE_URL || '',
        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || ''
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Video generation endpoint
app.post('/api/generate-video', async (req, res) => {
    try {
        const { id, company_name, designation, location, batch, apply_link, instagram_caption } = req.body;
        
        console.log(`Generating video for job ID: ${id}`);
        console.log('Job details:', { company_name, designation, location, batch, apply_link });
        
        // Call the generateJobAlertVideo function
        const videoResult = await generateJobAlertVideo(company_name, designation, location, batch, apply_link);
        
        console.log('Video generated successfully. Result:', videoResult);
        
        // Extract the download URL from the result
        const videoDownloadUrl = videoResult.downloadUrl;
        
        if (!videoDownloadUrl) {
            throw new Error('Video generation failed - no download URL available');
        }
        
        // Upload reel to Instagram after video generation
        if (process.env.INSTA_APP_ID && process.env.INSTA_ACCESS_TOKEN && instagram_caption) {
            try {
                console.log('Uploading reel to Instagram...');
                console.log('Video URL for reel:', videoDownloadUrl);
                console.log('Caption for reel:', instagram_caption);
                
                const uploader = new InstagramReelsUploader(
                    process.env.INSTA_APP_ID,
                    process.env.INSTA_ACCESS_TOKEN
                );
                
                const reelResult = await uploader.uploadReel(videoDownloadUrl, instagram_caption);
                
                if (reelResult.success) {
                    console.log('Reel uploaded successfully:', reelResult);
                    res.json({
                        success: true,
                        videoUrl: videoDownloadUrl,
                        reelResult: reelResult,
                        message: 'Video generated and reel uploaded successfully'
                    });
                } else {
                    console.error('Reel upload failed:', reelResult.error);
                    res.json({
                        success: true,
                        videoUrl: videoDownloadUrl,
                        reelError: reelResult.error,
                        message: 'Video generated but reel upload failed'
                    });
                }
            } catch (reelError) {
                console.error('Reel upload error:', reelError);
                res.json({
                    success: true,
                    videoUrl: videoDownloadUrl,
                    reelError: reelError.message,
                    message: 'Video generated but reel upload failed'
                });
            }
        } else {
            console.log('Instagram credentials or caption not available, skipping reel upload');
            res.json({
                success: true,
                videoUrl: videoDownloadUrl,
                message: 'Video generated successfully (reel upload skipped - missing credentials or caption)'
            });
        }
        
    } catch (error) {
        console.error('Video generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate video'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`⚙️  Config API: http://localhost:${PORT}/api/config`);
}); 