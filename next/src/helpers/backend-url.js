// Next inlines NEXT_PUBLIC_BACKEND_URL, Vite inlines VITE_BACKEND_URL, both at build time.
// The member expression stays whole, because each bundler replaces only that exact text.
const fromNext = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BACKEND_URL : undefined;
const backendUrl = fromNext || import.meta.env?.VITE_BACKEND_URL;

if (!backendUrl) {
    throw new Error('No backend URL is set: copy .env.example to .env, or set it on the Vercel project.');
}

export { backendUrl };
