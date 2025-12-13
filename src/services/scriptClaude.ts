
import Anthropic from '@anthropic-ai/sdk';
import { listMessagesForThread } from './sydChatStore';
import { getClaudeClient, classifyClaudeError } from './claude';

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
    scriptElements: any[],
    characters: any[],
    storyNotes: any[],
    threadId: string,
    onChunk: (text: string) => void
): Promise<{ messages: any[] }> {
    // 1. Get API key & Verify Environment
    const client = getClaudeClient(); // Throws if missing

    // Log verification as requested
    const apiKey = localStorage.getItem('cineflex_claude_api_key') || import.meta.env.VITE_CLAUDE_API_KEY || 'NOT_SET';
    console.log('[SCRIPT CLAUDE CHECK] Key starts with:', apiKey.substring(0, 10));
    console.log('[SCRIPT CLAUDE CHECK] Is Claude key (sk-ant-):', apiKey.startsWith('sk-ant-'));

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

    // 3. Build System Prompt with Script Context
    const systemPrompt = buildScriptSystemPrompt(scriptElements, characters, storyNotes);

    try {
        console.log('[SCRIPT CLAUDE] Starting stream...');

        // 4. Stream from Claude API
        const stream = await client.messages.stream({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4000, // Large buffer for script writing
            temperature: 0.7,
            system: systemPrompt,
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
        // The calling code doesn't seem to rely on the return value for the full list anymore based on the replacement snippet.
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
function buildScriptSystemPrompt(scriptElements: any[], characters: any[], storyNotes: any[]): string {
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

    // Format Characters
    const charText = characters
        .map(c => `- ${c.name}: ${c.role} (${c.description || 'No description'})`)
        .join('\n');

    // Format Notes
    const notesText = storyNotes
        .map(n => `- ${n.title}: ${n.content}`)
        .join('\n');

    // Identity Rule (Matches sydContext.ts critical rule)
    const SYD_IDENTITY = `You are Syd, CineFlex's AI screenwriting assistant.

CRITICAL IDENTITY RULES:
- If asked "who are you" or "what are you", respond: "I'm Syd, your CineFlex writing assistant"
- NEVER claim to be Google, Gemini, Bard, ChatGPT, or any other AI
- Stay focused on helping with screenplay development
`;

    return `${SYD_IDENTITY}

CONTEXT:
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
