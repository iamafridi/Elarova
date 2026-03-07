import { create } from 'zustand';
import { Chat, Message, UploadedDocument } from '../types';

interface AppState {
  sessionId: string;
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  documents: UploadedDocument[];
  isLoading: boolean;
  isSidebarOpen: boolean;
  isDocumentsOpen: boolean;
  backgroundTheme: string;
  isAiHelperOpen: boolean;
  
  setSessionId: (id: string) => void;
  setChats: (chats: Chat[]) => void;
  setCurrentChat: (chat: Chat | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setDocuments: (documents: UploadedDocument[]) => void;
  addDocument: (document: UploadedDocument) => void;
  removeDocument: (id: string) => void;
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  toggleDocuments: () => void;
  setBackgroundTheme: (theme: string) => void;
  toggleAiHelper: () => void;
}

const getOrCreateSessionId = () => {
  let sessionId = localStorage.getItem('elarova_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('elarova_session_id', sessionId);
  }
  return sessionId;
};

const loadMessagesFromStorage = (sessionId: string): Message[] => {
  const key = `elarova_messages_${sessionId}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

const saveMessagesToStorage = (sessionId: string, messages: Message[]) => {
  const key = `elarova_messages_${sessionId}`;
  localStorage.setItem(key, JSON.stringify(messages));
};

const loadChatsFromStorage = (sessionId: string): Chat[] => {
  const key = `elarova_chats_${sessionId}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

const saveChatsToStorage = (sessionId: string, chats: Chat[]) => {
  const key = `elarova_chats_${sessionId}`;
  localStorage.setItem(key, JSON.stringify(chats));
};

const loadBackgroundTheme = (): string => {
  return localStorage.getItem('elarova_background') || 'default';
};

const saveBackgroundTheme = (theme: string) => {
  localStorage.setItem('elarova_background', theme);
};

export const useStore = create<AppState>((set, get) => {
  const sessionId = getOrCreateSessionId();
  
  return {
    sessionId,
    chats: loadChatsFromStorage(sessionId),
    currentChat: null,
    messages: loadMessagesFromStorage(sessionId),
    documents: [],
    isLoading: false,
    isSidebarOpen: true,
    isDocumentsOpen: false,
    backgroundTheme: loadBackgroundTheme(),
    isAiHelperOpen: false,

    setSessionId: (id) => {
      localStorage.setItem('elarova_session_id', id);
      set({ sessionId: id, messages: loadMessagesFromStorage(id), chats: loadChatsFromStorage(id) });
    },
    setChats: (chats) => {
      const { sessionId } = get();
      saveChatsToStorage(sessionId, chats);
      set({ chats });
    },
    setCurrentChat: (chat) => set({ currentChat: chat }),
    setMessages: (messages) => {
      const { sessionId } = get();
      saveMessagesToStorage(sessionId, messages);
      set({ messages });
    },
    addMessage: (message) => set((state) => { 
      const newMessages = [...state.messages, message];
      saveMessagesToStorage(state.sessionId, newMessages);
      return { messages: newMessages };
    }),
    setDocuments: (documents) => set({ documents }),
    addDocument: (document) => set((state) => ({ documents: [...state.documents, document] })),
    removeDocument: (id) => set((state) => ({ 
      documents: state.documents.filter(d => d._id !== id) 
    })),
    setLoading: (loading) => set({ isLoading: loading }),
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    toggleDocuments: () => set((state) => ({ isDocumentsOpen: !state.isDocumentsOpen })),
    setBackgroundTheme: (theme) => {
      saveBackgroundTheme(theme);
      set({ backgroundTheme: theme });
    },
    toggleAiHelper: () => set((state) => ({ isAiHelperOpen: !state.isAiHelperOpen })),
  };
});
