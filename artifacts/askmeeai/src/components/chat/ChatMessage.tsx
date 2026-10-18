import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Bot, User, Copy, Check } from 'lucide-react';
import { MessageRole } from '@workspace/api-client-react';

interface ChatMessageProps {
  role: MessageRole | 'assistant';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isAssistant = role === 'assistant' || role === 'system';
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className={`flex w-full gap-4 px-4 py-6 md:px-6 lg:px-8 ${isAssistant ? 'bg-card/30' : ''}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isAssistant ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white'}`}>
        {isAssistant ? <Bot size={18} /> : <User size={18} />}
      </div>
      
      <div className="flex-1 space-y-4 overflow-hidden">
        <div className="prose prose-invert max-w-none text-white/90">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                
                if (!inline && match) {
                  return (
                    <div className="group relative rounded-lg border border-white/10 bg-black/50 overflow-hidden my-4">
                      <div className="flex items-center justify-between bg-white/5 px-4 py-2 text-xs text-muted-foreground border-b border-white/5">
                        <span>{match[1]}</span>
                        <button
                          onClick={() => handleCopy(codeString)}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          {copiedText === codeString ? <Check size={14} /> : <Copy size={14} />}
                          {copiedText === codeString ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <SyntaxHighlighter
                        style={vscDarkPlus as any}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ margin: 0, background: 'transparent', padding: '1rem' }}
                        {...props}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  );
                }
                
                return (
                  <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm font-mono text-white" {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>

      <div className="shrink-0 flex items-start">
        <button
          onClick={() => handleCopy(content)}
          className="text-muted-foreground hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          title="Copy message"
        >
          <Copy size={16} />
        </button>
      </div>
    </div>
  );
}
