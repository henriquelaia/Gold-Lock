import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { fiscalChatApi, FISCAL_CHAT_BASE } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';

export interface ChatConversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  message_count: string | number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens_input?: number | null;
  tokens_output?: number | null;
  created_at: string;
}

export function useChatConversations() {
  return useQuery<ChatConversation[]>({
    queryKey: ['fiscal-chat', 'conversations'],
    queryFn: () => fiscalChatApi.conversations().then(r => r.data.data),
  });
}

export function useChatMessages(conversationId: string | null) {
  return useQuery<ChatMessage[]>({
    queryKey: ['fiscal-chat', 'messages', conversationId],
    queryFn: () => fiscalChatApi.messages(conversationId!).then(r => r.data.data),
    enabled: conversationId !== null,
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fiscalChatApi.deleteConv(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fiscal-chat', 'conversations'] });
      toast.success('Conversa apagada');
    },
    onError: () => toast.error('Erro ao apagar conversa'),
  });
}

// ── Streaming via fetch + ReadableStream ─────────────────────────────────

interface SendOptions {
  conversationId?: string;
  content: string;
  onChunk?: (text: string) => void;
  onMeta?: (data: { conversationId: string }) => void;
  onDone?: (usage: { inputTokens: number; outputTokens: number; cacheRead: number; cacheCreation: number }) => void;
}

export function useSendChatMessage() {
  const qc = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function send(opts: SendOptions): Promise<{ conversationId: string; assistantText: string }> {
    setIsStreaming(true);
    abortRef.current = new AbortController();
    const token = useAuthStore.getState().accessToken;

    let conversationId = opts.conversationId ?? '';
    let assistantText = '';

    try {
      const res = await fetch(`${FISCAL_CHAT_BASE}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          conversationId: opts.conversationId,
          content: opts.content,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // SSE — parse \n\n delimited frames
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          if (!frame.trim()) continue;
          const lines = frame.split('\n');
          let event = 'message';
          let data = '';
          for (const line of lines) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            if (line.startsWith('data:')) data += line.slice(5).trim();
          }

          if (!data) continue;
          try {
            const parsed = JSON.parse(data);

            if (event === 'meta' && parsed.conversationId) {
              conversationId = parsed.conversationId;
              opts.onMeta?.(parsed);
            } else if (event === 'chunk' && typeof parsed.text === 'string') {
              assistantText += parsed.text;
              opts.onChunk?.(parsed.text);
            } else if (event === 'done') {
              opts.onDone?.(parsed.usage);
            } else if (event === 'error') {
              throw new Error(parsed.message || 'Erro no streaming');
            }
          } catch (parseErr) {
            // tolerate unparseable frames silently except errors thrown above
            if (parseErr instanceof Error && parseErr.message !== 'Erro no streaming') continue;
            throw parseErr;
          }
        }
      }

      // Invalidar caches
      qc.invalidateQueries({ queryKey: ['fiscal-chat', 'conversations'] });
      if (conversationId) {
        qc.invalidateQueries({ queryKey: ['fiscal-chat', 'messages', conversationId] });
      }

      return { conversationId, assistantText };
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return { send, cancel, isStreaming };
}
