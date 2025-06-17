import { withRelatedProject } from '@vercel/related-projects';
import { ChatSummary, Message as BackendMessage, CompiledDocumentDto, Message } from '../types/chat';
import { getSession } from 'next-auth/react';

const backendProjectName = 'help-nestjs-vercel';
const backendUrlFromEnv = process.env.NEXT_PUBLIC_BACKEND_URL;

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

export const getAuthHeadersWithToken = async () => {
    const session = await getSession();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
    }
    return headers;
};


// --- New Chat API Functions ---

// Helper to get headers with credentials (cookies for session auth)
export const getAuthHeaders = () => {
    return {
        'Content-Type': 'application/json',
    };
};

export async function fetchUserChats(): Promise<ChatSummary[]> {
    const response = await fetch(`${apiHost}/chat/list`, {
        method: 'GET',
        headers: await getAuthHeadersWithToken(),
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized: Please log in.');
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch chats: ${response.statusText}`);
    }
    return response.json();
}


export async function fetchChatMessages(chatId: string): Promise<Message[]> {
    const response = await fetch(`${apiHost}/chat/${chatId}/messages`, {
        method: 'GET',
        headers: await getAuthHeadersWithToken(),
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        if (response.status === 403) throw new Error('Forbidden');
        if (response.status === 404) throw new Error('Chat not found');
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch messages for chat ${chatId}: ${response.statusText}`);
    }
    return response.json();
}

export async function createNewChatApi(title?: string): Promise<ChatSummary> {
    const response = await fetch(`${apiHost}/chat/new`, {
        method: 'POST',
        headers: await getAuthHeadersWithToken(),
        body: JSON.stringify({ title: title || "New Chat" }),
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create new chat: ${response.statusText}`);
    }
    return response.json();
}

export interface SendMessagePayload {
    chatId?: string;
    message: string;
    extractedOcrText?: string;
    fileName?: string;
    originalUserFileName?: string;
}

export interface SendMessageResponse {
    chatId: string;
    chatTitle?: string;
    userMessage: BackendMessage;
    botResponse: {
        id: string;
        content: string;
    };
    isNewChat: boolean;
}

export async function sendMessageApi(payload: SendMessagePayload): Promise<SendMessageResponse> {
    const response = await fetch(`${apiHost}/chat/message`, {
        method: 'POST',
        headers: await getAuthHeadersWithToken(),
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
        headers: await getAuthHeadersWithToken(),
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
    const downloadUrl = `${apiHost}/chat/${chatId}/download-compiled`;
    try {
        const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: await getAuthHeadersWithToken(), // Add token for download endpoint
        });
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: response.statusText || 'Download request failed' };
            }
            throw new Error(errorData.message || `Failed to download document (status: ${response.status})`);
        }
        const blob = await response.blob();
        const contentDisposition = response.headers.get('content-disposition');
        let fileName = `compiled_document_${chatId}.pdf`;
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
            if (fileNameMatch && typeof fileNameMatch[1] === 'string') {
                fileName = fileNameMatch[1];
            }
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading compiled document:', error);
        throw error;
    }
}