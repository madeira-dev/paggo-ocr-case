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
    text: string; // This will be 'content' from backend
    sender: "user" | "bot"; // Map "USER" to "user", "BOT" to "bot"
    isLoading?: boolean;
    attachment?: {
        name: string;
        type: string;
    };
    // Add any other fields needed for display, like timestamp
    timestamp?: string;
}