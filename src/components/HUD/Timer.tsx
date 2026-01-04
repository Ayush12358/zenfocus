'use client';

import { useState, useEffect, useRef } from 'react';

import { Play, Pause, RotateCcw, Coffee, Brain, Zap, CheckCircle2, Volume2, VolumeX, ArrowRight, ChevronDown } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';


interface TimerProps {
    durations: {
        focus: number;
        short: number;
        long: number;
    };
    longBreakInterval: number;
    notificationsEnabled: boolean;
    orientation?: 'auto' | 'horizontal' | 'vertical';
}

export default function Timer({ durations, longBreakInterval, notificationsEnabled, orientation = 'auto' }: TimerProps) {
    const [timerState, setTimerState] = useLocalStorage<{
        isRunning: boolean;
        endTime: number | null;
        remaining: number;
        mode: 'focus' | 'short' | 'long';
    }>('zen_timer_state_v3', {
        isRunning: false,
        endTime: null,
        remaining: durations.focus * 60 * 1000,
        mode: 'focus'
    });

    const [stats, setStats] = useLocalStorage<{
        sessions: number;
        intent: string;
        autoStart: boolean;
        soundEnabled: boolean;
    }>('zen_timer_stats', {
        sessions: 0,
        intent: '',
        autoStart: false,
        soundEnabled: true
    });

    const [intentOptions] = useLocalStorage<string[]>('zen_current_intent_options', []);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);



    const [displayTime, setDisplayTime] = useState(timerState.remaining);

    // Sound Context Ref
    const audioContextRef = useRef<AudioContext | null>(null);

    const MODES = {
        focus: { min: durations.focus, label: 'Focus', color: '#60A5FA', icon: Brain },
        short: { min: durations.short, label: 'Short Break', color: '#4ADE80', icon: Coffee },
        long: { min: durations.long, label: 'Long Break', color: '#C084FC', icon: Zap },
    };

    const playSound = (type: 'start' | 'stop' | 'complete') => {
        if (!stats.soundEnabled) return;

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;

            if (type === 'start') {
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            } else if (type === 'stop') {
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            } else if (type === 'complete') {
                // Happy chord
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g);
                    g.connect(ctx.destination);
                    o.frequency.value = freq;
                    g.gain.setValueAtTime(0.05, now + i * 0.1);
                    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
                    o.start(now + i * 0.1);
                    o.stop(now + i * 0.1 + 0.5);
                });
            }
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    // Calculate progress for visual ring
    const totalDuration = MODES[timerState.mode].min * 60 * 1000;
    const progress = Math.max(0, ((totalDuration - displayTime) / totalDuration));

    // SVG Circle props
    const size = 280;
    const strokeWidth = 8;
    const center = size / 2;
    const radius = size / 2 - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * progress; // Inverted for countdown effect

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (timerState.isRunning && timerState.endTime) {
            const update = () => {
                const now = Date.now();
                const end = timerState.endTime!;
                const msLeft = end - now;

                if (msLeft <= 0) {
                    // Timer Completed
                    setDisplayTime(0);
                    playSound('complete');

                    const wasFocus = timerState.mode === 'focus';
                    let nextModeKey: 'focus' | 'short' | 'long' = 'focus';

                    // Logic for next mode
                    if (wasFocus) {
                        const sessionsCompleted = stats.sessions + 1;
                        if (sessionsCompleted % longBreakInterval === 0) {
                            nextModeKey = 'long';
                        } else {
                            nextModeKey = 'short';
                        }
                        // Update stats immediately so UI reflects it
                        setStats(prev => ({ ...prev, sessions: sessionsCompleted }));
                    } else {
                        nextModeKey = 'focus';
                    }

                    // Send Notification
                    if (notificationsEnabled && document.visibilityState === 'hidden') {
                        new Notification('Timer Complete!', {
                            body: `${wasFocus ? 'Focus session' : 'Break'} finished. Time to ${nextModeKey === 'focus' ? 'focus' : 'take a break'}!`,
                            icon: '/favicon.ico' // Assuming standard favicon
                        });
                    } else if (notificationsEnabled) {
                        // Also notify if visible but user wants alerts
                        new Notification('Timer Complete!', {
                            body: `${wasFocus ? 'Focus session' : 'Break'} finished.`,
                        });
                    }



                    setTimerState({
                        ...timerState,
                        isRunning: stats.autoStart,
                        endTime: stats.autoStart ? Date.now() + (MODES[nextModeKey].min * 60 * 1000) : null,
                        remaining: MODES[nextModeKey].min * 60 * 1000,
                        mode: nextModeKey
                    });
                } else {
                    setDisplayTime(msLeft);
                }
            };
            update();
            intervalId = setInterval(update, 1000);
        } else {
            // Keep display aligned with remaining state when paused
            // Only update if drastically different to prevent flicker during drag/setup
            if (Math.abs(displayTime - timerState.remaining) > 1000) {
                setDisplayTime(timerState.remaining);
            }
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [timerState.isRunning, timerState.endTime, timerState.mode, stats.autoStart]);

    // Update time when duration settings change significantly
    useEffect(() => {
        if (!timerState.isRunning) {
            const expected = MODES[timerState.mode].min * 60 * 1000;
            if (Math.abs(timerState.remaining - expected) > 1000 && displayTime !== expected) {
                setTimerState(prev => ({ ...prev, remaining: expected }));
                setDisplayTime(expected);
            }
        }
    }, [durations, timerState.mode]);


    const toggleTimer = () => {
        if (timerState.isRunning) {
            playSound('stop');
            setTimerState({
                ...timerState,
                isRunning: false,
                remaining: displayTime,
                endTime: null,
            });
        } else {
            playSound('start');
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
        playSound('stop');
        setMode(timerState.mode);
    };

    const formatTime = (ms: number) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const currentColor = MODES[timerState.mode].color;



    // Calculate if we should force side-by-side or stack
    const isHorizontal = orientation === 'horizontal';
    const isVertical = orientation === 'vertical';

    return (
        <div className={`flex items-center justify-center gap-6 lg:gap-10 p-2 transition-all ${isHorizontal ? 'flex-row' : (isVertical ? 'flex-col' : 'flex-col lg:flex-row')}`}>

            {/* Left: Main Circular Timer */}
            <div className="relative group shrink-0">
                <svg width={size} height={size} className="rotate-[-90deg]">
                    {/* Track */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="transparent"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth={strokeWidth}
                    />
                    {/* Progress */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="transparent"
                        stroke={currentColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-linear"
                    />
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className={`text-6xl font-mono font-bold tracking-tight transition-colors duration-300 ${timerState.isRunning ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/90'}`}>
                        {formatTime(displayTime)}
                    </div>
                    <div className="mt-4 flex gap-4">
                        <button
                            onClick={toggleTimer}
                            className={`p-4 rounded-full transition-all flex items-center justify-center ${timerState.isRunning
                                ? 'bg-white/10 hover:bg-white/20 text-white'
                                : 'bg-white text-black hover:scale-110 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                }`}
                        >
                            {timerState.isRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>
                        {!timerState.isRunning && (
                            <button
                                onClick={resetTimer}
                                className="p-4 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                            >
                                <RotateCcw size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Controls & Dashboard */}
            <div className="flex flex-col gap-6 w-64">
                {/* Top Bar: Stats & Controls */}
                <div className="flex justify-between items-center w-full text-xs font-medium text-white/40 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2" title="Completed Sessions">
                        <CheckCircle2 size={12} className={stats.sessions > 0 ? "text-green-400" : ""} />
                        <span>{stats.sessions} Session{stats.sessions !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setStats(s => ({ ...s, autoStart: !s.autoStart }))}
                            className={`flex items-center gap-1 transition-colors ${stats.autoStart ? 'text-blue-400' : 'hover:text-white/60'}`}
                            title="Auto-start next timer"
                        >
                            <ArrowRight size={12} /> Auto
                        </button>
                        <button
                            onClick={() => setStats(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
                            className={`hover:text-white/80 transition-colors ${stats.soundEnabled ? 'text-white/60' : 'text-white/20'}`}
                        >
                            {stats.soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                        </button>
                    </div>
                </div>

                {/* Mode Selector Capsules */}
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-white/20 pl-1">Focus Mode</span>
                    <div className="flex flex-wrap gap-2">
                        {(Object.keys(MODES) as Array<keyof typeof MODES>).map((m) => {
                            const isActive = timerState.mode === m;
                            const ModeIcon = MODES[m].icon;
                            return (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 flex-1 justify-center border ${isActive
                                        ? 'bg-white/10 border-white/20 text-white shadow-lg'
                                        : 'bg-white/5 border-transparent text-white/40 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    <ModeIcon size={14} />
                                    {MODES[m].label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-white/20 pl-1">Intent</span>
                    <div className="relative group">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={stats.intent}
                                onChange={(e) => setStats(s => ({ ...s, intent: e.target.value }))}
                                placeholder="What are you focusing on?"
                                className="flex-1 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 text-sm text-white/90 outline-none border border-white/5 focus:border-white/20 transition-all font-medium placeholder-white/20"
                            />
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all ${isDropdownOpen ? 'bg-white/10 text-white' : 'text-white/40'}`}
                            >
                                <ChevronDown size={16} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute top-full right-0 mt-2 w-full bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                                {intentOptions.length === 0 ? (
                                    <div className="p-3 text-xs text-white/30 text-center italic">No active tasks found</div>
                                ) : (
                                    <div className="flex flex-col p-1">
                                        <div className="text-[10px] uppercase font-bold text-white/20 px-3 py-2">Quick Select</div>
                                        {intentOptions.map((opt, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setStats(s => ({ ...s, intent: opt }));
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="text-left px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors truncate"
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Overlay to close dropdown on click outside */}
                        {isDropdownOpen && (
                            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsDropdownOpen(false)} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
