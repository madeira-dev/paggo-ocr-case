"use client";

// Remove useState for isAuthenticated
import { Sidebar } from "../components/Sidebar";
import { ChatWindow } from "../components/ChatWindow";
import { Login } from "../components/Login";
import { useSession, signOut } from "next-auth/react"; // Import useSession and signOut
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { data: session, status } = useSession(); // Get session data and status
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        Loading...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Login />;
  }

  if (status === "authenticated" && session?.user) {
    const handleSignOut = async () => {
      await signOut({ redirect: false }); // Perform sign out without NextAuth redirecting
      router.push("/"); // Manually redirect to the root page
    };

    return (
      <div className="flex h-screen antialiased text-gray-800 bg-gray-900">
        <Sidebar />{" "}
        <main className="flex-grow flex flex-col">
          <div className="p-4 bg-gray-800 text-white flex justify-between items-center border-b border-gray-700">
            <span>Welcome, {session.user.name || session.user.email}</span>
            <button
              onClick={handleSignOut}
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

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      An unexpected error occurred.
    </div>
  );
}
