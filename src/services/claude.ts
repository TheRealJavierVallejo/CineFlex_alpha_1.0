/*
 * 🧠 SERVICE: CLAUDE AI (Pro SYD Brain)
 * 
 * This file handles Claude 3.5 Sonnet integration for Pro tier users.
 * Features: streaming responses, prompt caching, full project context awareness.
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from './supabaseClient';

// CRITICAL: Get API key from user's database profile, NOT hardcoded
export async function getUserClaudeApiKey(): Promise<string | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('claude_api_key')
            .eq('id', user.id)
            .single();

        if (error || !data?.claude_api_key) return null;
        return data.claude_api_key;
    } catch (error) {
        console.error('Error fetching Claude API key:', error);
        return null;
    }
}

// --- ERROR TYPES ---
export enum ClaudeErrorType {
    RATE_LIMIT = 'rate_limit',
    INVALID_KEY = 'invalid_key',
    OVERLOADED = 'overloaded',
    TIMEOUT = 'timeout',
    NETWORK = 'network',
    CONTENT_FILTERED = 'content_filtered',
    UNKNOWN = 'unknown'
}

export interface ClaudeError {
    type: ClaudeErrorType;
    message: string;
    userMessage: string;
    retryable: boolean;
    retryAfterSeconds?: number;
}

// --- CLIENT INITIALIZATION ---
// Note: We cannot cache the client globally anymore since it depends on the user session
export async function getClaudeClient(): Promise<Anthropic> {
    const apiKey = await getUserClaudeApiKey();

    if (!apiKey) {
        throw new Error('CLAUDE_API_KEY_MISSING: Please add your Claude API key in Account Settings');
    }

    if (!apiKey.startsWith('sk-ant-')) {
        throw new Error('CLAUDE_API_KEY_INVALID: Invalid Claude API key format');
    }

    return new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true // Required for browser usage
    });
}

// --- ERROR CLASSIFICATION ---
export function classifyClaudeError(error: any): ClaudeError {
    const errorMessage = error?.message || error?.error?.message || String(error);
    const errorType = error?.error?.type || error?.type || '';

    // Rate limit
    if (errorType === 'rate_limit_error' || errorMessage.includes('rate limit')) {
        return {
            type: ClaudeErrorType.RATE_LIMIT,
            message: errorMessage,
            userMessage: 'Rate limit hit. Please wait 60 seconds and try again.',
            retryable: true,
            retryAfterSeconds: 60
        };
    }

    // Invalid API key
    if (errorType === 'authentication_error' ||
        errorMessage.includes('invalid') && errorMessage.includes('key') ||
        errorMessage.includes('401')) {
        return {
            type: ClaudeErrorType.INVALID_KEY,
            message: errorMessage,
            userMessage: 'Claude API key invalid. Check Project Settings → API Key.',
            retryable: false
        };
    }

    // Server overloaded
    if (errorType === 'overloaded_error' || errorMessage.includes('overloaded')) {
        return {
            type: ClaudeErrorType.OVERLOADED,
            message: errorMessage,
            userMessage: 'Claude servers are busy. Retrying in 30 seconds...',
            retryable: true,
            retryAfterSeconds: 30
        };
    }

    // Network errors
    if (errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ETIMEDOUT')) {
        return {
            type: ClaudeErrorType.NETWORK,
            message: errorMessage,
            userMessage: 'Network error. Check your internet connection and try again.',
            retryable: true,
            retryAfterSeconds: 5
        };
    }

    // Timeout
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        return {
            type: ClaudeErrorType.TIMEOUT,
            message: errorMessage,
            userMessage: 'Request timed out. Please try again.',
            retryable: true,
            retryAfterSeconds: 5
        };
    }

    // Content filtering
    if (errorMessage.includes('content') &&
        (errorMessage.includes('policy') || errorMessage.includes('blocked'))) {
        return {
            type: ClaudeErrorType.CONTENT_FILTERED,
            message: errorMessage,
            userMessage: 'Content was filtered by safety settings. Try rephrasing your request.',
            retryable: false
        };
    }

    // Unknown error
    return {
        type: ClaudeErrorType.UNKNOWN,
        message: errorMessage,
        userMessage: 'Something went wrong with Claude. Please try again.',
        retryable: true,
        retryAfterSeconds: 5
    };
}

// --- TOKEN ESTIMATION ---
export function estimateClaudeTokens(text: string): number {
    if (!text) return 0;

    // Claude tokenization: ~4 chars per token, similar to GPT
    const charCount = text.length;
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    // Average word and char estimates
    const wordBasedEstimate = Math.ceil(wordCount / 0.75);
    const charBasedEstimate = Math.ceil(charCount / 4);

    return Math.ceil((wordBasedEstimate + charBasedEstimate) / 2);
}

export function estimateClaudeConversationTokens(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string = '',
    projectContext: string = ''
): number {
    const systemTokens = estimateClaudeTokens(systemPrompt);
    const contextTokens = estimateClaudeTokens(projectContext);
    const messageTokens = messages.reduce(
        (sum, msg) => sum + estimateClaudeTokens(msg.content),
        0
    );

    // Overhead for message formatting (~10 tokens per message)
    const overhead = messages.length * 10;

    return systemTokens + contextTokens + messageTokens + overhead;
}

// --- STREAMING CHAT ---
export async function chatWithClaudeStreaming(
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPrompt: string,
    fullProjectContext: string,
    onChunk: (chunk: string) => void,
    options: {
        temperature?: number;
        maxTokens?: number;
        useCache?: boolean;
    } = {}
): Promise<string> {
    const client = await getClaudeClient();

    const {
        temperature = 0.7,
        maxTokens = 800,
        useCache = true
    } = options;

    try {
        // Build system content with caching
        const systemContent: Anthropic.TextBlockParam[] = [];

        // System prompt (cacheable)
        if (systemPrompt) {
            if (useCache) {
                systemContent.push({
                    type: 'text',
                    text: systemPrompt,
                    cache_control: { type: 'ephemeral' }
                } as Anthropic.TextBlockParam);
            } else {
                systemContent.push({ type: 'text', text: systemPrompt });
            }
        }

        // Project context (cacheable)
        if (fullProjectContext) {
            if (useCache) {
                systemContent.push({
                    type: 'text',
                    text: `\n\n=== FULL PROJECT CONTEXT ===\n${fullProjectContext}`,
                    cache_control: { type: 'ephemeral' }
                } as Anthropic.TextBlockParam);
            } else {
                systemContent.push({
                    type: 'text',
                    text: `\n\n=== FULL PROJECT CONTEXT ===\n${fullProjectContext}`
                });
            }
        }

        // Convert history to Anthropic format
        const messages: Anthropic.MessageParam[] = history.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // Add current user message
        messages.push({
            role: 'user',
            content: message
        });

        // Create streaming message
        const stream = await client.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: maxTokens,
            temperature,
            system: systemContent,
            messages
        });

        let fullResponse = '';

        // Stream text chunks
        for await (const event of stream) {
            if (event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta') {
                const text = event.delta.text;
                fullResponse += text;
                onChunk(text);
            }
        }

        // Ensure we have the complete response
        const finalMessage = await stream.finalMessage();

        // Extract full text from final message
        const finalText = finalMessage.content
            .filter(block => block.type === 'text')
            .map(block => (block as Anthropic.TextBlock).text)
            .join('');

        return finalText || fullResponse || "I couldn't generate a response.";

    } catch (error: any) {
        console.error('Claude streaming error:', error);
        throw error;
    }
}

// --- NON-STREAMING FALLBACK ---
export async function chatWithClaude(
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPrompt: string,
    fullProjectContext: string,
    options: {
        temperature?: number;
        maxTokens?: number;
        useCache?: boolean;
    } = {}
): Promise<string> {
    const client = await getClaudeClient();

    const {
        temperature = 0.7,
        maxTokens = 800,
        useCache = true
    } = options;

    try {
        // Build system content
        let systemText = systemPrompt || '';
        if (fullProjectContext) {
            systemText += `\n\n=== FULL PROJECT CONTEXT ===\n${fullProjectContext}`;
        }

        // Convert history to Anthropic format
        const messages: Anthropic.MessageParam[] = history.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // Add current user message  
        messages.push({
            role: 'user',
            content: message
        });

        const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: maxTokens,
            temperature,
            system: systemText,
            messages
        });

        // Extract text from response
        const text = response.content
            .filter(block => block.type === 'text')
            .map(block => (block as Anthropic.TextBlock).text)
            .join('');

        return text || "I couldn't generate a response.";

    } catch (error: any) {
        console.error('Claude error:', error);
        throw error;
    }
}

// --- UTILITY: Check if Claude is available ---
export async function hasClaudeApiKey(): Promise<boolean> {
    const key = await getUserClaudeApiKey();
    return !!key;
}