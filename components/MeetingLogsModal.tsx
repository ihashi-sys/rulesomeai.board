
import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, X, Plus, Trash2, Edit2, ChevronDown, ChevronUp, Loader2, Upload, Zap 
} from 'lucide-react';
import { Client, MeetingLog, Task } from '../types';
import { callGemini, fileToBase64 } from '../services/geminiService';

interface MeetingLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onUpdateClient: (updatedClient: Client) => void;
}

const MeetingLogsModal: React.FC<MeetingLogsModalProps> = ({ isOpen, onClose, client, onUpdateClient }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'new' | 'edit'>('list');
  const [currentLog, setCurrentLog] = useState<Partial<MeetingLog>>({ 
    date: new Date().toISOString().split('T')[0], 
    title: '', 
    content: '' 
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('list');
      setCurrentLog({ date: new Date().toISOString().split('T')[0], title: '', content: '' });
      setExpandedLogId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEditClick = (log: MeetingLog) => {
    setCurrentLog(log);
    setActiveTab('edit');
  };

  const handleSave = () => {
    if (!currentLog.title || !currentLog.content) return;
    
    let updatedLogs: MeetingLog[];
    if (activeTab === 'edit') {
      updatedLogs = client.meetingLogs.map(log => log.id === currentLog.id ? currentLog as MeetingLog : log);
    } else {
      const newLog: MeetingLog = {
        id: crypto.randomUUID(),
        date: currentLog.date || '',
        title: currentLog.title || '',
        content: currentLog.content || '',
        createdAt: new Date().toISOString()
      };
      updatedLogs = [...(client.meetingLogs || []), newLog];
    }
    
    onUpdateClient({ ...client, meetingLogs: updatedLogs });
    setCurrentLog({ date: new Date().toISOString().split('T')[0], title: '', content: '' });
    setActiveTab('list');
  };

  const handleExtractAndSave = async () => {
    if (!currentLog.content) return;
    setIsProcessing(true);
    try {
      // 1. Prepare/Update current log
      const logId = currentLog.id || crypto.randomUUID();
      const finalLog: MeetingLog = {
        id: logId,
        date: currentLog.date || '',
        title: currentLog.title || '',
        content: currentLog.content || '',
        createdAt: currentLog.createdAt || new Date().toISOString()
      };
      
      let updatedLogs: MeetingLog[];
      if (activeTab === 'edit') {
        updatedLogs = client.meetingLogs.map(log => log.id === currentLog.id ? finalLog : log);
      } else {
        updatedLogs = [...(client.meetingLogs || []), finalLog];
      }

      // 2. Extract tasks using AI
      const prompt = `
        あなたはAIコンサルタントです。
        以下の議事録から、我々（コンサルタント側）またはクライアントが実行すべき「Next Action（ToDo）」を抽出し、
        JSON配列形式の短文テキストリストとして出力してください。
        
        【議事録】
        ${currentLog.content}
        
        【出力例】
        ["定例MTGの日程調整", "アカウント発行作業", "キックオフ資料の修正"]
        
        注意: 余計な説明やマークダウンは含めず、純粋なJSON配列のみを返してください。
      `;

      let text = await callGemini(prompt);
      if (text) {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const extracted = JSON.parse(cleanJson);
        if (Array.isArray(extracted)) {
          const newTasks: Task[] = extracted.map(t => ({
            id: crypto.randomUUID(),
            text: t as string,
            completed: false,
            dueDate: '',
            assignee: ''
          }));
          
          onUpdateClient({
            ...client,
            meetingLogs: updatedLogs,
            tasks: [...(client.tasks || []), ...newTasks]
          });
          
          alert("議事録を保存し、タスクを抽出しました！");
          setCurrentLog({ date: new Date().toISOString().split('T')[0], title: '', content: '' });
          setActiveTab('list');
        }
      }
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました。");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const base64 = await fileToBase64(file);
      const prompt = "添付されたファイル（PDF、画像、テキスト等）の内容を読み取り、議事録として適切な形式（要約ではなく、可能な限り詳細な内容）でテキスト化してください。見出しや箇条書きを使って読みやすく整形してください。";
      
      const text = await callGemini(prompt, { mimeType: file.type, data: base64 });
      if (text) {
        setCurrentLog(prev => ({ ...prev, content: (prev.content ? prev.content + "\n\n" : "") + text }));
      } else {
        alert("ファイルの読み取りに失敗しました。");
      }
    } catch (error) {
      console.error("File upload error:", error);
      alert("ファイルの処理中にエラーが発生しました。");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const logs = client.meetingLogs || [];
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 p-1.5 rounded-md">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">議事録管理</h3>
              <p className="text-xs text-slate-500">{client.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'list' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-slate-700'}`}
          >
            履歴一覧 ({sortedLogs.length})
          </button>
          <button 
            onClick={() => {
              setCurrentLog({ date: new Date().toISOString().split('T')[0], title: '', content: '' });
              setActiveTab('new');
            }}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'new' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Plus className="h-4 w-4" /> 新規作成
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
          
          {activeTab === 'list' && (
            <div className="space-y-4">
              {sortedLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>議事録はまだありません</p>
                  <button onClick={() => setActiveTab('new')} className="text-indigo-600 hover:underline mt-2 text-sm">
                    最初の議事録を作成する
                  </button>
                </div>
              ) : (
                sortedLogs.map(log => (
                  <div key={log.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden group">
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {log.date}
                        </div>
                        <h4 className="font-medium text-slate-800">{log.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleEditClick(log); }}
                           className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors mr-2"
                           title="編集"
                         >
                           <Edit2 className="h-4 w-4" />
                         </button>
                         {expandedLogId === log.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </div>
                    </div>
                    {expandedLogId === log.id && (
                      <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                        <div className="mt-4 whitespace-pre-wrap text-sm text-slate-600 font-mono bg-slate-50 p-3 rounded border border-slate-100">
                          {log.content}
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (window.confirm("議事録を削除しますか？")) {
                                const updated = client.meetingLogs.filter(l => l.id !== log.id);
                                onUpdateClient({ ...client, meetingLogs: updated });
                              }
                            }}
                            className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 px-2 py-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-3 w-3" /> 削除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {(activeTab === 'new' || activeTab === 'edit') && (
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4 relative">
              {/* AI Processing Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
                  <p className="text-sm font-medium text-indigo-900">AIが処理しています...</p>
                </div>
              )}

              <div className="flex gap-4">
                <div className="w-1/3">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">実施日</label>
                  <input 
                    type="date" 
                    value={currentLog.date} 
                    onChange={e => setCurrentLog({...currentLog, date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div className="w-2/3">
                   <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">タイトル</label>
                  <input 
                    type="text" 
                    value={currentLog.title} 
                    onChange={e => setCurrentLog({...currentLog, title: e.target.value})}
                    placeholder="例: 第1回 定例ミーティング"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase">議事録・メモ</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">PDF・画像から読み込む:</span>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors"
                      disabled={isProcessing}
                    >
                      <Upload className="h-3 w-3" />
                      ファイル選択
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden"
                      accept=".pdf,image/*,.txt,.md"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
                <textarea 
                  value={currentLog.content}
                  onChange={e => setCurrentLog({...currentLog, content: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-64 text-sm font-mono leading-relaxed resize-none"
                  placeholder="ここにテキストを入力するか、右上のボタンからファイルをアップロードしてください..."
                />
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-slate-100 mt-2">
                <button 
                  onClick={() => setActiveTab('list')}
                  className="text-sm text-slate-500 hover:text-slate-700 font-medium"
                >
                  キャンセル
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={handleSave}
                    disabled={isProcessing || !currentLog.title}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    保存のみ
                  </button>
                  <button 
                    onClick={handleExtractAndSave}
                    disabled={isProcessing || !currentLog.title || !currentLog.content}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-sm font-medium shadow-md transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        処理中...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 fill-yellow-300 text-yellow-300" />
                        保存 & AIタスク抽出
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingLogsModal;
