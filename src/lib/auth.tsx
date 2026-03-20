import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api.ts';

interface User {
    id: number;
    username: string;
    email: string;
    role: 'user' | 'admin';
    twoFAEnabled: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<LoginResponse>;
    loginOAuth: (provider: string) => void;
    verify2FA: (tempToken: string, code: string) => Promise<void>;
    logout: () => Promise<void>;
    register: (username: string, email: string, password: string) => Promise<void>;
    refreshToken: () => Promise<void>;
}

interface LoginResponse {
    access_token?: string;
    refresh_token?: string;
    '2fa_required'?: boolean;
    temp_token?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
    const [isLoading, setIsLoading] = useState(true);
    const queryClient = useQueryClient();
    const { data: userData, isError: userError, isSuccess: userSuccess } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            const data = await apiFetch('/api/v1/auth/me', {
                headers: { Authorization: `Bearer ${token}` },
            }) as any;
            return {
                id: data.id,
                username: data.username,
                email: data.email,
                role: data.role,
                twoFAEnabled: data['2fa_enabled'] || false,
            } as User;
        },
        enabled: !!token,
        retry: false,
    });

    useEffect(() => {
        if (userSuccess && userData) {
            setUser(userData);
            setIsLoading(false);
        }
    }, [userSuccess, userData]);

    useEffect(() => {
        if (userError) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('auth_provider');
            setToken(null);
            setIsLoading(false);
        }
    }, [userError]);

    useEffect(() => {
        if (!token) setIsLoading(false);
    }, [token]);
    const refreshUser = async () => {
        const data = await apiFetch('/api/v1/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
        });
        setUser(data);
    };
    const loginMutation = useMutation({
        mutationFn: async (credentials: { username: string; password: string }) => {
            return apiFetch('/api/v1/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials),
            }) as Promise<LoginResponse>;
        },
        onSuccess: (data) => {
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token!);
                localStorage.setItem('auth_provider', 'local');
                setToken(data.access_token);
                queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            }
        },
    });

    const verify2FAMutation = useMutation({
        mutationFn: async ({ tempToken, code }: { tempToken: string; code: string }) => {
            return apiFetch('/api/v1/auth/2fa/verify', {
                method: 'POST',
                body: JSON.stringify({ temp_token: tempToken, code }),
            });
        },
        onSuccess: (data) => {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            localStorage.setItem('auth_provider', 'local');
            setToken(data.access_token);
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        },
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            const refreshToken = localStorage.getItem('refresh_token');
            return apiFetch('/api/v1/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
        },
        onSuccess: () => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setToken(null);
            setUser(null);
            queryClient.clear();
        },
    });

    const registerMutation = useMutation({
        mutationFn: async (data: { username: string; email: string; password: string }) => {
            return apiFetch('/api/v1/auth/register', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
    });

    const refreshTokenMutation = useMutation({
        mutationFn: async () => {
            const refreshToken = localStorage.getItem('refresh_token');
            return apiFetch('/api/v1/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
        },
        onSuccess: (data) => {
            localStorage.setItem('access_token', data.access_token);
            setToken(data.access_token);
        },
    });

    const login = async (username: string, password: string) => {
        return loginMutation.mutateAsync({ username, password });
    };

    const loginOAuth = (provider: string) => {
        const baseUrl = localStorage.getItem('server_url');
        if (!baseUrl) {
            window.location.href = '/setup';
            return;
        }
        sessionStorage.setItem('oauth_provider', provider);
        const postLoginRedirect = encodeURIComponent(window.location.origin + '/oauth/callback');
        window.location.href = `${baseUrl}/api/v1/auth/oauth/${provider}?redirect_uri=${postLoginRedirect}`;
    };

    const verify2FA = async (tempToken: string, code: string) => {
        await verify2FAMutation.mutateAsync({ tempToken, code });
    };

    const logout = async () => {
        // Read provider BEFORE mutating so it isn't cleared by onSuccess first
        const authProvider = localStorage.getItem('auth_provider');

        await logoutMutation.mutateAsync();

        localStorage.removeItem('auth_provider');

        if (authProvider === 'pocketid') {
            const redirectUri = encodeURIComponent(window.location.origin + '/login');
            window.location.href = `https://localhost:1411/api/oidc/end-session?post_logout_redirect_uri=${redirectUri}`;
        }else {
            window.location.href = '/login';
        }
    };

    const register = async (username: string, email: string, password: string) => {
        await registerMutation.mutateAsync({ username, email, password });
    };

    const refreshToken = async () => {
        await refreshTokenMutation.mutateAsync();
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading: isLoading || loginMutation.isPending || verify2FAMutation.isPending,
                login,
                loginOAuth,
                verify2FA,
                logout,
                register,
                refreshToken,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};