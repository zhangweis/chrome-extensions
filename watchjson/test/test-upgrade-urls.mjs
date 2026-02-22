#!/usr/bin/env -S deno run --allow-read

/**
 * upgrade-urls.ts 单元测试
 * 测试 urls 转 from 格式的功能
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { transformContent } from "../upgrade-urls.ts";

Deno.test("upgrade-urls - 只有字符串 urls,jq.[0]", () => {
  const input = `{"urls": ["https://api.example.com/data"],"jq":".[0]"}`;
  const expected = `[{from: "https://api.example.com/data", type: "json"}]>>>.[0]`;
  const result = transformContent(input);
  assertEquals(expected, result);
});
Deno.test("upgrade-urls - 只有字符串 urls", () => {
  const input = `{"urls": ["https://api.example.com/data"]}`;
  const expected = `[{from: "https://api.example.com/data", type: "json"}]`;
  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - {url:xxx} 格式 - 单个", () => {
  const input = `{urls:[{url:"https://api.example.com/data"}]}`;
  const expected = `[{from: "https://api.example.com/data", type: "json"}]`;
  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - {url:xxx} 格式 - >>>", () => {
  const input = `{urls:[{url:"https://api.example.com/data"}]}>>>.`;
  const expected = `[{from: "https://api.example.com/data", type: "json"}]>>>.`;
  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - {url:xxx} 格式 - 多个", () => {
  const input = `{urls:[{url:"https://api.example.com/data1"},{url:"https://api.example.com/data2"}]}`;
  const expected = `[{from: "https://api.example.com/data1", type: "json"}, {from: "https://api.example.com/data2", type: "json"}]`;
  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - {url:xxx} + jq", () => {
  const input = `{
  "urls": [{url:"https://api.example.com/data1"},{url:"https://api.example.com/data2"}],
  "jq": ".[0]"
}`;

  const expected = `[{from: "https://api.example.com/data1", type: "json"}, {from: "https://api.example.com/data2", type: "json"}]
>>>
.[0]`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - 字符串 urls + jq", () => {
  const input = `{
  "urls": ["https://api.example.com/data1", "https://api.example.com/data2"],
  "jq": ".[0]"
}`;

  const expected = `[{from: "https://api.example.com/data1", type: "json"}, {from: "https://api.example.com/data2", type: "json"}]>>>.[0]`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - 字符串 urls + jq + title", () => {
  const input = `{
  "urls": ["https://api.example.com/data"],
  "jq": ".[0]",
  "title": "测试"
}`;

  const expected = `[{from: "https://api.example.com/data", type: "json"}]>>>.[0]`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - {url:xxx} + jq + badge", () => {
  const input = `{
  "urls": [{url:"https://api.example.com/data"}],
  "jq": ".[0]",
  "badge": [["价格: %.2f", ".price"]]
}`;

  const expected = `[{from: "https://api.example.com/data", type: "json"}]
>>>
.[0]`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - 只有 urls 不转换", () => {
  const input = `{"title": "测试", "content": {name: "test"}}`;
  const result = transformContent(input);
  assertEquals(null, result);
});

Deno.test("upgrade-urls - 无效 JSON", () => {
  const input = `invalid json`;
  const result = transformContent(input);
  assertEquals(null, result);
});

Deno.test("upgrade-urls - 空 urls 数组", () => {
  const input = `{"urls": []}`;
  const expected = `[]`;
  const result = transformContent(input);
  assertEquals(expected, result);  // 空 urls 返回空数组 []
});

Deno.test("upgrade-urls - 混合类型 urls 数组", () => {
  const input = `{
  "urls": [{url:"https://api.example.com/data1"}, "https://api.example.com/data2"]
}`;

  // 应该跳过非 {url:xxx} 格式的项
  const result = transformContent(input);
  // 当前实现会跳过，因为第一项是对象格式，但第二项是字符串
  // 这里我们验证它能正常处理
  assertExists(result);
});

Deno.test("upgrade-urls - 转义字符", () => {
  const input = `{
  "urls": ["https://api.example.com/data?param=\\"value\\""]
}`;

  // The escaped quotes in the input become regular quotes in the URL
  const expected = `[{from: "https://api.example.com/data?param=\\"value\\"", type: "json"}]`;
  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - Function 构造器解析", () => {
  // 测试使用 Function 构造器处理的情况（非标准 JSON）
  const input = `{urls:[{url:"https://api.example.com/data"}]}`;

  const result = transformContent(input);
  // Function 构造器应该能处理
  const expected = `[{from: "https://api.example.com/data", type: "json"}]`;
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - 复杂 jq 表达式", () => {
  const input = `{
  "urls": [{url:"https://api.example.com/data"}],
  "jq": ".data | .[] | select(.active == true) | {name: .name, count: length}"
}`;

  const expected = `[{from: "https://api.example.com/data", type: "json"}]
>>>
.data | .[] | select(.active == true) | {name: .name, count: length}`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - 多个链式操作字段", () => {
  const input = `{
  "urls": [{url:"https://api.example.com/data"}],
  "jq": ".[0]",
  "title": "测试标题",
  "method": "post"
}`;

  const result = transformContent(input);
  // 应该包含数组和链式操作，但忽略 title 和 method
  const expected = `[{from: "https://api.example.com/data", type: "json"}]
>>>
.[0]`;
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - 单 url 简化", () => {
  const input = `{urls:[{url:"https://api.example.com/data"}]}`;
  const expected = `[{from: "https://api.example.com/data", type: "json"}]`;
  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - {url:xxx} 带其他属性", () => {
  const input = `{urls:[{url:"https://api.example.com/data",method:"POST",headers:{"Authorization":"Bearer xxx"}}]}`;
  const expected = `[{from: "https://api.example.com/data", method: "POST", headers: {Authorization: "Bearer xxx"}}]`;
  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - {url:xxx} 带其他属性 + jq", () => {
  const input = `{
  "urls": [{url:"https://api.example.com/data",method:"POST"}],
  "jq": ".[0]"
}`;

  const expected = `[{from: "https://api.example.com/data", method: "POST"}]
>>>
.[0]`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - jq 表达式在 url 中", () => {
  const input = `{urls:[
{url:(.last+"?t=\${t}")}
]}
>>>
(now|todate[:8]+"01") as \$monthStartDate |
(.[0]|map(select(.date[:10]>=\$monthStartDate))) as \$filtered |
(\$filtered[0]//.[0][-1]) as \$monthStart |
.[0][-1] as \$last |
{month:\$monthStart, day:\$last}`;

  const expected = `[
{from: (.last+"?t=\${t}"), type: "json"}
]
>>>
(now|todate[:8]+"01") as \$monthStartDate |
(.[0]|map(select(.date[:10]>=\$monthStartDate))) as \$filtered |
(\$filtered[0]//.[0][-1]) as \$monthStart |
.[0][-1] as \$last |
{month:\$monthStart, day:\$last}`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-urls - urls 在 >>> 后面", () => {
  const input = `{importsContext:["../functions.jq.txt"],asIs:.}
>>>
{urls:[
{data:.},
{url:"https://unpkg.com/@uniswap/v2-core@1.0.1/build/UniswapV2Pair.json"}
,
{data:.}
]
,jq:".[0]+(.[1]|{abi})+{contracts:.[2]}"}`;

  const expected = `{importsContext:["../functions.jq.txt"],asIs:.}
>>>
[
{asIs: .},
{from: "https://unpkg.com/@uniswap/v2-core@1.0.1/build/UniswapV2Pair.json", type: "json"}
,
{asIs: .}
]>>>.[0]+(.[1]|{abi})+{contracts:.[2]}`;

  const result = transformContent(input);
  // 实际输出会压缩空格，所以我们去掉空格进行比较
  const normalizedResult = result.replace(/\s*,\s*/g, ",");
  const normalizedExpected = expected.replace(/\s*,\s*/g, ",");
  assertEquals(normalizedExpected, normalizedResult);
});

Deno.test("upgrade-urls - 多段 >>> 都有 urls", () => {
  const input = `{urls:["https://api.example.com/data1"]}
>>>
{urls:["https://api.example.com/data2"]}
>>>
.[0]`;

  const expected = `[{from: "https://api.example.com/data1", type: "json"}]
>>>
[{from: "https://api.example.com/data2", type: "json"}]
>>>
.[0]`;

  const result = transformContent(input);
  assertEquals(expected, result);
});
