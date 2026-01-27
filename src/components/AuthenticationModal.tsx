import React from 'react';

interface AuthenticationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthenticationModal({ isOpen, onClose }: AuthenticationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black">
        <h3 className="text-lg font-semibold text-slate-100">Authentication Required</h3>
        <p className="mt-4 text-slate-400">You need to authenticate to use GitHub Copilot. Please follow these steps:</p>

        <div className="mt-4 space-y-3 rounded-lg bg-slate-800/50 p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 rounded-full bg-purple-600 text-white w-6 h-6 flex items-center justify-center text-sm font-semibold">1</div>
            <div>
              <p className="text-sm font-medium text-slate-100">Open your terminal</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 rounded-full bg-purple-600 text-white w-6 h-6 flex items-center justify-center text-sm font-semibold">2</div>
            <div>
              <p className="text-sm font-medium text-slate-100">Run the command</p>
              <code className="mt-1 block bg-slate-900 px-2 py-1 rounded text-xs text-purple-300 font-mono">copilot</code>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 rounded-full bg-purple-600 text-white w-6 h-6 flex items-center justify-center text-sm font-semibold">3</div>
            <div>
              <p className="text-sm font-medium text-slate-100">At the prompt, run</p>
              <code className="mt-1 block bg-slate-900 px-2 py-1 rounded text-xs text-purple-300 font-mono">/login</code>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 rounded-full bg-purple-600 text-white w-6 h-6 flex items-center justify-center text-sm font-semibold">4</div>
            <div>
              <p className="text-sm font-medium text-slate-100">Complete the browser sign-in flow</p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">Once authenticated, your session will be resumed automatically.</p>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 transition shadow-lg shadow-purple-900/20"
          >
            OK, I'll Authenticate
          </button>
        </div>
      </div>
    </div>
  );
}
