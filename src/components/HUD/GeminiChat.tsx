'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, X, ChevronUp, ChevronDown, User, Bot, Maximize2, Minimize2, Plus, Trash2 } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { GoogleTasksService } from '@/services/GoogleTasksService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    role: 'user' | 'model';
    text: string;
}

const SYSTEM_PROMPT = `
You are the ZenFocus Colleague. You are a helpful, professional productivity partner.
Your goal is to help the user stay focused, manage their time, and control the dashboard.
You have access to the following tools (outputs).
To use a tool, output ONLY a JSON object in this format: {"tool": "tool_name", "params": {...}}

TOOLS:
1. timer_set(mode: 'focus'|'short'|'long', duration: number_minutes, intent: string)
   - Function: Sets and starts the timer.
   - Example: {"tool": "timer_set", "params": {"mode": "focus", "duration": 45, "intent": "Deep Work"}}

2. timer_control(action: 'pause'|'resume'|'stop')
   - Function: Controls the running timer.

3. theme_set(transparency: number_0_100, blur: number_0_40, orientation: 'auto'|'horizontal'|'vertical')
   - Function: Adjusts UI visuals.

4. video_set(url: string)
   - Function: Changes the background video (YouTube URL or ID).

5. ui_toggle(hidden: boolean)
   - Function: Hides or shows the entire UI.

6. task_add(text: string)
   - Function: Adds a new task to the CURRENTLY SELECTED list (Local or Google Tasks).

7. task_list()
   - Function: Returns tasks from the CURRENTLY SELECTED list.

8. task_complete(text_fragment: string)
   - Function: Marks a task as completed in the CURRENTLY SELECTED list.

9. note_read()
   - Function: Returns the current notes content.

10. note_write(text: string, mode: 'overwrite'|'append')
    - Function: Updates the notes pad.

If the user asks a question, answer in a friendly, concise, and helpful manner (like a supportive co-worker).
If they give a command, output the JSON to execute it.
`;

interface GeminiChatProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GeminiChat({ isOpen, onClose }: GeminiChatProps) {
    const [apiKey, setApiKey] = useLocalStorage('zen_gemini_api_key', '');
    const [modelName, setModelName] = useLocalStorage('zen_gemini_model', 'gemini-flash-lite-latest');
    const [messages, setMessages] = useLocalStorage<Message[]>('zen_chat_history', [
        { role: 'model', text: 'Hi there! I\'m your ZenFocus partner. Ready to get some work done?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // App State Hooks (for tool execution)
    const [timerState, setTimerState] = useLocalStorage('zen_timer_state_v3', { isRunning: false, remaining: 25 * 60 * 1000, mode: 'focus' });
    const [, setTimerStats] = useLocalStorage('zen_timer_stats', {});
    const [, setTransparency] = useLocalStorage('zen_ui_transparency', 40);
    const [, setBlur] = useLocalStorage('zen_ui_blur', 16);
    const [, setOrientation] = useLocalStorage('zen_ui_orientation', 'auto');
    const [, setVideoId] = useLocalStorage('zen_video_id', '');
    const [, setUiHidden] = useLocalStorage('zen_ui_hidden', false);

    const [selectedListId] = useLocalStorage('zen_selected_list_id', '@default');
    const [timerStats] = useLocalStorage('zen_timer_stats', { intent: '' });
    const [aiContext] = useLocalStorage('zen_ai_context', '');

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const executeTool = (toolCall: any) => {
        console.log("Executing Tool:", toolCall);
        try {
            switch (toolCall.tool) {
                // ... (timer cases unchanged)
                case 'timer_set':
                    setTimerState((prev: any) => ({
                        ...prev,
                        mode: toolCall.params.mode,
                        remaining: toolCall.params.duration * 60 * 1000,
                        isRunning: true,
                        endTime: Date.now() + (toolCall.params.duration * 60 * 1000)
                    }));
                    setTimerStats((prev: any) => ({
                        ...prev,
                        intent: toolCall.params.intent
                    }));
                    return `Timer set to ${toolCall.params.duration}m (${toolCall.params.mode}).`;

                case 'timer_control':
                    setTimerState((prev: any) => {
                        if (toolCall.params.action === 'stop') {
                            return { ...prev, isRunning: false, endTime: null, remaining: prev.remaining }; // Reset or pause logic could vary
                        } else if (toolCall.params.action === 'pause') {
                            return { ...prev, isRunning: false, endTime: null, remaining: prev.endTime ? prev.endTime - Date.now() : prev.remaining };
                        } else if (toolCall.params.action === 'resume') {
                            return { ...prev, isRunning: true, endTime: Date.now() + prev.remaining };
                        }
                        return prev;
                    });
                    return `Timer ${toolCall.params.action}ed.`;

                // 6. Task Add
                case 'task_add':
                    const addText = toolCall.params.text;
                    if (GoogleTasksService.isSignedIn()) {
                        GoogleTasksService.insertTask(addText, selectedListId).then(() => {
                            window.dispatchEvent(new Event('storage'));
                        });
                        return `Added to Google Tasks: "${addText}"`;
                    } else {
                        const tasks = JSON.parse(window.localStorage.getItem('zen_tasks') || '[]');
                        const newTask = { id: Date.now().toString(), text: addText, completed: false };
                        window.localStorage.setItem('zen_tasks', JSON.stringify([...tasks, newTask]));
                        window.localStorage.setItem('zen_show_tasks', 'true');
                        window.dispatchEvent(new Event('storage'));
                        return `Added task: "${addText}"`;
                    }

                // 7. Task List
                case 'task_list':
                    if (GoogleTasksService.isSignedIn()) {
                        return "Please check your Google Tasks widget for the full list.";
                    } else {
                        const tasks = JSON.parse(window.localStorage.getItem('zen_tasks') || '[]');
                        const taskList = tasks.map((t: any) => `- [${t.completed ? 'x' : ' '}] ${t.text}`).join('\n');
                        return `Here are your tasks:\n${taskList || "No local tasks found."}`;
                    }

                // 8. Task Complete
                case 'task_complete':
                    const fragment = toolCall.params.text_fragment.toLowerCase();
                    if (GoogleTasksService.isSignedIn()) {
                        return "Please mark the task as complete in the Google Tasks widget.";
                    } else {
                        const tasks = JSON.parse(window.localStorage.getItem('zen_tasks') || '[]');
                        let found = false;
                        const newTasks = tasks.map((t: any) => {
                            if (t.text.toLowerCase().includes(fragment)) {
                                found = true;
                                return { ...t, completed: true };
                            }
                            return t;
                        });

                        if (found) {
                            window.localStorage.setItem('zen_tasks', JSON.stringify(newTasks));
                            window.dispatchEvent(new Event('storage'));
                            return `Marked task matching "${fragment}" as done.`;
                        } else {
                            return `Could not find task matching "${fragment}".`;
                        }
                    }

                // 9. Note Read
                case 'note_read':
                    const note = JSON.parse(window.localStorage.getItem('zen_notes') || '""');
                    return `Current Notes:\n${note || "Empty."}`;

                // 10. Note Write
                case 'note_write':
                    const noteText = toolCall.params.text;
                    const mode = toolCall.params.mode || 'append';
                    let current = JSON.parse(window.localStorage.getItem('zen_notes') || '""');

                    if (mode === 'overwrite') {
                        current = noteText;
                    } else {
                        current = current ? current + '\n' + noteText : noteText;
                    }

                    window.localStorage.setItem('zen_notes', JSON.stringify(current));
                    window.localStorage.setItem('zen_show_notes', 'true');
                    window.dispatchEvent(new Event('storage'));
                    return `Updated notes.`;

                default:
                    return "Unknown command.";
            }
        } catch (e) {
            console.error(e);
            return "Command execution failed.";
        }
    };

    const sendMessage = async () => {
        if (!input.trim()) return;
        if (!apiKey) {
            setMessages(prev => [...prev, { role: 'model', text: 'Please enter your Google Gemini API Key in the settings (top right key icon) to proceed.' }]);
            return;
        }

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

            // Append current message
            // Note: In a real app, use a proper SDK or proxy. Direct fetch for demo.
            // Append current message
            // Note: In a real app, use a proper SDK or proxy. Direct fetch for demo.
            // Using 'gemini-2.0-flash-exp' as it is the latest, most robust model available in the free tier.
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{
                                text: SYSTEM_PROMPT +
                                    (aiContext ? `\n\nUSER BACKGROUND: ${aiContext}` : "") +
                                    (timerStats.intent ? `\n\nCURRENT INTENT: The user is currently focusing on "${timerStats.intent}".` : "") +
                                    `\n\nCURRENT TIME: ${new Date().toLocaleString()}` +
                                    `\n\nTIMER STATUS: The timer is ${timerState.isRunning ? 'RUNNING' : 'PAUSED'}. Mode: ${timerState.mode}. Time remaining: ${Math.floor(timerState.remaining / 60000)} minutes.`
                            }]
                        },
                        ...history,
                        { role: 'user', parts: [{ text: userMsg }] }
                    ]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.error?.message || data.error?.status || "Unknown API Error";
                setMessages(prev => [...prev, { role: 'model', text: `⚠️ API ERROR: ${errorMsg}. Please check your API Key.` }]);
                return;
            }

            const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "System error. No valid response candidates. Raw: " + JSON.stringify(data).substring(0, 50);

            // Check for Tool Call (JSON)
            let finalReply = replyText;
            try {
                // Try to find JSON block
                const jsonMatch = replyText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const jsonStr = jsonMatch[0];
                    const toolCall = JSON.parse(jsonStr);
                    if (toolCall.tool) {
                        const executionResult = executeTool(toolCall);
                        // Optional: Feed result back to AI? For now, just show result.
                        finalReply = `[EXECUTING PROTOCOL] ${executionResult}`;
                    }
                }
            } catch (e) {
                // Not JSON, just normal text
            }

            setMessages(prev => [...prev, { role: 'model', text: finalReply }]);

        } catch (error: any) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: `Connection Error: ${error.message || "Failed to reach servers."}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-2xl flex items-center justify-center animate-fade-in"
            onClick={onClose}
        >
            <div
                className="w-[600px] max-w-[90vw] h-[600px] bg-black/40 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 shadow-inner">
                            <Bot size={24} />
                        </div>
                        <div>
                            <div className="text-lg font-bold text-white tracking-tight">Focus Partner</div>
                            <div className="text-[10px] text-green-400 font-mono tracking-wider flex items-center gap-1.5 uppercase font-semibold">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" /> Ready to Help
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (confirm("Clear chat history?")) {
                                    setMessages([{ role: 'model', text: 'Hi there! I\'m your ZenFocus partner. Ready to get some work done?' }]);
                                }
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
                            title="Clear Chat"
                        >
                            <Trash2 size={20} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 hover:text-white text-white/40 rounded-lg transition-colors"
                        >
                            <Plus size={24} className="rotate-45" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth" ref={scrollRef}>
                    {messages.map((m, i) => (
                        <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-lg ${m.role === 'user' ? 'bg-white text-black' : 'bg-indigo-600 text-white'}`}>
                                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed max-w-[85%] shadow-md ${m.role === 'user'
                                ? 'bg-white text-black rounded-tr-none'
                                : 'bg-white/10 text-white/90 rounded-tl-none border border-white/5'
                                }`}>
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            ul: ({ node, ...props }: any) => <ul className="list-disc ml-4 mt-1 mb-1" {...props} />,
                                            ol: ({ node, ...props }: any) => <ol className="list-decimal ml-4 mt-1 mb-1" {...props} />,
                                            li: ({ node, ...props }: any) => <li className="mb-0.5" {...props} />,
                                            p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
                                            code: ({ node, ...props }: any) => <code className="bg-white/10 px-1 rounded text-indigo-300 font-mono text-[12px]" {...props} />,
                                            strong: ({ node, ...props }: any) => <strong className="font-bold text-white" {...props} />,
                                            em: ({ node, ...props }: any) => <em className="italic opacity-90" {...props} />,
                                        }}
                                    >
                                        {m.text}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg glow-indigo">
                                <Bot size={16} />
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none flex gap-1 items-center border border-white/5">
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-6 border-t border-white/10 bg-black/20 backdrop-blur-md">
                    <form
                        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                        className="flex gap-3"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a command or ask a question..."
                            className="flex-1 bg-white/5 rounded-xl px-5 py-4 text-sm text-white placeholder-white/30 outline-none border border-white/5 focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="p-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function MinusIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    )
}

