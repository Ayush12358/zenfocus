'use client';

import { useState, useEffect, useRef } from 'react';
import { GripHorizontal } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface Position {
    x: number | string;
    y: number | string;
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
    const [storedPosition, setStoredPosition] = useLocalStorage<Position>(`zen_drag_${id}`, initialPosition);
    const [dragPosition, setDragPosition] = useState<Position | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    // storage for drag offset in pixels
    const [offset, setOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Active position is the drag one if dragging, else the stored (synced) one
    const position = dragPosition || storedPosition;

    // Load position from local storage on mount & check mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        setHasLoaded(true);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Handle Dragging
    useEffect(() => {
        if (isMobile) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            // Update position (Center X/Y in pixels)
            const newX = e.clientX - offset.x;
            const newY = e.clientY - offset.y;
            setDragPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);

                // Check if we have a drag position to commit
                if (dragPosition) {
                    // DATA NORMALIZATION: Convert to % (Center Relative)
                    const xVal = typeof dragPosition.x === 'number' ? dragPosition.x : parseFloat(dragPosition.x as string);
                    const yVal = typeof dragPosition.y === 'number' ? dragPosition.y : parseFloat(dragPosition.y as string);

                    const winW = window.innerWidth;
                    const winH = window.innerHeight;

                    const finalX = (xVal / winW) * 100;
                    const finalY = (yVal / winH) * 100;

                    const percentPos = { x: `${finalX.toFixed(2)}%`, y: `${finalY.toFixed(2)}%` };

                    // Commit to storage (syncs)
                    setStoredPosition(percentPos);
                    // Clear local drag state
                    setDragPosition(null);
                }
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
    }, [isDragging, offset, id, dragPosition, storedPosition, isMobile, setStoredPosition]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isMobile) return;
        e.preventDefault();

        const target = e.currentTarget.parentElement as HTMLElement;
        const rect = target.getBoundingClientRect();

        // CALCULATE CENTER:
        // rect.left is the visual left edge.
        // We want 'position' to represent the Center.
        // CenterX = rect.left + (width / 2)
        const centerX = rect.left + (rect.width / 2);
        const centerY = rect.top + (rect.height / 2);

        // Snapping: Set exact pixel center to avoid visual jump
        setDragPosition({ x: centerX, y: centerY });

        // Offset is distance from Mouse to Center
        setOffset({
            x: e.clientX - centerX,
            y: e.clientY - centerY
        });

        setIsDragging(true);
    };

    if (!hasLoaded) return null;

    // Mobile: Static Layout (Centered Stack)
    if (isMobile) {
        return (
            <div
                className={`w-full max-w-sm mx-auto mb-4 border border-white/10 rounded-2xl shadow-xl backdrop-blur-md pointer-events-auto ${className}`}
                style={{
                    backgroundColor: `rgba(0, 0, 0, ${transparency / 100})`,
                }}
            >
                {/* No Drag Handle on Mobile */}
                <div className="pt-4">
                    {children}
                </div>
            </div>
        );
    }

    // Desktop: Draggable Absolute Layout
    return (
        <div
            className={`fixed z-50 border border-white/10 rounded-2xl shadow-2xl transition-shadow pointer-events-auto ${isDragging ? 'cursor-grabbing shadow-white/10 scale-[1.02]' : ''} ${className}`}
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -50%)', // ENFORCE CENTERING
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
