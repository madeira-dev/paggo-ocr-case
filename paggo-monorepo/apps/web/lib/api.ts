import { withRelatedProject } from '@vercel/related-projects';
import { ChatSummary, Message as BackendMessage, CompiledDocumentDto, Message } from '../types/chat';

const backendProjectName = 'help-nestjs-vercel';

const backendUrlFromEnv = process.env.NEXT_PUBLIC_BACKEND_API_URL;

if (typeof backendUrlFromEnv !== 'string' || backendUrlFromEnv.trim() === '') {
    throw new Error(
        "CRITICAL: NEXT_PUBLIC_BACKEND_API_URL environment variable is not set or is empty."
    );
}

const defaultApiHost = backendUrlFromEnv.replace(/\/$/, "");

const apiHost = withRelatedProject({
    projectName: backendProjectName,
    defaultHost: defaultApiHost,
});

export async function fetchDataFromBackend() {
    try {
        console.log("apihost:", apiHost)
        const response = await fetch(`${apiHost}/hello`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data from backend:', error);
        throw error;
    }
}

// --- New Chat API Functions ---

// Helper to get headers with credentials (cookies for session auth)
export const getAuthHeaders = () => {
    return {
        'Content-Type': 'application/json',
        // Cookies are typically sent automatically by the browser for same-origin
        // or properly configured CORS requests if 'credentials: include' is set on fetch.
    };
};

export async function fetchUserChats(): Promise<ChatSummary[]> {
    const response = await fetch(`${apiHost}/chat/list`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include', // Important for sending session cookies
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized: Please log in.');
        throw new Error(`Failed to fetch chats: ${response.statusText}`);
    }
    return response.json();
}

export async function fetchChatMessages(chatId: string): Promise<Message[]> {
    const response = await fetch(`${apiHost}/chat/${chatId}/messages`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        if (response.status === 403) throw new Error('Forbidden');
        if (response.status === 404) throw new Error('Chat not found');
        throw new Error(`Failed to fetch messages for chat ${chatId}: ${response.statusText}`);
    }
    return response.json();
}

export async function createNewChatApi(title?: string): Promise<ChatSummary> { // Backend returns full chat, let's assume summary for now
    const response = await fetch(`${apiHost}/chat/new`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ title: title || "New Chat" }),
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        throw new Error(`Failed to create new chat: ${response.statusText}`);
    }
    return response.json();
}

export interface SendMessagePayload {
    chatId?: string;
    message: string;
    extractedOcrText?: string; // Should be string | undefined
    fileName?: string;         // Should be string | undefined
    originalUserFileName?: string; // Should be string | undefined
}

export interface SendMessageResponse {
    chatId: string;
    chatTitle?: string; // Backend returns this, make it optional
    userMessage: BackendMessage; // Backend returns the saved user message
    botResponse: {
        id: string;
        content: string;
    };
    isNewChat: boolean;
}

export async function sendMessageApi(payload: SendMessagePayload): Promise<SendMessageResponse> {
    const response = await fetch(`${apiHost}/chat/message`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to send message' }));
        throw new Error(errorData.message || `Failed to send message: ${response.statusText}`);
    }
    return response.json();
}

export async function fetchCompiledDocument(chatId: string): Promise<CompiledDocumentDto> {
    const response = await fetch(`${apiHost}/chat/compiled-document/${chatId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized to fetch compiled document.');
        if (response.status === 403) throw new Error('Forbidden: You do not have access to this document.');
        if (response.status === 404) throw new Error('Compiled document not found.');
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch compiled document' }));
        throw new Error(errorData.message || `Failed to fetch compiled document: ${response.statusText}`);
    }
    return response.json();
}


export async function downloadCompiledDocument(chatId: string): Promise<void> {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || defaultApiHost;
    const downloadUrl = `${apiHost}/chat/${chatId}/download-compiled`;

    try {
        const response = await fetch(downloadUrl, {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) {
            let errorData;
            try {
                // Try to parse error from backend if it's JSON
                errorData = await response.json();
            } catch (e) {
                // Fallback if error response is not JSON
                errorData = { message: response.statusText || 'Download request failed' };
            }
            throw new Error(errorData.message || `Failed to download document (status: ${response.status})`);
        }

        const blob = await response.blob(); // Get the response body as a Blob

        // Try to get filename from Content-Disposition header
        const contentDisposition = response.headers.get('content-disposition');
        let fileName = `compiled_document_${chatId}.pdf`; // Default filename

        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
            // Check if fileNameMatch is not null and the captured group (fileNameMatch[1]) is a string
            if (fileNameMatch && typeof fileNameMatch[1] === 'string') {
                fileName = fileNameMatch[1];
            }
        }

        // Create a link element, click it to trigger download, then remove it
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName; // Use the extracted or default filename
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url); // Clean up the object URL

    } catch (error) {
        console.error('Error downloading compiled document:', error);
        // Re-throw the error so it can be caught by the calling component (e.g., DocumentPreviewCard)
        // to display an error message to the user.
        throw error;
    }
}