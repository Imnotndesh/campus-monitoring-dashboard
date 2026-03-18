export async function apiFetch(endpoint: string, options?: RequestInit) {
    const baseUrl = localStorage.getItem('server_url') || '';
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    const url = cleanBase ? `${cleanBase}/${cleanEndpoint}` : `/${cleanEndpoint}`;
    const res = await fetch(url, {
        ...options,
        credentials: 'omit',
        headers: {
            'Content-Type': 'application/json',
            ...(options?.headers || {}),
            ...(localStorage.getItem('access_token') ? { Authorization: `Bearer ${localStorage.getItem('access_token')}` } : {}),
        },
    });
    if (!res.ok) {
        const errorText = await res.text().catch(() => res.statusText);
        throw new Error(errorText || res.statusText);
    }
    if (res.status === 204) {
        return {};
    }
    return res.json();
}