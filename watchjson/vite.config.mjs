//deno run -A npm:vite build --config ./vite.config.mjs
import { fileURLToPath, URL } from 'node:url'
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { defineConfig } from 'vite'
import deno from "npm:@deno/vite-plugin@1"
import vue from '@vitejs/plugin-vue'

const isProduction = process.env.NODE_ENV === 'production';

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/zhangweis/chrome-extensions@main/watchjson';

const cdnAliases = {
  'vue': 'https://esm.sh/vue@3.2.45',
  'vue-loading-overlay': 'https://esm.sh/vue-loading-overlay@6.0.6?deps=vue@3.2.45',
  'query-string': 'https://esm.sh/query-string@6.13.8',
  'force-array': 'https://esm.sh/force-array@3.1.0',
  'tableify': 'https://esm.sh/tableify@1.1.0',
  'html-linkify': 'https://esm.sh/html-linkify@1.2.2',
  'markdown-linkify': 'https://esm.sh/markdown-linkify@1.0.3',
  'set-location-hash': 'https://esm.sh/set-location-hash@0.3.0',
  'titleize': 'https://esm.sh/titleize@4.0.0',
};

// 内联本地代码到 index.html，CDN 依赖保持 external
const inlineBundlePlugin = {
  name: 'inline-bundle',
  enforce: 'post',
  generateBundle(options, bundle) {
    let jsCode = '';
    let cssCode = '';

    // 收集本地 chunk
    for (const fileName in bundle) {
      const chunk = bundle[fileName];
      if (chunk.type === 'chunk' && chunk.fileName.endsWith('.js') && !chunk.fileName.includes('node_modules')) {
        // 移除 CSS 的 ES module import（改为 CDN link）
        let code = chunk.code;
        code = code.replace(
          /import\s*"([^"]+\.css)"\s*;?\n?/g,
          ''
        );
        jsCode = code;
      }
      if (chunk.type === 'asset' && chunk.fileName.endsWith('.css')) {
        cssCode = chunk.source || '';
      }
    }

    // 重写 HTML
    for (const fileName in bundle) {
      const chunk = bundle[fileName];
      if (chunk.type === 'asset' && fileName.endsWith('.html')) {
        let html = chunk.source || '';

        // 注入 importmap（解决 CDN 模块中的裸模块名解析）
        html = html.replace(
          '<head>',
          `<head>\n  <script type="importmap">\n  {\n    "imports": {\n      "markdown-linkify": "https://esm.sh/markdown-linkify@1.0.3",\n      "linkify-it": "https://esm.sh/linkify-it@2.2.0"\n    }\n  }\n  </script>`
        );

        // 注入 vue-loading-overlay CSS（CDN link）
        html = html.replace('</head>', `  <link rel="stylesheet" crossorigin href="https://esm.sh/vue-loading-overlay@6.0.6/dist/css/index.css?deps=vue@3.2.45">\n</head>`);

        // 注入内联 CSS
        if (cssCode) {
          html = html.replace('</head>', `  <style>${cssCode}</style>\n</head>`);
        }

        // 替换本地 JS 文件引用为内联脚本
        html = html.replace(
          /<script type="module" crossorigin src="\.\/assets\/[^"]+\.js"><\/script>/,
          `<script type="module">${jsCode}</script>`
        );

        // 移除本地 CSS 文件引用
        html = html.replace(
          /<link rel="stylesheet" crossorigin href="\.\/assets\/[^"]+\.css">/g,
          ''
        );

        chunk.source = html;
      }
    }

    // 删除单独的 assets 文件
    for (const fileName in bundle) {
      if (fileName.startsWith('assets/')) {
        delete bundle[fileName];
      }
    }
  }
};

const aliases = {
  '@': fileURLToPath(new URL('.', import.meta.url)),
  ...(isProduction ? { '@': CDN_BASE } : {}),
  ...(isProduction ? cdnAliases : {}),
};

export default defineConfig({
  base: './',
  resolve: {
    alias: aliases
  },
  build: {
    rollupOptions: {
      ...(isProduction ? {
        external: [/^https:\/\/(cdn\.jsdelivr\.net|esm\.sh).*\.(js|wasm|css)(\?.*)?$/]
      } : {})
    }
  },
  plugins: [
    vue(),
    nodePolyfills(),
    ...(isProduction ? [] : [deno({})]),
    inlineBundlePlugin,
  ],
})
