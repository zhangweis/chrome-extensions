//deno run -A npm:vite build --config ./vite.config.mjs
import { fileURLToPath, URL } from 'node:url'
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { defineConfig } from 'vite'
import deno from "npm:@deno/vite-plugin@1"
import { encodeHex } from "jsr:@std/encoding/hex";
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from "vite-plugin-singlefile"
    const rawBufferLoader = {
        name: 'raw-buffer-loader',
        transform(code, id) {
            if (id.endsWith('.wasm?buffer')) {
                const data = Deno.readFileSync(id.replace('?buffer', ''));
                const hex = encodeHex(data);
                return `export default Buffer.from('${hex}','hex');`;
            }
            return null;
        },
    };

// https://vitejs.dev/config/
export default defineConfig({
  base:'./',
  plugins: [vue(),nodePolyfills(),deno({})
    ,rawBufferLoader
  , viteSingleFile()
],
})
