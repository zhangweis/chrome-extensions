#!/usr/bin/env -S deno run --allow-read

/**
 * upgrade-jq.ts 单元测试
 * 测试 jq 属性转链式操作的功能
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { transformContent } from "../upgrade-jq.ts";

Deno.test("upgrade-jq - 转换简单 jq 属性", () => {
  const input = `{
  "urls": ["https://api.example.com/data"],
  "jq": "{name, login}"
}`;

  const expected = `{
  "urls": ["https://api.example.com/data"]
}
>>>
{name, login}`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-jq - jq 是最后一个字段", () => {
  const input = `{
  "urls": ["https://api.github.com/users/github"],
  "jq": "{name, login}"
}`;

  const expected = `{
  "urls": ["https://api.github.com/users/github"]
}
>>>
{name, login}`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-jq - 有转义字符的 jq", () => {
  const input = `{
  "urls": ["https://qt.gtimg.cn/q=hk00883"],
  "jq": ".[0] | split(\\"~\\")"
}`;

  const expected = `{
  "urls": ["https://qt.gtimg.cn/q=hk00883"]
}
>>>
.[0] | split("~")`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-jq - jq 在中间位置", () => {
  const input = `{
  "jq": ".[0]",
  "urls": ["https://api.example.com/data"]
}`;

  const expected = `{
  "urls": ["https://api.example.com/data"]
}
>>>
.[0]`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-jq - 带其他字段", () => {
  const input = `{
  "urls": ["https://api.example.com/data"],
  "jq": ".[0]",
  "title": "测试"
}`;

  const expected = `{
  "title": "测试"
}
>>>
.[0]`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-jq - 带badge", () => {
  const input = `{
  "urls": ["https://api.example.com/data"],
  "jq": ".[0]",
  "badge": [["%.2f HKD", (.[3] | tonumber)]]
}`;

  const expected = `{
  "badge": [["%.2f HKD", (.[3] | tonumber)]]
}
>>>
.[0]`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-jq - 无 jq 属性不转换", () => {
  const input = `{
  "urls": ["https://api.example.com/data"],
  "title": "测试"
}`;

  const result = transformContent(input);
  assertEquals(null, result);
});

Deno.test("upgrade-jq - 多步骤链式操作", () => {
  const input = `{
  "urls": ["https://api.example.com/data"],
  "jq": ".data | .[] | select(.active == true)"
}`;

  const expected = `{
  "urls": ["https://api.example.com/data"]
}
>>>
.data | .[] | select(.active == true)`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-jq - 单行格式", () => {
  const input = `{"urls":["https://api.example.com/data"],"jq":".[0]"}`;

  const expected = `{"urls":["https://api.example.com/data"]}
>>>
.[0]`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-jq - 复杂配置", () => {
  const input = `{
  "urls": ["https://qt.gtimg.cn/q=hk00883"],
  "jq": ".[0] | split(\\"~\\")",
  "title": "中国海洋石油 00883",
  "badge": [
    ["%.2f HKD", (.[3] | tonumber)],
    ["涨跌: %+.2f", ((.[3] | tonumber) - (.[4] | tonumber))],
    ["成交量: %d", (.[6] | tonumber)]
  ]
}`;

  const expected = `{
  "title": "中国海洋石油 00883",
  "badge": [
    ["%.2f HKD", (.[3] | tonumber)],
    ["涨跌: %+.2f", ((.[3] | tonumber) - (.[4] | tonumber))],
    ["成交量: %d", (.[6] | tonumber)]
  ]
}
>>>
.[0] | split("~")`;

  const result = transformContent(input);
  assertEquals(expected, result);
});

Deno.test("upgrade-jq - 无效 JSON", () => {
  const input = `invalid json`;
  const result = transformContent(input);
  assertEquals(null, result);
});

Deno.test("upgrade-jq - 空配置", () => {
  const input = ``;
  const result = transformContent(input);
  assertEquals(null, result);
});
