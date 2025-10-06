//deno run -A npm:vite build --config ./vite.config.mjs
import { fileURLToPath, URL } from 'node:url'
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { defineConfig } from 'vite'
import deno from "npm:@deno/vite-plugin@1"

import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from "vite-plugin-singlefile"

// https://vitejs.dev/config/
export default defineConfig({
  base:'./',
  plugins: [vue(),nodePolyfills(),deno({})
  , viteSingleFile()
],
})
