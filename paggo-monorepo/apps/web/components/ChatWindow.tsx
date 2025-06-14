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
  Loader2,
} from "lucide-react";

interface Message {
  id: string;
  text?: string;
  imageUrl?: string;
  sender: "user" | "bot";
  isLoading?: boolean;
}

export const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
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
      event.target.style.overflowY = "hidden"; // this hides the chat scrollbar
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!uploading && !isBotTyping) {
        // prevent sending while bot is typing or file uploading
        handleSendMessage();
      }
    }
  };

  const handleSendMessage = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if ((!inputValue.trim() && !selectedFile) || uploading || isBotTyping)
      return;

    const currentInputText = inputValue.trim();
    const currentSelectedFile = selectedFile;

    setInputValue("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // reset textarea height
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "inherit";
        textareaRef.current.style.overflowY = "hidden";
      }
    }, 0);

    let userMessageText = currentInputText;
    let uploadedImageUrl: string | undefined = undefined;
    const userMessageId = Date.now().toString();

    if (currentSelectedFile) {
      setUploading(true);
      // add a placeholder for the user's message with the file
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: userMessageId,
          text: currentInputText || `Uploading ${currentSelectedFile.name}...`,
          sender: "user",
          imageUrl: URL.createObjectURL(currentSelectedFile), // temporary local preview
          isLoading: true,
        },
      ]);

      try {
        const uploadResponse = await fetch(
          `/api/upload?filename=${encodeURIComponent(currentSelectedFile.name)}`,
          {
            method: "POST",
            body: currentSelectedFile,
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.message || "Upload failed");
        }
        const newBlob = await uploadResponse.json();
        uploadedImageUrl = newBlob.url;
        userMessageText =
          currentInputText || `Image: ${currentSelectedFile.name}`;

        // update user message with actual URL and remove loading
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === userMessageId
              ? {
                  ...msg,
                  text: userMessageText,
                  imageUrl: uploadedImageUrl,
                  isLoading: false,
                }
              : msg
          )
        );
      } catch (error) {
        console.error("Error uploading file:", error);
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === userMessageId
              ? {
                  ...msg,
                  text: `Failed to upload ${currentSelectedFile.name}. ${currentInputText || ""}`,
                  isLoading: false,
                  imageUrl: undefined, // clear preview if upload failed
                }
              : msg
          )
        );
        setUploading(false);
        return; // stop if upload failed
      } finally {
        setUploading(false);
      }
    } else if (currentInputText) {
      userMessageText = currentInputText;
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: userMessageId,
          text: userMessageText,
          sender: "user",
        },
      ]);
    } else {
      return; // nothing to send
    }

    // send to backend for OpenAI response
    setIsBotTyping(true);
    const botMessageId = (Date.now() + 1).toString();
    // thinking bot message
    setMessages((prev) => [
      ...prev,
      { id: botMessageId, sender: "bot", text: "Thinking...", isLoading: true },
    ]);

    try {
      // const backendUrl = 'https://paggo-ocr-case-backend.vercel.app'; // For local dev
      const backendUrl = "http://localhost:3000";

      const response = await fetch(`${backendUrl}/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessageText,
          imageUrl: uploadedImageUrl, // send the Vercel Blob URL if image was uploaded
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to get response from bot");
      }

      const data = await response.json();
      // replace thinking message with actual response
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === botMessageId
            ? { ...msg, text: data.response, isLoading: false }
            : msg
        )
      );
    } catch (error) {
      console.error("Error fetching bot response:", error);
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                text: "Sorry, I couldn't connect. Please try again.",
                isLoading: false,
              }
            : msg
        )
      );
    } finally {
      setIsBotTyping(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // file type and size validation
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        alert(
          "Invalid file type. Please upload an image (JPG, PNG, GIF) or PDF."
        );
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        alert("File is too large. Maximum size is 5MB.");
        return;
      }
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
    if (!uploading && !isBotTyping) {
      // prevent opening file dialog if busy
      fileInputRef.current?.click();
    }
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
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow break-words ${
                msg.sender === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200"
              }`}
            >
              {msg.isLoading && msg.sender === "bot" ? (
                <div className="flex items-center space-x-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>{msg.text || "Thinking..."}</span>
                </div>
              ) : (
                msg.text
              )}
              {msg.imageUrl &&
                (msg.imageUrl.startsWith("blob:") ||
                msg.imageUrl.startsWith("http") ? ( // check if it's a blob or uploaded URL
                  <img
                    src={msg.imageUrl}
                    alt="Uploaded content"
                    className="mt-2 rounded-md max-w-full h-auto"
                    style={{ maxHeight: "200px" }}
                  />
                ) : (
                  // this case might not be hit if imageUrl is always a URL
                  <a
                    href={msg.imageUrl} // Assuming it could be a non-direct link if not blob/http
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-blue-400 hover:text-blue-300 underline break-all"
                  >
                    View uploaded file
                  </a>
                ))}
            </div>
          </div>
        ))}
        {isBotTyping &&
          !messages.find((m) => m.id.startsWith("thinking-")) && ( // fallback if thinking message isn't there
            <div className="flex justify-start mb-4">
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow bg-gray-700 text-gray-200 flex items-center space-x-2">
                <Loader2 size={16} className="animate-spin" />
                <span>Bot is typing...</span>
              </div>
            </div>
          )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-gray-700 bg-gray-900"
      >
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
              disabled={uploading || isBotTyping}
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
            accept="image/jpeg,image/png,image/gif,application/pdf"
            disabled={uploading || isBotTyping}
          />
          <button
            type="button"
            onClick={triggerFileInput}
            className="p-2 text-gray-400 hover:text-gray-200 mt-1"
            disabled={uploading || isBotTyping}
            aria-label="Attach file"
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
                ? `Add a message to your file...`
                : "Type a message or upload a file..."
            }
            className="flex-grow bg-transparent text-white placeholder-gray-500 focus:outline-none px-3 py-2 resize-none"
            rows={1}
            style={{
              maxHeight: `${TEXTAREA_MAX_HEIGHT}px`,
              overflowY: "hidden",
            }}
            disabled={uploading || isBotTyping}
          />
          <button
            type="submit"
            className="p-2 text-blue-500 hover:text-blue-400 disabled:opacity-50 mt-1"
            disabled={
              uploading || isBotTyping || (!inputValue.trim() && !selectedFile)
            }
            aria-label="Send message"
          >
            {isBotTyping || uploading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <SendHorizonal size={20} />
            )}
          </button>
        </div>
        {(uploading || isBotTyping) && (
          <p className="text-xs text-yellow-400 mt-1 text-center">
            {uploading
              ? "Uploading file..."
              : isBotTyping
                ? "Bot is thinking..."
                : ""}
          </p>
        )}
      </form>
    </div>
  );
};
