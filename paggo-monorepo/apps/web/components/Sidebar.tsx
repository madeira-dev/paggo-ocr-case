import React from "react";
import { MessageSquare, Plus } from "lucide-react";

export const Sidebar: React.FC = () => {
  // Placeholder for recent chats
  const recentChats = [
    { id: "1", title: "OCR Implementation Ideas" },
    { id: "2", title: "Frontend Design Discussion" },
    { id: "3", title: "API Integration Plan" },
  ];

  return (
    <div className="w-64 bg-gray-800 text-gray-300 flex flex-col h-full p-4">
      <button className="flex items-center justify-between w-full p-3 mb-4 text-left text-sm rounded-md hover:bg-gray-700 focus:outline-none">
        <span>New Chat</span>
        <Plus size={18} />
      </button>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
        Recent
      </h2>
      <nav className="flex-grow">
        <ul>
          {recentChats.map((chat) => (
            <li key={chat.id}>
              <a
                href="#"
                className="flex items-center p-3 text-sm rounded-md hover:bg-gray-700 truncate"
              >
                <MessageSquare size={16} className="mr-3 flex-shrink-0" />
                <span className="truncate">{chat.title}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {/* Add other sidebar items like settings, user profile etc. here */}
    </div>
  );
};
