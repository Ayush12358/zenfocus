import { useState, useEffect, useRef } from 'react';

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
    // ... allows for functional updates and relies on useEffect for persistence.
    const setValue = (value: T | ((val: T) => T)) => {
        setStoredValue(value);
    };

    // Keep a ref to the current value to avoid stale closures in the event listener
    const storedValueRef = useRef(storedValue);
    useEffect(() => {
        storedValueRef.current = storedValue;
    }, [storedValue]);

    // Sync state to local storage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const valueToStore = JSON.stringify(storedValue);
                // Only write if different from what's in LS?
                // Actually, let's just write.
                window.localStorage.setItem(key, valueToStore);
                window.dispatchEvent(new StorageEvent('storage', {
                    key: key,
                    newValue: valueToStore
                }));
            } catch (error) {
                console.log(error);
            }
        }
    }, [storedValue, key]);

    // Handle external storage events
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === key && event.newValue) {
                try {
                    // Prevent circular updates: if the new value is identical to current state, ignore
                    if (event.newValue === JSON.stringify(storedValueRef.current)) {
                        return;
                    }

                    // Avoid infinite loop if the event was triggered by our own write above?
                    // The event listener is on 'window', and StorageEvents from same page don't trigger usually,
                    // BUT we are dispatching manually.
                    // However, we check if newValue is different?
                    // Actually, if we setStoredValue here, it might trigger the persistence effect again...

                    const newValue = JSON.parse(event.newValue);
                    // Simple equality check valid for primitives, costly for deep objects.
                    // For now, let's trust React validation or just set it.
                    // To avoid loops with manual dispatch, we might need a ref to track if WE triggered it.
                    // But manual dispatch event.storageArea is null usually?

                    setStoredValue(newValue);
                } catch (error) {
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
