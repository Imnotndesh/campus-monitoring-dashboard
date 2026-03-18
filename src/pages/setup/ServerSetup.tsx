import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

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

    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="w-96">
                <CardHeader>
                    <CardTitle>Connect to Server</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            placeholder="https://your-api.example.com"
                            value={serverUrl}
                            onChange={(e) => setServerUrl(e.target.value)}
                            required
                        />
                        <Button type="submit" className="w-full" disabled={status === 'checking'}>
                            {status === 'checking' ? 'Checking...' : 'Connect'}
                        </Button>
                        {status === 'valid' && (
                            <div className="flex items-center gap-2 text-green-600 text-sm">
                                <CheckCircle2 className="h-4 w-4" /> Server reachable
                            </div>
                        )}
                        {status === 'invalid' && (
                            <div className="flex items-center gap-2 text-destructive text-sm">
                                <AlertCircle className="h-4 w-4" /> Cannot reach server
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}