'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function Clock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        // Update every minute is enough now, but 1s keeps it accurate to the switch
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center">
            <h2 className="text-8xl font-bold tracking-tighter text-white drop-shadow-2xl">
                {format(time, 'HH:mm')}
            </h2>
            <p className="text-sm text-gray-300 mt-2 uppercase tracking-[0.3em] font-medium">
                {format(time, 'EEEE, MMMM do')}
            </p>
        </div>
    );
}
