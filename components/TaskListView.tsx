
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  User, 
  CheckCircle2, 
  Calendar,
  Building2,
  Trash2,
  Filter,
  Check,
  ListTodo
} from 'lucide-react';
import { Client, Task } from '../types';

interface TaskListViewProps {
  clients: Client[];
  onUpdateClient: (updatedClient: Client) => void;
}

interface FlatTask extends Task {
  clientId: string;
  clientName: string;
}

const TaskListView: React.FC<TaskListViewProps> = ({ clients, onUpdateClient }) => {
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [editingAssigneeId, setEditingAssigneeId] = useState<string | null>(null);

  const flatTasks = useMemo(() => {
    const list: FlatTask[] = [];
    clients.forEach(client => {
      if (client.tasks) {
        client.tasks.forEach(task => {
          list.push({
            ...task,
            clientId: client.id,
            clientName: client.name
          });
        });
      }
    });
    return list;
  }, [clients]);

  const assignees = useMemo(() => {
    const set = new Set<string>();
    flatTasks.forEach(t => {
      if (t.assignee) set.add(t.assignee);
    });
    return Array.from(set).sort();
  }, [flatTasks]);

  const filteredTasks = useMemo(() => {
    return flatTasks.filter(t => {
      const matchAssignee = assigneeFilter === 'all' || t.assignee === assigneeFilter;
      const matchStatus = statusFilter === 'all' || 
                         (statusFilter === 'completed' && t.completed) || 
                         (statusFilter === 'pending' && !t.completed);
      const matchSearch = t.text.toLowerCase().includes(localSearch.toLowerCase()) || 
                          t.clientName.toLowerCase().includes(localSearch.toLowerCase());
      return matchAssignee && matchStatus && matchSearch;
    }).sort((a, b) => {
      if (a.completed === b.completed) {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return a.completed ? 1 : -1;
    });
  }, [flatTasks, assigneeFilter, statusFilter, localSearch]);

  const handleToggleTask = (task: FlatTask) => {
    const client = clients.find(c => c.id === task.clientId);
    if (!client) return;

    const updatedTasks = client.tasks.map(t => 
      t.id === task.id ? { ...t, completed: !t.completed } : t
    );
    onUpdateClient({ ...client, tasks: updatedTasks });
  };

  const handleUpdateTaskField = (task: FlatTask, field: keyof Task, value: any) => {
    const client = clients.find(c => c.id === task.clientId);
    if (!client) return;

    const updatedTasks = client.tasks.map(t => 
      t.id === task.id ? { ...t, [field]: value } : t
    );
    onUpdateClient({ ...client, tasks: updatedTasks });
  };

  const handleDeleteTask = (task: FlatTask) => {
    if (!window.confirm("このタスクを削除しますか？")) return;
    const client = clients.find(c => c.id === task.clientId);
    if (!client) return;

    const updatedTasks = client.tasks.filter(t => t.id !== task.id);
    onUpdateClient({ ...client, tasks: updatedTasks });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
      <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex flex-wrap items-center gap-4">
        <div className="relative flex-grow min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="タスク内容・顧客名で検索..." 
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select 
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">全担当者</option>
              <option value="">担当未定</option>
              {assignees.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">全ステータス</option>
              <option value="pending">未完了</option>
              <option value="completed">完了</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-auto custom-scrollbar">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-white border-b border-slate-200">
              <th className="px-4 py-3 text-left font-bold text-slate-500 bg-slate-50/50 w-12">状態</th>
              <th className="px-4 py-3 text-left font-bold text-slate-500 bg-slate-50/50">顧客</th>
              <th className="px-4 py-3 text-left font-bold text-slate-500 bg-slate-50/50 min-w-[200px]">タスク内容</th>
              <th className="px-4 py-3 text-left font-bold text-slate-500 bg-slate-50/50 w-40">担当者</th>
              <th className="px-4 py-3 text-left font-bold text-slate-500 bg-slate-50/50 w-40">期限</th>
              <th className="px-4 py-3 text-right font-bold text-slate-500 bg-slate-50/50 w-16">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-20 text-center text-slate-400">
                  <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-10" />
                  条件に合うタスクが見つかりません
                </td>
              </tr>
            ) : (
              filteredTasks.map(task => (
                <tr key={`${task.clientId}-${task.id}`} className={`group hover:bg-slate-50 transition-colors ${task.completed ? 'bg-slate-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => handleToggleTask(task)}
                      className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                        task.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 hover:border-indigo-400 bg-white'
                      }`}
                    >
                      {task.completed && <Check className="h-3 w-3" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate max-w-[150px]" title={task.clientName}>{task.clientName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {task.text}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 group/assignee">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {editingAssigneeId === task.id ? (
                        <input 
                          autoFocus
                          type="text"
                          value={task.assignee || ''}
                          onChange={(e) => handleUpdateTaskField(task, 'assignee', e.target.value)}
                          onBlur={() => setEditingAssigneeId(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingAssigneeId(null)}
                          className="px-1 py-0.5 border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-sm w-28 bg-white"
                        />
                      ) : (
                        <span 
                          onClick={() => setEditingAssigneeId(task.id)}
                          className={`cursor-pointer hover:text-indigo-600 px-1 py-0.5 rounded transition-colors ${!task.assignee ? 'text-slate-300 italic' : 'text-slate-600'}`}
                        >
                          {task.assignee || '担当未定'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <input 
                        type="date"
                        value={task.dueDate || ''}
                        onChange={(e) => handleUpdateTaskField(task, 'dueDate', e.target.value)}
                        className={`bg-transparent border-none p-0 focus:ring-0 text-sm cursor-pointer ${
                          !task.completed && task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0)) 
                          ? 'text-red-500 font-bold' 
                          : 'text-slate-600'
                        }`}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => handleDeleteTask(task)}
                      className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
        <div>表示中: {filteredTasks.length} 件 / 全タスク: {flatTasks.length} 件</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
             <div className="w-2 h-2 rounded-full bg-red-400"></div>
             <span>期限切れ</span>
          </div>
          <div className="flex items-center gap-1">
             <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
             <span>完了済み</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskListView;
