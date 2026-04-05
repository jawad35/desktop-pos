import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  
  // Root directory for your client app
  root: path.resolve(__dirname, 'client'),
  
  // Important: Makes paths relative for Electron
  base: './',
  
  resolve: {
    alias: {
      // This fixes ALL your @/ imports
      '@': path.resolve(__dirname, 'client', 'src'),
      '@assets': path.resolve(__dirname, 'attached_assets'),
    },
  },
  
  server: {
    port: 5173,
    open: true,
    fs: {
      strict: true,
      deny: ['**/.*'],
    },
  },
  
  build: {
    outDir: path.resolve(__dirname, 'client', 'dist'),
    emptyOutDir: true,
    sourcemap: false,
    // Increase chunk size warning limit (optional)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'client', 'index.html'),
      },
      output: {
        format: 'es',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});