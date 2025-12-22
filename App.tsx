
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Briefcase, 
  Users, 
  CheckSquare, 
  Calendar,
  X,
  Loader2,
  Menu,
  LayoutDashboard,
  ListTodo,
  ChevronRight
} from 'lucide-react';

// Firebase
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  query,
  orderBy
} from 'firebase/firestore';

import { Client, ClientStatus, SortOption } from './types';
import ClientCard from './components/ClientCard';
import AgendaModal from './components/AgendaModal';
import MeetingLogsModal from './components/MeetingLogsModal';
import TaskListView from './components/TaskListView';
import { callGemini } from './services/geminiService';

// User's Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBxWdSSx-5ZBVks4pbKMxPrLWILvNoI73s",
  authDomain: "rulesomeai-client-bord.firebaseapp.com",
  projectId: "rulesomeai-client-bord",
  storageBucket: "rulesomeai-client-bord.firebasestorage.app",
  messagingSenderId: "88883079896",
  appId: "1:88883079896:web:fa9c1064f88ac2e782c5ad",
  measurementId: "G-1LWBLLJ225"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type ViewType = 'dashboard' | 'tasks';

export default function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  
  // UX State
  const [sortBy, setSortBy] = useState<SortOption>('nextMeeting'); 
  const [filterStatus, setFilterStatus] = useState<string>('all'); 
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [agendaModalOpen, setAgendaModalOpen] = useState(false);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaContent, setAgendaContent] = useState('');
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // New Client Form State
  const [newClientData, setNewClientData] = useState({
    name: '',
    status: ClientStatus.ONBOARDING,
    contractStart: '',
    contractEnd: '',
    lastMeeting: '',
    nextMeeting: '',
  });

  // Listen to Firestore real-time updates
  useEffect(() => {
    const q = query(collection(db, "clients"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const clientsData: Client[] = [];
      querySnapshot.forEach((doc) => {
        clientsData.push({ id: doc.id, ...doc.data() } as Client);
      });
      setClients(clientsData);
      setLoading(false);
    }, (error) => {
      console.error("Firebase fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const processedClients = useMemo(() => {
    let result = [...clients];

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(lowerQuery));
    }

    if (filterStatus !== 'all') {
      result = result.filter(c => c.status === filterStatus);
    }

    result.sort((a, b) => {
      if (sortBy === 'created') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'nextMeeting') {
        if (!a.nextMeeting) return 1;
        if (!b.nextMeeting) return -1;
        return new Date(a.nextMeeting).getTime() - new Date(b.nextMeeting).getTime();
      }
      if (sortBy === 'taskPriority') {
        const aCount = a.tasks?.filter(t => !t.completed).length || 0;
        const bCount = b.tasks?.filter(t => !t.completed).length || 0;
        return bCount - aCount;
      }
      return 0;
    });

    return result;
  }, [clients, searchQuery, filterStatus, sortBy]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientData.name) return;

    const clientId = crypto.randomUUID();
    const newClient: Client = {
      id: clientId,
      ...newClientData,
      tasks: [],
      meetingLogs: [],
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "clients", clientId), newClient);
      setNewClientData({
        name: '',
        status: ClientStatus.ONBOARDING,
        contractStart: '',
        contractEnd: '',
        lastMeeting: '',
        nextMeeting: '',
      });
      setIsNewClientModalOpen(false);
    } catch (error) {
      console.error("Error adding client to Firebase:", error);
      alert("顧客の保存に失敗しました。Firebaseの権限設定を確認してください。");
    }
  };

  const updateClientField = async (clientId: string, field: keyof Client, value: any) => {
    try {
      const clientRef = doc(db, "clients", clientId);
      await updateDoc(clientRef, { [field]: value });
    } catch (error) {
      console.error("Error updating client field:", error);
    }
  };

  const deleteClient = async (clientId: string) => {
    if (!window.confirm("このクライアントを削除してもよろしいですか？")) return;
    try {
      await deleteDoc(doc(db, "clients", clientId));
    } catch (error) {
      console.error("Error deleting client:", error);
    }
  };

  const openLogModal = (client: Client) => {
    setSelectedClient(client);
    setLogModalOpen(true);
  };

  const generateAgenda = async (client: Client) => {
    setAgendaModalOpen(true);
    setAgendaLoading(true);
    setAgendaContent('');

    const unfinishedTasks = client.tasks
      ?.filter(t => !t.completed)
      .map(t => `- ${t.text} (${t.assignee || '担当未定'})`)
      .join('\n') || 'なし';

    const prompt = `
      あなたはAIコンサルティング会社の優秀なPMです。
      クライアント「${client.name}」との次回の定例ミーティングのアジェンダを作成してください。
      
      【状況】
      - ステータス: ${client.status}
      - 残タスク:
      ${unfinishedTasks}
      
      【出力フォーマット】
      以下の形式で簡潔に出力してください。挨拶は不要です。
      
      ## ${client.name} 定例アジェンダ
      
      1. [議題1]
      2. [議題2]
      3. ...
      
      ### 確認事項
      - [ポイント1]
      - [ポイント2]
    `;

    const result = await callGemini(prompt);
    setAgendaContent(result || "生成に失敗しました。もう一度お試しください。");
    setAgendaLoading(false);
  };

  const updateClientFull = async (updatedClient: Client) => {
    try {
      const clientRef = doc(db, "clients", updatedClient.id);
      await setDoc(clientRef, updatedClient);
      if (selectedClient?.id === updatedClient.id) setSelectedClient(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
    }
  };

  const stats = useMemo(() => {
    const totalClients = clients.length;
    const pendingTasks = clients.reduce((acc, c) => acc + (c.tasks?.filter(t => !t.completed).length || 0), 0);
    const thisWeekMeetings = clients.filter(c => {
      if (!c.nextMeeting) return false;
      const d = new Date(c.nextMeeting);
      const now = new Date();
      const diff = d.getTime() - now.getTime();
      return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
    }).length;

    return { totalClients, pendingTasks, thisWeekMeetings };
  }, [clients]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-600 mr-3" />
        データを同期中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-50 flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">ルーサムAI</h1>
          </div>
          
          <nav className="flex-grow p-4 space-y-2">
            <button 
              onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <LayoutDashboard className="h-5 w-5" />
              ダッシュボード
              {currentView === 'dashboard' && <ChevronRight className="h-4 w-4 ml-auto" />}
            </button>
            <button 
              onClick={() => { setCurrentView('tasks'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${currentView === 'tasks' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <ListTodo className="h-5 w-5" />
              タスク一覧
              {currentView === 'tasks' && <ChevronRight className="h-4 w-4 ml-auto" />}
            </button>
          </nav>

          <div className="p-4 border-t border-slate-50">
            <div className="bg-slate-50 rounded-xl p-4 text-xs">
              <p className="font-bold text-slate-400 uppercase tracking-widest mb-2">クイック統計</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">顧客数</span>
                  <span className="font-bold text-slate-800">{stats.totalClients}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">未完了タスク</span>
                  <span className="font-bold text-red-600">{stats.pendingTasks}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-grow flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Menu className="h-6 w-6" />
                </button>
                <div className="hidden lg:block">
                  <h2 className="text-lg font-bold text-slate-700">
                    {currentView === 'dashboard' ? 'ダッシュボード' : '全タスク一覧'}
                  </h2>
                </div>
              </div>

              {currentView === 'dashboard' && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-grow max-w-2xl justify-end">
                  <div className="relative group flex-grow sm:flex-grow-0">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="クライアント検索..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-sm bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-lg transition-all outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="relative">
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="appearance-none pl-9 pr-8 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <option value="nextMeeting">次回MTG順</option>
                        <option value="taskPriority">未完了タスク順</option>
                        <option value="created">登録順</option>
                      </select>
                      <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>

                    <button 
                      onClick={() => setIsNewClientModalOpen(true)}
                      className="flex-shrink-0 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                      title="新規追加"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">新規顧客</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-grow overflow-auto custom-scrollbar">
          {currentView === 'dashboard' ? (
            <>
              {processedClients.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                  <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900">
                    {searchQuery ? '該当するクライアントがいません' : 'クライアントがいません'}
                  </h3>
                  <p className="text-slate-500 mt-1 mb-6">
                    {searchQuery ? '検索条件を変更してみてください' : '新しいプロジェクトを追加して管理を始めましょう'}
                  </p>
                  {!searchQuery && (
                    <button 
                      onClick={() => setIsNewClientModalOpen(true)}
                      className="text-indigo-600 font-medium hover:text-indigo-800"
                    >
                      + クライアントを追加
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {processedClients.map(client => (
                    <ClientCard 
                      key={client.id} 
                      client={client} 
                      onUpdate={updateClientField}
                      onDelete={() => deleteClient(client.id)}
                      onGenerateAgenda={() => generateAgenda(client)}
                      onOpenLogs={() => openLogModal(client)}
                      onUpdateClient={updateClientFull}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <TaskListView 
              clients={clients} 
              onUpdateClient={updateClientFull}
            />
          )}
        </main>
      </div>

      <AgendaModal 
        isOpen={agendaModalOpen} 
        onClose={() => setAgendaModalOpen(false)} 
        agendaData={agendaContent}
        isLoading={agendaLoading}
      />
      
      {selectedClient && (
        <MeetingLogsModal
          isOpen={logModalOpen}
          onClose={() => setLogModalOpen(false)}
          client={selectedClient}
          onUpdateClient={updateClientFull}
        />
      )}

      {isNewClientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-800">新規クライアント登録</h3>
              <button onClick={() => setIsNewClientModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">クライアント名</label>
                <input 
                  required
                  type="text" 
                  value={newClientData.name}
                  onChange={e => setNewClientData({...newClientData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="例: 株式会社ルーサム"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
                  <select 
                    value={newClientData.status}
                    onChange={e => setNewClientData({...newClientData, status: e.target.value as ClientStatus})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value={ClientStatus.ONBOARDING}>導入中</option>
                    <option value={ClientStatus.ACTIVE}>進行中</option>
                    <option value={ClientStatus.PENDING}>調整中</option>
                    <option value={ClientStatus.COMPLETED}>完了</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">次回定例日(予定)</label>
                  <input 
                    type="date" 
                    value={newClientData.nextMeeting}
                    onChange={e => setNewClientData({...newClientData, nextMeeting: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors font-medium"
                >
                  登録する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
