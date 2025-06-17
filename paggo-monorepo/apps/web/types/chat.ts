export interface ChatSummary {
    id: string;
    title: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Message {
    id: string;
    content: string;
    sender: "USER" | "BOT";
    createdAt: string;
    extractedOcrText?: string | null;
    fileName?: string | null;

    isLoading?: boolean;
    attachment?: {
        name: string;
        type: string;
    };
}

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
    sourceFileBlobPathname: string;
    extractedOcrText: string;
    chatHistoryJson: ChatHistoryItem[] | null;
    createdAt: string;
    updatedAt: string;
}