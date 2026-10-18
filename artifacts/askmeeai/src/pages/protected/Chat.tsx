import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useCreateConversation, useGetConversation } from '@workspace/api-client-react';
import { useStreamChat } from '@/hooks/useStreamChat';
import { ChatLayout } from '@/components/layout/ChatLayout';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Square, Sparkles, Loader2, RefreshCw, Bot } from 'lucide-react';
import { MessageRole } from '@workspace/api-client-react';

type LocalMessage = {
  id: string;
  role: MessageRole | 'assistant';
  content: string;
  createdAt: string;
};

const SUGGESTIONS = [
  "Explain quantum computing simply",
  "Write a React hook for debouncing",
  "How do I say 'Thank you' in Indonesian?",
  "Debug why my CSS flexbox isn't centering"
];

export default function Chat() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const id = location.startsWith('/chat/') ? location.split('/')[2] : undefined;

  const { streamChat, isStreaming, error: streamError } = useStreamChat();
  const createConversation = useCreateConversation();
  
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [currentStream, setCurrentStream] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversation if id exists
  const { data: conversation, isLoading: isLoadingConv } = useGetConversation(id!, {
    query: { queryKey: ['conversation', id], enabled: !!id }
  });

  // Sync server messages to local state when loaded
  useEffect(() => {
    if (conversation?.messages) {
      setMessages(conversation.messages.map(m => ({ ...m })));
    } else if (!id) {
      setMessages([]);
    }
  }, [conversation, id]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStream]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isStreaming) return;
    
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMsg: LocalMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setCurrentStream('');

    let activeConvId = id;

    // Create new conversation if none exists
    if (!activeConvId) {
      try {
        const newConv = await createConversation.mutateAsync({
          data: { title: text.slice(0, 40) + (text.length > 40 ? '...' : '') }
        });
        activeConvId = newConv.id;
        // Update URL silently so we don't remount
        window.history.pushState(null, '', `/chat/${newConv.id}`);
      } catch (err) {
        console.error("Failed to create conversation", err);
        return;
      }
    }

    // Start streaming
    abortControllerRef.current = new AbortController();
    let accumulated = '';
    
    await streamChat(
      activeConvId,
      text,
      (chunk) => {
        accumulated += chunk;
        setCurrentStream(accumulated);
      },
      () => {
        // Done
        setMessages(prev => [
          ...prev, 
          { id: crypto.randomUUID(), role: 'assistant', content: accumulated, createdAt: new Date().toISOString() }
        ]);
        setCurrentStream('');
      },
      (errorMsg) => {
        console.error("Stream error:", errorMsg);
        setMessages(prev => [
          ...prev, 
          { id: crypto.randomUUID(), role: 'assistant', content: accumulated + `\n\n**Error**: ${errorMsg}`, createdAt: new Date().toISOString() }
        ]);
        setCurrentStream('');
      },
      abortControllerRef.current.signal
    );
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleRegenerate = () => {
    if (messages.length === 0) return;
    // Find last user message
    let lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      handleSend(lastUserMsg.content);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showEmptyState = messages.length === 0 && !id && !isStreaming;

  return (
    <ChatLayout>
      <div className="flex h-full flex-col relative">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto w-full">
          {isLoadingConv ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : showEmptyState ? (
            <div className="flex h-full flex-col items-center justify-center px-4">
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Bot size={32} />
              </div>
              <h2 className="mb-2 text-2xl font-semibold text-white">How can I help you today?</h2>
              <p className="mb-6 text-center text-muted-foreground max-w-md">
                Ask me anything, from writing code to drafting emails, or brainstorming ideas.
              </p>
              <Button asChild variant="outline" className="mb-10 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10">
                <Link href="/pricing">
                  <Sparkles size={16} />
                  Subscribe for more credits
                </Link>
              </Button>
              <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(suggestion)}
                    className="flex flex-col items-start rounded-xl border border-white/5 bg-card/50 p-4 text-left transition-colors hover:bg-white/5 hover:border-white/10"
                  >
                    <span className="text-sm font-medium text-white">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl w-full pb-32 pt-6">
              {messages.map((msg, i) => (
                <ChatMessage key={msg.id || i} role={msg.role} content={msg.content} />
              ))}
              {isStreaming && (
                <ChatMessage role="assistant" content={currentStream + '▊'} />
              )}
              {streamError && (
                <div className="mx-4 my-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                  {streamError}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-background via-background to-transparent pt-10 pb-6 px-4">
          <div className="mx-auto max-w-3xl relative">
            {messages.length > 0 && !isStreaming && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRegenerate} className="h-8 rounded-full bg-background border-white/10 text-xs shadow-lg">
                  <RefreshCw size={14} className="mr-2" />
                  Regenerate
                </Button>
              </div>
            )}
            
            <div className="relative flex w-full items-end overflow-hidden rounded-2xl border border-white/15 bg-card/80 p-2 shadow-2xl backdrop-blur-md focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Message AskMeAI..."
                className="min-h-[44px] max-h-[200px] w-full resize-none border-0 bg-transparent py-3 pl-4 pr-12 text-white shadow-none focus-visible:ring-0"
                rows={1}
              />
              
              <div className="absolute bottom-3 right-3 flex items-center">
                {isStreaming ? (
                  <Button
                    size="icon"
                    className="h-8 w-8 rounded-lg bg-white/10 text-white hover:bg-white/20"
                    onClick={handleStop}
                  >
                    <Square size={16} fill="currentColor" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    className={`h-8 w-8 rounded-lg transition-all ${input.trim() ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-muted-foreground'}`}
                    disabled={!input.trim()}
                    onClick={() => handleSend()}
                  >
                    <Send size={16} />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>AskMeAI can make mistakes. Check important info.</span>
              {(user?.credits ?? 0) < 50 && (
                <span className="text-orange-400 font-medium flex items-center gap-1">
                  <Sparkles size={12} /> Low credits
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </ChatLayout>
  );
}
