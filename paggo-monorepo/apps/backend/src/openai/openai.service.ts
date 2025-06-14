import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

interface ChatMessageForAI {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

@Injectable()
export class OpenaiService {
    private readonly logger = new Logger(OpenaiService.name);
    private openai: OpenAI;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');
        if (!apiKey) {
            this.logger.error('OPENAI_API_KEY is not configured.');
            throw new Error('OPENAI_API_KEY is not configured.');
        }
        this.openai = new OpenAI({ apiKey });
    }

    async getChatCompletion(
        currentUserMessage: string,
        chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
        extractedOcrText?: string,
        fileName?: string,
    ): Promise<string> { // This method now returns a string or throws an error
        this.logger.log(
            `Attempting to get chat completion. History length: ${chatHistory.length}`,
        );

        const systemMessageContent = `You are a helpful assistant.
        ${fileName ? `The user has uploaded a file named "${fileName}".` : ''}
        ${extractedOcrText ? `The extracted text from the file is: "${extractedOcrText}"` : ''}
        Respond to the user's message based on this context and the chat history.`;

        const messages: ChatMessageForAI[] = [
            { role: 'system', content: systemMessageContent },
            ...chatHistory.map((msg) => ({
                role: msg.role,
                content: msg.content,
            })),
            { role: 'user', content: currentUserMessage },
        ];

        try {
            this.logger.log(`Sending request to OpenAI. History length: ${chatHistory.length}. Current message: "${currentUserMessage.substring(0, 50)}...". File: "${fileName}". Has extracted text: ${!!extractedOcrText}`);

            const chatCompletion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: messages,
            });

            const botResponse = chatCompletion.choices[0]?.message?.content;

            if (!botResponse || botResponse.trim() === '') {
                this.logger.error('OpenAI response content is empty or invalid.');
                throw new Error('OpenAI failed to generate a valid response content.'); // MODIFIED: Throw error
            }
            this.logger.log(`Received response from OpenAI.`);
            return botResponse.trim();
        } catch (error: any) {
            this.logger.error('Error calling OpenAI API:', error.stack || error);
            if (error.response) {
                this.logger.error('OpenAI API Error Response:', error.response.data);
            }
            // MODIFIED: Re-throw a more specific error or the original one
            if (error instanceof Error && error.message === 'OpenAI failed to generate a valid response content.') {
                throw error;
            }
            throw new Error(`Failed to get chat completion from OpenAI: ${error.message || 'Unknown API error'}`);
        }
    }
}