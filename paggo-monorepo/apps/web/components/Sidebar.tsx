import React from "react";
import { MessageSquare, Plus, Loader2 } from "lucide-react";
import { ChatSummary } from "../types/chat";

interface SidebarProps {
  chats: ChatSummary[];
  activeChatId: string | null;
  onSelectChat: (chatId: string | null) => void;
  onNewChat: () => void;
  isLoading: boolean;
  error: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  isLoading,
  error,
}) => {
  return (
    <div className="w-64 bg-gray-800 text-gray-300 flex flex-col h-full p-4 border-r border-gray-700">
      <button
        onClick={onNewChat}
        className="flex items-center justify-between w-full p-3 mb-4 text-left text-sm rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span>New Chat</span>
        <Plus size={18} />
      </button>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
        Recent
      </h2>
      <nav className="flex-grow overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center p-3 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin mr-2" />
            Loading chats...
          </div>
        )}
        {error && (
          <div className="p-3 text-sm text-red-400">Error: {error}</div>
        )}
        {!isLoading && !error && chats.length === 0 && (
          <div className="p-3 text-sm text-gray-400">No recent chats.</div>
        )}
        {!isLoading && !error && (
          <ul>
            {chats.map((chat) => (
              <li key={chat.id}>
                <button
                  onClick={() => onSelectChat(chat.id)}
                  className={`flex items-center w-full p-3 text-left text-sm rounded-md hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-600
                                ${activeChatId === chat.id ? "bg-gray-700 text-white" : "text-gray-300"}`}
                >
                  <MessageSquare size={16} className="mr-3 flex-shrink-0" />
                  <span
                    className="truncate"
                    title={chat.title || "Untitled Chat"}
                  >
                    {chat.title || "Untitled Chat"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </div>
  );
};
