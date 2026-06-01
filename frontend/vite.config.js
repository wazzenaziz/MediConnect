import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Pinned so the dev origin is deterministic — it must match the
    // "Authorized JavaScript origins" registered for Google OAuth.
    // strictPort makes Vite fail loudly if 5174 is taken instead of
    // silently drifting to another port (which would break Google sign-in).
    port: 5174,
    strictPort: true,
  },
})
