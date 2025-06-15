"use client";

import React from "react";
import { CompiledDocumentDto, ChatHistoryItem } from "../types/chat";
import { X, Loader2, FileText, ImageIcon } from "lucide-react";

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

  const renderFilePreview = () => {
    if (
      !documentData?.sourceFileBlobPathname ||
      !documentData?.originalFileName
    ) {
      return (
        <p className="text-sm text-gray-400">No file preview available.</p>
      );
    }

    const blobBaseUrl = process.env.NEXT_PUBLIC_VERCEL_BLOB_BASE_URL;
    if (!blobBaseUrl) {
      console.error("NEXT_PUBLIC_VERCEL_BLOB_BASE_URL is not set.");
      return (
        <p className="text-sm text-red-400">
          File preview URL cannot be constructed.
        </p>
      );
    }

    const fileUrl = `${blobBaseUrl.endsWith("/") ? blobBaseUrl : blobBaseUrl + "/"}${documentData.sourceFileBlobPathname}`;
    const fileExtension = documentData.originalFileName
      .split(".")
      .pop()
      ?.toLowerCase();

    if (fileExtension === "pdf") {
      return (
        <iframe
          src={fileUrl}
          width="100%"
          height="400px" // Adjust height as needed
          title={documentData.originalFileName}
          className="border border-gray-600 rounded"
        />
      );
    } else if (
      ["png", "jpg", "jpeg", "gif", "webp"].includes(fileExtension || "")
    ) {
      return (
        <img
          src={fileUrl}
          alt={documentData.originalFileName}
          className="max-w-full max-h-[400px] object-contain border border-gray-600 rounded" // Adjust styling
        />
      );
    } else {
      return (
        <div className="text-sm text-gray-400 p-4 border border-dashed border-gray-600 rounded flex flex-col items-center justify-center h-[200px]">
          <FileText size={32} className="mb-2" />
          <p>Preview not available for this file type:</p>
          <p className="font-medium">{documentData.originalFileName}</p>
        </div>
      );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 text-gray-200 p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col relative" // Increased max-w and max-h
        onClick={(e) => e.stopPropagation()} // Prevent click inside modal from closing it
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-100"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-semibold mb-6 text-white border-b border-gray-700 pb-3">
          Compiled Document
        </h2>

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 size={32} className="animate-spin text-blue-400 mb-3" />
            <p>Loading document details...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center text-red-400 p-4 h-64 flex flex-col items-center justify-center">
            <p className="text-lg font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && documentData && (
          <div className="space-y-6 overflow-y-auto pr-2">
            {" "}
            {/* Added pr-2 for scrollbar spacing */}
            <div>
              <h3 className="text-lg font-medium text-blue-400 mb-1">
                Original File
              </h3>
              <p
                className="text-sm text-gray-400 mb-2"
                title={documentData.originalFileName}
              >
                Name:{" "}
                <span className="font-semibold text-gray-300">
                  {documentData.originalFileName}
                </span>
              </p>
              {/* File Preview Section */}
              <div className="mb-4">{renderFilePreview()}</div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-blue-400 mb-1">
                Extracted OCR Text
              </h3>
              <pre className="bg-gray-750 p-3 rounded text-sm whitespace-pre-wrap break-words max-h-60 overflow-y-auto border border-gray-600">
                {documentData.extractedOcrText || "No text extracted."}
              </pre>
            </div>
            <div>
              <h3 className="text-lg font-medium text-blue-400 mb-2">
                Chat Interactions
              </h3>
              {documentData.chatHistoryJson &&
              documentData.chatHistoryJson.length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto border border-gray-600 p-3 rounded bg-gray-750">
                  {documentData.chatHistoryJson.map((item, index) => (
                    <div
                      key={index}
                      className={`p-2.5 rounded-md text-sm ${
                        item.sender === "USER"
                          ? "bg-blue-600 bg-opacity-30 self-end"
                          : "bg-gray-600 bg-opacity-40 self-start"
                      }`}
                    >
                      <p className="font-semibold mb-0.5">
                        {item.sender === "USER" ? "You" : "Bot"}
                        {item.isSourceDocument && item.fileName && (
                          <span className="text-xs text-gray-400 ml-2 italic">
                            (Source: {item.fileName})
                          </span>
                        )}
                      </p>
                      <p className="whitespace-pre-wrap break-words">
                        {item.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  No chat history available.
                </p>
              )}
            </div>
          </div>
        )}
        {!isLoading && !error && !documentData && (
          <div className="text-center text-gray-400 p-4 h-64 flex flex-col items-center justify-center">
            <p>No document data to display.</p>
          </div>
        )}
      </div>
    </div>
  );
};
