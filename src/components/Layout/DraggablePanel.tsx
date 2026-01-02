'use client';

import { useState, useEffect, useRef } from 'react';
import { GripHorizontal } from 'lucide-react';

interface Position {
    x: number;
    y: number;
}

interface DraggablePanelProps {
    id: string; // Unique ID for local storage
    initialPosition: Position;
    children: React.ReactNode;
    className?: string;
    transparency?: number; // 0-100
    blur?: number; // px
}

export default function DraggablePanel({ id, initialPosition, children, className = '', transparency = 40, blur = 16 }: DraggablePanelProps) {
    const [position, setPosition] = useState<Position>(initialPosition);
    const [isDragging, setIsDragging] = useState(false);
    const [offset, setOffset] = useState<Position>({ x: 0, y: 0 });
    const [hasLoaded, setHasLoaded] = useState(false);

    // Load position from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem(`zen_drag_${id}`);
        if (saved) {
            try {
                setPosition(JSON.parse(saved));
            } catch (e) {
                console.error(`Failed to parse position for ${id}`, e);
            }
        }
        setHasLoaded(true);
    }, [id]);

    // Handle Dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const newX = e.clientX - offset.x;
            const newY = e.clientY - offset.y;

            // Optional: Bounds checking could range here, but free movement is often preferred.
            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                // Save to local storage on drop
                localStorage.setItem(`zen_drag_${id}`, JSON.stringify(position));
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, offset, id, position]);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Prevent tearing/selection
        e.preventDefault();
        setIsDragging(true);
        setOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    if (!hasLoaded) return null; // Avoid hydration mismatch or jump

    return (
        <div
            className={`fixed z-50 border border-white/10 rounded-2xl shadow-2xl transition-shadow ${isDragging ? 'cursor-grabbing shadow-white/10 scale-[1.02]' : ''} ${className}`}
            style={{
                left: position.x,
                top: position.y,
                backgroundColor: `rgba(0, 0, 0, ${transparency / 100})`,
                backdropFilter: `blur(${blur}px)`,
                WebkitBackdropFilter: `blur(${blur}px)`
            }}
        >
            {/* Drag Handle */}
            <div
                className="w-full h-6 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-white/5 rounded-t-2xl transition-colors"
                onMouseDown={handleMouseDown}
                title="Drag to move"
            >
                <div className="w-12 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Content */}
            <div className="">
                {children}
            </div>
        </div>
    );
}
