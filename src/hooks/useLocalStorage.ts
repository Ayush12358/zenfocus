import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
    // State to store our value
    // Pass initial state function to useState so logic is only executed once
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            // Get from local storage by key
            const item = window.localStorage.getItem(key);
            // Parse stored json or if none return initialValue
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            // If error, it might be a raw string (legacy data)
            const item = window.localStorage.getItem(key);
            if (item) return item as unknown as T;
            return initialValue;
        }
    });

    // Return a wrapped version of useState's setter function that ...
    // ... persists the new value to localStorage.
    const setValue = (value: T | ((val: T) => T)) => {
        try {
            // Allow value to be a function so we have same API as useState
            const valueToStore =
                value instanceof Function ? value(storedValue) : value;
            // Save state
            setStoredValue(valueToStore);
            // Save to local storage
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
                // Dispatch a custom event so that the current tab also updates
                // This is relevant if multiple components hook into the same key
                window.dispatchEvent(new StorageEvent('storage', {
                    key: key,
                    newValue: JSON.stringify(valueToStore)
                }));
            }
        } catch (error) {
            // A more advanced implementation would handle the error case
            console.log(error);
        }
    };

    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            // console.log(`[useLocalStorage] Event received: key=${event.key} currentKey=${key}`);
            if (event.key === key && event.newValue) {
                try {
                    // console.log(`[useLocalStorage] Syncing value for ${key}:`, event.newValue);
                    setStoredValue(JSON.parse(event.newValue));
                } catch (error) {
                    // Try using raw value if parse fails
                    setStoredValue(event.newValue as unknown as T);
                }
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('storage', handleStorageChange);
            return () => {
                window.removeEventListener('storage', handleStorageChange);
            };
        }
    }, [key]);

    return [storedValue, setValue] as const;
}
