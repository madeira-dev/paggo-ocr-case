import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { MessageSender } from '../../generated/prisma'; // For mapping roles

interface ChatMessageForAI {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

@Injectable()
export class OpenaiService {
    private openai: OpenAI;
    private readonly logger = new Logger(OpenaiService.name);

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');
        if (!apiKey) {
            throw new Error('OpenAI API key is not configured.');
        }
        this.openai = new OpenAI({ apiKey });
    }

    async getChatCompletion(
        currentUserMessage: string,
        chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>, // Renamed from previousMessages
        extractedOcrText?: string,
        fileName?: string,
    ): Promise<string> {
        let systemPromptContent =
            "You are a helpful assistant for the Paggo OCR Chat application. You help users by responding to their text queries.";

        if (extractedOcrText !== undefined && extractedOcrText !== null) {
            // This system message modification might be better handled by appending to the user message
            // or ensuring it's part of the context for the *current* turn.
            // For now, let's assume the extracted text is part of the currentUserMessage context.
        }

        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPromptContent },
        ];

        // Add historical messages
        chatHistory.forEach(msg => {
            messages.push({ role: msg.role, content: msg.content });
        });

        // Construct the current user message, potentially including OCR info
        let userContentForThisTurn = currentUserMessage;
        if (extractedOcrText !== undefined && extractedOcrText !== null) {
            userContentForThisTurn = `User's question: "${currentUserMessage}"\n\nExtracted text from file '${fileName || 'uploaded file'}':\n"""\n${extractedOcrText}\n"""`;
        }
        messages.push({ role: 'user', content: userContentForThisTurn });

        try {
            this.logger.log(`Sending request to OpenAI. History length: ${chatHistory.length}. Current message: "${currentUserMessage.substring(0, 50)}...". File: "${fileName}". Has extracted text: ${!!extractedOcrText}`);

            const chatCompletion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: messages,
            });

            const botResponse = chatCompletion.choices[0]?.message?.content;
            if (!botResponse) {
                this.logger.error('OpenAI response content is empty.');
                return 'Sorry, I could not generate a response.';
            }
            this.logger.log(`Received response from OpenAI.`);
            return botResponse.trim();
        } catch (error: any) {
            this.logger.error('Error calling OpenAI API:', error.stack || error);
            if (error.response) {
                this.logger.error('OpenAI API Error Response:', error.response.data);
            }
            return 'Sorry, I encountered an error trying to reach my brain. Please try again.';
        }
    }
}