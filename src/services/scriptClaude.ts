import Anthropic from '@anthropic-ai/sdk';
import { listMessagesForThread } from './sydChatStore';
import { getClaudeClient, classifyClaudeError, getUserClaudeApiKey } from './claude';
import { ScriptElement, Character, StoryNote } from '../types';

/**
 * 🧠 SERVICE: SCRIPT CLAUDE (Pro Tier Script Chat)
 * 
 * Handles script-focused chat using Claude 3.5 Sonnet for Pro users.
 * Matches the streaming implementation of SydPopoutPanel.tsx but adapted
 * for the specialized Script Chat context.
 */

export async function chatWithScriptClaude(
    projectId: string,
    userMessage: string,
    scriptElements: ScriptElement[],
    characters: Character[],
    storyNotes: StoryNote[],
    threadId: string,
    onChunk: (text: string) => void
): Promise<{ messages: any[] }> {
    // 1. Get API key & Verify Environment
    const apiKey = await getUserClaudeApiKey();

    if (!apiKey) {
        throw new Error('CLAUDE_API_KEY_MISSING: Please add your Claude API key in Account Settings');
    }

    if (!apiKey.startsWith('sk-ant-')) {
        throw new Error('CLAUDE_API_KEY_INVALID: Invalid Claude API key format');
    }

    const client = await getClaudeClient();

    // 2. Fetch existing messages from thread for context
    const dbMessages = await listMessagesForThread(threadId);

    // Convert to Anthropic format
    // Filter out system messages if any, map roles
    const history: Anthropic.MessageParam[] = dbMessages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: typeof m.content === 'string' ? m.content : m.content.text
        }));

    // Add current user message
    history.push({ role: 'user', content: userMessage });

    // 3. Build System Prompt with Script Context (Optimized for Anthropic Prompt Caching)
    const scriptContext = buildScriptSystemPrompt(scriptElements, characters, storyNotes);
    const SYD_IDENTITY = "You are Syd, CineFlex's AI screenwriting assistant.\n\nCRITICAL IDENTITY RULES:\n- If asked \"who are you\" or \"what are you\", respond: \"I'm Syd, your CineFlex writing assistant\"\n- NEVER claim to be Google, Gemini, Bard, ChatGPT, or any other AI\n- Stay focused on helping with screenplay development";

    try {
        console.log('[SCRIPT CLAUDE] Starting stream...');

        // 4. Stream from Claude API
        const stream = await client.messages.stream({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 4000, // Haiku is already cheap; don't sacrifice UX
            temperature: 0.7,
            system: [
                {
                    type: "text",
                    text: SYD_IDENTITY
                },
                {
                    type: "text",
                    text: scriptContext,
                    cache_control: { type: "ephemeral" }
                } as Anthropic.TextBlockParam
            ],
            messages: history
        });

        let fullResponse = '';

        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                const text = event.delta.text;
                fullResponse += text;
                onChunk(text);
            }
        }

        // Wait for final message to ensure completeness
        await stream.finalMessage();

        // 5. Return updated messages (Mocking the expected return format for compatibility if needed)
        // Since persistence is handled by the caller (ScriptChat.tsx), we just return empty or current state.
        return { messages: [] };

    } catch (error: any) {
        console.error('[SCRIPT CLAUDE] Error:', error);
        // Throw classified error so UI can handle it
        throw classifyClaudeError(error);
    }
}

/**
 * Clean helper to build the script-focused system prompt
 */
function buildScriptSystemPrompt(scriptElements: ScriptElement[], characters: Character[], storyNotes: StoryNote[]): string {
    // Format Script
    // Take simpler approach: join text of elements
    const scriptText = scriptElements
        .map(el => {
            const type = el.type.toUpperCase();
            const text = el.content || '';
            if (type === 'SCENE_HEADING') return `\nEXT/INT. ${text}`;
            if (type === 'CHARACTER') return `\n${text.toUpperCase()}`;
            if (type === 'DIALOGUE') return `${text}`;
            if (type === 'PARENTHETICAL') return `(${text})`;
            return text;
        })
        .join('\n');

    const charText = characters
        .map(c => `- ${c.name}: ${c.description || 'No description'}`)
        .join('\n');

    // Format Notes
    const notesText = storyNotes
        .map(n => `- ${n.title}: ${n.content}`)
        .join('\n');

    return `CONTEXT:
You are helping the user write a screenplay. You have access to their script, characters, and notes.

# CHARACTERS
${charText ? charText : 'No characters defined.'}

# STORY NOTES
${notesText ? notesText : 'No notes defined.'}

# CURRENT SCRIPT CONTENT
${scriptText ? scriptText : '(Script is empty)'}

TASK:
Assist the user with writing, editing, or brainstorming for this script. Be helpful, professional, and creative.
`;
}