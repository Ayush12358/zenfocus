'use client';

import Timer from '@/components/HUD/Timer';
import Clock from '@/components/HUD/Clock';
import GeminiChat from '@/components/HUD/GeminiChat';
import TasksWidget from '@/components/HUD/TasksWidget';
import NotesWidget from '@/components/HUD/NotesWidget';
import DraggablePanel from '@/components/Layout/DraggablePanel';
import { GoogleTasksService } from '@/services/GoogleTasksService';
import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Eye, EyeOff, Plus, Droplets, Bell, ArrowDownAZ, UploadCloud, Speaker, ArrowUp, ArrowDown, MousePointer2, Lock, Sparkles, CheckSquare, StickyNote, Play, Pause, SkipBack, SkipForward, Settings, LinkIcon, AlertCircle, History, Layers, FolderOpen, Trash2, Upload, Key, Download, Minimize, Maximize, Maximize2, Brain, Coffee, Zap, Globe, Music, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { get, set, del } from 'idb-keyval';

import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';
import React from 'react';

const DEFAULT_VIDEO_ID = 'jfKfPfyJRdk'; // Lofi Girl

const RECOMMENDED_VIDEOS = [
    {
        id: 'jfKfPfyJRdk',
        title: 'Lofi Girl - Live',
        category: 'Lofi',
        thumbnailId: 'jfKfPfyJRdk'
    },
    {
        id: 'playlist:PL8ltyl0rAtoO4vZiGROGEflYt487oUJnA',
        title: 'Puuung - Loop Animation',
        category: 'ASMR',
        thumbnailId: 'tNkZsRW7h2c' // Space Ambient (visual loop)
    },
    {
        id: 'playlist:PLT2SxfOu0NtRzJ_HfgI4zIN-RfO6jvc1j',
        title: 'MONOMAN - Meditation Music',
        category: 'Ambient',
        thumbnailId: 'VNu15Qqomt8' // American Nature Relaxation Film (Verified)
    },
    {
        id: 'playlist:PL8ltyl0rAtoOUWE4H8a1XnrHq8WqI0GHN',
        title: 'Puuung - Healing animation with music',
        category: 'Relaxing',
        thumbnailId: 'DWcJFNfaw9c' // Lofi Girl Sleep Stream (Verified)
    }
];

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
    const [showGeminiChat, setShowGeminiChat] = useState(false);
    const [error, setError] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // UI Settings
    const [transparency, setTransparency] = useLocalStorage('zen_ui_transparency', 40); // 0-100
    const [blur, setBlur] = useLocalStorage('zen_ui_blur', 16); // 0-40px
    const [showQuickLinks, setShowQuickLinks] = useLocalStorage('zen_ui_show_quicklinks', false);

    const [uiHidden, setUiHidden] = useLocalStorage('zen_ui_hidden', false);
    const [orientation, setOrientation] = useLocalStorage<'auto' | 'horizontal' | 'vertical'>('zen_ui_orientation', 'auto');

    const [showTasks, setShowTasks] = useLocalStorage('zen_show_tasks', false);
    const [showNotes, setShowNotes] = useLocalStorage('zen_show_notes', false);

    // AI Settings
    const [apiKey, setApiKey] = useLocalStorage('zen_gemini_api_key', '');
    const [modelName, setModelName] = useLocalStorage('zen_gemini_model', 'gemini-flash-lite-latest');
    const [googleClientId, setGoogleClientId] = useLocalStorage('zen_google_client_id', '');
    const [aiContext, setAiContext] = useLocalStorage('zen_ai_context', '');
    const [autoplay, setAutoplay] = useLocalStorage('zen_video_autoplay', false);
    // Background Mode Split
    // User wants: YouTube, Local Media (with Image/Audio/Video support).

    // 1.  **State**:
    const [backgroundMode, setBackgroundMode] = useLocalStorage<'youtube' | 'local_media'>('zen_background_mode', 'youtube');

    // Local Media State (Session only)
    const [localImage, setLocalImage] = useState<{ url: string; name: string } | null>(null);

    // Initial Load for Image Persistence & Cleanup
    useEffect(() => {
        get('zen_background_image').then((file) => {
            if (file) {
                const url = URL.createObjectURL(file);
                setLocalImage({ url, name: file.name || 'Saved Background' });
            }
        });
    }, []);

    // Cleanup Local Image Memory
    useEffect(() => {
        return () => {
            if (localImage) {
                URL.revokeObjectURL(localImage.url);
            }
        };
    }, [localImage]);
    const [playlist, setPlaylist] = useState<Array<{ url: string; type: 'video' | 'audio'; name: string }>>([]);

    // Ref to track playlist for unmount cleanup
    const playlistRef = React.useRef(playlist);
    useEffect(() => {
        playlistRef.current = playlist;
    }, [playlist]);

    // Cleanup Playlist Memory on Unmount
    useEffect(() => {
        return () => {
            playlistRef.current.forEach(file => URL.revokeObjectURL(file.url));
        };
    }, []);

    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const mediaRef = React.useRef<HTMLMediaElement | null>(null);
    const youTubeRef = React.useRef<YouTubePlayer | null>(null);

    const [resumeHandleName, setResumeHandleName] = useState<string | null>(null);

    useEffect(() => {
        // Check for saved playlist blobs
        get('zen_local_playlist_files').then((savedFiles) => {
            if (savedFiles && Array.isArray(savedFiles) && savedFiles.length > 0) {
                const reconstructedPlaylist = savedFiles.map((file: any) => {
                    if (!file.blob) {
                        return null;
                    }
                    return {
                        url: URL.createObjectURL(file.blob),
                        type: file.type,
                        name: file.name
                    };
                }).filter(Boolean) as Array<{ url: string; type: 'video' | 'audio'; name: string }>;

                if (reconstructedPlaylist.length > 0) {
                    setPlaylist(reconstructedPlaylist);
                    setResumeHandleName(savedFiles.length > 1 ? `${savedFiles.length} Files Saved` : "Saved Session");
                }
            }
        }).catch(err => console.error("[Persistence] Error loading saved playlist:", err));

        if (googleClientId) {
            GoogleTasksService.initClient(googleClientId).catch(console.error);
        }
    }, [googleClientId]);

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

    // Sync Playback State on Mode Change
    useEffect(() => {
        setIsPlaying(false);
    }, [backgroundMode]);

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
                const fullId = `playlist:${result.id}`;
                setVideoId(fullId);
                addToHistory(fullId);
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

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        setLocalImage({ url, name: file.name });

        // Auto-enable overlay when new image selected
        setBackgroundMode('local_media');

        // Persist
        set('zen_background_image', file).catch(err => console.error("Failed to save image:", err));
    };

    const sortAndPlayFiles = (files: Array<{ url: string; type: 'video' | 'audio'; name: string }>) => {
        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        setPlaylist(files);
        setCurrentTrackIndex(0);
        setBackgroundMode('local_media');
    };

    // Unified File Handler
    const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        // Get existing blobs from IDB to append to
        let currentBlobs: Array<{ name: string; type: 'video' | 'audio'; blob: Blob }> = [];
        try {
            const saved = await get('zen_local_playlist_files');
            if (saved && Array.isArray(saved)) {
                currentBlobs = saved;
            }
        } catch (err) {
            console.error("Error retrieving existing playlist:", err);
        }

        const newMediaFiles: Array<{ url: string; type: 'video' | 'audio'; name: string }> = [];
        const newBlobs: Array<{ name: string; type: 'video' | 'audio'; blob: Blob }> = [];

        Array.from(files).forEach(file => {
            if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
                const type = file.type.startsWith('video/') ? 'video' : 'audio';
                newMediaFiles.push({
                    url: URL.createObjectURL(file), // For immediate playback
                    type: type,
                    name: file.name
                });
                newBlobs.push({
                    name: file.name,
                    type: type,
                    blob: file // File is a Blob
                });
            }
        });

        if (newMediaFiles.length > 0) {
            // Append to state
            const updatedPlaylist = [...playlist, ...newMediaFiles];
            setPlaylist(updatedPlaylist);

            // Append to IDB
            const updatedBlobs = [...currentBlobs, ...newBlobs];

            set('zen_local_playlist_files', updatedBlobs).then(() => {
                setResumeHandleName(updatedBlobs.length > 1 ? `${updatedBlobs.length} Files Saved` : "Saved Session");
            }).catch(err => console.error("Failed to save playlist to IDB:", err));

            setBackgroundMode('local_media');
            if (playlist.length === 0) {
                setCurrentTrackIndex(0);
                setIsPlaying(true);
            }
        } else {
            alert("No audio or video files found.");
        }
    };

    const removeFromPlaylist = async (index: number) => {
        // Revoke URL for the removed item
        if (playlist[index]) {
            URL.revokeObjectURL(playlist[index].url);
        }

        // Update State
        const newPlaylist = [...playlist];
        newPlaylist.splice(index, 1);
        setPlaylist(newPlaylist);

        // Adjust current track index if needed
        if (currentTrackIndex === index) {
            setIsPlaying(false); // Stop if current is removed
            if (newPlaylist.length > 0) {
                setCurrentTrackIndex(index % newPlaylist.length);
            }
        } else if (currentTrackIndex > index) {
            setCurrentTrackIndex(currentTrackIndex - 1);
        }

        // Update IDB
        try {
            const saved = await get('zen_local_playlist_files');
            if (saved && Array.isArray(saved)) {
                const newBlobs = [...saved];
                newBlobs.splice(index, 1);
                await set('zen_local_playlist_files', newBlobs);
                setResumeHandleName(newBlobs.length > 0 ? (newBlobs.length > 1 ? `${newBlobs.length} Files Saved` : "Saved Session") : null);
            }
        } catch (err) {
            console.error("Error removing file from IDB:", err);
        }
    };

    const moveTrack = async (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === playlist.length - 1)) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap in State
        const newPlaylist = [...playlist];
        [newPlaylist[index], newPlaylist[newIndex]] = [newPlaylist[newIndex], newPlaylist[index]];
        setPlaylist(newPlaylist);

        // Update Current Track Index if moved
        if (currentTrackIndex === index) setCurrentTrackIndex(newIndex);
        else if (currentTrackIndex === newIndex) setCurrentTrackIndex(index);

        // Swap in IDB
        try {
            const saved = await get('zen_local_playlist_files');
            if (saved && Array.isArray(saved)) {
                const newBlobs = [...saved];
                [newBlobs[index], newBlobs[newIndex]] = [newBlobs[newIndex], newBlobs[index]];
                await set('zen_local_playlist_files', newBlobs);
            }
        } catch (err) {
            console.error("Error reordering files in IDB:", err);
        }
    };

    const clearPlaylist = async () => {
        // Revoke all URLs to prevent memory leaks
        playlist.forEach(file => URL.revokeObjectURL(file.url));
        setPlaylist([]);
        setResumeHandleName(null);
        setIsPlaying(false);
        try {
            await del('zen_local_playlist_files');
        } catch (err) {
            console.error("Error clearing playlist:", err);
        }
    };

    const clearAllMedia = async () => {
        // Clear Image
        if (localImage) {
            URL.revokeObjectURL(localImage.url);
            setLocalImage(null);
            await del('zen_background_image');
        }
        // Clear Playlist
        await clearPlaylist();
    };

    const togglePlay = () => {
        if (backgroundMode === 'youtube' && youTubeRef.current) {
            // YouTube Control
            if (isPlaying) {
                youTubeRef.current.pauseVideo();
            } else {
                youTubeRef.current.playVideo();
            }
        } else if (mediaRef.current) {
            // Local Media Control
            if (mediaRef.current.paused) {
                mediaRef.current.play();
                setIsPlaying(true);
            } else {
                mediaRef.current.pause();
                setIsPlaying(false);
            }
        }
    };

    const playNext = () => {
        if (backgroundMode === 'youtube') {
            youTubeRef.current?.nextVideo();
        } else {
            setCurrentTrackIndex(prev => (prev + 1) % playlist.length);
            setIsPlaying(true); // Auto-play on skip
        }
    };

    const playPrevious = () => {
        if (backgroundMode === 'youtube') {
            youTubeRef.current?.previousVideo();
        } else {
            setCurrentTrackIndex(prev => (prev - 1 + playlist.length) % playlist.length);
            setIsPlaying(true);
        }
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

    const handleExportSettings = () => {
        const EXPORT_KEYS = [
            'zen_video_id', 'zen_ui_transparency', 'zen_ui_blur', 'zen_ui_show_quicklinks',
            'zen_ui_hidden', 'zen_ui_orientation', 'zen_show_tasks', 'zen_show_notes',
            'zen_gemini_api_key', 'zen_gemini_model', 'zen_google_client_id',
            'zen_quick_links', 'zen_timer_durations', 'zen_long_break_interval',
            'zen_notifications_enabled', 'zen_ai_context', 'zen_tasks', 'zen_notes',
            'zen_video_autoplay', 'zen_background_mode'
        ];

        const exportData: Record<string, any> = {};
        EXPORT_KEYS.forEach(key => {
            const val = window.localStorage.getItem(key);
            if (val !== null) exportData[key] = val;
        });

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zenfocus_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                if (!text) return;
                const data = JSON.parse(text);

                // Validate generic structure (check for at least one known key)
                if (typeof data !== 'object') throw new Error("Invalid format");

                Object.keys(data).forEach(key => {
                    // Only import known keys to avoid polluting storage
                    if (key.startsWith('zen_')) {
                        window.localStorage.setItem(key, data[key]);
                    }
                });

                // Force reload to apply changes (simplest way to sync all hooks)
                window.location.reload();
            } catch (err) {
                console.error("Import failed", err);
                alert("Failed to import settings. Invalid file.");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
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

    const initialHUDPos = { x: '50%', y: '50%' };

    return (
        <div className="h-[100dvh] w-screen bg-black overflow-hidden relative text-white flex flex-col lg:block overflow-y-auto lg:overflow-hidden">
            {/* Background Video */}
            <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
                {/* 1. Underlying Background (Video/Image) */}
                {backgroundMode === 'youtube' && (
                    <div className="absolute inset-0 pointer-events-none opacity-100">
                        <YouTube
                            videoId={videoId.startsWith('playlist:') ? undefined : videoId}
                            opts={{
                                height: '100%',
                                width: '100%',
                                playerVars: {
                                    autoplay: autoplay ? 1 : 0,
                                    controls: 0, // Hide native controls
                                    showinfo: 0,
                                    rel: 0,
                                    loop: 1,
                                    playlist: videoId.startsWith('playlist:') ? videoId.split(':')[1] : videoId,
                                    listType: videoId.startsWith('playlist:') ? 'playlist' : undefined,
                                    list: videoId.startsWith('playlist:') ? videoId.split(':')[1] : undefined,
                                },
                            }}
                            className="w-full h-full transition-transform duration-1000 scale-[1.35]"
                            iframeClassName="w-full h-full object-cover"
                            onReady={(event) => {
                                youTubeRef.current = event.target;
                                if (autoplay) {
                                    event.target.playVideo();
                                }
                            }}
                            onStateChange={(event) => {
                                // Sync state: 1 = Playing, 2 = Paused
                                if (event.data === 1) setIsPlaying(true);
                                if (event.data === 2) setIsPlaying(false);
                            }}
                        />
                    </div>
                )}

                {backgroundMode === 'local_media' && (
                    <div className="absolute inset-0 z-0 bg-black">

                        {/* Layer 1: Video Player */}
                        {playlist.length > 0 && playlist[currentTrackIndex] && (
                            <video
                                ref={mediaRef as React.RefObject<HTMLVideoElement>}
                                key={playlist[currentTrackIndex].url}
                                src={playlist[currentTrackIndex].url}
                                autoPlay={autoplay || isPlaying}
                                muted={false}
                                loop={false} // Handled by onEnded
                                className="w-full h-full object-cover"
                                onEnded={playNext}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                            />
                        )}

                        {/* Layer 2: Image Overlay (Show if Audio or No Media) */}
                        {localImage && (playlist.length === 0 || playlist[currentTrackIndex]?.type === 'audio') && (
                            <div className="absolute inset-0 z-10 animate-fade-in">
                                <img src={localImage.url} alt="Background" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20" />
                            </div>
                        )}

                        {/* Empty State */}
                        {!localImage && playlist.length === 0 && (
                            <div className="z-10 text-white/20 flex flex-col items-center gap-4">
                                <div className="flex gap-4">
                                    <UploadCloud size={32} />
                                    <Maximize2 size={32} />
                                </div>
                                <p className="text-lg">Set Image or Media in Settings</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Global Dimmer */}
                <div className="absolute inset-0 bg-black/20 pointer-events-none z-20" />
            </div>

            {/* Content Container Stub */}
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

                                    {/* Media Controls (Inline) */}
                                    <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
                                        <button
                                            onClick={playPrevious}
                                            className="p-1.5 hover:bg-white/10 text-white/50 hover:text-white rounded-lg transition-colors"
                                            title="Previous"
                                        >
                                            <SkipBack size={16} />
                                        </button>
                                        <button
                                            onClick={togglePlay}
                                            className="p-1.5 hover:bg-white/10 text-white/80 hover:text-white rounded-lg transition-colors"
                                            title={isPlaying ? "Pause" : "Play"}
                                        >
                                            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                                        </button>
                                        <button
                                            onClick={playNext}
                                            className="p-1.5 hover:bg-white/10 text-white/50 hover:text-white rounded-lg transition-colors"
                                            title="Next"
                                        >
                                            <SkipForward size={16} />
                                        </button>
                                    </div>

                                    {/* Gemini Toggle (New) */}
                                    <button
                                        onClick={() => setShowGeminiChat(!showGeminiChat)}
                                        className={`p-2 rounded-xl transition-all group relative ${showGeminiChat ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'hover:bg-white/10 text-indigo-300 hover:text-indigo-100'}`}
                                        title="AI Commander"
                                    >
                                        <Sparkles size={20} className={showGeminiChat ? 'fill-white' : ''} />
                                    </button>

                                    {/* Divider */}
                                    <div className="h-4 w-px bg-white/10" />

                                    {/* App Links */}
                                    {/* Native Tools */}
                                    <div className="h-4 w-px bg-white/10" />

                                    <button
                                        onClick={() => setShowTasks(!showTasks)}
                                        className={`p-2 rounded-xl transition-all group relative ${showTasks ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/50 hover:text-white'}`}
                                        title="Tasks"
                                    >
                                        <CheckSquare size={20} />
                                    </button>

                                    <button
                                        onClick={() => setShowNotes(!showNotes)}
                                        className={`p-2 rounded-xl transition-all group relative ${showNotes ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/50 hover:text-white'}`}
                                        title="Notes"
                                    >
                                        <StickyNote size={20} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </DraggablePanel>

                {/* Tasks Panel */}
                {
                    showTasks && !uiHidden && (
                        <DraggablePanel id="zen_tasks" initialPosition={{ x: '20%', y: '50%' }} transparency={transparency} blur={blur} className="pointer-events-auto">
                            <div className="w-[300px] h-[400px]">
                                <TasksWidget />
                            </div>
                        </DraggablePanel>
                    )
                }

                {/* Notes Panel */}
                {
                    showNotes && !uiHidden && (
                        <DraggablePanel id="zen_notes" initialPosition={{ x: '80%', y: '50%' }} transparency={transparency} blur={blur} className="pointer-events-auto">
                            <div className="w-[300px] h-[400px]">
                                <NotesWidget />
                            </div>
                        </DraggablePanel>
                    )
                }



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

            </div >

            {/* FULLSCREEN SETTINGS OVERLAY */}
            {
                showSettings && (
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
                                                                    className="w-full h-full object-cover opacity-80"
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

                            {/* AI Settings */}
                            <div className="mb-8">
                                <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-white/50 border-b border-white/10 pb-2">AI Configuration</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-white/70 mb-2 block font-medium">Google Client ID (For Tasks Sync)</label>
                                        <input
                                            type="text"
                                            value={googleClientId}
                                            onChange={(e) => setGoogleClientId(e.target.value)}
                                            placeholder="...apps.googleusercontent.com"
                                            className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm border border-white/5 outline-none focus:border-indigo-500/50 transition-all font-mono"
                                        />
                                        <p className="text-[10px] text-white/30 mt-1 pl-1">Optional. Required for syncing with Google Tasks.</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/70 mb-2 block font-medium">Google Gemini API Key</label>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                placeholder="AIzaSy..."
                                                className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm border border-white/5 outline-none focus:border-indigo-500/50 transition-all font-mono"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20">
                                                <Key size={14} />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-white/30 mt-1 pl-1">Required for Focus Partner features.</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/70 mb-2 block font-medium">Gemini Model ID</label>
                                        <input
                                            type="text"
                                            value={modelName}
                                            onChange={(e) => setModelName(e.target.value)}
                                            placeholder="gemini-flash-lite-latest"
                                            className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm border border-white/5 outline-none focus:border-indigo-500/50 transition-all font-mono"
                                        />
                                        <p className="text-[10px] text-white/30 mt-1 pl-1">Default: gemini-flash-lite-latest</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/70 mb-2 block font-medium">Personal AI Context (Memory)</label>
                                        <textarea
                                            value={aiContext}
                                            onChange={(e) => setAiContext(e.target.value)}
                                            placeholder="Example: I am a medical student. Please help me focus on memorization and summarizing complex topics..."
                                            className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm border border-white/5 outline-none focus:border-indigo-500/50 transition-all font-mono min-h-[100px] resize-y"
                                        />
                                        <p className="text-[10px] text-white/30 mt-1 pl-1">Tell the AI about your goals, habits, or role to get better help.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Data & Backup */}
                            <div className="mb-8">
                                <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-white/50 border-b border-white/10 pb-2">Data & Backup</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={handleExportSettings}
                                        className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group"
                                    >
                                        <div className="p-3 rounded-full bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all">
                                            <Download size={24} />
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm font-bold text-white block">Export Config</span>
                                            <span className="text-[10px] text-white/40">Save settings to JSON</span>
                                        </div>
                                    </button>

                                    <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group cursor-pointer">
                                        <div className="p-3 rounded-full bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 group-hover:scale-110 transition-all">
                                            <UploadCloud size={24} />
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm font-bold text-white block">Import Config</span>
                                            <span className="text-[10px] text-white/40">Restore from JSON</span>
                                        </div>
                                        <input
                                            type="file"
                                            accept=".json"
                                            className="hidden"
                                            onChange={handleImportSettings}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Video Settings */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-white/50 border-b border-white/10 pb-2">Background</h3>

                                {/* Mode Switcher */}
                                <div className="flex bg-white/5 p-1 rounded-xl mb-6 gap-1">
                                    <button
                                        onClick={() => setBackgroundMode('youtube')}
                                        className={`flex-1 py-3 text-xs font-medium rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 ${backgroundMode === 'youtube' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <Play size={16} /> YouTube
                                    </button>
                                    <button
                                        onClick={() => setBackgroundMode('local_media')}
                                        className={`flex-1 py-3 text-xs font-medium rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 ${backgroundMode === 'local_media' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <div className="flex gap-1">
                                            <UploadCloud size={14} />
                                            <Maximize2 size={14} />
                                        </div>
                                        Image & Media
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${autoplay ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                                            <Play size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-white/90">Autoplay Media</div>
                                            <div className="text-[10px] text-white/40">Start playback automatically</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setAutoplay(!autoplay)}
                                        className={`w-10 h-6 rounded-full transition-colors relative ${autoplay ? 'bg-green-500' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${autoplay ? 'translate-x-4' : ''}`} />
                                    </button>
                                </div>

                                {backgroundMode === 'youtube' && (
                                    <>
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
                                                {/* History rendering */}
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

                                        {/* Recommended Videos */}
                                        <div className="mt-6">
                                            <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <Sparkles size={12} /> Recommended
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {RECOMMENDED_VIDEOS.map((video) => (
                                                    <button
                                                        key={video.id}
                                                        onClick={() => {
                                                            setVideoId(video.id);
                                                            if (video.id.startsWith('playlist:')) {
                                                                addToHistory(video.id);
                                                            } else {
                                                                addToHistory(video.id);
                                                            }
                                                        }}
                                                        className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-all text-left group border border-transparent hover:border-white/5"
                                                    >
                                                        <div className="w-10 h-10 rounded-lg bg-black/50 overflow-hidden relative shrink-0">
                                                            <img
                                                                src={`https://img.youtube.com/vi/${video.thumbnailId || (video.id.startsWith('playlist:') ? 'jfKfPfyJRdk' : video.id)}/hqdefault.jpg`}
                                                                // Fix: I will update the constant to include a `thumbnail` field (video id for thumbnail).
                                                                alt={video.title}
                                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                            />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-[10px] text-white/40 mb-0.5">{video.category}</div>
                                                            <div className="text-xs font-medium text-white/80 truncate">{video.title}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {backgroundMode === 'local_media' && (
                                    <div className="flex flex-col gap-4">

                                        {/* Image Controls */}
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-4">

                                            {/* Header */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-blue-400">
                                                    <UploadCloud size={18} />
                                                    <span className="text-sm font-medium">Background Image</span>
                                                </div>
                                            </div>

                                            {/* Image Upload/Status */}
                                            <div className="relative p-6 border border-dashed border-white/10 rounded-xl bg-black/20 hover:bg-black/40 transition-colors flex flex-col items-center justify-center gap-2 group">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageSelect}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                                />

                                                {!localImage ? (
                                                    <>
                                                        <div className="p-3 bg-white/5 rounded-full text-white/40 group-hover:text-white group-hover:bg-white/10 transition-all">
                                                            <Upload size={20} />
                                                        </div>
                                                        <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors">Click to Upload Image</span>
                                                    </>
                                                ) : (
                                                    <div className="w-full flex items-center gap-4 z-10">
                                                        <div className="w-12 h-12 rounded-lg bg-cover bg-center shrink-0 border border-white/10" style={{ backgroundImage: `url(${localImage.url})` }} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs text-white/40">Active Image</div>
                                                            <div className="text-sm text-white truncate">{localImage.name}</div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLocalImage(null);
                                                                del('zen_background_image'); // Clear from IDB
                                                            }}
                                                            className="p-2 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-lg z-30 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="h-px bg-white/5 w-full" />

                                        {/* Media Playlist Controls */}
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-4">
                                            <div className="flex items-center gap-2 text-purple-400 mb-2">
                                                <Maximize2 size={18} />
                                                <span className="text-sm font-medium">Local Media Playlist</span>
                                            </div>

                                            <div className="flex flex-col items-center justify-center p-6 bg-black/20 rounded-xl border border-white/5 border-dashed relative">
                                                {playlist.length === 0 ? (
                                                    <>
                                                        <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400 mb-3 animate-bounce">
                                                            <FolderOpen size={24} />
                                                        </div>
                                                        <div className="text-center mb-4">
                                                            <h4 className="text-sm font-medium text-white mb-0.5">Select Video Files</h4>
                                                            <p className="text-[10px] text-white/40">MP4, WEBM, MKV</p>
                                                        </div>

                                                        <div className="flex gap-2 w-full z-20">
                                                            <div className="relative flex-1">
                                                                <button className="flex items-center justify-center gap-2 w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all text-xs font-medium">
                                                                    <Layers size={14} /> Folder
                                                                </button>
                                                                {/* @ts-ignore */}
                                                                <input type="file" {...{ "webkitdirectory": "", "directory": "" }} onChange={handleMediaSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                            </div>
                                                            <div className="relative flex-1">
                                                                <button className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-xs font-medium border border-white/10">
                                                                    <FolderOpen size={14} /> Files
                                                                </button>
                                                                <input type="file" multiple accept="video/*" onChange={handleMediaSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col w-full">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2 text-purple-400">
                                                                <Maximize2 size={16} />
                                                                <span className="text-xs font-bold uppercase tracking-wider">{playlist.length} Tracks</span>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <div className="relative">
                                                                    <div className="p-1.5 hover:bg-white/10 rounded cursor-pointer text-white/60 hover:text-white transition-colors">
                                                                        <Plus size={14} />
                                                                    </div>
                                                                    <input type="file" multiple accept="video/*" onChange={handleMediaSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                                </div>
                                                                <button onClick={clearPlaylist} className="p-1.5 hover:bg-red-500/20 rounded text-white/60 hover:text-red-400 transition-colors">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="w-full max-h-32 overflow-y-auto bg-black/20 rounded-lg p-2 text-xs space-y-1 custom-scrollbar">
                                                            {playlist.map((track, i) => (
                                                                <div key={i} className={`flex items-center gap-2 p-1.5 rounded group hover:bg-white/5 ${i === currentTrackIndex ? 'bg-white/10 text-white' : 'text-white/40'}`}>
                                                                    {i === currentTrackIndex ? <Play size={10} className="fill-current shrink-0" /> : <span className="w-2.5 shrink-0" />}
                                                                    <div className="flex-1 truncate cursor-pointer" onClick={() => { setCurrentTrackIndex(i); setIsPlaying(true); }}>
                                                                        {track.name}
                                                                    </div>
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button onClick={(e) => { e.stopPropagation(); moveTrack(i, 'up'); }} className="p-1 hover:text-white disabled:opacity-30" disabled={i === 0}><ArrowUp size={10} /></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); moveTrack(i, 'down'); }} className="p-1 hover:text-white disabled:opacity-30" disabled={i === playlist.length - 1}><ArrowDown size={10} /></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); removeFromPlaylist(i); }} className="p-1 hover:text-red-400"><X size={10} /></button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-full">
                                            <button
                                                onClick={clearAllMedia}
                                                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/10 hover:border-red-500/30 transition-all flex items-center justify-center gap-2 text-xs font-medium group"
                                            >
                                                <Trash2 size={16} className="group-hover:scale-110 transition-transform" /> Delete All Media
                                            </button>
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
                        </div >
                    </div >
                )
            }
            <GeminiChat isOpen={showGeminiChat} onClose={() => setShowGeminiChat(false)} />
        </div >
    );
}
