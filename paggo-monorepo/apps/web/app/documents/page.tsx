"use client";

import { useEffect, useState, useCallback } from "react"; // Added useCallback
import { useRouter } from "next/navigation";
import { DocumentPreviewCard } from "../../components/DocumentPreviewCard";
import { useSession, signOut } from "next-auth/react";
import {
  fetchUserChats,
  fetchCompiledDocument,
  downloadCompiledDocument as downloadCompiledDocumentApi,
} from "../../lib/api";
import { ChatSummary, CompiledDocumentDto } from "../../types/chat";
import { SessionUser } from "../../types/types";
import { Loader2 } from "lucide-react";
import { CompiledDocumentModal } from "../../components/CompiledDocumentModal";

export default function DocumentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [documents, setDocuments] = useState<ChatSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocumentData, setSelectedDocumentData] =
    useState<CompiledDocumentDto | null>(null);
  const [isLoadingModalData, setIsLoadingModalData] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // General download error/success message state (optional, for global feedback)
  const [downloadStatusMessage, setDownloadStatusMessage] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (status === "authenticated") {
      const loadDocuments = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await fetchUserChats(); // fetchUserChats returns ChatSummary[]
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

  const handlePreviewClick = async (chatId: string) => {
    setIsModalOpen(true);
    setIsLoadingModalData(true);
    setModalError(null);
    setSelectedDocumentData(null);
    try {
      const data = await fetchCompiledDocument(chatId);
      setSelectedDocumentData(data);
    } catch (err) {
      setModalError((err as Error).message);
      console.error("Error fetching compiled document:", err);
    } finally {
      setIsLoadingModalData(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDocumentData(null);
    setModalError(null);
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  // Handler for the download action
  const handleDownloadDocument = useCallback(async (chatId: string) => {
    setDownloadStatusMessage(`Preparing download for document ${chatId}...`); // Optional global feedback
    try {
      await downloadCompiledDocumentApi(chatId);
      setDownloadStatusMessage(`Download started for document ${chatId}.`);
      // Clear message after a few seconds
      setTimeout(() => setDownloadStatusMessage(null), 3000);
    } catch (err) {
      console.error(`Error downloading document ${chatId}:`, err);
      setDownloadStatusMessage(
        `Failed to download document ${chatId}: ${(err as Error).message}`
      );
      // Re-throw to allow card to set its own error state
      throw err;
    }
  }, []);

  const buttonClassName = "px-3 py-1 rounded text-sm";

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        Loading session...
      </div>
    );
  }

  if (status === "unauthenticated") {
    // Already handled by useEffect, but good for explicit rendering
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        Redirecting to login...
      </div>
    );
  }

  if (status === "authenticated" && !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        Session error. Please try logging in again.
      </div>
    );
  }

  if (status === "authenticated" && session?.user) {
    const headerUser = session.user as SessionUser;

    return (
      <>
        <div className="flex flex-col h-screen antialiased bg-gray-900 text-gray-300">
          <div className="p-4 bg-gray-800 text-white flex justify-between items-center border-b border-gray-700 sticky top-0 z-10">
            <span className="font-semibold">
              My Documents (Welcome, {headerUser.name || headerUser.email})
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className={`${buttonClassName} bg-blue-500 hover:bg-blue-600`}
              >
                Back to Chat
              </button>
              <button
                onClick={handleSignOut}
                className={`${buttonClassName} bg-red-500 hover:bg-red-600`}
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Optional global download status message */}
          {downloadStatusMessage && (
            <div
              className={`p-2 text-center text-sm ${downloadStatusMessage.startsWith("Failed") ? "bg-red-700" : "bg-blue-700"} text-white`}
            >
              {downloadStatusMessage}
            </div>
          )}

          <main className="flex-grow container mx-auto px-4 py-8 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center text-center h-full pt-10">
                <Loader2
                  size={32}
                  className="animate-spin text-blue-400 mb-2"
                />
                <p className="text-gray-400">Loading documents...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center text-center h-full pt-10">
                <p className="text-red-400">Error loading documents: {error}</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center pt-10">
                <p className="text-gray-400">No documents uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {documents.map((doc) => (
                  <DocumentPreviewCard
                    key={doc.id}
                    id={doc.id} // Pass doc.id as id (chatId)
                    title={doc.title || "Untitled Document"}
                    date={new Date(doc.createdAt).toLocaleDateString()}
                    onClick={() => handlePreviewClick(doc.id)}
                    onDownload={handleDownloadDocument} // Pass the download handler
                  />
                ))}
              </div>
            )}
          </main>
        </div>
        <CompiledDocumentModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          documentData={selectedDocumentData}
          isLoading={isLoadingModalData}
          error={modalError}
        />
      </>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      An unexpected error occurred.
    </div>
  );
}
