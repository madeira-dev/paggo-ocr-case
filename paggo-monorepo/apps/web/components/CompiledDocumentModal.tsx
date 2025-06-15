"use client";

import React from "react";
import { X, Loader2, FileText, MessageSquare, User, Bot } from "lucide-react";
import { CompiledDocumentDto, ChatHistoryItem } from "../types/chat";

interface CompiledDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: CompiledDocumentDto | null;
  isLoading: boolean;
  error: string | null;
}

export const CompiledDocumentModal: React.FC<CompiledDocumentModalProps> = ({
  isOpen,
  onClose,
  documentData,
  isLoading,
  error,
}) => {
  if (!isOpen) return null;

  const renderChatHistoryItem = (item: ChatHistoryItem, index: number) => {
    const isUser = item.sender === "USER";
    return (
      <div
        key={`${item.createdAt}-${index}`}
        className={`flex mb-3 ${isUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[85%] px-3 py-2 rounded-lg shadow ${
            isUser ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-200"
          }`}
        >
          <div className="flex items-center mb-1">
            {isUser ? (
              <User size={16} className="mr-2 flex-shrink-0" />
            ) : (
              <Bot size={16} className="mr-2 flex-shrink-0" />
            )}
            <span className="text-xs font-semibold">
              {isUser ? "You" : "Paggo AI"}
            </span>
            <span className="text-xs text-gray-400 ml-2">
              {new Date(item.createdAt).toLocaleTimeString()}
            </span>
          </div>
          {item.isSourceDocument && item.fileName && (
            <div className="mb-1 p-2 border border-gray-500 rounded-md bg-gray-700 text-xs">
              <p className="flex items-center">
                <FileText size={14} className="mr-1 flex-shrink-0" />
                Original Document: {item.fileName}
              </p>
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap break-words">
            {item.content}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out"
      onClick={onClose} // Close on overlay click
    >
      <div
        className="bg-gray-800 text-gray-300 p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Document Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center flex-grow">
            <Loader2 size={40} className="animate-spin text-blue-400 mb-3" />
            <p>Loading document details...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center flex-grow text-red-400">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && documentData && (
          <div className="flex-grow overflow-y-auto pr-2 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Original Document
              </h3>
              <p className="bg-gray-700 p-3 rounded-md text-sm">
                {documentData.originalFileName}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Extracted OCR Text
              </h3>
              <div className="bg-gray-700 p-3 rounded-md text-sm max-h-60 overflow-y-auto whitespace-pre-wrap break-words">
                {documentData.extractedOcrText || (
                  <span className="text-gray-400 italic">
                    No text extracted.
                  </span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                <MessageSquare size={20} className="inline mr-2 mb-1" />
                Chat History
              </h3>
              <div className="bg-gray-700 p-3 rounded-md max-h-96 overflow-y-auto">
                {documentData.chatHistoryJson &&
                documentData.chatHistoryJson.length > 0 ? (
                  documentData.chatHistoryJson.map(renderChatHistoryItem)
                ) : (
                  <p className="text-gray-400 italic text-sm">
                    No chat history available for this document.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        {!isLoading && !error && !documentData && (
          <div className="flex flex-col items-center justify-center flex-grow">
            <p>No document data to display.</p>
          </div>
        )}
      </div>
    </div>
  );
};
