'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function Clock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center">
            <h2 className="text-6xl font-bold tracking-tighter text-white">
                {format(time, 'HH:mm')}
            </h2>
            <p className="text-xl text-gray-300 mt-2 font-mono">
                {format(time, 'ss')}s
            </p>
            <p className="text-sm text-gray-400 mt-1 uppercase tracking-widest">
                {format(time, 'EEEE, MMMM do')}
            </p>
        </div>
    );
}
