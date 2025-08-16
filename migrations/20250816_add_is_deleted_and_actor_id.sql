-- Add is_deleted and deleted_at columns to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add actor_id column to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_id VARCHAR(255) NOT NULL DEFAULT '';
