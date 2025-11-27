-- File Chat Messages - Store chat history per file
-- Run this in Supabase SQL Editor

-- Drop existing table if needed (removes old data!)
-- DROP TABLE IF EXISTS file_chat_messages;

-- Create file_chat_messages table
CREATE TABLE IF NOT EXISTS file_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    citations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_file_chats_file_id ON file_chat_messages(file_id);
CREATE INDEX IF NOT EXISTS idx_file_chats_created ON file_chat_messages(file_id, created_at);

-- Enable RLS
ALTER TABLE file_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now, can tighten later)
CREATE POLICY file_chats_select ON file_chat_messages FOR SELECT USING (true);
CREATE POLICY file_chats_insert ON file_chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY file_chats_delete ON file_chat_messages FOR DELETE USING (true);
