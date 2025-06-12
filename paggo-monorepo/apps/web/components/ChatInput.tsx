import React, { useState, useRef } from 'react';
import { Paperclip, Send } from 'lucide-react'; // Using lucide-react for icons

interface ChatInputProps {
  onSendMessage: (message: { text?: string; file?: File }) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage({ text: inputText.trim() });
      setInputText('');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onSendMessage({ file });
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-4 bg-gray-800 border-t border-gray-700">
      <div className="flex items-center bg-gray-700 rounded-lg p-2">
        <button
          onClick={triggerFileInput}
          className="p-2 text-gray-400 hover:text-gray-200"
          aria-label="Attach file"
        >
          <Paperclip size={20} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message or upload an image..."
          className="flex-grow bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none px-3 py-2"
        />
        <button
          onClick={handleSend}
          className="p-2 text-blue-500 hover:text-blue-400 disabled:opacity-50"
          disabled={!inputText.trim()}
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};