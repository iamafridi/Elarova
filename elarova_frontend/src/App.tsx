import { useEffect, useState } from 'react';
import { useStore } from './store';
import { chatApi, documentApi, authApi } from './services/api';
import Sidebar from './components/Sidebar/Sidebar';
import ChatArea from './components/ChatArea/ChatArea';
import DocumentsPanel from './components/Documents/DocumentsPanel';
import AiHelper from './components/AiHelper/AiHelper';
import SettingsPanel from './components/Settings/SettingsPanel';

const backgroundThemes: Record<string, string> = {
  default: 'from-primary-500 to-secondary-500',
  ocean: 'from-blue-500 to-teal-500',
  sunset: 'from-orange-500 to-pink-500',
  forest: 'from-green-500 to-emerald-700',
  purple: 'from-purple-500 to-indigo-700',
  night: 'from-gray-800 to-gray-900',
  rose: 'from-rose-500 to-red-600',
};

function App() {
  const { sessionId, setChats, setDocuments, isSidebarOpen, isDocumentsOpen, backgroundTheme, isAiHelperOpen, toggleAiHelper } = useStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customBg, setCustomBg] = useState<string | null>(null);

  const bgClass = backgroundThemes[backgroundTheme] || backgroundThemes.default;

  useEffect(() => {
    const storedBg = localStorage.getItem('elarova_custom_bg');
    setCustomBg(storedBg);

    const handleBgChange = () => {
      const bg = localStorage.getItem('elarova_custom_bg');
      setCustomBg(bg);
    };

    window.addEventListener('background-changed', handleBgChange);
    return () => window.removeEventListener('background-changed', handleBgChange);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await authApi.getOrCreateSession(sessionId);
        
        const chats = await chatApi.getChats(sessionId);
        setChats(chats);
        
        const docs = await documentApi.getDocuments(sessionId);
        setDocuments(docs);
      } catch (error) {
        console.error('Failed to initialize:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    
    if (sessionId) {
      init();
    }
  }, [sessionId, setChats, setDocuments]);

  if (!isInitialized) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={customBg ? { backgroundImage: `url(${customBg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex"
      style={customBg ? { backgroundImage: `url(${customBg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {!customBg && (
        <div className={`fixed inset-0 -z-10 bg-gradient-to-br ${bgClass}`} />
      )}
      <button
        onClick={() => setShowSettings(true)}
        className="absolute top-4 right-4 z-50 bg-white/20 p-2 rounded-lg text-white hover:bg-white/30"
        title="Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m7.08-7.08l4.24-4.24"></path>
        </svg>
      </button>

      <button
        onClick={toggleAiHelper}
        className="absolute top-4 right-16 z-50 bg-white/20 p-2 rounded-lg text-white hover:bg-white/30"
        title="AI Helper"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"></path>
          <circle cx="8" cy="14" r="1"></circle>
          <circle cx="16" cy="14" r="1"></circle>
        </svg>
      </button>
      
      {isSidebarOpen && <Sidebar />}
      
      <main className="flex-1 flex flex-col h-screen">
        <ChatArea />
        
        {isDocumentsOpen && <DocumentsPanel />}
      </main>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {isAiHelperOpen && <AiHelper onClose={toggleAiHelper} />}
    </div>
  );
}

export default App;
