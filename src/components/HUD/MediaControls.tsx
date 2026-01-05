import { Play, Pause, SkipBack, SkipForward, Music, Video } from 'lucide-react';

interface MediaControlsProps {
    isPlaying: boolean;
    onTogglePlay: () => void;
    onNext: () => void;
    onPrev: () => void;
    currentTrack: { name: string; type: 'video' | 'audio' } | null;
    trackIndex: number;
    totalTracks: number;
}

export default function MediaControls({
    isPlaying,
    onTogglePlay,
    onNext,
    onPrev,
    currentTrack,
    trackIndex,
    totalTracks
}: MediaControlsProps) {
    if (!currentTrack) return null;

    return (
        <div className="flex flex-col gap-3 bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md shadow-xl w-64">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    {currentTrack.type === 'video' ? <Video size={20} /> : <Music size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate leading-tight" title={currentTrack.name}>
                        {currentTrack.name}
                    </h4>
                    <p className="text-[10px] text-white/40 font-mono mt-0.5">
                        Track {trackIndex + 1} / {totalTracks}
                    </p>
                </div>
            </div>

            {/* Progress Bar Stub (Visual Only for now) */}
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-1/3 opacity-50" />
            </div>

            <div className="flex items-center justify-between px-2">
                <button
                    onClick={onPrev}
                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                >
                    <SkipBack size={20} />
                </button>

                <button
                    onClick={onTogglePlay}
                    className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-900/30 hover:scale-105 active:scale-95"
                >
                    {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current" />}
                </button>

                <button
                    onClick={onNext}
                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                >
                    <SkipForward size={20} />
                </button>
            </div>
        </div>
    );
}
