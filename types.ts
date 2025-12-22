
export enum ClientStatus {
  ONBOARDING = 'onboarding',
  ACTIVE = 'active',
  PENDING = 'pending',
  COMPLETED = 'completed'
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  dueDate: string;
  assignee: string;
}

export interface MeetingLog {
  id: string;
  date: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  status: ClientStatus;
  contractStart: string;
  contractEnd: string;
  lastMeeting: string;
  nextMeeting: string;
  tasks: Task[];
  meetingLogs: MeetingLog[];
  createdAt: any; // Using any for compatibility with different timestamp formats
}

export type SortOption = 'nextMeeting' | 'taskPriority' | 'created';
