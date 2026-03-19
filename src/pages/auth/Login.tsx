import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useNavigate, useSearchParams } from 'react-router-dom';

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const resp = await login(username, password);
            if (resp['2fa_required']) {
                setTempToken(resp.temp_token!);
            } else {
                setLoginSuccess(true);
            }
        } catch (error) {
            alert('Login failed');
        }
    };

    const handle2FA = async () => {
        try {
            await verify2FA(tempToken!, code);
            setTempToken(null);
        } catch (error) {
            alert('Invalid 2FA code');
        }
    };

    if (tempToken) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-96">
                    <CardHeader>
                        <CardTitle>Two-Factor Authentication</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm mb-4">Enter the code from your authenticator app.</p>
                        <Input
                            type="text"
                            placeholder="000000"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="mb-4"
                        />
                        <Button onClick={handle2FA} className="w-full">
                            Verify
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="w-96">
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <Button type="submit" className="w-full">
                            Login
                        </Button>
                    </form>
                    <div className="mt-4 space-y-2">
                        <Button variant="outline" className="w-full" onClick={() => loginOAuth('pocketid')}>
                            Login with Pocket ID
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => navigate('/register')}>
                            Register
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}