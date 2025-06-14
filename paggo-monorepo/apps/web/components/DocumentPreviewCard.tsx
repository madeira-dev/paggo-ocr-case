"use client";

import { FileTextIcon } from "lucide-react";

export interface DocumentPreviewProps {
  id: string;
  title: string;
  date: string;
  thumbnailUrl?: string;
  onClick: () => void;
}

export function DocumentPreviewCard({
  title,
  date,
  thumbnailUrl,
  onClick,
}: DocumentPreviewProps) {
  return (
    <div
      className="aspect-square flex flex-col cursor-pointer rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:shadow-xl hover:border-gray-600 transition-shadow duration-200 overflow-hidden"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
    >
      <div className="flex-grow flex flex-col items-center justify-center p-4">
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
        <p className="text-xs text-gray-400">{date}</p>
      </div>
    </div>
  );
}
