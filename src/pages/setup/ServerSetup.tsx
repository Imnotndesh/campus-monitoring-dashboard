import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Server, Loader2 } from 'lucide-react';

export default function ServerSetup() {
    const [serverUrl, setServerUrl] = useState('');
    const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
    const navigate = useNavigate();

    useEffect(() => {
        const saved = localStorage.getItem('server_url');
        if (saved) {
            setServerUrl(saved);
            checkServer(saved);
        }
    }, []);

    const checkServer = async (url: string): Promise<boolean> => {
        setStatus('checking');
        try {
            const res = await fetch(`${url}/health/live`, { mode: 'cors' });
            const ok = res.ok;
            setStatus(ok ? 'valid' : 'invalid');
            return ok;
        } catch {
            setStatus('invalid');
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const ok = await checkServer(serverUrl);
        if (ok) {
            localStorage.setItem('server_url', serverUrl);
            navigate('/login');
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'checking':
                return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
            case 'valid':
                return <CheckCircle2 className="h-4 w-4 text-green-600" />;
            case 'invalid':
                return <AlertCircle className="h-4 w-4 text-destructive" />;
            default:
                return null;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'checking':
                return 'Checking connection...';
            case 'valid':
                return 'Server reachable';
            case 'invalid':
                return 'Cannot reach server';
            default:
                return '';
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'valid':
                return 'text-green-600';
            case 'invalid':
                return 'text-destructive';
            default:
                return 'text-muted-foreground';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/5 p-4">
            <Card className="w-full max-w-md border-border/40 shadow-xl bg-card/95 backdrop-blur-sm">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Server className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Connect to Server</CardTitle>
                    <CardDescription>Enter your Campus Monitor API endpoint</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="https://your-api.example.com"
                                value={serverUrl}
                                onChange={(e) => setServerUrl(e.target.value)}
                                className="pl-9"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={status === 'checking'}>
                            {status === 'checking' ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                'Connect'
                            )}
                        </Button>
                    </form>
                    {status !== 'idle' && (
                        <div className={`mt-4 flex items-center gap-2 text-sm ${getStatusColor()}`}>
                            {getStatusIcon()}
                            <span>{getStatusText()}</span>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center text-xs text-muted-foreground">
                    Example: http://localhost:8080 or https://api.campusmonitor.com
                </CardFooter>
            </Card>
        </div>
    );
}