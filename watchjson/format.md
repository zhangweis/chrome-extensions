# Curl And JQ! 请求格式文档

## 概述

这是一个用于获取 JSON 数据并使用 JQ 进行转换处理的配置格式。支持 HTTP 请求、链式操作、导入外部配置等功能。

---

## 基本结构

```json
{
  "urls": [...],
  "jq": "..."
}
```

---

## 字段完整说明

### 1. urls - 请求 URL 数组（不推荐）

> **⚠️ 不推荐使用**：推荐使用 `from` 字段替代，配合链式操作 `>>>` 实现更灵活的数据处理。

定义要请求的 URL 列表，支持字符串和对象两种格式。

```json
{
  "urls": [
    "https://api.example.com/data",

    {
      "url": "https://api.example.com/post",
      "method": "get",
      "headers": {"Authorization": "Bearer xxx"},
      "body": {...},
      "data": {...}
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| url | string | 请求地址 |
| method | string | HTTP 方法，默认 "get" |
| headers | object | 请求头 |
| body | object | 请求体（对象会自动转为 POST + JSON） |
| data | any | 直接使用此数据，不发起请求 |

**URL 变量替换**：
- `${timestamp}` 或 `${t}` → 当前时间戳（毫秒）

```json
{"url": "https://api.example.com/data?t=${timestamp}"}
```

---

### 2. jq - JQ 转换表达式（不推荐）

> **⚠️ 不推荐使用**：推荐使用链式操作 `>>>` 替代，代码更清晰且易于维护。

对 urls 获取的数据进行 JQ 转换。**仅在配置块包含 urls 字段时才需要 jq 属性**。

```json
{
  "urls": [...],
  "jq": ".[0] | {name: .name, value: .value}"
}
```

在链式操作中，可以直接使用纯 jq 表达式段落，无需包装成对象：

```json
{
  "urls": ["https://api.example.com/data"]
}>>>
.[0]     // 纯 jq 表达式段落
>>>
{name: .name, value: .value}
```

**推荐写法**（使用 `from` + 链式操作）：
```json
{
  "from": "https://api.example.com/data",
  "type": "json"
}>>>
.[0] | {name: .name, value: .value}
```

---

### 3. from - 导入外部配置（推荐）

> **✅ 推荐使用**：这是获取外部数据的首选方式，比 `urls` + `jq` 更简洁清晰。

从 URL 加载另一个配置文件并执行。

**获取 JSON 数据**：
```json
{
  "from": "https://api.example.com/data",
  "type": "json"
}
```

**带 JQ 处理**（使用链式操作）：
```json
{
  "from": "https://api.example.com/data",
  "type": "json"
}>>>
.[0] | {name, value}
```

**基本用法**：
```json
{
  "from": "https://example.com/config.json"
}
```

**from + body** (POST 请求到 from URL)：
```json
{
  "from": "https://api.example.com/query",
  "body": {"query": "query { users { id name } }"}
}
```

**from + type** (直接获取文本/JSON)：
```json
{
  "from": "https://example.com/data.json",
  "type": "json",    // 或 "text"
  "fromjq": ".[0]"   // 可选，对获取的数据再执行 JQ
}
```

**from + params** (传递参数给导入的配置)：
```json
{
  "from": "https://example.com/template.json",
  "params": {"apiKey": "xxx", "userId": 123}
}
```

---

### 4. imports - 导入 JQ 函数库

导入外部 JQ 函数文件，在 jq 字段前拼接。

```json
{
  "urls": [...],
  "jq": "myfunc(.data)",
  "imports": [
    "https://example.com/functions.jq"
  ]
}
```

---

### 5. importsContext - 导入上下文函数

导入全局 JQ 函数，在整个处理流程中可用。

```json
{
  "urls": [...],
  "importsContext": [
    "https://example.com/context-funcs.jq"
  ]
}
```

---

### 6. args - 传递参数给 JQ

定义 JQ 中可用的变量参数。

```json
{
  "urls": [...],
  "jq": ".[] | select(.id == $id)",
  "args": {"id": 123, "name": "test"}
}
```

在 JQ 中使用 `$id`、`$name` 访问。

---

### 7. asArg - 将结果存为参数

将当前步骤的结果存为参数，供后续步骤使用。

```json
{
  "urls": [...],
  "jq": "...",
  "asArg": "myData"    // 结果存为 $myData 参数
}
```

---

### 8. add - 合并数据

使用 JQ 的 `add` 操作合并数据。

```json
{
  "urls": [...],
  "jq": "...",
  "add": {"extra": "value"}
}
```

---

### 9. 输出字段

#### title - 页面标题

```json
{
  "title": "我的数据"
}
```

#### badge - 徽章显示

二维数组，每个元素是一个 badge，可以是字符串（直接显示）或 `[format, item]` 数组（sprintf 格式化）。

```json
{
  "badge": [
    ["价格: %.2f", (.price)],    // sprintf 格式化
    ["数量: %d", (.count)],       // sprintf 格式化
    "固定文本"                     // 直接显示字符串
  ]
}
```

**格式**：
- `["格式字符串", (JQ表达式)]` - 使用 sprintf 格式化（复杂表达式需用括号包裹）
- `"字符串"` - 直接显示

**简写**：
```json
{
  "badge": [[123.45]]    // 简写，默认 %f 格式
}
```

#### content - 内容数据

指定要显示的内容数据。**`content` 的值会被当作 jq 表达式直接处理**。

```json
{
  "jq": ".data",
  "title": "用户信息",
  "content": {name: .name, age: .age}
}
```

**注意**：在链式操作中，可直接使用纯 jq 表达式段落处理数据。

#### css - 样式表

```json
{
  "css": [{"content": "body { background: blue }"}]
}
```

```json
{
  "css": [{"link": "https://example.com/style.css"}]
}
```

#### styles - 元素样式

```json
{
  "styles": {".my-class": "color: red"}
}
```

#### refresh - 自动刷新

```json
{
  "refresh": 60    // 每 60 秒自动刷新
}
```

#### timeout - 请求超时

```json
{
  "timeout": 30000    // 30 秒超时
}
```

#### functions - JQ 自定义函数（已弃用）

```json
{
  "functions": "def myfunc: ...;"
}
```

> **注意**：推荐使用 `imports` 或 `importsContext` 替代。

---

## 链式操作 >>>

使用 `>>>` 分隔符连接多个处理步骤，每一步的输出作为下一步的输入。

**重要**：每个段落会被整体当作 jq filter 处理。对象形式段落可以包含 `title`、`badge`、`content` 等输出字段；纯 jq 表达式段落直接处理数据。

```json
{
  "urls": [{"url": "https://api.example.com/data"}]
}>>>
.[0]
>>>
{name: .name, itemCount: (.items | length)}
>>>
{
  "title": "处理结果",
  "badge": [["共 %d 项", (.itemCount)]],
  "content": {name: .name, totalItems: .itemCount}
}
```

---

## 完整示例

### 示例 1: 简单 GET 请求

**推荐写法**（使用 `from`）：
```json
{
  "from": "https://api.github.com/users/github",
  "type": "json"
}>>>
{name, login, bio}
```

**旧写法**（不推荐）：
```json
{
  "urls": ["https://api.github.com/users/github"],
  "jq": "{name, login, bio}"
}
```

### 示例 2: GraphQL POST 请求

**推荐写法**：
```json
{
  "from": "https://api.example.com/graphql",
  "type": "json",
  "method": "POST",
  "body": {
    "query": "query { user(id: 1) { name email } }"
  }
}>>>
.data.user
```

**旧写法**（不推荐）：
```json
{
  "urls": [{
    "url": "https://api.example.com/graphql",
    "body": {
      "query": "query { user(id: 1) { name email } }"
    }
  }],
  "jq": ".data.user"
}
```

### 示例 3: 多 URL + 自定义请求头

**推荐写法**：
```json
{
  "from": "https://api.example.com/data",
  "type": "json",
  "headers": {
    "Authorization": "Bearer token123",
    "Accept": "application/json"
  }
}
```

**旧写法**（不推荐）：
```json
{
  "urls": [
    {
      "url": "https://api.example.com/data",
      "headers": {
        "Authorization": "Bearer token123",
        "Accept": "application/json"
      }
    }
  ],
  "jq": "."
}
```

### 示例 4: 带时间戳的请求

**推荐写法**：
```json
{
  "from": "https://api.example.com/data?t=${timestamp}",
  "type": "json"
}
```

**旧写法**（不推荐）：
```json
{
  "urls": [
    {"url": "https://api.example.com/data?t=${timestamp}"}
  ],
  "jq": "."
}
```

### 示例 5: 链式处理

**推荐写法**：
```json
[{from: "https://api.example.com/users", type: "json"}, {from: "https://api.example.com/posts", type: "json"}]>>>
[.[0].users, .[1].posts]
>>>
{userCount: .[0] | length, postCount: .[1] | length, users: .[0], posts: .[1]}
>>>
{
  "title": "数据汇总",
  "badge": [["用户: %d", (.userCount)], ["文章: %d", (.postCount)]],
  "content": {users: .users, posts: .posts}
}
```

**旧写法**（不��荐）：
```json
{
  "urls": [
    "https://api.example.com/users",
    "https://api.example.com/posts"
  ]
}>>>
[.[0].users, .[1].posts]
>>>
{userCount: .[0] | length, postCount: .[1] | length, users: .[0], posts: .[1]}
>>>
{
  "title": "数据汇总",
  "badge": [["用户: %d", (.userCount)], ["文章: %d", (.postCount)]],
  "content": {users: .users, posts: .posts}
}
```

### 示例 6: 使用 from 导入配置

```json
{
  "from": "https://example.com/pipeline.json",
  "params": {
    "userId": 123,
    "apiKey": "xxx"
  }
}
```

### 示例 7: 导入 JQ 函数

**推荐写法**：
```json
{
  "from": "https://api.example.com/data",
  "type": "json",
  "imports": [
    "https://example.com/jq-helpers.jq"
  ]
}>>>
format_value(.price)
```

**旧写法**（不推荐）：
```json
{
  "urls": ["https://api.example.com/data"],
  "jq": "format_value(.price)",
  "imports": [
    "https://example.com/jq-helpers.jq"
  ]
}
```

### 示例 8: 完整配置

**推荐写法**：
```json
{
  "from": "https://api.example.com/data",
  "type": "json",
  "headers": {"Authorization": "Bearer xxx"},
  "args": {"status": "active"},
  "title": "活跃用户",
  "badge": [["%d 人", (length)]],
  "refresh": 30,
  "timeout": 10000,
  "css": [{"content": "table { width: 100% }"}]
}>>>
.[] | select(.active == true)
```

**旧写法**（不推荐）：
```json
{
  "urls": [{
    "url": "https://api.example.com/data",
    "headers": {"Authorization": "Bearer xxx"}
  }],
  "jq": ".[] | select(.active == true)",
  "args": {"status": "active"},
  "title": "活跃用户",
  "badge": [["%d 人", (length)]],
  "refresh": 30,
  "timeout": 10000,
  "css": [{"content": "table { width: 100% }"}]
}
```

### 示例 9: 股票价格查询（链式操作）

**推荐写法**：
```json
{from: "https://qt.gtimg.cn/q=hk00883", type: "json"}>>>
.[0] | split("~")
>>>
{
  "title": "中国海洋石油 00883",
  "badge": [
    ["%.2f HKD", (.[3] | tonumber)],
    ["涨跌: %+.2f", ((.[3] | tonumber) - (.[4] | tonumber))],
    ["成交量: %d", (.[6] | tonumber)]
  ],
  "content": {code: "00883", name: .[1], price: (.[3] | tonumber), prevClose: (.[4] | tonumber), change: ((.[3] | tonumber) - (.[4] | tonumber)), volume: (.[6] | tonumber)},
  "refresh": 60
}
```

**旧写法**（不推荐）：
```json
{
  "urls": ["https://qt.gtimg.cn/q=hk00883"]
}>>>
.[0] | split("~")
>>>
{
  "title": "中国海洋石油 00883",
  "badge": [
    ["%.2f HKD", (.[3] | tonumber)],
    ["涨跌: %+.2f", ((.[3] | tonumber) - (.[4] | tonumber))],
    ["成交量: %d", (.[6] | tonumber)]
  ],
  "content": {code: "00883", name: .[1], price: (.[3] | tonumber), prevClose: (.[4] | tonumber), change: ((.[3] | tonumber) - (.[4] | tonumber)), volume: (.[6] | tonumber)},
  "refresh": 60
}
```

### 示例 10: Uniswap GraphQL 查询（项目默认示例）

**推荐写法**：
```json
{
  "from": "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",
  "type": "json",
  "method": "POST",
  "body": {
    "variables": {"pair": "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc"},
    "query": "query pairs($pair: String!){pairs(first:5, where:{id:$pair}) {reserve0,reserve1,totalSupply}}"
  }
}>>>
.[0].data.pairs[0] | {content: .}
```

**旧写法**（不推荐）：
```json
{
  "urls": [{
    "url": "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",
    "body": {
      "variables": {"pair": "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc"},
      "query": "query pairs($pair: String!){pairs(first:5, where:{id:$pair}) {reserve0,reserve1,totalSupply}}"
    }
  }],
  "jq": ".[0].data.pairs[0] | {content: .}"
}
```

---

## 浏览器扩展配置格式

扩展配置略有不同，存储在 Chrome storage 中：

```json
{
  "options": "{...}",
  "jq": "."
}
```

其中 `options` 是字符串形式的配置：

```json
{
  "urls": [],
  "jq": ".[0] | {badge: \"name\", content: .}",
  "periodSeconds": 60,
  "displaySeconds": 5
}
```

| 字段 | 说明 |
|------|------|
| urls | 要监控的 URL 配置 |
| jq | JQ 转换表达式 |
| periodSeconds | 轮询间隔（秒） |
| displaySeconds | 每个结果的显示时间（秒） |

---

## 注意事项

1. **URL 变量替换**：`${timestamp}` 和 `${t}` 会被替换为当前时间戳（毫秒）
2. **POST 请求**：当 `body` 是对象时，自动设置 `method` 为 `post` 并添加 `Content-Type: application/json`
3. **from 递归**：`from` 可以引用包含 `from` 的配置，实现递归导入
4. **链式操作**：每一步的 `result` 会作为下一步的输入
5. **JQ 参数**：使用 `--argjson` 传递参数，在 JQ 中用 `$key` 访问
6. **超时处理**：请求失败会自动重试一次，默认超时 30 秒
7. **不推荐字段**：`urls` 和 `jq` 字段不推荐使用，推荐使用 `from` + 链式操作 `>>>` 替代：
   - 旧写法：`{"urls": ["url"], "jq": ".[0]"}`
   - 新写法：`{from: "url", type: "json"}>>>.[0]`
