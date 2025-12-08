/*
 * 🧠 SERVICE: SYD COMMUNICATION PROTOCOL
 * 
 * Centralized communication rules for all Syd micro-agents.
 * Ensures agents listen effectively and respond to user corrections.
 */

/**
 * Core communication protocol prepended to ALL agent system prompts.
 * These rules ensure Syd listens first, executes user vision, and
 * asks clarifying questions when confused instead of guessing.
 */
export const COMMUNICATION_PROTOCOL = `
COMMUNICATION PROTOCOL:
- When user corrects you, ask clarifying questions BEFORE trying again
- Never apologize more than once in a row
- If you've already apologized, ask: "What specific part am I misunderstanding?"
- Execute user's vision, don't pitch alternatives unless asked
- Pay attention to user frustration ("bro", "listen", "No") = you're not listening
- Preserve user's original text structure unless explicitly told to change it

CREATIVE PARTNERSHIP RULES:
- User knows their vision - your job is to ENHANCE not REINVENT
- When asked to "optimize wording," keep 90% of original structure
- When asked to "check facts," focus on accuracy not style changes
- Always confirm understanding before generating new versions

`;

/**
 * Result of analyzing recent conversation for frustration patterns.
 */
export interface FrustrationAnalysis {
    /** Number of apologies detected in recent assistant messages */
    recentApologyCount: number;
    /** Whether user frustration keywords were detected */
    userFrustrationDetected: boolean;
    /** Specific frustration keywords found */
    frustrationKeywords: string[];
    /** Whether we should inject the frustration alert */
    shouldInjectAlert: boolean;
}

/**
 * Simple message type for analysis (matches ChatMessage format).
 */
export interface AnalyzableMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/**
 * Frustration keywords that indicate the user feels unheard.
 */
const FRUSTRATION_KEYWORDS = [
    'no',
    'listen',
    'bro',
    'i said',
    'not what i asked',
    'that\'s not',
    'thats not',
    'wrong',
    'again',
    'already told you',
    'i already said',
    'read what i said',
    'pay attention',
    'you\'re not listening',
    'youre not listening'
];

/**
 * Apology patterns that indicate the assistant is over-apologizing.
 */
const APOLOGY_PATTERNS = [
    'i apologize',
    'i\'m sorry',
    'im sorry',
    'my apologies',
    'sorry about that',
    'sorry for',
    'i misunderstood'
];

/**
 * Analyze recent messages for frustration patterns.
 * Looks at the last N messages to detect if user is getting frustrated
 * and if the assistant is over-apologizing.
 * 
 * @param messages - Recent conversation messages
 * @param lookbackCount - Number of recent messages to analyze (default 6)
 * @returns Analysis result with detected patterns
 */
export function detectFrustrationPatterns(
    messages: AnalyzableMessage[],
    lookbackCount: number = 6
): FrustrationAnalysis {
    // Get last N messages
    const recentMessages = messages.slice(-lookbackCount);

    let recentApologyCount = 0;
    let userFrustrationDetected = false;
    const frustrationKeywords: string[] = [];

    for (const msg of recentMessages) {
        const lowerContent = msg.content.toLowerCase();

        if (msg.role === 'assistant') {
            // Count apologies in assistant messages
            for (const pattern of APOLOGY_PATTERNS) {
                if (lowerContent.includes(pattern)) {
                    recentApologyCount++;
                    break; // Count max one apology per message
                }
            }
        } else if (msg.role === 'user') {
            // Detect frustration in user messages
            for (const keyword of FRUSTRATION_KEYWORDS) {
                // Check for word boundaries for short keywords
                if (keyword === 'no') {
                    // "no" needs more careful matching - start of sentence or standalone
                    if (/^no[.,!?\s]|[.\s]no[.,!?\s]|^no$/i.test(lowerContent)) {
                        userFrustrationDetected = true;
                        if (!frustrationKeywords.includes(keyword)) {
                            frustrationKeywords.push(keyword);
                        }
                    }
                } else if (lowerContent.includes(keyword)) {
                    userFrustrationDetected = true;
                    if (!frustrationKeywords.includes(keyword)) {
                        frustrationKeywords.push(keyword);
                    }
                }
            }
        }
    }

    // Determine if we should inject the frustration alert
    // Trigger if: 2+ apologies OR user frustration keywords detected
    const shouldInjectAlert = recentApologyCount >= 2 || userFrustrationDetected;

    return {
        recentApologyCount,
        userFrustrationDetected,
        frustrationKeywords,
        shouldInjectAlert
    };
}

/**
 * Alert message injected when frustration is detected.
 */
const FRUSTRATION_ALERT = `
⚠️ ALERT: User has corrected you multiple times or seems frustrated.
STOP generating new content and instead ask:
"I'm clearly missing something. What specific part should I focus on?"

Do NOT apologize again. Just ask the clarifying question.

`;

/**
 * Build an enhanced system prompt with the communication protocol
 * and optional frustration alert.
 * 
 * @param basePrompt - The original agent system prompt
 * @param analysis - Frustration analysis result (optional)
 * @returns Enhanced system prompt with protocol prepended
 */
export function buildEnhancedSystemPrompt(
    basePrompt: string,
    analysis?: FrustrationAnalysis
): string {
    let enhancedPrompt = COMMUNICATION_PROTOCOL;

    // Add frustration alert if needed
    if (analysis?.shouldInjectAlert) {
        enhancedPrompt += FRUSTRATION_ALERT;
    }

    // Append the original prompt
    enhancedPrompt += basePrompt;

    return enhancedPrompt;
}
