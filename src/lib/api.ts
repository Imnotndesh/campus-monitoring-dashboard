export async function apiFetch(endpoint: string, options?: RequestInit) {
    const baseUrl = localStorage.getItem('server_url') || '';
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    const url = cleanBase ? `${cleanBase}/${cleanEndpoint}` : `/${cleanEndpoint}`;

    const token = localStorage.getItem('access_token');
    console.log(`apiFetch: ${endpoint}, token: ${token ? 'present' : 'missing'}`);

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
        console.warn(`apiFetch: 401 on ${endpoint}, attempting token refresh`);
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
            try {
                const refreshRes = await fetch(`${cleanBase}/api/v1/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken }),
                });
                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    localStorage.setItem('access_token', data.access_token);
                    console.log('apiFetch: token refreshed');
                    headers['Authorization'] = `Bearer ${data.access_token}`;
                    res = await fetch(url, { ...options, headers });
                } else {
                    console.error('apiFetch: refresh failed');
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login';
                    throw new Error('Session expired');
                }
            } catch (err) {
                console.error('apiFetch: refresh error', err);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
                throw new Error('Session expired');
            }
        } else {
            console.warn('apiFetch: no refresh token, redirecting to login');
            localStorage.removeItem('access_token');
            window.location.href = '/login';
            throw new Error('Session expired');
        }
    }

    if (!res.ok) {
        const errorText = await res.text().catch(() => res.statusText);
        throw new Error(errorText || res.statusText);
    }

    if (res.status === 204) {
        return {};
    }
    return res.json();
}