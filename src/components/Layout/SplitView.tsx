'use client';

import Clock from '@/components/HUD/Clock';
import Timer from '@/components/HUD/Timer';
import { useState, useEffect } from 'react';
import { CheckSquare, StickyNote, Settings, History, Play, AlertCircle, Maximize, Minimize, Brain, Coffee, Zap } from 'lucide-react';

const DEFAULT_VIDEO_ID = 'jfKfPfyJRdk'; // Lofi Girl

export default function SplitView() {
    const [isMounted, setIsMounted] = useState(false);
    const [videoId, setVideoId] = useState(DEFAULT_VIDEO_ID);
    const [inputUrl, setInputUrl] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [error, setError] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Timer Settings
    const [durations, setDurations] = useState({
        focus: 25,
        short: 5,
        long: 15
    });

    useEffect(() => {
        setIsMounted(true);
        const savedId = localStorage.getItem('zen_video_id');
        const savedHistory = localStorage.getItem('zen_video_history_ids');
        const savedDurations = localStorage.getItem('zen_timer_durations');

        if (savedId) setVideoId(savedId);
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error('Failed to parse history', e);
            }
        }
        if (savedDurations) {
            try {
                setDurations(JSON.parse(savedDurations));
            } catch (e) {
                console.error('Failed to parse timer durations', e);
            }
        }

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const extractVideoId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleUrlSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputUrl.trim()) return;

        const extractedId = extractVideoId(inputUrl);

        if (extractedId) {
            setVideoId(extractedId);
            setError('');
            setInputUrl('');
            addToHistory(extractedId);
            localStorage.setItem('zen_video_id', extractedId);
        } else {
            setError('Invalid YouTube URL');
        }
    };

    const handleDurationChange = (key: 'focus' | 'short' | 'long', value: string) => {
        const num = parseInt(value);
        if (!isNaN(num) && num > 0) {
            const newDurations = { ...durations, [key]: num };
            setDurations(newDurations);
            localStorage.setItem('zen_timer_durations', JSON.stringify(newDurations));
        }
    };

    const addToHistory = (id: string) => {
        if (!history.includes(id)) {
            const newHistory = [id, ...history].slice(0, 10);
            setHistory(newHistory);
            localStorage.setItem('zen_video_history_ids', JSON.stringify(newHistory));
        }
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('zen_video_history_ids');
    };

    if (!isMounted) return null;

    return (
        <div className="h-screen w-screen bg-black overflow-hidden relative flex flex-col items-center justify-center text-white">
            {/* Background Video */}
            <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
                <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&showinfo=0&rel=0&loop=1&playlist=${videoId}`}
                    title="Background Video"
                    allow="autoplay; encrypted-media; loop"
                    allowFullScreen
                />
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
            </div>

            {/* Centre-Right Control Dock */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4">

                {/* Fullscreen Toggle */}
                <button
                    onClick={toggleFullscreen}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all shadow-lg border border-white/5 hover:scale-105"
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                    {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                </button>

                {/* Settings Toggle */}
                <div className="relative">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all group shadow-lg border border-white/5 hover:scale-105"
                        title="Settings"
                    >
                        <Settings size={24} className={`transition-transform duration-500 ${showSettings ? 'rotate-90' : 'group-hover:rotate-45'}`} />
                    </button>

                    {/* Settings Panel Popover */}
                    {showSettings && (
                        <div className="absolute top-0 right-14 w-80 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl animate-fade-in origin-top-right z-50 max-h-[80vh] overflow-y-auto custom-scrollbar">

                            {/* Timer Settings */}
                            <div className="mb-6">
                                <h3 className="text-sm font-bold uppercase tracking-wider mb-3 text-white/70">Timer Settings (Min)</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-blue-400 flex items-center gap-1"><Brain size={10} /> Focus</label>
                                        <input
                                            type="number"
                                            value={durations.focus}
                                            onChange={(e) => handleDurationChange('focus', e.target.value)}
                                            className="bg-white/10 rounded px-2 py-1 text-sm border border-white/10 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-green-400 flex items-center gap-1"><Coffee size={10} /> Short</label>
                                        <input
                                            type="number"
                                            value={durations.short}
                                            onChange={(e) => handleDurationChange('short', e.target.value)}
                                            className="bg-white/10 rounded px-2 py-1 text-sm border border-white/10 focus:border-green-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-purple-400 flex items-center gap-1"><Zap size={10} /> Long</label>
                                        <input
                                            type="number"
                                            value={durations.long}
                                            onChange={(e) => handleDurationChange('long', e.target.value)}
                                            className="bg-white/10 rounded px-2 py-1 text-sm border border-white/10 focus:border-purple-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="h-px w-full bg-white/10 mb-4" />

                            {/* Video Settings */}
                            <h3 className="text-sm font-bold uppercase tracking-wider mb-3 text-white/70">Background Video</h3>
                            <form onSubmit={handleUrlSubmit} className="flex flex-col gap-2 mb-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inputUrl}
                                        onChange={(e) => setInputUrl(e.target.value)}
                                        placeholder="Paste YouTube Link..."
                                        className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors placeholder-white/30"
                                    />
                                    <button
                                        type="submit"
                                        className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                                        disabled={!inputUrl.trim()}
                                        title="Play"
                                    >
                                        <Play size={16} fill="white" />
                                    </button>
                                </div>
                                {error && <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} /> {error}</span>}
                            </form>

                            {history.length > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-semibold text-white/50 flex items-center gap-1">
                                            <History size={12} /> Recent IDs
                                        </span>
                                        <button onClick={clearHistory} className="text-[10px] text-red-400 hover:text-red-300">Clear</button>
                                    </div>
                                    <ul className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                        {history.map((id, index) => (
                                            <li key={index} className="group flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-lg p-2 transition-colors cursor-pointer" onClick={() => setVideoId(id)}>
                                                <span className="text-xs truncate max-w-[200px] text-white/80">https://youtu.be/{id}</span>
                                                <Play size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="h-px w-full bg-white/10 my-1" />

                {/* Tasks Button */}
                <a
                    href="https://tasks.google.com/tasks/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-blue-600/80 hover:bg-blue-600 rounded-full backdrop-blur-md transition-all shadow-lg border border-white/10 hover:scale-105"
                    title="Open Tasks"
                >
                    <CheckSquare size={24} />
                </a>

                {/* Keep Button */}
                <a
                    href="https://keep.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-yellow-600/80 hover:bg-yellow-600 rounded-full backdrop-blur-md transition-all shadow-lg border border-white/10 hover:scale-105"
                    title="Open Keep"
                >
                    <StickyNote size={24} />
                </a>

            </div>

            {/* Content Overlay */}
            <div className="z-10 relative flex flex-col items-center pointer-events-none">
                {/* Logo Removed as requested */}

                <div className="flex flex-col items-center gap-8 pointer-events-auto scale-110 mt-16">
                    <Clock />
                    <Timer durations={durations} />
                </div>
            </div>
        </div>
    );
}
