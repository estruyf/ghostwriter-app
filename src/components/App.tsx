import React, { useState, useEffect } from 'react';
import { getInterview, updateInterview, generateTitleFromText } from '../lib/api';
import Home from './Home';
import Interview from './Interview';
import ArticleWriter from './ArticleWriter';
import Results from './Results';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';

type AppState = 'home' | 'interview' | 'article' | 'results';

const STORAGE_KEY = 'ghostwriter_session';

interface SessionData {
  state: AppState;
  resultType: 'interview' | 'article';
  resultContent: string;
  activeInterviewId?: string;
}

export default function App() {
  const [state, setState] = useState<AppState>('home');
  const [resultType, setResultType] = useState<'interview' | 'article'>('interview');
  const [resultContent, setResultContent] = useState('');
  const [activeInterviewId, setActiveInterviewId] = useState<string | undefined>();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarRefresh, setSidebarRefresh] = useState<(() => void) | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const session: SessionData = JSON.parse(saved);
        // Only restore content, always start on home
        // setState(session.state);
        setResultType(session.resultType);
        setResultContent(session.resultContent);
        setActiveInterviewId(session.activeInterviewId);
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
    setIsHydrated(true);
  }, []);

  // Save session to localStorage whenever state changes
  useEffect(() => {
    if (!isHydrated) return;

    const session: SessionData = {
      state,
      resultType,
      resultContent,
      activeInterviewId,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }, [state, resultType, resultContent, activeInterviewId, isHydrated]);

  const handleSelectMode = (mode: 'interview' | 'article') => {
    if (mode === 'interview') {
      setActiveInterviewId(undefined); // New interview
    }
    setResultType(mode);
    setState(mode);
  };

  const handleSelectInterview = async (id: string) => {
    setActiveInterviewId(id);

    // Check if interview has a transcript
    try {
      const interview = await getInterview(id);
      if (interview && interview.transcript) {
        setResultType('interview');
        setResultContent(interview.transcript);
        setState('results');
      } else {
        setResultType('interview');
        setState('interview');
      }
    } catch (e) {
      console.error("Failed to check interview transcript", e);
      setResultType('interview');
      setState('interview');
    }
  };

  const handleNewInterview = () => {
    setActiveInterviewId(undefined);
    setResultType('interview');
    setState('interview');
  };

  const handleInterviewComplete = (transcript: string) => {
    setResultContent(transcript);
    setState('results');
  };

  const handleArticleComplete = (article: string) => {
    setResultContent(article);
    setState('results');
  };

  const handleBackToHome = () => {
    setState('home');
    setResultContent('');
    setActiveInterviewId(undefined);
    // Clear session-specific localStorage when returning home
    localStorage.removeItem('interview_messages');
    localStorage.removeItem('interview_model');
    localStorage.removeItem('article_interview_content');
    localStorage.removeItem('article_voice_content');
    localStorage.removeItem('article_generated');
    localStorage.removeItem('article_model');
  };

  const showSidebar = (state === 'home' || state === 'interview') && isSidebarOpen;
  const canToggleSidebar = state === 'home' || state === 'interview';

  // Prevent rendering until hydrated to avoid hydration mismatch
  if (!isHydrated) {
    return null;
  }

  return (
    <div className="flex h-screen flex-row overflow-hidden bg-slate-950">
      {/* Sidebar - Full height on left */}
      {showSidebar && (
        <div className="pt-10 h-full bg-slate-900/50 border-r border-slate-800 flex-shrink-0">
          <Sidebar
            onSelect={handleSelectInterview}
            onNew={handleNewInterview}
            onToggle={() => setIsSidebarOpen(false)}
            currentId={activeInterviewId}
            onRefreshReady={setSidebarRefresh}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* TitleBar overlaid or at top */}
        <div className="absolute top-0 left-0 right-0 z-50">
          <TitleBar />
        </div>

        {/* Sidebar Toggle (when closed) */}
        {!isSidebarOpen && canToggleSidebar && state !== 'interview' && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-12 left-4 z-40 p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition shadow-sm border border-slate-800 bg-slate-900/80 backdrop-blur"
            title="Open Sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}

        {/* Content with padding for TitleBar */}
        <div className="flex-1 min-h-0 pt-10 overflow-hidden flex flex-col">
          {state === 'home' && <Home onSelect={handleSelectMode} />}
          {state === 'interview' && (
            <Interview
              onBack={handleBackToHome}
              onComplete={handleInterviewComplete}
              interviewId={activeInterviewId}
              onInterviewCreated={setActiveInterviewId}
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />
          )}
          {state === 'article' && (
            <ArticleWriter onBack={handleBackToHome} onComplete={handleArticleComplete} />
          )}
          {state === 'results' && (
            <Results
              content={resultContent}
              title={resultType}
              onBack={handleBackToHome}
              editable={resultType === 'interview' && !!activeInterviewId}
              onSave={activeInterviewId ? async (content) => {
                try {
                  const title = await generateTitleFromText(content);
                  await updateInterview(activeInterviewId!, { transcript: content, title: title || 'Untitled' });
                  // Refresh sidebar immediately after save
                  if (sidebarRefresh) {
                    sidebarRefresh();
                  }
                } catch (e) {
                  console.error('Failed to save transcript:', e);
                }
              } : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
