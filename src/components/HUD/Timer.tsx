'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, Zap } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';


interface TimerProps {
    durations: {
        focus: number;
        short: number;
        long: number;
    };
}

export default function Timer({ durations }: TimerProps) {
    const [timerState, setTimerState] = useLocalStorage<{
        isRunning: boolean;
        endTime: number | null;
        remaining: number;
        mode: 'focus' | 'short' | 'long';
    }>('zen_timer_state_v2', {
        isRunning: false,
        endTime: null,
        remaining: durations.focus * 60 * 1000,
        mode: 'focus'
    });

    const [displayTime, setDisplayTime] = useState(timerState.remaining);

    const MODES = {
        focus: { min: durations.focus, label: 'Focus', color: 'text-blue-400', icon: Brain },
        short: { min: durations.short, label: 'Short Break', color: 'text-green-400', icon: Coffee },
        long: { min: durations.long, label: 'Long Break', color: 'text-purple-400', icon: Zap },
    };

    // Calculate progress for visual bar
    const totalDuration = MODES[timerState.mode].min * 60 * 1000;
    const progress = Math.min(100, Math.max(0, ((totalDuration - displayTime) / totalDuration) * 100));

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (timerState.isRunning && timerState.endTime) {
            const update = () => {
                const now = Date.now();
                const end = timerState.endTime!;
                const msLeft = end - now;

                if (msLeft <= 0) {
                    setDisplayTime(0);
                    setTimerState({
                        ...timerState,
                        isRunning: false,
                        remaining: 0,
                        endTime: null,
                    });
                    // Play notification sound here if we had assets
                } else {
                    setDisplayTime(msLeft);
                }
            };
            update();
            intervalId = setInterval(update, 1000);
        } else {
            setDisplayTime(timerState.remaining);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [timerState.isRunning, timerState.endTime, timerState.remaining, setTimerState]);

    const toggleTimer = () => {
        if (timerState.isRunning) {
            // Pause
            setTimerState({
                ...timerState,
                isRunning: false,
                remaining: displayTime,
                endTime: null,
            });
        } else {
            // Start
            const newEndTime = Date.now() + displayTime;
            setTimerState({
                ...timerState,
                isRunning: true,
                endTime: newEndTime,
            });
        }
    };

    const setMode = (mode: 'focus' | 'short' | 'long') => {
        const newTime = MODES[mode].min * 60 * 1000;
        setTimerState({
            isRunning: false,
            endTime: null,
            remaining: newTime,
            mode: mode
        });
        setDisplayTime(newTime);
    };

    const resetTimer = () => {
        setMode(timerState.mode);
    };

    const formatTime = (ms: number) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const CurrentIcon = MODES[timerState.mode].icon;

    return (
        <div className="flex flex-col items-center justify-center mt-4 text-white w-full max-w-xs">
            {/* Mode Selector */}
            <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl backdrop-blur-sm">
                {(Object.keys(MODES) as Array<keyof typeof MODES>).map((m) => {
                    const isActive = timerState.mode === m;
                    const ModeIcon = MODES[m].icon;
                    return (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${isActive ? 'bg-white/20 text-white shadow-lg' : 'text-white/50 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <ModeIcon size={14} />
                            {MODES[m].label}
                        </button>
                    );
                })}
            </div>

            {/* Timer Display */}
            <div className="relative mb-6 group">
                {/* Progress Ring / Glow */}
                <div className={`absolute -inset-4 rounded-full blur-xl opacity-20 transition-all duration-1000 ${timerState.isRunning ? 'bg-blue-500 opacity-40 animate-pulse' : 'bg-transparent'
                    }`} />

                <div className={`text-7xl font-mono font-bold tracking-widest tabular-nums transition-colors duration-500 ${timerState.isRunning ? 'text-white' : 'text-white/80'}`}>
                    {formatTime(displayTime)}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/10 rounded-full mb-8 overflow-hidden">
                <div
                    className={`h-full transition-all duration-1000 ease-linear ${timerState.mode === 'focus' ? 'bg-blue-500' :
                        timerState.mode === 'short' ? 'bg-green-500' : 'bg-purple-500'
                        }`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Controls */}
            <div className="flex gap-6">
                <button
                    onClick={toggleTimer}
                    className={`p-4 rounded-full transition-all shadow-xl hover:scale-105 active:scale-95 ${timerState.isRunning
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                >
                    {timerState.isRunning ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                </button>
                <button
                    onClick={resetTimer}
                    className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition-all hover:scale-105 active:scale-95 text-white/70 hover:text-white"
                >
                    <RotateCcw size={32} />
                </button>
            </div>
        </div>
    );
}
