import React, { useEffect, useState } from 'react';
import { listInterviews, deleteInterview, updateInterview, getInterview, renameInterview, exportInterview, generateTitle } from '../lib/api';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';

interface Interview {
  id: string;
  title: string;
  createdAt: number;
}

interface SidebarProps {
  onSelect: (id: string) => void;
  onNew: () => void;
  onToggle: () => void;
  currentId?: string;
  onRefreshReady?: (refresh: () => void) => void;
}

export default function Sidebar({ onSelect, onNew, onToggle, currentId, onRefreshReady }: SidebarProps) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const loadInterviews = async () => {
    try {
      const data = await listInterviews();
      setInterviews(data);
    } catch (error) {
      console.error("Failed to list interviews", error);
    }
  };

  useEffect(() => {
    loadInterviews();
    const interval = setInterval(loadInterviews, 5000); // Refresh list periodically

    // Expose refresh function to parent
    if (onRefreshReady) {
      onRefreshReady(() => loadInterviews);
    }

    return () => clearInterval(interval);
  }, [onRefreshReady]);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteInterview(deleteId);
      loadInterviews();
      if (currentId === deleteId) {
        onNew();
      }
      setDeleteId(null);
    }
  };

  const handleExport = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await exportInterview(id);
      setAlertState({
        isOpen: true,
        title: 'Export Successful',
        message: 'The interview has been exported successfully.'
      });
    } catch (e) {
      console.error("Export failed", e);
      setAlertState({
        isOpen: true,
        title: 'Export Failed',
        message: 'Failed to export the interview. Please try again.'
      });
    }
  };

  const startRename = (e: React.MouseEvent, interview: Interview) => {
    e.stopPropagation();
    setEditingId(interview.id);
    setEditTitle(interview.title);
  };

  const saveRename = async () => {
    if (editingId && editTitle.trim()) {
      await renameInterview(editingId, editTitle);
      setEditingId(null);
      loadInterviews();
    }
  };

  return (
    <div className="w-64 flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <button
          onClick={onToggle}
          className="p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition"
          title="Close Sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <button
          onClick={onNew}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 transition shadow-lg shadow-purple-900/20"
        >
          <span>+</span> New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {interviews.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No interviews yet
          </div>
        )}
        {interviews.map(interview => (
          <div
            key={interview.id}
            onClick={() => onSelect(interview.id)}
            className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition cursor-pointer ${currentId === interview.id
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
          >
            {editingId === interview.id ? (
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onBlur={saveRename}
                onKeyDown={e => e.key === 'Enter' && saveRename()}
                autoFocus
                onClick={e => e.stopPropagation()}
                className="bg-slate-950 text-white px-1 rounded border border-purple-500 w-full"
              />
            ) : (
              <div className="truncate flex-1 pr-2">
                <div className="font-medium truncate">{interview.title}</div>
                <div className="text-xs text-slate-500">{new Date(interview.createdAt).toLocaleDateString()}</div>
              </div>
            )}

            <div className="hidden group-hover:flex items-center gap-1">
              <button
                onClick={(e) => startRename(e, interview)}
                title="Rename"
                className="p-1 hover:text-blue-400 text-slate-500"
              >
                ✎
              </button>
              <button
                onClick={(e) => handleExport(e, interview.id)}
                title="Export"
                className="p-1 hover:text-green-400 text-slate-500"
              >
                ⤓
              </button>
              <button
                onClick={(e) => handleDeleteClick(e, interview.id)}
                title="Delete"
                className="p-1 hover:text-red-400 text-slate-500"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Interview"
        message="Are you sure you want to delete this interview? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      <AlertModal
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState({ ...alertState, isOpen: false })}
      />
    </div>
  );
}
