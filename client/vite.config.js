import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    base: './', // Using relative paths for Capacitor
    server: {
        port: 5173,
        host: true // Expose to network
    },
    build: {
        outDir: '../server/public',
        emptyOutDir: true
    }
})
