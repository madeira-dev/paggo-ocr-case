import React, { useState, useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";

interface Message {
  id: string;
  text?: string;
  imageUrl?: string;
  sender: "user" | "bot";
}

export const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = (messageContent: {
    text?: string;
    file?: File;
  }) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
    };

    if (messageContent.text) {
      newMessage.text = messageContent.text;
    }

    if (messageContent.file) {
      // For image files, create a URL to display it
      if (messageContent.file.type.startsWith("image/")) {
        newMessage.imageUrl = URL.createObjectURL(messageContent.file);
      } else {
        newMessage.text = `File: ${messageContent.file.name}`; // Placeholder for non-image files
      }
    }

    if (newMessage.text || newMessage.imageUrl) {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      // Here you would typically send the message to a backend
      // and potentially receive a bot response.
      // For now, we'll just add the user's message.
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="flex-grow p-6 overflow-y-auto">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
};
