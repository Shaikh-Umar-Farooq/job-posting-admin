let extractedJobData = {};
let config = {
    GEMINI_API_KEY: '',
    SUPABASE_URL: '',
    SUPABASE_SERVICE_KEY: ''
};

// Load configuration from server
async function loadConfiguration() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            config = await response.json();
            return true;
        } else {
            throw new Error('Failed to load configuration');
        }
    } catch (error) {
        console.error('Configuration loading error:', error);
        return false;
    }
}

// Check configuration on page load
async function checkConfiguration() {
    const statusElement = document.getElementById('apiStatus');
    
    // First load the configuration from server
    const configLoaded = await loadConfiguration();
    
    if (!configLoaded) {
        statusElement.innerHTML = '<span style="color: #d32f2f;">❌ Failed to load configuration from server</span>';
        return false;
    }
    
    const missingConfigs = [];
    
    if (!config.GEMINI_API_KEY) missingConfigs.push('GEMINI_API_KEY');
    if (!config.SUPABASE_URL) missingConfigs.push('SUPABASE_URL');
    if (!config.SUPABASE_SERVICE_KEY) missingConfigs.push('SUPABASE_SERVICE_KEY');
    
    if (missingConfigs.length > 0) {
        statusElement.innerHTML = `<span style="color: #d32f2f;">❌ Missing: ${missingConfigs.join(', ')}</span>`;
        statusElement.innerHTML += '<br><small>Please set the required environment variables in your .env file</small>';
        return false;
    } else {
        statusElement.innerHTML = '<span style="color: #4CAF50;">✅ working</span>';
        return true;
    }
}

async function extractJobInfo() {
    const message = document.getElementById('messageInput').value.trim();
    
    if (!message) {
        showError('Please enter a job message');
        return;
    }
    
    if (!config.GEMINI_API_KEY) {
        showError('Gemini API key not configured. Please set GEMINI_API_KEY environment variable.');
        return;
    }

    // Show loading
    document.getElementById('extractBtn').disabled = true;
    document.getElementById('loadingIndicator').style.display = 'flex';
    hideMessages();

    try {
        const prompt = `Extract the following information from this job message:
1. Company Name
2. Job Designation/Title
3. Location
4. Batch (graduation year)
5. Apply Link (job application URL)
6. Generate an engaging Instagram caption for a reel about this job opportunity
7. Generate a WhatsApp message for sharing this job opportunity

Message: "${message}"

Please respond with a JSON object containing these exact keys:
{
"company_name": "extracted company name",
"designation": "extracted job title",
"location": "extracted location",
"batch": "extracted batch/year",
"apply_link": "extracted application URL",
"instagram_caption": "An engaging Instagram caption for a reel about this job opportunity. Include relevant hashtags like #JobAlert #Hiring #CareerOpportunity #Jobs #Placement #TechJobs #Engineering #SoftwareDeveloper #Internship #Fresher #CompanyHiring. Make it catchy and professional, under 150 words.",
"whatsapp_message": "A well-formatted WhatsApp message for sharing this job. Use emojis, proper spacing, and formatting. Structure: Company Name with emoji 🚀, Job Title, Location 📍, Batch 🎓, Apply Link 🔗. Make it engaging and copy-paste ready. Use WhatsApp-friendly formatting like *bold* for emphasis. The apply link should be formatted as 'jobopenings.cc/[ID_PLACEHOLDER]' - this will be replaced with actual ID later. Keep it concise but visually appealing with proper line breaks."
}

If any information is not found, use "Not specified" as the value.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response from Gemini API');
        }

        let extractedText = data.candidates[0].content.parts[0].text;
        
        // Clean up the response to extract JSON
        extractedText = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parse the JSON response
        extractedJobData = JSON.parse(extractedText);
        
        // Display results
        displayResults(extractedJobData);
        
    } catch (error) {
        console.error('Extraction error:', error);
        showError('Failed to extract information: ' + error.message);
    } finally {
        // Hide loading
        document.getElementById('extractBtn').disabled = false;
        document.getElementById('loadingIndicator').style.display = 'none';
    }
}

function displayResults(data) {
    const resultsSection = document.getElementById('resultsSection');
    const extractedDataDiv = document.getElementById('extractedData');
    
    extractedDataDiv.innerHTML = '';
    
    const fields = [
        { key: 'company_name', label: 'Company Name' },
        { key: 'designation', label: 'Designation' },
        { key: 'location', label: 'Location' },
        { key: 'batch', label: 'Batch' },
        { key: 'apply_link', label: 'Apply Link' },
        { key: 'instagram_caption', label: 'Instagram Caption' },
        { key: 'whatsapp_message', label: 'WhatsApp Message' }
    ];
    
    fields.forEach(field => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const label = document.createElement('div');
        label.className = 'result-label';
        label.textContent = field.label + ':';
        
        const value = document.createElement('div');
        value.className = 'result-value';
        
        if (field.key === 'apply_link' && data[field.key] !== 'Not specified') {
            const link = document.createElement('a');
            link.href = data[field.key];
            link.textContent = data[field.key];
            link.target = '_blank';
            link.style.color = '#2196F3';
            value.appendChild(link);
        } else if (field.key === 'instagram_caption') {
            const captionContainer = document.createElement('div');
            captionContainer.style.position = 'relative';
            
            const captionText = document.createElement('div');
            captionText.style.whiteSpace = 'pre-wrap';
            captionText.style.maxHeight = '200px';
            captionText.style.overflowY = 'auto';
            captionText.style.border = '1px solid #ddd';
            captionText.style.padding = '10px';
            captionText.style.borderRadius = '4px';
            captionText.style.backgroundColor = '#f9f9f9';
            captionText.textContent = data[field.key] || 'Not specified';
            
            if (data[field.key] && data[field.key] !== 'Not specified') {
                const copyButton = document.createElement('button');
                copyButton.textContent = '📋 Copy Caption';
                copyButton.style.marginTop = '10px';
                copyButton.style.padding = '5px 10px';
                copyButton.style.border = 'none';
                copyButton.style.borderRadius = '4px';
                copyButton.style.backgroundColor = '#4CAF50';
                copyButton.style.color = 'white';
                copyButton.style.cursor = 'pointer';
                copyButton.style.fontSize = '12px';
                
                copyButton.onclick = async () => {
                    try {
                        await navigator.clipboard.writeText(data[field.key]);
                        copyButton.textContent = '✅ Copied!';
                        setTimeout(() => {
                            copyButton.textContent = '📋 Copy Caption';
                        }, 2000);
                    } catch (err) {
                        console.error('Failed to copy text: ', err);
                        copyButton.textContent = '❌ Copy Failed';
                        setTimeout(() => {
                            copyButton.textContent = '📋 Copy Caption';
                        }, 2000);
                    }
                };
                
                captionContainer.appendChild(captionText);
                captionContainer.appendChild(copyButton);
                value.appendChild(captionContainer);
            } else {
                value.appendChild(captionText);
            }
        } else if (field.key === 'whatsapp_message') {
            const whatsappContainer = document.createElement('div');
            whatsappContainer.style.position = 'relative';
            
            const whatsappText = document.createElement('div');
            whatsappText.style.whiteSpace = 'pre-wrap';
            whatsappText.style.maxHeight = '200px';
            whatsappText.style.overflowY = 'auto';
            whatsappText.style.border = '1px solid #25D366';
            whatsappText.style.padding = '10px';
            whatsappText.style.borderRadius = '4px';
            whatsappText.style.backgroundColor = '#f0fff4';
            whatsappText.style.fontFamily = 'monospace';
            whatsappText.textContent = data[field.key] || 'Not specified';
            
            if (data[field.key] && data[field.key] !== 'Not specified') {
                const copyButton = document.createElement('button');
                copyButton.textContent = '💬 Copy WhatsApp Message';
                copyButton.style.marginTop = '10px';
                copyButton.style.padding = '5px 10px';
                copyButton.style.border = 'none';
                copyButton.style.borderRadius = '4px';
                copyButton.style.backgroundColor = '#25D366';
                copyButton.style.color = 'white';
                copyButton.style.cursor = 'pointer';
                copyButton.style.fontSize = '12px';
                
                copyButton.onclick = async () => {
                    try {
                        await navigator.clipboard.writeText(data[field.key]);
                        copyButton.textContent = '✅ Copied!';
                        setTimeout(() => {
                            copyButton.textContent = '💬 Copy WhatsApp Message';
                        }, 2000);
                    } catch (err) {
                        console.error('Failed to copy text: ', err);
                        copyButton.textContent = '❌ Copy Failed';
                        setTimeout(() => {
                            copyButton.textContent = '💬 Copy WhatsApp Message';
                        }, 2000);
                    }
                };
                
                whatsappContainer.appendChild(whatsappText);
                whatsappContainer.appendChild(copyButton);
                value.appendChild(whatsappContainer);
            } else {
                value.appendChild(whatsappText);
            }
        } else {
            value.textContent = data[field.key] || 'Not specified';
        }
        
        resultItem.appendChild(label);
        resultItem.appendChild(value);
        extractedDataDiv.appendChild(resultItem);
    });
    
    resultsSection.style.display = 'block';
    hideMessages();
}

async function insertToDatabase() {
    if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_KEY) {
        showError('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
        return;
    }
    
    if (!extractedJobData || Object.keys(extractedJobData).length === 0) {
        showError('No data to insert. Please extract information first.');
        return;
    }

    document.getElementById('insertBtn').disabled = true;
    hideMessages();

    try {
        // Prepare data for insertion
        const insertData = {
            company_name: extractedJobData.company_name,
            designation: extractedJobData.designation,
            location: extractedJobData.location,
            batch: extractedJobData.batch,
            apply_link: extractedJobData.apply_link,
            instagram_caption: extractedJobData.instagram_caption,
            whatsapp_message: extractedJobData.whatsapp_message,
            created_at: new Date().toISOString()
        };

        const response = await fetch(`${config.SUPABASE_URL}/rest/v1/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.SUPABASE_SERVICE_KEY}`,
                'apikey': config.SUPABASE_SERVICE_KEY,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(insertData)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Database insertion failed: ${response.status} - ${errorData}`);
        }

        const insertedData = await response.json();
        const insertedId = insertedData[0].id;
        
        console.log('Inserted row ID:', insertedId);
        
        // Update the WhatsApp message with the actual ID
        if (extractedJobData.whatsapp_message) {
            extractedJobData.whatsapp_message_final = extractedJobData.whatsapp_message.replace(
                /jobopenings\.cc\/\[ID_PLACEHOLDER\]/g,
                `jobopenings.cc/${insertedId}`
            );
        }
        
        showSuccess('Job information inserted successfully into database!');
        
        // Generate video after successful insertion
        try {
            showSuccess('Generating job alert video...');
            
            const videoResponse = await fetch('/api/generate-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: insertedId,
                    company_name: extractedJobData.company_name,
                    designation: extractedJobData.designation,
                    location: extractedJobData.location,
                    batch: extractedJobData.batch,
                    apply_link: `jobopenings.cc/${insertedId}`,
                    instagram_caption: extractedJobData.instagram_caption
                })
            });
            
            if (videoResponse.ok) {
                const videoResult = await videoResponse.json();
                console.log('Video URL:', videoResult.videoUrl);
                
                let message = `Job video generated successfully! Video URL: ${videoResult.videoUrl}`;
                
                if (videoResult.reelResult && videoResult.reelResult.success) {
                    console.log('Reel uploaded successfully:', videoResult.reelResult);
                    message += '\n✅ Instagram reel uploaded successfully!';
                } else if (videoResult.reelError) {
                    console.error('Reel upload failed:', videoResult.reelError);
                    message += '\n⚠️ Instagram reel upload failed. Check console for details.';
                } else {
                    message += '\n⚠️ Instagram reel upload skipped (missing credentials or caption).';
                }
                
                showSuccess(message);
            } else {
                console.error('Video generation failed:', await videoResponse.text());
                showSuccess('Job inserted but video generation failed. Check console for details.');
            }
        } catch (videoError) {
            console.error('Video generation error:', videoError);
            showSuccess('Job inserted but video generation failed. Check console for details.');
        }
        
        // Display final WhatsApp message with real ID
        if (extractedJobData.whatsapp_message_final) {
            displayFinalWhatsAppMessage(extractedJobData.whatsapp_message_final);
        }
        
        // Clear the form after successful insertion
        setTimeout(() => {
            document.getElementById('messageInput').value = '';
            document.getElementById('resultsSection').style.display = 'none';
            extractedJobData = {};
        }, 2000);

    } catch (error) {
        console.error('Database insertion error:', error);
        showError('Failed to insert into database: ' + error.message);
    } finally {
        document.getElementById('insertBtn').disabled = false;
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    document.getElementById('successMessage').style.display = 'none';
}

function hideMessages() {
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
}

function displayFinalWhatsAppMessage(finalMessage) {
    // Remove any existing final WhatsApp message container
    const existingContainer = document.getElementById('finalWhatsAppContainer');
    if (existingContainer) {
        existingContainer.remove();
    }
    
    // Create container for final WhatsApp message
    const container = document.createElement('div');
    container.id = 'finalWhatsAppContainer';
    container.style.marginTop = '20px';
    container.style.padding = '15px';
    container.style.border = '2px solid #25D366';
    container.style.borderRadius = '8px';
    container.style.backgroundColor = '#f0fff4';
    
    const title = document.createElement('h4');
    title.textContent = '💬 Final WhatsApp Message (Ready to Share)';
    title.style.color = '#25D366';
    title.style.marginBottom = '10px';
    
    const messageDisplay = document.createElement('div');
    messageDisplay.style.whiteSpace = 'pre-wrap';
    messageDisplay.style.fontFamily = 'monospace';
    messageDisplay.style.backgroundColor = 'white';
    messageDisplay.style.padding = '10px';
    messageDisplay.style.border = '1px solid #ddd';
    messageDisplay.style.borderRadius = '4px';
    messageDisplay.style.marginBottom = '10px';
    messageDisplay.textContent = finalMessage;
    
    const copyButton = document.createElement('button');
    copyButton.textContent = '📱 Copy Final WhatsApp Message';
    copyButton.style.padding = '8px 15px';
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '4px';
    copyButton.style.backgroundColor = '#25D366';
    copyButton.style.color = 'white';
    copyButton.style.cursor = 'pointer';
    copyButton.style.fontSize = '14px';
    copyButton.style.fontWeight = 'bold';
    
    copyButton.onclick = async () => {
        try {
            await navigator.clipboard.writeText(finalMessage);
            copyButton.textContent = '✅ Copied to Clipboard!';
            copyButton.style.backgroundColor = '#4CAF50';
            setTimeout(() => {
                copyButton.textContent = '📱 Copy Final WhatsApp Message';
                copyButton.style.backgroundColor = '#25D366';
            }, 3000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            copyButton.textContent = '❌ Copy Failed';
            setTimeout(() => {
                copyButton.textContent = '📱 Copy Final WhatsApp Message';
            }, 3000);
        }
    };
    
    container.appendChild(title);
    container.appendChild(messageDisplay);
    container.appendChild(copyButton);
    
    // Insert after the results section
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.parentNode.insertBefore(container, resultsSection.nextSibling);
}

// Initialize the application
window.addEventListener('load', function() {
    checkConfiguration();
});