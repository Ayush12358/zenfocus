'use client';

import Timer from '@/components/HUD/Timer';
import DraggablePanel from '@/components/Layout/DraggablePanel';
import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CheckSquare, StickyNote, Settings, History, Play, AlertCircle, Maximize, Minimize, Brain, Coffee, Zap, Layers, Droplets, Link as LinkIcon, Plus, Trash2, Globe, ExternalLink, Upload, FileText, ArrowUp, ArrowDown, ArrowDownAZ, Bell, Eye, EyeOff, MousePointer2, Lock } from 'lucide-react';

const DEFAULT_VIDEO_ID = 'playlist:PL8ltyl0rAtoO4vZiGROGEflYt487oUJnA'; // Default Lofi Playlist

interface QuickLink {
    id: string;
    title: string;
    url: string;
}

export default function SplitView() {
    const [isMounted, setIsMounted] = useState(false);
    const [videoId, setVideoId] = useLocalStorage('zen_video_id', DEFAULT_VIDEO_ID);
    const [inputUrl, setInputUrl] = useState('');
    const [history, setHistory] = useLocalStorage<string[]>('zen_video_history_ids', []);
    const [showSettings, setShowSettings] = useState(false);
    const [error, setError] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // UI Settings
    const [transparency, setTransparency] = useLocalStorage('zen_ui_transparency', 40); // 0-100
    const [blur, setBlur] = useLocalStorage('zen_ui_blur', 16); // 0-40px
    const [showQuickLinks, setShowQuickLinks] = useLocalStorage('zen_ui_show_quicklinks', false);
    const [uiHidden, setUiHidden] = useState(false);
    const [orientation, setOrientation] = useState<'auto' | 'horizontal' | 'vertical'>('auto');
    const [videoInteractive, setVideoInteractive] = useState(false);

    // Quick Links Data
    const [quickLinks, setQuickLinks] = useLocalStorage<QuickLink[]>('zen_quick_links', [
        { id: '1', title: 'Google', url: 'https://google.com' },
        { id: '2', title: 'YouTube', url: 'https://youtube.com' },
        { id: '3', title: 'GitHub', url: 'https://github.com' }
    ]);
    const [newLinkTitle, setNewLinkTitle] = useState('');
    const [newLinkUrl, setNewLinkUrl] = useState('');

    // Timer Settings
    const [durations, setDurations] = useLocalStorage('zen_timer_durations', {
        focus: 25,
        short: 5,
        long: 15
    });
    const [longBreakInterval, setLongBreakInterval] = useLocalStorage('zen_long_break_interval', 4); // Default 4 sessions
    const [notificationsEnabled, setNotificationsEnabled] = useLocalStorage('zen_notifications_enabled', false);

    useEffect(() => {
        setIsMounted(true);

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

    const extractYouTubeId = (url: string) => {
        // Playlist ID
        const playlistRegExp = /[?&]list=([^#&?]+)/;
        const playlistMatch = url.match(playlistRegExp);
        if (playlistMatch) {
            return { type: 'playlist', id: playlistMatch[1] };
        }

        // Video ID
        const videoRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const videoMatch = url.match(videoRegExp);
        if (videoMatch && videoMatch[2].length === 11) {
            return { type: 'video', id: videoMatch[2] };
        }

        return null;
    };

    const handleUrlSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputUrl.trim()) return;

        const result = extractYouTubeId(inputUrl);

        if (result) {
            if (result.type === 'playlist') {
                setVideoId(`playlist:${result.id}`);
                // Don't add playlists to history for now, or handle differently
            } else {
                setVideoId(result.id);
                addToHistory(result.id);
            }
            setError('');
            setInputUrl('');
        } else {
            setError('Invalid YouTube URL');
        }
    };

    const handleDurationChange = (key: keyof typeof durations, value: string) => {
        const numVal = parseInt(value) || 1;
        const newDurations = { ...durations, [key]: numVal };
        setDurations(newDurations);
    };

    const handleIntervalChange = (value: string) => {
        const numVal = parseInt(value) || 1;
        setLongBreakInterval(numVal);
    };

    const toggleNotifications = () => {
        const newState = !notificationsEnabled;
        if (newState) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    setNotificationsEnabled(true);
                    new Notification('Notifications Enabled', { body: 'You will be notified when timers complete.' });
                } else {
                    setNotificationsEnabled(false);
                    setError('Notification permission denied.');
                }
            });
        } else {
            setNotificationsEnabled(false);
        }
    };

    const handleTransparencyChange = (value: string) => {
        const val = parseInt(value);
        setTransparency(val);
    };

    const handleBlurChange = (value: string) => {
        const val = parseInt(value);
        setBlur(val);
    };

    const toggleQuickLinks = () => {
        const newValue = !showQuickLinks;
        setShowQuickLinks(newValue);
    };

    const addQuickLink = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;

        let formattedUrl = newLinkUrl;
        if (!formattedUrl.startsWith('http')) {
            formattedUrl = `https://${formattedUrl}`;
        }

        const newLink: QuickLink = {
            id: Date.now().toString(),
            title: newLinkTitle,
            url: formattedUrl
        };

        const updatedLinks = [...quickLinks, newLink];
        setQuickLinks(updatedLinks);
        setNewLinkTitle('');
        setNewLinkUrl('');
    };

    const removeQuickLink = (id: string) => {
        const updatedLinks = quickLinks.filter(l => l.id !== id);
        setQuickLinks(updatedLinks);
    };

    const sortLinks = () => {
        const sorted = [...quickLinks].sort((a, b) => a.title.localeCompare(b.title));
        setQuickLinks(sorted);
    };

    const moveLink = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === quickLinks.length - 1)) return;

        const newLinks = [...quickLinks];
        const temp = newLinks[index];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        newLinks[index] = newLinks[newIndex];
        newLinks[newIndex] = temp;

        setQuickLinks(newLinks);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const links = Array.from(doc.getElementsByTagName('a'));

            const importedLinks: QuickLink[] = links.map(link => ({
                id: `imported-${Date.now()}-${Math.random()}`,
                title: link.textContent || 'Bookmark',
                url: link.href
            })).slice(0, 50); // Limit to 50

            if (importedLinks.length > 0) {
                const updatedLinks = [...quickLinks, ...importedLinks];
                setQuickLinks(updatedLinks);
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    const addToHistory = (id: string) => {
        if (!history.includes(id)) {
            const newHistory = [id, ...history].slice(0, 10);
            setHistory(newHistory);
        }
    };

    const clearHistory = () => {
        setHistory([]);
    };

    if (!isMounted) return null;

    // Approximate default positions
    // Orientation Logic
    const isAuto = orientation === 'auto';
    const isHorizontal = orientation === 'horizontal';
    const isVertical = orientation === 'vertical';

    const hudClasses = `flex items-center transition-all ${isHorizontal ? 'flex-row gap-12 p-8' :
        isVertical ? 'flex-col gap-6 p-6 pt-2' :
            'flex-col lg:flex-row gap-6 lg:gap-12 p-6 lg:p-8 pt-2 lg:pt-8'
        }`;

    const getDockClasses = (isMainDock: boolean) => {
        const baseClasses = "flex items-center justify-center p-2 transition-all";
        const widthClasses = orientation === 'vertical' ? 'w-auto lg:w-16' : (orientation === 'horizontal' ? 'w-full lg:w-auto' : 'w-full lg:w-16');
        const flexClasses = orientation === 'vertical' ? 'flex-col' : (orientation === 'horizontal' ? 'flex-row' : 'flex-row lg:flex-col');

        return {
            wrapper: `flex flex-col items-center ${orientation === 'vertical' ? 'w-full lg:w-16' : (orientation === 'horizontal' ? 'w-full lg:w-auto' : 'w-full lg:w-16')}`,
            inner: `${baseClasses} ${flexClasses} ${orientation === 'vertical' ? 'gap-2' : (orientation === 'horizontal' ? 'gap-2 lg:gap-4' : 'gap-2 lg:gap-2')}`
        };
    };



    // Approximate default positions
    const initialHUDPos = { x: '50%', y: '50%' };

    return (
        <div className="h-[100dvh] w-screen bg-black overflow-hidden relative text-white flex flex-col lg:block overflow-y-auto lg:overflow-hidden">
            {/* Background Video */}
            <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
                {/* 1. Underlying Iframe */}
                <iframe
                    className={`transition-all duration-700 ease-in-out ${videoInteractive
                        ? 'w-full h-full pointer-events-auto scale-100 opacity-100'
                        : 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-[177.77vh] h-[56.25vw] pointer-events-none scale-[1.01]'
                        }`}
                    src={videoId.startsWith('playlist:')
                        ? `https://www.youtube.com/embed?listType=playlist&list=${videoId.split(':')[1]}&autoplay=1&mute=0&controls=1&showinfo=0&rel=0&loop=1`
                        : `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&showinfo=0&rel=0&loop=1&playlist=${videoId}`
                    }
                    title="Background Video"
                    allow="autoplay; encrypted-media; loop"
                    allowFullScreen
                />

                {/* 2. Interaction Capture Overlay (Only active when NOT interactive) */}
                {!videoInteractive && (
                    <div
                        className="absolute inset-0 z-10 cursor-pointer pointer-events-auto hover:bg-white/5 transition-colors group flex items-center justify-center"
                        onClick={() => setVideoInteractive(true)}
                    >
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-3">
                            <MousePointer2 size={20} className="text-white/70" />
                            <span className="text-sm font-medium">Click to interact with video</span>
                        </div>
                    </div>
                )}

                {/* 3. Global Dimmer */}
                <div className="absolute inset-0 bg-black/20 pointer-events-none z-20" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full min-h-[100dvh] flex flex-col items-center lg:block p-2 lg:p-0 pointer-events-none">

                {/* Unified Zen Hub */}
                <DraggablePanel id="zen_hub" initialPosition={initialHUDPos} transparency={transparency} blur={blur} className={`pointer-events-auto transition-opacity duration-700 ${uiHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex flex-col items-center">
                        {/* 1. HUD Area (Clock & Timer) */}
                        <div className={hudClasses}>
                            <Clock />
                            <Timer durations={durations} longBreakInterval={longBreakInterval} notificationsEnabled={notificationsEnabled} orientation={orientation} />
                        </div>

                        {/* 2. Quick Links Area (Integrated) */}
                        {showQuickLinks && quickLinks.length > 0 && !uiHidden && (
                            <div className="w-full border-t border-white/5 py-3 px-4 lg:px-8 flex flex-wrap justify-center gap-3 bg-white/[0.02]">
                                {quickLinks.map(link => (
                                    <a
                                        key={link.id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all hover:scale-110 group relative"
                                        title={link.title}
                                    >
                                        <div className="w-5 h-5 rounded overflow-hidden flex items-center justify-center">
                                            <img
                                                src={`https://www.google.com/s2/favicons?domain=${link.url}&sz=32`}
                                                alt={link.title}
                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                }}
                                            />
                                            <Globe size={14} className="hidden absolute text-white/40" />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}

                        {/* 3. Controls Area (Merged Dock) */}
                        {!uiHidden && (
                            <div className="w-full border-t border-white/10 bg-white/5 py-3 lg:py-4 px-4 lg:px-8 flex items-center justify-center rounded-b-3xl">
                                {/* Settings & Toggles Row */}
                                <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-4">
                                    {/* Fullscreen Toggle */}
                                    <button
                                        onClick={toggleFullscreen}
                                        className="p-2 hover:bg-white/10 rounded-xl transition-all group relative text-white/50 hover:text-white"
                                    >
                                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                                    </button>

                                    {/* Settings Toggle */}
                                    <button
                                        onClick={() => setShowSettings(!showSettings)}
                                        className="p-2 hover:bg-white/10 rounded-xl transition-all group relative text-white/50 hover:text-white"
                                    >
                                        <Settings size={20} className={`transition-transform duration-500 ${showSettings ? 'rotate-90' : 'group-hover:rotate-45'}`} />
                                    </button>

                                    {/* Video Interaction Toggle */}
                                    <button
                                        onClick={() => setVideoInteractive(!videoInteractive)}
                                        className={`p-2 rounded-xl transition-all group relative ${videoInteractive ? 'bg-white/20 text-white shadow-lg' : 'hover:bg-white/10 text-white/50 hover:text-white'}`}
                                        title={videoInteractive ? "Lock Video Focus" : "Unlock Video Focus"}
                                    >
                                        {videoInteractive ? <MousePointer2 size={20} /> : <Lock size={20} />}
                                    </button>

                                    {/* Divider */}
                                    <div className="h-4 w-px bg-white/10" />

                                    {/* App Links */}
                                    <a
                                        href="https://tasks.google.com/tasks/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 hover:bg-white/10 rounded-xl transition-all group relative text-white/50 hover:text-white"
                                        title="Google Tasks"
                                    >
                                        <CheckSquare size={20} />
                                    </a>

                                    <a
                                        href="https://keep.google.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 hover:bg-white/10 rounded-xl transition-all group relative text-white/50 hover:text-white"
                                        title="Google Keep"
                                    >
                                        <StickyNote size={20} />
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </DraggablePanel>

                {/* Floating Hide UI Toggle (Always available) */}
                <div className={`fixed bottom-8 right-8 z-50 pointer-events-auto transition-all duration-500 ${uiHidden ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}>
                    <button
                        onClick={() => setUiHidden(!uiHidden)}
                        className="p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl text-white shadow-2xl hover:scale-110 active:scale-95 transition-all"
                        title={uiHidden ? "Show UI" : "Hide UI"}
                    >
                        {uiHidden ? <Eye size={24} /> : <EyeOff size={24} />}
                    </button>
                </div>



            </div>

            {/* FULLSCREEN SETTINGS OVERLAY */}
            {showSettings && (
                <div
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-2xl flex items-center justify-center animate-fade-in"
                    onClick={() => setShowSettings(false)}
                >
                    <div
                        className="w-[600px] max-w-[90vw] max-h-[85vh] bg-black/40 border border-white/10 rounded-3xl p-8 shadow-2xl overflow-y-auto relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                                <Settings size={28} /> Settings
                            </h2>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <Plus size={28} className="rotate-45" /> {/* Use Plus rotated as X */}
                            </button>
                        </div>

                        {/* Visual Settings */}
                        <div className="mb-8">
                            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-white/50 border-b border-white/10 pb-2">Visuals</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <div className="flex justify-between text-xs text-white/70 mb-2">
                                        <span className="flex items-center gap-2"><Layers size={14} /> Transparency</span>
                                        <span>{transparency}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={transparency}
                                        onChange={(e) => handleTransparencyChange(e.target.value)}
                                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-white/70 mb-2">
                                        <span className="flex items-center gap-2"><Droplets size={14} /> Blur</span>
                                        <span>{blur}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="40"
                                        value={blur}
                                        onChange={(e) => handleBlurChange(e.target.value)}
                                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* HUD Layout Setting */}
                        <div className="mb-8">
                            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-white/50 border-b border-white/10 pb-2">HUD Layout</h3>
                            <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                                {(['auto', 'horizontal', 'vertical'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setOrientation(mode)}
                                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all capitalize ${orientation === mode ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Timer Settings */}
                        <div className="mb-8">
                            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-white/50 border-b border-white/10 pb-2">Timer Durations (Minutes)</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                    <label className="text-xs text-blue-400 flex items-center gap-2 mb-2 font-semibold"><Brain size={14} /> Focus</label>
                                    <input
                                        type="number"
                                        value={durations.focus}
                                        onChange={(e) => handleDurationChange('focus', e.target.value)}
                                        className="bg-transparent text-2xl font-mono font-bold outline-none w-full"
                                    />
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                    <label className="text-xs text-green-400 flex items-center gap-2 mb-2 font-semibold"><Coffee size={14} /> Short Break</label>
                                    <input
                                        type="number"
                                        value={durations.short}
                                        onChange={(e) => handleDurationChange('short', e.target.value)}
                                        className="bg-transparent text-2xl font-mono font-bold outline-none w-full"
                                    />
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                    <label className="text-xs text-purple-400 flex items-center gap-2 mb-2 font-semibold"><Zap size={14} /> Long Break</label>
                                    <input
                                        type="number"
                                        value={durations.long}
                                        onChange={(e) => handleDurationChange('long', e.target.value)}
                                        className="bg-transparent text-2xl font-mono font-bold outline-none w-full"
                                    />
                                </div>
                            </div>

                            {/* Interval Setting */}
                            <div className="mt-4 flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/5">
                                <label className="text-xs text-white/50 font-medium">Long Break after</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={longBreakInterval}
                                        onChange={(e) => handleIntervalChange(e.target.value)}
                                        className="bg-transparent text-xl font-mono font-bold outline-none w-12 text-center border-b border-white/10 focus:border-white/30 transition-colors"
                                    />
                                    <span className="text-xs text-white/50">sessions</span>
                                </div>
                            </div>

                            {/* Notifications Setting */}
                            <div className="mt-4 flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/5">
                                <label className="text-xs text-white/50 font-medium flex items-center gap-2"><Bell size={14} /> Desktop Notifications</label>
                                <button
                                    onClick={toggleNotifications}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${notificationsEnabled ? 'bg-green-500/20 border-green-500/50 text-green-200' : 'bg-white/5 border-white/5 text-white/50'}`}
                                >
                                    {notificationsEnabled ? 'Enabled' : 'Disabled'}
                                </button>
                            </div>
                        </div>

                        {/* Quick Links Settings */}
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Quick Links Manager</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={sortLinks}
                                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-white/70 hover:text-white transition-colors flex items-center gap-2"
                                    >
                                        <ArrowDownAZ size={14} /> Sort A-Z
                                    </button>
                                    <button
                                        onClick={toggleQuickLinks}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${showQuickLinks ? 'bg-blue-600/20 border-blue-500/50 text-blue-200' : 'bg-white/5 border-white/5 text-white/50'}`}
                                    >
                                        {showQuickLinks ? 'Dock Visible' : 'Dock Hidden'}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Add New */}
                                <form onSubmit={addQuickLink} className="flex gap-3">
                                    <input
                                        type="text"
                                        value={newLinkTitle}
                                        onChange={(e) => setNewLinkTitle(e.target.value)}
                                        placeholder="Site Name"
                                        className="w-1/3 bg-white/5 rounded-xl px-4 py-3 text-sm border border-white/5 outline-none focus:border-blue-500/50 transition-all font-medium"
                                    />
                                    <div className="flex-1 flex gap-3">
                                        <input
                                            type="text"
                                            value={newLinkUrl}
                                            onChange={(e) => setNewLinkUrl(e.target.value)}
                                            placeholder="URL (e.g. google.com)"
                                            className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-sm border border-white/5 outline-none focus:border-blue-500/50 transition-all font-medium"
                                        />
                                        <button type="submit" className="px-5 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-900/20" disabled={!newLinkTitle || !newLinkUrl}>
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                </form>

                                {/* List */}
                                <div className="bg-white/5 rounded-2xl p-2 max-h-60 overflow-y-auto border border-white/5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                                    {quickLinks.length === 0 ? (
                                        <div className="text-center py-8 text-white/20 italic">No bookmarks added yet.</div>
                                    ) : (
                                        <ul className="space-y-1">
                                            {quickLinks.map((link, index) => (
                                                <li key={link.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl group transition-all">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                                            <img
                                                                src={`https://www.google.com/s2/favicons?domain=${link.url}&sz=32`}
                                                                alt={link.title}
                                                                className="w-5 h-5 object-cover opacity-80"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                                }}
                                                            />
                                                            <Globe size={16} className="hidden absolute text-white/50" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-medium text-white/90 truncate">{link.title}</span>
                                                            <span className="text-[10px] text-white/40 truncate">{link.url}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => moveLink(index, 'up')} disabled={index === 0} className="p-2 text-white/30 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent">
                                                            <ArrowUp size={14} />
                                                        </button>
                                                        <button onClick={() => moveLink(index, 'down')} disabled={index === quickLinks.length - 1} className="p-2 text-white/30 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent">
                                                            <ArrowDown size={14} />
                                                        </button>
                                                        <div className="w-px h-4 bg-white/10 mx-1" />
                                                        <button onClick={() => removeQuickLink(link.id)} className="p-2 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {/* Import */}
                                <div className="flex justify-center">
                                    <label className="flex items-center gap-2 text-xs font-medium text-white/40 hover:text-white/80 cursor-pointer transition-colors py-2 px-4 hover:bg-white/5 rounded-full">
                                        <Upload size={14} />
                                        Import from Browser HTML
                                        <input
                                            type="file"
                                            accept=".html"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Video Settings */}
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-white/50 border-b border-white/10 pb-2">Background</h3>

                            <form onSubmit={handleUrlSubmit} className="flex flex-col gap-3">
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                                            <LinkIcon size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            value={inputUrl}
                                            onChange={(e) => setInputUrl(e.target.value)}
                                            placeholder="Paste YouTube Link..."
                                            className="w-full bg-white/5 rounded-xl pl-12 pr-4 py-3 text-sm border border-white/5 outline-none focus:border-blue-500/50 transition-all placeholder-white/20"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={!inputUrl.trim()}
                                    >
                                        Load Video
                                    </button>
                                </div>
                                {error && <span className="text-xs text-red-400 flex items-center gap-2 pl-2"><AlertCircle size={12} /> {error}</span>}
                            </form>

                            {history.length > 0 && (
                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-3 px-1">
                                        <span className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">
                                            <History size={12} /> Recent History
                                        </span>
                                        <button onClick={clearHistory} className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors">Clear All</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {history.slice(0, 4).map((id, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setVideoId(id)}
                                                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-left group border border-transparent hover:border-white/5"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-black/50 overflow-hidden relative shrink-0">
                                                    <img src={`https://img.youtube.com/vi/${id}/default.jpg`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                                        <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
                                                            <Play size={12} className="text-white fill-white translate-x-0.5" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs text-white/40 mb-0.5">YouTube Video</div>
                                                    <div className="text-xs font-medium text-white/80 truncate">ID: {id}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-12 pt-6 border-t border-white/5 text-center">
                            <p className="text-xs text-white/30 font-medium">
                                Created by <span className="text-white/50">Ayush Maurya</span>
                            </p>
                            <div className="flex justify-center gap-4 mt-2 text-[10px] text-white/20">
                                <a href="https://github.com/Ayush12358/zenfocus" target="_blank" rel="noopener noreferrer" className="hover:text-white/40 transition-colors">
                                    View on GitHub
                                </a>
                                <span>•</span>
                                <span className="hover:text-white/40 cursor-help" title="Open Source">
                                    Apache 2.0 License
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
