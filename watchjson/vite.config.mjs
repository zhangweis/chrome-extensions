//deno run -A npm:vite build --config ./vite.config.mjs
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import viteDeno from "https://deno.land/x/vite_deno_plugin@v0.9.4/mod.ts";

import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from "vite-plugin-singlefile"

// https://vitejs.dev/config/
export default defineConfig({
  base:'./',
  plugins: [vue(),viteDeno({})
  , viteSingleFile()
],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
,
  resolve: {
    alias: {
//      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
