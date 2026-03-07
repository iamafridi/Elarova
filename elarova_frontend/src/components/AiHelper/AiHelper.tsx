import { useState, useRef } from 'react';
import { X, Send, Loader2, Image, Trash2 } from 'lucide-react';

interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

interface AiHelperProps {
  onClose: () => void;
}

const AiHelper = ({ onClose }: AiHelperProps) => {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setImagePosition({ x: 50, y: 50 });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setImagePosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage = input.trim();
    const imageData = selectedImage;
    setInput('');
    setIsLoading(true);

    const userMsgContent: AiMessage = { role: 'user', content: userMessage };
    if (imageData) {
      userMsgContent.image = imageData;
    }
    
    setMessages(prev => [...prev, userMsgContent]);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const formData = new FormData();
      formData.append('message', userMessage || 'Describe this image');
      formData.append('model', 'ollama');

      if (selectedImage) {
        const blob = await fetch(selectedImage).then(r => r.blob());
        formData.append('image', blob, 'image.jpg');
      }

      const response = await fetch('http://localhost:8080/ai-chat', {
        method: 'POST',
        body: formData,
      });

      const data = await response.text();

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: data };
        return updated;
      });
    } catch (error) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong.' };
        return updated;
      });
    } finally {
      setIsLoading(false);
      setSelectedImage(null);
      scrollToBottom();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-20 right-4 w-80 h-96 bg-white rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden">
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-3 flex items-center justify-between">
        <h3 className="text-white font-semibold">AI Helper</h3>
        <button onClick={onClose} className="text-white hover:bg-white/20 p-1 rounded">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">Ask me anything!</p>
            <p className="text-xs mt-2">I can help with coding, writing, and more.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-primary-500 text-white ml-8'
                  : 'bg-gray-200 text-gray-800 mr-8'
              }`}
            >
              {msg.image && (
                <img src={msg.image} alt="Uploaded" className="max-w-full rounded mb-2" />
              )}
              {msg.content || (isLoading && idx === messages.length - 1 ? (
                <span className="flex items-center gap-1"><Loader2 size={14} className="animate-spin" /> Thinking...</span>
              ) : msg.content)}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {selectedImage && (
        <div className="p-2 border-t bg-gray-100">
          <div className="relative h-24 bg-gray-200 rounded-lg overflow-hidden cursor-move">
            <img
              src={selectedImage}
              alt="Preview"
              className="absolute w-full h-full object-cover"
              style={{
                objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              draggable={false}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">Drag to adjust</span>
            <button
              onClick={handleRemoveImage}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="p-2 border-t bg-white">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-lg transition-colors ${
              selectedImage ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Upload image"
          >
            <Image size={16} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask AI..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || isLoading}
            className="bg-primary-500 text-white p-2 rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiHelper;
