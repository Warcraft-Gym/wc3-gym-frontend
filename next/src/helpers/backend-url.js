// Next inlines NEXT_PUBLIC_BACKEND_URL at build time, so the member expression stays whole.
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

if (!backendUrl) {
    throw new Error('No backend URL is set: copy .env.example to .env, or set it on the Vercel project.');
}

export { backendUrl };
