CREATE TABLE message (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sender_id   TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  text        TEXT NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
);

-- Conversation thread between two users (either direction)
CREATE INDEX message_thread
  ON messages (
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id),
    timestamp DESC
  );
