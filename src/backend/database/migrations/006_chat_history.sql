-- Migration 006 — Chat IA Fiscal Persistente (Fase 3 Sprint 10d)
-- Tabelas para guardar conversas entre o utilizador e o assistente fiscal IA.
-- Provider: Anthropic Claude Sonnet 4.6 com prompt caching.

CREATE TABLE IF NOT EXISTS chat_conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role             VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content          TEXT NOT NULL,
  tokens_input     INTEGER,
  tokens_output    INTEGER,
  cache_read       INTEGER,        -- tokens lidos do prompt cache (Anthropic)
  cache_creation   INTEGER,        -- tokens escritos no prompt cache (Anthropic)
  model            VARCHAR(50),    -- claude-sonnet-4-6, etc.
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user
  ON chat_conversations(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv
  ON chat_messages(conversation_id, created_at);

DROP TRIGGER IF EXISTS trg_chat_conversations_updated_at ON chat_conversations;
CREATE TRIGGER trg_chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE chat_conversations IS 'Conversas chat entre utilizador e assistente fiscal IA';
COMMENT ON TABLE chat_messages IS 'Mensagens de cada conversa, com tracking de tokens (input/output/cache)';
COMMENT ON COLUMN chat_messages.cache_read IS 'Tokens lidos do prompt cache Anthropic (5min TTL)';
COMMENT ON COLUMN chat_messages.cache_creation IS 'Tokens escritos no prompt cache na resposta';
