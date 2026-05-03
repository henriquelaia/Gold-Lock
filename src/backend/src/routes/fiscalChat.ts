import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../middleware/errorHandler.js';
import { pool } from '../config/database.js';
import {
  streamChatResponse, isChatAvailable, CHAT_MODEL,
  type ChatHistoryMessage,
} from '../services/fiscalChatService.js';

export const fiscalChatRouter = Router();

const SendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  content:        z.string().min(1).max(2000),
});

// ── GET /conversations — lista de conversas do utilizador ─────────────────

fiscalChatRouter.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.title, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) AS message_count
       FROM chat_conversations c
       WHERE c.user_id = $1
       ORDER BY c.updated_at DESC
       LIMIT 50`,
      [req.user!.id],
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /conversations/:id — mensagens de uma conversa ────────────────────

fiscalChatRouter.get('/conversations/:id', authenticate, async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const ownerCheck = await pool.query(
      'SELECT id FROM chat_conversations WHERE id = $1 AND user_id = $2',
      [conversationId, req.user!.id],
    );
    if (ownerCheck.rows.length === 0) {
      throw new AppError('Conversa não encontrada', 404);
    }

    const messages = await pool.query(
      `SELECT id, role, content, tokens_input, tokens_output, created_at
       FROM chat_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId],
    );
    res.json({ status: 'success', data: messages.rows });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /conversations/:id — apagar conversa ───────────────────────────

fiscalChatRouter.delete('/conversations/:id', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM chat_conversations WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user!.id],
    );
    if (result.rows.length === 0) throw new AppError('Conversa não encontrada', 404);
    res.json({ status: 'success', data: { id: result.rows[0].id } });
  } catch (err) {
    next(err);
  }
});

// ── POST /message — enviar mensagem (streaming SSE) ───────────────────────

fiscalChatRouter.post('/message', authenticate, async (req, res, next) => {
  try {
    if (!isChatAvailable()) {
      throw new AppError('Chat IA não configurado (ANTHROPIC_API_KEY ausente)', 503);
    }
    const body = SendMessageSchema.parse(req.body);
    const userId = req.user!.id;

    // Resolver conversa: criar nova se não houver ID
    let conversationId = body.conversationId;
    if (!conversationId) {
      const created = await pool.query(
        `INSERT INTO chat_conversations (user_id, title)
         VALUES ($1, $2) RETURNING id`,
        [userId, body.content.slice(0, 80)],
      );
      conversationId = created.rows[0].id as string;
    } else {
      const ownerCheck = await pool.query(
        'SELECT id FROM chat_conversations WHERE id = $1 AND user_id = $2',
        [conversationId, userId],
      );
      if (ownerCheck.rows.length === 0) throw new AppError('Conversa não encontrada', 404);
    }

    // Carregar histórico (excluindo system messages)
    const historyResult = await pool.query(
      `SELECT role, content FROM chat_messages
       WHERE conversation_id = $1 AND role IN ('user','assistant')
       ORDER BY created_at ASC`,
      [conversationId],
    );
    const history: ChatHistoryMessage[] = historyResult.rows.map(r => ({
      role: r.role as 'user' | 'assistant',
      content: r.content as string,
    }));

    // Persistir a mensagem do utilizador imediatamente
    await pool.query(
      `INSERT INTO chat_messages (conversation_id, role, content, model)
       VALUES ($1, 'user', $2, $3)`,
      [conversationId, body.content, CHAT_MODEL],
    );

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Enviar metadado da conversa
    res.write(`event: meta\ndata: ${JSON.stringify({ conversationId })}\n\n`);

    try {
      const generator = streamChatResponse(userId, history, body.content);
      let assistantText = '';
      let usage = { inputTokens: 0, outputTokens: 0, cacheRead: 0, cacheCreation: 0 };

      while (true) {
        const next = await generator.next();
        if (next.done) {
          usage = next.value.usage;
          assistantText = next.value.text;
          break;
        }
        // Cada delta de texto
        res.write(`event: chunk\ndata: ${JSON.stringify({ text: next.value })}\n\n`);
      }

      // Persistir resposta
      await pool.query(
        `INSERT INTO chat_messages
           (conversation_id, role, content, tokens_input, tokens_output,
            cache_read, cache_creation, model)
         VALUES ($1, 'assistant', $2, $3, $4, $5, $6, $7)`,
        [
          conversationId, assistantText,
          usage.inputTokens, usage.outputTokens,
          usage.cacheRead, usage.cacheCreation, CHAT_MODEL,
        ],
      );

      // Tocar updated_at da conversa
      await pool.query(
        'UPDATE chat_conversations SET updated_at = NOW() WHERE id = $1',
        [conversationId],
      );

      res.write(`event: done\ndata: ${JSON.stringify({ usage })}\n\n`);
      res.end();
    } catch (streamErr) {
      const message = streamErr instanceof Error ? streamErr.message : 'Erro no streaming';
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
      res.end();
    }
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});
