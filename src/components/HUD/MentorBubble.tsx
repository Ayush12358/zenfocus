'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MentorBubbleProps {
    message: string | null;
    onDismiss: () => void;
    type?: 'suggestion' | 'motivation';
}

export default function MentorBubble({ message, onDismiss, type = 'motivation' }: MentorBubbleProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (message) {
            setIsVisible(true);
            // Auto-dismiss motivations after 10s, but keep suggestions until acted upon (or dismissed)
            if (type === 'motivation') {
                const timer = setTimeout(() => {
                    setIsVisible(false);
                    setTimeout(onDismiss, 500); // Wait for exit anim
                }, 10000);
                return () => clearTimeout(timer);
            }
        } else {
            setIsVisible(false);
        }
    }, [message, type, onDismiss]);

    return (
        <AnimatePresence>
            {isVisible && message && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={`absolute -top-24 left-1/2 -translate-x-1/2 z-50 w-64 p-4 rounded-2xl backdrop-blur-xl border shadow-xl flex gap-3 items-start
                        ${type === 'suggestion'
                            ? 'bg-blue-500/20 border-blue-400/30 text-blue-100 shadow-blue-900/20'
                            : 'bg-indigo-500/20 border-indigo-400/30 text-indigo-100 shadow-indigo-900/20'
                        }`}
                >
                    <div className={`mt-1 bg-white/10 p-1.5 rounded-full shrink-0 ${type === 'suggestion' ? 'text-blue-300' : 'text-indigo-300'}`}>
                        <Sparkles size={14} fill="currentColor" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-medium leading-relaxed">
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="opacity-50 hover:opacity-100 transition-opacity"
                    >
                        <X size={14} />
                    </button>

                    {/* Little triangle arrow at bottom */}
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-r border-b backdrop-blur-xl
                        ${type === 'suggestion'
                            ? 'bg-blue-900/10 border-blue-400/30'
                            : 'bg-indigo-900/10 border-indigo-400/30'
                        }`}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
