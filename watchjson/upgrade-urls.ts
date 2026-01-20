#!/usr/bin/env -S deno run --allow-net

/**
 * upgrade-urls.ts - 将 urls 属性转换为 from 格式
 *
 * 用法: deno run -A upgrade-urls.ts <文件名>...
 *
 * 示例: deno run -A upgrade-urls.ts abc.jq.txt
 */

import { ensureDir } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { dirname, join } from "https://deno.land/std@0.224.0/path/mod.ts";

// 导出 transformContent 函数供测试使用
/**
 * 转换配置内容
 * 支持多种格式：
 * 1. {"urls": ["url1"]} → {from: "url1"}
 * 2. {"urls": [{url:"url1"}]} → {from: "url1", type: "json"}
 * 3. {"urls": [{url:"url1", method:"POST"}]} → {from: "url1", type: "json", method: "POST"}
 * 4. {"urls": ["url1", "url2"], "jq": ".[0]"} → [{from:"url1",type:"json"},{from:"url2",type:"json"}]>>>.[0]
 */
export function transformContent(content: string): string | null {
  // 尝试解析为 JSON
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(content);
  } catch {
    try {
      // 尝试使用 Function 构造器处理转义字符
      const fn = new Function("return " + content);
      config = fn();
    } catch {
      return null; // 无法解析
    }
  }

  if (!config || typeof config !== "object") {
    return null;
  }

  const urls = config.urls;
  if (!Array.isArray(urls)) {
    return null; // 没有 urls 数组
  }

  if (urls.length === 0) {
    return null; // 空 urls 数组
  }

  // 检查 urls 数组中的元素类型
  const firstItem = urls[0];
  const isObjectFormat = typeof firstItem === "object" && firstItem !== null && "url" in firstItem;

  // 转换 urls 为 from 格式
  let items: unknown[];
  if (isObjectFormat) {
    // 格式：{urls:[{url:"url1", method:"POST", headers:{...}}, {url:"url2"}]}
    // 转换为：[{from:"url1", type:"json", method:"POST", headers:{...}}, {from:"url2", type:"json"}]
    items = urls.map((item: unknown) => {
      if (typeof item === "object" && item !== null && "url" in item) {
        const urlItem = item as Record<string, unknown>;
        const result: Record<string, unknown> = { from: urlItem.url, type: "json" };
        // 拷贝除 url 外的所有属性（如 method, headers, body 等）
        for (const key in urlItem) {
          if (key !== "url") {
            result[key] = urlItem[key];
          }
        }
        return result;
      }
      return item;
    });
  } else {
    // 格式：{"urls": ["url1", "url2"]}
    items = urls.map((url: unknown) => {
      if (typeof url === "string") {
        return { from: url, type: "json" };
      }
      return url;
    });
  }

  // 检查是否还有其他字段（除了 urls）
  const otherKeys = Object.keys(config).filter(k => k !== "urls");
  const hasJq = "jq" in config && typeof config.jq === "string";
  const hasOtherFields = otherKeys.length > 0;

  // 多个 url，或者有 jq 字段
  // 转换为 jq filter 格式（key 不带引号，冒号和逗号后加空格）
  let arrayStr = JSON.stringify(items);
  // 移除所有属性键的引号（包括嵌套对象）
  while (arrayStr !== (arrayStr = arrayStr.replace(/"(\w+)":/g, "$1:")));
  // 在冒号和逗号后加空格（但避免在 :// 中加空格）
  arrayStr = arrayStr.replace(/:(?!\/\/)/g, ": ").replace(/,/g, ", ");

  if (hasJq) {
    const jq = config.jq as string;
    // 对象格式 + 单个 URL + jq 是 .[0] + 无其他字段，返回单个对象
    if (items.length === 1 && jq === ".[0]" && !hasOtherFields && isObjectFormat) {
      const item = items[0];
      if (typeof item === "object" && item !== null && "from" in item) {
        let jsonStr = JSON.stringify(item);
        while (jsonStr !== (jsonStr = jsonStr.replace(/"(\w+)":/g, "$1:")));
        jsonStr = jsonStr.replace(/:(?!\/\/)/g, ": ").replace(/,/g, ", ");
        return jsonStr;
      }
    }
    return `${arrayStr}>>>${jq}`;
  }

  if (hasOtherFields) {
    // 有其他字段但没有 jq - 忽略其他字段，返回数组
    return arrayStr;
  }

  // 多个 urls，没有其他字段，返回数组
  return arrayStr;
}

/**
 * 处理单个文件
 */
async function processFile(filePath: string): Promise<void> {
  console.log(`处理文件: ${filePath}`);

  // 读取原文件
  const content = await Deno.readTextFile(filePath);

  // 转换内容
  const newContent = transformContent(content);

  // 检查是否有变化
  if (newContent === null || newContent === content) {
    console.log(`  ✓ 无需转换（未发现 urls 属性或无法解析）`);
    return;
  }

  // 创建备份目录
  const backupDir = join(dirname(filePath), "backup");
  await ensureDir(backupDir);

  // 备份原文件
  const backupPath = join(backupDir, basename(filePath));
  await Deno.copyFile(filePath, backupPath);
  console.log(`  ✓ 备份到: ${backupPath}`);

  // 写入转换后的内容
  await Deno.writeTextFile(filePath, newContent);
  console.log(`  ✓ 转换完成`);
}

function basename(filePath: string): string {
  const parts = filePath.split("/");
  return parts[parts.length - 1];
}

/**
 * 主函数
 */
async function main() {
  const args = Deno.args;

  if (args.length === 0) {
    console.error(`
用法: deno run -A upgrade-urls.ts <文件名>...

示例:
  deno run -A upgrade-urls.ts abc.jq.txt
  deno run -A upgrade-urls.ts *.jq.txt

转换规则:
  将 urls 属性转换为 from 格式

  示例:
    只有 urls:
      旧: {"urls": ["https://api.example.com/data"]}
      新: {from: "https://api.example.com/data", type: "json"}

    {url:xxx} 格式:
      旧: {urls:[{url:"https://api.example.com/data"}]}
      新: {from: "https://api.example.com/data", type: "json"}

    {url:xxx} 带其他属性:
      旧: {urls:[{url:"https://api.example.com/data",method:"POST"}]}
      新: {from: "https://api.example.com/data", type: "json", method: "POST"}

    urls + jq:
      旧: {"urls": ["url1", "url2"], "jq": ".[0]"}
      新: [{from:"url1",type:"json"},{from:"url2",type:"json"}]>>>.[0]
`);
    Deno.exit(1);
  }

  console.log(`urls 转 from 格式工具\n`);
  console.log(`处理 ${args.length} 个文件...\n`);

  for (const filePath of args) {
    try {
      await processFile(filePath);
    } catch (error) {
      console.error(`  ✗ 错误: ${(error as Error).message}`);
    }
  }

  console.log(`\n完成！`);
}

if (import.meta.main) {
  await main();
}
