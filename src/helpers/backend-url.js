// Vite inlines this at build time; unset, it becomes the string "undefined" inside every request URL
const backendUrl = import.meta.env.VITE_BACKEND_URL;

if (!backendUrl) {
    throw new Error('VITE_BACKEND_URL is not set: copy .env.example to .env, or set it on the Vercel project.');
}

export { backendUrl };
