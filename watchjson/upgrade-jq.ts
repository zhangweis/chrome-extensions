#!/usr/bin/env -S deno run --allow-net

/**
 * upgrade-jq.ts - 自动转换 jq 属性为链式操作
 *
 * 用法: deno run -A upgrade-jq.ts <文件名>...
 *
 * 示例: deno run -A upgrade-jq.ts abc.jq.txt
 */

import { ensureDir } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { dirname, join } from "https://deno.land/std@0.224.0/path/mod.ts";

// 导出 transformContent 函数供测试使用
export function transformContent(content: string): string | null {
  /**
   * 转换配置内容
   * 移除 jq 字段，将 jq 转换为链式操作
   * 如果有其他字段（如 title, badge），也移除 urls
   */

  // 首先提取 jq 值
  let jqValue: string | null = null;
  const jqMatch = content.match(/"jq"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (jqMatch) {
    jqValue = jqMatch[1];
    jqValue = jqValue.replace(/\\"/g, '"');
  }

  if (jqValue === null) {
    return null; // 没有找到 jq 属性
  }

  // 首先尝试解析以获取键名
  let config: Record<string, unknown> | null = null;
  try {
    config = JSON.parse(content);
  } catch {
    // 如果 JSON.parse 失败，尝试 Function 构造器
    try {
      const fn = new Function("return " + content.trim());
      config = fn();
    } catch {
      // 解析失败
    }
  }

  let removeUrls = false;
  if (config && typeof config === "object") {
    const keys = Object.keys(config);
    // 如果有 jq，且有除 urls 和 jq 之外的字段，则移除 urls
    if (keys.includes("jq") && keys.some(k => k !== "jq" && k !== "urls")) {
      removeUrls = true;
    }
  } else {
    // 如果解析失败，使用基于字符串的检测
    const hasJq = content.includes('"jq"') || content.includes("'jq'");
    const hasUrls = content.includes('"urls"') || content.includes("'urls'");
    if (hasJq && hasUrls) {
      // 检查是否有其他字段（title, badge, content 等）
      const commonFields = ["title", "badge", "content", "method", "headers", "body"];
      for (const field of commonFields) {
        if (content.includes(`"${field}"`) || content.includes(`'${field}'`)) {
          removeUrls = true;
          break;
        }
      }
    }
  }

  // 移除 jq 属性，生成中间结果
  let result = content;

  // 使用正则表达式移除 jq 属性
  result = result.replace(/,\s*"jq"\s*:\s*"((?:[^"\\]|\\.)*)"/g, '');
  result = result.replace(/"jq"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,?\s*/g, '');
  result = result.replace(/"jq"\s*:\s*"((?:[^"\\]|\\.)*)"/g, '');

  // 如果需要移除 urls
  if (removeUrls) {
    result = result.replace(/,\s*"urls"\s*:\s*\[[^\]]*\]/g, '');
    result = result.replace(/"urls"\s*:\s*\[[^\]]*\]\s*,?\s*/g, '');
    result = result.replace(/"urls"\s*:\s*\[[^\]]*\]/g, '');
  }

  // 清理末尾的逗号和空白
  result = result.replace(/,\s*\n\s*}/, '\n}');
  result = result.replace(/,\s*$/, '');
  result = result.replace(/\{\s*,\s*/, '{');
  result = result.replace(/\{\s*\}/, '{}');

  // 清理空对象
  const trimmed = result.trim();
  if (trimmed === '{}' || trimmed === '') {
    return ">>>\n" + jqValue;
  }

  return trimmed + "\n>>>\n" + jqValue;
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
    console.log(`  ✓ 无需转换（未发现 jq 属性）`);
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
用法: deno run -A upgrade-jq.ts <文件名>...

示例:
  deno run -A upgrade-jq.ts abc.jq.txt
  deno run -A upgrade-jq.ts *.jq.txt

转换规则:
  将配置对象中的 "jq" 属性提取为链式操作

  示例:
    旧: {"urls":[...],"jq":".[0]"}
    新: {"urls":[...]}>>> .[0]
`);
    Deno.exit(1);
  }

  console.log(`jq 属性转换工具\n`);
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
