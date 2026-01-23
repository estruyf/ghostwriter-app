import React, { useState, useRef, useEffect } from 'react';

interface ArticleProps {
  onBack: () => void;
  onComplete: (article: string) => void;
}

export default function ArticleWriter({ onBack, onComplete }: ArticleProps) {
  const [interviewContent, setInterviewContent] = useState('');
  const [voiceContent, setVoiceContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [models, setModels] = useState<Array<{ id: string; name: string; isPremium: boolean; multiplier: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

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

  // Restore article writer state from localStorage on mount
  useEffect(() => {
    try {
      const savedInterview = localStorage.getItem('article_interview_content');
      const savedVoice = localStorage.getItem('article_voice_content');
      const savedArticle = localStorage.getItem('article_generated');
      const savedModel = localStorage.getItem('article_model');

      if (savedInterview) setInterviewContent(savedInterview);
      if (savedVoice) setVoiceContent(savedVoice);
      if (savedArticle) setArticle(savedArticle);
      if (savedModel) setSelectedModel(savedModel);
    } catch (error) {
      console.error('Failed to restore article writer state:', error);
    }
  }, []);

  // Save interview content to localStorage
  useEffect(() => {
    if (interviewContent) {
      try {
        localStorage.setItem('article_interview_content', interviewContent);
      } catch (error) {
        console.error('Failed to save interview content:', error);
      }
    }
  }, [interviewContent]);

  // Save voice content to localStorage
  useEffect(() => {
    if (voiceContent) {
      try {
        localStorage.setItem('article_voice_content', voiceContent);
      } catch (error) {
        console.error('Failed to save voice content:', error);
      }
    }
  }, [voiceContent]);

  // Save generated article to localStorage
  useEffect(() => {
    if (article) {
      try {
        localStorage.setItem('article_generated', article);
      } catch (error) {
        console.error('Failed to save article:', error);
      }
    }
  }, [article]);

  // Save model to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('article_model', selectedModel);
    } catch (error) {
      console.error('Failed to save model:', error);
    }
  }, [selectedModel]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setInterviewContent(text);
  };

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setVoiceContent(text);
  };

  const handleGenerateArticle = async () => {
    if (!interviewContent.trim() || loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/article/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interview: interviewContent,
          voice: voiceContent || undefined,
          model: selectedModel
        }),
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
            setArticle(content); // Update in real-time
          }
        }

        setArticle(content.trim());
      }
    } catch (error) {
      console.error('Failed to generate article:', error);
      setArticle('Failed to generate article. Please try again.');
    } finally {
      setLoading(false);
    }
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
              <h1 className="text-xl font-semibold text-slate-50">Write Article</h1>
              <p className="text-sm text-slate-400">Transform your interview into a polished article</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="article-model" className="text-xs text-slate-400">Model:</label>
            <select
              id="article-model"
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
        </div>
      </div>

      <div className="flex-1 px-5 py-6">
        <div className="mx-auto grid min-h-[68vh] max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
            <div className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-100">
              Voice Guide (Optional)
            </div>
            {!voiceContent ? (
              <button
                type="button"
                className="grid min-h-[100px] place-items-center rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 px-4 py-4 text-center text-slate-400 transition hover:border-purple-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer"
                onClick={() => voiceInputRef.current?.click()}
              >
                <div className="text-2xl mb-1">🎙️</div>
                <div className="text-sm font-semibold text-slate-100">Upload voice/style guide</div>
                <div className="text-xs text-slate-400">Markdown (.md) or text (.txt)</div>
              </button>
            ) : (
              <>
                <div className="min-h-[100px] max-h-[140px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs leading-relaxed text-slate-200 shadow-inner shadow-black/30">
                  {voiceContent}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-800 px-2 py-1.5 text-xs text-slate-100 transition hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer"
                    onClick={() => voiceInputRef.current?.click()}
                  >
                    Replace
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-800 px-2 py-1.5 text-xs text-slate-100 transition hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer"
                    onClick={() => setVoiceContent('')}
                  >
                    Clear
                  </button>
                </div>
              </>
            )}

            <input ref={voiceInputRef} type="file" accept=".md,.txt" onChange={handleVoiceUpload} className="hidden" />

            <div className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-100 mt-2">
              Interview Input
            </div>
            {!interviewContent ? (
              <button
                type="button"
                className="grid min-h-[220px] place-items-center rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 px-4 py-6 text-center text-slate-400 transition hover:border-purple-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-3xl mb-2">➕</div>
                <div className="text-base font-semibold text-slate-100">Upload interview file</div>
                <div className="text-sm text-slate-400">Markdown (.md) or text (.txt)</div>
              </button>
            ) : (
              <>
                <div className="min-h-[220px] whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-200 shadow-inner shadow-black/30">
                  {interviewContent}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-slate-100 transition hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Replace File
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-slate-100 transition hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer"
                    onClick={() => {
                      setInterviewContent('');
                      setVoiceContent('');
                      setArticle('');
                    }}
                  >
                    Clear
                  </button>
                </div>
              </>
            )}

            <input ref={fileInputRef} type="file" accept=".md,.txt" onChange={handleFileUpload} className="hidden" />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
            <div className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-100">
              Generated Article
            </div>

            {!article && interviewContent && !loading && (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-slate-300">
                <button
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(124,58,237,0.35)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer"
                  onClick={handleGenerateArticle}
                >
                  Generate Article
                </button>
                <span className="text-xs text-slate-400">Turn your interview into a polished draft</span>
              </div>
            )}

            {loading && (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-slate-300">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-purple-400" />
                <div>Generating your article...</div>
                <div className="text-xs text-slate-400">This may take a moment</div>
              </div>
            )}

            {article && (
              <>
                <div className="min-h-[220px] whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-200 shadow-inner shadow-black/30">
                  {article}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(124,58,237,0.35)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer"
                    onClick={() => onComplete(article)}
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
