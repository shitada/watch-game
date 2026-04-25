import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/watch-game/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
