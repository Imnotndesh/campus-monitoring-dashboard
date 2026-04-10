import { type FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, KeyRound, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchAuthConfig, type AuthConfig } from '../../lib/api';

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlTempToken = searchParams.get('temp_token');

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [tempToken, setTempToken] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [loginSuccess, setLoginSuccess] = useState(false);
    const { user, login, verify2FA, loginOAuth } = useAuth();

    // Fetch dynamic auth config
    const { data: authConfig, isLoading: configLoading, error: configError } = useQuery<AuthConfig>({
        queryKey: ['auth-config'],
        queryFn: fetchAuthConfig,
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });

    // Debug logging
    useEffect(() => {
        if (authConfig) console.log('[Login] Auth config:', authConfig);
        if (configError) console.error('[Login] Auth config error:', configError);
    }, [authConfig, configError]);

    useEffect(() => {
        if (!localStorage.getItem('server_url')) {
            navigate('/setup');
        }
        if (urlTempToken) {
            setTempToken(urlTempToken);
        }
    }, [navigate, urlTempToken]);

    useEffect(() => {
        if (loginSuccess && user) {
            navigate('/');
        }
    }, [loginSuccess, user, navigate]);

    useEffect(() => {
        if (tempToken === null && user) {
            navigate('/');
        }
    }, [tempToken, user, navigate]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const resp = await login(username, password);
            if (resp['2fa_required']) {
                setTempToken(resp.temp_token!);
            } else {
                setLoginSuccess(true);
            }
        } catch (e) {
            alert('Login failed');
        }
    };

    const handle2FA = async () => {
        try {
            await verify2FA(tempToken!, code);
            setTempToken(null);
        } catch (e) {
            alert('Invalid 2FA code');
        }
    };

    // 2FA step – render first
    if (tempToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/5 p-4">
                <Card className="w-full max-w-md border-border/40 shadow-xl bg-card/95 backdrop-blur-sm">
                    <CardHeader className="space-y-1 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <ShieldCheck className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
                        <CardDescription>Enter the code from your authenticator app</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="000000"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="pl-9"
                                    autoFocus
                                />
                            </div>
                            <Button onClick={handle2FA} className="w-full">
                                Verify
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Loading state
    if (configLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Fallback values if config failed to load (assume local login enabled)
    const enableLocalLogin = authConfig?.enable_local_login ?? true;
    const enableRegistration = authConfig?.enable_registration ?? true;
    const oidcProviders = authConfig?.oidc_providers ?? [];

    // If no login methods available after loading
    if (!enableLocalLogin && oidcProviders.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>No Login Methods Available</CardTitle>
                        <CardDescription>Please contact your system administrator.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/5 p-4">
            <Card className="w-full max-w-md border-border/40 shadow-xl bg-card/95 backdrop-blur-sm">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Lock className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Welcome back</CardTitle>
                    <CardDescription>Sign in to your account to continue</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Local login form */}
                    {enableLocalLogin && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="pl-9"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-9"
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                Sign in
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </form>
                    )}

                    {/* Divider if both local and OIDC are present */}
                    {enableLocalLogin && oidcProviders.length > 0 && (
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                            </div>
                        </div>
                    )}

                    {/* OIDC providers */}
                    {oidcProviders.map((provider) => (
                        <Button
                            key={provider.name}
                            variant="outline"
                            className="w-full mt-2"
                            onClick={() => loginOAuth(provider.name)}
                        >
                            Login with {provider.name}
                        </Button>
                    ))}
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                    {enableRegistration && (
                        <div className="text-center text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/register')}>
                                Register
                            </Button>
                        </div>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}