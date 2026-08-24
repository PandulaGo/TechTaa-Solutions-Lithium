import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

type FrontendSettings = {
  Port?: number
  ApiBaseUrl?: string
}

function loadFrontendSettings(): FrontendSettings {
  const filePath = path.resolve(process.cwd(), 'appsettings.json')
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[config] appsettings.json not found at ${filePath}; using built-in defaults`)
      return {}
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')).Frontend ?? {}
  } catch (err) {
    console.warn('[config] Failed to parse appsettings.json; using built-in defaults:', err)
    return {}
  }
}

const frontend = loadFrontendSettings()

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: frontend.Port ?? 10025,
    proxy: {
      '/api': frontend.ApiBaseUrl ?? 'http://localhost:10021'
    }
  }
})
