import React, { useState, useRef, useEffect } from 'react';
import { Streamdown } from 'streamdown';

interface Message {
  type: 'user' | 'assistant';
  content: string;
}

interface InterviewProps {
  onBack: () => void;
  onComplete: (transcript: string) => void;
}

export default function Interview({ onBack, onComplete }: InterviewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4.1');
  const [models, setModels] = useState<Array<{ id: string; name: string; isPremium: boolean; multiplier: number }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch available models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/models/list');
        if (response.ok) {
          const data = await response.json();
          setModels(data);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
        // Fallback to hardcoded models
        setModels([
          { id: 'gpt-4.1', name: 'GPT-4.1', isPremium: false, multiplier: 0 },
          { id: 'gpt-5-mini', name: 'GPT-5 mini', isPremium: false, multiplier: 0 },
          { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', isPremium: true, multiplier: 1 },
          { id: 'gpt-5', name: 'GPT-5', isPremium: true, multiplier: 1 },
        ]);
      }
    };
    fetchModels();
  }, []);

  // Restore messages from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('interview_messages');
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        setMessages(parsed);
        setSessionStarted(true);
      }
      const savedModel = localStorage.getItem('interview_model');
      if (savedModel) {
        setSelectedModel(savedModel);
      }
    } catch (error) {
      console.error('Failed to restore interview messages:', error);
    }
    setIsHydrated(true);
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('interview_messages', JSON.stringify(messages));
      } catch (error) {
        console.error('Failed to save interview messages:', error);
      }
    }
  }, [messages]);

  // Save model to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('interview_model', selectedModel);
    } catch (error) {
      console.error('Failed to save model:', error);
    }
  }, [selectedModel]);

  // Save model to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('interview_model', selectedModel);
    } catch (error) {
      console.error('Failed to save model:', error);
    }
  }, [selectedModel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Only start if hydrated and session not already started
    if (isHydrated && !sessionStarted && messages.length === 0) {
      startInterview();
    }
  }, [isHydrated]);

  const startInterview = async () => {
    setSessionStarted(true);
    setLoading(true);
    try {
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel }),
      });

      if (response.ok) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let content = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            content += decoder.decode(value);
          }
        }

        setMessages([
          {
            type: 'assistant',
            content: content.trim(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to start interview:', error);
      setMessages([
        {
          type: 'assistant',
          content: 'Failed to start the interview. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Check if user wants to end the interview
    if (input.toLowerCase() === 'stop' || input.toLowerCase() === 'done') {
      const transcript = messages.map((m) => `${m.type === 'user' ? 'User' : 'Interviewer'}: ${m.content}`).join('\n\n');
      onComplete(transcript);
      return;
    }

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { type: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/interview/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, model: selectedModel }),
      });

      if (response.ok) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let content = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            content += decoder.decode(value);
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            type: 'assistant',
            content: content.trim(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to get response:', error);
      setMessages((prev) => [
        ...prev,
        {
          type: 'assistant',
          content: 'Failed to get response. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
      // Focus input for next question
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const generateTranscript = () => {
    const transcript = messages.map((m) => `${m.type === 'user' ? '**User:** ' : '**Interviewer:** '}${m.content}`).join('\n\n');
    onComplete(transcript);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-slate-800/80 bg-slate-900/70 px-5 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-slate-100 transition hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer"
              onClick={onBack}
            >
              <span aria-hidden>←</span>
              Back
            </button>
            <div>
              <h1 className="text-xl font-semibold text-slate-50">Interview Session</h1>
              <p className="text-sm text-slate-400">Answer questions to gather content material</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="interview-model" className="text-xs text-slate-400">Model:</label>
              <select
                id="interview-model"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={loading || models.length === 0}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {models.length === 0 ? (
                  <option>Loading models...</option>
                ) : (
                  <>
                    {models.filter(m => !m.isPremium).length > 0 && (
                      <optgroup label="Free Models">
                        {models.filter(m => !m.isPremium).map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {models.filter(m => m.isPremium).length > 0 && (
                      <optgroup label="Premium Models">
                        {models.filter(m => m.isPremium).map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name} ({model.multiplier}x)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                )}
              </select>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-slate-100 transition hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              onClick={generateTranscript}
              disabled={messages.length < 2}
            >
              Generate Transcript
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 py-6">
        <div className="mx-auto flex min-h-[68vh] max-w-5xl flex-col rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <div className="flex flex-1 flex-col gap-3">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={
                  message.type === 'user'
                    ? 'ml-auto max-w-[70%] rounded-xl bg-linear-to-r from-purple-500 to-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 shadow-lg shadow-purple-500/30'
                    : 'mr-auto max-w-[72%] rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-3 text-sm text-slate-100 shadow-lg shadow-black/30'
                }
              >
                <Streamdown>{message.content}</Streamdown>
              </div>
            ))}
            {loading && (
              <div className="mr-auto max-w-[72%] rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-3 text-sm text-slate-100 shadow-lg shadow-black/30" aria-live="polite">
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-purple-400" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-grow textarea
                if (inputRef.current) {
                  inputRef.current.style.height = 'auto';
                  inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
                }
              }}
              onKeyDown={(e) => {
                // Submit on Enter, but allow Shift+Enter for new line
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              disabled={loading}
              placeholder="Type your answer (or 'stop' to end)... Shift+Enter for new line"
              rows={3}
              className="min-h-15 max-h-50 flex-1 resize-none rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:cursor-not-allowed disabled:opacity-60 overflow-y-auto"
            />
            <button
              type="submit"
              className="self-end inline-flex items-center justify-center rounded-xl bg-linear-to-r from-purple-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(124,58,237,0.35)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </form>
          <div className="mt-1 text-xs text-slate-400">Type "stop" or "done" when you want to end the interview.</div>
        </div>
      </div>
    </div>
  );
}
