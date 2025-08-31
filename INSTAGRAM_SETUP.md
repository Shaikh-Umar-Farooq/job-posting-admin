# Instagram Reel Upload & WhatsApp Message Setup

## Required Environment Variables

Add these to your `.env` file to enable automatic Instagram reel uploads:

```bash
# Instagram API Credentials
INSTA_APP_ID=your_instagram_app_id_here
INSTA_ACCESS_TOKEN=your_instagram_access_token_here
```

## Database Schema Update

Add the new WhatsApp message column to your Supabase `jobs` table:

```sql
ALTER TABLE jobs ADD COLUMN whatsapp_message TEXT;
```

Updated schema should include:
- `company_name`, `designation`, `location`, `batch`, `apply_link`
- `instagram_caption` (for reel captions)
- `whatsapp_message` (for shareable messages)
- `created_at`

## How to Get Instagram Credentials

1. **Create a Facebook App:**
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create a new app and add "Instagram Basic Display" product

2. **Get App ID:**
   - Copy your App ID from the Facebook app dashboard

3. **Get Access Token:**
   - Generate a long-lived access token for your Instagram account
   - Make sure it has `instagram_content_publish` permission

## Complete Workflow

The system now automatically:

1. **Extracts** job information + generates Instagram caption + WhatsApp message
2. **Stores** data in database (gets row ID)
3. **Generates** job alert video with custom apply link (`jobopenings.cc/{id}`)
4. **Uploads** video as Instagram reel using the AI-generated caption
5. **Shows** final WhatsApp message with real ID for copy-paste sharing
6. **Logs** all URLs and status updates

## WhatsApp Message Features

- **AI-Generated**: Gemini creates engaging messages with emojis
- **Smart Formatting**: Uses WhatsApp-friendly formatting (*bold*, emojis)
- **Real ID Integration**: Replaces placeholder with actual database ID
- **Copy-Ready**: One-click copy for immediate sharing
- **Visual Design**: WhatsApp-themed UI (green colors, message-like display)

## Environment Variable Dependencies

- **With Instagram credentials**: Full workflow (video + reel upload + WhatsApp)
- **Without Instagram credentials**: Video generation + WhatsApp message only

## Console Output

The system will log:
- Database insertion ID
- Video generation URL
- Instagram reel upload status
- WhatsApp message generation
- Any errors during the process
