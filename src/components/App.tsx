import React, { useState, useEffect } from 'react';
import Home from './Home';
import Interview from './Interview';
import ArticleWriter from './ArticleWriter';
import Results from './Results';

type AppState = 'home' | 'interview' | 'article' | 'results';

const STORAGE_KEY = 'ghostwriter_session';

interface SessionData {
  state: AppState;
  resultType: 'interview' | 'article';
  resultContent: string;
}

export default function App() {
  const [state, setState] = useState<AppState>('home');
  const [resultType, setResultType] = useState<'interview' | 'article'>('interview');
  const [resultContent, setResultContent] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const session: SessionData = JSON.parse(saved);
        setState(session.state);
        setResultType(session.resultType);
        setResultContent(session.resultContent);
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
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }, [state, resultType, resultContent, isHydrated]);

  const handleSelectMode = (mode: 'interview' | 'article') => {
    setResultType(mode);
    setState(mode);
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
    // Clear session-specific localStorage when returning home
    localStorage.removeItem('interview_messages');
    localStorage.removeItem('interview_model');
    localStorage.removeItem('article_interview_content');
    localStorage.removeItem('article_voice_content');
    localStorage.removeItem('article_generated');
    localStorage.removeItem('article_model');
  };

  // Prevent rendering until hydrated to avoid hydration mismatch
  if (!isHydrated) {
    return null;
  }

  return (
    <>
      {state === 'home' && <Home onSelect={handleSelectMode} />}
      {state === 'interview' && (
        <Interview onBack={handleBackToHome} onComplete={handleInterviewComplete} />
      )}
      {state === 'article' && (
        <ArticleWriter onBack={handleBackToHome} onComplete={handleArticleComplete} />
      )}
      {state === 'results' && (
        <Results
          content={resultContent}
          title={resultType}
          onBack={handleBackToHome}
        />
      )}
    </>
  );
}
