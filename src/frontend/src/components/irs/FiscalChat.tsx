import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Sparkles, Trash2 } from 'lucide-react';
import {
  useChatConversations, useChatMessages, useSendChatMessage,
  useDeleteConversation, type ChatMessage,
} from '../../hooks/useFiscalChat';
import { ConfirmDialog } from '../ui/ConfirmDialog';

const SUGGESTED_QUESTIONS = [
  'Como posso poupar mais no IRS este ano?',
  'Faz mais sentido aplicar IRS Jovem ou ser dependente dos pais?',
  'Quanto deveria contribuir para o PPR?',
  'Que faturas estou a perder em deduções?',
];

// ── Botão flutuante ───────────────────────────────────────────────────────

export function FiscalChatTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={onOpen}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-xl"
      style={{
        background: 'var(--gold)',
        color: 'var(--ink-900)',
        boxShadow: '0 8px 24px rgba(201,162,39,0.35)',
      }}
    >
      <Sparkles size={16} />
      <span className="text-sm font-bold">Pergunta-me</span>
    </motion.button>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────

export function FiscalChatDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: conversations = [] } = useChatConversations();
  const { data: messages = [] } = useChatMessages(conversationId);
  const { send, isStreaming } = useSendChatMessage();
  const { mutate: deleteConv, isPending: isDeleting } = useDeleteConversation();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleSend(content: string) {
    if (!content.trim() || isStreaming) return;
    setInput('');
    setStreamingText('');

    try {
      const result = await send({
        conversationId: conversationId ?? undefined,
        content: content.trim(),
        onMeta: ({ conversationId: cid }) => setConversationId(cid),
        onChunk: (text) => setStreamingText((prev) => prev + text),
      });
      // Após streaming terminar, deixa o useChatMessages refrescar e limpa o buffer
      setStreamingText('');
      if (!conversationId) setConversationId(result.conversationId);
    } catch (err) {
      console.error(err);
      setStreamingText((prev) => prev + '\n\n[Erro ao gerar resposta. Tenta novamente.]');
    }
  }

  function newConversation() {
    setConversationId(null);
    setStreamingText('');
    setInput('');
  }

  return (
    <>
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Apagar conversa"
        description="Esta acção é permanente."
        isLoading={isDeleting}
        onConfirm={() => {
          if (confirmDeleteId) {
            if (confirmDeleteId === conversationId) newConversation();
            deleteConv(confirmDeleteId);
          }
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.35)' }}
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] flex flex-col shadow-2xl"
              style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--gold-subtle)' }}
                  >
                    <MessageCircle size={15} style={{ color: 'var(--gold)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>
                      Assistente Fiscal
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--ink-500)' }}>
                      Claude · IRS 2026 com os teus dados
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={newConversation}
                    className="text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors"
                    style={{ color: 'var(--ink-500)' }}
                    title="Nova conversa"
                  >
                    + Nova
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.05]"
                    style={{ color: 'var(--ink-500)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Histórico de conversas (collapsed when chatting) */}
              {!conversationId && conversations.length > 0 && (
                <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-2"
                    style={{ color: 'var(--ink-500)' }}
                  >
                    Conversas anteriores
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {conversations.slice(0, 5).map((c) => (
                      <div
                        key={c.id}
                        className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-black/[0.03] transition-colors"
                      >
                        <button
                          onClick={() => setConversationId(c.id)}
                          className="flex-1 text-left text-xs truncate"
                          style={{ color: 'var(--ink-900)' }}
                        >
                          {c.title || 'Sem título'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(c.id)}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                          aria-label="Apagar conversa"
                        >
                          <Trash2 size={11} style={{ color: 'var(--ink-500)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 && !streamingText && (
                  <div className="space-y-3">
                    <div
                      className="rounded-2xl p-4"
                      style={{ background: 'var(--gold-subtle)', border: '1px solid var(--gold-border)' }}
                    >
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-900)' }}>
                        Posso responder com base nos teus <b>dados reais</b>: rendimento,
                        deduções, investimentos, IRS Jovem e cenários do agregado familiar.
                      </p>
                    </div>
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest mt-3 mb-1"
                      style={{ color: 'var(--ink-500)' }}
                    >
                      Sugestões
                    </p>
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSend(q)}
                        disabled={isStreaming}
                        className="block w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors hover:bg-black/[0.03] disabled:opacity-50"
                        style={{ border: '1px solid var(--border)', color: 'var(--ink-900)' }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}

                {streamingText && (
                  <MessageBubble
                    message={{
                      id: 'streaming',
                      role: 'assistant',
                      content: streamingText,
                      created_at: new Date().toISOString(),
                    }}
                    streaming
                  />
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
                <div
                  className="flex items-end gap-2 p-2 rounded-2xl"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gold-border)' }}
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(input);
                      }
                    }}
                    placeholder="Pergunta sobre o teu IRS…"
                    rows={1}
                    className="flex-1 bg-transparent text-sm outline-none resize-none max-h-32"
                    style={{ color: 'var(--ink-900)', minHeight: '24px' }}
                  />
                  <button
                    onClick={() => handleSend(input)}
                    disabled={!input.trim() || isStreaming}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-30"
                    style={{ background: 'var(--ink-900)', color: 'white' }}
                  >
                    {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
                <p className="text-[10px] mt-1.5 px-1" style={{ color: 'var(--ink-500)', opacity: 0.6 }}>
                  Enter envia · Shift+Enter quebra linha
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function MessageBubble({ message, streaming = false }: { message: ChatMessage; streaming?: boolean }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] rounded-2xl px-3.5 py-2.5"
        style={
          isUser
            ? { background: 'var(--ink-900)', color: 'white' }
            : { background: 'var(--gold-subtle)', color: 'var(--ink-900)', border: '1px solid var(--gold-border)' }
        }
      >
        <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
          {streaming && <span className="inline-block w-1.5 h-3 ml-1 align-middle animate-pulse" style={{ background: 'var(--gold)' }} />}
        </p>
      </div>
    </div>
  );
}
