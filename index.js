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
        statusElement.innerHTML = '<span style="color: #4CAF50;">✅ All configurations loaded</span>';
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

Message: "${message}"

Please respond with a JSON object containing these exact keys:
{
"company_name": "extracted company name",
"designation": "extracted job title",
"location": "extracted location",
"batch": "extracted batch/year",
"apply_link": "extracted application URL"
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
        { key: 'apply_link', label: 'Apply Link' }
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
            created_at: new Date().toISOString()
        };

        const response = await fetch(`${config.SUPABASE_URL}/rest/v1/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.SUPABASE_SERVICE_KEY}`,
                'apikey': config.SUPABASE_SERVICE_KEY,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(insertData)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Database insertion failed: ${response.status} - ${errorData}`);
        }

        showSuccess('Job information inserted successfully into database!');
        
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

// Initialize the application
window.addEventListener('load', function() {
    checkConfiguration();
});