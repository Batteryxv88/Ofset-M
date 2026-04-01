import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages публикует проект в под-пути /<repo>/
  // Для репозитория Batteryxv88/Ofset-M это /Ofset-M/
  base: '/Ofset-M/',
});
