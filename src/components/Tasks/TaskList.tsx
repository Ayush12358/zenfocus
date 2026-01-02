'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, Square, Loader } from 'lucide-react';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

interface Task {
    id: string;
    title: string;
    status: 'needsAction' | 'completed';
}

export default function TaskList() {
    const { token, isAuthenticated, login } = useGoogleAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated && token) {
            fetchTasks();
        }
    }, [isAuthenticated, token]);

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(
                '/api/google/tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=true&maxResults=20',
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (response.ok) {
                const data = await response.json();
                setTasks(data.items || []);
            }
        } catch (error) {
            console.error('Failed to fetch tasks', error);
        }
        setIsLoading(false);
    };

    const toggleTask = async (taskId: string, currentStatus: string) => {
        // Optimistic Update
        setTasks((prev) =>
            prev.map((t) =>
                t.id === taskId
                    ? {
                        ...t,
                        status: currentStatus === 'completed' ? 'needsAction' : 'completed',
                    }
                    : t
            )
        );

        const newStatus = currentStatus === 'completed' ? 'needsAction' : 'completed';

        try {
            await fetch(
                `/api/google/tasks.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`,
                {
                    // Using PATCH for updates
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: newStatus }),
                }
            );
        } catch (error) {
            console.error('Failed to toggle task', error);
            // Revert optimistic update on error
            fetchTasks();
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 p-4 text-center">
                <p>Sign in to see tasks</p>
                <button
                    onClick={() => login()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium text-sm"
                >
                    Sign In
                </button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-hidden flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                <CheckSquare size={20} /> Tasks
            </h2>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader className="animate-spin text-white" />
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className={`flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group ${task.status === 'completed' ? 'opacity-50' : ''
                                }`}
                            onClick={() => toggleTask(task.id, task.status)}
                        >
                            <div className="mt-1">
                                {task.status === 'completed' ? (
                                    <CheckSquare size={18} className="text-green-400" />
                                ) : (
                                    <Square size={18} className="text-gray-400 group-hover:text-white" />
                                )}
                            </div>
                            <span
                                className={`text-sm text-gray-200 ${task.status === 'completed' ? 'line-through' : ''
                                    }`}
                            >
                                {task.title}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
