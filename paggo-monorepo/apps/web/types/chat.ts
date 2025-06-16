export interface ChatSummary {
    id: string;
    title: string | null;
    createdAt: string; // Assuming ISO string from backend
    updatedAt: string; // Assuming ISO string from backend
}

export interface Message {
    id: string;
    content: string;
    sender: "USER" | "BOT"; // Matches Prisma enum
    createdAt: string; // Assuming ISO string
    extractedOcrText?: string | null;
    fileName?: string | null;

    // Frontend-specific properties (can be merged or kept separate)
    isLoading?: boolean; // For optimistic updates or loading states
    attachment?: { // If you still want to show attachment info for user messages
        name: string;
        type: string;
    };
    // The 'text' field from the old Message interface is now 'content'
    // The 'sender' field from old Message was "user" | "bot", now "USER" | "BOT"
}

// Type for the ChatWindow's internal message state, mapping backend to frontend needs
export interface DisplayMessage {
    id: string;
    text: string;
    sender: "user" | "bot";
    isLoading?: boolean;
    attachment?: {
        name: string;
        type: string;
    };
    timestamp?: string;
    isError?: boolean;
}


export interface ChatHistoryItem {
    sender: 'USER' | 'BOT';
    content: string;
    createdAt: string;
    isSourceDocument?: boolean;
    fileName?: string;
}

export interface CompiledDocumentDto {
    id: string;
    chatId: string;
    sourceMessageId: string;
    originalFileName: string;
    sourceFileBlobPathname: string; // ADDED: Ensure this matches backend DTO
    extractedOcrText: string;
    chatHistoryJson: ChatHistoryItem[] | null; // This should map to ChatHistoryItemDto from backend
    createdAt: string;
    updatedAt: string;
}