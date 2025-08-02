import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/', // เพิ่มบรรทัดนี้
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist', // ตรวจสอบให้แน่ใจว่า build ไปที่ dist
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
  }
})