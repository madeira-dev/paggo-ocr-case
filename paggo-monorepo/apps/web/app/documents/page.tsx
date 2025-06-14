"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentPreviewCard } from "../../components/DocumentPreviewCard";
import { Header } from "../../components/Header";
import { useSession } from "next-auth/react";
import { fetchUserChats } from "../../lib/api";
import { ChatSummary } from "../../types/chat";
import { SessionUser } from "../../types/types";

export default function DocumentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [documents, setDocuments] = useState<ChatSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      const loadDocuments = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await fetchUserChats();
          setDocuments(data);
        } catch (err) {
          setError((err as Error).message);
          console.error("Error fetching documents:", err);
        } finally {
          setIsLoading(false);
        }
      };
      loadDocuments();
    } else if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const handlePreviewClick = (chatId: string) => {
    router.push(`/?chatId=${chatId}`);
  };

  const headerUser = (session?.user as SessionUser | undefined) ?? undefined;

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="flex flex-col h-screen bg-gray-900 text-gray-300">
        {headerUser && <Header user={headerUser} />}
        <div className="flex-grow flex items-center justify-center">
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen bg-gray-900 text-gray-300">
        {headerUser && <Header user={headerUser} />}
        <div className="flex-grow flex items-center justify-center">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col h-screen bg-gray-900 text-gray-300">
        <div className="flex-grow flex items-center justify-center">
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (status === "authenticated" && !session) {
    return (
      <div className="flex flex-col h-screen bg-gray-900 text-gray-300">
        <div className="flex-grow flex items-center justify-center">
          <p>Session error. Please try logging in again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      <Header user={headerUser} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-white">
          Uploaded Documents
        </h1>
        {documents.length === 0 && !isLoading ? (
          <p className="text-gray-400">No documents uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {documents.map((doc) => (
              <DocumentPreviewCard
                key={doc.id}
                id={doc.id}
                title={doc.title || "Untitled Document"}
                date={new Date(doc.createdAt).toLocaleDateString()}
                onClick={() => handlePreviewClick(doc.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
