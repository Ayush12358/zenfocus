'use client';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { StickyNote, ExternalLink } from 'lucide-react';

export default function NotesWidget() {
    const [notes, setNotes] = useLocalStorage('zen_notes', '');

    return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 w-full h-full flex flex-col text-white">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
                    <StickyNote size={16} /> Notes
                </h3>
                <a
                    href="https://keep.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/30 hover:text-yellow-400 transition-colors"
                    title="Open Google Keep"
                >
                    <ExternalLink size={14} />
                </a>
            </div>

            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type your thoughts here..."
                className="flex-1 w-full bg-transparent resize-none outline-none text-sm text-white/80 placeholder-white/20 leading-relaxed [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
                spellCheck={false}
            />
        </div>
    );
}
