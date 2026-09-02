/* eslint-env node */
import { fileURLToPath, URL } from 'url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    server: {
        host: true, // the dev container from `just containers up` publishes 5003
        port: 5003,
        strictPort: true, // Ensures the port is available and does not auto-select another
        proxy: {
            '/api': {
              // `just containers up` sets this to the backend container's name
              target: process.env.VITE_PROXY_TARGET || 'http://localhost:5002',
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
});
