#!/usr/bin/env -S deno run --allow-net

/**
 * upgrade-urls.ts - 将 urls 属性转换为 from 格式
 *
 * 用法: deno run -A upgrade-urls.ts [--stdout] <文件名>...
 *
 * 示例:
 *   deno run -A upgrade-urls.ts abc.jq.txt
 *   deno run -A upgrade-urls.ts --stdout abc.jq.txt
 *
 * 选项:
 *   --stdout    输出到标准输出，不修改原文件
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
/**
 * 处理包含 jq 表达式的 urls 配置
 * 例如：{urls:[{url:(.last+"?t=${t}")}]}
 * 这种情况下 JSON.parse 和 Function 构造器都会失败
 * 需要用字符串替换的方式处理
 *
 * 支持带引号和不带引号的属性名，只处理对象数组
 * 字符串数组由 transformSimpleUrlsArray 处理
 */
function transformJqExpression(configContent: string): string | null {
  let result = configContent;

  // 检查是否有 jq 属性需要提取（支持带引号和不带引号）
  // 只提取jq值，不删除jq属性
  // 添加 \s* 以支持 , 和 jq 之间的换行和空格
  const jqMatch = result.match(/,\s*["']?jq["']?:\s*"([^"]*)"/);

  // 提取只包含 {urls:[...]} 的部分
  // 找到 {urls: 的位置
  const urlsStart = result.search(/\{\s*["']?urls["']?:\s*\[/);
  if (urlsStart === -1) {
    return null;
  }

  // 检查是否是对象数组（不处理字符串数组）
  const objectPattern = /\{\s*["']?urls["']?:\s*\[\s*\{["']?\s*(?:url|data):/;
  if (!objectPattern.test(result)) {
    return null;
  }

  // 找到匹配的结束 ]
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let bracketStart = -1;

  for (let i = urlsStart; i < result.length; i++) {
    const char = result[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      depth++;
    } else if (char === '[') {
      if (depth === 1 && bracketStart === -1) {
        bracketStart = i;
      }
      depth++;
    } else if (char === ']') {
      depth--;
      if (depth === 1 && bracketStart !== -1) {
        // 找到了匹配的 ]
        result = result.substring(urlsStart, i + 1);
        break;
      }
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        // 没有找到匹配的 ] 就结束了
        return null;
      }
    }
  }

  // 如果没有找到完整的 {urls:[...]}，返回 null
  if (bracketStart === -1) {
    return null;
  }

  // 去掉结尾多余的 }
  result = result.replace(/\]\s*\}/, "]");

  // 替换 {urls:[ 或 {"urls:[ 为 [
  result = result.replace(/\{\s*["']?urls["']?:\s*\[/g, '[');

  // {url: 或 {"url": → {from:
  result = result.replace(/\{["']?url["']?:/g, '{from:');

  // {data:. 或 {"data":. → {asIs:.}
  result = result.replace(/\{["']?data["']?:\s*\./g, '{asIs:.');
  result = result.replace(/\{["']?data["']?:\s*\.\s*\}/g, '{asIs:.}');

  // 给所有 {from:...} 格式添加 type: "json"
  let pos = 0;
  while ((pos = result.indexOf('{from:', pos)) !== -1) {
    const parenStart = result.indexOf('(', pos);
    if (parenStart !== -1) {
      // {from:(表达式)} 格式
      let parenCount = 1;
      let parenEnd = parenStart + 1;
      while (parenEnd < result.length && parenCount > 0) {
        if (result[parenEnd] === '(') parenCount++;
        if (result[parenEnd] === ')') parenCount--;
        parenEnd++;
      }
      if (parenCount !== 0) break;

      const objContent = result.substring(pos, parenEnd);
      const hasMethodOrBody = /(?:method|body)\s*:/.test(objContent);
      if (!hasMethodOrBody) {
        const afterParen = result.substring(parenEnd).trim();
        if (!afterParen.startsWith('type:')) {
          result = result.substring(0, parenEnd) + ', type: "json"' + result.substring(parenEnd);
          pos = parenEnd + 15;
        } else {
          pos = parenEnd + 1;
        }
      } else {
        pos = parenEnd + 1;
      }
    } else {
      // {from:"字符串"} 格式
      let braceCount = 1;
      let i = pos + 7;
      let hasMethodOrBody = false;
      while (i < result.length && braceCount > 0) {
        if (result[i] === '{') braceCount++;
        if (result[i] === '}') braceCount--;
        if (result.substring(i, i + 15).includes('method:') ||
            result.substring(i, i + 13).includes('body:')) {
          hasMethodOrBody = true;
        }
        i++;
      }
      if (braceCount !== 0) break;

      const closingBracePos = i - 1;
      const objStart = result.lastIndexOf('{from:', closingBracePos);
      const objContent = result.substring(objStart, closingBracePos);
      if (!objContent.includes('type:') && !hasMethodOrBody) {
        result = result.substring(0, closingBracePos) + ', type: "json"' + result.substring(closingBracePos);
        pos = closingBracePos + 15;
      } else {
        pos = closingBracePos + 1;
      }
    }
  }

  // 添加空格：在冒号后（但不包括 ://），在逗号后
  // 使用循环确保所有冒号和逗号都有空格
  // 首先移除所有属性键的引号（包括嵌套对象），转为jq filter格式
  while (result !== (result = result.replace(/"(\w+)":/g, "$1:")));
  // 然后添加空格
  let prev = '';
  while (prev !== result) {
    prev = result;
    // 在冒号后加空格，但不包括 ://
    result = result.replace(/:(?!\/\/)/g, ': ');
    // 移除多余的空格
    result = result.replace(/:\s+/g, ': ');
    // 在逗号后加空格
    result = result.replace(/,\s*/g, ', ');
  }

  return result;
}

/**
 * 处理简单字符串���组格式的 urls 配置
 * 例如：{urls:["url1", "url2"]} 或 {"urls": ["url1", "url2"]}
 */
function transformSimpleUrlsArray(urlsContent: string): string | null {
  // 检查是否包含 {urls:[ 或 {"urls":[ 模式
  // 添加 \s* 以支持 { 和 urls 之间的换行和空格
  const urlsPattern = /\{\s*["']?urls["']?:\s*\[/;
  if (!urlsPattern.test(urlsContent)) {
    return null;
  }

  // 尝试解析为 JSON（或 jq filter 格式）
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(urlsContent);
  } catch {
    // 如果 JSON 解析失败，尝试添加引号到属性名
    try {
      // 将 {urls: ... 转换为 {"urls": ...
      const quoted = urlsContent.replace(/\{(\w+):/g, '{"$1":');
      parsed = JSON.parse(quoted);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object" || !("urls" in parsed)) {
    return null;
  }

  const urls = parsed.urls;
  if (!Array.isArray(urls)) {
    return null;
  }

  // 转换为 from 格式
  const items = urls.map((url: unknown) => {
    if (typeof url === "string") {
      return { from: url, type: "json" };
    }
    return url;
  });

  // 转换为 jq filter 格式
  let arrayStr = JSON.stringify(items);
  // 移除所有属性键的引号（包括嵌套对象）
  while (arrayStr !== (arrayStr = arrayStr.replace(/"(\w+)":/g, "$1:")));
  // 在冒号和逗号后加空格（但避免在 :// 中加空格）
  arrayStr = arrayStr.replace(/:(?!\/\/)/g, ": ").replace(/,/g, ", ");

  return arrayStr;
}

/**
 * 递归转换链式操作符中的所有 {urls:...} 段
 */
function transformChainUrls(chainOp: string): string {
  if (!chainOp) return chainOp;

  // chainOp 格式是 ">>>content1>>>content2..."
  // 需要找到每个段并转换其中包含的 {urls:...}

  let result = chainOp;
  let pos = 0;

  // 如果 result 以 >>> 开头，跳过它
  if (result.startsWith('>>>')) {
    pos = 3;
  }

  let iteration = 0;
  while (iteration < 100) {  // Safety limit to prevent infinite loop
    iteration++;
    // 找到下一个 >>> 的位置
    const nextSep = result.indexOf('>>>', pos);
    if (nextSep === -1) {
      // 没有更多 >>>，处理剩余部分
      const remaining = result.substring(pos);
      if (remaining.includes('{urls:')) {
        // 需要找到 {urls:...} 的完整范围
        const urlsStart = remaining.indexOf('{urls:');
        if (urlsStart !== -1) {
          // 找到匹配的结束 }
          let depth = 0;
          let inString = false;
          let escapeNext = false;
          let urlsEnd = -1;

          for (let i = urlsStart; i < remaining.length; i++) {
            const char = remaining[i];

            if (escapeNext) {
              escapeNext = false;
              continue;
            }

            if (char === '\\') {
              escapeNext = true;
              continue;
            }

            if (char === '"' || char === "'") {
              inString = !inString;
              continue;
            }

            if (inString) continue;

            if (char === '{') {
              depth++;
            } else if (char === '}') {
              depth--;
              if (depth === 0) {
                urlsEnd = i + 1;
                break;
              }
            }
          }

          if (urlsEnd !== -1) {
            const urlsPart = remaining.substring(urlsStart, urlsEnd);
            let transformed = transformJqExpression(urlsPart);
            if (!transformed) {
              transformed = transformSimpleUrlsArray(urlsPart);
            }
            if (transformed) {
              // Check if there was a jq attribute in the urlsPart
              // 添加 \s* 以支持 , 和 jq 之间的换行和空格
              const jqMatch = urlsPart.match(/,\s*["']?jq["']?:\s*"([^"]*)"/);
              if (jqMatch) {
                // Append >>>jq after the transformed segment
                transformed = transformed + '>>>' + jqMatch[1];
              }
              // 替换这部分，然后继续处理后续的 >>> 段
              const before = result.substring(0, pos + urlsStart);
              const after = result.substring(pos + urlsEnd);
              result = before + transformed + after;
              pos = before.length + transformed.length;
              continue;
            }
          }
        }
      }
      break;
    }

    // 处理当前段（从 pos 到 nextSep）
    const segment = result.substring(pos, nextSep);

    // 如果段为空（pos === nextSep），跳过这个分隔符，继续处理
    if (segment === '' && nextSep === pos) {
      pos = nextSep + 3;
      continue;
    }

    if (segment.includes('{urls:')) {
      const urlsStart = segment.indexOf('{urls:');
      if (urlsStart !== -1) {
        // 找到匹配的结束 }
        let depth = 0;
        let inString = false;
        let escapeNext = false;
        let urlsEnd = -1;

        for (let i = urlsStart; i < segment.length; i++) {
          const char = segment[i];

          if (escapeNext) {
            escapeNext = false;
            continue;
          }

          if (char === '\\') {
            escapeNext = true;
            continue;
          }

          if (char === '"' || char === "'") {
            inString = !inString;
            continue;
          }

          if (inString) continue;

          if (char === '{') {
            depth++;
          } else if (char === '}') {
            depth--;
            if (depth === 0) {
              urlsEnd = i + 1;
              break;
            }
          }
        }

        if (urlsEnd !== -1) {
          const urlsPart = segment.substring(urlsStart, urlsEnd);
          let transformed = transformJqExpression(urlsPart);
          if (!transformed) {
            transformed = transformSimpleUrlsArray(urlsPart);
          }
          if (transformed) {
            // Check if there was a jq attribute in the urlsPart
            // 添加 \s* 以支持 , 和 jq 之间的换行和空格
            const jqMatch = urlsPart.match(/,\s*["']?jq["']?:\s*"([^"]*)"/);
            if (jqMatch) {
              // Append >>>jq after the transformed segment
              transformed = transformed + '>>>' + jqMatch[1];
            }
            // 替换这部分，然后继续处理剩余的链式操作符
            const before = result.substring(0, pos + urlsStart);
            const after = result.substring(pos + urlsEnd);
            result = before + transformed + after;
            pos = before.length + transformed.length;
            continue;
          }
        }
      }
    }

    // 移动到下一段
    pos = nextSep + 3; // 跳过 >>>
  }

  return result;
}


export function transformContent(content: string): string | null {
  // 检查是否已经有 >>> 链式操作符
  // 如果有，先分离出配置部分和链式操作部分
  let chainOp = "";
  let configContent = content;
  let trailingWhitespace = "";

  const chainMatch = content.match(/(.*?)>>>(.*)/s);
  if (chainMatch) {
    // 保留原始空白，包括换行符
    configContent = chainMatch[1];
    // chainOp 包含 >>> 后面的所有内容，包括换行符
    chainOp = ">>>" + chainMatch[2];  // 保留原始空白，包括换行符
    // trailingWhitespace 应该只包含换行符，不包含 >>>
    // ��为chainOp已经以>>>开头
    // 检查configContent末尾是否有换行符，需要保留
    const trailingMatch = configContent.match(/(\s+)$/);
    if (trailingMatch) {
      trailingWhitespace = trailingMatch[1];
    }
  }

  // 首先尝试处理 jq 表达式格式（对象数组 {url:...}）
  // 使用 transformJqExpression 处理，保留原始空白
  const jqResult = transformJqExpression(configContent);
  if (jqResult) {
    // transformJqExpression now returns just the array, jq is extracted separately
    // Check if there was a jq in configContent
    // 添加 \s* 以支持 , 和 jq 之间的换行和空格
    const jqMatch = configContent.match(/,\s*["']?jq["']?:\s*"([^"]*)"/);
    if (jqMatch) {
      // Append >>>jq before the chainOp
      // jq属性转换时，>>>前后都要有换行符
      return jqResult + trailingWhitespace + "\n>>>\n" + jqMatch[1] + transformChainUrls(chainOp);
    }
    return jqResult + trailingWhitespace + transformChainUrls(chainOp);
  }

  // 然后尝试处理简单字符串数组格式
  const simpleResult = transformSimpleUrlsArray(configContent);
  if (simpleResult) {
    const hasJq = configContent.includes('"jq":') || configContent.includes("'jq':") || configContent.includes(',jq:');
    if (hasJq) {
      // 添加 \s* 以支持 , 和 jq 之间的换行和空格
      const jqMatch = configContent.match(/,\s*["']?jq["']?:\s*"([^"]*)"/);
      if (jqMatch) {
        return simpleResult + trailingWhitespace + ">>>" + jqMatch[1] + transformChainUrls(chainOp);
      }
    }
    return simpleResult + trailingWhitespace + transformChainUrls(chainOp);
  }

  // 如果 configContent 没有 urls，检查 chainOp 中是否有 {urls: 需要转换
  if (chainOp && chainOp.includes('{urls:')) {
    // 转换链式操作符中的所有 urls
    const transformedChain = transformChainUrls(chainOp);
    return configContent + transformedChain;
  }

  return null; // 无法解析
}

/**
 * 处理单个文件
 * @param filePath 文件路径
 * @param stdoutMode 是否输出到标准输出（不修改原文件）
 */
async function processFile(filePath: string, stdoutMode = false): Promise<void> {
  if (!stdoutMode) {
    console.log(`处理文件: ${filePath}`);
  }

  // 读取原文件
  const content = await Deno.readTextFile(filePath);

  // 转换内容
  const newContent = transformContent(content);

  // 检查是否有变化
  if (newContent === null || newContent === content) {
    if (stdoutMode) {
      // stdout 模式下，无变化也输出原内容
      console.log(content);
    } else {
      console.log(`  ✓ 无需转换（未发现 urls 属性或无法解析）`);
    }
    return;
  }

  if (stdoutMode) {
    // 输出到标准输出
    console.log(newContent);
  } else {
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

  // 检查是否有 --stdout 参数
  const stdoutIndex = args.indexOf("--stdout");
  const stdoutMode = stdoutIndex !== -1;

  // 移除 --stdout 参数，只保留文件路径
  const filePaths = stdoutMode ? args.filter((_, i) => i !== stdoutIndex) : args;

  if (filePaths.length === 0) {
    console.error(`
用法: deno run -A upgrade-urls.ts [--stdout] <文件名>...

示例:
  deno run -A upgrade-urls.ts abc.jq.txt
  deno run -A upgrade-urls.ts *.jq.txt
  deno run -A upgrade-urls.ts --stdout abc.jq.txt > output.txt

选项:
  --stdout    输出到标准输出，不修改原文件

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

  if (!stdoutMode) {
    console.log(`urls 转 from 格式工具\n`);
    console.log(`处理 ${filePaths.length} 个文件...\n`);
  }

  for (const filePath of filePaths) {
    try {
      await processFile(filePath, stdoutMode);
    } catch (error) {
      if (!stdoutMode) {
        console.error(`  ✗ 错误: ${(error as Error).message}`);
      } else {
        console.error(`错误: ${filePath}: ${(error as Error).message}`);
      }
    }
  }

  if (!stdoutMode) {
    console.log(`\n完成！`);
  }
}

if (import.meta.main) {
  await main();
}
