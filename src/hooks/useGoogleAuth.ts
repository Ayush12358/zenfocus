import { useGoogleLogin, TokenResponse } from '@react-oauth/google';
import { useState, useEffect, useCallback } from 'react';

const SCOPES = [
    'https://www.googleapis.com/auth/tasks',
    // 'https://www.googleapis.com/auth/keep', // Restricted scope. API enabled != Scope allowed for personal apps.
    'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

interface AuthState {
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: () => void;
    logout: () => void;
}

export function useGoogleAuth(): AuthState {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load token from sessionStorage on mount
    useEffect(() => {
        const storedToken = sessionStorage.getItem('google_access_token');
        if (storedToken) {
            setToken(storedToken);
        }
        setIsLoading(false);
    }, []);

    const login = useGoogleLogin({
        onSuccess: (tokenResponse: TokenResponse) => {
            setToken(tokenResponse.access_token);
            sessionStorage.setItem('google_access_token', tokenResponse.access_token);
        },
        onError: (errorResponse) => {
            console.error('Login Failed:', errorResponse);
        },
        scope: SCOPES,
        flow: 'implicit', // Token flow
    });

    const logout = useCallback(() => {
        setToken(null);
        sessionStorage.removeItem('google_access_token');
    }, []);

    return {
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
    };
}
