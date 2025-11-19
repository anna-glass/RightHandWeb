# Blooio Webhook Setup

This document explains how to set up the Blooio webhook integration for receiving iMessage events.

## Setup Steps

### 1. Create the Database Table

Run the SQL migration in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase_migrations/create_imessages_table.sql`
4. Run the migration

This will create the `imessages` table with the following structure:
- `id` - UUID primary key
- `event` - Event type (e.g., "message.received")
- `message_id` - Unique message identifier from Blooio
- `sender` - Phone number (external_id from webhook)
- `text` - Message content
- `attachments` - JSON array of attachments
- `protocol` - Protocol used (e.g., "imessage")
- `timestamp` - Unix timestamp when message was sent
- `device_id` - Device identifier
- `received_at` - Unix timestamp when webhook was received
- `created_at` - Timestamp when record was created in database

### 2. Configure Environment Variables

Make sure you have the following environment variable set in your `.env.local` file:

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

You can find the service role key in your Supabase project settings under "API".

### 3. Configure Blooio Webhook

1. Log in to your Blooio dashboard
2. Navigate to Webhooks settings
3. Add a new webhook with the following URL:
   ```
   https://your-domain.com/api/webhooks/blooio
   ```
4. Select the events you want to receive (e.g., `message.received`)

### 4. Test the Webhook

You can test the webhook by sending a POST request:

```bash
curl -X POST https://your-domain.com/api/webhooks/blooio \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message.received",
    "message_id": "test123",
    "external_id": "+15551234567",
    "text": "Test message",
    "attachments": [],
    "protocol": "imessage",
    "timestamp": 1703123457474,
    "device_id": "A1B2C3D4",
    "received_at": 1703123456789
  }'
```

## Webhook Events

The webhook handler processes Blooio events and stores them in the `imessages` table. The following events are supported:

- `message.received` - When a new message is received
- `message.sent` - When a message is sent
- `message.delivered` - When a message is delivered
- `message.read` - When a message is read

## Security

- The webhook endpoint is public (no authentication required) as Blooio webhooks are typically secured via IP whitelisting or webhook secrets
- Row Level Security (RLS) is enabled on the `imessages` table
- Only @getrighthand.com authenticated users can read messages
- Service role can insert messages (for webhook operations)

## Accessing Messages in Admin Panel

Messages will be available in the admin panel at `/admin`. The left panel shows the list of members based on the `sender` field (phone numbers).
