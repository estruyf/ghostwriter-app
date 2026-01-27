import React, { useState, useRef, useEffect } from 'react';
import { listModels, listInterviews, listVoices, saveVoice, generateArticle as apiGenerateArticle, isAuthenticationError } from '../lib/api';

interface ArticleProps {
  onBack: () => void;
  onComplete: (article: string) => void;
  onAuthenticationRequired?: () => void;
}

interface Interview {
  id: string;
  title: string;
  createdAt: number;
}

interface VoiceProfile {
  id: string;
  name: string;
  content: string;
}

export default function ArticleWriter({ onBack, onComplete, onAuthenticationRequired }: ArticleProps) {
  const [interviewContent, setInterviewContent] = useState('');
  const [selectedInterviewId, setSelectedInterviewId] = useState('');
  const [interviews, setInterviews] = useState<Interview[]>([]);

  const [voiceContent, setVoiceContent] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [showSaveVoice, setShowSaveVoice] = useState(false);
  const [newVoiceName, setNewVoiceName] = useState('');

  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [models, setModels] = useState<Array<{ id: string; name: string; isPremium: boolean; multiplier: number }>>([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  const loadingMessages = [
    'Working on it...',
    'Thinking really hard...',
    'Shall I actually write this?',
    'Consulting the AI gods...',
    'Adding some creative flair...',
    'Making it sound professional...',
    'Removing the boring parts...',
    'Finding the perfect words...',
    'Almost there... probably...',
    'This is harder than it looks...',
    'Pretending to know what I\'m doing...',
    'Generating something amazing...',
    'Or at least trying to...',
    'Just a few more seconds...',
    'Still thinking...',
    'This better be good...',
  ];

  // Fetch available models, interviews, voices
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [modelsData, interviewsData, voicesData] = await Promise.all([
          listModels(),
          listInterviews(),
          listVoices()
        ]);
        setModels(modelsData);
        setInterviews(interviewsData);
        setVoices(voicesData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Fallback to hardcoded models
        setModels([
          { id: 'gpt-4.1', name: 'GPT-4.1', isPremium: false, multiplier: 0 },
          { id: 'gpt-5-mini', name: 'GPT-5 mini', isPremium: false, multiplier: 0 },
          { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', isPremium: true, multiplier: 1 },
          { id: 'gpt-5', name: 'GPT-5', isPremium: true, multiplier: 1 },
        ]);
      }
    };
    fetchData();
  }, []);

  // Auto-select the single saved voice profile if exactly one exists
  useEffect(() => {
    if (voices.length === 1 && !selectedVoiceId && !voiceContent) {
      setSelectedVoiceId(voices[0].id);
      setVoiceContent('');
      setShowSaveVoice(false);
    }
  }, [voices, selectedVoiceId, voiceContent]);

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
    if ((!interviewContent.trim() && !selectedInterviewId) || loading) return;

    setLoading(true);
    setArticle('');
    setLoadingMessage(loadingMessages[0]);

    // Rotate loading messages every 3 seconds
    const messageInterval = setInterval(() => {
      setLoadingMessage(prev => {
        const currentIndex = loadingMessages.indexOf(prev);
        const nextIndex = (currentIndex + 1) % loadingMessages.length;
        return loadingMessages[nextIndex];
      });
    }, 3000);

    try {
      let content = '';
      const result = await apiGenerateArticle({
        interview: interviewContent,
        interviewId: selectedInterviewId || undefined,
        voice: voiceContent || undefined,
        voiceId: selectedVoiceId || undefined,
        model: selectedModel
      }, (chunk) => {
        content += chunk;
        setArticle(content); // Update in real-time
      });

      if (!content && result && (result as any).content) {
        content = (result as any).content;
      }

      setArticle(content.trim());

      // Automatically show the article in the results view
      if (content.trim()) {
        onComplete(content.trim());
      }
    } catch (error) {
      console.error('Failed to generate article:', error);
      // Check if it's an authentication error
      if (isAuthenticationError(error)) {
        onAuthenticationRequired?.();
      }
      setArticle('Failed to generate article. Please try again.');
    } finally {
      clearInterval(messageInterval);
      setLoading(false);
    }
  };

  const handleSaveVoice = async () => {
    if (newVoiceName.trim() && voiceContent) {
      try {
        const saved = await saveVoice(newVoiceName, voiceContent);
        setVoices(prev => [saved, ...prev]);
        setSelectedVoiceId(saved.id);
        setVoiceContent('');
        setShowSaveVoice(false);
        setNewVoiceName('');
      } catch (e) {
        console.error("Failed to save voice", e);
      }
    }
  };

  return (
    <div className="flex h-full flex-col">
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

      <div className="flex-1 min-h-0 px-5 py-6 flex flex-col overflow-hidden">
        <div className="mx-auto grid flex-1 min-h-0 w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-y-auto scrollbar-custom min-h-0">
            <div className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-100">
              Voice Guide (Optional)
            </div>

            <div className="mb-2">
              <select
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                value={selectedVoiceId}
                onChange={(e) => {
                  setSelectedVoiceId(e.target.value);
                  if (e.target.value) {
                    setVoiceContent('');
                    setShowSaveVoice(false);
                  }
                }}
              >
                <option value="">-- Select saved voice --</option>
                {voices.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="text-center text-xs text-slate-500 my-1">- OR -</div>

            {!voiceContent && !selectedVoiceId ? (
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
              selectedVoiceId ? (
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 text-slate-300 text-sm flex justify-between items-center">
                  <span>Using voice: <strong>{voices.find(v => v.id === selectedVoiceId)?.name}</strong></span>
                  <button
                    className="text-xs text-purple-400 hover:text-purple-300 underline"
                    onClick={() => setSelectedVoiceId('')}
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <>
                  <div className="scrollbar-custom min-h-[100px] max-h-[140px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs leading-relaxed text-slate-200 shadow-inner shadow-black/30">
                    {voiceContent}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
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
                    {!showSaveVoice ? (
                      <button
                        className="text-xs text-purple-400 hover:text-purple-300 underline ml-auto"
                        onClick={() => setShowSaveVoice(true)}
                      >
                        Save as new profile
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 ml-auto">
                        <input
                          placeholder="Profile name"
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white w-32"
                          value={newVoiceName}
                          onChange={e => setNewVoiceName(e.target.value)}
                        />
                        <button
                          className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded"
                          onClick={handleSaveVoice}
                        >
                          Save
                        </button>
                        <button
                          className="text-xs text-slate-400 hover:text-slate-300"
                          onClick={() => setShowSaveVoice(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ))}

            <input ref={voiceInputRef} type="file" accept=".md,.txt" onChange={handleVoiceUpload} className="hidden" />

            <div className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-100 mt-2">
              Interview Input
            </div>

            <div className="mb-2">
              <select
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                value={selectedInterviewId}
                onChange={(e) => {
                  setSelectedInterviewId(e.target.value);
                  if (e.target.value) setInterviewContent(''); // Clear manual content if selecting ID
                }}
              >
                <option value="">-- Select from saved interviews --</option>
                {interviews.map(i => (
                  <option key={i.id} value={i.id}>{i.title} ({new Date(i.createdAt).toLocaleDateString()})</option>
                ))}
              </select>
            </div>

            <div className="text-center text-xs text-slate-500 my-1">- OR -</div>

            {!interviewContent && !selectedInterviewId ? (
              <button
                type="button"
                className="grid min-h-[160px] place-items-center rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 px-4 py-6 text-center text-slate-400 transition hover:border-purple-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-3xl mb-2">➕</div>
                <div className="text-base font-semibold text-slate-100">Upload interview file</div>
                <div className="text-sm text-slate-400">Markdown (.md) or text (.txt)</div>
              </button>
            ) : (
              selectedInterviewId ? (
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 text-slate-300 text-sm text-center">
                  Using saved interview: <strong>{interviews.find(i => i.id === selectedInterviewId)?.title}</strong>
                  <br />
                  <button
                    className="mt-2 text-xs text-purple-400 hover:text-purple-300 underline"
                    onClick={() => setSelectedInterviewId('')}
                  >
                    Clear selection
                  </button>
                </div>
              ) : (
                <>
                  <div className="scrollbar-custom min-h-[160px] max-h-[40vh] overflow-auto whitespace-pre-wrap wrap-break-word rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-200 shadow-inner shadow-black/30">
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
              ))}

            <input ref={fileInputRef} type="file" accept=".md,.txt" onChange={handleFileUpload} className="hidden" />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-y-auto scrollbar-custom min-h-0">
            <div className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-100">
              Generated Article
            </div>

            {!article && !loading && (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-slate-300">
                <button
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(124,58,237,0.35)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-75"
                  onClick={handleGenerateArticle}
                  disabled={!interviewContent && !selectedInterviewId}
                >
                  Generate Article
                </button>
                <span className="text-xs text-slate-400">
                  {interviewContent || selectedInterviewId
                    ? 'Turn your interview into a polished draft'
                    : 'Please select or import your interview'}
                </span>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-300 p-4">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-purple-400" />
                <div>{loadingMessage}</div>
                <div className="text-xs text-slate-400">This may take a moment</div>
              </div>
            )}

            {article && (
              <>
                <div className="scrollbar-custom min-h-[220px] max-h-[40vh] overflow-auto whitespace-pre-wrap wrap-break-word rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-200 shadow-inner shadow-black/30">
                  {article}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
