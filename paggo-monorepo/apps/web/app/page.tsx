"use client";

import { Sidebar } from "../components/Sidebar";
import { ChatWindow } from "../components/ChatWindow";
import { Login } from "../components/Login";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback } from "react";
import { fetchUserChats, createNewChatApi } from "../lib/api"; // Import API functions
import { ChatSummary } from "../types/chat"; // Import types

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [errorLoadingChats, setErrorLoadingChats] = useState<string | null>(
    null
  );

  const loadUserChats = useCallback(async () => {
    if (status === "authenticated") {
      setIsLoadingChats(true);
      setErrorLoadingChats(null);
      try {
        const userChats = await fetchUserChats();
        setChats(userChats);
        if (userChats.length > 0 && !activeChatId) {
          // Optionally select the most recent chat by default
          // setActiveChatId(userChats[0].id);
        }
      } catch (error) {
        console.error("Error fetching user chats:", error);
        setErrorLoadingChats((error as Error).message);
        if ((error as Error).message.includes("Unauthorized")) {
          // Handle session expiry or auth issues, e.g., redirect to login
        }
      } finally {
        setIsLoadingChats(false);
      }
    }
  }, [status, activeChatId]); // Add activeChatId to dependencies if auto-selection logic depends on it

  useEffect(() => {
    loadUserChats();
  }, [status, loadUserChats]); // Load chats when authentication status changes

  const handleSelectChat = (chatId: string | null) => {
    setActiveChatId(chatId);
  };

  const handleNewChat = async () => {
    try {
      const newChat = await createNewChatApi("New Chat"); // Or let backend generate title
      setChats((prevChats) => [newChat, ...prevChats]); // Add to top of the list
      setActiveChatId(newChat.id);
    } catch (error) {
      console.error("Failed to create new chat:", error);
      alert(`Error creating new chat: ${(error as Error).message}`);
    }
  };

  // Callback for ChatWindow to update activeChatId when a new chat is implicitly created
  const handleChatCreated = (newChatId: string, newChatTitle?: string) => {
    setActiveChatId(newChatId);
    // Refresh chat list to include the new chat (or add it optimistically)
    // For simplicity, we can just add it if title is known, or reload
    if (newChatTitle) {
      setChats((prev) => [
        {
          id: newChatId,
          title: newChatTitle,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } else {
      loadUserChats(); // Reload to get the new chat with its title
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        Loading session...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Login />;
  }

  if (status === "authenticated" && session?.user) {
    const handleSignOut = async () => {
      await signOut({ redirect: false });
      router.push("/");
    };

    return (
      <div className="flex h-screen antialiased text-gray-800 bg-gray-900">
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          isLoading={isLoadingChats}
          error={errorLoadingChats}
        />
        <main className="flex-grow flex flex-col overflow-hidden">
          <div className="p-4 bg-gray-800 text-white flex justify-between items-center border-b border-gray-700">
            <span>Welcome, {session.user.name || session.user.email}</span>
            <button
              onClick={handleSignOut}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm"
            >
              Sign Out
            </button>
          </div>
          <ChatWindow
            activeChatId={activeChatId}
            onChatCreated={handleChatCreated}
            key={activeChatId || "new"}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      An unexpected error occurred with session status.
    </div>
  );
}
