import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/chat': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api/status': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api/logs': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api/clear_memory': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api/generate_title': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api/ssh': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      }
    }
  }
})
