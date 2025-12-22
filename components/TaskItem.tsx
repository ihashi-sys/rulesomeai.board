
import React, { useState } from 'react';
import { Check, Calendar, User, X } from 'lucide-react';
import { Task } from '../types';

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (field: keyof Task, val: any) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, onUpdate }) => {
  const [isEditingAssignee, setIsEditingAssignee] = useState(false);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0)) && !task.completed;

  return (
    <div className="group flex items-start gap-2 text-sm p-1.5 rounded hover:bg-slate-50 transition-colors">
      <button 
        onClick={onToggle}
        className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center ${
          task.completed 
            ? 'bg-indigo-100 border-indigo-200 text-indigo-600' 
            : 'bg-white border-slate-300 hover:border-indigo-400'
        }`}
      >
        {task.completed && <Check className="h-3 w-3" />}
      </button>
      
      <div className="flex-grow min-w-0">
        <span className={`block break-all text-xs leading-relaxed mb-1 ${task.completed ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'}`}>
          {task.text}
        </span>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${isOverdue ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>
            <Calendar className="h-3 w-3" />
            <input 
              type="date"
              value={task.dueDate || ''}
              onChange={(e) => onUpdate('dueDate', e.target.value)}
              className="bg-transparent border-none p-0 h-auto text-[10px] w-auto focus:ring-0 text-inherit cursor-pointer"
            />
          </div>

          <div 
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border bg-white text-slate-500 border-slate-100 hover:border-slate-300 cursor-pointer"
            onClick={() => setIsEditingAssignee(true)}
          >
            <User className="h-3 w-3" />
            {isEditingAssignee ? (
              <input 
                type="text"
                autoFocus
                className="w-16 border-none p-0 h-auto text-[10px] focus:ring-0"
                value={task.assignee || ''}
                onChange={(e) => onUpdate('assignee', e.target.value)}
                onBlur={() => setIsEditingAssignee(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingAssignee(false)}
                placeholder="担当者"
              />
            ) : (
              <span>{task.assignee || '担当未定'}</span>
            )}
          </div>
        </div>
      </div>

      <button 
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-opacity p-1"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

export default TaskItem;
