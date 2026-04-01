CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url    TEXT,
  public_key    TEXT,
  is_online     BOOLEAN DEFAULT false,
  last_seen     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channels (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  type         VARCHAR(20) NOT NULL CHECK (type IN ('direct','group','public')),
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  avatar_url   TEXT,
  is_encrypted BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id   UUID NOT NULL REFERENCES channels(id)  ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  content      TEXT,
  iv           VARCHAR(200),
  type         VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','file','system')),
  media_url    TEXT,
  media_name   TEXT,
  media_size   INTEGER,
  reply_to     UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_deleted   BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_receipts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id   UUID NOT NULL REFERENCES messages(id)  ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ,
  read_at      TIMESTAMPTZ,
  UNIQUE (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS message_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  emoji      VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS starred_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS friend_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (from_user, to_user)
);

CREATE TABLE IF NOT EXISTS friends (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS email_otps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(255) NOT NULL,
  otp        VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified   BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_channel    ON messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_message    ON message_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_uid ON channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_message   ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_starred_user        ON starred_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to  ON friend_requests(to_user, status);
CREATE INDEX IF NOT EXISTS idx_friends_user        ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_email_otps_email    ON email_otps(email);