import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {useNavigate} from "react-router-dom";

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { register } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await register(username, email, password);
            alert('Registration successful! Please login.');
        } catch (error) {
            alert('Registration failed');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="w-96">
                <CardHeader>
                    <CardTitle>Register</CardTitle>
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
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                            Register
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
                            Back to login
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}