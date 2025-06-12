"use client";

// Remove useState for isAuthenticated
import { Sidebar } from "../components/Sidebar";
import { ChatWindow } from "../components/ChatWindow";
import { Login } from '../components/Login';
import { useSession, signOut } from "next-auth/react"; // Import useSession and signOut
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, status } = useSession(); // Get session data and status
  // const router = useRouter(); // If you need to redirect programmatically

  // const handleLoginSuccess = () => { // No longer needed
  //   setIsAuthenticated(true);
  // };

  if (status === "loading") {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>; // Or a proper loading spinner
  }

  if (status === "unauthenticated") {
    return <Login />; // Removed onLoginSuccess prop
  }

  // If authenticated, show the chat interface
  if (status === "authenticated" && session?.user) {
    return (
      <div className="flex h-screen antialiased text-gray-800 bg-gray-900">
        <Sidebar /> {/* You might want to pass user info or a signOut button here */}
        <main className="flex-grow flex flex-col">
          {/* Example: Display user name and sign out button */}
          <div className="p-4 bg-gray-800 text-white flex justify-between items-center border-b border-gray-700">
            <span>Welcome, {session.user.name || session.user.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/' })} // Sign out and redirect to home
              className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm"
            >
              Sign Out
            </button>
          </div>
          <ChatWindow />
        </main>
      </div>
    );
  }

  // Fallback or handle other states if necessary
  return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">An unexpected error occurred.</div>;
}
