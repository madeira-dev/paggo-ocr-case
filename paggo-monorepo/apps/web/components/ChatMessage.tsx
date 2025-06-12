import React from "react";

interface ChatMessageProps {
  message: {
    id: string;
    text?: string;
    imageUrl?: string;
    sender: "user" | "bot";
  };
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isUser ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-200"
        }`}
      >
        {message.text && <p>{message.text}</p>}
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="uploaded content"
            className="max-w-full h-auto rounded mt-2"
          />
        )}
      </div>
    </div>
  );
};
