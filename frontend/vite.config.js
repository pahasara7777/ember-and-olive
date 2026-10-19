import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { sourcemap: false }, // do not publish readable source to visitors
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5000' }
  }
});
