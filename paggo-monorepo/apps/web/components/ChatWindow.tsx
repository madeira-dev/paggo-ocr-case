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
  MessageSquare,
  Paperclip,
  SendHorizonal,
  X,
  Loader2,
  Bot,
  User,
  ImageIcon,
  FileText,
} from "lucide-react";
import { DisplayMessage, Message as BackendMessage } from "../types/chat";
import { fetchChatMessages, getAuthHeaders, sendMessageApi } from "../lib/api";
import { nanoid as cuid } from "nanoid";

interface ChatWindowProps {
  activeChatId: string | null;
  onChatCreated: (newChatId: string, newChatTitle?: string) => void;
}

// Helper to map backend message to display message
const mapBackendMessageToDisplay = (msg: BackendMessage): DisplayMessage => ({
  id: msg.id,
  text: msg.content,
  sender: msg.sender === "USER" ? "user" : "bot",
  timestamp: msg.createdAt,
  attachment:
    msg.fileName && msg.sender === "USER"
      ? { name: msg.fileName, type: "" }
      : undefined,
});

interface OcrResult {
  text: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  activeChatId: activeChatIdProp,
  onChatCreated,
}) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isFileProcessing, setIsFileProcessing] = useState<boolean>(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [errorLoadingMessages, setErrorLoadingMessages] = useState<
    string | null
  >(null);
  const activeChatIdRef = useRef(activeChatIdProp);

  // Update the ref whenever the prop changes
  useEffect(() => {
    activeChatIdRef.current = activeChatIdProp;
  }, [activeChatIdProp]);

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
        textareaRef.current.style.overflowY = "auto";
        textareaRef.current.style.height = `200px`;
      } else {
        textareaRef.current.style.overflowY = "hidden";
      }
    }
  }, [inputValue]);

  // Load messages when activeChatIdProp changes
  useEffect(() => {
    if (activeChatIdProp) {
      setIsLoadingMessages(true);
      setErrorLoadingMessages(null);
      setMessages([]); // Clear previous messages
      fetchChatMessages(activeChatIdProp)
        .then((backendMessages) => {
          setMessages(backendMessages.map(mapBackendMessageToDisplay));
        })
        .catch((err) => {
          console.error("Error fetching messages:", err);
          setErrorLoadingMessages((err as Error).message);
        })
        .finally(() => {
          setIsLoadingMessages(false);
        });
    } else {
      setMessages([]); // Clear messages if no chat is active (new chat)
      setErrorLoadingMessages(null);
      // For new chats, ensure input value is also cleared if user navigated away and back
      setInputValue("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [activeChatIdProp]);

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
      if (activeChatIdProp || selectedFile) {
        event.preventDefault();
        handleSendMessage();
      }
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Maximum size is 10MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      const supportedTypes = ["image/jpeg", "image/png", "application/pdf"];
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();

    if (!activeChatIdRef.current && !selectedFile) {
      return;
    }

    if (
      (!inputValue.trim() && !selectedFile) ||
      isFileProcessing ||
      isBotTyping
    ) {
      return;
    }

    const currentInputText = inputValue.trim();
    const currentSelectedFile = selectedFile;

    const userDisplayMessageId = `user-${Date.now()}`;
    const userMessageText =
      currentInputText ||
      (currentSelectedFile
        ? `Uploaded: ${currentSelectedFile.name}`
        : "Empty message");

    setMessages((prev) => [
      ...prev,
      {
        id: userDisplayMessageId,
        text: userMessageText,
        sender: "user",
        isLoading: !!currentSelectedFile,
        attachment: currentSelectedFile
          ? { name: currentSelectedFile.name, type: currentSelectedFile.type }
          : undefined,
        timestamp: new Date().toISOString(),
      },
    ]);

    setInputValue("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    let extractedTextForAI: string | null = null;
    let vercelBlobPathname: string | null = null; // the unique path/filename from Vercel Blob
    let originalUserFileName: string | null = null; // the original name of the file uploaded by the user

    if (currentSelectedFile) {
      setIsFileProcessing(true);
      originalUserFileName = currentSelectedFile.name;

      try {
        // Upload to Vercel Blob via our frontend API route
        // Generate a unique filename for Vercel Blob storage to avoid collisions
        const fileExtension = currentSelectedFile.name.split(".").pop();
        const uniqueBlobFileName = `${cuid()}.${fileExtension}`;

        // The /api/upload route expects the file directly in the body
        const uploadResponse = await fetch(
          `/api/upload?filename=${encodeURIComponent(uniqueBlobFileName)}`,
          {
            method: "POST",
            body: currentSelectedFile,
            headers: {
              "Content-Type": currentSelectedFile.type, // Important for Vercel Blob to recognize the file type
            },
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse
            .json()
            .catch(() => ({ message: "File upload to Vercel Blob failed" }));
          throw new Error(
            errorData.message ||
              `Upload to Vercel Blob failed for ${currentSelectedFile.name}`
          );
        }
        const blobResult = await uploadResponse.json(); // Vercel Blob API response
        vercelBlobPathname = blobResult.pathname;

        if (!vercelBlobPathname) {
          throw new Error("Failed to get pathname from Vercel Blob response.");
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userDisplayMessageId && msg.attachment
              ? {
                  ...msg,
                  attachment: {
                    ...msg.attachment,
                    name: `Processing: ${originalUserFileName}`,
                  },
                }
              : msg
          )
        );

        // Call backend OCR with the Vercel Blob pathname
        const ocrPayload = {
          blobPathname: vercelBlobPathname,
          originalFileName: originalUserFileName,
        };

        const backendOcrUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"}/ocr/extract-text`;
        const ocrResponse = await fetch(backendOcrUrl, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(ocrPayload),
          credentials: "include",
        });

        if (!ocrResponse.ok) {
          const errorData = await ocrResponse
            .json()
            .catch(() => ({ message: "OCR request failed" }));
          throw new Error(
            errorData.message ||
              `OCR processing failed for ${originalUserFileName}`
          );
        }

        const ocrResultData = (await ocrResponse.json()) as { text: string };
        extractedTextForAI = ocrResultData.text;

        if (!extractedTextForAI?.trim() && originalUserFileName) {
          extractedTextForAI = `[OCR was unable to extract text from the file: ${originalUserFileName}]`;
        }

        // Update user message: File processing complete
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userDisplayMessageId
              ? {
                  ...msg,
                  isLoading: false,
                  attachment: msg.attachment
                    ? { ...msg.attachment, name: originalUserFileName! } // Show original name after processing
                    : undefined,
                }
              : msg
          )
        );
      } catch (error) {
        console.error("Error during file processing (upload or OCR):", error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userDisplayMessageId
              ? {
                  ...msg,
                  text: `${userMessageText} (File Error: ${(error as Error).message})`,
                  isLoading: false,
                  isError: true,
                  attachment: msg.attachment
                    ? {
                        ...msg.attachment,
                        name: originalUserFileName || "File error",
                      }
                    : undefined,
                }
              : msg
          )
        );
        setIsFileProcessing(false);
        return; // Stop further processing
      } finally {
        setIsFileProcessing(false);
      }
    } // End of file processing

    // If no text input and no file was successfully processed, do nothing further
    if (!currentInputText && !vercelBlobPathname) {
      // If the user message was only for a file and it failed, it's already updated with an error.
      // If it was an empty message attempt, return
      if (
        messages.find((m) => m.id === userDisplayMessageId)?.text ===
        "Empty message"
      ) {
        setMessages((prev) =>
          prev.filter((m) => m.id !== userDisplayMessageId)
        ); // Remove "Empty message"
      }
      return;
    }

    setIsBotTyping(true);
    const botThinkingDisplayMessageId = `bot-thinking-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: botThinkingDisplayMessageId,
        text: "Thinking...",
        sender: "bot",
        isLoading: true,
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      const chatIdForPayload =
        activeChatIdRef.current === null ? undefined : activeChatIdRef.current;

      const payloadToAI = {
        chatId: chatIdForPayload,
        message: currentInputText,
        extractedOcrText:
          extractedTextForAI === null ? undefined : extractedTextForAI,
        fileName: vercelBlobPathname === null ? undefined : vercelBlobPathname,
        originalUserFileName:
          originalUserFileName === null ? undefined : originalUserFileName,
      };

      const responseData = await sendMessageApi(payloadToAI);

      if (!activeChatIdRef.current && responseData.chatId) {
        if (onChatCreated) {
          onChatCreated(
            responseData.chatId,
            responseData.chatTitle || "New Chat"
          );
        }
        const newUrl = `/?chatId=${responseData.chatId}`;
        window.history.pushState({ path: newUrl }, "", newUrl);
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botThinkingDisplayMessageId
            ? {
                ...msg,
                id: responseData.botResponse.id,
                text: responseData.botResponse.content,
                sender: "bot",
                isLoading: false,
              }
            : msg
        )
      );
    } catch (error) {
      console.error("Error sending message to backend:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botThinkingDisplayMessageId
            ? {
                ...msg,
                text: `Error: ${(error as Error).message}`,
                sender: "bot",
                isLoading: false,
                isError: true,
              }
            : msg
        )
      );
    } finally {
      setIsBotTyping(false);
    }
  };

  const triggerFileInput = () => {
    if (!isFileProcessing && !isBotTyping) fileInputRef.current?.click();
  };

  const isNewChatWithoutFile = !activeChatIdProp && !selectedFile;
  const isTextareaDisabled =
    isFileProcessing ||
    isBotTyping ||
    isLoadingMessages ||
    isNewChatWithoutFile;
  const isSendButtonDisabled =
    isFileProcessing ||
    isBotTyping ||
    isLoadingMessages ||
    isNewChatWithoutFile ||
    (!inputValue.trim() && !selectedFile);

  return (
    <div className="flex flex-col flex-grow min-h-0 bg-gray-800 text-gray-100">
      <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-gray-800">
        {isLoadingMessages && (
          <div className="flex justify-center items-center h-full">
            <Loader2 size={32} className="animate-spin text-blue-400" />
            <span className="ml-2">Loading messages...</span>
          </div>
        )}
        {errorLoadingMessages && (
          <div className="text-center text-red-400 p-4">
            Error loading messages: {errorLoadingMessages}
          </div>
        )}

        {!isLoadingMessages &&
          !errorLoadingMessages &&
          messages.length === 0 &&
          !activeChatIdProp && (
            <div className="text-center text-gray-400 p-4">
              Please upload a document to start a new chat.
            </div>
          )}

        {!isLoadingMessages &&
          !errorLoadingMessages &&
          messages.length === 0 &&
          activeChatIdProp && (
            <div className="text-center text-gray-400 p-4">
              No messages in this chat yet. Send one to start!
            </div>
          )}
        {!isLoadingMessages &&
          !errorLoadingMessages &&
          messages.length === 0 &&
          !activeChatIdProp && (
            <div className="text-center text-gray-400 p-4">
              Select a chat or start a new one.
            </div>
          )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} mb-4`}
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
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

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
                {" "}
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
            accept="image/*,application/pdf"
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
              isNewChatWithoutFile
                ? "Upload a document to start chatting..."
                : selectedFile
                  ? `Add a message for your file ${selectedFile.name}...`
                  : "Type a message..."
            }
            className="flex-grow bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none px-3 py-2 resize-none overflow-hidden min-h-[40px] max-h-[200px]"
            rows={1}
            disabled={isTextareaDisabled}
          />
          <button
            type="submit"
            className="p-2 text-blue-400 hover:text-blue-300 disabled:text-gray-500 mt-1"
            disabled={isSendButtonDisabled}
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
