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
            this.logger.error('OPENAI_API_KEY is not configured.');
            throw new Error('OPENAI_API_KEY is not configured.');
        }
        this.openai = new OpenAI({ apiKey });
    }

    async getChatCompletion(
        userMessage: string,
        imageUrl?: string,
    ): Promise<string> {
        let systemPrompt =
            "You are a helpful assistant for the Paggo OCR Chat application. You help users by responding to their text queries. If they mention an image or provide an image URL, acknowledge it and respond to their message in context of the image if possible. If an image is uploaded, the user's message might contain 'Image: filename.ext' or similar, treat this as context that an image was part of their message.";

        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
        ];

        let content = userMessage;
        if (imageUrl) {
            content = `User uploaded an image (URL: ${imageUrl}). User's message: "${userMessage}"`;
        }
        messages.push({ role: 'user', content });

        try {
            this.logger.log(`Sending request to OpenAI with message: "${content}"`);
            const chatCompletion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: messages,
            });

            const botResponse = chatCompletion.choices[0]?.message?.content;
            if (!botResponse) {
                this.logger.error('OpenAI response content is empty.');
                return 'Sorry, I could not generate a response.';
            }
            this.logger.log(`Received response from OpenAI: "${botResponse}"`);
            return botResponse.trim();
        } catch (error) {
            this.logger.error('Error calling OpenAI API:', error.stack || error);
            if (error.response) {
                this.logger.error('OpenAI API Error Response:', error.response.data);
            }
            return 'Sorry, I encountered an error trying to reach my brain. Please try again.';
        }
    }
}