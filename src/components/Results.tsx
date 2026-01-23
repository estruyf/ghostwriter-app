import React, { useEffect } from 'react';

interface ResultsProps {
  content: string;
  title: string;
  onBack: () => void;
}

export default function Results({ content, title, onBack }: ResultsProps) {
  const downloadMarkdown = () => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `ghostwriter-${title}-${Date.now()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      alert('Content copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-slate-800/80 bg-slate-900/70 px-5 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-50">{title === 'interview' ? 'Interview Transcript' : 'Generated Article'}</h1>
            <p className="text-sm text-slate-400">Your content is ready</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-slate-100 transition hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer"
              onClick={copyToClipboard}
            >
              Copy
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-slate-100 transition hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer"
              onClick={downloadMarkdown}
            >
              Download
            </button>
            <button
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(124,58,237,0.35)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer"
              onClick={onBack}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 py-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <div className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-100">
            Content
          </div>
          <div className="mt-3 min-h-[220px] whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-200 shadow-inner shadow-black/30">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
