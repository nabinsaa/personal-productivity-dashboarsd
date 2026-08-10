import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production' || process.env.NODE_ENV === 'production';
  const isHmrDisabled = process.env.DISABLE_HMR === 'true' || isProduction;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('@google/genai')) {
                return 'vendor-genai';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('html2canvas') || id.includes('jspdf') || id.includes('dompurify') || id.includes('purify')) {
                return 'vendor-pdf';
              }
              if (id.includes('@hello-pangea/dnd')) {
                return 'vendor-dnd';
              }
              if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge') || id.includes('canvas-confetti')) {
                return 'vendor-utils';
              }
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: isHmrDisabled
        ? false
        : {
            host: '0.0.0.0',
            port: 3000,
            overlay: false,
          },
      watch: isHmrDisabled ? null : {},
    },
  };
});
