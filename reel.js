const fetch = require('node-fetch'); // npm install node-fetch
const FormData = require('form-data'); // npm install form-data
require('dotenv').config();

class InstagramReelsUploader {
  constructor(appId, accessToken) {
    this.appId = appId;
    this.accessToken = accessToken;
    this.baseUrl = 'https://graph.instagram.com';
  }

  /**
   * Step 1: Create a media container for the reel
   * @param {string} videoUrl - URL of the video to upload
   * @param {string} caption - Optional caption for the reel
   * @returns {Promise<string>} Container ID
   */
  async createContainer(videoUrl, caption = '') {
    const url = `${this.baseUrl}/${this.appId}/media`;
    
    const params = new URLSearchParams({
      domain: 'INSTAGRAM',
      media_type: 'REELS',
      video_url: videoUrl,
      access_token: this.accessToken
    });

    if (caption) {
      params.append('caption', caption);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Container creation failed: ${JSON.stringify(data)}`);
      }

      console.log('Container created successfully:', data);
      return data.id;
    } catch (error) {
      console.error('Error creating container:', error);
      throw error;
    }
  }

  /**
   * Wait for container to be ready for publishing
   * @param {string} containerId - Container ID to check
   * @param {number} maxWaitTime - Maximum wait time in milliseconds (default: 300000 = 5 minutes)
   * @param {number} checkInterval - Check interval in milliseconds (default: 5000 = 5 seconds)
   * @returns {Promise<boolean>} True if ready, false if timeout
   */
  async waitForContainerReady(containerId, maxWaitTime = 300000, checkInterval = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.checkContainerStatus(containerId);
        
        console.log(`Container status: ${status.status_code} - ${status.status || 'Processing'}`);
        
        // Check for both string and numeric status codes
        const statusCode = status.status_code;
        const statusText = status.status;
        
        // FINISHED status (can be string "FINISHED" or number 1)
        if (statusCode === 'FINISHED' || statusCode === 1 || statusText === 'FINISHED') {
          console.log('Container is ready for publishing!');
          return true;
        } 
        // ERROR or EXPIRED status
        else if (statusCode === 'ERROR' || statusCode === 3 || statusText === 'ERROR' ||
                 statusCode === 'EXPIRED' || statusCode === 2 || statusText === 'EXPIRED') {
          throw new Error(`Container failed with status: ${statusCode} - ${statusText}`);
        }
        // IN_PROGRESS status (continue waiting)
        else if (statusCode === 'IN_PROGRESS' || statusCode === 0 || statusText === 'IN_PROGRESS') {
          console.log(`Container still processing, waiting ${checkInterval/1000} seconds...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        
      } catch (error) {
        console.error('Error checking container status:', error);
        throw error;
      }
    }
    
    throw new Error(`Container not ready after ${maxWaitTime/1000} seconds`);
  }

  /**
   * Step 2: Publish the media container
   * @param {string} containerId - Container ID from step 1
   * @returns {Promise<object>} Publication result
   */
  async publishContainer(containerId) {
    const url = `${this.baseUrl}/${this.appId}/media_publish`;
    
    const params = new URLSearchParams({
      creation_id: containerId,
      access_token: this.accessToken
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Publication failed: ${JSON.stringify(data)}`);
      }

      console.log('Reel published successfully:', data);
      return data;
    } catch (error) {
      console.error('Error publishing container:', error);
      throw error;
    }
  }

  /**
   * Complete upload process (create container + wait + publish)
   * @param {string} videoUrl - URL of the video to upload
   * @param {string} caption - Optional caption for the reel
   * @param {number} maxWaitTime - Maximum wait time for container to be ready (default: 300000 = 5 minutes)
   * @returns {Promise<object>} Final publication result
   */
  async uploadReel(videoUrl, caption = '', maxWaitTime = 300000) {
    try {
      console.log('Starting reel upload process...');
      
      // Step 1: Create container
      console.log('Step 1: Creating container...');
      const containerId = await this.createContainer(videoUrl, caption);
      console.log(`Container ID: ${containerId}`);

      // Step 2: Wait for container to be ready
      console.log('Step 2: Waiting for container to be ready...');
      await this.waitForContainerReady(containerId, maxWaitTime);

      // Step 3: Publish container
      console.log('Step 3: Publishing container...');
      const result = await this.publishContainer(containerId);
      
      console.log('Reel upload completed successfully!');
      return {
        containerId,
        publicationResult: result,
        success: true
      };
    } catch (error) {
      console.error('Upload process failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check container status (useful for debugging)
   * @param {string} containerId - Container ID to check
   * @returns {Promise<object>} Container status
   */
  async checkContainerStatus(containerId) {
    const url = `${this.baseUrl}/${containerId}`;
    
    const params = new URLSearchParams({
      fields: 'status_code,status',
      access_token: this.accessToken
    });

    try {
      const response = await fetch(`${url}?${params}`);
      const data = await response.json();
      
      console.log('Container status:', data);
      return data;
    } catch (error) {
      console.error('Error checking container status:', error);
      throw error;
    }
  }
}

// Usage example with proper error handling
async function main() {
  const APP_ID = process.env.INSTA_APP_ID;
  const ACCESS_TOKEN = process.env.INSTA_ACCESS_TOKEN;
  
  const uploader = new InstagramReelsUploader(APP_ID, ACCESS_TOKEN);
  
  const videoUrl = 'http://tmpfiles.org/dl/12428523/job-alert-video-1756647781600.mp4';
  const caption = 'Check out this amazing reel! #reels #instagram';
  
  try {
    // Method 1: Complete upload with automatic waiting
    const result = await uploader.uploadReel(videoUrl, caption);
    console.log('Final result:', result);
    
    // Method 2: Manual step-by-step process (alternative approach)
    /*
    const containerId = await uploader.createContainer(videoUrl, caption);
    console.log('Container created:', containerId);
    
    await uploader.waitForContainerReady(containerId);
    console.log('Container is ready!');
    
    const publishResult = await uploader.publishContainer(containerId);
    console.log('Published successfully:', publishResult);
    */
    
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

// Export the class for use in other modules
module.exports = InstagramReelsUploader;

// Run example if this file is executed directly
if (require.main === module) {
  main();
}