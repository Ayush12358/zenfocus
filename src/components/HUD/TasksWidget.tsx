'use client';

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ChevronDown, CheckSquare, Plus, Trash2, X, Cloud, CloudOff, LogIn, Loader2 } from 'lucide-react';
import { GoogleTasksService } from '@/services/GoogleTasksService';

interface Task {
    id: string;
    text: string;
    completed: boolean;
}

interface TaskList {
    id: string;
    title: string;
}

export default function TasksWidget() {
    const [localTasks, setLocalTasks] = useLocalStorage<Task[]>('zen_tasks', []);
    const [googleClientId] = useLocalStorage('zen_google_client_id', '');
    const [useGoogle, setUseGoogle] = useLocalStorage('zen_use_google_tasks', false);
    const [selectedListId, setSelectedListId] = useLocalStorage('zen_selected_list_id', '@default');

    const [googleTasks, setGoogleTasks] = useState<Task[]>([]);
    const [taskLists, setTaskLists] = useState<TaskList[]>([]);
    const [, setIntentOptions] = useLocalStorage<string[]>('zen_current_intent_options', []);

    const [isLoading, setIsLoading] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [newTask, setNewTask] = useState('');

    // Sync current visible tasks to shared intent options
    useEffect(() => {
        const visibleTasks = (useGoogle && isSignedIn) ? googleTasks : localTasks;
        setIntentOptions(visibleTasks.map(t => t.text));
    }, [googleTasks, localTasks, useGoogle, isSignedIn, setIntentOptions]);

    useEffect(() => {
        if (useGoogle && googleClientId) {
            initService();
        }
    }, [useGoogle, googleClientId]);

    const initService = async () => {
        try {
            await GoogleTasksService.initClient(googleClientId);
            if (GoogleTasksService.isSignedIn()) {
                setIsSignedIn(true);
                loadTaskListsAndTasks();
            }
        } catch (e) {
            console.error("Init failed", e);
        }
    };

    const loadTaskListsAndTasks = async () => {
        setIsLoading(true);
        try {
            const lists = await GoogleTasksService.getTaskLists();
            setTaskLists(lists);

            let listToUse = selectedListId;
            // Validate selected list exists
            if (!lists.find((l: any) => l.id === listToUse)) {
                listToUse = lists[0]?.id || '@default';
                setSelectedListId(listToUse);
            }

            const items = await GoogleTasksService.listTasks(listToUse);
            const formatted = items.map((t: any) => ({
                id: t.id,
                text: t.title,
                completed: t.status === 'completed'
            }));
            setGoogleTasks(formatted);
        } catch (e) {
            console.error("Failed to load tasks", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignIn = async () => {
        try {
            await GoogleTasksService.signIn();
            setIsSignedIn(true);
            loadTaskListsAndTasks();
        } catch (e: any) {
            console.error("Sign in failed", e);
            const msg = e?.error || e?.message || JSON.stringify(e);
            alert(`Sign in failed: ${msg}. Check console for more details.`);
        }
    };

    const handleListChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newListId = e.target.value;
        setSelectedListId(newListId);
        // Immediate reload
        setIsLoading(true);
        GoogleTasksService.listTasks(newListId).then((items) => {
            const formatted = items.map((t: any) => ({
                id: t.id,
                text: t.title,
                completed: t.status === 'completed'
            }));
            setGoogleTasks(formatted);
            setIsLoading(false);
        });
    };

    const addTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;

        if (useGoogle && isSignedIn) {
            try {
                setIsLoading(true);
                const res = await GoogleTasksService.insertTask(newTask.trim(), selectedListId);
                setGoogleTasks([...googleTasks, { id: res.id, text: res.title, completed: false }]);
                setNewTask('');
            } catch (e) {
                console.error("Add failed", e);
            } finally {
                setIsLoading(false);
            }
        } else {
            const task: Task = {
                id: Date.now().toString(),
                text: newTask.trim(),
                completed: false
            };
            setLocalTasks([...localTasks, task]);
            setNewTask('');
        }
    };

    const toggleTask = async (id: string, currentStatus: boolean, text: string) => {
        if (useGoogle && isSignedIn) {
            // Optimistic update
            const original = [...googleTasks];
            setGoogleTasks(googleTasks.map(t => t.id === id ? { ...t, completed: !currentStatus } : t));

            try {
                await GoogleTasksService.toggleTaskCompletion(id, !currentStatus, { title: text }, selectedListId);
            } catch (e) {
                console.error("Toggle failed", e);
                setGoogleTasks(original); // Revert
            }
        } else {
            setLocalTasks(localTasks.map(t =>
                t.id === id ? { ...t, completed: !t.completed } : t
            ));
        }
    };

    const deleteTask = async (id: string) => {
        if (useGoogle && isSignedIn) {
            const original = [...googleTasks];
            setGoogleTasks(googleTasks.filter(t => t.id !== id));
            try {
                await GoogleTasksService.deleteTask(id, selectedListId);
            } catch (e) {
                console.error("Delete failed", e);
                setGoogleTasks(original);
            }
        } else {
            setLocalTasks(localTasks.filter(t => t.id !== id));
        }
    };

    const activeTasks = (useGoogle && isSignedIn) ? googleTasks : localTasks;

    return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 w-full h-full flex flex-col text-white">
            <div className="flex items-center justify-between mb-4">
                {useGoogle && isSignedIn && taskLists.length > 0 ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                        <div className="relative flex-1 group">
                            <select
                                value={selectedListId}
                                onChange={handleListChange}
                                className="w-full appearance-none bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg py-1.5 pl-3 pr-8 text-xs font-bold text-white cursor-pointer outline-none focus:border-white/30 transition-all"
                            >
                                {taskLists.map(list => (
                                    <option key={list.id} value={list.id} className="bg-zinc-900 text-white">
                                        {list.title}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none group-hover:text-white transition-colors" />
                        </div>
                    </div>
                ) : (
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
                        <CheckSquare size={16} /> Tasks
                    </h3>
                )}

                {googleClientId && (
                    <button
                        onClick={() => setUseGoogle(!useGoogle)}
                        className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 transition-colors ${useGoogle ? 'text-blue-400' : 'text-white/30 hover:text-white'}`}
                        title={useGoogle ? "Using Google Tasks" : "Using Local Storage"}
                    >
                        {useGoogle ? <Cloud size={12} /> : <CloudOff size={12} />}
                        {useGoogle ? 'Cloud' : 'Local'}
                    </button>
                )}
            </div>

            {useGoogle && !isSignedIn ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <p className="text-white/50 text-xs mb-4">Connect to manage your Google Tasks.</p>
                    <button
                        onClick={handleSignIn}
                        className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors flex items-center gap-2"
                    >
                        <LogIn size={14} /> Connect Google
                    </button>
                </div>
            ) : (
                <>
                    <form onSubmit={addTask} className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            placeholder={useGoogle ? "Add to Google Tasks..." : "Add a new task..."}
                            className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm border border-white/5 outline-none focus:border-white/20 transition-all placeholder-white/20"
                            disabled={useGoogle && isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!newTask.trim() || (useGoogle && isLoading)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {useGoogle && isLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        </button>
                    </form>

                    <div className="flex-1 overflow-y-auto space-y-1 pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {activeTasks.length === 0 ? (
                            <div className="text-center py-8 text-white/20 text-xs italic">
                                {isLoading ? 'Loading...' : 'No tasks yet.'}
                            </div>
                        ) : (
                            activeTasks.map(task => (
                                <div
                                    key={task.id}
                                    className={`group flex items-center gap-3 p-2 rounded-lg transition-all ${task.completed ? 'bg-white/[0.02]' : 'hover:bg-white/5'
                                        }`}
                                >
                                    <button
                                        onClick={() => toggleTask(task.id, task.completed, task.text)}
                                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${task.completed
                                            ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                            : 'border-white/20 hover:border-white/40'
                                            }`}
                                    >
                                        {task.completed && <CheckSquare size={10} />}
                                    </button>
                                    <span className={`flex-1 text-sm transition-all ${task.completed ? 'text-white/30 line-through' : 'text-white/80'
                                        }`}>
                                        {task.text}
                                    </span>
                                    <button
                                        onClick={() => deleteTask(task.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-red-400 transition-all md:opacity-0"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
