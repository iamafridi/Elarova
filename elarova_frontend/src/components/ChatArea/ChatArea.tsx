import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { chatApi } from '../../services/api';
import { Send, Mic, Loader2, Bot, User, Menu } from 'lucide-react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const ChatArea = () => {
  const { 
    sessionId, 
    currentChat, 
    messages, 
    setMessages, 
    setChats, 
    chats, 
    setCurrentChat,
    isLoading, 
    setLoading,
    toggleSidebar,
    isSidebarOpen
  } = useStore();
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + ' ' + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !currentChat) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const tempUserMsg = {
      _id: 'temp-' + Date.now(),
      chatId: currentChat._id,
      role: 'user' as const,
      content: userMessage,
      sources: [],
      createdAt: new Date().toISOString(),
    };
    
    const tempAssistantMsg = {
      _id: 'temp-assistant-' + Date.now(),
      chatId: currentChat._id,
      role: 'assistant' as const,
      content: '',
      sources: [],
      createdAt: new Date().toISOString(),
    };
    
    setMessages([...messages, tempUserMsg, tempAssistantMsg]);

    try {
      await chatApi.sendMessage(currentChat._id, userMessage, sessionId);
      
      const { messages: newMessages } = await chatApi.getChat(sessionId, currentChat._id);
      setMessages(newMessages);

      const updatedChats = await chatApi.getChats(sessionId);
      setChats(updatedChats);
    } catch (error) {
      console.error('Failed to send message:', error);
      const filteredMessages = messages.filter(m => m._id !== tempUserMsg._id && m._id !== tempAssistantMsg._id);
      setMessages(filteredMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleNewChat = async () => {
    setLoading(true);
    try {
      const chat = await chatApi.createChat(sessionId, 'New Chat');
      setChats([chat, ...chats]);
      setCurrentChat(chat);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen">
      {!isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="absolute top-4 left-4 z-10 bg-white/20 p-2 rounded-lg text-white hover:bg-white/30"
        >
          <Menu size={20} />
        </button>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!currentChat ? (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <Bot size={64} className="mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">Welcome to Elarova</h2>
            <p className="text-white/60 mb-6">Your professional medical assistant</p>
            <button
              onClick={handleNewChat}
              className="bg-white/20 hover:bg-white/30 text-white py-2 px-6 rounded-xl transition-all"
            >
              Start a New Chat
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <Bot size={48} className="mb-4 opacity-50" />
            <p className="text-white/60">Start a conversation with Elarova</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={msg._id || idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' 
                    ? 'bg-white/30' 
                    : 'bg-primary-500'
                }`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-4 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-white/30 text-white'
                    : 'bg-white text-gray-800'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-200/50 text-sm">
                      <strong>Sources:</strong>
                      {msg.sources.map((source, i) => (
                        <div key={i} className="text-gray-500">{source}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="bg-white p-4 rounded-2xl">
                <Loader2 className="animate-spin" size={20} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white/10 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={currentChat ? "Type your message..." : "Select or create a chat first..."}
            disabled={!currentChat || isLoading}
            className="flex-1 bg-transparent text-white placeholder-white/50 outline-none"
          />
          <button
            onClick={toggleMic}
            disabled={!currentChat || isLoading}
            className={`p-2 rounded-full transition-all ${
              isListening 
                ? 'bg-red-500 animate-pulse' 
                : 'bg-white/20 hover:bg-white/30'
            } text-white disabled:opacity-50`}
          >
            <Mic size={20} />
          </button>
          <button
            onClick={handleSend}
            disabled={!currentChat || !input.trim() || isLoading}
            className="bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-full transition-all disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
