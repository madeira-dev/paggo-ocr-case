"use client";

import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  FormEvent,
} from "react";
import {
  Paperclip,
  SendHorizonal,
  X,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

interface Message {
  id: string;
  text?: string;
  imageUrl?: string;
  sender: "user" | "bot";
}

export const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const TEXTAREA_MAX_HEIGHT = 120;

  // always at the bottom of the chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
    event.target.style.height = "inherit";
    const scrollHeight = event.target.scrollHeight;
    event.target.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
    if (scrollHeight > TEXTAREA_MAX_HEIGHT) {
      event.target.style.overflowY = "auto";
    } else {
      event.target.style.overflowY = "hidden"; // this hides the scrollbar
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() && !selectedFile) return;

    setUploading(true);
    let imageUrl: string | undefined = undefined;

    const currentInputValue = inputValue;
    setInputValue(""); // clear the input state first

    // defer the height adjustment to the next tick, allowing DOM to update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "inherit"; // reset to default/initial height
        // scrollHeight should reflect the empty input value
        const newScrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${newScrollHeight}px`; // set to height of empty content

        // ensure it respects maxHeight and overflow
        if (newScrollHeight <= TEXTAREA_MAX_HEIGHT) {
          textareaRef.current.style.overflowY = "hidden";
        } else {
          textareaRef.current.style.height = `${TEXTAREA_MAX_HEIGHT}px`;
          textareaRef.current.style.overflowY = "auto";
        }
      }
    }, 0);

    if (selectedFile) {
      try {
        const response = await fetch(
          `/api/upload?filename=${encodeURIComponent(selectedFile.name)}`,
          {
            method: "POST",
            body: selectedFile,
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Upload failed");
        }

        const newBlob = await response.json();
        imageUrl = newBlob.url;
        console.log("File uploaded:", newBlob);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: Date.now().toString(),
            text: currentInputValue || `Image: ${selectedFile.name}`,
            sender: "user",
            imageUrl,
          },
        ]);
      } catch (error) {
        console.error("Error uploading file:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: Date.now().toString(),
            text: `Failed to upload ${selectedFile.name}. ${
              currentInputValue || ""
            }`,
            sender: "user",
          },
        ]);
      } finally {
        setSelectedFile(null); // clear selected file
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // reset file input
        }
      }
    } else if (currentInputValue.trim()) {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Date.now().toString(),
          text: currentInputValue,
          sender: "user",
        },
      ]);
    }

    // Simulate bot response
    if (currentInputValue.trim() && !selectedFile) {
      setTimeout(() => {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: (Date.now() + 1).toString(),
            text: `Bot received: "${currentInputValue}"`,
            sender: "bot",
          },
        ]);
      }, 1000);
    } else if (imageUrl) {
      setTimeout(() => {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: (Date.now() + 1).toString(),
            text: `Bot received your image.`,
            sender: "bot",
          },
        ]);
      }, 1000);
    }

    setUploading(false);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
    }
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 text-white">
      {/* Message display area */}
      <div className="flex-grow p-6 space-y-4 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow ${
                msg.sender === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200"
              } break-words`}
            >
              {msg.text}
              {msg.imageUrl &&
                (selectedFile?.type.startsWith("image/") ? (
                  <img
                    src={msg.imageUrl}
                    alt="Uploaded content"
                    className="mt-2 rounded-md max-w-full h-auto"
                    style={{ maxHeight: "200px" }}
                  />
                ) : (
                  msg.imageUrl && (
                    <a
                      href={msg.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 text-blue-400 hover:text-blue-300 underline break-all"
                    >
                      View{" "}
                      {msg.text?.includes("Image:")
                        ? "uploaded file"
                        : selectedFile?.name || "uploaded file"}
                    </a>
                  )
                ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-gray-700 bg-gray-900"
      >
        {/* Selected file preview area */}
        {selectedFile && !uploading && (
          <div className="mb-2 p-3 bg-gray-700 rounded-lg flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 overflow-hidden">
              {selectedFile.type.startsWith("image/") ? (
                <ImageIcon size={20} className="text-gray-400 flex-shrink-0" />
              ) : selectedFile.type === "application/pdf" ? (
                <FileText size={20} className="text-gray-400 flex-shrink-0" />
              ) : (
                <Paperclip size={20} className="text-gray-400 flex-shrink-0" />
              )}
              <span className="truncate">{selectedFile.name}</span>
              <span className="text-gray-400 flex-shrink-0">
                ({(selectedFile.size / 1024).toFixed(2)} KB)
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveSelectedFile}
              className="p-1 text-gray-400 hover:text-gray-200"
              aria-label="Remove selected file"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="flex items-start bg-gray-700 rounded-lg p-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,application/pdf"
          />
          <button
            type="button"
            onClick={triggerFileInput}
            className="p-2 text-gray-400 hover:text-gray-200 mt-1"
            disabled={uploading}
          >
            <Paperclip size={20} />
          </button>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedFile
                ? `Add a message to your file`
                : "Type a message or upload..."
            }
            className="flex-grow bg-transparent text-white placeholder-gray-500 focus:outline-none px-3 py-2 resize-none"
            rows={1}
            style={{
              maxHeight: `${TEXTAREA_MAX_HEIGHT}px`,
              overflowY: "hidden",
            }}
            disabled={uploading}
          />
          <button
            type="submit"
            className="p-2 text-blue-500 hover:text-blue-400 disabled:opacity-50 mt-1"
            disabled={uploading || (!inputValue.trim() && !selectedFile)}
          >
            <SendHorizonal size={20} />
          </button>
        </div>
        {uploading && (
          <p className="text-xs text-yellow-400 mt-1">Uploading...</p>
        )}
      </form>
    </div>
  );
};
