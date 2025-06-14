"use client"; // Should be at the very top

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
  ImageIcon, // ADDED ImageIcon
  FileText, // ADDED FileText
} from "lucide-react"; // Ensure X is imported
import { DisplayMessage, Message as BackendMessage } from "../types/chat"; // Import types
import { fetchChatMessages, sendMessageApi } from "../lib/api"; // Import API functions

interface ChatWindowProps {
  activeChatId: string | null;
  onChatCreated: (newChatId: string, newChatTitle?: string) => void; // Callback to update parent
}

// Helper to map backend message to display message
const mapBackendMessageToDisplay = (msg: BackendMessage): DisplayMessage => ({
  id: msg.id,
  text: msg.content,
  sender: msg.sender === "USER" ? "user" : "bot",
  timestamp: msg.createdAt,
  // Add attachment logic if needed based on fileName/extractedOcrText
  attachment:
    msg.fileName && msg.sender === "USER"
      ? { name: msg.fileName, type: "" /* Determine type if possible */ }
      : undefined,
});

// Define an interface for the OCR result if you haven't already
interface OcrResult {
  text: string;
  storedFileName: string;
  originalFileName: string;
}

// Placeholder for getAuthHeadersInternal - replace with your actual implementation
// This might come from a context, a utility file, or be defined in this component
// if it's simple enough and doesn't involve hooks that break rules.
const getAuthHeadersInternal = () => {
  // Example:
  // const token = localStorage.getItem('authToken');
  // return token ? { 'Authorization': `Bearer ${token}` } : {};
  return {}; // Replace with your actual auth header logic
};

export const ChatWindow: React.FC<ChatWindowProps> = ({
  activeChatId: activeChatIdProp, // Renamed prop to avoid conflict with potential state
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

  // Use a ref to store the current activeChatId from props,
  // as props can change and state updates based on props should be handled in useEffect.
  // This ref helps in capturing the correct chatId at the moment of sending a message.
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
    }
  }, [activeChatIdProp]); // Depend on activeChatIdProp

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
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Maximum size is 10MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (
      (!inputValue.trim() && !selectedFile) ||
      isFileProcessing ||
      isBotTyping
    )
      return;

    const currentInputText = inputValue.trim();
    const currentSelectedFile = selectedFile; // Original File object

    setInputValue("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => {
      if (textareaRef.current) textareaRef.current.style.height = "inherit";
    }, 0);

    const userDisplayMessageId = `user-${Date.now()}`;
    let extractedTextForAI: string | undefined = undefined;
    let fileNameForBackendDto: string | undefined = undefined; // This will be the unique storedFileName
    let displayFileNameForUi: string | undefined = currentSelectedFile?.name; // Original name for UI

    const userMessageAttachment = currentSelectedFile
      ? { name: displayFileNameForUi!, type: currentSelectedFile.type }
      : undefined;

    // Optimistically add user message
    const userDisplayMessage: DisplayMessage = {
      id: userDisplayMessageId,
      text: currentInputText,
      sender: "user",
      attachment: userMessageAttachment,
      isLoading: !!currentSelectedFile, // Show loading if file is being processed
    };
    setMessages((prev) => [...prev, userDisplayMessage]);

    if (currentSelectedFile) {
      setIsFileProcessing(true);
      try {
        const ocrFormData = new FormData();
        ocrFormData.append("file", currentSelectedFile);
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
        const ocrResponse = await fetch(`${backendUrl}/ocr/extract-text`, {
          method: "POST",
          body: ocrFormData,
          credentials: "include",
        });

        if (!ocrResponse.ok) {
          const errorData = await ocrResponse
            .json()
            .catch(() => ({ message: "OCR request failed" }));
          throw new Error(
            errorData.message || `OCR failed for ${currentSelectedFile.name}`
          );
        }

        const ocrResultData: OcrResult = await ocrResponse.json();
        extractedTextForAI = ocrResultData.text;
        fileNameForBackendDto = ocrResultData.storedFileName; // Assign unique name for backend DTO
        displayFileNameForUi = ocrResultData.originalFileName; // Update UI display name from backend's confirmed original

        if (!extractedTextForAI?.trim()) {
          extractedTextForAI = `[OCR was unable to extract text from the file: ${displayFileNameForUi}]`;
        }

        // Update user message with final attachment name and turn off loading
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userDisplayMessageId
              ? {
                  ...msg,
                  isLoading: false,
                  attachment: msg.attachment // Use the updated displayFileNameForUi
                    ? { ...msg.attachment, name: displayFileNameForUi! }
                    : undefined,
                }
              : msg
          )
        );
      } catch (error) {
        console.error("Error during file processing/OCR:", error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userDisplayMessageId
              ? {
                  ...msg,
                  text: `${currentInputText} (File Error: ${(error as Error).message})`,
                  isLoading: false,
                  attachment: undefined, // Clear attachment on error
                }
              : msg
          )
        );
        setIsFileProcessing(false);
        return; // Stop if OCR failed
      } finally {
        setIsFileProcessing(false);
      }
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
      },
    ]);

    try {
      // Determine current active chat ID for the payload
      const chatIdForPayload = activeChatIdRef.current; // Use the ref

      const payloadToAI = {
        chatId: chatIdForPayload,
        message: currentInputText,
        extractedOcrText: extractedTextForAI,
        fileName: fileNameForBackendDto,
      };

      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
      const response = await fetch(`${backendUrl}/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeadersInternal(),
        },
        body: JSON.stringify(payloadToAI),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: "Failed to send message or get AI response",
        }));
        throw new Error(
          errorData.message || `Server error: ${response.status}`
        );
      }

      const result = await response.json();
      const newChatId = result.chatId;
      const botMessageContent = result.botResponse.content;

      // If a new chat was created (i.e., we didn't have an activeChatId before, or it changed),
      // call the onChatCreated callback. The parent component (page.tsx)
      // will be responsible for updating its own state which will then flow down
      // as the activeChatIdProp.
      if (newChatId && newChatId !== activeChatIdRef.current) {
        if (onChatCreated) {
          onChatCreated(newChatId, result.chatTitle || "New Chat");
        }
        activeChatIdRef.current = newChatId; // Update ref immediately for consistency
      } else if (!activeChatIdRef.current && newChatId) {
        // This case handles when the first message creates a new chat
        if (onChatCreated) {
          onChatCreated(newChatId, result.chatTitle || "New Chat");
        }
        activeChatIdRef.current = newChatId;
      }

      setMessages((prev) =>
        prev
          .filter((msg) => msg.id !== botThinkingDisplayMessageId)
          .concat({
            id: result.botResponse.id || `bot-${Date.now()}`,
            text: botMessageContent,
            sender: "bot",
          })
      );
    } catch (error) {
      console.error("Error sending message or getting AI response:", error);
      setMessages((prev) => {
        const filteredPrev = prev.filter(
          (msg) => msg.id !== botThinkingDisplayMessageId
        );
        // MODIFIED: Use spread syntax for adding the new error message
        return [
          ...filteredPrev,
          {
            id: `error-${Date.now()}`,
            text: `Sorry, I couldn't connect: ${(error as Error).message}`,
            sender: "bot",
            isError: true,
          },
        ];
      });
    } finally {
      setIsBotTyping(false);
    }
  };

  const triggerFileInput = () => {
    if (!isFileProcessing && !isBotTyping) fileInputRef.current?.click();
  };

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
          activeChatIdProp && ( // Use activeChatIdProp here
            <div className="text-center text-gray-400 p-4">
              No messages in this chat yet. Send one to start!
            </div>
          )}
        {!isLoadingMessages &&
          !errorLoadingMessages &&
          messages.length === 0 &&
          !activeChatIdProp && ( // Use activeChatIdProp here
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
              selectedFile
                ? `Add a message for your file ${selectedFile.name}...`
                : activeChatIdProp // Use activeChatIdProp here
                  ? "Type a message..."
                  : "Type a message to start a new chat..."
            }
            className="flex-grow bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none px-3 py-2 resize-none overflow-hidden min-h-[40px] max-h-[200px]"
            rows={1}
            disabled={isFileProcessing || isBotTyping || isLoadingMessages}
          />
          <button
            type="submit"
            className="p-2 text-blue-400 hover:text-blue-300 disabled:text-gray-500 mt-1"
            disabled={
              isFileProcessing ||
              isBotTyping ||
              isLoadingMessages ||
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
