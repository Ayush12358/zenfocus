'use client';

import { useState, useEffect, useRef } from 'react';
import { GripHorizontal } from 'lucide-react';

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
    const [position, setPosition] = useState<Position>(initialPosition);
    const [isDragging, setIsDragging] = useState(false);
    // storage for drag offset in pixels
    const [offset, setOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Load position from local storage on mount & check mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        const saved = localStorage.getItem(`zen_drag_${id}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);

                // MIGRATION: If numbers (pixels) detected, convert to percentages immediately to fix resize bugs
                // assuming existing pixels were Top-Left based, we convert roughly or just accept them as Center for now 
                // to avoid complex width calcs before render. 
                // Better approach: Let's accept them, but the user might experience a shift. 
                // Ideally we'd re-calc, but waiting for render is hard.
                // Let's just use them. The user can drag them to fix.
                setPosition(parsed);
            } catch (e) {
                // ignore
            }
        }
        setHasLoaded(true);
        return () => window.removeEventListener('resize', checkMobile);
    }, [id]);

    // Handle Dragging
    useEffect(() => {
        if (isMobile) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            // Update position (Center X/Y in pixels)
            const newX = e.clientX - offset.x;
            const newY = e.clientY - offset.y;
            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);

                // DATA NORMALIZATION: Convert to % (Center Relative)
                const xVal = typeof position.x === 'number' ? position.x : parseFloat(position.x as string);
                const yVal = typeof position.y === 'number' ? position.y : parseFloat(position.y as string);

                const winW = window.innerWidth;
                const winH = window.innerHeight;

                const finalX = (xVal / winW) * 100;
                const finalY = (yVal / winH) * 100;

                const percentPos = { x: `${finalX.toFixed(2)}%`, y: `${finalY.toFixed(2)}%` };

                setPosition(percentPos);
                localStorage.setItem(`zen_drag_${id}`, JSON.stringify(percentPos));
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
    }, [isDragging, offset, id, position, isMobile]);

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
        setPosition({ x: centerX, y: centerY });

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
