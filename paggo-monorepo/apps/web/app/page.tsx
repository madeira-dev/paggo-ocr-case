"use client";

import { Sidebar } from "../components/Sidebar";
import { ChatWindow } from "../components/ChatWindow";
import { Login } from "../components/Login";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback } from "react";
import { fetchUserChats, createNewChatApi } from "../lib/api";
import { ChatSummary } from "../types/chat";

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
      } catch (error) {
        console.error("Error fetching user chats:", error);
        setErrorLoadingChats((error as Error).message);
        if ((error as Error).message.includes("Unauthorized")) {
        }
      } finally {
        setIsLoadingChats(false);
      }
    }
  }, [status]);

  useEffect(() => {
    loadUserChats();
  }, [status, loadUserChats]);

  const handleSelectChat = (chatId: string | null) => {
    setActiveChatId(chatId);
  };

  const handleNewChat = async () => {
    // try {
    //   const newChat = await createNewChatApi("New Chat");
    //   setChats((prevChats) => [newChat, ...prevChats]);
    //   setActiveChatId(newChat.id);
    // } catch (error) {
    //   console.error("Failed to create new chat:", error);
    //   alert(`Error creating new chat: ${(error as Error).message}`);
    // }
    setActiveChatId(null);
  };

  const handleChatCreated = (newChatId: string, newChatTitle?: string) => {
    setActiveChatId(newChatId);
    loadUserChats();
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

    const handleNavigateToDocuments = () => {
      router.push("/documents");
    };

    const buttonClassName = "px-3 py-1 rounded text-sm";

    return (
      <div className="flex h-screen antialiased bg-gray-900 text-gray-300">
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
            <div className="flex items-center gap-3">
              <button
                onClick={handleNavigateToDocuments}
                className={`${buttonClassName} bg-blue-500 hover:bg-blue-600`}
              >
                Uploaded Documents
              </button>
              <button
                onClick={handleSignOut}
                className={`${buttonClassName} bg-red-500 hover:bg-red-600`}
              >
                Sign Out
              </button>
            </div>
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
      An unexpected error occurred or session status is invalid.
    </div>
  );
}
