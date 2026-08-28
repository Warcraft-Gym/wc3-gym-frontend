import { fileURLToPath, URL } from 'url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// The Vercel alias of a backend branch, which the backend project names after the branch.
const BACKEND_PREVIEW = (branch) =>
    `https://wc3-gym-backend-git-${branch.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-wc-3-gym.vercel.app`;

// A preview build talks to the backend branch of the same name when that branch is deployed,
// so a change that spans both repositories needs no environment variable of its own. Anything
// else, production included, keeps the backend the Vercel project names.
async function pairedBackend() {
    const branch = process.env.VERCEL_GIT_COMMIT_REF;
    if (process.env.VERCEL_ENV !== 'preview' || !branch) return null;
    const url = BACKEND_PREVIEW(branch);
    const answer = await fetch(`${url}/health`, { redirect: 'manual' }).catch(() => null);
    // A protected deployment redirects; only a missing one answers 404
    return answer && answer.status !== 404 ? url : null;
}

// https://vitejs.dev/config/
export default defineConfig(async () => {
    const paired = await pairedBackend();
    if (paired) process.env.VITE_BACKEND_URL = paired;
    return {
    plugins: [vue()],
    server: {
        host: true, // Allow access from outside the container (important for Docker)
        port: 5003, // Matches the port exposed by your Dockerfile
        strictPort: true, // Ensures the port is available and does not auto-select another
        proxy: {
            '/api': {
              target: 'http://localhost:5002',
              changeOrigin: true,
              secure: false,      
              rewrite: path => path.replace(/^\/api/, ''),
            }
          }
      },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    }
    };
});
