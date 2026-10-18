import { useState, useCallback } from 'react';
import { getToken } from '../lib/auth-token';

export const useStreamChat = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamChat = useCallback(
    async (
      conversationId: string,
      message: string,
      onChunk: (text: string) => void,
      onDone: () => void,
      onError: (e: string) => void,
      signal: AbortSignal
    ) => {
      setIsStreaming(true);
      setError(null);
      const token = getToken();

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ conversationId, message }),
          signal,
        });

        if (!response.ok) {
          let errData;
          try {
            errData = await response.json();
          } catch {
            errData = { error: 'Unknown error occurred' };
          }
          const errorMsg = errData.error || `HTTP ${response.status} ${response.statusText}`;
          setError(errorMsg);
          onError(errorMsg);
          setIsStreaming(false);
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            onDone();
            break;
          }
          
          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                onDone();
                break; // done handled, but wait for outer loop to naturally end
              }
              try {
                const j = JSON.parse(data);
                if (j.content) onChunk(j.content);
              } catch (e) {
                // ignore parse error on incomplete chunks
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // Normal abort, don't flag as error
          onDone();
        } else {
          setError(err.message || 'Network error');
          onError(err.message || 'Network error');
        }
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  return { streamChat, isStreaming, error };
};
