import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': resolve(import.meta.dirname, 'shared'),
      '@bloc': resolve(import.meta.dirname, 'bloc'),
      '@src': resolve(import.meta.dirname, 'src'),
    },
  },
});
