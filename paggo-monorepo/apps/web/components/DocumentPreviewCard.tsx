"use client";

import { FileTextIcon, Download, Loader2 } from "lucide-react";
import React, { useState } from "react";

export interface DocumentPreviewProps {
  id: string; // This is the chatId
  title: string;
  date: string;
  thumbnailUrl?: string;
  onClick: () => void;
  onDownload: (chatId: string) => Promise<void>; // Function to handle download
}

export function DocumentPreviewCard({
  id, // chatId
  title,
  date,
  thumbnailUrl,
  onClick,
  onDownload,
}: DocumentPreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await onDownload(id); // Use the id (chatId) prop
    } catch (err) {
      setDownloadError((err as Error).message || "Download failed");
      console.error("Download error on card:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="flex flex-col rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:shadow-xl hover:border-gray-600 transition-shadow duration-200 overflow-hidden"
      role="button" // Keep main card clickable for preview
      tabIndex={0}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") && !isDownloading && onClick()
      }
      onClick={onClick} // Main card click still opens modal
    >
      <div className="flex-grow flex flex-col items-center justify-center p-4 cursor-pointer">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileTextIcon className="w-16 h-16 text-gray-500 mb-2" />
        )}
      </div>
      <div className="p-3 border-t border-gray-700 bg-gray-800/50">
        <h3
          className="text-sm font-semibold truncate text-gray-100"
          title={title}
        >
          {title}
        </h3>
        <p className="text-xs text-gray-400 mb-2">{date}</p>
        <button
          onClick={handleDownloadClick}
          disabled={isDownloading}
          className="w-full mt-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-150"
        >
          {isDownloading ? (
            <Loader2 size={14} className="animate-spin mr-1.5" />
          ) : (
            <Download size={14} className="mr-1.5" />
          )}
          Download
        </button>
        {downloadError && (
          <p className="text-red-400 text-xs mt-1 text-center">
            {downloadError}
          </p>
        )}
      </div>
    </div>
  );
}
