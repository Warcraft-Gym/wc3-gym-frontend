/* global process */
// Clerk's Frontend API served from this domain: the production instance cannot own a
// vercel.app subdomain by DNS, so /__clerk/* is forwarded here (proxy mode).
export const config = { runtime: 'edge' };

const FRONTEND_API = 'https://frontend-api.clerk.dev';

export default async function handler(request) {
    const url = new URL(request.url);
    const path = url.searchParams.get('p') || '';
    url.searchParams.delete('p');

    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.set('Clerk-Proxy-Url', process.env.VITE_CLERK_PROXY_URL);
    headers.set('Clerk-Secret-Key', process.env.CLERK_SECRET_KEY);
    headers.set('X-Forwarded-For', request.headers.get('x-forwarded-for') || '');

    const hasBody = !['GET', 'HEAD'].includes(request.method);
    return fetch(`${FRONTEND_API}/${path}${url.search}`, {
        method: request.method,
        headers,
        body: hasBody ? request.body : undefined,
        duplex: hasBody ? 'half' : undefined,
        redirect: 'manual',
    });
}
