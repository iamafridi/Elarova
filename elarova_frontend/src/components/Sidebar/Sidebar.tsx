import { useState } from 'react';
import { useStore } from '../../store';
import { chatApi } from '../../services/api';
import { MessageSquare, Plus, Trash2, FileText, Menu } from 'lucide-react';

const Sidebar = () => {
  const { 
    sessionId, 
    chats, 
    setChats, 
    currentChat, 
    setCurrentChat, 
    setMessages,
    toggleSidebar,
    toggleDocuments,
    isDocumentsOpen
  } = useStore();
  const [isCreating, setIsCreating] = useState(false);

  const handleNewChat = async () => {
    setIsCreating(true);
    try {
      const chat = await chatApi.createChat(sessionId, 'New Chat');
      setChats([chat, ...chats]);
      setCurrentChat(chat);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectChat = async (chatId: string) => {
    try {
      const { chat, messages } = await chatApi.getChat(sessionId, chatId);
      setCurrentChat(chat);
      setMessages(messages);
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    try {
      await chatApi.deleteChat(sessionId, chatId);
      setChats(chats.filter(c => c._id !== chatId));
      if (currentChat?._id === chatId) {
        setCurrentChat(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  return (
    <aside className="w-72 bg-white/10 backdrop-blur-md h-screen flex flex-col border-r border-white/20">
      <div className="p-4 flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">Elarova</h1>
        <button onClick={toggleSidebar} className="text-white/70 hover:text-white">
          <Menu size={20} />
        </button>
      </div>

      <button
        onClick={handleNewChat}
        disabled={isCreating}
        className="mx-4 mb-4 bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
      >
        <Plus size={18} />
        {isCreating ? 'Creating...' : 'New Chat'}
      </button>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="text-white/60 text-sm px-2 mb-2">Chat History</div>
        {chats.length === 0 ? (
          <div className="text-white/40 text-center py-8 text-sm">No chats yet</div>
        ) : (
          chats.map(chat => (
            <div
              key={chat._id}
              onClick={() => handleSelectChat(chat._id)}
              className={`group flex items-center justify-between p-3 rounded-xl mb-1 cursor-pointer transition-all ${
                currentChat?._id === chat._id 
                  ? 'bg-white/30' 
                  : 'hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3 text-white overflow-hidden">
                <MessageSquare size={16} />
                <span className="truncate text-sm">{chat.title}</span>
              </div>
              <button
                onClick={(e) => handleDeleteChat(e, chat._id)}
                className="opacity-0 group-hover:opacity-100 text-white/60 hover:text-red-400 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-white/20">
        <button
          onClick={toggleDocuments}
          className={`w-full flex items-center gap-2 text-white py-2 px-4 rounded-xl transition-all ${
            isDocumentsOpen ? 'bg-white/30' : 'hover:bg-white/10'
          }`}
        >
          <FileText size={18} />
          <span className="text-sm">My Documents</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
