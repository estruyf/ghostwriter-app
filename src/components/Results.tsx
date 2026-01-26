import React from 'react';
import AlertModal from './AlertModal';

interface ResultsProps {
  content: string;
  title: string;
  onBack: () => void;
  onSave?: (content: string) => void;
  editable?: boolean;
}

export default function Results({ content, title, onBack, onSave, editable = false }: ResultsProps) {
  const [currentContent, setCurrentContent] = React.useState(content);
  const [isEditing, setIsEditing] = React.useState(false);
  const [alertState, setAlertState] = React.useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });
  const contentViewRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Sync content prop if it changes
  React.useEffect(() => {
    setCurrentContent(content);
  }, [content]);

  // Auto-scroll to bottom when new content arrives (e.g., streaming chunks)
  React.useEffect(() => {
    if (isEditing) {
      if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    } else if (contentViewRef.current) {
      contentViewRef.current.scrollTop = contentViewRef.current.scrollHeight;
    }
  }, [currentContent, isEditing]);

  const downloadMarkdown = () => {
    const element = document.createElement('a');
    const file = new Blob([currentContent], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `ghostwriter-${title}-${Date.now()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentContent);
      setAlertState({
        isOpen: true,
        title: 'Copied',
        message: 'Content copied to clipboard!'
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(currentContent);
      setAlertState({
        isOpen: true,
        title: 'Saved',
        message: 'Saved successfully.'
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800/80 bg-slate-900/70 px-5 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-50">{title === 'interview' ? 'Interview Transcript' : 'Generated Article'}</h1>
            <p className="text-sm text-slate-400">Your content is ready</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onSave && (
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-500/10 px-3 py-2 text-purple-200 transition hover:bg-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer"
                onClick={handleSave}
              >
                Save
              </button>
            )}
            {editable && (
              <button
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-purple-500/40 hover:cursor-pointer ${isEditing ? 'border-purple-500 bg-purple-500/10' : 'border-slate-800 hover:border-purple-400'}`}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Stop Editing' : 'Edit'}
              </button>
            )}
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

      <div className="flex-1 min-h-0 px-5 py-6 flex flex-col overflow-hidden">
        <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col min-h-0 rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <div className="flex-none inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-100 self-start">
            Content
          </div>
          {isEditing ? (
            <textarea
              value={currentContent}
              onChange={(e) => setCurrentContent(e.target.value)}
              ref={textareaRef}
              className="scrollbar-custom mt-3 flex-1 w-full resize-none rounded-xl border border-slate-700 bg-slate-950/80 p-4 text-sm leading-relaxed text-slate-200 font-mono focus:border-purple-500 focus:outline-none"
            />
          ) : (
            <div
              ref={contentViewRef}
              className="scrollbar-custom mt-3 flex-1 overflow-auto whitespace-pre-wrap wrap-break-word rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-200 shadow-inner shadow-black/30"
            >
              {currentContent}
            </div>
          )}
        </div>
      </div>

      <AlertModal
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState({ ...alertState, isOpen: false })}
      />
    </div>
  );
}
