import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function OAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const tempToken = searchParams.get('temp_token');
        const twoFARequired = searchParams.get('2fa_required');

        if (accessToken && refreshToken) {
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('refresh_token', refreshToken);
            const provider = sessionStorage.getItem('oauth_provider') || 'unknown';
            localStorage.setItem('auth_provider', provider);
            sessionStorage.removeItem('oauth_provider');
            window.location.href = '/';
        } else if (tempToken && twoFARequired) {
            navigate(`/login?temp_token=${tempToken}`);
        } else {
            navigate('/login?error=oauth_failed');
        }
    }, [searchParams, navigate]);

    return <div className="flex items-center justify-center min-h-screen">Processing OAuth callback...</div>;
}