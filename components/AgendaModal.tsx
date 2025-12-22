
import React from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';

interface AgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendaData: string;
  isLoading: boolean;
}

const AgendaModal: React.FC<AgendaModalProps> = ({ isOpen, onClose, agendaData, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-slate-800">AI作戦会議 (アジェンダ提案)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
              <p>過去のタスク状況から、最適な議題を生成中...</p>
            </div>
          ) : (
            <div className="prose prose-sm prose-slate max-w-none">
              <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
                {agendaData}
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgendaModal;
