# Supabase Setup Guide for OIC Social Feed

## 1. Create the Messages Table

In your Supabase dashboard, go to the **SQL Editor** and run this command:

```sql
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  message_text TEXT NOT NULL,
  poster_address TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  amount_paid INTEGER NOT NULL,
  text_hash TEXT NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_poster ON messages(poster_address);
```

## 2. Enable Row Level Security (Optional but Recommended)

```sql
-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages
CREATE POLICY "Anyone can read messages" ON messages
  FOR SELECT USING (true);

-- Only allow inserts (no updates/deletes for message integrity)
CREATE POLICY "Anyone can insert messages" ON messages
  FOR INSERT WITH CHECK (true);
```

## 3. Environment Variables

Add these to your `.env.local` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Note:** The `NEXT_PUBLIC_` prefixed versions are needed for client-side access.

## 4. Test Connection

Visit `/api/test-supabase` to verify your connection is working.

## 5. Table Schema Details

- `id`: Auto-incrementing primary key
- `created_at`: Timestamp of message creation
- `message_text`: The actual message content
- `poster_address`: Ethereum address of the sender
- `transaction_hash`: Hash of the $OPEN payment transaction
- `amount_paid`: Amount of $OPEN paid for the message
- `text_hash`: Hash of the message text for verification

## 6. How It Works

1. User writes a message
2. App calculates cost (1 $OPEN per 100 chars, rounded up)
3. App generates hash of the message text
4. QR code includes the text hash as custom data
5. When payment is received, app verifies:
   - Amount matches calculated cost
   - Custom data matches text hash
   - Message text is still the same
6. If valid, message is stored in Supabase with sender's address
