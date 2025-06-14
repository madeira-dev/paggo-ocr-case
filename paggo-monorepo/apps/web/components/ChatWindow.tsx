"use client";

import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  FormEvent,
  useCallback,
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
  text: string; // user's typed text
  sender: "user" | "bot";
  imageUrl?: string; // AI image responses or old data
  isLoading?: boolean;
  attachment?: {
    // user messages with files
    name: string;
    type: string;
  };
}

export const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isFileProcessing, setIsFileProcessing] = useState<boolean>(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
      if (scrollHeight > 200) {
        // Max height example
        textareaRef.current.style.overflowY = "auto";
        textareaRef.current.style.height = `200px`;
      } else {
        textareaRef.current.style.overflowY = "hidden";
      }
    }
  }, [inputValue]);

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !isBotTyping &&
      !isFileProcessing
    ) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Max file size (e.g., 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Maximum size is 10MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      // Supported file types (adjust as per your OCR backend)
      const supportedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
      ];
      if (!supportedTypes.includes(file.type)) {
        alert(
          "Unsupported file type. Please upload an image (JPEG, PNG, GIF) or PDF."
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
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

  const handleSendMessage = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (
      (!inputValue.trim() && !selectedFile) ||
      isFileProcessing ||
      isBotTyping
    ) {
      return;
    }

    const currentInputText = inputValue.trim();
    const currentSelectedFile = selectedFile;

    setInputValue("");
    setSelectedFile(null); // Clear selection from UI state
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the file input element
    }
    // Reset textarea height
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "inherit";
        textareaRef.current.style.overflowY = "hidden";
      }
    }, 0);

    const userMessageId = Date.now().toString();
    let extractedTextForAI: string | undefined = undefined;
    let userMessageAddedToUI = false;

    if (currentSelectedFile) {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: userMessageId,
          text: currentInputText, // User's typed message
          sender: "user",
          attachment: {
            name: currentSelectedFile.name,
            type: currentSelectedFile.type,
          },
          isLoading: true, // For file processing phase
        },
      ]);
      userMessageAddedToUI = true;
      setIsFileProcessing(true);

      try {
        const ocrFormData = new FormData();
        ocrFormData.append("file", currentSelectedFile); // Backend expects 'file'

        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
        const ocrResponse = await fetch(`${backendUrl}/ocr/extract-text`, {
          method: "POST",
          body: ocrFormData,
        });

        if (!ocrResponse.ok) {
          const errorData = await ocrResponse.json().catch(() => ({
            message:
              "OCR request failed with status: " + ocrResponse.statusText,
          }));
          throw new Error(
            errorData.message || `OCR failed for ${currentSelectedFile.name}`
          );
        }
        const ocrResult = await ocrResponse.json();
        extractedTextForAI = ocrResult.text;

        if (
          extractedTextForAI === undefined ||
          extractedTextForAI === null ||
          extractedTextForAI.trim() === ""
        ) {
          console.warn(
            "OCR returned no text or failed to extract for:",
            currentSelectedFile.name
          );
          extractedTextForAI = `[OCR was unable to extract text from the file: ${currentSelectedFile.name}]`;
        }

        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === userMessageId ? { ...msg, isLoading: false } : msg
          )
        );
      } catch (error) {
        console.error("Error during file processing/OCR:", error);
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === userMessageId
              ? {
                  ...msg,
                  text: `${currentInputText} (File Error: ${(error as Error).message})`,
                  isLoading: false,
                  attachment: undefined,
                }
              : msg
          )
        );
        setIsFileProcessing(false);
        return;
      } finally {
        setIsFileProcessing(false);
      }
    } else if (currentInputText) {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: userMessageId,
          text: currentInputText,
          sender: "user",
        },
      ]);
      userMessageAddedToUI = true;
    } else {
      return;
    }

    if (!userMessageAddedToUI && !currentInputText && !extractedTextForAI) {
      // Should not happen due to initial checks, but safeguard
      return;
    }

    setIsBotTyping(true);
    const botThinkingMessageId = `thinking-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: botThinkingMessageId,
        sender: "bot",
        text: "Thinking...",
        isLoading: true,
      },
    ]);

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
      const payloadToAI = {
        message: currentInputText,
        extractedOcrText: extractedTextForAI,
        fileName: currentSelectedFile?.name,
      };

      const response = await fetch(`${backendUrl}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadToAI),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: "Failed to get response from bot: " + response.statusText,
        }));
        throw new Error(errorData.message || "Failed to get response from bot");
      }

      const data = await response.json();
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === botThinkingMessageId
            ? { ...msg, text: data.response, isLoading: false }
            : msg
        )
      );
    } catch (error) {
      console.error("Error fetching bot response:", error);
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === botThinkingMessageId
            ? {
                ...msg,
                text: `Sorry, I couldn't connect: ${(error as Error).message}`,
                isLoading: false,
              }
            : msg
        )
      );
    } finally {
      setIsBotTyping(false);
    }
  };

  const triggerFileInput = () => {
    if (!isFileProcessing && !isBotTyping) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 text-gray-100">
      {/* Messages area */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-gray-800">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            } mb-4`}
          >
            <div
              className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-lg shadow ${
                msg.sender === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200"
              }`}
            >
              {msg.isLoading && msg.sender === "user" && isFileProcessing ? (
                <div className="flex items-center space-x-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing file...</span>
                </div>
              ) : msg.isLoading && msg.sender === "bot" ? (
                <div className="flex items-center space-x-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>{msg.text || "Thinking..."}</span>
                </div>
              ) : (
                <span
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {msg.text}
                </span>
              )}

              {msg.attachment && msg.sender === "user" && (
                <div
                  className={`mt-2 pt-2 text-xs ${msg.sender === "user" ? "border-blue-500" : "border-gray-600"}`}
                >
                  <p className="flex items-center">
                    {msg.attachment.type.startsWith("image/") ? (
                      <ImageIcon size={14} className="mr-1 flex-shrink-0" />
                    ) : (
                      <FileText size={14} className="mr-1 flex-shrink-0" />
                    )}
                    <span className="truncate" title={msg.attachment.name}>
                      {msg.attachment.name}
                    </span>
                  </p>
                </div>
              )}

              {/* For bot image responses */}
              {msg.imageUrl &&
                msg.sender === "bot" &&
                (msg.imageUrl.startsWith("blob:") ||
                  msg.imageUrl.startsWith("http")) && (
                  <img
                    src={msg.imageUrl}
                    alt="Bot content"
                    className="mt-2 rounded-md max-w-full h-auto"
                    style={{ maxHeight: "200px" }}
                  />
                )}
            </div>
          </div>
        ))}
        {isBotTyping &&
          !messages.find(
            (m) => m.id.startsWith("thinking-") && m.isLoading
          ) && ( // Fallback if thinking message isn't there or already resolved
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
        {selectedFile && !isFileProcessing && (
          <div className="mb-2 p-3 bg-gray-700 rounded-lg flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 overflow-hidden">
              {selectedFile.type.startsWith("image/") ? (
                <ImageIcon size={20} className="text-gray-400 flex-shrink-0" />
              ) : selectedFile.type === "application/pdf" ? (
                <FileText size={20} className="text-gray-400 flex-shrink-0" />
              ) : (
                <Paperclip size={20} className="text-gray-400 flex-shrink-0" />
              )}
              <span className="truncate" title={selectedFile.name}>
                {selectedFile.name}
              </span>
              <span className="text-gray-400 flex-shrink-0">
                ({(selectedFile.size / 1024).toFixed(2)} KB)
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveSelectedFile}
              className="p-1 text-gray-400 hover:text-gray-200"
              aria-label="Remove selected file"
              disabled={isFileProcessing || isBotTyping}
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="flex items-start bg-gray-700 rounded-lg p-2">
          <input
            type="file"
            accept="image/*,application/pdf" // Keep this general
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: "none" }}
            id="file-input-ocr"
            disabled={isFileProcessing || isBotTyping}
          />
          <button
            type="button"
            onClick={triggerFileInput}
            className="p-2 text-gray-400 hover:text-gray-200 mt-1"
            disabled={isFileProcessing || isBotTyping}
            aria-label="Attach file for OCR"
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
                ? `Add a message for your file ${selectedFile.name}...`
                : "Type a message or upload a file for OCR..."
            }
            className="flex-grow bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none px-3 py-2 resize-none overflow-hidden min-h-[40px] max-h-[200px]"
            rows={1}
            disabled={isFileProcessing || isBotTyping}
          />
          <button
            type="submit"
            className="p-2 text-blue-400 hover:text-blue-300 disabled:text-gray-500 mt-1"
            disabled={
              isFileProcessing ||
              isBotTyping ||
              (!inputValue.trim() && !selectedFile)
            }
            aria-label="Send message"
          >
            <SendHorizonal size={20} />
          </button>
        </div>
        {(isFileProcessing || isBotTyping) && (
          <p className="text-xs text-yellow-400 mt-1 text-center">
            {isFileProcessing
              ? `Processing file ${selectedFile?.name || ""}...`
              : isBotTyping
                ? "Bot is thinking..."
                : ""}
          </p>
        )}
      </form>
    </div>
  );
};
