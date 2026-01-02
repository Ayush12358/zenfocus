'use client';

import { useState, useEffect } from 'react';
import { StickyNote, AlertCircle } from 'lucide-react';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface Note {
    name: string; // ID like 'notes/...'
    title: string;
    body: { text: { text: string } };
}

export default function KeepGrid() {
    const { token, isAuthenticated } = useGoogleAuth();
    const [notes, setNotes] = useState<Note[]>([]);
    const [source, setSource] = useState<'google' | 'local'>('google');

    const [localNotes, setLocalNotes] = useLocalStorage<Note[]>('zen_notes_fallback', [
        { name: 'local-1', title: 'Local Note', body: { text: { text: 'This is a local note because Keep API access is restricted.' } } }
    ]);

    useEffect(() => {
        if (isAuthenticated && token) {
            fetchNotes();
        } else {
            setSource('local');
            setNotes(localNotes);
        }
    }, [isAuthenticated, token]);

    const fetchNotes = async () => {
        try {
            const response = await fetch(
                '/api/google/keep.googleapis.com/v1/notes',
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setNotes(data.notes || []);
                setSource('google');
            } else if (response.status === 403) {
                // Fallback on permission error
                console.warn('Keep API 403, switching to local storage');
                setSource('local');
                setNotes(localNotes);
            }
        } catch (error) {
            console.error('Keep API error', error);
            setSource('local');
            setNotes(localNotes);
        }
    };

    const addNote = () => {
        const newNote: Note = {
            name: `local-${Date.now()}`,
            title: '',
            body: { text: { text: '' } }
        };
        const updatedNotes = [newNote, ...localNotes];
        setLocalNotes(updatedNotes);
        setNotes([newNote, ...notes]);
        setSource('local');
    };

    const updateNote = (id: string, field: 'title' | 'body', value: string) => {
        const updated = notes.map(n => {
            if (n.name === id) {
                if (field === 'title') return { ...n, title: value };
                return { ...n, body: { text: { text: value } } };
            }
            return n;
        });
        setNotes(updated);

        // Also update local storage if we are in local mode or these are local notes
        if (source === 'local' || id.startsWith('local-')) {
            const localUpdated = localNotes.map(n => {
                if (n.name === id) {
                    if (field === 'title') return { ...n, title: value };
                    return { ...n, body: { text: { text: value } } };
                }
                return n;
            });
            // If the note wasn't in localNotes (e.g. freshly created in mixed mode), we should ensure it is synced if intended
            // For simplicity, we just sync the 'updated' list back to localNotes if we are in local mode.
            setLocalNotes(updated);
        }
    };

    return (
        <div className="h-full overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <StickyNote size={20} />
                    {source === 'google' ? 'Keep (Read-Only)' : 'Fast Notes'}
                </h2>
                <div className="flex items-center gap-2">
                    {source === 'local' && (
                        <span className="text-xs text-yellow-500 flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded">
                            <AlertCircle size={12} /> Local
                        </span>
                    )}
                    <button
                        onClick={addNote}
                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                        title="Add Note"
                    >
                        +
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar pb-4">
                {notes.map((note) => (
                    <div key={note.name} className="bg-yellow-200/90 text-black p-3 rounded-lg shadow-sm group relative">
                        <input
                            type="text"
                            value={note.title}
                            placeholder="Title"
                            onChange={(e) => updateNote(note.name, 'title', e.target.value)}
                            className="bg-transparent font-bold text-sm mb-1 w-full outline-none placeholder-black/50"
                        />
                        <textarea
                            value={note.body?.text?.text || ''}
                            placeholder="Take a note..."
                            onChange={(e) => updateNote(note.name, 'body', e.target.value)}
                            className="bg-transparent text-xs w-full outline-none resize-none placeholder-black/50 min-h-[60px]"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
