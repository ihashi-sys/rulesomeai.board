
import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckSquare, 
  Calendar, 
  FileText, 
  Sparkles, 
  Loader2 
} from 'lucide-react';
import { Client, ClientStatus, Task } from '../types';
import { callGemini } from '../services/geminiService';
import TaskItem from './TaskItem';

interface ClientCardProps {
  client: Client;
  onUpdate: (id: string, field: keyof Client, val: any) => void;
  onDelete: () => void;
  onGenerateAgenda: () => void;
  onOpenLogs: () => void;
  onUpdateClient: (client: Client) => void;
}

const StatusBadge: React.FC<{ status: ClientStatus }> = ({ status }) => {
  const styles = {
    [ClientStatus.ACTIVE]: 'bg-green-100 text-green-800 border-green-200',
    [ClientStatus.ONBOARDING]: 'bg-blue-100 text-blue-800 border-blue-200',
    [ClientStatus.COMPLETED]: 'bg-gray-100 text-gray-800 border-gray-200',
    [ClientStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };
  
  const labels = {
    [ClientStatus.ACTIVE]: '進行中',
    [ClientStatus.ONBOARDING]: '導入中',
    [ClientStatus.COMPLETED]: '完了',
    [ClientStatus.PENDING]: '調整中',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${styles[status] || styles[ClientStatus.PENDING]}`}>
      {labels[status] || labels[ClientStatus.PENDING]}
    </span>
  );
};

const ProgressBar: React.FC<{ total: number, completed: number }> = ({ total, completed }) => {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  
  return (
    <div className="w-full mt-2">
      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
        <span>進捗</span>
        <span>{percentage}% ({completed}/{total})</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            percentage === 100 ? 'bg-green-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const ClientCard: React.FC<ClientCardProps> = ({ client, onUpdate, onDelete, onGenerateAgenda, onOpenLogs, onUpdateClient }) => {
  const [taskInput, setTaskInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      text: taskInput,
      completed: false,
      dueDate: '',
      assignee: ''
    };
    
    onUpdateClient({
      ...client,
      tasks: [...(client.tasks || []), newTask]
    });
    setTaskInput('');
  };

  const handleAiSuggestTasks = async () => {
    setIsAiLoading(true);
    const prompt = `
      あなたはAIコンサルタントのアシスタントです。
      クライアント「${client.name}」のステータスは「${client.status}」です。
      このクライアントに対して、次にやるべき具体的なタスクを3つだけ、短文で提案してください。
      出力はJSON形式の配列のみを返してください。例: ["タスク1", "タスク2", "タスク3"]
      マークダウンや余計な説明は一切不要です。
    `;
    
    try {
      let text = await callGemini(prompt);
      if (text) {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const suggested = JSON.parse(cleanJson);
        if (Array.isArray(suggested)) {
          const newTasks = suggested.map(t => ({
            id: crypto.randomUUID(),
            text: t as string,
            completed: false,
            dueDate: '',
            assignee: ''
          }));
          onUpdateClient({
            ...client,
            tasks: [...(client.tasks || []), ...newTasks]
          });
        }
      }
    } catch (e) {
      console.error("Failed to parse AI tasks", e);
      alert("タスク提案の生成に失敗しました");
    } finally {
      setIsAiLoading(false);
    }
  };

  const isMeetingSoon = () => {
    if (!client.nextMeeting) return false;
    const today = new Date();
    const meeting = new Date(client.nextMeeting);
    const diffTime = meeting.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays >= 0 && diffDays <= 3;
  };

  const completedTasks = client.tasks?.filter(t => t.completed).length || 0;
  const totalTasks = client.tasks?.length || 0;
  const activeTasksCount = totalTasks - completedTasks;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full group relative">
      {/* Status Bar Top Line */}
      <div className={`h-1 w-full rounded-t-xl ${
        client.status === ClientStatus.COMPLETED ? 'bg-gray-300' :
        client.status === ClientStatus.ACTIVE ? 'bg-green-500' :
        client.status === ClientStatus.ONBOARDING ? 'bg-blue-500' :
        'bg-yellow-500'
      }`} />

      {/* Card Header */}
      <div className="p-5 border-b border-slate-50 flex justify-between items-start pb-4">
        <div className="min-w-0 flex-1 mr-2">
          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-lg font-bold text-slate-800 truncate leading-tight" title={client.name}>
              {client.name}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={client.status} />
            <select 
              value={client.status} 
              onChange={(e) => onUpdate(client.id, 'status', e.target.value)}
              className="text-[10px] border-none bg-transparent text-slate-400 focus:ring-0 cursor-pointer hover:text-indigo-600 p-0"
            >
              <option value="">変更...</option>
              <option value={ClientStatus.ACTIVE}>進行中</option>
              <option value={ClientStatus.ONBOARDING}>導入中</option>
              <option value={ClientStatus.PENDING}>調整中</option>
              <option value={ClientStatus.COMPLETED}>完了</option>
            </select>
          </div>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={onOpenLogs}
            className="text-slate-300 hover:text-indigo-600 transition-colors p-1"
            title="議事録・ログ"
          >
            <FileText className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="text-slate-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100 focus:opacity-100">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 flex-grow flex flex-col gap-5">
        
        {/* Progress Bar */}
        <ProgressBar total={totalTasks} completed={completedTasks} />

        {/* Schedule Section */}
        <div className="bg-slate-50 rounded-lg p-3 space-y-3 border border-slate-100 relative group/schedule">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 flex items-center gap-1.5 text-xs">
              <CheckSquare className="h-3.5 w-3.5" />
              前回MTG
            </span>
            <input 
              type="date" 
              value={client.lastMeeting}
              onChange={(e) => onUpdate(client.id, 'lastMeeting', e.target.value)}
              className="bg-transparent text-right font-medium text-slate-600 focus:ring-0 border-none p-0 w-28 text-xs cursor-pointer hover:text-indigo-600"
            />
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className={`flex items-center gap-1.5 font-medium text-xs ${isMeetingSoon() ? 'text-red-600' : 'text-indigo-600'}`}>
              <Calendar className="h-3.5 w-3.5" />
              次回MTG
              {isMeetingSoon() && <span className="animate-pulse ml-1 text-[9px] bg-red-100 text-red-600 px-1 rounded uppercase font-bold">接近中</span>}
            </span>
            <input 
              type="date" 
              value={client.nextMeeting}
              onChange={(e) => onUpdate(client.id, 'nextMeeting', e.target.value)}
              className={`bg-white text-right font-bold focus:ring-1 focus:ring-indigo-500 border border-slate-200 rounded px-2 py-0.5 w-28 text-xs shadow-sm cursor-pointer ${isMeetingSoon() ? 'text-red-600 border-red-200 bg-red-50' : 'text-slate-700'}`}
            />
          </div>
          
          {/* AI Agenda Button */}
          {client.nextMeeting && (
            <button 
              onClick={onGenerateAgenda}
              className="absolute -top-3 -right-2 bg-indigo-600 text-white text-[10px] px-2 py-1 rounded-full shadow-md flex items-center gap-1 opacity-0 group-hover/schedule:opacity-100 transition-opacity hover:bg-indigo-700"
              title="AIでアジェンダを作成"
            >
              <Sparkles className="h-3 w-3" />
              <span>AI作戦会議</span>
            </button>
          )}
        </div>

        {/* Tasks Section */}
        <div className="flex-grow flex flex-col min-h-[120px]">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
             次回アクション ({activeTasksCount})
          </h4>
          
          <div className="space-y-1 mb-3 max-h-56 overflow-y-auto pr-1 custom-scrollbar flex-grow">
            {client.tasks && client.tasks.length > 0 ? (
              client.tasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onToggle={() => {
                    const updated = client.tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t);
                    onUpdateClient({ ...client, tasks: updated });
                  }}
                  onDelete={() => {
                    const updated = client.tasks.filter(t => t.id !== task.id);
                    onUpdateClient({ ...client, tasks: updated });
                  }}
                  onUpdate={(field, val) => {
                    const updated = client.tasks.map(t => t.id === task.id ? { ...t, [field]: val } : t);
                    onUpdateClient({ ...client, tasks: updated });
                  }}
                />
              ))
            ) : (
              <div className="text-center py-4 border border-dashed border-slate-100 rounded-lg">
                <p className="text-xs text-slate-400 italic">タスクなし</p>
              </div>
            )}
          </div>

          <form onSubmit={handleTaskSubmit} className="flex gap-2 mt-auto pt-2 border-t border-slate-50 items-center">
            <input 
              type="text" 
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="タスクを追加..."
              className="flex-grow text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
            />
            
            {/* AI Task Button */}
            <button 
              type="button"
              onClick={handleAiSuggestTasks}
              disabled={isAiLoading}
              className="text-xs bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-amber-700 border border-amber-200 px-2 py-1.5 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[32px]"
              title="AIにタスクを提案してもらう"
            >
              {isAiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            </button>

            <button 
              type="submit"
              disabled={!taskInput.trim()}
              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 px-2 py-1.5 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[32px] flex items-center justify-center"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 rounded-b-xl flex justify-between items-center text-[10px] text-slate-400">
         <span>契約: {client.contractStart || '-'} ~ {client.contractEnd || '-'}</span>
      </div>
    </div>
  );
};

export default ClientCard;
