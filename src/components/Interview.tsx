import React, { useState, useRef, useEffect } from 'react';
import { Streamdown } from 'streamdown';
import { listModels, startInterview as apiStartInterview, askInterview as apiAskInterview, getInterview } from '../lib/api';

interface Message {
  role: string;
  content: string;
}

interface InterviewProps {
  onBack: () => void;
  onComplete: (transcript: string) => void;
  interviewId?: string;
  onInterviewCreated?: (id: string) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function Interview({ onBack, onComplete, interviewId, onInterviewCreated, isSidebarOpen, onToggleSidebar }: InterviewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4.1');
  const [models, setModels] = useState<Array<{ id: string; name: string; isPremium: boolean; multiplier: number }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [currentId, setCurrentId] = useState<string | undefined>(interviewId);

  // Sync prop change
  useEffect(() => {
    if (interviewId !== currentId) {
      setCurrentId(interviewId);
      setSessionStarted(false);
      setMessages([]);
      if (interviewId) {
        loadInterview(interviewId);
      }
    }
  }, [interviewId]);

  const loadInterview = async (id: string) => {
    try {
      setLoading(true);
      const interview = await getInterview(id);
      if (interview) {
        setMessages(interview.messages);
        setSessionStarted(true);
        setSelectedModel(interview.model);

        // Resume session in backend?
        // The backend handler handles lazy resumption if ID is passed.
        // But we might want to ensure the session is active.
        // Calling startInterview with ID does that.
        await apiStartInterview(interview.model, id, (chunk) => {
          // We don't expect a chunk here usually unless we trigger a resume prompt
          // But let's just ignore or log
        });
      }
    } catch (e) {
      console.error("Failed to load interview", e);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Fetch available models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await listModels();
        setModels(data);
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

  // Restore messages from localStorage on mount (LEGACY - only if no ID)
  useEffect(() => {
    if (currentId) return; // Don't use local storage if we have a managed interview

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

  // Save messages to localStorage whenever they change (LEGACY)
  useEffect(() => {
    if (currentId) return;

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    // Ensure we really hit the bottom for fast updates
    if (messagesEndRef.current?.parentElement) {
      const parent = messagesEndRef.current.parentElement;
      if (parent.scrollHeight - parent.scrollTop - parent.clientHeight < 100) {
        parent.scrollTop = parent.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Only start if hydrated and session not already started
    if (isHydrated && !sessionStarted && messages.length === 0 && !currentId) {
      startInterview();
    }
  }, [isHydrated, sessionStarted, messages.length, currentId]);

  const startInterview = async () => {
    setSessionStarted(true);
    setLoading(true);

    // Optimistically add assistant message placeholder if not resuming
    // Wait, if resuming (currentId exists), we might fetch history first.
    // But startInterview handles history fetching?
    // No, startInterview with ID resumes session. 
    // If it's a NEW interview (no ID), it sends initial prompt.
    // If it has ID, it just resumes session, returns interview object.

    // We can't easily know if 'startInterview' will produce text without duplicating logic.
    // But we know if (!currentId) it produces text.

    const isNew = !currentId;
    if (isNew) {
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    }

    try {
      let content = '';
      const interview = await apiStartInterview(selectedModel, currentId, (chunk) => {
        // const trimmedChunk = chunk.trim();
        // if (trimmedChunk) {
        //   const words = content.trim().split(/\s+/);
        //   const lastWord = words[words.length - 1];
        //   if (lastWord === trimmedChunk) {
        //     return;
        //   }
        // }

        content += chunk;
        if (isNew) {
          // setMessages(prev => {
          //   const updated = [...prev];
          //   const last = updated[updated.length - 1];
          //   if (last && last.role === 'assistant') {
          //     updated[updated.length - 1] = { ...last, content };
          //   }
          //   return updated;
          // });
        }
      });

      if (interview && interview.id) {
        setCurrentId(interview.id);
        if (onInterviewCreated) onInterviewCreated(interview.id);
      }

      // Fallback: Use returned message if streaming missed it
      if (isNew && !content && interview.messages && interview.messages.length > 0) {
        const lastMsg = interview.messages[interview.messages.length - 1];
        if (lastMsg.role === 'assistant') {
          content = lastMsg.content;
        }
      }

      // If we didn't stream (e.g. rapid response or logic mismatch), ensure content is set
      if (isNew && content) {
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: content.trim() };
          } else {
            updated.push({ role: 'assistant', content: content.trim() });
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to start interview:', error);
      // Remove the placeholder if it failed? Or show error in it.
      setMessages(prev => {
        if (isNew) {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && !updated[updated.length - 1].content) {
            updated.pop(); // Remove empty placeholder
          }
          updated.push({ role: 'assistant', content: 'Failed to start the interview. Please try again.' });
          return updated;
        }
        return prev;
      });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Check if user wants to end the interview
    if (input.toLowerCase() === 'stop' || input.toLowerCase() === 'done') {
      const transcript = messages.map((m) => `${m.role === 'user' ? 'User' : 'Interviewer'}: ${m.content}`).join('\n\n');
      onComplete(transcript);
      return;
    }

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // Add placeholder
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      let content = '';

      // Ensure we have an ID
      let activeId = currentId;
      if (!activeId) {
        console.warn("No active activeId, trying to start one...");
        const interview = await apiStartInterview(selectedModel, undefined, () => { });
        activeId = interview.id;
        setCurrentId(activeId);
        if (onInterviewCreated) onInterviewCreated(activeId);
      }

      const result = await apiAskInterview(userMessage, selectedModel, activeId!, (chunk) => {
        // const trimmedChunk = chunk.trim();
        // if (trimmedChunk) {
        //   const words = content.trim().split(/\s+/);
        //   const lastWord = words[words.length - 1];
        //   if (lastWord === trimmedChunk) {
        //     return;
        //   }
        // }

        content += chunk;
        // setMessages(prev => {
        //   const updated = [...prev];
        //   const last = updated[updated.length - 1];
        //   if (last && last.role === 'assistant') {
        //     updated[updated.length - 1] = { ...last, content };
        //   }
        //   return updated;
        // });
      });

      // Fallback if streaming failed
      if (!content && result && (result as any).content) {
        content = (result as any).content;
      }

      // Finalize
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: content.trim() };
        }
        return updated;
      });

      // Auto-detect interview completion and save transcript
      const completionPhrases = [
        'interview is now complete',
        'interview is complete',
        'the interview has concluded',
        'we\'ve concluded the interview'
      ];

      const lowerContent = content.toLowerCase();
      const isInterviewComplete = completionPhrases.some(phrase => lowerContent.includes(phrase));

      if (isInterviewComplete) {
        // Wait a moment for the message to be visible, then save
        setTimeout(() => {
          const transcript = messages.map((m) => `${m.role === 'user' ? '**User:** ' : '**Interviewer:** '}${m.content}`).join('\n\n');
          // Add the final assistant message that triggered completion
          const fullTranscript = transcript + `\n\n**Interviewer:** ${content.trim()}`;
          onComplete(fullTranscript);
        }, 1500);
      }

    } catch (error) {
      console.error('Failed to get response:', error);
      setMessages((prev) => {
        // Replace placeholder with error
        const updated = [...prev];
        updated.pop();
        updated.push({ role: 'assistant', content: 'Failed to get response. Please try again.' });
        return updated;
      });
    } finally {
      setLoading(false);
      // Focus input for next question
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const generateTranscript = () => {
    const transcript = messages.map((m) => `${m.role === 'user' ? '**User:** ' : '**Interviewer:** '}${m.content}`).join('\n\n');
    onComplete(transcript);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800/80 bg-slate-900/70 px-5 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && onToggleSidebar && (
              <button
                className="inline-flex items-center justify-center rounded-lg border border-slate-800 p-2 text-slate-100 transition hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer"
                onClick={onToggleSidebar}
                title="Toggle sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
            )}
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
            {/* <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-slate-100 transition hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              onClick={generateTranscript}
              disabled={messages.length < 2}
            >
              Generate Transcript
            </button> */}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-5 py-6 flex flex-col">
        <div className="mx-auto flex flex-1 min-h-0 w-full max-w-5xl flex-col rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto scrollbar-custom pr-3">
            {messages.map((message, idx) => (
              message.content && (
                <Streamdown key={idx} className={
                  message.role === 'user'
                    ? 'ml-auto max-w-[70%] rounded-xl bg-linear-to-r from-purple-500 to-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 shadow-lg shadow-purple-500/30'
                    : 'mr-auto max-w-[72%] rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-3 text-sm text-slate-100 shadow-lg shadow-black/30'
                }>{message.content}</Streamdown>
              )
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
              className="min-h-15 max-h-50 flex-1 resize-none rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:cursor-not-allowed disabled:opacity-60 overflow-y-auto scrollbar-custom"
            />

            <div className="flex items-center justify-between">
              <div className="mt-1 text-xs text-slate-400">Type "stop" or "done" when you want to end the interview.</div>
              <button
                type="submit"
                className="self-end inline-flex items-center justify-center rounded-xl bg-linear-to-r from-purple-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(124,58,237,0.35)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                disabled={loading || !input.trim()}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
