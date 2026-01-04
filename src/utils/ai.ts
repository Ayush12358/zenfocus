export interface AIResponse {
    recommendedMode: 'focus' | 'short' | 'long';
    duration: number; // in minutes
    motivation: string;
}

const MOTIVATIONS = [
    "Small steps lead to big destinations.",
    "Flow is just one breath away.",
    "You are capable of deep focus.",
    "Respect the process.",
    "Clarity comes from action.",
    "One thing at a time.",
    "Be here, now."
];

const COMPLETION_MESSAGES = [
    "Session complete. Well done!",
    "Great focus. Take a breath.",
    "You honored your time. Good job.",
    "Progress made. Keep flowing.",
    "Rest is productive too."
];

/**
 * Simulates an AI analysis of the user's intent.
 * In a real integration, this would call Google Gemini API.
 */
export async function analyzeIntent(intent: string): Promise<AIResponse> {
    // Simulate network delay for realism
    await new Promise(resolve => setTimeout(resolve, 800));

    const lowerIntent = intent.toLowerCase();

    // 1. Detect Mode & Duration based on keywords
    let mode: 'focus' | 'short' | 'long' = 'focus';
    let duration = 25; // Default Pomodoro

    if (lowerIntent.includes('break') || lowerIntent.includes('rest') || lowerIntent.includes('coffee')) {
        if (lowerIntent.includes('long') || lowerIntent.includes('lunch') || lowerIntent.includes('nap')) {
            mode = 'long';
            duration = 15;
        } else {
            mode = 'short';
            duration = 5;
        }
    } else if (lowerIntent.includes('deep') || lowerIntent.includes('study') || lowerIntent.includes('report') || lowerIntent.includes('writing')) {
        mode = 'focus';
        duration = 50; // Deep work default
    } else if (lowerIntent.includes('check') || lowerIntent.includes('email') || lowerIntent.includes('admin')) {
        mode = 'focus';
        duration = 15; // Quick admin task
    }

    // 2. Select contextual motivation
    const randomMotivation = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];

    return {
        recommendedMode: mode,
        duration: duration,
        motivation: `Suggestion: ${duration}min ${mode === 'focus' ? 'Focus' : 'Break'} for "${intent}". ${randomMotivation}`
    };
}

export function getCompletionMessage(wasFocus: boolean): string {
    return COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
}
