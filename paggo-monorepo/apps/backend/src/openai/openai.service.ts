import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

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
        userMessage: string,
        extractedOcrText?: string,
        fileName?: string,
    ): Promise<string> {
        let systemPrompt =
            "You are a helpful assistant for the Paggo OCR Chat application. You help users by responding to their text queries.";

        if (extractedOcrText !== undefined) {
            systemPrompt += ` The user has uploaded a file named '${fileName || 'unknown file'}'. Its extracted text content is provided. Please use this content to answer the user's question. The extracted text should not be quoted back unless relevant to the answer.`;
        }

        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
        ];

        let userContentForAI = userMessage;

        if (extractedOcrText !== undefined) {
            userContentForAI = `User's question: "${userMessage}"\n\nExtracted text from file '${fileName || 'uploaded file'}':\n"""\n${extractedOcrText}\n"""`;
        }

        messages.push({ role: 'user', content: userContentForAI });

        try {
            this.logger.log(`Sending request to OpenAI. User message: "${userMessage}". File: "${fileName}". Has extracted text: ${!!extractedOcrText}`);
            if (extractedOcrText) {
                this.logger.debug(`OpenAI request with extracted text (snippet): ${extractedOcrText.substring(0, 100)}...`);
            }
            const chatCompletion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo', // Or your preferred model
                messages: messages,
            });

            const botResponse = chatCompletion.choices[0]?.message?.content;
            if (!botResponse) {
                this.logger.error('OpenAI response content is empty.');
                return 'Sorry, I could not generate a response.';
            }
            this.logger.log(`Received response from OpenAI.`); // Avoid logging full response if sensitive
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