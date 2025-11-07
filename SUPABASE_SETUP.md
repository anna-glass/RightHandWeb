# Supabase Setup Guide

Your Right Hand app is now configured to use Supabase as the data backend! Here's what you need to do to complete the setup:

## 1. Get Your Supabase Credentials

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Project Settings** > **API**
3. Copy your **Project URL** and **publishable key**

## 2. Configure Environment Variables

Update the `.env.local` file in the root of your project with your actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-actual-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-actual-publishable-key
```

## 3. Database Schema

The app is configured to work with your existing Supabase database schema. The TypeScript types in `lib/supabase/types.ts` match your current schema:

### profiles
- `id` (uuid, primary key, foreign key to auth.users)
- `avatar_url` (text, nullable)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)
- `first_name` (text, nullable)
- `last_name` (text, nullable)
- `email` (text, unique)

### conversations
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `title` (text, nullable)
- `created_at` (timestamp with time zone)

### messages
- `id` (uuid, primary key)
- `conversation_id` (uuid, foreign key to conversations)
- `sender` ('user' | 'assistant')
- `content` (text)
- `created_at` (timestamp with time zone)

### addresses
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `type` ('home' | 'work' | 'custom')
- `name` (text) - e.g., "Home Address", "Office"
- `street` (text)
- `city` (text)
- `state` (text)
- `zip_code` (text)
- `country` (text, nullable)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

## 4. Row Level Security (RLS)

Make sure to configure appropriate RLS policies in Supabase for your tables. For development, you can disable RLS or create permissive policies. For production, implement proper authentication-based policies.

Example policy for development (allows all operations):
```sql
-- For each table, create a policy like this:
CREATE POLICY "Enable all access for authenticated users"
ON profiles
FOR ALL
USING (true);
```

## 5. Real-time Subscriptions

The app uses Supabase real-time subscriptions to automatically update data when changes occur. Make sure real-time is enabled for your tables in Supabase:

1. Go to **Database** > **Replication**
2. Enable replication for: `profiles`, `conversations`, `messages`, `addresses`

## 6. Test Your Setup

Your Supabase credentials are already configured! Now you can:

1. Run your Next.js app: `npm run dev`
2. Your existing data from Supabase should appear in the Members and Conversations views
3. The app will automatically sync with any changes you make in Supabase (real-time updates enabled)

## What Was Set Up

### Files Created/Modified:

1. **`lib/supabase/client.ts`** - Supabase client configuration
2. **`lib/supabase/types.ts`** - TypeScript types for your database schema
3. **`lib/supabase/hooks.ts`** - React hooks for data fetching and mutations
4. **`.env.local`** - Environment variables (you need to fill this in)
5. **`.env.example`** - Example environment variables

### Components Updated:

1. **`components/members-table.tsx`** - Now fetches profiles from Supabase
2. **`components/conversations-table.tsx`** - Now fetches conversations with profile data
3. **`components/member-detail.tsx`** - Displays addresses and conversations from Supabase
4. **`components/conversation-detail.tsx`** - Shows messages from Supabase

## Available Hooks

Use these hooks in your components to interact with Supabase:

### Query Hooks
- `useProfiles()` - Get all profiles
- `useProfile(id)` - Get a single profile
- `useConversations()` - Get all conversations with profile data
- `useConversation(id)` - Get a single conversation
- `useMessages(conversationId)` - Get all messages for a conversation
- `useAddresses(profileId)` - Get all addresses for a profile

### Mutation Functions
- `createProfile(data)` - Create a new profile
- `updateProfile(id, updates)` - Update a profile
- `deleteProfile(id)` - Delete a profile
- `createConversation(data)` - Create a new conversation
- `updateConversation(id, updates)` - Update a conversation
- `createMessage(data)` - Create a new message
- `createAddress(data)` - Create a new address
- `updateAddress(id, updates)` - Update an address
- `deleteAddress(id)` - Delete an address

## Next Steps

1. Fill in your `.env.local` with actual Supabase credentials
2. Verify your database schema matches the expected types
3. Configure RLS policies
4. Enable real-time replication
5. Add test data and verify everything works!

If you need to modify the database schema, update the types in `lib/supabase/types.ts` to match.
